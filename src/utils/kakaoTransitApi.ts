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
    const fare = p.fare?.min || 1500;

    // 출근 시 도착 시각(targetMins)에 맞추어 출발 시각 역산, 퇴근 시 targetMins에서 출발
    const startDeptMins = isCommuteIn ? Math.max(0, targetMins - totalDuration) : targetMins;
    let currentMins = startDeptMins;

    const steps: RouteStepItem[] = [];
    let stepIdx = 1;

    (r.steps || []).forEach((s: any) => {
      const sp = s.properties || {};
      const stepType = sp.type; // WALKING, BUS, SUBWAY
      const stepDuration = Math.max(1, Math.round((sp.time || 60) / 60));
      const deptStr = minutesToTimeString(currentMins);
      const arrMins = currentMins + stepDuration;
      const arrStr = minutesToTimeString(arrMins);

      if (stepType === 'WALKING') {
        const rawGuidance = sp.guidance ? cleanGuidance(sp.guidance) : '';
        const walkTitle = rawGuidance || (steps.length === 0 ? `${startName} 출발 ➔ 도보 이동` : '도보 이동');

        steps.push({
          id: `kakao-step-${rIdx + 1}-${stepIdx++}`,
          type: 'walk',
          title: walkTitle,
          subtitle: `도보 약 ${stepDuration}분 (${sp.distance ? `${sp.distance}m` : ''})`,
          departureTime: deptStr,
          arrivalTime: arrStr,
          durationMinutes: stepDuration,
          distanceMeters: sp.distance
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

        steps.push({
          id: `kakao-step-${rIdx + 1}-${stepIdx++}`,
          type: 'public_bus',
          title: busTitle,
          subtitle: `${startStop} ➔ ${endStop} (${stepDuration}분 소요, ${stCount}개 정류장)`,
          departureTime: deptStr,
          arrivalTime: arrStr,
          durationMinutes: stepDuration,
          distanceMeters: sp.distance,
          fare: busInfo.baseFare,
          boardingStopName: startStop,
          dropoffStopName: endStop,
          busNo: vehicles.join('/'),
          note: `🚏 탑승 정류소: ${startStop} (운행 노선: ${lineTag}${vehicles.map((v: any) => `${v}번`).join(', ')})`,
          coords: s.path?.points?.[0] ? { lat: s.path.points[0][1], lng: s.path.points[0][0] } : undefined
        });
      } else if (stepType === 'SUBWAY') {
        const lineName = sp.vehicles?.[0]?.name || '지하철';
        const startStn = cleanGuidance(sp.stops?.[0]?.name || '출발역');
        const endStn = cleanGuidance(sp.stops?.[sp.stops.length - 1]?.name || '도착역');
        const stCount = sp.stops?.length || 1;

        steps.push({
          id: `kakao-step-${rIdx + 1}-${stepIdx++}`,
          type: 'subway',
          title: `${lineName} ${startStn} 탑승 ➔ ${endStn} 이동`,
          subtitle: `${endStn} 방면 (${stepDuration}분 소요, ${stCount}개 역)`,
          departureTime: deptStr,
          arrivalTime: arrStr,
          durationMinutes: stepDuration,
          distanceMeters: sp.distance,
          fare: 1500,
          boardingStopName: startStn,
          dropoffStopName: endStn,
          note: `🚇 ${lineName} 탑승 (${stCount}개 역 이동)`,
          coords: s.path?.points?.[0] ? { lat: s.path.points[0][1], lng: s.path.points[0][0] } : undefined
        });
      }

      currentMins = arrMins;
    });

    const finalArrMins = currentMins;
    const walkMinutes = steps.filter(s => s.type === 'walk').reduce((sum, s) => sum + s.durationMinutes, 0);
    const busMinutes = steps.filter(s => s.type === 'public_bus' || s.type === 'subway').reduce((sum, s) => sum + s.durationMinutes, 0);

    const firstTransit = steps.find(s => s.type === 'public_bus' || s.type === 'subway');
    const mainTransitTitle = firstTransit ? firstTransit.title.replace(' 탑승', '') : '대중교통';

    const badges: any[] = [];
    if (rIdx === 0) badges.push('fastest');
    if (transfers === 0) badges.push('direct');
    if (walkMinutes <= 6) badges.push('min_walk');

    const cand: RouteCandidate = {
      id: `kakao-transit-candidate-${rIdx + 1}`,
      badges,
      title: `실시간 대중교통: ${mainTransitTitle}`,
      subtitle: `${startName} ➔ ${destName} (환승 ${transfers}회, 총 ${totalDuration}분)`,
      departureTime: minutesToTimeString(startDeptMins),
      arrivalTime: minutesToTimeString(finalArrMins),
      totalDurationMinutes: finalArrMins - startDeptMins,
      walkMinutes,
      waitMinutes: 3,
      busMinutes,
      fare: 0,
      transferCount: transfers,
      steps,
      routeColor: rIdx === 0 ? '#2563eb' : '#0284c7',
      routeName: `카카오 대중교통 ${rIdx + 1}`,
      routeCategory: 'public_transit',
      score: (finalArrMins - startDeptMins) + walkMinutes * 1.1 + transfers * 10
    };

    applyUnifiedTransitFare(cand);
    candidates.push(cand);
  });

  return candidates;
}
