import { RouteStepItem, SearchParams, RouteCandidate } from '../types/bus';
import { calculateSubwayRoute, buildSubwayRouteSteps, normalizeStationName, SUBWAY_NETWORK_HUBS } from './subwayNetwork';
import { matchScheduledSubwayDeparture } from './subwayApi';
import { findConnectingBus, ConnectingBusOption } from './connectingBusData';
import { minutesToTimeString, parseTimeToMinutes, getHaversineDistanceMeters } from './distance';
import { applyEarlyBirdDiscount, applyUnifiedTransitFare, classifyTransitBus, calculateMetropolitanTransitFare } from './searchEngine';

export interface DynamicTransitPath {
  totalMinutes: number;
  transferCount: number;
  fare: number;
  summaryTitle: string;
  summaryDesc: string;
  steps: RouteStepItem[];
  source: 'odsay' | 'local_engine';
}

// 간단한 인메모리 캐시 (동일 좌표 중복 호출 방지)
const transitRouteCache = new Map<string, DynamicTransitPath>();

/**
 * 출발지 좌표/명칭과 도착지 좌표/명칭 사이의 대중교통(지하철/버스/환승) 최적 경로를 완전 자동으로 탐색합니다.
 * 1. ODsay 대중교통 API 키(VITE_ODSAY_API_KEY)가 있으면 실시간 전국 버스/지하철 복합 경로 탐색
 * 2. 없거나 네트워크 오류 시 자체 수도권 전철 Dijkstra망 + 연계 버스 엔진으로 0ms 즉각 자동 연계
 */
export async function getOptimalTransitRoute(
  startLat: number,
  startLng: number,
  startName: string,
  destLat: number,
  destLng: number,
  destName: string,
  startDeptMins: number,
  baseId: string
): Promise<DynamicTransitPath | null> {
  const cacheKey = `${startLat.toFixed(4)},${startLng.toFixed(4)}->${destLat.toFixed(4)},${destLng.toFixed(4)}`;
  if (transitRouteCache.has(cacheKey)) {
    return adjustTransitPathTimes(transitRouteCache.get(cacheKey)!, startDeptMins, baseId);
  }

  // -----------------------------------------------------------------
  // 1. ODsay 대중교통 길찾기 API 연동 시도 (완전 자동 대중교통 API)
  // -----------------------------------------------------------------
  const odsayApiKey = (typeof import.meta !== 'undefined' && import.meta.env) ? import.meta.env.VITE_ODSAY_API_KEY : process.env.VITE_ODSAY_API_KEY;
  if (odsayApiKey && startLat !== 0 && destLat !== 0) {
    try {
      const url = `/api/odsay/v1/api/searchPubTransPathT?SX=${startLng}&SY=${startLat}&EX=${destLng}&EY=${destLat}&apiKey=${encodeURIComponent(odsayApiKey)}`;
      const res = await fetch(url, { signal: AbortSignal.timeout(3500) });
      if (res.ok) {
        const json = await res.json();
        const paths: any[] = json?.result?.path || [];
        const isOriginOrDestGtx = ['수서', '동탄', '성남', '구성'].some(st => startName.includes(st) || destName.includes(st));

        // 필터링: 1) 환승 4회 이상 제외, 2) 출발/도착이 GTX역이 아닌 경우 중간 GTX 환승 경로 제외
        const validPaths = paths.filter((p: any) => {
          const totalTransfers = Math.max(0, (p.info?.busTransitCount || 0) + (p.info?.subwayTransitCount || 0) - 1);
          if (totalTransfers >= 4) return false;

          if (!isOriginOrDestGtx) {
            const hasGtx = p.subPath?.some((sp: any) =>
              sp.lane?.some((l: any) => (l.name || '').includes('GTX') || (l.busNo || '').includes('GTX'))
            );
            if (hasGtx) return false;
          }
          return true;
        });

        const bestPath = validPaths[0] || paths[0];

        if (bestPath && Array.isArray(bestPath.subPath)) {
          const parsed = parseOdsayPath(bestPath, startDeptMins, baseId, startName, destName, startLat, startLng, destLat, destLng);
          if (parsed && parsed.transferCount < 4) {
            transitRouteCache.set(cacheKey, parsed);
            return parsed;
          }
        }
      }
    } catch (e) {
      console.warn('[TransitRouter] ODsay API 호출 실패, 로컬 라우팅 엔진으로 자동 전환:', e);
    }
  }

  // -----------------------------------------------------------------
  // 2. 자체 고성능 다익스트라(Dijkstra) 전철망 + 연계 시내버스 엔진 자동 연동
  // -----------------------------------------------------------------
  const localPath = calculateLocalTransitPath(startLat, startLng, startName, destLat, destLng, destName, startDeptMins, baseId);
  if (localPath) {
    transitRouteCache.set(cacheKey, localPath);
    return localPath;
  }

  return null;
}

/**
 * ODsay API 응답 데이터를 RouteStepItem 타임라인으로 파싱
 */
function parseOdsayPath(
  pathData: any,
  startDeptMins: number,
  baseId: string,
  startName: string,
  destName: string,
  startLat: number,
  startLng: number,
  destLat: number,
  destLng: number
): DynamicTransitPath | null {
  const info = pathData.info;
  const subPaths: any[] = pathData.subPath || [];
  const steps: RouteStepItem[] = [];

  let currentMins = startDeptMins;
  let stepIdx = 1;

  for (const sp of subPaths) {
    const trafficType = sp.trafficType; // 1: 지하철, 2: 버스, 3: 도보
    const duration = Math.max(1, sp.sectionTime || 2);
    const deptStr = minutesToTimeString(currentMins);
    const arrMins = currentMins + duration;
    const arrStr = minutesToTimeString(arrMins);

    if (trafficType === 3) {
      // 도보 이동
      if (duration > 0 || steps.length === 0) {
        steps.push({
          id: `${baseId}-walk-${stepIdx++}`,
          type: 'walk',
          title: steps.length === 0 ? `${startName} ➔ 승강장 이동` : '환승 / 도착 도보 이동',
          subtitle: `도보 약 ${duration}분 (${sp.distance || Math.round(duration * 65)}m)`,
          departureTime: deptStr,
          arrivalTime: arrStr,
          durationMinutes: duration
        });
      }
      currentMins = arrMins;
    } else if (trafficType === 2) {
      // 버스 탑승
      const busNos = sp.lane?.map((l: any) => l.busNo).filter(Boolean) || [];
      const busNoText = busNos.length > 0 ? (busNos.length <= 4 ? busNos.join(' · ') : `${busNos.slice(0, 3).join(' · ')} 외 ${busNos.length - 3}개`) : '시내버스';
      const firstLane = sp.lane?.[0];
      const busInfo = classifyTransitBus({
        vType: firstLane?.type,
        guidance: firstLane?.busNo,
        busNumber: busNos[0],
        contextText: `${firstLane?.name || ''} ${firstLane?.busNo || ''}`
      });

      const busPrefix = busInfo.displayNamePrefix ? `${busInfo.displayNamePrefix} ` : '';
      const busTitle = `${busPrefix}${busNoText}번 버스 탑승`.replace('버스 버스', '버스');
      const startStation = sp.startName || startName;
      const endStation = sp.endName || destName;
      const stCount = sp.stationCount || 1;

      // 경유 정류소 목록 추출
      const passStops = sp.passStopList?.stations?.map((s: any) => s.stationName).filter(Boolean) || [];
      const passStopSummary = passStops.length > 0
        ? passStops.length <= 4
          ? passStops.join(' ➔ ')
          : `${passStops.slice(0, 2).join(' ➔ ')} … (${passStops.length - 2}개 정류장) ➔ ${passStops[passStops.length - 1]}`
        : `${startStation} ➔ ${endStation}`;

      steps.push({
        id: `${baseId}-bus-${stepIdx++}`,
        type: 'public_bus',
        title: busTitle,
        subtitle: `${startStation} 정류장 승차 ➔ ${endStation} 하차 (${duration}분 소요, ${stCount}개 정류장)`,
        departureTime: deptStr,
        arrivalTime: arrStr,
        durationMinutes: duration,
        distanceMeters: sp.distance,
        fare: busInfo.baseFare,
        note: `🚏 정류장: ${passStopSummary}`,
        detailLocation: `${startStation} (정류소 ID: ${sp.startID || '승차홈'})`,
        boardingStopName: `${startStation}${sp.startID ? ` (정류소 ID: ${sp.startID})` : ''}`,
        dropoffStopName: `${endStation}${sp.endID ? ` (정류소 ID: ${sp.endID})` : ''}`,
        passStops: passStops.length > 0 ? passStops : undefined,
        coords: (sp.startY && sp.startX) ? { lat: Number(sp.startY), lng: Number(sp.startX) } : undefined
      });
      currentMins = arrMins;
    } else if (trafficType === 1) {
      // 지하철 탑승 (실제 서울교통공사/코레일 공식 시간표 및 정밀 역간 소요시간 100% 연동)
      const lane = sp.lane?.[0];
      const subwayLineName = lane?.name ? (lane.name.startsWith('수도권 ') ? lane.name.replace('수도권 ', '') : lane.name) : '지하철';
      const startStation = (sp.startName || startName).replace(/역$/, '');
      const endStation = (sp.endName || destName).replace(/역$/, '');
      const stCount = sp.stationCount || 1;

      // 1. 역간 물리 소요시간 정밀 산출 (장자호수공원~모란 42분 등)
      const subRoute = calculateSubwayRoute(startStation + '역', endStation + '역');
      const realDuration = (subRoute && subRoute.minutes > 0 && subRoute.minutes <= 120) ? subRoute.minutes : duration;

      // 2. 실제 지하철 시간표 출발 시각 자동 매칭 (예: 07:25, 07:30 등)
      const sched = matchScheduledSubwayDeparture(startStation + '역', subwayLineName, currentMins, `${endStation}역 방면`);
      const segDeptMins = sched.scheduledDepartureMins;
      const segArrMins = segDeptMins + realDuration;
      const waitMins = sched.platformWaitMins;

      // 경유 지하철역 목록 추출
      const passStations = sp.passStopList?.stations?.map((s: any) => s.stationName).filter(Boolean) || [];
      const passStationSummary = passStations.length > 0
        ? passStations.length <= 4
          ? passStations.map((s: string) => s.replace(/역$/, '') + '역').join(' ➔ ')
          : `${passStations[0].replace(/역$/, '')}역 ➔ … (${passStations.length - 2}개 역) ➔ ${passStations[passStations.length - 1].replace(/역$/, '')}역`
        : `${startStation}역 ➔ ${endStation}역`;

      let stepSubtitle = `${endStation}역 방면 (${realDuration}분 소요, ${stCount}개 역)`;
      if (waitMins > 0) {
        stepSubtitle += ` · 승강장 대기 ${waitMins}분`;
      }

      steps.push({
        id: `${baseId}-subway-${stepIdx++}`,
        type: 'subway',
        title: `${subwayLineName} ${startStation}역 탑승 ➔ ${endStation}역 이동`,
        subtitle: stepSubtitle,
        departureTime: minutesToTimeString(segDeptMins),
        arrivalTime: minutesToTimeString(segArrMins),
        durationMinutes: realDuration,
        fare: steps.filter(s => s.type === 'public_bus' || s.type === 'subway').length === 0 ? 1500 : 0,
        note: `🚇 ${subwayLineName} ${sched.departureTimeStr} 출발${waitMins > 0 ? ` (대기 ${waitMins}분)` : ''} · 경유: ${passStationSummary}`,
        detailLocation: `${startStation}역 승강장`,
        coords: (sp.startY && sp.startX) ? { lat: Number(sp.startY), lng: Number(sp.startX) } : undefined
      });

      currentMins = segArrMins;
    } else {
      // 기차(KTX/SRT/ITX), 시외/고속버스 또는 기타 대중교통
      const lane = sp.lane?.[0];
      const transName = lane?.name || lane?.busNo || '고속/시외교통';
      const startStation = sp.startName || startName;
      const endStation = sp.endName || destName;
      steps.push({
        id: `${baseId}-intercity-${stepIdx++}`,
        type: 'public_bus',
        title: `${transName} 탑승`,
        subtitle: `${startStation} 승차 ➔ ${endStation} 하차 (${duration}분 소요)`,
        departureTime: deptStr,
        arrivalTime: arrStr,
        durationMinutes: duration,
        fare: 0,
        note: `🚄 전국 광역/고속 연계 (${transName})`,
        boardingStopName: startStation,
        dropoffStopName: endStation,
        coords: (sp.startY && sp.startX) ? { lat: Number(sp.startY), lng: Number(sp.startX) } : undefined
      });
      currentMins = arrMins;
    }
  }

  const transferCount = Math.max(0, (info?.busTransitCount || 0) + (info?.subwayTransitCount || 0) - 1);
  const firstStepDeptMins = steps[0]?.departureTime ? parseTimeToMinutes(steps[0].departureTime) : startDeptMins;
  const lastStepArrMins = (steps.length > 0 && steps[steps.length - 1]?.arrivalTime)
    ? parseTimeToMinutes(steps[steps.length - 1].arrivalTime!)
    : currentMins;
  const totalMins = Math.max(5, lastStepArrMins - firstStepDeptMins);

  const fareDetails = calculateMetropolitanTransitFare(steps, steps[0]?.departureTime);
  const calculatedFare = fareDetails.totalFare > 0 ? fareDetails.totalFare : (info?.payment || 1650);

  return {
    totalMinutes: totalMins,
    transferCount,
    fare: calculatedFare,
    summaryTitle: `${info?.firstStartStation || startName} ➔ ${info?.lastEndStation || destName}`,
    summaryDesc: `총 ${totalMins}분 소요 · 환승 ${transferCount}회`,
    steps,
    source: 'odsay'
  };
}

/**
 * 로컬 고성능 전철망 + 연계 버스 최단 경로 연산
 */
function calculateLocalTransitPath(
  startLat: number,
  startLng: number,
  startName: string,
  destLat: number,
  destLng: number,
  destName: string,
  startDeptMins: number,
  baseId: string
): DynamicTransitPath | null {
  // 1. 연계 시내버스 직통 확인
  const connectingBus = findConnectingBus(startName, destLat, destLng, destName);
  if (connectingBus) {
    const transferWalkMins = 3;
    const busWaitMins = Math.min(connectingBus.intervalMinutes, 4);
    const busDeptMins = startDeptMins + transferWalkMins + busWaitMins;
    const busArrMins = busDeptMins + connectingBus.rideMinutes;
    const finalWalkMins = 3;
    const destArrivalMins = busArrMins + finalWalkMins;

    const steps: RouteStepItem[] = [
      {
        id: `${baseId}-bus-trans-1`,
        type: 'walk',
        title: `${startName} 정류장 이동`,
        subtitle: connectingBus.boardingStopDesc,
        departureTime: minutesToTimeString(startDeptMins),
        arrivalTime: minutesToTimeString(busDeptMins),
        durationMinutes: transferWalkMins + busWaitMins
      },
      {
        id: `${baseId}-bus-trans-2`,
        type: 'public_bus',
        title: `${connectingBus.busNumber} 탑승`,
        subtitle: `${startName} ➔ ${connectingBus.routeDesc} (${connectingBus.rideMinutes}분)`,
        departureTime: minutesToTimeString(busDeptMins),
        arrivalTime: minutesToTimeString(busArrMins),
        durationMinutes: connectingBus.rideMinutes,
        fare: connectingBus.fare,
        note: `🚌 배차간격 약 ${connectingBus.intervalMinutes}분 · 시내버스 환승`
      },
      {
        id: `${baseId}-bus-trans-3`,
        type: 'walk',
        title: `${destName} 최종 도착`,
        subtitle: `${connectingBus.dropoffStopDesc} ➔ 목적지 도보 약 3분`,
        departureTime: minutesToTimeString(busArrMins),
        arrivalTime: minutesToTimeString(destArrivalMins),
        durationMinutes: finalWalkMins
      }
    ];

    return {
      totalMinutes: destArrivalMins - startDeptMins,
      transferCount: 0,
      fare: connectingBus.fare,
      summaryTitle: `${connectingBus.busNumber.split('·')[0].trim()} 직통`,
      summaryDesc: `${startName} ➔ ${destName} (${connectingBus.rideMinutes}분)`,
      steps,
      source: 'local_engine'
    };
  }

  // 2. 지하철 최단 경로 탐색
  const subwayRoute = calculateSubwayRoute(startName, destName);
  if (subwayRoute && subwayRoute.minutes <= 90) {
    const subwaySubSteps = buildSubwayRouteSteps(
      startName,
      destName,
      subwayRoute,
      startDeptMins + 4,
      baseId,
      1500
    );

    const finalArrivalMins = subwaySubSteps.endArrMins + 4;

    const steps: RouteStepItem[] = [
      {
        id: `${baseId}-sub-walk-1`,
        type: 'walk',
        title: `${startName} 승강장 이동`,
        subtitle: '지하철 개찰구 ➔ 승강장 도보 약 4분',
        departureTime: minutesToTimeString(startDeptMins),
        arrivalTime: minutesToTimeString(startDeptMins + 4),
        durationMinutes: 4
      },
      ...subwaySubSteps.steps,
      {
        id: `${baseId}-sub-walk-2`,
        type: 'walk',
        title: `${destName} 최종 도착`,
        subtitle: '출구 ➔ 목적지 도보 약 4분',
        departureTime: minutesToTimeString(subwaySubSteps.endArrMins),
        arrivalTime: minutesToTimeString(finalArrivalMins),
        durationMinutes: 4
      }
    ];

    return {
      totalMinutes: finalArrivalMins - startDeptMins,
      transferCount: subwayRoute.transferCount,
      fare: 1500,
      summaryTitle: subwayRoute.routeDesc,
      summaryDesc: `지하철 환승 ${subwayRoute.transferCount}회 (${subwayRoute.minutes}분 소요)`,
      steps,
      source: 'local_engine'
    };
  }

  return null;
}

/**
 * 캐시된 경로의 타임스탬프를 현재 검색 출발 시각 기준으로 시간 재조정
 */
function adjustTransitPathTimes(path: DynamicTransitPath, newDeptMins: number, baseId: string): DynamicTransitPath {
  let curr = newDeptMins;
  const updatedSteps = path.steps.map((s, idx) => {
    if (s.type === 'subway') {
      const lineHintMatch = s.title.match(/([0-9]호선|신분당선|수인분당선|경강선|GTX-A|경의중앙선|공항철도)/);
      const lineHint = lineHintMatch ? lineHintMatch[1] : '지하철';
      const rawStationMatch = s.title.match(/([가-힣\d]+(?:역|공원역|사거리역))/i);
      const stationName = rawStationMatch ? rawStationMatch[1] : s.title;
      const sched = matchScheduledSubwayDeparture(stationName, lineHint, curr, s.subtitle || '');
      const dept = sched.scheduledDepartureMins;
      const arr = dept + s.durationMinutes;
      curr = arr;
      return {
        ...s,
        id: `${baseId}-step-${idx + 1}`,
        departureTime: minutesToTimeString(dept),
        arrivalTime: minutesToTimeString(arr),
        note: `🚇 ${lineHint} ${sched.departureTimeStr} 출발${sched.platformWaitMins > 0 ? ` (대기 ${sched.platformWaitMins}분)` : ''}`
      };
    } else {
      const dept = curr;
      const arr = curr + s.durationMinutes;
      curr = arr;
      return {
        ...s,
        id: `${baseId}-step-${idx + 1}`,
        departureTime: minutesToTimeString(dept),
        arrivalTime: minutesToTimeString(arr)
      };
    }
  });

  const firstDept = updatedSteps[0]?.departureTime ? parseTimeToMinutes(updatedSteps[0].departureTime) : newDeptMins;
  const lastArr = (updatedSteps.length > 0 && updatedSteps[updatedSteps.length - 1]?.arrivalTime)
    ? parseTimeToMinutes(updatedSteps[updatedSteps.length - 1].arrivalTime!)
    : curr;

  return {
    ...path,
    steps: updatedSteps,
    totalMinutes: Math.max(5, lastArr - firstDept)
  };
}

const HQ_LAT = 37.40698104234706;
const HQ_LNG = 127.08871065248748;

/**
 * ODsay 대중교통 API를 호출하여 실시간 버스/지하철/환승 전체 경로 후보군을 동적으로 가져옵니다.
 */
export async function fetchOdsayCandidates(params: SearchParams): Promise<RouteCandidate[]> {
  const { originLat, originLng, originName, mode, targetTime, filters } = params;

  if (!filters.usePublicTransit || filters.useCompanyBusOnly) return [];
  if (!originName || (originLat === 0 && originLng === 0)) return [];

  const odsayApiKey = (typeof import.meta !== 'undefined' && import.meta.env)
    ? import.meta.env.VITE_ODSAY_API_KEY
    : process.env.VITE_ODSAY_API_KEY;

  if (!odsayApiKey) return [];

  const isCommuteIn = mode === 'commute_in';
  const startLat = isCommuteIn ? originLat : HQ_LAT;
  const startLng = isCommuteIn ? originLng : HQ_LNG;
  const startName = isCommuteIn ? originName : '판교 사옥';

  const destLat = isCommuteIn ? HQ_LAT : originLat;
  const destLng = isCommuteIn ? HQ_LNG : originLng;
  const destName = isCommuteIn ? '판교 사옥' : originName;

  const targetMins = parseTimeToMinutes(targetTime);

  try {
    const url = `/api/odsay/v1/api/searchPubTransPathT?SX=${startLng}&SY=${startLat}&EX=${destLng}&EY=${destLat}&apiKey=${encodeURIComponent(odsayApiKey)}`;
    const res = await fetch(url, {
      signal: AbortSignal.timeout(4000)
    });

    if (!res.ok) return [];
    const json = await res.json();
    const paths: any[] = json?.result?.path || [];
    if (!Array.isArray(paths) || paths.length === 0) return [];

    const isOriginOrDestGtx = ['수서', '동탄', '성남', '구성'].some(st => startName.includes(st) || destName.includes(st));

    // 필터링: 1) 환승 4회 이상 제외, 2) 중간 GTX 환승 제외
    const validPaths = paths.filter((p: any) => {
      const totalTransfers = Math.max(0, (p.info?.busTransitCount || 0) + (p.info?.subwayTransitCount || 0) - 1);
      if (totalTransfers >= 4) return false;

      if (!isOriginOrDestGtx) {
        const hasGtx = p.subPath?.some((sp: any) =>
          sp.lane?.some((l: any) => (l.name || '').includes('GTX') || (l.busNo || '').includes('GTX'))
        );
        if (hasGtx) return false;
      }
      return true;
    });

    const candidates: RouteCandidate[] = [];

    validPaths.slice(0, 3).forEach((pathData, idx) => {
      const totalTime = pathData.info?.totalTime || 45;
      const startDeptMins = isCommuteIn ? Math.max(0, targetMins - totalTime) : targetMins;
      const baseId = `odsay-cand-${idx + 1}`;

      const parsed = parseOdsayPath(pathData, startDeptMins, baseId, startName, destName, startLat, startLng, destLat, destLng);
      if (!parsed) return;

      const firstStepDeptMins = parsed.steps[0]?.departureTime ? parseTimeToMinutes(parsed.steps[0].departureTime) : startDeptMins;
      const lastStepArrMins = (parsed.steps.length > 0 && parsed.steps[parsed.steps.length - 1]?.arrivalTime)
        ? parseTimeToMinutes(parsed.steps[parsed.steps.length - 1].arrivalTime!)
        : (startDeptMins + parsed.totalMinutes);
      const deptTimeStr = minutesToTimeString(firstStepDeptMins);
      const arrTimeStr = minutesToTimeString(lastStepArrMins);
      const totalDurationMinutes = Math.max(5, lastStepArrMins - firstStepDeptMins);

      const walkMinutes = parsed.steps.filter(s => s.type === 'walk').reduce((sum, s) => sum + s.durationMinutes, 0);
      const busMinutes = parsed.steps.filter(s => s.type === 'public_bus' || s.type === 'subway').reduce((sum, s) => sum + s.durationMinutes, 0);

      const cand: RouteCandidate = {
        id: `odsay-route-candidate-${idx + 1}`,
        badges: idx === 0 ? ['fastest'] : [],
        title: `대중교통: ${parsed.summaryTitle}`,
        subtitle: `실시간 대중교통 최적 연계 (${parsed.summaryDesc}, ₩${parsed.fare.toLocaleString()})`,
        departureTime: deptTimeStr,
        arrivalTime: arrTimeStr,
        totalDurationMinutes,
        walkMinutes,
        waitMinutes: 3,
        busMinutes,
        fare: parsed.fare,
        transferCount: parsed.transferCount,
        steps: parsed.steps,
        routeColor: idx === 0 ? '#0284c7' : '#0ea5e9',
        routeName: `실시간대중교통-${idx + 1}`,
        routeCategory: 'public_transit',
        score: parsed.totalMinutes + walkMinutes * 1.2 + parsed.transferCount * 12
      };

      applyUnifiedTransitFare(cand);
      candidates.push(cand);
    });

    return candidates;
  } catch (err) {
    console.warn('[ODsay] 길찾기 API 연동 실패:', err);
    return [];
  }
}
