import { getHaversineDistanceMeters, estimateWalkMinutes, parseTimeToMinutes, minutesToTimeString } from './distance';
import { getCachedFeederBus } from './kakaoTransitApi';

export interface ConnectingBusOption {
  hubName: string;
  destName: string;
  busNumber: string;
  busType: 'blue' | 'green' | 'red' | 'town';
  rideMinutes: number;
  intervalMinutes: number;
  fare: number;
  routeTitle: string;
  boardingStopDesc: string;
  dropoffStopDesc: string;
  routeDesc: string;
}

interface BusCorridorRule {
  fromHubs: string[];
  keywords: string[];
  busNumber: string;
  busType: 'blue' | 'green' | 'red' | 'town';
  baseRideMinutes: number;
  intervalMinutes: number;
  fare: number;
  dropoffStopDesc: string;
  routeDesc: string;
}

const BUS_CORRIDOR_RULES: BusCorridorRule[] = [
  // 1. 강남대로 ➔ 한남동 / 이태원 / 순천향병원 / 보광동 (한남대교 직통)
  {
    fromHubs: ['논현역', '신논현역', '강남역', '양재역'],
    keywords: ['한남', '한남역', '순천향', '이태원', '보광', '한강진', '한남대교', '옥수'],
    busNumber: '간선 140번 · 144번 · 420번 · 470번 · 741번',
    busType: 'blue',
    baseRideMinutes: 9, // 논현역 기준 9분
    intervalMinutes: 3,
    fare: 1650, // 일반 시내버스 기본 요금
    dropoffStopDesc: '한남오거리 · 한남역 입구 정류장',
    routeDesc: '중앙차로 승차 ➔ 한남대교 경유 ➔ 한남오거리 직통'
  },
  // 2. 강남대로 ➔ 종로 / 광화문 / 서울역 / 도심
  {
    fromHubs: ['논현역', '신논현역', '강남역', '양재역'],
    keywords: ['종로', '광화문', '시청', '서울역', '을지로', '명동', '안국', '혜화', '동대문', '서대문'],
    busNumber: '간선 140번 · 470번 · 741번 · 광역 9401번',
    busType: 'blue',
    baseRideMinutes: 24,
    intervalMinutes: 4,
    fare: 1650, // 일반 시내버스 기본 요금
    dropoffStopDesc: '종로2가 / 광화문 / 서울역 중앙차로 정류장',
    routeDesc: '강남대로 중앙차로 ➔ 남산1호터널 ➔ 도심 직통'
  },
  // 3. 사당역 ➔ 이촌 / 용산 / 남영 / 삼각지
  {
    fromHubs: ['사당역'],
    keywords: ['이촌', '용산', '남영', '삼각지', '숙대', '흑석', '노량진', '중앙대'],
    busNumber: '간선 502번 · 540번 · 지선 4212번 · 5524번',
    busType: 'blue',
    baseRideMinutes: 16,
    intervalMinutes: 6,
    fare: 1650, // 일반 시내버스 기본 요금
    dropoffStopDesc: '용산역 / 삼각지 / 이촌동 정류장',
    routeDesc: '동작대교 경유 ➔ 용산·이촌 방면 직통'
  },
  // 4. 신도림역 / 대림역 ➔ 여의도 / 영등포 / 마포 / 목동
  {
    fromHubs: ['신도림역', '대림역'],
    keywords: ['여의도', '영등포', '마포', '공덕', '문래', '목동', '신길', '당산', '양평'],
    busNumber: '간선 600번 · 662번 · 6512번 · 5618번',
    busType: 'blue',
    baseRideMinutes: 13,
    intervalMinutes: 5,
    fare: 1650, // 일반 시내버스 기본 요금
    dropoffStopDesc: '여의도환승센터 / 영등포역 정류장',
    routeDesc: '경인로 ➔ 여의도 / 영등포 방면 직통'
  },
  // 5-A. 잠실역 / 강변역 ➔ 구리 / 다산 / 남양주 (인창, 수택, 토평, 다산신도시)
  {
    fromHubs: ['잠실역', '가락시장역', '복정역', '강변역'],
    keywords: ['구리', '구리역', '인창', '수택', '토평', '교문', '다산', '남양주', '도농', '가운'],
    busNumber: '직행좌석 1115-6번 · 1670번 · 1700번 · M2323번 · 시내 15번',
    busType: 'red',
    baseRideMinutes: 15,
    intervalMinutes: 7,
    fare: 3200, // 경기도 직행좌석형 광역버스 요금
    dropoffStopDesc: '구리역 · 롯데백화점 / 돌다리 / 토평동 정류장',
    routeDesc: '잠실대교 / 강변북로 경유 ➔ 구리·다산 방면 직통'
  },
  // 5-B. 잠실역 ➔ 하남 (미사강변 / 풍산 / 하남시청 / 위례)
  {
    fromHubs: ['잠실역', '가락시장역', '복정역', '석촌역'],
    keywords: ['하남', '미사', '풍산', '하남시청', '덕풍', '감일', '위례'],
    busNumber: '직행좌석 9302번 · 9303번 · 시내 30-1번 · 30-3번',
    busType: 'red',
    baseRideMinutes: 18,
    intervalMinutes: 6,
    fare: 3200, // 경기도 직행좌석형 광역버스 요금
    dropoffStopDesc: '미사강변도시 / 하남시청 방면 정류장',
    routeDesc: '올림픽대로 경유 ➔ 미사·하남 방면 직통'
  },
  // 5-C. 잠실역 / 가락시장역 ➔ 강동 / 천호 / 암사 / 명일 / 고덕
  {
    fromHubs: ['잠실역', '가락시장역', '복정역', '석촌역', '송파역'],
    keywords: ['천호', '강동', '암사', '명일', '고덕', '상일', '길동', '둔촌'],
    busNumber: '간선 340번 · 342번 · 지선 3217번 · 3318번 · 3411번',
    busType: 'green',
    baseRideMinutes: 13,
    intervalMinutes: 5,
    fare: 1650, // 일반 시내버스 기본 요금
    dropoffStopDesc: '천호역 / 강동역 / 고덕 방면 정류장',
    routeDesc: '올림픽로 / 천호대로 경유 ➔ 천호·강동 방면 직통'
  },
  // 6. 판교역 ➔ 분당 (서현 / 수내 / 정자 / 미금 / 오리) / 수지 / 죽전
  {
    fromHubs: ['판교역'],
    keywords: ['서현', '수내', '정자', '미금', '오리', '죽전', '수지', '광교', '기흥', '동천', '분당'],
    busNumber: '성남 시내 390번 · 380번 · 310번 · 마을 602-1B번',
    busType: 'green',
    baseRideMinutes: 12,
    intervalMinutes: 6,
    fare: 1650, // 경기도 성남 일반형 시내버스 요금 (1,650원)
    dropoffStopDesc: '분당 / 수지 주요 정류장',
    routeDesc: '분당내곡로 / 성남대로 경유 ➔ 분당·수지 방면 직통'
  },
  // 7. 모란역 / 야탑역 ➔ 성남 구도심 (태평 / 신흥 / 단대오거리 / 상대원) / 경기광주
  {
    fromHubs: ['모란역', '야탑역'],
    keywords: ['태평', '가천대', '신흥', '수진', '단대오거리', '남한산성', '상대원', '경기광주', '은행동'],
    busNumber: '성남 시내 33번 · 55번 · 3-1번 · 300번 · 333번',
    busType: 'green',
    baseRideMinutes: 12,
    intervalMinutes: 5,
    fare: 1650, // 경기도 성남 일반형 시내버스 요금 (1,650원)
    dropoffStopDesc: '성남 구도심 / 광주 방면 정류장',
    routeDesc: '산성대로 경유 ➔ 성남 구도심 방면 직통'
  },
  // 8. 동탄역 / 예당고사거리 ➔ 병점 / 수원 / 오산 / 영통 / 망포
  {
    fromHubs: ['예당고사거리', '동탄역', '한미약품', '대방디엠시티', '신안2차,반도4차', '금호어울림'],
    keywords: ['병점', '수원', '오산', '영통', '망포', '화성', '동탄호수', '세마', '오산대'],
    busNumber: '화성 시내 708번 · 709번 · 73번 · 116-3번 · H1번',
    busType: 'green',
    baseRideMinutes: 15,
    intervalMinutes: 8,
    fare: 1650, // 경기도 화성/수원 일반형 시내버스 요금 (1,650원)
    dropoffStopDesc: '병점역 / 영통 / 수원 방면 정류장',
    routeDesc: '동탄대로 / 1번국도 경유 ➔ 병점·수원 방면 직통'
  }
];

/**
 * 특정 하차역(Hub)에서 목적지(Destination)로 직결되는 연계 시내버스 정보 검색
 * (카카오 대중교통 API 실시간 캐시 우선 연동)
 */
export function findConnectingBus(
  fromHub: string,
  destLat: number,
  destLng: number,
  destName: string
): ConnectingBusOption | null {
  if (!destName && (destLat === 0 && destLng === 0)) return null;

  // 1. 카카오맵 대중교통 API가 실시간 탐색한 실제 버스 노선 우선 연계 (하드코딩 배제)
  if (destLat && destLng) {
    const cached = getCachedFeederBus(destLat, destLng);
    if (cached && cached.busNo) {
      return {
        hubName: fromHub,
        destName,
        busNumber: cached.busNo,
        busType: 'green',
        rideMinutes: cached.durationMinutes,
        intervalMinutes: 6,
        fare: 1650,
        routeTitle: `${fromHub} ➔ ${cached.busLineDesc} ➔ ${destName}`,
        boardingStopDesc: `${fromHub} 정류장`,
        dropoffStopDesc: cached.startStopName,
        routeDesc: `${cached.startStopName} ➔ ${fromHub} 연계 버스`
      };
    }
  }

  // 2. 주요 환승 거점 회랑 규칙
  const cleanDest = destName.toLowerCase();
  for (const rule of BUS_CORRIDOR_RULES) {
    if (!rule.fromHubs.includes(fromHub)) continue;

    // 목적지 키워드 일치 확인
    const matched = rule.keywords.some((kw) => cleanDest.includes(kw.toLowerCase()));
    if (matched) {
      // Hub별 추가 소요시간 보정
      let addedMins = 0;
      if (fromHub === '신논현역') addedMins = 3;
      else if (fromHub === '강남역') addedMins = 6;
      else if (fromHub === '양재역') addedMins = 10;
      else if (fromHub === '석촌역' || fromHub === '송파역') addedMins = 4;
      else if (fromHub === '가락시장역' || fromHub === '복정역') addedMins = 7;

      const rideMins = rule.baseRideMinutes + addedMins;

      return {
        hubName: fromHub,
        destName,
        busNumber: rule.busNumber,
        busType: rule.busType,
        rideMinutes: rideMins,
        intervalMinutes: rule.intervalMinutes,
        fare: rule.fare,
        routeTitle: `${fromHub} 하차 ➔ ${rule.busNumber} 탑승 ➔ ${destName}`,
        boardingStopDesc: `${fromHub} 중앙차로 / 버스정류장 (도보 2분)`,
        dropoffStopDesc: rule.dropoffStopDesc,
        routeDesc: rule.routeDesc
      };
    }
  }

  return null;
}

export interface LocalConnectingBusResult {
  busNo: string;
  busLineDesc: string;
  boardingName: string;
  dropoffName: string;
  nodeId?: string;
  cityCode?: string;
}

/**
 * 주거지(아파트/동/학교 등) ➔ 거점 전철역(Hub) 또는 거점 전철역 ➔ 귀가 목적지 간
 * 실제 운행하는 시내/마을버스 정보를 카카오 대중교통 길찾기 API에서 100% 동적으로 매핑합니다.
 * (기존의 isAnsan, isSeongnam, isSuwon 등 지역별 하드코딩 if-else 블록을 완전히 제거)
 */
export function findLocalConnectingBus(
  originOrDestName: string,
  hubName: string,
  coords?: { lat: number; lng: number }
): LocalConnectingBusResult {
  const cleanName = (originOrDestName || '').trim();
  const cleanHub = (hubName || '').trim();
  const lat = coords?.lat || 0;
  const lng = coords?.lng || 0;

  // 1. 카카오 대중교통 API가 실시간 탐색한 실제 버스 노선 및 정류장 캐시 확인
  if (lat && lng) {
    const cached = getCachedFeederBus(lat, lng);
    if (cached) {
      return {
        busNo: cached.busNo,
        busLineDesc: cached.busLineDesc,
        boardingName: cached.startStopName || `${cleanName} 인근 정류장`,
        dropoffName: cached.endStopName || `${cleanHub} 정류장`
      };
    }
  }

  // 2. 캐시 조회 전 또는 로딩 중 동적 기본값 (가짜 특정 버스 번호 하드코딩 배제)
  // 정류소 명칭은 사용자가 입력한 지명 기반으로 안전하게 구성하고, 
  // 실제 버스 번호는 카카오 대중교통 API 및 실시간 BIS 응답 수신 시 동적으로 채워집니다.
  return {
    busNo: '',
    busLineDesc: '시내·마을버스 (카카오맵 실시간 탐색)',
    boardingName: `${cleanName} 인근 정류장`,
    dropoffName: `${cleanHub} 정류장`
  };
}
