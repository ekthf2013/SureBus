import { RouteCandidate, RouteStepItem, SearchParams } from '../types/bus';
import { parseTimeToMinutes, minutesToTimeString, getHaversineDistanceMeters } from './distance';
import { applyUnifiedTransitFare, classifyTransitBus } from './searchEngine';

const HQ_LAT = 37.40698104234706;
const HQ_LNG = 127.08871065248748;

export interface FeederBusInfo {
  startStopName: string;
  endStopName: string;
  vehicles: Array<{ name: string; type: string }>;
  durationMinutes: number;
  distanceMeters: number;
  stops: string[];
}

// In-memory cache for Kakao transit routing results
const transitCache = new Map<string, any>();

function getKakaoRestKey(): string {
  if (typeof import.meta !== 'undefined' && import.meta.env?.VITE_KAKAO_REST_KEY) {
    return import.meta.env.VITE_KAKAO_REST_KEY;
  }
  return '';
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
      }
    } catch {
      // try next url or return null
    }
  }

  return null;
}

/**
 * 출발지 좌표(아파트 등)에서 인근 전철역/허브까지의 실제 연계 시내·마을버스 정보를 카카오 API로 실시간 조회
 */
export async function fetchDynamicFeederBus(
  originLat: number,
  originLng: number,
  hubLat: number,
  hubLng: number
): Promise<FeederBusInfo | null> {
  const json = await callKakaoPublicTraffic(originLng, originLat, hubLng, hubLat);
  if (!json || !Array.isArray(json.routes) || json.routes.length === 0) return null;

  // 가장 빠른 대중교통 경로에서 버스 구간 추출
  for (const route of json.routes) {
    const busStep = route.steps?.find((s: any) => s.properties?.type === 'BUS');
    if (busStep && busStep.properties) {
      const p = busStep.properties;
      const stops = (p.stops || []).map((st: any) => st.name).filter(Boolean);
      const startStopName = stops[0] || '인근 버스정류장';
      const endStopName = stops[stops.length - 1] || '환승 정류장';
      const vehicles: Array<{ name: string; type: string }> = (p.vehicles || []).map((v: any) => ({
        name: String(v.name || ''),
        type: String(v.type || '시내버스')
      })).filter((v: any) => Boolean(v.name));

      return {
        startStopName,
        endStopName,
        vehicles,
        durationMinutes: Math.max(2, Math.round((p.time || 300) / 60)),
        distanceMeters: p.distance || 0,
        stops
      };
    }
  }

  return null;
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
