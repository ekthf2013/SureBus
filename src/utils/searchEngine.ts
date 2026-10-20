import { SearchParams, RouteCandidate, RouteStepItem, BadgeType } from '../types/bus';
import { RouteData, STATION_COORDS } from '../data/initialBusData';
import { getHaversineDistanceMeters, estimateWalkMinutes, parseTimeToMinutes, minutesToTimeString, subtractMinutesFromTime, addMinutesToTime } from './distance';
import { SUBWAY_NETWORK_HUBS, SubwayStationInfo, buildSubwayRouteSteps, calculateSubwayRoute, normalizeStationName } from './subwayNetwork';
import { findConnectingBus } from './connectingBusData';

// 통근버스 요금 (일반 대중교통과 환승 할인 불가)
const COMMUTE_BUS_FARE = 1500;

// 경기도 공식 버스 요금 기준 (교통카드 기준: 일반형 1,650원, 좌석형 2,650원, 직행좌석형 3,200원, 경기순환형 3,450원)
export const GYEONGGI_BUS_FARES = {
  CITY_NORMAL: 1650,    // 일반형 (성남 310, 87, 332번 등 시내버스)
  SEAT_NORMAL: 2650,    // 좌석형
  EXPRESS_RED: 3200,    // 직행좌석형 (1007, 6900번 등 광역 빨간버스)
  CIRCULATION: 3450,    // 경기순환형
  EARLY_BIRD: {         // 조조할인 (첫차 ~ 06:30)
    CITY_NORMAL: 1450,
    SEAT_NORMAL: 2450,
    EXPRESS_RED: 2800,
    CIRCULATION: 3050,
  }
};

export type TransitBusCategory = 'express' | 'circulation' | 'seat' | 'city';

export interface BusClassificationResult {
  category: TransitBusCategory;
  categoryName: string;
  baseFare: number;
  earlyBirdDiscount: number;
  earlyBirdFare: number;
  baseDistanceKm: number;
  displayNamePrefix: string;
}

/**
 * 하드코딩 없이 버스 노선 유형(광역, 경기순환, 일반좌석, 일반시내)을 동적으로 판별
 * - Kakao API: vehicle.type ('직행', '광역', '급행', '순환', '좌석' 등) 및 guidance
 * - ODsay API: lane.type (4: 직행좌석, 14: 광역급행, 15: 경기순환, 2: 좌석 등)
 * - 번호 체계 패턴:
 *   - M버스: /^M\d+/i (광역급행버스)
 *   - G/P버스: /^[GP]\d+/i (경기 광역/프리미엄버스)
 *   - 경기순환: 8106, 8401, 8409, 8906 등 또는 순환 키워드
 *   - 4자리 번호 (1000~9999): 경기도 직행좌석형 광역버스 (지선 등 명시적인 시내버스가 아닌 경우)
 */
export function classifyTransitBus(params: {
  vType?: string | number;
  guidance?: string;
  busNumber?: string;
  contextText?: string;
}): BusClassificationResult {
  const { vType, guidance, busNumber, contextText } = params;

  const rawTypeStr = typeof vType === 'string' ? vType : '';
  const odsayTypeNum = typeof vType === 'number' ? vType : undefined;
  const combined = `${rawTypeStr} ${guidance || ''} ${contextText || ''}`.toLowerCase();
  const cleanBusNo = (busNumber || '').trim().replace(/번(버스)?$/, '');

  // 1. 경기순환버스 판별 (3,450원, 기본 30km, 조조 3,050원)
  const isCirculation =
    odsayTypeNum === 15 ||
    combined.includes('경기순환') ||
    combined.includes('순환버스') ||
    combined.includes('외곽순환') ||
    ['8106', '8401', '8409', '8906'].includes(cleanBusNo);

  if (isCirculation) {
    return {
      category: 'circulation',
      categoryName: '경기순환버스',
      baseFare: GYEONGGI_BUS_FARES.CIRCULATION,
      earlyBirdDiscount: GYEONGGI_BUS_FARES.CIRCULATION - GYEONGGI_BUS_FARES.EARLY_BIRD.CIRCULATION,
      earlyBirdFare: GYEONGGI_BUS_FARES.EARLY_BIRD.CIRCULATION,
      baseDistanceKm: 30,
      displayNamePrefix: '경기순환버스'
    };
  }

  // 2. 직행좌석형 광역버스 판별 (3,200원, 기본 30km, 조조 2,800원)
  const isExplicitCity =
    combined.includes('지선') ||
    combined.includes('마을') ||
    combined.includes('시내일반') ||
    odsayTypeNum === 3 ||
    odsayTypeNum === 12;

  const isExpressByType =
    odsayTypeNum === 4 ||
    odsayTypeNum === 6 ||
    odsayTypeNum === 14 ||
    rawTypeStr.includes('직행') ||
    rawTypeStr.includes('광역') ||
    rawTypeStr.includes('급행') ||
    combined.includes('직행좌석') ||
    combined.includes('광역급행') ||
    combined.includes('빨간버스') ||
    (guidance && (guidance.startsWith('직행') || guidance.startsWith('광역') || guidance.startsWith('급행')));

  const isExpressByNumber =
    !isExplicitCity &&
    (
      /^[MGP]\d+/i.test(cleanBusNo) ||
      (/^\d{4}$/.test(cleanBusNo) && Number(cleanBusNo) >= 1000)
    );

  if (isExpressByType || isExpressByNumber) {
    return {
      category: 'express',
      categoryName: '직행좌석형 광역버스',
      baseFare: GYEONGGI_BUS_FARES.EXPRESS_RED,
      earlyBirdDiscount: GYEONGGI_BUS_FARES.EXPRESS_RED - GYEONGGI_BUS_FARES.EARLY_BIRD.EXPRESS_RED,
      earlyBirdFare: GYEONGGI_BUS_FARES.EARLY_BIRD.EXPRESS_RED,
      baseDistanceKm: 30,
      displayNamePrefix: '광역버스'
    };
  }

  // 3. 일반 좌석버스 판별 (2,650원, 기본 30km, 조조 2,450원)
  const isSeat =
    odsayTypeNum === 2 ||
    rawTypeStr.includes('좌석') ||
    combined.includes('좌석버스');

  if (isSeat) {
    return {
      category: 'seat',
      categoryName: '좌석버스',
      baseFare: GYEONGGI_BUS_FARES.SEAT_NORMAL,
      earlyBirdDiscount: GYEONGGI_BUS_FARES.SEAT_NORMAL - GYEONGGI_BUS_FARES.EARLY_BIRD.SEAT_NORMAL,
      earlyBirdFare: GYEONGGI_BUS_FARES.EARLY_BIRD.SEAT_NORMAL,
      baseDistanceKm: 30,
      displayNamePrefix: '좌석버스'
    };
  }

  // 4. 일반 시내버스 / 마을버스 (1,650원, 기본 10km, 조조 1,450원)
  return {
    category: 'city',
    categoryName: '일반 시내버스',
    baseFare: GYEONGGI_BUS_FARES.CITY_NORMAL,
    earlyBirdDiscount: GYEONGGI_BUS_FARES.CITY_NORMAL - GYEONGGI_BUS_FARES.EARLY_BIRD.CITY_NORMAL,
    earlyBirdFare: GYEONGGI_BUS_FARES.EARLY_BIRD.CITY_NORMAL,
    baseDistanceKm: 10,
    displayNamePrefix: ''
  };
}

export interface TransitFareDetails {
  totalFare: number;
  baseFare: number;
  highestModeName: string;
  baseDistanceKm: number;
  totalTransitDistKm: number;
  distanceSurcharge: number;
  earlyBirdDiscount: number;
  isEarlyBird: boolean;
  firstModeName: string;
  sinbundangSurcharge: number;
}

/**
 * 수도권 통합환승할인제 공식 거리비례 운임 및 조조할인 정밀 계산
 */
export function calculateMetropolitanTransitFare(
  steps: RouteStepItem[],
  firstBoardingTimeStr?: string
): TransitFareDetails {
  const transitSteps = steps.filter((s) => s.type === 'subway' || s.type === 'public_bus');

  if (transitSteps.length === 0) {
    return {
      totalFare: 0,
      baseFare: 0,
      highestModeName: '도보',
      baseDistanceKm: 10,
      totalTransitDistKm: 0,
      distanceSurcharge: 0,
      earlyBirdDiscount: 0,
      isEarlyBird: false,
      firstModeName: '',
      sinbundangSurcharge: 0
    };
  }

  let highestBaseFare = 1500;
  let highestModeName = '수도권 전철';
  let hasExpressOrSeat = false;
  let totalTransitDistMeters = 0;

  transitSteps.forEach((st) => {
    if (st.distanceMeters && st.distanceMeters > 0) {
      totalTransitDistMeters += st.distanceMeters;
    } else {
      const estMeters = st.type === 'subway' ? st.durationMinutes * 600 : st.durationMinutes * 350;
      totalTransitDistMeters += estMeters;
    }

    if (st.type === 'public_bus') {
      const busInfo = classifyTransitBus({
        busNumber: st.title.match(/(\d+[A-Za-z]?|[MGP]\d+)/)?.[0],
        guidance: st.subtitle,
        contextText: `${st.title} ${st.note || ''}`
      });

      if (busInfo.category === 'express' || busInfo.category === 'circulation' || busInfo.category === 'seat') {
        hasExpressOrSeat = true;
      }

      if (busInfo.baseFare > highestBaseFare) {
        highestBaseFare = busInfo.baseFare;
        highestModeName = busInfo.categoryName;
      }
    } else if (st.type === 'subway') {
      if (highestBaseFare < 1500) {
        highestBaseFare = 1500;
        highestModeName = '수도권 전철';
      }
    }
  });

  const baseDistanceKm = hasExpressOrSeat ? 30 : 10;
  const totalTransitDistKm = Math.round((totalTransitDistMeters / 1000) * 10) / 10;

  // 시내버스 단독 통행(환승 0회)은 균일요금제 적용(거리비례 없음)
  const isSingleCityBus =
    transitSteps.length === 1 &&
    transitSteps[0].type === 'public_bus' &&
    !hasExpressOrSeat;

  let distanceSurcharge = 0;
  if (!isSingleCityBus && totalTransitDistKm > baseDistanceKm) {
    const overDistKm50 = Math.max(0, Math.min(totalTransitDistKm, 50) - baseDistanceKm);
    const surcharge50 = Math.ceil(overDistKm50 / 5) * 100;

    const overDistKmAbove50 = Math.max(0, totalTransitDistKm - 50);
    const surchargeAbove50 = Math.ceil(overDistKmAbove50 / 8) * 100;

    distanceSurcharge = surcharge50 + surchargeAbove50;
  }

  const firstTransit = transitSteps[0];
  const boardingTime = firstBoardingTimeStr || firstTransit.departureTime || '';
  const boardingMins = parseTimeToMinutes(boardingTime);
  const isEarlyBird = boardingMins > 0 && boardingMins <= 390;

  let earlyBirdDiscount = 0;
  let firstModeName = '';

  if (isEarlyBird) {
    if (firstTransit.type === 'subway') {
      earlyBirdDiscount = 300;
      firstModeName = '수도권 전철';
    } else {
      const firstBusInfo = classifyTransitBus({
        busNumber: firstTransit.title.match(/(\d+[A-Za-z]?|[MGP]\d+)/)?.[0],
        guidance: firstTransit.subtitle,
        contextText: `${firstTransit.title} ${firstTransit.note || ''}`
      });
      earlyBirdDiscount = firstBusInfo.earlyBirdDiscount;
      firstModeName = firstBusInfo.categoryName;
    }
  }

  let sinbundangSurcharge = 0;
  const usesSinbundang = transitSteps.some((st) =>
    (st.title + (st.subtitle || '') + (st.note || '')).includes('신분당선')
  );
  if (usesSinbundang) {
    sinbundangSurcharge = 1500;
  }

  const totalFare = Math.max(
    0,
    (highestBaseFare - earlyBirdDiscount) + distanceSurcharge + sinbundangSurcharge
  );

  return {
    totalFare,
    baseFare: highestBaseFare,
    highestModeName,
    baseDistanceKm,
    totalTransitDistKm,
    distanceSurcharge,
    earlyBirdDiscount,
    isEarlyBird,
    firstModeName,
    sinbundangSurcharge
  };
}

/**
 * 수도권 통합환승할인 및 거리비례 추가요금, 조조할인 자동 계산 및 후보 경로 반영
 */
export function applyUnifiedTransitFare(cand: RouteCandidate): boolean {
  if (!cand) return false;

  const transitSteps = cand.steps.filter((s) => s.type === 'subway' || s.type === 'public_bus');
  if (transitSteps.length === 0) return false;

  const fareResult = calculateMetropolitanTransitFare(cand.steps, cand.departureTime);

  // 대중교통 외 수단(통근버스 등)의 별도 요금 보존
  const nonTransitSteps = cand.steps.filter((s) => s.type !== 'subway' && s.type !== 'public_bus');
  const nonTransitFare = nonTransitSteps.reduce((sum, s) => sum + (s.fare || 0), 0);

  const prevFare = cand.fare;
  const newTotalFare = fareResult.totalFare + nonTransitFare;
  cand.fare = newTotalFare;

  // 조조할인 배지 및 첫 승차 단계 안내
  if (fareResult.isEarlyBird) {
    if (!cand.badges.includes('early_bird')) {
      cand.badges.push('early_bird');
    }
    const firstTransit = transitSteps[0];
    const discountNote = `🌅 조조할인 적용 (첫차~06:30 탑승: ${fareResult.firstModeName} ₩${fareResult.earlyBirdDiscount.toLocaleString()} 할인)`;
    if (firstTransit.note) {
      if (!firstTransit.note.includes('조조할인')) {
        firstTransit.note = `${firstTransit.note} | ${discountNote}`;
      }
    } else {
      firstTransit.note = discountNote;
    }
  }



  // 첫 번째 대중교통 단계의 fare 조정
  const firstTransit = transitSteps[0];
  if (firstTransit) {
    firstTransit.fare = Math.max(0, fareResult.baseFare - fareResult.earlyBirdDiscount);
  }

  // candidate subtitle 요금 표기 갱신
  if (cand.subtitle) {
    if (cand.subtitle.includes(`₩${prevFare.toLocaleString()}`)) {
      cand.subtitle = cand.subtitle.replace(`₩${prevFare.toLocaleString()}`, `₩${cand.fare.toLocaleString()}`);
    } else if (/₩[\d,]+/.test(cand.subtitle)) {
      cand.subtitle = cand.subtitle.replace(/₩[\d,]+/, `₩${cand.fare.toLocaleString()}`);
    } else if (cand.subtitle.endsWith(')')) {
      cand.subtitle = cand.subtitle.slice(0, -1) + `, ₩${cand.fare.toLocaleString()})`;
    }
  }

  return true;
}

export function applyEarlyBirdDiscount(cand: RouteCandidate): boolean {
  return applyUnifiedTransitFare(cand);
}


// 각 노선의 주요 정류장 순서 (출근 방향)
const ROUTE_STOP_ORDER: Record<string, string[]> = {
  route_commute_jamsil:    ['군자역', '건대역', '잠실역', '석촌역', '송파역', '가락시장역', '문정역', '장지역', '복정역', '모란역'],
  route_commute_sindorim:  ['신도림역', '대림역', '사당역'],
  route_commute_gangnam:   ['논현역', '신논현역', '강남역', '양재역'],
  route_commute_anyang:    ['광명역', '안양역', '범계역', '인덕원역'],
  route_commute_osan:      ['오산 교촌 본사', '사계절 꽃농원', '오산시청', '오산대역 후문', 'UN군초전기념관'],
  route_commute_dongtan:   ['금호어울림', '한신더휴', '신안2차,반도4차', '이주택지', '대방디엠시티', '한미약품', '예당고사거리'],
  route_shuttle_pangyo:    ['판교역', '삼평교'],
  route_shuttle_yatap:     ['야탑역', '판교2밸리'],
};

// 특정 정류장 이후의 경유 정류장 목록
function getStopsAfter(routeId: string, boardingStop: string): string[] {
  const stops = ROUTE_STOP_ORDER[routeId] || [];
  const idx = stops.indexOf(boardingStop);
  if (idx === -1) return [];
  return stops.slice(idx + 1);
}

// 경유지 요약 텍스트
function formatViaStops(stops: string[]): string {
  if (stops.length === 0) return '';
  if (stops.length <= 3) return stops.join(' → ');
  return `${stops.slice(0, 2).join(' → ')} … (${stops.length - 2}개 정류장 더)`;
}

// 가장 가까운 지하철 허브 찾기
function findNearestSubwayHub(originLat: number, originLng: number, originName: string): SubwayStationInfo | null {
  if (!originName && (originLat === 0 && originLng === 0)) return null;

  // 1. 호선 명칭 및 부가 텍스트 제거하여 순수 역명 후보 추출
  const strippedName = originName
    .replace(/(경의중앙선|경의중앙|신분당선|수인분당선|공항철도|우이신설선|서해선|경춘선|경강선|GTX-A|1호선|2호선|3호선|4호선|5호선|6호선|7호선|8호선|9호선|\d+호선)/g, ' ')
    .replace(/\(.*?\)/g, ' ')
    .replace(/[\d]+번\s*출구/g, ' ')
    .replace(/[\[\]]/g, ' ')
    .trim();

  // 사용자가 단독으로 정확한 역 이름만 검색했는지 판별 (예: '안산역', '강남역', '수원역')
  const isExplicitSingleStation =
    /^[가-힣\d]+역$/.test(strippedName) ||
    /^[가-힣\d]+역$/.test(originName.trim()) ||
    Boolean(SUBWAY_NETWORK_HUBS[normalizeStationName(originName.trim())]) ||
    Boolean(SUBWAY_NETWORK_HUBS[normalizeStationName(strippedName)]);

  if (isExplicitSingleStation) {
    const norm = normalizeStationName(strippedName) || normalizeStationName(originName.trim());
    if (SUBWAY_NETWORK_HUBS[norm]) {
      return SUBWAY_NETWORK_HUBS[norm];
    }
  }

  // 2. 아파트, 건물, 동네, 지번/도로명 주소 등 일반 장소인 경우 GPS 좌표 기반 가장 가까운 실제 역 탐색
  if (originLat !== 0 && originLng !== 0) {
    let closestHubByDist: SubwayStationInfo | null = null;
    let minDistance = 150000; // 150km 이내

    for (const hub of Object.values(SUBWAY_NETWORK_HUBS)) {
      const dist = getHaversineDistanceMeters(originLat, originLng, hub.lat, hub.lng);
      if (dist < minDistance) {
        minDistance = dist;
        closestHubByDist = hub;
      }
    }

    if (closestHubByDist) {
      return closestHubByDist;
    }
  }

  // 3. 텍스트 기반 폴백
  const normCand = normalizeStationName(strippedName);
  if (SUBWAY_NETWORK_HUBS[normCand]) {
    return SUBWAY_NETWORK_HUBS[normCand];
  }

  return Object.values(SUBWAY_NETWORK_HUBS)[0] || null;
}

// 출발지 ➔ 전철역/허브 정류장 간 접근 소요시간 및 이동 수단 산출 (도보 vs 시내버스)
export function getOriginAccess(originLat: number, originLng: number, originName: string, hub: SubwayStationInfo) {
  const distToHubMeters = getHaversineDistanceMeters(originLat, originLng, hub.lat, hub.lng);
  const cleanOrigin = originName.replace(/\s+/g, '');
  const cleanHub = hub.name.replace(/\s+/g, '');
  const isOriginThisStation = (cleanOrigin === cleanHub || cleanOrigin === cleanHub.replace(/역$/, '')) || distToHubMeters < 350;
  const hubDistText = distToHubMeters >= 1000 ? `${(distToHubMeters / 1000).toFixed(1)}km` : `${Math.round(distToHubMeters)}m`;

  if (isOriginThisStation) {
    return {
      minutes: 2,
      distMeters: 0,
      type: 'walk' as const,
      title: `${hub.name} 승강장 이동`,
      subtitle: '지하철 개찰구 ➔ 승강장 이동 (약 2분)',
      distText: '승강장',
      fare: 0,
      isApartment: false,
      headerPrefix: `${hub.name}`
    };
  } else if (distToHubMeters < 800) {
    const walkMins = Math.max(2, Math.round(distToHubMeters / 67));
    return {
      minutes: walkMins,
      distMeters: distToHubMeters,
      type: 'walk' as const,
      title: `${originName} 출발 ➔ ${hub.name} 도보`,
      subtitle: `${hub.name}까지 도보 약 ${walkMins}분 (${hubDistText})`,
      distText: hubDistText,
      fare: 0,
      isApartment: true,
      headerPrefix: `[${originName}] 도보 ➔ ${hub.name}`
    };
  } else {
    // 800m 이상: 거주지 앞 시내/마을버스 연계 (평균 22km/h + 정류장 대기 4분)
    const busMins = Math.min(35, Math.round(distToHubMeters / 350) + 4);
    const isWoolimGuri = (originName.includes('우림') || originName.includes('수평사거리')) && (hub.name.includes('장자호수') || hub.name.includes('구리'));
    const busLineDesc = isWoolimGuri ? '마을 6-1번 등' : '연계 시내/마을버스';
    const boardingName = isWoolimGuri ? '수평사거리.우림아파트' : `${originName} 인근 정류장`;
    const dropoffName = `${hub.name} 정류장`;
    const busNo = isWoolimGuri ? '6-1' : undefined;

    return {
      minutes: busMins,
      distMeters: distToHubMeters,
      type: 'public_bus' as const,
      title: `[집 앞 정류장] ${boardingName} 출발 ➔ ${hub.name} 버스 이동 (${busLineDesc})`,
      subtitle: `${boardingName} ➔ ${hub.name} 방면 (${busLineDesc}, 약 ${busMins}분, ${hubDistText})`,
      distText: hubDistText,
      fare: GYEONGGI_BUS_FARES.CITY_NORMAL,
      isApartment: true,
      headerPrefix: `[${originName}] 버스 ➔ ${hub.name}`,
      boardingStopName: boardingName,
      dropoffStopName: dropoffName,
      busNo,
      coords: { lat: originLat, lng: originLng }
    };
  }
}

// 도착 정류장/전철역 ➔ 최종 목적지 간 귀가 접근 소요시간 산출 (퇴근)
export function getDestAccess(destLat: number, destLng: number, destName: string, dropoffLat: number, dropoffLng: number, dropoffName: string) {
  const distToDestMeters = getHaversineDistanceMeters(dropoffLat, dropoffLng, destLat, destLng);
  const cleanDest = destName.replace(/\s+/g, '');
  const cleanDropoff = dropoffName.replace(/\s+/g, '');
  const isDestThisStation = (cleanDest === cleanDropoff || cleanDest === cleanDropoff.replace(/역$/, '')) || distToDestMeters < 350;
  const distText = distToDestMeters >= 1000 ? `${(distToDestMeters / 1000).toFixed(1)}km` : `${Math.round(distToDestMeters)}m`;

  if (isDestThisStation) {
    return {
      minutes: 2,
      distMeters: 0,
      type: 'walk' as const,
      title: `${dropoffName} 하차 ➔ ${destName} 도착`,
      subtitle: '출구 ➔ 목적지 도착 (약 2분)',
      distText: '출구',
      fare: 0,
      isApartment: false,
      headerPrefix: `${dropoffName}`
    };
  } else if (distToDestMeters < 800) {
    const walkMins = Math.max(2, Math.round(distToDestMeters / 67));
    return {
      minutes: walkMins,
      distMeters: distToDestMeters,
      type: 'walk' as const,
      title: `${dropoffName} 하차 ➔ ${destName} 도보 귀가`,
      subtitle: `목적지까지 도보 약 ${walkMins}분 (${distText})`,
      distText: distText,
      fare: 0,
      isApartment: true,
      headerPrefix: `${dropoffName} ➔ [${destName}]`
    };
  } else {
    // 800m 이상: 시내/마을버스 환승 귀가
    const busMins = Math.min(35, Math.round(distToDestMeters / 350) + 4);
    const isWoolimGuri = (destName.includes('우림') || destName.includes('수평사거리')) && (dropoffName.includes('장자호수') || dropoffName.includes('구리'));
    const busLineDesc = isWoolimGuri ? '마을 6-1번 등' : '연계 시내/마을버스';
    const boardingName = `${dropoffName} 버스환승정류장`;
    const destStopName = isWoolimGuri ? '수평사거리.우림아파트' : `${destName} 앞 정류소`;
    const busNo = isWoolimGuri ? '6-1' : undefined;

    return {
      minutes: busMins,
      distMeters: distToDestMeters,
      type: 'public_bus' as const,
      title: `${dropoffName} 하차 ➔ ${destName} 방면 버스 환승 (${busLineDesc})`,
      subtitle: `[귀가 정류장] ${boardingName} ➔ ${destStopName} (${busLineDesc}, 약 ${busMins}분, ${distText})`,
      distText: distText,
      fare: 0, // 수도권 통합 환승할인
      isApartment: true,
      headerPrefix: `${dropoffName} ➔ [${destName}]`,
      boardingStopName: boardingName,
      dropoffStopName: destStopName,
      busNo,
      coords: { lat: destLat, lng: destLng }
    };
  }
}

export function calculateOptimalRoutes(params: SearchParams, routes: RouteData[]): RouteCandidate[] {
  const { originLat, originLng, originName, mode, targetTime, preference, filters } = params;

  // 출발지가 비어있는 경우 빈 목록 반환
  if (!originName || (originLat === 0 && originLng === 0)) {
    return [];
  }

  const targetMins = parseTimeToMinutes(targetTime);
  const candidates: RouteCandidate[] = [];
  const hqCoord = STATION_COORDS["사옥"];
  const nearestSubwayHub = findNearestSubwayHub(originLat, originLng, originName);

  // =============================================================
  // MODE 1: COMMUTE IN (출근)
  // =============================================================
  if (mode === 'commute_in') {
    // -------------------------------------------------------------
    // 1-A. Company Shuttle & Commute Bus Direct Options (출근)
    // -------------------------------------------------------------
    // 사내 통근버스 및 무료 셔틀 직통 옵션은 회사 복지 최우선 수단이므로 항상 계산 (대중교통 필터 여부 무관)
    {
      routes.forEach((route) => {
        (route.inbound_trips || []).forEach((trip) => {
          Object.entries(trip.times || {}).forEach(([stopName, deptTimeStr]) => {
            if (stopName === "사옥" || stopName === "도착(사옥)") return;

            const stopCoord = STATION_COORDS[stopName];
            if (!stopCoord) return;

            const hqArrivalTimeStr = trip.times["도착(사옥)"] || trip.times["사옥"] || addMinutesToTime(deptTimeStr, 35);
            const hqArrivalMins = parseTimeToMinutes(hqArrivalTimeStr);

            // Must arrive before or at target time
            if (hqArrivalMins > targetMins) return;

            const walkMeters = getHaversineDistanceMeters(originLat, originLng, stopCoord.lat, stopCoord.lng);
            const walkMins = estimateWalkMinutes(walkMeters);
            // 도보 30분 이상 걸리는 정류장 직접 승차는 제외
            if (walkMins >= 30) return;

            const busDeptMins = parseTimeToMinutes(deptTimeStr);
            const userDeptMins = busDeptMins - walkMins;

            if (userDeptMins < 0) return; // invalid time

            const waitMins = Math.max(0, busDeptMins - (userDeptMins + walkMins));
            const busDurationMins = Math.max(5, hqArrivalMins - busDeptMins);
            const totalDurationMins = hqArrivalMins - userDeptMins;

            const userDeptTimeStr = minutesToTimeString(userDeptMins);
            const arrAtStopStr = minutesToTimeString(userDeptMins + walkMins);

            const isShuttle = route.bus_type === 'shuttle';
            const routeBaseFare = isShuttle ? 0 : COMMUTE_BUS_FARE;

            // 경유 정류장 정보
            const stopsAfter = getStopsAfter(route.id, stopName);
            const viaText = stopsAfter.length > 0
              ? `${formatViaStops(stopsAfter)} 경유 → 사옥 도착`
              : '사옥 직행';

            const fareNote = isShuttle
              ? '무료 셔틀 (예약 불필요)'
              : `통근버스 요금 ₩${COMMUTE_BUS_FARE.toLocaleString()} / ⚠️ 일반 대중교통과 환승 할인 불가`;

            const steps: RouteStepItem[] = [
              {
                id: `step-1-${trip.trip_no}`,
                type: 'walk',
                title: `${originName} 출발`,
                subtitle: `${stopName}까지 도보 이동 (약 ${walkMins}분, ${Math.round(walkMeters)}m)`,
                departureTime: userDeptTimeStr,
                arrivalTime: arrAtStopStr,
                durationMinutes: walkMins,
                distanceMeters: walkMeters,
                fare: 0,
                coords: { lat: originLat, lng: originLng }
              },
              {
                id: `step-2-${trip.trip_no}`,
                type: isShuttle ? 'shuttle' : 'commute_bus',
                title: `${route.name} (${trip.trip_no}호차) 탑승`,
                subtitle: `${stopName} 승차 (${stopCoord.address}) → ${viaText}`,
                departureTime: deptTimeStr,
                arrivalTime: hqArrivalTimeStr,
                durationMinutes: busDurationMins,
                fare: routeBaseFare,
                note: trip.note ? `${trip.note} | ${fareNote}` : fareNote,
                coords: { lat: stopCoord.lat, lng: stopCoord.lng }
              },
              {
                id: `step-3-${trip.trip_no}`,
                type: 'walk',
                title: '슈어소프트테크 사옥 도착',
                subtitle: hqCoord.address,
                departureTime: hqArrivalTimeStr,
                arrivalTime: hqArrivalTimeStr,
                durationMinutes: 0,
                coords: { lat: hqCoord.lat, lng: hqCoord.lng }
              }
            ];

            candidates.push({
              id: `company-in-${route.id}-${trip.trip_no}-${stopName}`,
              badges: [],
              title: isShuttle
                ? `${route.name} 이용 (환승 0회, 무료)`
                : `${route.name} ${trip.trip_no}호차 (직통) — ₩${COMMUTE_BUS_FARE.toLocaleString()}`,
              subtitle: `${stopName} ${deptTimeStr} 탑승 ➔ ${hqArrivalTimeStr} 사옥 도착`,
              departureTime: userDeptTimeStr,
              arrivalTime: hqArrivalTimeStr,
              totalDurationMinutes: totalDurationMins,
              walkMinutes: walkMins,
              waitMinutes: waitMins,
              busMinutes: busDurationMins,
              fare: routeBaseFare,
              transferCount: 0,
              steps,
              routeColor: route.color,
              routeName: route.name,
              routeCategory: 'company_only',
              score: 0
            });
          });
        });
      });
    }

    // -------------------------------------------------------------
    // 1-B. Multimodal Public Transit Options (출근 - 지하철/대중교통 연계)
    // -------------------------------------------------------------
    if (filters.usePublicTransit) {
      // 1. 지하철 허브 기반 통근버스/셔틀 연계 (예: 장자호수공원역 8호선 ➔ 잠실역/복정역/모란역 통근버스 또는 야탑/판교 셔틀)
      if (nearestSubwayHub) {
        const originAccess = getOriginAccess(originLat, originLng, originName, nearestSubwayHub);
        const COMMUTE_HUBS = ['잠실역', '신도림역', '강남역', '양재역', '사당역', '모란역', '인덕원역', '안양역', '판교역', '야탑역', '군자역', '건대역', '가락시장역', '복정역'];
        COMMUTE_HUBS.forEach((hubStationName) => {
          const transitInfo = calculateSubwayRoute(nearestSubwayHub.name, hubStationName);
          if (transitInfo.minutes > 90 || nearestSubwayHub.name === hubStationName) return;

          // 해당 허브 정류장을 지나는 통근/셔틀 노선 찾기
          routes.forEach((route) => {
            route.inbound_trips.forEach((trip) => {
              const deptTimeAtHub = trip.times[hubStationName];
              if (!deptTimeAtHub) return;

              // 1) 비효율적 우회 원천 차단:
              // 이미 출발지 거점 역(nearestSubwayHub)에 해당 통근버스가 정차한다면,
              // 굳이 지하철을 타고 다른 정류장(hubStationName)으로 가서 같은 버스를 탈 이유가 없음 (예: 잠실역 출발인데 지하철 타고 가락시장역 가서 잠실버스 타는 비효율 배제)
              if (trip.times[nearestSubwayHub.name]) return;

              // 2) 출발지에서 이미 도보권(<25분) 내에 해당 통근버스의 직접 탑승 정류장이 있는 경우, 1-A 직통으로 처리되므로 지하철 우회 환승 배제
              const stopsOnThisTrip = Object.keys(trip.times);
              const hasDirectNearbyStop = stopsOnThisTrip.some(stop => {
                const coord = STATION_COORDS[stop];
                if (!coord) return false;
                const d = getHaversineDistanceMeters(originLat, originLng, coord.lat, coord.lng);
                return estimateWalkMinutes(d) < 25;
              });
              if (hasDirectNearbyStop) return;

              // 3) 동일 버스 노선에 대해 더 적은 지하철 이동 시간/환승으로 탑승 가능한 선행 또는 인접 거점이 있다면,
              // 지하철을 더 오래 타고 하류 정류장으로 이동해서 타는 불필요한 연장 탑승 차단
              const reachableStopsOnSameTrip = stopsOnThisTrip.filter(s => COMMUTE_HUBS.includes(s) && trip.times[s]);
              const isWorseHub = reachableStopsOnSameTrip.some(otherHub => {
                if (otherHub === hubStationName) return false;
                const otherInfo = calculateSubwayRoute(nearestSubwayHub.name, otherHub);
                if (otherInfo.minutes < transitInfo.minutes - 2 && otherInfo.transferCount <= transitInfo.transferCount) {
                  return true;
                }
                return false;
              });
              if (isWorseHub) return;

              const hqArrivalTimeStr = trip.times["도착(사옥)"] || trip.times["사옥"] || addMinutesToTime(deptTimeAtHub, 30);
              const hqArrivalMins = parseTimeToMinutes(hqArrivalTimeStr);
              if (hqArrivalMins > targetMins) return;

              const busDeptMins = parseTimeToMinutes(deptTimeAtHub);
              // 지하철 환승 버퍼 시간 (도보 및 대기 최소 3분)
              const transferBufferMins = 4;
              let targetDeptMins = busDeptMins - transferBufferMins - transitInfo.minutes;

              const isShuttle = route.bus_type === 'shuttle';
              const routeBaseFare = isShuttle ? 0 : COMMUTE_BUS_FARE;
              const subwayFare = 1500;
              const totalFare = subwayFare + routeBaseFare + originAccess.fare;
              const linesStr = nearestSubwayHub.lines.join('/');
              const hubCoord = STATION_COORDS[hubStationName] || (nearestSubwayHub ? { lat: nearestSubwayHub.lat, lng: nearestSubwayHub.lng, address: '' } : null);

              let subwaySubSteps = buildSubwayRouteSteps(
                nearestSubwayHub.name,
                hubStationName,
                transitInfo,
                targetDeptMins,
                `hub-transit-${route.id}-${trip.trip_no}`,
                subwayFare,
                nearestSubwayHub.lines[0] || '지하철'
              );

              // 열차가 버스 출발 시각 이후에 도착하거나 환승 시간이 2분 미만이면 이전 열차로 역추적
              let backtrackCount = 0;
              while (subwaySubSteps.endArrMins > busDeptMins - 2 && backtrackCount < 8) {
                targetDeptMins -= 4;
                backtrackCount++;
                subwaySubSteps = buildSubwayRouteSteps(
                  nearestSubwayHub.name,
                  hubStationName,
                  transitInfo,
                  targetDeptMins,
                  `hub-transit-${route.id}-${trip.trip_no}`,
                  subwayFare,
                  nearestSubwayHub.lines[0] || '지하철'
                );
              }

              // 여전히 버스 출발 시각 이후에 도착하면 해당 노선 조합 불가
              if (subwaySubSteps.endArrMins > busDeptMins - 2) return;

              const actualSubDeptMins = subwaySubSteps.startDeptMins;
              const actualSubArrMins = subwaySubSteps.endArrMins;
              const actualHomeDeptMins = actualSubDeptMins - originAccess.minutes;
              if (actualHomeDeptMins < 0) return;

              const actualTransferWaitMins = Math.max(2, busDeptMins - actualSubArrMins);

              const steps: RouteStepItem[] = [
                {
                  id: `hub-step-1-${route.id}-${trip.trip_no}`,
                  type: originAccess.type,
                  title: originAccess.title,
                  subtitle: originAccess.subtitle,
                  departureTime: minutesToTimeString(actualHomeDeptMins),
                  arrivalTime: minutesToTimeString(actualSubDeptMins),
                  durationMinutes: originAccess.minutes,
                  distanceMeters: originAccess.distMeters,
                  fare: originAccess.fare,
                  coords: { lat: originLat, lng: originLng },
                  boardingStopName: originAccess.boardingStopName,
                  dropoffStopName: originAccess.dropoffStopName,
                  busNo: originAccess.busNo
                },
                ...subwaySubSteps.steps,
                {
                  id: `hub-step-3-${route.id}-${trip.trip_no}`,
                  type: 'walk',
                  title: `${hubStationName} 하차 ➔ 통근버스 승차장 이동`,
                  subtitle: `${STATION_COORDS[hubStationName]?.address || hubStationName} 승차위치 이동 (환승 대기 ${actualTransferWaitMins}분)`,
                  departureTime: minutesToTimeString(actualSubArrMins),
                  arrivalTime: deptTimeAtHub,
                  durationMinutes: actualTransferWaitMins,
                  coords: hubCoord ? { lat: hubCoord.lat, lng: hubCoord.lng } : undefined
                },
                {
                  id: `hub-step-4-${route.id}-${trip.trip_no}`,
                  type: isShuttle ? 'shuttle' : 'commute_bus',
                  title: `${route.name} (${trip.trip_no}호차) 탑승`,
                  subtitle: `${hubStationName} (${deptTimeAtHub}) ➔ 사옥 직행 (${hqArrivalTimeStr})`,
                  departureTime: deptTimeAtHub,
                  arrivalTime: hqArrivalTimeStr,
                  durationMinutes: hqArrivalMins - busDeptMins,
                  fare: routeBaseFare,
                  note: isShuttle ? '무료 셔틀' : `통근버스 요금 ₩${COMMUTE_BUS_FARE.toLocaleString()}`,
                  boardingStopName: `${hubStationName} 통근버스 정류소`,
                  dropoffStopName: '슈어소프트 판교 사옥 정문 앞',
                  coords: hubCoord ? { lat: hubCoord.lat, lng: hubCoord.lng } : undefined
                },
                {
                  id: `hub-step-5-${route.id}-${trip.trip_no}`,
                  type: 'walk',
                  title: '판교 사옥 도착',
                  subtitle: hqCoord.address,
                  departureTime: hqArrivalTimeStr,
                  arrivalTime: hqArrivalTimeStr,
                  durationMinutes: 0,
                  coords: { lat: hqCoord.lat, lng: hqCoord.lng }
                }
              ];

              candidates.push({
                id: `hub-transit-${route.id}-${trip.trip_no}-${hubStationName}`,
                badges: [],
                title: `${nearestSubwayHub.lines[0]} ${nearestSubwayHub.name} + ${route.name} 연계`,
                subtitle: `${nearestSubwayHub.name} (${linesStr}) ➔ ${hubStationName} 환승 ➔ ${route.name} ➔ 사옥`,
                departureTime: minutesToTimeString(actualHomeDeptMins),
                arrivalTime: hqArrivalTimeStr,
                totalDurationMinutes: hqArrivalMins - actualHomeDeptMins,
                walkMinutes: (originAccess.type === 'walk' ? originAccess.minutes : 2) + actualTransferWaitMins,
                waitMinutes: 3,
                busMinutes: (originAccess.type === 'public_bus' ? originAccess.minutes : 0) + (hqArrivalMins - busDeptMins) + subwaySubSteps.totalMinutes,
                fare: totalFare,
                transferCount: 1 + transitInfo.transferCount + (originAccess.type === 'public_bus' ? 1 : 0),
                steps,
                routeColor: route.color,
                routeName: `${route.name} 연계`,
                routeCategory: 'transit_hybrid',
                score: 0
              });
            });
          });
        });
      }

      // 2. 일반 판교 셔틀 연계 (지하철 판교역 도착)
      const shuttleRoute = routes.find(r => r.id === 'route_shuttle_pangyo');
      if (shuttleRoute && nearestSubwayHub && nearestSubwayHub.name !== '판교역') {
        const pangyoCoord = STATION_COORDS["판교역"];
        const pangyoTransit = calculateSubwayRoute(nearestSubwayHub.name, '판교역');
        const subwayTransitMins = pangyoTransit.minutes;

        const originAccess = getOriginAccess(originLat, originLng, originName, nearestSubwayHub);

        shuttleRoute.inbound_trips.forEach((trip) => {
          const pangyoDeptStr = trip.times["판교역"];
          if (!pangyoDeptStr) return;

          const hqArrivalStr = trip.times["사옥"] || trip.times["도착(사옥)"] || addMinutesToTime(pangyoDeptStr, 15);
          const hqArrivalMins = parseTimeToMinutes(hqArrivalStr);
          if (hqArrivalMins > targetMins) return;

          const pangyoDeptMins = parseTimeToMinutes(pangyoDeptStr);
          let targetDeptMins = pangyoDeptMins - subwayTransitMins - 4;

          // 신분당선 이용 시 기본 요금 3,200원 적용
          const isSinbundang = pangyoTransit.routeDesc.includes('신분당선');
          const subwayFare = isSinbundang ? 3200 : 1500;

          let subwaySubSteps = buildSubwayRouteSteps(
            nearestSubwayHub.name,
            '판교역',
            pangyoTransit,
            targetDeptMins,
            `subway-in-${trip.trip_no}`,
            subwayFare,
            nearestSubwayHub.lines[0] || '지하철'
          );

          // 열차가 셔틀 출발 시각 이후에 도착하거나 환승 시간이 2분 미만이면 이전 열차로 역추적
          let backtrackCount = 0;
          while (subwaySubSteps.endArrMins > pangyoDeptMins - 2 && backtrackCount < 8) {
            targetDeptMins -= 4;
            backtrackCount++;
            subwaySubSteps = buildSubwayRouteSteps(
              nearestSubwayHub.name,
              '판교역',
              pangyoTransit,
              targetDeptMins,
              `subway-in-${trip.trip_no}`,
              subwayFare,
              nearestSubwayHub.lines[0] || '지하철'
            );
          }

          if (subwaySubSteps.endArrMins > pangyoDeptMins - 2) return;

          const actualSubDeptMins = subwaySubSteps.startDeptMins;
          const actualSubArrMins = subwaySubSteps.endArrMins;
          const actualHomeDeptMins = actualSubDeptMins - originAccess.minutes;
          if (actualHomeDeptMins < 0) return;

          const actualTransferWaitMins = Math.max(2, pangyoDeptMins - actualSubArrMins);

          const steps: RouteStepItem[] = [
            {
              id: `subway-in-1-${trip.trip_no}`,
              type: originAccess.type,
              title: originAccess.title,
              subtitle: originAccess.subtitle,
              departureTime: minutesToTimeString(actualHomeDeptMins),
              arrivalTime: minutesToTimeString(actualSubDeptMins),
              durationMinutes: originAccess.minutes,
              distanceMeters: originAccess.distMeters,
              fare: originAccess.fare,
              coords: { lat: originLat, lng: originLng },
              boardingStopName: originAccess.boardingStopName,
              dropoffStopName: originAccess.dropoffStopName,
              busNo: originAccess.busNo
            },
            ...subwaySubSteps.steps,
            {
              id: `subway-in-3-${trip.trip_no}`,
              type: 'walk',
              title: '판교역 1번출구 하차 ➔ 셔틀 탑승장 도보',
              subtitle: `북문광장 버스정류장 (환승 대기 ${actualTransferWaitMins}분)`,
              departureTime: minutesToTimeString(actualSubArrMins),
              arrivalTime: pangyoDeptStr,
              durationMinutes: actualTransferWaitMins,
              coords: pangyoCoord ? { lat: pangyoCoord.lat, lng: pangyoCoord.lng } : undefined
            },
            {
              id: `subway-in-4-${trip.trip_no}`,
              type: 'shuttle',
              title: `판교셔틀 (${trip.trip_no}호차) 탑승`,
              subtitle: '판교역 ➔ 사옥 직행 (무료)',
              departureTime: pangyoDeptStr,
              arrivalTime: hqArrivalStr,
              durationMinutes: 15,
              fare: 0,
              coords: { lat: hqCoord.lat, lng: hqCoord.lng }
            },
            {
              id: `subway-in-5-${trip.trip_no}`,
              type: 'walk',
              title: '판교 사옥 도착',
              subtitle: hqCoord.address,
              departureTime: hqArrivalStr,
              arrivalTime: hqArrivalStr,
              durationMinutes: 0,
              coords: { lat: hqCoord.lat, lng: hqCoord.lng }
            }
          ];

          candidates.push({
            id: `transit-in-pangyo-${trip.trip_no}`,
            badges: [],
            title: `지하철 + 판교 무료셔틀 (${trip.trip_no}호차)`,
            subtitle: `${originName} ➔ 지하철 ➔ 판교역 ${pangyoDeptStr} 셔틀(무료) ➔ 사옥 ${hqArrivalStr}`,
            departureTime: minutesToTimeString(actualHomeDeptMins),
            arrivalTime: hqArrivalStr,
            totalDurationMinutes: hqArrivalMins - actualHomeDeptMins,
            walkMinutes: (originAccess.type === 'walk' ? originAccess.minutes : 2) + actualTransferWaitMins,
            waitMinutes: actualTransferWaitMins,
            busMinutes: (originAccess.type === 'public_bus' ? originAccess.minutes : 0) + subwayTransitMins + 15,
            fare: subwayFare + originAccess.fare,
            transferCount: 1 + pangyoTransit.transferCount + (originAccess.type === 'public_bus' ? 1 : 0),
            steps,
            routeColor: '#10B981',
            routeName: '지하철+판교셔틀',
            routeCategory: 'transit_hybrid',
            score: 0
          });
        });
      }

      // 3. [카카오맵 실측 대중교통] 잠실역 환승 ➔ 광역버스 1007번 / 6900번 ➔ 판교2밸리·사옥 앞 직행 (배차 10~15분)
      if (nearestSubwayHub) {
        const isJamsilCorridor = nearestSubwayHub.lines.includes('8호선') ||
          ['잠실역', '건대역', '강변역', '구의역', '군자역', '천호역', '암사역', '암사역사공원역', '장자호수공원역', '구리역', '동구릉역', '다산역', '별내역', '몽촌토성역', '송파역', '석촌역'].some(st => nearestSubwayHub.name.includes(st) || st.includes(nearestSubwayHub.name));

        if (isJamsilCorridor) {
          const distToHubMeters = getHaversineDistanceMeters(originLat, originLng, nearestSubwayHub.lat, nearestSubwayHub.lng);
          const walkToSubwayMins = Math.max(2, Math.round(distToHubMeters / 67));
          const hubDistText = distToHubMeters >= 1000 ? `${(distToHubMeters / 1000).toFixed(1)}km` : `${Math.round(distToHubMeters)}m`;

          const jamsilTransit = calculateSubwayRoute(nearestSubwayHub.name, '잠실역');
          if (jamsilTransit.minutes <= 40 && jamsilTransit.minutes >= 0) {
            const busRideMins = 25; // 잠실역 ➔ 판교2밸리 고속화도로 직행 약 25분
            const walkToHqMins = 3; // 판교2밸리 정류장 ➔ 인피니티타워 E동 도보 3분
            const totalDuration = walkToSubwayMins + jamsilTransit.minutes + 6 + busRideMins + walkToHqMins;

          const destArrivalMins = targetMins - 5;
          const deptAtJamsilBusMins = destArrivalMins - walkToHqMins - busRideMins;
          const arrAtJamsilSubwayMins = deptAtJamsilBusMins - 6;
          const deptSubwayMins = arrAtJamsilSubwayMins - jamsilTransit.minutes;
          const homeDeptMins = deptSubwayMins - walkToSubwayMins;

            const jamsilCoord = STATION_COORDS['잠실역'] || { lat: 37.5133, lng: 127.1001 };
            const pangyo2ValleyCoord = { lat: 37.4087, lng: 127.0945 }; // 판교2밸리 기업지원허브 정류장

            const subwaySubSteps = buildSubwayRouteSteps(
              nearestSubwayHub.name,
              '잠실역',
              jamsilTransit,
              deptSubwayMins,
              'kakao-transit-jamsil',
              1500,
              nearestSubwayHub.lines[0] || '지하철'
            );

            // 실제 지하철 시간표 기반 배차 매칭에 따른 타임라인 엄격 순차 정렬
            const actualSubDeptMins = subwaySubSteps.startDeptMins;
            const actualSubArrMins = subwaySubSteps.endArrMins;
            const actualHomeDeptMins = actualSubDeptMins - walkToSubwayMins;

            if (actualHomeDeptMins > 0) {
              const homeDeptStr = minutesToTimeString(actualHomeDeptMins);
              const deptSubwayStr = minutesToTimeString(actualSubDeptMins);
              const arrJamsilStr = minutesToTimeString(actualSubArrMins);
              const deptBusMins = actualSubArrMins + 6; // 잠실광역환승센터 도보/환승 6분
              const deptBusStr = minutesToTimeString(deptBusMins);
              const arrBusMins = deptBusMins + busRideMins;
              const arrBusStr = minutesToTimeString(arrBusMins);
              const finalArrMins = arrBusMins + walkToHqMins;
              const destArrStr = minutesToTimeString(finalArrMins);

              const publicBusSteps: RouteStepItem[] = [
                {
                  id: 'kakao-transit-jamsil-1',
                  type: 'walk',
                  title: `${originName} 출발`,
                  subtitle: `${nearestSubwayHub.name}까지 도보 이동 (${walkToSubwayMins}분, ${hubDistText})`,
                  departureTime: homeDeptStr,
                  arrivalTime: deptSubwayStr,
                  durationMinutes: walkToSubwayMins,
                  fare: 0,
                  coords: { lat: originLat, lng: originLng }
                },
                ...subwaySubSteps.steps,
                {
                  id: 'kakao-transit-jamsil-3',
                  type: 'walk',
                  title: '잠실역 1번/11번 출구 ➔ 잠실광역환승센터 지하 환승',
                  subtitle: '광역버스 승차홈 이동 및 탑승 대기 (약 6분)',
                  departureTime: arrJamsilStr,
                  arrivalTime: deptBusStr,
                  durationMinutes: 6,
                  coords: { lat: jamsilCoord.lat, lng: jamsilCoord.lng }
                },
                {
                  id: 'kakao-transit-jamsil-4',
                  type: 'public_bus',
                  title: '광역버스 1007번 / 6900번 탑승 (판교 제2밸리 방면)',
                  subtitle: '잠실역 ➔ 송파대로·분당수서고속화 ➔ 판교 제2테크노밸리 직행 (25분)',
                  departureTime: deptBusStr,
                  arrivalTime: arrBusStr,
                  durationMinutes: busRideMins,
                  fare: 1700, // 지하철 1,500원 이용 후 경기도 직행좌석 광역버스(3,200원) 환승 차액
                  note: '🚍 경기도 직행좌석형 광역버스 환승할인 적용 (총 ₩3,200)',
                  coords: pangyo2ValleyCoord
                },
                {
                  id: 'kakao-transit-jamsil-5',
                  type: 'walk',
                  title: '판교 제2테크노밸리 정류장 하차 ➔ 사옥 도보 3분',
                  subtitle: '금토로80번길 방면 ➔ 인피니티타워 E동 정문 도착',
                  departureTime: arrBusStr,
                  arrivalTime: destArrStr,
                  durationMinutes: walkToHqMins,
                  coords: { lat: hqCoord.lat, lng: hqCoord.lng }
                }
              ];

              candidates.push({
                id: 'kakao-transit-bus-1007',
                badges: ['fastest'],
                title: '대중교통: 8호선 + 광역버스 1007/6900번 사옥 직통',
                subtitle: `${nearestSubwayHub.name} (8호선) ➔ 잠실역 환승 ➔ 광역버스 1007번 ➔ 판교2밸리·사옥 앞 하차`,
                departureTime: homeDeptStr,
                arrivalTime: destArrStr,
                totalDurationMinutes: finalArrMins - actualHomeDeptMins,
                walkMinutes: walkToSubwayMins + 6 + walkToHqMins,
                waitMinutes: 4,
                busMinutes: jamsilTransit.minutes + busRideMins,
                fare: 3200, // 경기도 직행좌석형 광역버스 요금 (환승 시 총 ₩3,200)
                transferCount: 1,
                steps: publicBusSteps,
                routeColor: '#ef4444',
                routeName: '8호선+광역1007번',
                routeCategory: 'public_transit',
                score: 0
              });
            }
        }
      }
    }

      // 4. [카카오맵 실측 대중교통] 판교역 환승 ➔ 성남 시내버스 310번 / 602-1B번 ➔ 사옥 정문 바로 앞 하차 (배차 7~10분)
      if (nearestSubwayHub) {
        const pangyoCoord = STATION_COORDS['판교역'] || { lat: 37.3948, lng: 127.1119 };
        const pangyoTransit = calculateSubwayRoute(nearestSubwayHub.name, '판교역');
        const subwayTransitMins = pangyoTransit.minutes;
        const isNearbyPangyo = subwayTransitMins > 0 && subwayTransitMins <= 30 && (
          nearestSubwayHub.lines.includes('신분당선') || 
          nearestSubwayHub.lines.includes('경강선') || 
          ['판교역', '이매역', '서현역', '수내역', '정자역', '미금역', '야탑역'].includes(nearestSubwayHub.name)
        );

        if (isNearbyPangyo) {
          const isSinbundang = pangyoTransit.routeDesc.includes('신분당선');
          const transitFare = isSinbundang ? 3200 : GYEONGGI_BUS_FARES.CITY_NORMAL; // 신분당선 미이용 시 경기도 시내버스 기본 1,650원
          const subwayFare = isSinbundang ? 3200 : 1500;

        const distToHubMeters = getHaversineDistanceMeters(originLat, originLng, nearestSubwayHub.lat, nearestSubwayHub.lng);
        const walkToSubwayMins = Math.max(2, Math.round(distToHubMeters / 67));
        const hubDistText = distToHubMeters >= 1000 ? `${(distToHubMeters / 1000).toFixed(1)}km` : `${Math.round(distToHubMeters)}m`;

        const busRideMins = 8; // 판교역 ➔ 인피니티타워 E동 시내버스 약 8분
        const walkToHqMins = 1; // 정문 바로 앞 하차 도보 1분
        const totalDuration = walkToSubwayMins + subwayTransitMins + 5 + busRideMins + walkToHqMins;

        const destArrivalMins = targetMins - 3;
        const deptAtPangyoBusMins = destArrivalMins - walkToHqMins - busRideMins;
        const arrAtPangyoSubwayMins = deptAtPangyoBusMins - 5;
        const deptSubwayMins = arrAtPangyoSubwayMins - subwayTransitMins;
        const homeDeptMins = deptSubwayMins - walkToSubwayMins;

          const subwaySubSteps = buildSubwayRouteSteps(
            nearestSubwayHub.name,
            '판교역',
            pangyoTransit,
            deptSubwayMins,
            'kakao-citybus-pangyo',
            subwayFare,
            nearestSubwayHub.lines[0] || '지하철'
          );

          // 실제 지하철 시간표 기반 배차 매칭에 따른 타임라인 엄격 순차 정렬
          const actualSubDeptMins = subwaySubSteps.startDeptMins;
          const actualSubArrMins = subwaySubSteps.endArrMins;
          const actualHomeDeptMins = actualSubDeptMins - walkToSubwayMins;

          if (actualHomeDeptMins > 0) {
            const homeDeptStr = minutesToTimeString(actualHomeDeptMins);
            const deptSubwayStr = minutesToTimeString(actualSubDeptMins);
            const arrPangyoStr = minutesToTimeString(actualSubArrMins);
            const deptBusMins = actualSubArrMins + 5;
            const deptBusStr = minutesToTimeString(deptBusMins);
            const arrBusMins = deptBusMins + busRideMins;
            const arrBusStr = minutesToTimeString(arrBusMins);
            const finalArrMins = arrBusMins + walkToHqMins;
            const destArrStr = minutesToTimeString(finalArrMins);

            const cityBusSteps: RouteStepItem[] = [
              {
                id: 'kakao-citybus-pangyo-1',
                type: 'walk',
                title: `${originName} 출발`,
                subtitle: `${nearestSubwayHub.name}까지 도보 이동 (${walkToSubwayMins}분, ${hubDistText})`,
                departureTime: homeDeptStr,
                arrivalTime: deptSubwayStr,
                durationMinutes: walkToSubwayMins,
                fare: 0,
                coords: { lat: originLat, lng: originLng }
              },
              ...subwaySubSteps.steps,
              {
                id: 'kakao-citybus-pangyo-3',
                type: 'walk',
                title: '판교역 4번출구 ➔ 북문광장 정류장 환승',
                subtitle: '성남 시내버스 310번 / 마을 602-1B번 승차홈 (5분 환승)',
                departureTime: arrPangyoStr,
                arrivalTime: deptBusStr,
                durationMinutes: 5,
                coords: { lat: pangyoCoord.lat, lng: pangyoCoord.lng }
              },
              {
                id: 'kakao-citybus-pangyo-4',
                type: 'public_bus',
                title: '성남 시내버스 310번 / 602-1B번 탑승',
                subtitle: '판교역 ➔ 판교2밸리·인피니티타워 E동 정문 직통 (8분)',
                departureTime: deptBusStr,
                arrivalTime: arrBusStr,
                durationMinutes: busRideMins,
                fare: isSinbundang ? 0 : 150, // 지하철 1,500원 이용 후 경기도 시내버스(1,650원) 환승 차액 150원
                note: isSinbundang
                  ? '🚌 신분당선 환승 (사옥 정문 바로 앞 하차)'
                  : `🚌 경기도 일반형 시내버스 환승 (총 ₩${transitFare.toLocaleString()}, 사옥 정문 바로 앞 하차)`,
                coords: { lat: hqCoord.lat, lng: hqCoord.lng }
              },
              {
                id: 'kakao-citybus-pangyo-5',
                type: 'walk',
                title: '판교 사옥 (인피니티타워 E동) 도착',
                subtitle: hqCoord.address,
                departureTime: arrBusStr,
                arrivalTime: destArrStr,
                durationMinutes: walkToHqMins,
                coords: { lat: hqCoord.lat, lng: hqCoord.lng }
              }
            ];

            candidates.push({
              id: 'kakao-citybus-pangyo-310',
              badges: [],
              title: isSinbundang
                ? '대중교통: 신분당선 + 성남 310번/602-1B번 사옥 정문 하차'
                : '대중교통: 지하철 + 성남 시내 310번 버스 (사옥 정문 하차)',
              subtitle: `${originName} ➔ 판교역 ➔ 시내버스 310번 ➔ 슈어소프트 사옥 정문 바로 앞 도착 (₩${transitFare.toLocaleString()})`,
              departureTime: homeDeptStr,
              arrivalTime: destArrStr,
              totalDurationMinutes: finalArrMins - actualHomeDeptMins,
              walkMinutes: walkToSubwayMins + 5 + walkToHqMins,
              waitMinutes: 3,
              busMinutes: subwayTransitMins + busRideMins,
              fare: transitFare, // 경기도 시내버스 기준 ₩1,650 (신분당선 환승 시 ₩3,200)
              transferCount: 2,
            steps: cityBusSteps,
            routeColor: '#3b82f6',
            routeName: '지하철+시내310번',
            routeCategory: 'public_transit',
            score: 0
          });
        }
      }
    }

      // 5. [성남 시내 87번 / 332번] 모란역(8호선 / 수인분당선) ➔ 사옥 정문 출근 (약 23~25분 소요, 모란역 직접 인근 거주자 전용)
      if (nearestSubwayHub) {
        const isMoranDirect = ['모란역', '수진역'].includes(nearestSubwayHub.name);

        // Case A: 모란역 인근 직접 도보 승차 (환승 0회)
        if (isMoranDirect) {
          const walkToBusStop = 3;
          const busRideMins = 23; // 모란역 ➔ 시흥사거리 ➔ 판교2밸리 사옥 실측 약 23분
          const walkToHqMins = 1;
          const totalDuration = walkToBusStop + busRideMins + walkToHqMins;
          const destArrivalMins = targetMins - 2;
          const deptBusMins = destArrivalMins - walkToHqMins - busRideMins;
          const homeDeptMins = deptBusMins - walkToBusStop;

          if (homeDeptMins > 0) {
            candidates.push({
              id: 'kakao-citybus-87-332-in',
              badges: [],
              title: '성남 시내 87번 / 332번 버스 (모란역 ➔ 사옥 정문 직통)',
              subtitle: `모란역(8호선·수인분당선) ➔ 87번/332번 ➔ 판교2밸리·사옥 정문 직통 (약 23분 소요, ₩1,650)`,
              departureTime: minutesToTimeString(homeDeptMins),
              arrivalTime: minutesToTimeString(destArrivalMins),
              totalDurationMinutes: totalDuration,
              walkMinutes: walkToBusStop + walkToHqMins,
              waitMinutes: 3,
              busMinutes: busRideMins,
              fare: GYEONGGI_BUS_FARES.CITY_NORMAL, // 경기도 일반형 시내버스 요금 (1,650원)
              transferCount: 0,
              steps: [
                {
                  id: 'bus-87-332-in-1',
                  type: 'walk',
                  title: `${originName} 출발 ➔ 모란역 버스정류장 도보`,
                  subtitle: '모란역 5번/6번 출구 버스정류장 이동',
                  departureTime: minutesToTimeString(homeDeptMins),
                  arrivalTime: minutesToTimeString(deptBusMins),
                  durationMinutes: walkToBusStop,
                  coords: { lat: originLat, lng: originLng }
                },
                {
                  id: 'bus-87-332-in-2',
                  type: 'public_bus',
                  title: '성남 시내버스 87번 또는 332번 탑승',
                  subtitle: '모란역 ➔ 성남시청 ➔ 시흥사거리 ➔ 판교2밸리·인피니티타워 직행 (약 23분 소요)',
                  departureTime: minutesToTimeString(deptBusMins),
                  arrivalTime: minutesToTimeString(destArrivalMins - walkToHqMins),
                  durationMinutes: busRideMins,
                  fare: GYEONGGI_BUS_FARES.CITY_NORMAL,
                  note: '🚍 모란역 직결 핵심 노선 (사옥 정문 바로 앞 하차)'
                },
                {
                  id: 'bus-87-332-in-3',
                  type: 'walk',
                  title: '인피니티타워 E동 정문 도착',
                  subtitle: hqCoord.address,
                  departureTime: minutesToTimeString(destArrivalMins - walkToHqMins),
                  arrivalTime: minutesToTimeString(destArrivalMins),
                  durationMinutes: walkToHqMins,
                  coords: { lat: hqCoord.lat, lng: hqCoord.lng }
                }
              ],
              routeColor: '#2563eb',
              routeName: '시내 87/332번',
              routeCategory: 'public_transit',
              score: 0
            });
          }
        }
      }

      // 4. [연계 시내버스 ➔ 통근버스 / 셔틀 탑승 출근] (예: 한남역/한남오거리 ➔ 간선 140/470번 ➔ 논현/강남역 ➔ 강남 통근버스)
      const ALL_COMMUTE_HUBS = ['논현역', '신논현역', '강남역', '양재역', '잠실역', '사당역', '모란역', '판교역', '야탑역', '가락시장역', '복정역', '신도림역'];
      ALL_COMMUTE_HUBS.forEach((hubStationName) => {
        const busOption = findConnectingBus(hubStationName, originLat, originLng, originName);
        if (!busOption) return;

        routes.forEach((route) => {
          route.inbound_trips.forEach((trip) => {
            const deptTimeAtHub = trip.times[hubStationName];
            if (!deptTimeAtHub) return;

            const hqArrivalTimeStr = trip.times["도착(사옥)"] || trip.times["사옥"] || addMinutesToTime(deptTimeAtHub, 30);
            const hqArrivalMins = parseTimeToMinutes(hqArrivalTimeStr);
            if (hqArrivalMins > targetMins) return;

            const hubDeptMins = parseTimeToMinutes(deptTimeAtHub);
            const busArrAtHubMins = hubDeptMins - 4; // 4분 환승 여유
            const busDeptMins = busArrAtHubMins - busOption.rideMinutes;
            const walkToBusMins = 3;
            const homeDeptMins = busDeptMins - walkToBusMins;

            if (homeDeptMins < 0) return;

            const homeDeptStr = minutesToTimeString(homeDeptMins);
            const busDeptStr = minutesToTimeString(busDeptMins);
            const busArrStr = minutesToTimeString(busArrAtHubMins);

            const isShuttle = route.bus_type === 'shuttle';
            const routeBaseFare = isShuttle ? 0 : COMMUTE_BUS_FARE;
            const totalFare = routeBaseFare + busOption.fare;

            const steps: RouteStepItem[] = [
              {
                id: `citybus-in-1-${route.id}-${trip.trip_no}-${hubStationName}`,
                type: 'walk',
                title: `${originName} 출발 ➔ 버스정류장 도보`,
                subtitle: `${busOption.dropoffStopDesc} 이동 (3분)`,
                departureTime: homeDeptStr,
                arrivalTime: busDeptStr,
                durationMinutes: walkToBusMins,
                coords: { lat: originLat, lng: originLng }
              },
              {
                id: `citybus-in-2-${route.id}-${trip.trip_no}-${hubStationName}`,
                type: 'public_bus',
                title: `${busOption.busNumber} 탑승`,
                subtitle: `${originName} ➔ ${hubStationName} 직통 (약 ${busOption.rideMinutes}분 소요)`,
                departureTime: busDeptStr,
                arrivalTime: busArrStr,
                durationMinutes: busOption.rideMinutes,
                fare: busOption.fare,
                note: `🚌 배차 약 ${busOption.intervalMinutes}분 · ${hubStationName} 환승`
              },
              {
                id: `citybus-in-3-${route.id}-${trip.trip_no}-${hubStationName}`,
                type: 'walk',
                title: `${hubStationName} 하차 ➔ 통근버스 승차장 이동`,
                subtitle: `${hubStationName} 통근버스 정류장 이동 (4분)`,
                departureTime: busArrStr,
                arrivalTime: deptTimeAtHub,
                durationMinutes: 4
              },
              {
                id: `citybus-in-4-${route.id}-${trip.trip_no}-${hubStationName}`,
                type: isShuttle ? 'shuttle' : 'commute_bus',
                title: `${route.name} (${trip.trip_no}호차) 탑승`,
                subtitle: `${hubStationName} (${deptTimeAtHub}) ➔ 사옥 직통 (${hqArrivalTimeStr})`,
                departureTime: deptTimeAtHub,
                arrivalTime: hqArrivalTimeStr,
                durationMinutes: hqArrivalMins - hubDeptMins,
                fare: routeBaseFare,
                note: isShuttle ? '무료 셔틀' : `통근버스 요금 ₩${COMMUTE_BUS_FARE.toLocaleString()}`,
                coords: { lat: hqCoord.lat, lng: hqCoord.lng }
              },
              {
                id: `citybus-in-5-${route.id}-${trip.trip_no}-${hubStationName}`,
                type: 'walk',
                title: '슈어소프트테크 사옥 도착',
                subtitle: hqCoord.address,
                departureTime: hqArrivalTimeStr,
                arrivalTime: hqArrivalTimeStr,
                durationMinutes: 0,
                coords: { lat: hqCoord.lat, lng: hqCoord.lng }
              }
            ];

            candidates.push({
              id: `transit-in-citybus-${route.id}-${trip.trip_no}-${hubStationName}`,
              badges: ['fastest'],
              title: `시내버스 (${busOption.busNumber.split('·')[0].trim()}) + ${route.name} (${trip.trip_no}호차)`,
              subtitle: `${originName} ➔ ${hubStationName} ➔ 사옥 ${hqArrivalTimeStr} 도착`,
              departureTime: homeDeptStr,
              arrivalTime: hqArrivalTimeStr,
              totalDurationMinutes: hqArrivalMins - homeDeptMins,
              walkMinutes: walkToBusMins + 4,
              waitMinutes: 0,
              busMinutes: busOption.rideMinutes + (hqArrivalMins - hubDeptMins),
              fare: totalFare,
              transferCount: 1,
              steps,
              routeColor: route.color,
              routeName: `시내버스+${route.name}`,
              routeCategory: 'transit_hybrid',
              score: 0
            });
          });
        });
      });
    }

    // 5. [전국 광역 고속철도/KTX·SRT 연계 출근] (수도권 외 전국 시·도 ➔ KTX/SRT ➔ 수서역/서울역 ➔ GTX-A/셔틀 ➔ 사옥)
    const distFromHqKm = getHaversineDistanceMeters(originLat, originLng, hqCoord.lat, hqCoord.lng) / 1000;
    if (filters.usePublicTransit && distFromHqKm >= 50) {
      let ktxOrigin = '지역 고속철도역';
      let trainType = 'KTX/SRT';
      let railDurationMins = 120;
      let trainFare = 35000;

      if (originLat < 35.5 && originLng > 128.8) {
        // 부산/울산/경남권
        ktxOrigin = originName.includes('해운대') ? '부산역 (해운대 연계)' : '부산역 / 울산역';
        trainType = 'SRT/KTX 고속열차';
        railDurationMins = 135;
        trainFare = 52600;
      } else if (originLat < 36.0 && originLng > 128.3) {
        // 대구/경북권
        ktxOrigin = '동대구역 / 김천구미역';
        trainType = 'SRT/KTX 고속열차';
        railDurationMins = 95;
        trainFare = 37400;
      } else if (originLat < 36.6 && originLng > 127.1) {
        // 대전/충청권
        ktxOrigin = '대전역 / 오송역';
        trainType = 'SRT/KTX 고속열차';
        railDurationMins = 55;
        trainFare = 20100;
      } else if (originLat < 35.5 && originLng <= 127.2) {
        // 광주/전남권
        ktxOrigin = '광주송정역 / 나주역';
        trainType = 'SRT/KTX 고속열차';
        railDurationMins = 110;
        trainFare = 40700;
      } else if (originLat >= 37.2 && originLng > 128.5) {
        // 강원권
        ktxOrigin = '강릉역 / 만종역';
        trainType = 'KTX-이음 고속열차';
        railDurationMins = 90;
        trainFare = 27600;
      } else {
        railDurationMins = Math.round(distFromHqKm * 0.45) + 30;
        trainFare = Math.round(distFromHqKm * 140);
      }

      // 수서역 환승 (GTX-A ➔ 성남역 ➔ 판교 셔틀/시내버스 ➔ 사옥)
      const suseoArrivalMins = targetMins - 25;
      const trainDeptMins = suseoArrivalMins - railDurationMins;
      const localAccessMins = 20; // 거주지 ➔ KTX역 이동
      const homeDeptMins = trainDeptMins - localAccessMins;

      if (homeDeptMins > 0) {
        const homeDeptStr = minutesToTimeString(homeDeptMins);
        const trainDeptStr = minutesToTimeString(trainDeptMins);
        const suseoArrStr = minutesToTimeString(suseoArrivalMins);
        const gtxDeptStr = minutesToTimeString(suseoArrivalMins + 5);
        const seongnamArrStr = minutesToTimeString(suseoArrivalMins + 12);
        const lastBusDeptStr = minutesToTimeString(suseoArrivalMins + 16);
        const hqArrStr = minutesToTimeString(targetMins - 2);

        const suseoCoord = { lat: 37.4874, lng: 127.1018 };
        const seongnamCoord = { lat: 37.3970, lng: 127.1180 };

        const expressSteps: RouteStepItem[] = [
          {
            id: 'nationwide-in-1',
            type: 'public_bus',
            title: `${originName} 출발 ➔ ${ktxOrigin} 이동`,
            subtitle: `시내교통/택시 이동 (약 ${localAccessMins}분 소요)`,
            departureTime: homeDeptStr,
            arrivalTime: trainDeptStr,
            durationMinutes: localAccessMins,
            fare: GYEONGGI_BUS_FARES.CITY_NORMAL,
            coords: { lat: originLat, lng: originLng }
          },
          {
            id: 'nationwide-in-2',
            type: 'subway',
            title: `${trainType} (${ktxOrigin} ➔ 수서역)`,
            subtitle: `고속열차 직통 운행 (${railDurationMins}분 소요)`,
            departureTime: trainDeptStr,
            arrivalTime: suseoArrStr,
            durationMinutes: railDurationMins,
            fare: trainFare,
            note: `🚄 ${trainType} 정시 운행 / 수서역 도착`,
            boardingStopName: ktxOrigin,
            dropoffStopName: '수서역 KTX/SRT 승강장',
            coords: suseoCoord
          },
          {
            id: 'nationwide-in-3',
            type: 'subway',
            title: '수서역 GTX-A 탑승 ➔ 성남역 이동',
            subtitle: 'GTX-A 고속전철 1정거장 (7분 소요)',
            departureTime: gtxDeptStr,
            arrivalTime: seongnamArrStr,
            durationMinutes: 7,
            fare: 1800,
            coords: seongnamCoord
          },
          {
            id: 'nationwide-in-4',
            type: 'public_bus',
            title: '성남역 ➔ 시내버스 310번 / 사옥 연계버스 탑승',
            subtitle: '판교 제2테크노밸리·인피니티타워 E동 정문 직통 (7분)',
            departureTime: lastBusDeptStr,
            arrivalTime: hqArrStr,
            durationMinutes: 7,
            fare: 0,
            boardingStopName: '성남역 2번출구 버스정류장',
            dropoffStopName: '판교2밸리·인피니티타워 정문 앞',
            coords: { lat: hqCoord.lat, lng: hqCoord.lng }
          },
          {
            id: 'nationwide-in-5',
            type: 'walk',
            title: '슈어소프트 사옥 정문 도착',
            subtitle: hqCoord.address,
            departureTime: hqArrStr,
            arrivalTime: hqArrStr,
            durationMinutes: 0,
            coords: { lat: hqCoord.lat, lng: hqCoord.lng }
          }
        ];

        candidates.push({
          id: 'nationwide-express-in-1',
          badges: ['fastest'],
          title: `전국 광역: ${trainType} + 수서역 GTX-A + 판교 연계`,
          subtitle: `${originName} ➔ ${ktxOrigin} ➔ 수서역 KTX/SRT ➔ GTX-A 성남역 ➔ 사옥 도착`,
          departureTime: homeDeptStr,
          arrivalTime: hqArrStr,
          totalDurationMinutes: targetMins - 2 - homeDeptMins,
          walkMinutes: 5,
          waitMinutes: 8,
          busMinutes: railDurationMins + 7 + 7,
          fare: trainFare + GYEONGGI_BUS_FARES.CITY_NORMAL + 1800,
          transferCount: 2,
          steps: expressSteps,
          routeColor: '#9333ea',
          routeName: 'KTX/SRT+GTX-A',
          routeCategory: 'public_transit',
          score: 10
        });
      }
    }
  }

  // =============================================================
  // MODE 2: COMMUTE OUT (퇴근) - 완전 동적 다중 정류장 & 대중교통 연계
  // =============================================================
  else {
    // 각 노선의 퇴근 정류장 목록 및 사옥 출발 기준 소요시간(분)
    const OUTBOUND_STOP_SCHEDULE: Record<string, { stop: string; minutesFromHq: number }[]> = {
      route_commute_jamsil: [
        { stop: '모란역', minutesFromHq: 18 },
        { stop: '복정역', minutesFromHq: 24 },
        { stop: '장지역', minutesFromHq: 27 },
        { stop: '문정역', minutesFromHq: 29 },
        { stop: '가락시장역', minutesFromHq: 32 },
        { stop: '송파역', minutesFromHq: 35 },
        { stop: '석촌역', minutesFromHq: 38 },
        { stop: '잠실역', minutesFromHq: 42 },
        { stop: '건대역', minutesFromHq: 52 },
        { stop: '군자역', minutesFromHq: 58 },
      ],
      route_commute_sindorim: [
        { stop: '사당역', minutesFromHq: 32 },
        { stop: '대림역', minutesFromHq: 45 },
        { stop: '신도림역', minutesFromHq: 52 },
      ],
      route_commute_gangnam: [
        { stop: '양재역', minutesFromHq: 22 },
        { stop: '강남역', minutesFromHq: 28 },
        { stop: '신논현역', minutesFromHq: 33 },
        { stop: '논현역', minutesFromHq: 38 },
      ],
      route_commute_anyang: [
        { stop: '인덕원역', minutesFromHq: 25 },
        { stop: '범계역', minutesFromHq: 33 },
        { stop: '안양역', minutesFromHq: 45 },
        { stop: '광명역', minutesFromHq: 55 },
      ],
      route_commute_osan: [
        { stop: 'UN군초전기념관', minutesFromHq: 35 },
        { stop: '오산대역 후문', minutesFromHq: 40 },
        { stop: '오산시청', minutesFromHq: 46 },
        { stop: '사계절 꽃농원', minutesFromHq: 50 },
        { stop: '오산 교촌 본사', minutesFromHq: 55 },
      ],
      route_commute_dongtan: [
        { stop: '예당고사거리', minutesFromHq: 30 },
        { stop: '한미약품', minutesFromHq: 33 },
        { stop: '대방디엠시티', minutesFromHq: 36 },
        { stop: '이주택지', minutesFromHq: 39 },
        { stop: '신안2차,반도4차', minutesFromHq: 42 },
        { stop: '한신더휴', minutesFromHq: 45 },
        { stop: '금호어울림', minutesFromHq: 50 },
      ],
      route_shuttle_pangyo: [
        { stop: '판교역', minutesFromHq: 15 },
      ],
      route_shuttle_yatap: [
        { stop: '판교2밸리', minutesFromHq: 8 },
        { stop: '야탑역', minutesFromHq: 18 },
      ],
    };

    routes.forEach((route) => {
      const stopSchedule = OUTBOUND_STOP_SCHEDULE[route.id] || [{ stop: '판교역', minutesFromHq: 15 }];
      const isShuttle = route.bus_type === 'shuttle';
      const routeBaseFare = isShuttle ? 0 : COMMUTE_BUS_FARE;
      const fareNote = isShuttle
        ? '무료 셔틀 (예약 불필요)'
        : `통근버스 요금 ₩${COMMUTE_BUS_FARE.toLocaleString()} / ⚠️ 일반 대중교통과 환승 할인 불가`;

      route.outbound_trips.forEach((trip) => {
        const deptTimeMins = parseTimeToMinutes(trip.departure);
        if (deptTimeMins < targetMins) return; // 퇴근 희망시간 이후 출발 차량만

        const waitAtHqMins = deptTimeMins - targetMins;

        // 해당 노선의 모든 하차 정류장 중 목적지까지의 경로를 계산하여 최적의 하차 지점 선택
        stopSchedule.forEach((stopItem) => {
          const dropoffStop = stopItem.stop;
          const dropoffCoord = STATION_COORDS[dropoffStop];
          if (!dropoffCoord) return;

          const busArrivalAtStopMins = deptTimeMins + stopItem.minutesFromHq;
          const busArrivalAtStopStr = minutesToTimeString(busArrivalAtStopMins);

          const distToDestMeters = getHaversineDistanceMeters(dropoffCoord.lat, dropoffCoord.lng, originLat, originLng);
          const walkToDestMins = estimateWalkMinutes(distToDestMeters);

          // -------------------------------------------------------
          // Case 2-A: 직접 하차 후 도보 귀가 (도보 30분 이내)
          // -------------------------------------------------------
          // 통근/셔틀 직통 하차는 사내 최우선 수단이므로 항상 계산 (대중교통 필터 여부 무관)
          if (walkToDestMins < 30) {
            const finalArrivalMins = busArrivalAtStopMins + walkToDestMins;
            const finalArrivalStr = minutesToTimeString(finalArrivalMins);

            const directSteps: RouteStepItem[] = [
              {
                id: `out-direct-1-${route.id}-${trip.trip_no}-${dropoffStop}`,
                type: 'walk',
                title: '사옥 승차장 이동 및 대기',
                subtitle: '인피니티타워 E동 앞 통근버스 승차장',
                departureTime: targetTime,
                arrivalTime: trip.departure,
                durationMinutes: waitAtHqMins,
                coords: { lat: hqCoord.lat, lng: hqCoord.lng }
              },
              {
                id: `out-direct-2-${route.id}-${trip.trip_no}-${dropoffStop}`,
                type: isShuttle ? 'shuttle' : 'commute_bus',
                title: `${route.name} (${trip.trip_no}호차) 탑승`,
                subtitle: `사옥 (${trip.departure}) ➔ ${dropoffStop} 하차 (${busArrivalAtStopStr})`,
                departureTime: trip.departure,
                arrivalTime: busArrivalAtStopStr,
                durationMinutes: stopItem.minutesFromHq,
                fare: routeBaseFare,
                note: trip.note ? `${trip.note} | ${fareNote}` : fareNote,
                coords: { lat: dropoffCoord.lat, lng: dropoffCoord.lng }
              },
              {
                id: `out-direct-3-${route.id}-${trip.trip_no}-${dropoffStop}`,
                type: 'walk',
                title: `${dropoffStop} 하차 ➔ ${originName} 도보 이동`,
                subtitle: `목적지까지 도보 약 ${walkToDestMins}분 (${Math.round(distToDestMeters)}m)`,
                departureTime: busArrivalAtStopStr,
                arrivalTime: finalArrivalStr,
                durationMinutes: walkToDestMins,
                distanceMeters: distToDestMeters,
                coords: { lat: originLat, lng: originLng }
              }
            ];

            candidates.push({
              id: `company-out-direct-${route.id}-${trip.trip_no}-${dropoffStop}`,
              badges: [],
              title: isShuttle
                ? `${route.name} ${trip.trip_no}호차 ➔ ${dropoffStop} 직통 (무료)`
                : `${route.name} ${trip.trip_no}호차 ➔ ${dropoffStop} 직통 — ₩${COMMUTE_BUS_FARE.toLocaleString()}`,
              subtitle: `사옥 ${trip.departure} 출발 ➔ ${dropoffStop} ${busArrivalAtStopStr} 하차 ➔ ${originName} (${finalArrivalStr} 도착)`,
              departureTime: targetTime,
              arrivalTime: finalArrivalStr,
              totalDurationMinutes: finalArrivalMins - targetMins,
              walkMinutes: walkToDestMins,
              waitMinutes: waitAtHqMins,
              busMinutes: stopItem.minutesFromHq,
              fare: routeBaseFare,
              transferCount: 0,
              steps: directSteps,
              routeColor: route.color,
              routeName: route.name,
              routeCategory: 'company_only',
              score: 0
            });
          }

          // -------------------------------------------------------
          // Case 2-B: 통근/셔틀버스 하차 ➔ 지하철/대중교통 환승 귀가
          // -------------------------------------------------------
          if (filters.usePublicTransit && nearestSubwayHub) {
            const stopsInSchedule = stopSchedule.map(s => s.stop);
            // 1) 목적지 인근 거점 역이 이미 이 버스의 하차 정류장에 포함되어 있다면,
            // 굳이 다른 정류장에서 조기 하차하여 전철로 갈아타는 비효율적인 우회는 원천 차단
            if (stopsInSchedule.includes(nearestSubwayHub.name)) return;

            // 2) 목적지가 하차 정류장 도보권(<25분)인 경우 Case 2-A(직통 하차)로 처리되므로 전철 환승 우회 차단
            const hasDirectDropoff = stopSchedule.some(s => {
              const coord = STATION_COORDS[s.stop];
              if (!coord) return false;
              const d = getHaversineDistanceMeters(coord.lat, coord.lng, originLat, originLng);
              return estimateWalkMinutes(d) < 25;
            });
            if (hasDirectDropoff) return;

            let transitMins = 0;
            let transferCount = 0;
            let transitDesc = '';
            const isSinbundang = dropoffStop === '판교역' || dropoffStop === '강남역' || dropoffStop === '양재역';

            // 버스 하차 정류장이 지하철역인지 확인 후, 아니면 좌표 기반 가장 가까운 지하철 허브 사용
            const dropoffCoordData = STATION_COORDS[dropoffStop];
            const dropoffSubwayHub = dropoffCoordData
              ? findNearestSubwayHub(dropoffCoordData.lat, dropoffCoordData.lng, dropoffStop)
              : null;
            const effectiveFromStation = dropoffSubwayHub ? dropoffSubwayHub.name : dropoffStop;

            if (dropoffStop === nearestSubwayHub.name || effectiveFromStation === nearestSubwayHub.name) {
              transitMins = 0;
              transferCount = 0;
              transitDesc = `${dropoffStop} 하차 후 도보 이동`;
            } else {
              const info = calculateSubwayRoute(effectiveFromStation, nearestSubwayHub.name);
              if (info.minutes > 75) return;
              transitMins = info.minutes;
              transferCount = info.transferCount;
              transitDesc = info.routeDesc;
            }

            // 하차역과 목적지가 너무 멀지 않고 유의미한 환승일 때만 생성
            if (transitMins <= 75) {
              const destAccess = getDestAccess(originLat, originLng, originName, nearestSubwayHub.lat, nearestSubwayHub.lng, nearestSubwayHub.name);
              const connectingFare = isSinbundang ? 3200 : 1500;
              const totalFare = routeBaseFare + connectingFare + destAccess.fare;
              const transferWalkMins = 4;
              const subwayDeptMins = busArrivalAtStopMins + transferWalkMins;
              const subwayArrMins = subwayDeptMins + transitMins;
              const destArrivalMins = subwayArrMins + destAccess.minutes;

              const subwayDeptStr = minutesToTimeString(subwayDeptMins);
              const subwayArrStr = minutesToTimeString(subwayArrMins);
              const destArrivalStr = minutesToTimeString(destArrivalMins);

              const subwaySubSteps = buildSubwayRouteSteps(
                dropoffSubwayHub ? dropoffSubwayHub.name : dropoffStop,
                nearestSubwayHub.name,
                undefined,
                subwayDeptMins,
                `out-hybrid-${route.id}-${trip.trip_no}-${dropoffStop}`,
                connectingFare,
                nearestSubwayHub.lines[0] || '지하철'
              );

              const actualSubDeptMins = subwaySubSteps.startDeptMins;
              const actualSubArrMins = subwaySubSteps.endArrMins;
              const actualDestArrivalMins = actualSubArrMins + destAccess.minutes;
              const actualDestArrivalStr = minutesToTimeString(actualDestArrivalMins);

              const hybridSteps: RouteStepItem[] = [
                {
                  id: `out-hybrid-1-${route.id}-${trip.trip_no}-${dropoffStop}`,
                  type: 'walk',
                  title: '사옥 ➔ 통근버스 탑승장 이동',
                  subtitle: '슈어소프트 사옥 정문 앞 승강장 (도보 2분)',
                  departureTime: targetTime,
                  arrivalTime: trip.departure,
                  durationMinutes: 2,
                  coords: { lat: hqCoord.lat, lng: hqCoord.lng }
                },
                {
                  id: `out-hybrid-2-${route.id}-${trip.trip_no}-${dropoffStop}`,
                  type: isShuttle ? 'shuttle' : 'commute_bus',
                  title: `${route.name} (${trip.trip_no}호차) 탑승`,
                  subtitle: `사옥 (${trip.departure}) ➔ ${dropoffStop} 이동`,
                  departureTime: trip.departure,
                  arrivalTime: busArrivalAtStopStr,
                  durationMinutes: stopItem.minutesFromHq,
                  fare: routeBaseFare,
                  note: isShuttle ? '무료 셔틀' : `통근버스 요금 ₩${routeBaseFare.toLocaleString()}`,
                  coords: { lat: dropoffCoord.lat, lng: dropoffCoord.lng }
                },
                {
                  id: `out-hybrid-3-${route.id}-${trip.trip_no}-${dropoffStop}`,
                  type: 'walk',
                  title: `${dropoffStop} 하차 ➡ 지하철 환승`,
                  subtitle: dropoffSubwayHub
                    ? `${dropoffStop} 하차 후 인근 ${dropoffSubwayHub.name}(${dropoffSubwayHub.lines.join('/')}) 이동 (${transferWalkMins}분)`
                    : `${dropoffStop} 승강장 이동 (환승 ${transferWalkMins}분)`,
                  departureTime: busArrivalAtStopStr,
                  arrivalTime: minutesToTimeString(actualSubDeptMins),
                  durationMinutes: transferWalkMins,
                  coords: { lat: dropoffCoord.lat, lng: dropoffCoord.lng }
                },
                ...subwaySubSteps.steps,
                {
                  id: `out-hybrid-5-${route.id}-${trip.trip_no}-${dropoffStop}`,
                  type: destAccess.type,
                  title: destAccess.title,
                  subtitle: destAccess.subtitle,
                  departureTime: minutesToTimeString(actualSubArrMins),
                  arrivalTime: actualDestArrivalStr,
                  durationMinutes: destAccess.minutes,
                  distanceMeters: destAccess.distMeters,
                  fare: destAccess.fare,
                  coords: { lat: originLat, lng: originLng },
                  boardingStopName: destAccess.boardingStopName,
                  dropoffStopName: destAccess.dropoffStopName,
                  busNo: destAccess.busNo
                }
              ];

              candidates.push({
                id: `transit-out-hybrid-${route.id}-${trip.trip_no}-${dropoffStop}`,
                badges: [],
                title: isShuttle
                  ? `${route.name} (${trip.trip_no}호차) + ${nearestSubwayHub.name} 전철 연계 (셔틀 무료)`
                  : `${route.name} (${trip.trip_no}호차) + ${dropoffStop} 환승 ➔ ${nearestSubwayHub.name}`,
                subtitle: `사옥 ${trip.departure} ➔ ${dropoffStop} ➔ ${nearestSubwayHub.name} (${actualDestArrivalStr} 도착)`,
                departureTime: targetTime,
                arrivalTime: actualDestArrivalStr,
                totalDurationMinutes: actualDestArrivalMins - targetMins,
                walkMinutes: transferWalkMins + (destAccess.type === 'walk' ? destAccess.minutes : 2),
                waitMinutes: waitAtHqMins,
                busMinutes: stopItem.minutesFromHq + transitMins + (destAccess.type === 'public_bus' ? destAccess.minutes : 0),
                fare: totalFare,
                transferCount: 1 + transferCount + (destAccess.type === 'public_bus' ? 1 : 0),
                steps: hybridSteps,
                routeColor: route.color,
                routeName: `${route.name}+전철`,
                routeCategory: 'transit_hybrid',
                score: 0
              });
            }
          }

          // -------------------------------------------------------
          // Case 2-B-Bus: 통근/셔틀버스 하차 ➔ 연계 시내/간선버스 환승 귀가 (예: 논현역 ➔ 간선 140/470번 ➔ 한남역)
          // -------------------------------------------------------
          if (filters.usePublicTransit) {
            const connectingBus = findConnectingBus(dropoffStop, originLat, originLng, originName);
            if (connectingBus) {
              const transferWalkMins = 3;
              const busWaitMins = Math.min(connectingBus.intervalMinutes, 4);
              const busDeptMins = busArrivalAtStopMins + transferWalkMins + busWaitMins;
              const busArrMins = busDeptMins + connectingBus.rideMinutes;
              const finalWalkMins = 3;
              const destArrivalMins = busArrMins + finalWalkMins;

              const busDeptStr = minutesToTimeString(busDeptMins);
              const busArrStr = minutesToTimeString(busArrMins);
              const destArrivalStr = minutesToTimeString(destArrivalMins);
              const totalFare = routeBaseFare + connectingBus.fare;

              const busSteps: RouteStepItem[] = [
                {
                  id: `out-citybus-1-${route.id}-${trip.trip_no}-${dropoffStop}`,
                  type: 'walk',
                  title: '사옥 ➔ 통근버스 탑승장 이동',
                  subtitle: '슈어소프트 사옥 정문 앞 승강장 (도보 2분)',
                  departureTime: targetTime,
                  arrivalTime: trip.departure,
                  durationMinutes: 2,
                  coords: { lat: hqCoord.lat, lng: hqCoord.lng }
                },
                {
                  id: `out-citybus-2-${route.id}-${trip.trip_no}-${dropoffStop}`,
                  type: isShuttle ? 'shuttle' : 'commute_bus',
                  title: `${route.name} (${trip.trip_no}호차) 탑승`,
                  subtitle: `사옥 (${trip.departure}) ➔ ${dropoffStop} 이동`,
                  departureTime: trip.departure,
                  arrivalTime: busArrivalAtStopStr,
                  durationMinutes: stopItem.minutesFromHq,
                  fare: routeBaseFare,
                  note: isShuttle ? '무료 셔틀' : `통근버스 요금 ₩${routeBaseFare.toLocaleString()}`,
                  coords: { lat: dropoffCoord.lat, lng: dropoffCoord.lng }
                },
                {
                  id: `out-citybus-3-${route.id}-${trip.trip_no}-${dropoffStop}`,
                  type: 'walk',
                  title: `${dropoffStop} 하차 ➔ 시내버스 정류장 환승`,
                  subtitle: connectingBus.boardingStopDesc,
                  departureTime: busArrivalAtStopStr,
                  arrivalTime: busDeptStr,
                  durationMinutes: transferWalkMins + busWaitMins,
                  coords: { lat: dropoffCoord.lat, lng: dropoffCoord.lng }
                },
                {
                  id: `out-citybus-4-${route.id}-${trip.trip_no}-${dropoffStop}`,
                  type: 'public_bus',
                  title: `${connectingBus.busNumber} 탑승`,
                  subtitle: `${dropoffStop} ➔ ${connectingBus.routeDesc} (${connectingBus.rideMinutes}분)`,
                  departureTime: busDeptStr,
                  arrivalTime: busArrStr,
                  durationMinutes: connectingBus.rideMinutes,
                  fare: connectingBus.fare,
                  note: `🚌 배차간격 약 ${connectingBus.intervalMinutes}분 · 시내버스 환승`,
                  coords: { lat: originLat, lng: originLng }
                },
                {
                  id: `out-citybus-5-${route.id}-${trip.trip_no}-${dropoffStop}`,
                  type: 'walk',
                  title: `${originName} 최종 도착`,
                  subtitle: `${connectingBus.dropoffStopDesc} ➔ 목적지 도보 약 3분`,
                  departureTime: busArrStr,
                  arrivalTime: destArrivalStr,
                  durationMinutes: finalWalkMins,
                  coords: { lat: originLat, lng: originLng }
                }
              ];

              candidates.push({
                id: `transit-out-citybus-${route.id}-${trip.trip_no}-${dropoffStop}`,
                badges: ['fastest', 'transfer'],
                title: `${route.name} (${trip.trip_no}호차) + ${dropoffStop} 시내버스 (${connectingBus.busNumber.split('·')[0].trim()}) 직통`,
                subtitle: `사옥 ${trip.departure} ➔ ${dropoffStop} ➔ 시내버스 환승 ➔ ${originName} (${destArrivalStr} 도착)`,
                departureTime: targetTime,
                arrivalTime: destArrivalStr,
                totalDurationMinutes: destArrivalMins - targetMins,
                walkMinutes: transferWalkMins + finalWalkMins,
                waitMinutes: waitAtHqMins + busWaitMins,
                busMinutes: stopItem.minutesFromHq + connectingBus.rideMinutes,
                fare: totalFare,
                transferCount: 1,
                steps: busSteps,
                routeColor: '#2563eb',
                routeName: `${route.name}+시내버스`,
                routeCategory: 'transit_hybrid',
                score: 0
              });
            }
          }
        });
      });
    });

    // -------------------------------------------------------------
    // 2-C. 사옥 앞 대중교통 직통 퇴근 (성남 시내버스 310번 또는 광역 1007번)
    // -------------------------------------------------------------
    if (filters.usePublicTransit && nearestSubwayHub) {
      // 1) 사옥 앞 시내버스 310번 / 602-1B번 ➔ 판교역 환승 ➔ 목적지
      {
        const pangyoCoord = STATION_COORDS['판교역'] || { lat: 37.3948, lng: 127.1119 };
        const busRideMins = 8;
        const walkToHqBusStop = 2;
        const pangyoTransit = calculateSubwayRoute('판교역', nearestSubwayHub.name);
        const subwayTransitMins = pangyoTransit.minutes;
        const isNearbyPangyo = subwayTransitMins > 0 && subwayTransitMins <= 30 && (
          nearestSubwayHub.lines.includes('신분당선') || 
          nearestSubwayHub.lines.includes('경강선') || 
          ['판교역', '이매역', '서현역', '수내역', '정자역', '미금역', '야탑역'].includes(nearestSubwayHub.name)
        );

        if (isNearbyPangyo) {
          const isSinbundang = pangyoTransit.routeDesc.includes('신분당선');
          const transitFare = isSinbundang ? 3200 : GYEONGGI_BUS_FARES.CITY_NORMAL; // 신분당선 미이용 시 경기도 시내버스 1,650원

          const deptBusMins = targetMins + walkToHqBusStop + 3; // 3분 대기
        const arrPangyoBusMins = deptBusMins + busRideMins;
        const deptSubwayMins = arrPangyoBusMins + 5;

        const subwaySubSteps = buildSubwayRouteSteps(
          '판교역',
          nearestSubwayHub.name,
          pangyoTransit,
          deptSubwayMins,
          'public-out-city',
          isSinbundang ? 1550 : 0, // 시내버스 1,650원 결제 후 환승 차액
          isSinbundang ? '신분당선' : (nearestSubwayHub.lines[0] || '지하철')
        );

        const actualSubDeptMins = subwaySubSteps.startDeptMins;
        const actualSubArrMins = subwaySubSteps.endArrMins;
        const finalArrivalMins = actualSubArrMins + 5;
        const destArrivalStr = minutesToTimeString(finalArrivalMins);

        const cityBusSteps: RouteStepItem[] = [
          {
            id: 'public-out-city-1',
            type: 'walk',
            title: '사옥 정문 버스정류장 도보',
            subtitle: '인피니티타워 E동 정문 앞 버스정류장 (도보 2분)',
            departureTime: targetTime,
            arrivalTime: minutesToTimeString(deptBusMins),
            durationMinutes: walkToHqBusStop,
            coords: { lat: hqCoord.lat, lng: hqCoord.lng }
          },
          {
            id: 'public-out-city-2',
            type: 'public_bus',
            title: '성남 시내버스 310번 / 마을 602-1B번 탑승',
            subtitle: '사옥 정문 ➔ 판교역 북문광장 정류장 직통 (8분)',
            departureTime: minutesToTimeString(deptBusMins),
            arrivalTime: minutesToTimeString(arrPangyoBusMins),
            durationMinutes: busRideMins,
            fare: GYEONGGI_BUS_FARES.CITY_NORMAL,
            coords: { lat: pangyoCoord.lat, lng: pangyoCoord.lng }
          },
          {
            id: 'public-out-city-3',
            type: 'walk',
            title: '판교역 환승 이동',
            subtitle: '신분당선 / 경강선 판교역 승강장 이동 (5분)',
            departureTime: minutesToTimeString(arrPangyoBusMins),
            arrivalTime: minutesToTimeString(actualSubDeptMins),
            durationMinutes: 5,
            coords: { lat: pangyoCoord.lat, lng: pangyoCoord.lng }
          },
          ...subwaySubSteps.steps,
          {
            id: 'public-out-city-5',
            type: 'walk',
            title: `${originName} 최종 도착`,
            subtitle: '목적지 도보 5분',
            departureTime: minutesToTimeString(actualSubArrMins),
            arrivalTime: destArrivalStr,
            durationMinutes: 5,
            coords: { lat: originLat, lng: originLng }
          }
        ];

        candidates.push({
          id: 'public-transit-citybus-310-out',
          badges: ['min_walk'],
          title: '대중교통: 사옥 정문 310번 ➔ 판교역 ➔ 지하철 귀가',
          subtitle: `사옥 정문 310번 ➔ 판교역 ➔ ${nearestSubwayHub.name} (${destArrivalStr} 도착, ₩${transitFare.toLocaleString()})`,
          departureTime: targetTime,
          arrivalTime: destArrivalStr,
          totalDurationMinutes: finalArrivalMins - targetMins,
          walkMinutes: walkToHqBusStop + 5 + 5,
          waitMinutes: 3,
          busMinutes: busRideMins + subwayTransitMins,
          fare: transitFare,
          transferCount: 1,
          steps: cityBusSteps,
          routeColor: '#3b82f6',
          routeName: '시내310번+지하철',
          routeCategory: 'public_transit',
          score: 0
        });
      }
    }

      // 2) 잠실/송파/강동 방면: 판교2밸리 광역버스 1007번 / 6900번 ➔ 잠실역 ➔ 8호선/2호선 환승
      const isJamsilOutCorridor = nearestSubwayHub.lines.includes('8호선') ||
        ['잠실역', '건대역', '강변역', '구의역', '군자역', '천호역', '암사역', '암사역사공원역', '장자호수공원역', '구리역', '동구릉역', '다산역', '별내역', '몽촌토성역', '송파역', '석촌역'].some(st => nearestSubwayHub.name.includes(st) || st.includes(nearestSubwayHub.name));

      if (isJamsilOutCorridor) {
        const jamsilTransit = calculateSubwayRoute('잠실역', nearestSubwayHub.name);
        if (jamsilTransit.minutes <= 40 && jamsilTransit.minutes >= 0) {
          const jamsilTransitMins = jamsilTransit.minutes;
          const walkToPangyo2Valley = 4;
          const bus1007RideMins = 25; // 판교2밸리 ➔ 잠실역 고속화도로 직행 약 25분

        const deptBusMins = targetMins + walkToPangyo2Valley + 4; // 4분 배차 대기
        const arrJamsilBusMins = deptBusMins + bus1007RideMins;
        const deptSubwayMins = arrJamsilBusMins + 5;

        const subwaySubSteps = buildSubwayRouteSteps(
          '잠실역',
          nearestSubwayHub.name,
          jamsilTransit,
          deptSubwayMins,
          'public-out-1007',
          0,
          nearestSubwayHub.lines[0] || '8호선'
        );

        const actualSubDeptMins = subwaySubSteps.startDeptMins;
        const actualSubArrMins = subwaySubSteps.endArrMins;
        const finalArrivalMins = actualSubArrMins + 5;
        const destArrivalStr = minutesToTimeString(finalArrivalMins);

        const bus1007Steps: RouteStepItem[] = [
          {
            id: 'public-out-1007-1',
            type: 'walk',
            title: '판교 제2테크노밸리 버스정류장 도보',
            subtitle: '사옥 앞 ➔ LH판교창조경제밸리 정류장 (도보 3분)',
            departureTime: targetTime,
            arrivalTime: minutesToTimeString(deptBusMins),
            durationMinutes: walkToPangyo2Valley,
            coords: { lat: hqCoord.lat, lng: hqCoord.lng }
          },
          {
            id: 'public-out-1007-2',
            type: 'public_bus',
            title: '광역버스 1007번 / 6900번 탑승 (잠실역 방면 직행)',
            subtitle: '판교 제2밸리 ➔ 분당수서고속화 ➔ 잠실역 1번출구 직행 (25분 소요)',
            departureTime: minutesToTimeString(deptBusMins),
            arrivalTime: minutesToTimeString(arrJamsilBusMins),
            durationMinutes: bus1007RideMins,
            fare: 3200,
            note: '🚍 경기도 직행좌석형 광역버스 (교통카드 ₩3,200)'
          },
          {
            id: 'public-out-1007-3',
            type: 'walk',
            title: '잠실역 하차 ➔ 지하철 2호선 / 8호선 환승',
            subtitle: '잠실역 승강장 이동 (5분)',
            departureTime: minutesToTimeString(arrJamsilBusMins),
            arrivalTime: minutesToTimeString(actualSubDeptMins),
            durationMinutes: 5
          },
          ...subwaySubSteps.steps,
          {
            id: 'public-out-1007-5',
            type: 'walk',
            title: `${originName} 최종 도착`,
            subtitle: '목적지 도보 5분',
            departureTime: minutesToTimeString(actualSubArrMins),
            arrivalTime: destArrivalStr,
            durationMinutes: 5,
            coords: { lat: originLat, lng: originLng }
          }
        ];

        candidates.push({
          id: 'public-transit-bus-1007-out',
          badges: ['fastest'],
          title: '대중교통: 광역 1007번(잠실 직통) ➔ 8호선/2호선 환승',
          subtitle: `판교2밸리 1007번 ➔ 잠실역 직행 ➔ ${nearestSubwayHub.name} (${destArrivalStr} 도착)`,
          departureTime: targetTime,
          arrivalTime: destArrivalStr,
          totalDurationMinutes: finalArrivalMins - targetMins,
          walkMinutes: walkToPangyo2Valley + 5 + 5,
          waitMinutes: 4,
          busMinutes: bus1007RideMins + jamsilTransitMins,
          fare: 3200,
          transferCount: 1,
          steps: bus1007Steps,
          routeColor: '#ef4444',
          routeName: '광역1007번+전철',
          routeCategory: 'public_transit',
          score: 0
        });
      }
    }

      // 3) [성남 시내 332번] 사옥 정문 ➔ 성남역(GTX-A/경강선) / 서현역 / 이매역 직통 퇴근
      if (nearestSubwayHub.name.includes('성남역') || nearestSubwayHub.name.includes('서현') || nearestSubwayHub.name.includes('이매')) {
        const walkToHqStop = 2;
        const bus332RideMins = 14;
        const deptBusMins = targetMins + walkToHqStop + 3;
        const arrDestMins = deptBusMins + bus332RideMins;
        const finalArrivalMins = arrDestMins + 4;
        const destArrivalStr = minutesToTimeString(finalArrivalMins);

        candidates.push({
          id: 'public-out-332-direct',
          badges: [],
          title: '성남 시내 332번 버스 (사옥 정문 ➔ 성남역 GTX-A / 서현역 직통)',
          subtitle: `사옥 정문 ➔ 332번 탑승 ➔ 성남역(GTX-A) ➔ ${nearestSubwayHub.name} 직통 (14분 소요)`,
          departureTime: targetTime,
          arrivalTime: destArrivalStr,
          totalDurationMinutes: finalArrivalMins - targetMins,
          walkMinutes: walkToHqStop + 4,
          waitMinutes: 3,
          busMinutes: bus332RideMins,
          fare: GYEONGGI_BUS_FARES.CITY_NORMAL,
          transferCount: 0,
          steps: [
            {
              id: 'out-332-1',
              type: 'walk',
              title: '사옥 정문 버스정류장 도보',
              subtitle: '인피니티타워 E동 정문 앞 정류장 (도보 2분)',
              departureTime: targetTime,
              arrivalTime: minutesToTimeString(deptBusMins),
              durationMinutes: walkToHqStop,
              coords: { lat: hqCoord.lat, lng: hqCoord.lng }
            },
            {
              id: 'out-332-2',
              type: 'public_bus',
              title: '성남 시내버스 332번 탑승',
              subtitle: '판교2밸리 ➔ 판교1밸리 ➔ 성남역(GTX-A) ➔ 서현역 직행 (14분 소요)',
              departureTime: minutesToTimeString(deptBusMins),
              arrivalTime: minutesToTimeString(arrDestMins),
              durationMinutes: bus332RideMins,
              fare: GYEONGGI_BUS_FARES.CITY_NORMAL,
              note: '🚌 성남역 GTX-A / 수인분당선 서현역 직결'
            },
            {
              id: 'out-332-3',
              type: 'walk',
              title: `${originName} 최종 도착`,
              subtitle: '버스정류장 하차 후 도보 이동 (4분)',
              departureTime: minutesToTimeString(arrDestMins),
              arrivalTime: destArrivalStr,
              durationMinutes: 4,
              coords: { lat: originLat, lng: originLng }
            }
          ],
          routeColor: '#3b82f6',
          routeName: '시내 332번',
          routeCategory: 'public_transit',
          score: 0
        });
      }

      // 4) [성남 시내 87번 / 332번] 사옥 정문 ➔ 모란역(8호선 / 수인분당선) 퇴근 (약 23~25분 소요)
      if (nearestSubwayHub) {
        const isMoranDirect = ['모란역', '수진역'].includes(nearestSubwayHub.name);
        const hasMoranTransit = false;

        // Case A: 모란역 인근 직접 귀가 (환승 0회)
        if (isMoranDirect) {
          const walkToHqStop = 2;
          const busRideMins = 23; // 판교2밸리 ➔ 시흥사거리 ➔ 모란역 실측 약 23분
          const deptBusMins = targetMins + walkToHqStop + 3;
          const arrDestMins = deptBusMins + busRideMins;
          const finalArrivalMins = arrDestMins + 3;
          const destArrivalStr = minutesToTimeString(finalArrivalMins);

          candidates.push({
            id: 'public-out-87-332-direct',
            badges: [],
            title: '성남 시내 87번 / 332번 버스 (사옥 정문 ➔ 모란역 직통)',
            subtitle: `사옥 정문 ➔ 87번/332번 탑승 ➔ 모란역(8호선·수인분당선) 직통 (약 23분 소요)`,
            departureTime: targetTime,
            arrivalTime: destArrivalStr,
            totalDurationMinutes: finalArrivalMins - targetMins,
            walkMinutes: walkToHqStop + 3,
            waitMinutes: 3,
            busMinutes: busRideMins,
            fare: GYEONGGI_BUS_FARES.CITY_NORMAL,
            transferCount: 0,
            steps: [
              {
                id: 'out-87-332-1',
                type: 'walk',
                title: '사옥 정문 버스정류장 도보',
                subtitle: '인피니티타워 E동 정문 앞 정류장 (도보 2분)',
                departureTime: targetTime,
                arrivalTime: minutesToTimeString(deptBusMins),
                durationMinutes: walkToHqStop,
                coords: { lat: hqCoord.lat, lng: hqCoord.lng }
              },
              {
                id: 'out-87-332-2',
                type: 'public_bus',
                title: '성남 시내버스 87번 또는 332번 탑승',
                subtitle: '판교2밸리 ➔ 시흥사거리 ➔ 성남시청 ➔ 모란역(8호선·수인분당선) 직행 (약 23분 소요)',
                departureTime: minutesToTimeString(deptBusMins),
                arrivalTime: minutesToTimeString(arrDestMins),
                durationMinutes: busRideMins,
                fare: GYEONGGI_BUS_FARES.CITY_NORMAL,
                note: '🚌 모란역 직결 핵심 노선 (사옥 정문 앞 승차)'
              },
              {
                id: 'out-87-332-3',
                type: 'walk',
                title: `${originName} 최종 도착`,
                subtitle: '모란역 정류장 하차 후 도보 이동 (3분)',
                departureTime: minutesToTimeString(arrDestMins),
                arrivalTime: destArrivalStr,
                durationMinutes: 3,
                coords: { lat: originLat, lng: originLng }
              }
            ],
            routeColor: '#2563eb',
            routeName: '시내 87/332번',
            routeCategory: 'public_transit',
            score: 0
          });
        }

      }
    }

    // 5. [전국 광역 고속철도/KTX·SRT 연계 퇴근] (사옥 ➔ 판교셔틀/시내버스 ➔ 성남역 GTX-A ➔ 수서역 KTX/SRT ➔ 전국 목적지)
    const distFromHqKm = getHaversineDistanceMeters(originLat, originLng, hqCoord.lat, hqCoord.lng) / 1000;
    if (filters.usePublicTransit && distFromHqKm >= 50) {
      let ktxDest = '지역 고속철도역';
      let trainType = 'KTX/SRT';
      let railDurationMins = 120;
      let trainFare = 35000;

      if (originLat < 35.5 && originLng > 128.8) {
        // 부산/울산/경남권
        ktxDest = originName.includes('해운대') ? '부산역 (해운대 방면)' : '부산역 / 울산역';
        trainType = 'SRT/KTX 고속열차';
        railDurationMins = 135;
        trainFare = 52600;
      } else if (originLat < 36.0 && originLng > 128.3) {
        // 대구/경북권
        ktxDest = '동대구역 / 김천구미역';
        trainType = 'SRT/KTX 고속열차';
        railDurationMins = 95;
        trainFare = 37400;
      } else if (originLat < 36.6 && originLng > 127.1) {
        // 대전/충청권
        ktxDest = '대전역 / 오송역';
        trainType = 'SRT/KTX 고속열차';
        railDurationMins = 55;
        trainFare = 20100;
      } else if (originLat < 35.5 && originLng <= 127.2) {
        // 광주/전남권
        ktxDest = '광주송정역 / 나주역';
        trainType = 'SRT/KTX 고속열차';
        railDurationMins = 110;
        trainFare = 40700;
      } else if (originLat >= 37.2 && originLng > 128.5) {
        // 강원권
        ktxDest = '강릉역 / 만종역';
        trainType = 'KTX-이음 고속열차';
        railDurationMins = 90;
        trainFare = 27600;
      } else {
        railDurationMins = Math.round(distFromHqKm * 0.45) + 30;
        trainFare = Math.round(distFromHqKm * 140);
      }

      const walkToHqStop = 2;
      const deptHqBusMins = targetMins + walkToHqStop + 2;
      const seongnamArrMins = deptHqBusMins + 8;
      const gtxDeptMins = seongnamArrMins + 4;
      const suseoArrMins = gtxDeptMins + 7;
      const trainDeptMins = suseoArrMins + 12; // 12분 환승
      const ktxArrMins = trainDeptMins + railDurationMins;
      const localDestMins = 20; // KTX역 ➔ 최종 귀가지
      const finalArrMins = ktxArrMins + localDestMins;

      const suseoCoord = { lat: 37.4874, lng: 127.1018 };
      const seongnamCoord = { lat: 37.3970, lng: 127.1180 };

      const outExpressSteps: RouteStepItem[] = [
        {
          id: 'nationwide-out-1',
          type: 'walk',
          title: '사옥 정문 버스정류장 도보',
          subtitle: '인피니티타워 E동 정문 앞 (도보 2분)',
          departureTime: targetTime,
          arrivalTime: minutesToTimeString(deptHqBusMins),
          durationMinutes: walkToHqStop,
          coords: { lat: hqCoord.lat, lng: hqCoord.lng }
        },
        {
          id: 'nationwide-out-2',
          type: 'public_bus',
          title: '시내버스 310번 / 판교셔틀 탑승',
          subtitle: '사옥 ➔ 성남역 환승센터 이동 (8분 소요)',
          departureTime: minutesToTimeString(deptHqBusMins),
          arrivalTime: minutesToTimeString(seongnamArrMins),
          durationMinutes: 8,
          fare: GYEONGGI_BUS_FARES.CITY_NORMAL,
          boardingStopName: '판교2밸리·인피니티타워 정문 앞',
          dropoffStopName: '성남역 2번출구 버스정류장',
          coords: seongnamCoord
        },
        {
          id: 'nationwide-out-3',
          type: 'subway',
          title: '성남역 GTX-A 탑승 ➔ 수서역 이동',
          subtitle: 'GTX-A 수서행 고속전철 1정거장 (7분 소요)',
          departureTime: minutesToTimeString(gtxDeptMins),
          arrivalTime: minutesToTimeString(suseoArrMins),
          durationMinutes: 7,
          fare: 1800,
          coords: suseoCoord
        },
        {
          id: 'nationwide-out-4',
          type: 'subway',
          title: `${trainType} (${trainDeptMins ? minutesToTimeString(trainDeptMins) : '출발'} 수서역 ➔ ${ktxDest})`,
          subtitle: `고속열차 직통 운행 (${railDurationMins}분 소요)`,
          departureTime: minutesToTimeString(trainDeptMins),
          arrivalTime: minutesToTimeString(ktxArrMins),
          durationMinutes: railDurationMins,
          fare: trainFare,
          note: `🚄 ${trainType} 정시 운행 / ${ktxDest} 도착`,
          boardingStopName: '수서역 KTX/SRT 승강장',
          dropoffStopName: ktxDest,
          coords: { lat: originLat, lng: originLng }
        },
        {
          id: 'nationwide-out-5',
          type: 'public_bus',
          title: `${ktxDest} ➔ ${originName} 최종 귀가`,
          subtitle: `지역 시내교통/도보 이동 (약 ${localDestMins}분)`,
          departureTime: minutesToTimeString(ktxArrMins),
          arrivalTime: minutesToTimeString(finalArrMins),
          durationMinutes: localDestMins,
          fare: GYEONGGI_BUS_FARES.CITY_NORMAL,
          coords: { lat: originLat, lng: originLng }
        }
      ];

      candidates.push({
        id: 'nationwide-express-out-1',
        badges: ['fastest'],
        title: `전국 광역: 판교 연계 + 수서역 ${trainType} 귀가`,
        subtitle: `사옥 ➔ 성남역 GTX-A ➔ 수서역 KTX/SRT ➔ ${ktxDest} ➔ ${originName} 귀가`,
        departureTime: targetTime,
        arrivalTime: minutesToTimeString(finalArrMins),
        totalDurationMinutes: finalArrMins - targetMins,
        walkMinutes: 5,
        waitMinutes: 10,
        busMinutes: 8 + 7 + railDurationMins + localDestMins,
        fare: trainFare + GYEONGGI_BUS_FARES.CITY_NORMAL + 1800 + GYEONGGI_BUS_FARES.CITY_NORMAL,
        transferCount: 2,
        steps: outExpressSteps,
        routeColor: '#9333ea',
        routeName: 'GTX-A+KTX/SRT',
        routeCategory: 'public_transit',
        score: 10
      });
    }
  }

  // =============================================================
  // 3. FILTERING: 비현실적 경로 (환승 4회 이상, 도보 30분 이상, 중간 GTX 환승) 엄격 제외
  // =============================================================
  const validCandidates = candidates.filter((cand) => {
    // 1) 실제 대중교통 탑승 수단 기준 환승 횟수 동적 계산 및 4회 이상(탑승 5회 이상) 엄격 제외
    const transitSteps = cand.steps.filter(
      (st) => st.type === 'subway' || st.type === 'commute_bus' || st.type === 'shuttle' || st.type === 'public_bus'
    );
    const actualTransferCount = Math.max(0, transitSteps.length - 1);
    cand.transferCount = actualTransferCount;

    if (cand.transferCount >= 4) return false;

    // 2) 총 도보 시간이 30분 이상인 경로 제외
    if (cand.walkMinutes >= 30) return false;

    // 3) 개별 도보 단계가 30분 이상인 경우 제외
    const hasExcessiveWalk = cand.steps.some(
      (st) => st.type === 'walk' && st.durationMinutes >= 30
    );
    if (hasExcessiveWalk) return false;

    // 4) GTX 환승 배제: 전국 광역 경로이거나 출발/도착지가 GTX 정차역이 아닌 경우 중간 불필요한 GTX 환승 제외
    const isNationwide = cand.id.startsWith('nationwide-');
    const isOriginGtx = ['수서', '동탄', '성남', '구성'].some(gtx => originName.includes(gtx));
    if (!isOriginGtx && !isNationwide) {
      const usesGtx = cand.steps.some(st => (st.title + st.subtitle + (st.note || '')).includes('GTX'));
      if (usesGtx) return false;
    }

    return true;
  });

  // =============================================================
  // 3.5. EARLY BIRD (조조할인) 자동 적용
  // 당일 첫차 ~ 06:30 사이에 첫 대중교통 탑승 시 할인 및 배지 적용
  // =============================================================
  validCandidates.forEach((cand) => {
    applyEarlyBirdDiscount(cand);
  });

  // =============================================================
  // 4. SCORING & RANKING MODEL
  // =============================================================
  validCandidates.forEach((cand) => {
    let wTotal = 1.0;
    let wWalk = 1.0;
    let wWait = 0.8;
    let wTransfer = 10;
    let wFare = 0.005;

    if (preference === 'fastest') {
      wTotal = 2.5;
      wWalk = 0.5;
    } else if (preference === 'min_walk') {
      wWalk = 3.5;
    } else if (preference === 'min_transfer') {
      wTransfer = 25;
    } else if (preference === 'free_first') {
      wFare = 0.02;
    }

    // Cost formula
    cand.score =
      cand.totalDurationMinutes * wTotal +
      cand.walkMinutes * wWalk +
      cand.waitMinutes * wWait +
      cand.transferCount * wTransfer +
      cand.fare * wFare;

    // 사내 통근버스 및 무료 셔틀 우선순위 가중치 (사내 복지 교통수단 최우선 활용)
    if (cand.routeCategory === 'company_only') {
      // 직통 통근/셔틀: 환승 없이 사옥 직통이므로 최우선 보너스 (-25점)
      cand.score -= 25;
      if (!cand.badges.includes('direct')) {
        cand.badges.push('direct');
      }
    } else if (cand.routeCategory === 'transit_hybrid') {
      // 대중교통 + 통근/셔틀 연계: 사옥 앞 정문 하차 및 셔틀 활용 이점 (-10점)
      cand.score -= 10;
    }
  });

  // 1. 효율성 점수(Score) 기준 오름차순 정렬 (가장 효율적인 경로 우선)
  validCandidates.sort((a, b) => a.score - b.score);

  // 2. 중복 및 유사 경로 스마트 필터링 (비슷한 경로 중 최적 1~2개만 유지)
  const uniqueCandidates: RouteCandidate[] = [];
  const seenSignatures = new Set<string>();
  const seenBusTrips = new Map<string, RouteCandidate>();

  for (const cand of validCandidates) {
    // A. 환승 수단 및 출도착 시각 기반 핵심 시그니처 (완전 중복 방지)
    const transitStepSignatures = cand.steps
      .filter((s) => s.type !== 'walk')
      .map((s) => `${s.type}:${s.title.replace(/\(.*?\)/g, '').trim()}`)
      .join('->');

    const exactSig = `${transitStepSignatures}_${cand.departureTime}_${cand.arrivalTime}_${cand.fare}`;
    if (seenSignatures.has(exactSig)) {
      continue;
    }

    // B. 동일 통근버스/셔틀 호차에 대해 여러 인근 정류장에서 중복 탑승하는 유사 경로 제거 (최적 승차지 1개 우선)
    const tripMatch = cand.id.match(/(commute_[a-z]+|shuttle_[a-z]+)-(\d+)/) || cand.steps.find(s => s.type === 'commute_bus' || s.type === 'shuttle')?.id.match(/(commute_[a-z]+|shuttle_[a-z]+)-(\d+)/);
    if (tripMatch) {
      const tripKey = `${tripMatch[1]}-${tripMatch[2]}`;
      const existing = seenBusTrips.get(tripKey);
      if (existing) {
        // 이미 해당 호차 탑승 경로가 존재하는 경우, 소요 시간 및 점수가 더 불리한 유사 경로는 제외
        if (Math.abs(existing.totalDurationMinutes - cand.totalDurationMinutes) <= 10 && cand.score > existing.score) {
          continue;
        }
      } else {
        seenBusTrips.set(tripKey, cand);
      }
    }

    seenSignatures.add(exactSig);
    uniqueCandidates.push(cand);
  }

  // 3. 사용자 요청에 따라 가장 효율적인 상위 15개 경로로 제한
  const finalCandidates = uniqueCandidates.slice(0, 15);

  // 4. 배지 부여 (추천, 최단시간, 최소도보, 무료)
  if (finalCandidates.length > 0) {
    // 🥇 최적 추천 경로 (Top Scorer)
    finalCandidates[0].badges.push('recommend');

    // ⚡ 최단 시간 경로
    const fastest = [...finalCandidates].sort((a, b) => a.totalDurationMinutes - b.totalDurationMinutes)[0];
    if (fastest && !fastest.badges.includes('recommend')) {
      fastest.badges.push('fastest');
    }

    // 🚶 최소 도보 경로
    const minWalk = [...finalCandidates].sort((a, b) => a.walkMinutes - b.walkMinutes)[0];
    if (minWalk && !minWalk.badges.includes('recommend') && !minWalk.badges.includes('fastest')) {
      minWalk.badges.push('min_walk');
    }

    // 🆓 무료 경로
    const freeRoute = finalCandidates.find((c) => c.fare === 0);
    if (freeRoute && !freeRoute.badges.includes('recommend')) {
      freeRoute.badges.push('free');
    }
  }

  return finalCandidates;
}
