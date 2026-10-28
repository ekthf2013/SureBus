import { RouteCandidate, RouteStepItem, SearchParams } from '../types/bus';
import { parseTimeToMinutes, minutesToTimeString, getHaversineDistanceMeters } from './distance';
import { applyUnifiedTransitFare, classifyTransitBus } from './searchEngine';
import { markKakaoQuotaExceeded } from './apiQuotaManager';

const HQ_LAT = 37.40698104234706;
const HQ_LNG = 127.08871065248748;

export interface FeederBusInfo {
  startStopName: string;
  endStopName: string;
  vehicles: Array<{ name: string; type: string }>;
  durationMinutes: number;
  distanceMeters: number;
  stops: string[];
  busNo: string;
  busLineDesc: string;
  coords?: { lat: number; lng: number };
}

// In-memory cache for Kakao transit routing results & feeder bus
const transitCache = new Map<string, any>();
const feederCache = new Map<string, FeederBusInfo>();

export function getCachedFeederBus(
  originLat: number,
  originLng: number,
  hubLat?: number,
  hubLng?: number
): FeederBusInfo | null {
  if (hubLat !== undefined && hubLng !== undefined && hubLat !== 0 && hubLng !== 0) {
    const key = `${originLat.toFixed(3)},${originLng.toFixed(3)}->${hubLat.toFixed(3)},${hubLng.toFixed(3)}`;
    const found = feederCache.get(key);
    if (found) return found;
  }
  // If exact key not found or hub coordinates omitted, search by origin proximity (~1.5km)
  for (const [key, val] of feederCache.entries()) {
    const parts = key.split('->');
    if (parts.length > 0) {
      const [oLatStr, oLngStr] = parts[0].split(',');
      const oLat = parseFloat(oLatStr);
      const oLng = parseFloat(oLngStr);
      if (Math.abs(oLat - originLat) < 0.015 && Math.abs(oLng - originLng) < 0.015) {
        return val;
      }
    }
  }
  return null;
}

function getKakaoRestKey(): string {
  if (typeof import.meta !== 'undefined' && import.meta.env?.VITE_KAKAO_REST_KEY) {
    return import.meta.env.VITE_KAKAO_REST_KEY;
  }
  return '8d38096e3c6e5c2f30656aad156def02';
}

/**
 * 카카오 대중교통 API 응답에서 정류장/역명이 중복 반복되는 현상 정제
 * 예: '백현마을4단지백현마을4단지정류장까지 도보로 이동' -> '백현마을4단지정류장까지 도보로 이동'
 * 예: '수진역.성호시장.성일중고입구수진역.성호시장.성일중고입구...' -> '수진역.성호시장.성일중고입구정류장까지 도보로 이동'
 */
export function cleanGuidance(text: string): string {
  if (!text) return '';
  // 1. 연속된 동일 패턴 반복 제거 (특수기호, 점 포함)
  let cleaned = text.replace(/([가-힣A-Za-z0-9._\s-]{3,})\1+/g, '$1');
  cleaned = cleaned.replace(/([가-힣A-Za-z0-9]{2,})\1+/g, '$1');
  // 2. 공백 포함 반복 제거 (예: '강남역 강남역')
  cleaned = cleaned.replace(/([가-힣A-Za-z0-9]{2,})\s+\1/g, '$1');
  return cleaned.trim();
}

/**
 * 카카오 공식 대중교통 경로 조회 API 호출
 */
export async function callKakaoPublicTraffic(
  startX: number,
  startY: number,
  endX: number,
  endY: number
): Promise<any | null> {
  const key = getKakaoRestKey();
  if (!key || startX === 0 || startY === 0 || endX === 0 || endY === 0) return null;

  const cacheKey = `${startX.toFixed(4)},${startY.toFixed(4)}->${endX.toFixed(4)},${endY.toFixed(4)}`;
  if (transitCache.has(cacheKey)) {
    return transitCache.get(cacheKey);
  }

  const query = `start_x=${startX}&start_y=${startY}&end_x=${endX}&end_y=${endY}`;
  const urls = [
    `/api/kakao-traffic/v2/routing/publictraffic?${query}`,
    `https://dapi.kakao.com/v2/routing/publictraffic?${query}`
  ];

  for (const url of urls) {
    try {
      const res = await fetch(url, {
        headers: {
          Authorization: `KakaoAK ${key}`
        },
        signal: AbortSignal.timeout(3500)
      });
      if (res.ok) {
        const json = await res.json();
        if (json && json.status === 'OK' && Array.isArray(json.routes)) {
          transitCache.set(cacheKey, json);
          return json;
        }
      } else {
        const errJson = await res.json().catch(() => null);
        if (res.status === 429 || res.status === 400 || errJson?.code === -10 || errJson?.message?.includes('API limit')) {
          markKakaoQuotaExceeded();
        }
      }
    } catch {
      // try next url or return null
    }
  }

  return null;
}

/**
 * 출발지 좌표(아파트 등)에서 인근 전철역/허브까지의 실제 연계 시내·마을버스 정보를 카카오 API로 실시간 조회
 * (하드코딩 배제: 카카오맵 교통 알고리즘이 발견한 실제 버스 정류장 명칭 및 운행 버스 목록 100% 동적 추출)
 */
export async function fetchDynamicFeederBus(
  originLat: number,
  originLng: number,
  hubLat: number,
  hubLng: number
): Promise<FeederBusInfo | null> {
  const cached = getCachedFeederBus(originLat, originLng, hubLat, hubLng);
  if (cached) return cached;

  const json = await callKakaoPublicTraffic(originLng, originLat, hubLng, hubLat);
  if (!json || !Array.isArray(json.routes) || json.routes.length === 0) return null;

  let firstStop = '';
  let lastStop = '';
  let duration = 0;
  let distance = 0;
  let coords: { lat: number; lng: number } | undefined = undefined;
  const vehicleSet = new Set<string>();
  const vehicleObjects: Array<{ name: string; type: string }> = [];
  const allStops: string[] = [];

  // 1. 최적 직통 경로의 승차/하차 정류장 확정
  let targetEndStop = '';
  for (const route of json.routes) {
    const busStep = route.steps?.find((s: any) => s.properties?.type === 'BUS');
    if (busStep && busStep.properties) {
      const p = busStep.properties;
      const stops = (p.stops || []).map((st: any) => cleanGuidance(st.name)).filter(Boolean);
      if (stops.length > 0) {
        firstStop = stops[0];
        lastStop = stops[stops.length - 1];
        targetEndStop = lastStop.replace(/(\d+번출구|\d+호선|출구)/g, '').trim();
        duration = Math.max(2, Math.round(p.time / 60));
        distance = p.distance || 0;
        if (busStep.path?.points?.[0]) {
          coords = { lat: busStep.path.points[0][1], lng: busStep.path.points[0][0] };
        }
        allStops.push(...stops);
        break;
      }
    }
  }

  if (!firstStop || !lastStop) return null;

  // 2. 동일 출발 정류소에서 동일 하차 정류소(또는 거점역)로 운행하는 직통 버스만 수집 (무관한 타 방면 버스 완전 배제)
  for (const route of json.routes) {
    const busStep = route.steps?.find((s: any) => s.properties?.type === 'BUS');
    if (busStep && busStep.properties) {
      const p = busStep.properties;
      const stops = (p.stops || []).map((st: any) => cleanGuidance(st.name)).filter(Boolean);
      const routeLastStop = stops[stops.length - 1] || '';
      const cleanRouteLast = routeLastStop.replace(/(\d+번출구|\d+호선|출구)/g, '').trim();

      // 같은 하차 정류소(또는 동일 거점 전철역 방면)로 가는 노선만 허용 (다른 곳으로 빠지는 버스 완전 배제)
      const isSameDestination = cleanRouteLast === targetEndStop || 
        cleanRouteLast.includes(targetEndStop) || 
        targetEndStop.includes(cleanRouteLast);

      if (!isSameDestination) continue;

      for (const v of (p.vehicles || [])) {
        const vName = String(v.name || '').trim();
        if (vName && !vehicleSet.has(vName)) {
          vehicleSet.add(vName);
          vehicleObjects.push({ name: vName, type: String(v.type || '시내버스') });
        }
      }
    }
  }

  if (vehicleObjects.length === 0) return null;

  const vList = Array.from(vehicleSet);
  const busNo = vList.join('/');
  const busLineDesc = '시내 ' + (vList.length <= 4 ? vList.map(v => `${v}번`).join(' · ') : `${vList.slice(0, 3).map(v => `${v}번`).join(' · ')} 외 ${vList.length - 3}개`);

  const result: FeederBusInfo = {
    startStopName: firstStop,
    endStopName: lastStop || '거점역 환승정류장',
    vehicles: vehicleObjects,
    durationMinutes: duration || 12,
    distanceMeters: distance || 2500,
    stops: allStops,
    busNo,
    busLineDesc,
    coords
  };

  const cacheKey = `${originLat.toFixed(3)},${originLng.toFixed(3)}->${hubLat.toFixed(3)},${hubLng.toFixed(3)}`;
  feederCache.set(cacheKey, result);

  return result;
}

/**
 * 카카오 대중교통 API를 호출하여 출발지 ➔ 사옥(또는 사옥 ➔ 귀가지) 전체 경로를 완전 동적으로 탐색
 */
export async function fetchKakaoTransitCandidates(params: SearchParams): Promise<RouteCandidate[]> {
  const { originLat, originLng, originName, mode, targetTime, filters } = params;

  if (!filters.usePublicTransit || filters.useCompanyBusOnly) return [];
  if (!originName || (originLat === 0 && originLng === 0)) return [];

  const isCommuteIn = mode === 'commute_in';
  const startX = isCommuteIn ? originLng : HQ_LNG;
  const startY = isCommuteIn ? originLat : HQ_LAT;
  const endX = isCommuteIn ? HQ_LNG : originLng;
  const endY = isCommuteIn ? HQ_LAT : originLat;
  const startName = isCommuteIn ? originName : '판교 사옥';
  const destName = isCommuteIn ? '판교 사옥' : originName;

  const targetMins = parseTimeToMinutes(targetTime);

  const json = await callKakaoPublicTraffic(startX, startY, endX, endY);
  if (!json || !Array.isArray(json.routes) || json.routes.length === 0) return [];

  const candidates: RouteCandidate[] = [];

  json.routes.slice(0, 8).forEach((r: any, rIdx: number) => {
    const p = r.properties || {};
    const totalDuration = Math.max(10, Math.round((p.totalTime || 3600) / 60));
    const transfers = p.transfers || 0;

    interface ParsedTransitStep {
      item: RouteStepItem;
      startCoord?: { lat: number; lng: number };
      endCoord?: { lat: number; lng: number };
      rawType: string;
    }

    // 1. 카카오 API 원시 단계 파싱 (좌표 및 정류장 정보 보존)
    const rawParsed: ParsedTransitStep[] = [];
    (r.steps || []).forEach((s: any) => {
      const sp = s.properties || {};
      const stepType = sp.type; // WALKING, BUS, SUBWAY
      const stepDuration = Math.max(1, Math.round((sp.time || 60) / 60));
      const pts = s.path?.points || [];
      const startCoord = pts[0] ? { lat: pts[0][1], lng: pts[0][0] } : undefined;
      const endCoord = pts.length > 0 ? { lat: pts[pts.length - 1][1], lng: pts[pts.length - 1][0] } : undefined;

      if (stepType === 'WALKING') {
        const rawGuidance = sp.guidance ? cleanGuidance(sp.guidance) : '';
        const walkTitle = rawGuidance || '도보 이동';
        rawParsed.push({
          rawType: 'WALKING',
          startCoord,
          endCoord,
          item: {
            id: 'temp',
            type: 'walk',
            title: walkTitle,
            subtitle: `도보 약 ${stepDuration}분 (${sp.distance ? `${sp.distance}m` : ''})`,
            durationMinutes: stepDuration,
            distanceMeters: sp.distance,
            coords: startCoord
          }
        });
      } else if (stepType === 'BUS') {
        const vehicles = (sp.vehicles || []).map((v: any) => v.name).filter(Boolean);
        const vehicleText = vehicles.length > 0 ? `${vehicles.join('/')}번` : '시내버스';
        const firstVeh = sp.vehicles?.[0];
        const vType = firstVeh?.type;
        const busNumber = vehicles[0] || '';

        // 동적 광역/순환/좌석/시내버스 자동 분류 (하드코딩 배제)
        const busInfo = classifyTransitBus({
          vType,
          guidance: sp.guidance,
          busNumber,
          contextText: `${sp.guidance || ''} ${vehicleText}`
        });

        const busPrefix = busInfo.displayNamePrefix ? `${busInfo.displayNamePrefix} ` : '';
        const busTitle = `${busPrefix}${vehicleText} 탑승`.replace('버스 버스', '버스');
        const startStop = cleanGuidance(sp.stops?.[0]?.name || '승차 정류장');
        const endStop = cleanGuidance(sp.stops?.[sp.stops.length - 1]?.name || '하차 정류장');
        const stCount = sp.stops?.length || 1;
        const lineTag = busInfo.category === 'express' ? '광역 ' : busInfo.category === 'circulation' ? '경기순환 ' : busInfo.category === 'seat' ? '좌석 ' : '';

        rawParsed.push({
          rawType: 'BUS',
          startCoord,
          endCoord,
          item: {
            id: 'temp',
            type: 'public_bus',
            title: busTitle,
            subtitle: `${startStop} ➔ ${endStop} (${stepDuration}분 소요, ${stCount}개 정류장)`,
            durationMinutes: stepDuration,
            distanceMeters: sp.distance,
            fare: busInfo.baseFare,
            boardingStopName: startStop,
            dropoffStopName: endStop,
            busNo: vehicles.join('/'),
            note: `🚏 탑승 정류소: ${startStop} (운행 노선: ${lineTag}${vehicles.map((v: any) => `${v}번`).join(', ')})`,
            coords: startCoord
          }
        });
      } else if (stepType === 'SUBWAY') {
        const lineName = sp.vehicles?.[0]?.name || '지하철';
        const startStn = cleanGuidance(sp.stops?.[0]?.name || '출발역');
        const endStn = cleanGuidance(sp.stops?.[sp.stops.length - 1]?.name || '도착역');
        const stCount = sp.stops?.length || 1;

        rawParsed.push({
          rawType: 'SUBWAY',
          startCoord,
          endCoord,
          item: {
            id: 'temp',
            type: 'subway',
            title: `${lineName} ${startStn} 탑승 ➔ ${endStn} 이동`,
            subtitle: `${endStn} 방면 (${stepDuration}분 소요, ${stCount}개 역)`,
            durationMinutes: stepDuration,
            distanceMeters: sp.distance,
            fare: 1500,
            boardingStopName: startStn,
            dropoffStopName: endStn,
            note: `🚇 ${lineName} 탑승 (${stCount}개 역 이동)`,
            coords: startCoord
          }
        });
      }
    });

    if (rawParsed.length === 0) return;

    // 2. 카카오 API에서 생략된 도보 단계 판정 (First-mile 출발 도보, 환승 대기/이동, Last-mile 도착 도보)
    const originCoord = { lat: startY, lng: startX };
    const destCoord = { lat: endY, lng: endX };

    // A. 첫 탑승 정류장까지 도보
    const firstStep = rawParsed[0];
    let firstWalkDist = 0;
    let needFirstWalk = false;
    if (firstStep.item.type !== 'walk') {
      const boardCoord = firstStep.startCoord || originCoord;
      firstWalkDist = getHaversineDistanceMeters(originCoord.lat, originCoord.lng, boardCoord.lat, boardCoord.lng);
      if (firstWalkDist > 30) {
        needFirstWalk = true;
      }
    } else {
      if (!firstStep.item.title.includes(startName)) {
        firstStep.item.title = `${startName} 출발 ➔ ${firstStep.item.title}`;
      }
    }

    // B. 대중교통 간 환승 대기 / 승강장 이동 (광역버스 간 환승 등 카카오가 도보 생략한 구간 자동 보완)
    const interTransfers: Array<{
      afterIndex: number;
      dist: number;
      fromStop: string;
      toStop: string;
      coord?: { lat: number; lng: number };
    }> = [];

    for (let i = 0; i < rawParsed.length - 1; i++) {
      const curr = rawParsed[i];
      const next = rawParsed[i + 1];
      if (curr.item.type !== 'walk' && next.item.type !== 'walk') {
        const dropPt = curr.endCoord;
        const boardPt = next.startCoord;
        const dist = (dropPt && boardPt) ? getHaversineDistanceMeters(dropPt.lat, dropPt.lng, boardPt.lat, boardPt.lng) : 0;
        interTransfers.push({
          afterIndex: i,
          dist,
          fromStop: curr.item.dropoffStopName || '하차 정류소',
          toStop: next.item.boardingStopName || '승차 정류소',
          coord: dropPt || boardPt
        });
      }
    }

    // C. 마지막 하차 정류장에서 최종 목적지(판교 사옥 또는 귀가지)까지 도보
    const lastStep = rawParsed[rawParsed.length - 1];
    let lastWalkDist = 0;
    let needLastWalk = false;
    if (lastStep.item.type !== 'walk') {
      const dropCoord = lastStep.endCoord || destCoord;
      lastWalkDist = getHaversineDistanceMeters(dropCoord.lat, dropCoord.lng, destCoord.lat, destCoord.lng);
      if (lastWalkDist > 30) {
        needLastWalk = true;
      }
    } else {
      if (!lastStep.item.title.includes(destName)) {
        lastStep.item.title = `${lastStep.item.title} ➔ ${destName} 도착`;
      }
    }

    // 3. 실제 총 소요시간(totalDuration)과 탑승 시간 간의 차이를 정밀 도보 시간으로 배분
    const knownTransitMins = rawParsed.filter(s => s.item.type !== 'walk').reduce((sum, s) => sum + s.item.durationMinutes, 0);
    const knownWalkMins = rawParsed.filter(s => s.item.type === 'walk').reduce((sum, s) => sum + s.item.durationMinutes, 0);
    const unallocatedMinutes = Math.max(0, totalDuration - (knownTransitMins + knownWalkMins));

    // 보행 기준 속도(67m/분, 시속 약 4km/h) 기반 이론 소요시간 산출
    const estFirst = needFirstWalk ? Math.max(1, Math.round(firstWalkDist / 67)) : 0;
    const estLast = needLastWalk ? Math.max(1, Math.round(lastWalkDist / 67)) : 0;
    const estTransfers = interTransfers.map(t => (t.dist > 30 ? Math.max(2, Math.round(t.dist / 67)) : 3));
    const sumEst = estFirst + estLast + estTransfers.reduce((a, b) => a + b, 0);

    let allocFirst = 0;
    let allocLast = 0;
    const allocTransfers: number[] = [];

    if (unallocatedMinutes > 0 && sumEst > 0) {
      allocFirst = needFirstWalk ? Math.max(1, Math.round(unallocatedMinutes * (estFirst / sumEst))) : 0;
      allocLast = needLastWalk ? Math.max(1, Math.round(unallocatedMinutes * (estLast / sumEst))) : 0;
      interTransfers.forEach((_, idx) => {
        allocTransfers.push(Math.max(1, Math.round(unallocatedMinutes * (estTransfers[idx] / sumEst))));
      });
      const currentAllocSum = allocFirst + allocLast + allocTransfers.reduce((a, b) => a + b, 0);
      const diff = unallocatedMinutes - currentAllocSum;
      if (needLastWalk) {
        allocLast += diff;
      } else if (needFirstWalk) {
        allocFirst += diff;
      } else if (allocTransfers.length > 0) {
        allocTransfers[0] += diff;
      }
    } else {
      allocFirst = estFirst;
      allocLast = estLast;
      interTransfers.forEach((_, idx) => allocTransfers.push(estTransfers[idx]));
    }

    // 4. 최종 순차 타임라인 구축
    const fullSteps: RouteStepItem[] = [];
    let stepIdx = 1;

    if (needFirstWalk) {
      const firstStopName = firstStep.item.boardingStopName || '승차 정류장';
      const firstDistText = firstWalkDist >= 1000 ? `${(firstWalkDist / 1000).toFixed(1)}km` : `${Math.round(firstWalkDist)}m`;
      fullSteps.push({
        id: `kakao-step-${rIdx + 1}-${stepIdx++}`,
        type: 'walk',
        title: `${startName} 출발 ➔ ${firstStopName} 도보 이동`,
        subtitle: `도보 약 ${allocFirst}분 (${firstDistText})`,
        durationMinutes: allocFirst,
        distanceMeters: Math.round(firstWalkDist),
        coords: originCoord
      });
    }

    rawParsed.forEach((parsed, pIdx) => {
      fullSteps.push({
        ...parsed.item,
        id: `kakao-step-${rIdx + 1}-${stepIdx++}`
      });

      const trans = interTransfers.find(t => t.afterIndex === pIdx);
      if (trans) {
        const tIdx = interTransfers.indexOf(trans);
        const transDuration = allocTransfers[tIdx] || 3;
        const transDistText = trans.dist >= 1000 ? `${(trans.dist / 1000).toFixed(1)}km` : `${Math.round(trans.dist)}m`;
        const transTitle = trans.dist > 30
          ? `${trans.fromStop} ➔ ${trans.toStop} 환승 도보 이동`
          : `${trans.fromStop} 환승 대기 / 승강장 이동`;
        const transSub = trans.dist > 30
          ? `환승 도보 약 ${transDuration}분 (${transDistText})`
          : `탑승 대기 및 승강장 이동 (약 ${transDuration}분)`;

        fullSteps.push({
          id: `kakao-step-${rIdx + 1}-${stepIdx++}`,
          type: 'walk',
          title: transTitle,
          subtitle: transSub,
          durationMinutes: transDuration,
          distanceMeters: Math.round(trans.dist),
          coords: trans.coord
        });
      }
    });

    if (needLastWalk) {
      const lastDropStop = lastStep.item.dropoffStopName || '하차 정류장';
      const lastDistText = lastWalkDist >= 1000 ? `${(lastWalkDist / 1000).toFixed(1)}km` : `${Math.round(lastWalkDist)}m`;
      fullSteps.push({
        id: `kakao-step-${rIdx + 1}-${stepIdx++}`,
        type: 'walk',
        title: `${lastDropStop} 하차 ➔ ${destName} 도보 이동`,
        subtitle: `도보 약 ${allocLast}분 (${lastDistText})`,
        durationMinutes: allocLast,
        distanceMeters: Math.round(lastWalkDist),
        coords: destCoord
      });
    }

    // 5. 연속적 타임라인(출발 시각 ~ 도착 시각) 생성
    const actualTotalDuration = fullSteps.reduce((sum, s) => sum + s.durationMinutes, 0);
    const startDeptMins = isCommuteIn ? Math.max(0, targetMins - actualTotalDuration) : targetMins;
    let curMins = startDeptMins;

    fullSteps.forEach(step => {
      step.departureTime = minutesToTimeString(curMins);
      curMins += step.durationMinutes;
      step.arrivalTime = minutesToTimeString(curMins);
    });

    const finalArrMins = curMins;
    const walkMinutes = fullSteps.filter(s => s.type === 'walk').reduce((sum, s) => sum + s.durationMinutes, 0);
    const busMinutes = fullSteps.filter(s => s.type === 'public_bus' || s.type === 'subway').reduce((sum, s) => sum + s.durationMinutes, 0);

    const firstTransit = fullSteps.find(s => s.type === 'public_bus' || s.type === 'subway');
    const mainTransitTitle = firstTransit ? firstTransit.title.replace(' 탑승', '') : '대중교통';

    const badges: any[] = [];
    if (rIdx === 0) badges.push('fastest');
    if (transfers === 0) badges.push('direct');
    if (walkMinutes <= 6) badges.push('min_walk');

    const cand: RouteCandidate = {
      id: `kakao-transit-candidate-${rIdx + 1}`,
      badges,
      title: `실시간 대중교통: ${mainTransitTitle}`,
      subtitle: `${startName} ➔ ${destName} (환승 ${transfers}회, 총 ${actualTotalDuration}분)`,
      departureTime: minutesToTimeString(startDeptMins),
      arrivalTime: minutesToTimeString(finalArrMins),
      totalDurationMinutes: actualTotalDuration,
      walkMinutes,
      waitMinutes: 3,
      busMinutes,
      fare: 0,
      transferCount: transfers,
      steps: fullSteps,
      routeColor: rIdx === 0 ? '#2563eb' : '#0284c7',
      routeName: `카카오 대중교통 ${rIdx + 1}`,
      routeCategory: 'public_transit',
      score: actualTotalDuration + walkMinutes * 1.1 + transfers * 10
    };

    applyUnifiedTransitFare(cand);
    candidates.push(cand);
  });

  return candidates;
}
