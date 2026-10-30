import { STATION_COORDS } from './initialBusData';
import { RouteCandidate, RouteStepItem } from '../types/bus';

export interface BoardingLocationInfo {
  id: string;
  stationName: string;
  aliasNames: string[];
  routeName: string;
  busType: 'shuttle' | 'commute';
  exactLocation: string;
  address: string;
  landmarks: string;
  tip?: string;
  imageUrl?: string; // 사진 이미지 경로 (예: /images/boarding/pangyo.jpg)
  coords?: { lat: number; lng: number };
  kakaoMapUrl?: string;
}

// 셔틀 및 통근버스 정류소별 탑승 위치 상세 데이터 (사진 및 위치 안내)
export const SHUTTLE_BOARDING_LOCATIONS: Record<string, BoardingLocationInfo> = {
  // ── 판교 셔틀 노선 ──
  "판교역": {
    id: "pangyo",
    stationName: "판교역",
    aliasNames: ["판교역", "신분당선 판교역", "판교역 북문", "판교역 1번출구", "판교역 북문광장"],
    routeName: "판교셔틀",
    busType: "shuttle",
    exactLocation: "판교역 1번 출구 북문광장 앞 셔틀버스 정류장",
    address: "경기 성남시 분당구 판교역로 160 (판교역 북문광장 앞)",
    landmarks: "신분당선 1번 출구 나와 북문광장 방향 직진, 투썸플레이스 건물 앞 버스 전용 승강장 (빨간 화살표 위치)",
    tip: "출근 집중 시간대(08:00~08:40)에는 탑승 대기 인원이 많으므로 5분 전 미리 도착해 주세요.",
    imageUrl: "/images/boarding/pangyo.jpg",
    coords: { lat: 37.394884, lng: 127.110964 },
    kakaoMapUrl: "https://map.kakao.com/link/to/판교역셔틀탑승장,37.394884,127.110964"
  },
  "삼평교": {
    id: "sampyeonggyo",
    stationName: "삼평교",
    aliasNames: ["삼평교", "삼평교 정류장", "삼평교 버스정류장"],
    routeName: "판교셔틀",
    busType: "shuttle",
    exactLocation: "삼평교 버스정류장",
    address: "경기 성남시 분당구 삼평동 623",
    landmarks: "삼평교 도로변 버스정류소 쉘터 (빨간 화살표: 출근 탑승 / 파란 화살표: 퇴근 하차)",
    tip: "출근 시에는 빨간 화살표로 표시된 정류장 쉘터에서 탑승합니다. 셔틀 진입 시 손을 들어주시면 안전하게 정차합니다.",
    imageUrl: "/images/boarding/sampyeonggyo.jpg",
    coords: { lat: 37.402723, lng: 127.102937 },
    kakaoMapUrl: "https://map.kakao.com/link/to/삼평교셔틀탑승장,37.402723,127.102937"
  },
  "성남역": {
    id: "seongnam",
    stationName: "성남역",
    aliasNames: ["성남역", "성남역 5번출구", "GTX 성남역"],
    routeName: "판교셔틀",
    busType: "shuttle",
    exactLocation: "GTX-A / 경강선 성남역 5번 출구 바로 앞",
    address: "경기 성남시 분당구 백현동 542 (성남역 5번 출구)",
    landmarks: "성남역 5번 출구 계단/에스컬레이터 나와서 우측 셔틀 승강장",
    tip: "GTX-A 환승 직원들이 다수 이용하는 거점 정류장입니다.",
    imageUrl: "/images/boarding/seongnam.jpg",
    coords: { lat: 37.394635, lng: 127.121220 },
    kakaoMapUrl: "https://map.kakao.com/link/to/성남역셔틀탑승장,37.394635,127.121220"
  },
  "이매역": {
    id: "imae",
    stationName: "이매역",
    aliasNames: ["이매역", "이매역 5번출구", "경강선 이매역"],
    routeName: "판교셔틀",
    busType: "shuttle",
    exactLocation: "경강선 / 수인분당선 이매역 5번 출구 앞",
    address: "경기 성남시 분당구 이매동 (이매역 5번 출구)",
    landmarks: "5번 출구 앞 도로변 셔틀 승강장",
    tip: "정시 출발하므로 3분 전 미리 승차홈에 도착해 주세요.",
    imageUrl: "/images/boarding/imae.jpg",
    coords: { lat: 37.394584, lng: 127.126934 },
    kakaoMapUrl: "https://map.kakao.com/link/to/이매역셔틀탑승장,37.394584,127.126934"
  },
  "이매촌한신": {
    id: "imaechon",
    stationName: "이매촌한신",
    aliasNames: ["이매촌한신", "이매촌한신·서현역", "서현역 이매촌"],
    routeName: "판교셔틀",
    busType: "shuttle",
    exactLocation: "이매촌한신·서현역 버스정류장 (성남대로 방면)",
    address: "경기 성남시 분당구 서현로 181",
    landmarks: "이매촌 한신아파트 앞 광역버스 승강장 뒤편",
    tip: "광역버스 정류소와 혼잡할 수 있으니 셔틀버스 표식을 확인해 주세요.",
    imageUrl: "/images/boarding/imaechon.jpg",
    coords: { lat: 37.389126, lng: 127.124545 },
    kakaoMapUrl: "https://map.kakao.com/link/to/이매촌한신셔틀탑승장,37.389126,127.124545"
  },

  // ── 야탑 셔틀 노선 ──
  "야탑역": {
    id: "yatap",
    stationName: "야탑역",
    aliasNames: ["야탑역", "수인분당선 야탑역", "야탑역 1번출구", "야탑역 우리은행", "야탑역 우리은행 앞", "야탑 우리은행"],
    routeName: "야탑셔틀",
    busType: "shuttle",
    exactLocation: "야탑역 우리은행 앞 도로변 셔틀 승강장",
    address: "경기 성남시 분당구 야탑로81번길 10 (분당아미고타워 1층 우리은행 앞)",
    landmarks: "수인분당선 야탑역 3번 출구 인근, 분당아미고타워 1층 우리은행(야탑역금융센터) 정문 앞 도로변 (빨간 화살표 위치)",
    tip: "우리은행 앞 도로변에서 대기해 주세요. 정시 출발하므로 3분 전 미리 승차홈에 도착 바랍니다.",
    imageUrl: "/images/boarding/yatap.jpg",
    coords: { lat: 37.412071, lng: 127.129054 },
    kakaoMapUrl: "https://map.kakao.com/link/to/야탑역셔틀탑승장,37.412071,127.129054"
  },
  "판교2밸리": {
    id: "pangyo2valley",
    stationName: "판교2밸리",
    aliasNames: ["판교2밸리", "판교제2테크노밸리", "판교 제2밸리", "판교 제 2테크노벨리", "금토동삼거리"],
    routeName: "야탑셔틀",
    busType: "shuttle",
    exactLocation: "판교 제2테크노밸리 버스정류장 (금토동삼거리 부근)",
    address: "경기 성남시 수정구 달래내로 (금토동삼거리 앞)",
    landmarks: "금토동삼거리 인근 판교제2테크노밸리 방면 버스 쉘터 (빨간 화살표: 출근 탑승 / 파란 화살표: 퇴근 하차)",
    tip: "출근 시에는 달래내로 단지 방면 승강장(빨간 화살표)에서 탑승합니다.",
    imageUrl: "/images/boarding/pangyo2valley.jpg",
    coords: { lat: 37.408225, lng: 127.097081 },
    kakaoMapUrl: "https://map.kakao.com/link/to/판교2밸리셔틀탑승장,37.408225,127.097081"
  },

  // ── 잠실 노선 (통근버스) ──
  "군자역": {
    id: "gunja",
    stationName: "군자역",
    aliasNames: ["군자역", "7호선 군자역", "군자역 5번출구", "군자역 무척나은병원", "연세무척나은병원"],
    routeName: "잠실노선 통근버스",
    busType: "commute",
    exactLocation: "7호선 군자역 5번 출구 앞 (연세무척나은병원 앞)",
    address: "서울 광진구 능동로 297 (군자역 5번 출구 앞 연세무척나은병원 앞)",
    landmarks: "군자역 5번 출구 나와 능동로 방면 직진 50m, 연세무척나은병원 정문 앞 도로변 (빨간 화살표 위치)",
    tip: "잠실노선 통근버스는 사전 모바일 예약 필수 노선입니다. 정시 탑승을 위해 5분 전 미리 대기해 주세요.",
    imageUrl: "/images/boarding/gunja.jpg",
    coords: { lat: 37.556834, lng: 127.079777 },
    kakaoMapUrl: "https://map.kakao.com/link/to/군자역통근탑승장,37.556834,127.079777"
  },
  "건대역": {
    id: "geondae",
    stationName: "건대역",
    aliasNames: ["건대역", "건대입구역", "건대입구역 롯데백화점"],
    routeName: "잠실노선 통근버스",
    busType: "commute",
    exactLocation: "건대입구역 롯데백화점 스타시티 택시정류장 앞",
    address: "서울 광진구 능동로 92 (롯데백화점 스타시티점 앞)",
    landmarks: "건대입구역 5번 출구 나와 롯데백화점 앞 택시 승강장 부근",
    tip: "백화점 앞 택시승강장 부근에서 통근버스가 정차합니다.",
    imageUrl: "/images/boarding/geondae.jpg",
    coords: { lat: 37.538995, lng: 127.071408 },
    kakaoMapUrl: "https://map.kakao.com/link/to/건대역통근탑승장,37.538995,127.071408"
  },
  "잠실역": {
    id: "jamsil",
    stationName: "잠실역",
    aliasNames: ["잠실역", "2호선 잠실역", "잠실역 1번출구", "잠실역 중앙차선"],
    routeName: "잠실노선 통근버스",
    busType: "commute",
    exactLocation: "잠실역 1번 출구 앞 버스 중앙차선 정류장",
    address: "서울 송파구 올림픽로 265 (잠실역 1번 출구)",
    landmarks: "1번 출구 횡단보도 건너 중앙차선 버스정류장 (성남·송파 방면)",
    tip: "중앙차선 성남 방면 정류소에서 탑승합니다. 출근 시간 혼잡에 유의하세요.",
    imageUrl: "/images/boarding/jamsil.jpg",
    coords: { lat: 37.513273, lng: 127.101018 },
    kakaoMapUrl: "https://map.kakao.com/link/to/잠실역통근탑승장,37.513273,127.101018"
  },
  "석촌역": {
    id: "seokchon",
    stationName: "석촌역",
    aliasNames: ["석촌역", "석촌역 1번출구", "석촌역 중앙차선"],
    routeName: "잠실노선 통근버스",
    busType: "commute",
    exactLocation: "석촌역 1번 출구 중앙차선 정류장 앞",
    address: "서울 송파구 송파대로 433 (석촌역 1번 출구)",
    landmarks: "석촌역 1번 출구 앞 중앙차선 버스정류장",
    tip: "중앙차선 성남 방면 부스에서 대기해 주세요.",
    imageUrl: "/images/boarding/seokchon.jpg",
    coords: { lat: 37.505708, lng: 127.107138 },
    kakaoMapUrl: "https://map.kakao.com/link/to/석촌역통근탑승장,37.505708,127.107138"
  },
  "송파역": {
    id: "songpa",
    stationName: "송파역",
    aliasNames: ["송파역", "송파역 1번출구", "송파역 중앙차선"],
    routeName: "잠실노선 통근버스",
    busType: "commute",
    exactLocation: "송파역 1번 출구 중앙차선 정류장 앞",
    address: "서울 송파구 송파대로 366 (송파역 1번 출구)",
    landmarks: "송파역 1번 출구 방면 중앙차선 정류소",
    tip: "중앙차선 버스 승차 위치를 확인하세요.",
    imageUrl: "/images/boarding/songpa.jpg",
    coords: { lat: 37.499657, lng: 127.112603 },
    kakaoMapUrl: "https://map.kakao.com/link/to/송파역통근탑승장,37.499657,127.112603"
  },
  "가락시장역": {
    id: "garakmarket",
    stationName: "가락시장역",
    aliasNames: ["가락시장역", "가락시장역 3번출구", "가락시장역 중앙차선"],
    routeName: "잠실노선 통근버스",
    busType: "commute",
    exactLocation: "가락시장역 3번 출구 중앙차선 정류장 앞",
    address: "서울 송파구 송파대로 257 (가락시장역 3번 출구)",
    landmarks: "3번 출구 앞 중앙차선 버스정류소",
    tip: "3호선/8호선 환승 후 3번 출구 방면 중앙차선으로 이동하세요.",
    imageUrl: "/images/boarding/garakmarket.jpg",
    coords: { lat: 37.492249, lng: 127.117642 },
    kakaoMapUrl: "https://map.kakao.com/link/to/가락시장역통근탑승장,37.492249,127.117642"
  },
  "문정역": {
    id: "munjeong",
    stationName: "문정역",
    aliasNames: ["문정역", "문정역 3번출구", "문정역 중앙차선"],
    routeName: "잠실노선 통근버스",
    busType: "commute",
    exactLocation: "문정역 8호선 3번 출구 버스중앙차선 정류장",
    address: "서울 송파구 송파대로 175 (문정역 3번 출구)",
    landmarks: "문정로데오거리 및 테라타워 방면 중앙차선 승강장",
    tip: "중앙차선 정류장에서 승차합니다.",
    imageUrl: "/images/boarding/munjeong.jpg",
    coords: { lat: 37.486042, lng: 127.122159 },
    kakaoMapUrl: "https://map.kakao.com/link/to/문정역통근탑승장,37.486042,127.122159"
  },
  "장지역": {
    id: "jangji",
    stationName: "장지역",
    aliasNames: ["장지역", "장지역 1번출구", "가든파이브 장지역"],
    routeName: "잠실노선 통근버스",
    busType: "commute",
    exactLocation: "장지역 8호선 1번 출구 버스정류장",
    address: "서울 송파구 송파대로 111 (장지역 1번 출구 가든파이브 앞)",
    landmarks: "가든파이브 라이프동 앞 가변차로 버스정류장",
    tip: "가든파이브 방면 도로변 승강장에서 대기해 주세요.",
    imageUrl: "/images/boarding/jangji.jpg",
    coords: { lat: 37.478785, lng: 127.126432 },
    kakaoMapUrl: "https://map.kakao.com/link/to/장지역통근탑승장,37.478785,127.126432"
  },
  "복정역": {
    id: "bokjeong",
    stationName: "복정역",
    aliasNames: ["복정역", "복정역 1번출구", "복정 환승센터"],
    routeName: "잠실노선 통근버스",
    busType: "commute",
    exactLocation: "복정역 8호선 1번 출구 버스정류장",
    address: "서울 송파구 장지동 (복정역 1번 출구)",
    landmarks: "1번 출구 환승 주차장 및 버스정류소 부근",
    tip: "8호선/수인분당선 환승객 승차가 많은 정류장입니다.",
    imageUrl: "/images/boarding/bokjeong.jpg",
    coords: { lat: 37.471531, lng: 127.127042 },
    kakaoMapUrl: "https://map.kakao.com/link/to/복정역통근탑승장,37.471531,127.127042"
  },
  "모란역": {
    id: "moran",
    stationName: "모란역",
    aliasNames: ["모란역", "모란역 5번출구", "수인분당선 모란역"],
    routeName: "잠실노선 통근버스",
    busType: "commute",
    exactLocation: "모란역 수인분당선 5번 출구 앞",
    address: "경기 성남시 중원구 성남대로 1147 (모란역 5번 출구)",
    landmarks: "5번 출구 나와서 바로 앞 도로변 승강장",
    tip: "모란시장 사거리 부근이며, 5번 출구 바로 앞에서 탑승합니다.",
    imageUrl: "/images/boarding/moran.jpg",
    coords: { lat: 37.431163, lng: 127.128985 },
    kakaoMapUrl: "https://map.kakao.com/link/to/모란역통근탑승장,37.431163,127.128985"
  },

  // ── 신도림 노선 (통근버스) ──
  "신도림역": {
    id: "sindorim",
    stationName: "신도림역",
    aliasNames: ["신도림역", "신도림역 2번출구", "신도림 테크노마트"],
    routeName: "신도림노선 통근버스",
    busType: "commute",
    exactLocation: "신도림역 2호선 2번 출구 테크노마트 앞",
    address: "서울 구로구 새말로 117 (신도림역 2번 출구)",
    landmarks: "테크노마트 정문 앞 버스 승강장 및 환승광장 부근",
    tip: "예약제 노선으로 모바일 예약 탑승권 태깅이 필요합니다.",
    imageUrl: "/images/boarding/sindorim.jpg",
    coords: { lat: 37.507905, lng: 126.891784 },
    kakaoMapUrl: "https://map.kakao.com/link/to/신도림역통근탑승장,37.507905,126.891784"
  },
  "대림역": {
    id: "daerim",
    stationName: "대림역",
    aliasNames: ["대림역", "대림역 1번출구", "2호선 대림역"],
    routeName: "신도림노선 통근버스",
    busType: "commute",
    exactLocation: "대림역 2호선 1번 출구 공항버스 정류장 앞",
    address: "서울 구로구 도림천로 351 (대림역 1번 출구)",
    landmarks: "1번 출구 나와 도림천 방면 공항버스 정류소 부근",
    tip: "공항버스 승강장 표지판 앞 도로변에서 대기해 주세요.",
    imageUrl: "/images/boarding/daerim.jpg",
    coords: { lat: 37.492321, lng: 126.894860 },
    kakaoMapUrl: "https://map.kakao.com/link/to/대림역통근탑승장,37.492321,126.894860"
  },
  "사당역": {
    id: "sadang",
    stationName: "사당역",
    aliasNames: ["사당역", "사당역 14번출구", "2호선 사당역"],
    routeName: "신도림노선 통근버스",
    busType: "commute",
    exactLocation: "사당역 2호선 14번 출구 앞 택시정류장 부근",
    address: "서울 서초구 방배천로 11 (사당역 14번 출구 앞)",
    landmarks: "14번 출구 나와서 에스컬레이터 뒤편 택시정류장 라인",
    tip: "사당역 사거리 과천 방면 차량 통행이 많으니 안전에 주의해 주세요.",
    imageUrl: "/images/boarding/sadang.jpg",
    coords: { lat: 37.476743, lng: 126.982431 },
    kakaoMapUrl: "https://map.kakao.com/link/to/사당역통근탑승장,37.476743,126.982431"
  },

  // ── 강남 노선 (통근버스) ──
  "논현역": {
    id: "nonhyeon",
    stationName: "논현역",
    aliasNames: ["논현역", "논현역 6번출구", "7호선 논현역"],
    routeName: "강남노선 통근버스",
    busType: "commute",
    exactLocation: "논현역 7호선 6번 출구 앞",
    address: "서울 서초구 강남대로 545 (논현역 6번 출구)",
    landmarks: "6번 출구 나와서 직진 20m 앞 도로변",
    tip: "강남노선 첫 출발 지점입니다.",
    imageUrl: "/images/boarding/nonhyeon.jpg",
    coords: { lat: 37.510872, lng: 127.021060 },
    kakaoMapUrl: "https://map.kakao.com/link/to/논현역통근탑승장,37.510872,127.021060"
  },
  "신논현역": {
    id: "sinnonhyeon",
    stationName: "신논현역",
    aliasNames: ["신논현역", "신논현역 7번출구", "신논현역 중앙차선"],
    routeName: "강남노선 통근버스",
    busType: "commute",
    exactLocation: "신논현역 신분당선 7번 출구 버스중앙차선 정류장",
    address: "서울 서초구 강남대로 479 (신논현역 7번 출구 앞)",
    landmarks: "교보타워 앞 중앙차선 버스승강장",
    tip: "중앙차선 양재·판교 방면 승강장에서 탑승합니다.",
    imageUrl: "/images/boarding/sinnonhyeon.jpg",
    coords: { lat: 37.503312, lng: 127.024768 },
    kakaoMapUrl: "https://map.kakao.com/link/to/신논현역통근탑승장,37.503312,127.024768"
  },
  "강남역": {
    id: "gangnam",
    stationName: "강남역",
    aliasNames: ["강남역", "강남역 5번출구", "신분당선 강남역"],
    routeName: "강남노선 통근버스",
    busType: "commute",
    exactLocation: "강남역 신분당선 5번 출구 앞",
    address: "서울 서초구 강남대로 369 (강남역 5번 출구)",
    landmarks: "5번 출구 나와서 우측 도로변 승강장 부근",
    tip: "강남역 사거리 남측 서초 방면 승강장입니다.",
    imageUrl: "/images/boarding/gangnam.jpg",
    coords: { lat: 37.495283, lng: 127.028599 },
    kakaoMapUrl: "https://map.kakao.com/link/to/강남역통근탑승장,37.495283,127.028599"
  },
  "양재역": {
    id: "yangjae",
    stationName: "양재역",
    aliasNames: ["양재역", "양재역 1번출구", "3호선 양재역"],
    routeName: "강남노선 통근버스",
    busType: "commute",
    exactLocation: "양재역 3호선 1번 출구 서초IC 방면 도로변",
    address: "서울 서초구 남부순환로 2585 (양재역 1번 출구)",
    landmarks: "1번 출구 나와 서초IC 경부고속도로 진입 방향 도로변",
    tip: "고속도로 직전 정류장으로 정시 발차하므로 시간 준수 필수입니다.",
    imageUrl: "/images/boarding/yangjae.jpg",
    coords: { lat: 37.484731, lng: 127.033332 },
    kakaoMapUrl: "https://map.kakao.com/link/to/양재역통근탑승장,37.484731,127.033332"
  },

  // ── 안양 노선 (통근버스) ──
  "광명역": {
    id: "gwangmyeong",
    stationName: "광명역",
    aliasNames: ["광명역", "KTX 광명역", "광명역 1번출구"],
    routeName: "안양노선 통근버스",
    busType: "commute",
    exactLocation: "KTX 광명역 1번 출구 앞 버스정류장",
    address: "경기 광명시 광명역로 21 (KTX 광명역 동편 1번 출구)",
    landmarks: "동편 버스 환승 승강장 1번 홈",
    tip: "KTX 이용 후 환승하기에 최적화되어 있습니다.",
    imageUrl: "/images/boarding/gwangmyeong.jpg",
    coords: { lat: 37.417689, lng: 126.884549 },
    kakaoMapUrl: "https://map.kakao.com/link/to/광명역통근탑승장,37.417689,126.884549"
  },
  "안양역": {
    id: "anyang",
    stationName: "안양역",
    aliasNames: ["안양역", "안양역 1번출구", "1호선 안양역"],
    routeName: "안양노선 통근버스",
    busType: "commute",
    exactLocation: "안양역 1호선 1번 출구 앞",
    address: "경기 안양시 만안구 만안로 232 (안양역 1번 출구)",
    landmarks: "엔터식스 쇼핑몰 정문 앞 버스 승강장",
    tip: "역 앞 광장 도로변 승강장에서 대기해 주세요.",
    imageUrl: "/images/boarding/anyang.jpg",
    coords: { lat: 37.401259, lng: 126.922635 },
    kakaoMapUrl: "https://map.kakao.com/link/to/안양역통근탑승장,37.401259,126.922635"
  },
  "범계역": {
    id: "beomgye",
    stationName: "범계역",
    aliasNames: ["범계역", "범계역 롯데백화점", "평촌 롯데백화점"],
    routeName: "안양노선 통근버스",
    busType: "commute",
    exactLocation: "범계역 롯데백화점 평촌점 앞 시외버스정류장",
    address: "경기 안양시 동안구 시민대로 180 (롯데백화점 평촌점 앞)",
    landmarks: "백화점 정문 앞 시외·공항버스 정류소 부근",
    tip: "시외버스 정류소 부근에서 대기해 주세요.",
    imageUrl: "/images/boarding/beomgye.jpg",
    coords: { lat: 37.390222, lng: 126.950466 },
    kakaoMapUrl: "https://map.kakao.com/link/to/범계역통근탑승장,37.390222,126.950466"
  },
  "인덕원역": {
    id: "indeogwon",
    stationName: "인덕원역",
    aliasNames: ["인덕원역", "인덕원역 3번출구", "4호선 인덕원역"],
    routeName: "안양노선 통근버스",
    busType: "commute",
    exactLocation: "인덕원역 4호선 3번 출구 버스정류장",
    address: "경기 안양시 동안구 관악대로 483 (인덕원역 3번 출구)",
    landmarks: "3번 출구 나와 직진 30m 판교 방면 시내버스 정류장",
    tip: "판교 방면 도로변 승강장에서 승차합니다.",
    imageUrl: "/images/boarding/indeogwon.jpg",
    coords: { lat: 37.401092, lng: 126.977141 },
    kakaoMapUrl: "https://map.kakao.com/link/to/인덕원역통근탑승장,37.401092,126.977141"
  },

  // ── 오산 노선 (통근버스) ──
  "오산 교촌 본사": {
    id: "osan-kyochon",
    stationName: "오산 교촌 본사",
    aliasNames: ["오산 교촌 본사", "교촌본사", "원동 교촌"],
    routeName: "오산노선 통근버스",
    busType: "commute",
    exactLocation: "오산 교촌에프앤비 본사 앞",
    address: "경기 오산시 원동 391-4 (교촌에프앤비 본사 앞)",
    landmarks: "교촌에프앤비 사옥 정문 앞 도로변",
    tip: "오산 노선 출발 지점입니다.",
    imageUrl: "/images/boarding/osan-kyochon.jpg",
    coords: { lat: 37.138555, lng: 127.073592 },
    kakaoMapUrl: "https://map.kakao.com/link/to/오산교촌본사통근탑승장,37.138555,127.073592"
  },
  "사계절 꽃농원": {
    id: "osan-flower",
    stationName: "사계절 꽃농원",
    aliasNames: ["사계절 꽃농원", "사계절꽃농원"],
    routeName: "오산노선 통근버스",
    busType: "commute",
    exactLocation: "사계절꽃농원 앞 버스 승강장",
    address: "경기 오산시 오산동 193-2",
    landmarks: "사계절꽃농원 입구 도로변",
    tip: "도로변 정류장 표지 부근에서 대기해 주세요.",
    imageUrl: "/images/boarding/osan-flower.jpg",
    coords: { lat: 37.148711, lng: 127.082811 },
    kakaoMapUrl: "https://map.kakao.com/link/to/사계절꽃농원통근탑승장,37.148711,127.082811"
  },
  "오산시청": {
    id: "osan-cityhall",
    stationName: "오산시청",
    aliasNames: ["오산시청", "오산시청 정문"],
    routeName: "오산노선 통근버스",
    busType: "commute",
    exactLocation: "오산시청 정문 앞 버스 승강장",
    address: "경기 오산시 성호대로 141 (오산시청 정문 앞)",
    landmarks: "오산시청 정문 앞 시내버스 정류소 부근",
    tip: "시청 정문 앞 버스 승강장에서 탑승합니다.",
    imageUrl: "/images/boarding/osan-cityhall.jpg",
    coords: { lat: 37.149877, lng: 127.077524 },
    kakaoMapUrl: "https://map.kakao.com/link/to/오산시청통근탑승장,37.149877,127.077524"
  },
  "오산대역 후문": {
    id: "osandae",
    stationName: "오산대역 후문",
    aliasNames: ["오산대역 후문", "오산대역 2번출구", "1호선 오산대역"],
    routeName: "오산노선 통근버스",
    busType: "commute",
    exactLocation: "오산대역 1호선 2번 출구 버스정류장",
    address: "경기 오산시 수청동 (오산대역 2번 출구 후문 앞)",
    landmarks: "2번 출구 앞 버스 베이 승강장",
    tip: "오산대역 2번 출구 후문 방면입니다.",
    imageUrl: "/images/boarding/osandae.jpg",
    coords: { lat: 37.169394, lng: 127.062682 },
    kakaoMapUrl: "https://map.kakao.com/link/to/오산대역통근탑승장,37.169394,127.062682"
  },
  "UN군초전기념관": {
    id: "un-memorial",
    stationName: "UN군초전기념관",
    aliasNames: ["UN군초전기념관", "유엔군초전기념관"],
    routeName: "오산노선 통근버스",
    busType: "commute",
    exactLocation: "유엔군초전기념관 앞 버스정류장",
    address: "경기 오산시 경기대로 742 (기념관 정문 앞)",
    landmarks: "기념관 주차장 진입로 인근 시내버스 쉘터",
    tip: "수원·판교 방면 도로변 승강장입니다.",
    imageUrl: "/images/boarding/un-memorial.jpg",
    coords: { lat: 37.184495, lng: 127.049299 },
    kakaoMapUrl: "https://map.kakao.com/link/to/UN군초전기념관통근탑승장,37.184495,127.049299"
  },

  // ── 동탄 노선 (통근버스) ──
  "금호어울림": {
    id: "dongtan-kumho",
    stationName: "금호어울림",
    aliasNames: ["금호어울림", "금호어울림·계룡리슈빌", "금호어울림레이크"],
    routeName: "동탄노선 통근버스",
    busType: "commute",
    exactLocation: "금호어울림·계룡리슈빌 버스정류장",
    address: "경기 화성시 동탄순환대로20길 124",
    landmarks: "금호어울림레이크 아파트 정문 앞 버스 승강장",
    tip: "동탄노선 기점입니다. 5분 전 대기 바랍니다.",
    imageUrl: "/images/boarding/dongtan-kumho.jpg",
    coords: { lat: 37.182703, lng: 127.124714 },
    kakaoMapUrl: "https://map.kakao.com/link/to/금호어울림통근탑승장,37.182703,127.124714"
  },
  "한신더휴": {
    id: "dongtan-hanshin",
    stationName: "한신더휴",
    aliasNames: ["한신더휴", "동탄 한신더휴"],
    routeName: "동탄노선 통근버스",
    busType: "commute",
    exactLocation: "한신더휴 버스정류장",
    address: "경기 화성시 동탄순환대로20길 70",
    landmarks: "한신더휴 아파트 단지 앞 버스 쉘터",
    tip: "도로변 버스 쉘터에서 승차합니다.",
    imageUrl: "/images/boarding/dongtan-hanshin.jpg",
    coords: { lat: 37.186575, lng: 127.125650 },
    kakaoMapUrl: "https://map.kakao.com/link/to/한신더휴통근탑승장,37.186575,127.125650"
  },
  "신안2차,반도4차": {
    id: "dongtan-sinan",
    stationName: "신안2차,반도4차",
    aliasNames: ["신안2차,반도4차", "신안2차·반도4차", "신안인스빌"],
    routeName: "동탄노선 통근버스",
    busType: "commute",
    exactLocation: "신안2차·반도4차 버스정류장",
    address: "경기 화성시 동탄청계로 303-13",
    landmarks: "카림애비뉴 상가 및 아파트 사거리 버스 승강장",
    tip: "동탄 순환 정류소에서 탑승합니다.",
    imageUrl: "/images/boarding/dongtan-sinan.jpg",
    coords: { lat: 37.199904, lng: 127.116830 },
    kakaoMapUrl: "https://map.kakao.com/link/to/신안2차반도4차통근탑승장,37.199904,127.116830"
  },
  "이주택지": {
    id: "dongtan-ijutaekji",
    stationName: "이주택지",
    aliasNames: ["이주택지", "이주택지·상록·경남아파트"],
    routeName: "동탄노선 통근버스",
    busType: "commute",
    exactLocation: "이주택지·상록·경남아파트 버스정류장",
    address: "경기 화성시 영천동 723",
    landmarks: "상록아파트 단지 앞 버스 승강장",
    tip: "도로변 버스 쉘터에서 대기해 주세요.",
    imageUrl: "/images/boarding/dongtan-ijutaekji.jpg",
    coords: { lat: 37.206661, lng: 127.123837 },
    kakaoMapUrl: "https://map.kakao.com/link/to/이주택지통근탑승장,37.206661,127.123837"
  },
  "대방디엠시티": {
    id: "dongtan-daebang",
    stationName: "대방디엠시티",
    aliasNames: ["대방디엠시티", "대방디엠시티·센트럴상록"],
    routeName: "동탄노선 통근버스",
    busType: "commute",
    exactLocation: "대방디엠시티·센트럴상록 버스정류장",
    address: "경기 화성시 동탄대로 636-14",
    landmarks: "대방디엠시티 주상복합 앞 버스정류장",
    tip: "출근 시에만 정차하며, 퇴근 시에는 미정차하므로 유의하세요.",
    imageUrl: "/images/boarding/dongtan-daebang.jpg",
    coords: { lat: 37.210272, lng: 127.099442 },
    kakaoMapUrl: "https://map.kakao.com/link/to/대방디엠시티통근탑승장,37.210272,127.099442"
  },
  "한미약품": {
    id: "dongtan-hanmi",
    stationName: "한미약품",
    aliasNames: ["한미약품", "한미약품·푸르지오", "한미약품 연구센터"],
    routeName: "동탄노선 통근버스",
    busType: "commute",
    exactLocation: "한미약품·푸르지오 버스정류장",
    address: "경기 화성시 동탄기흥로 550",
    landmarks: "한미약품 연구센터 및 푸르지오 아파트 앞",
    tip: "동탄 테크노밸리 주요 정차역입니다.",
    imageUrl: "/images/boarding/dongtan-hanmi.jpg",
    coords: { lat: 37.209629, lng: 127.094633 },
    kakaoMapUrl: "https://map.kakao.com/link/to/한미약품통근탑승장,37.209629,127.094633"
  },
  "예당고사거리": {
    id: "dongtan-yedang",
    stationName: "예당고사거리",
    aliasNames: ["예당고사거리", "예당고"],
    routeName: "동탄노선 통근버스",
    busType: "commute",
    exactLocation: "예당고사거리 버스정류장",
    address: "경기 화성시 석우동 60",
    landmarks: "예당고등학교 사거리 판교 방면 도로변",
    tip: "기흥동탄IC 고속도로 진입 전 마지막 승차 정류장입니다.",
    imageUrl: "/images/boarding/dongtan-yedang.jpg",
    coords: { lat: 37.206951, lng: 127.078460 },
    kakaoMapUrl: "https://map.kakao.com/link/to/예당고사거리통근탑승장,37.206951,127.078460"
  },

  // ── 사옥 (퇴근 시 승차 및 출근 시 하차) ──
  "사옥": {
    id: "hq-infinity",
    stationName: "사옥 (인피니티타워)",
    aliasNames: ["사옥", "도착(사옥)", "슈어소프트테크", "판교캠퍼스", "인피니티타워"],
    routeName: "전 노선 셔틀·통근",
    busType: "shuttle",
    exactLocation: "경기 성남시 수정구 금토로80번길 37 인피니티타워 E동 정문 앞 셔틀/통근 승차장",
    address: "경기 성남시 수정구 금토로80번길 37 인피니티타워 E동",
    landmarks: "인피니티타워 E동 로비 1층 정문 앞 도로변 셔틀 승강장",
    tip: "퇴근 시 판교/야탑 셔틀 및 각 권역 통근버스가 정문 앞 승강장에 순서대로 정차합니다.",
    imageUrl: "/images/boarding/hq-infinity.jpg",
    coords: { lat: 37.406981, lng: 127.088711 },
    kakaoMapUrl: "https://map.kakao.com/link/to/슈어소프트인피니티타워,37.406981,127.088711"
  }
};

/**
 * 정류장 명칭 및 노선 명칭으로 탑승 위치 정보 검색
 */
export function findBoardingLocation(stopName: string, routeName?: string): BoardingLocationInfo | null {
  if (!stopName && !routeName) return null;

  const raw = `${stopName || ''} ${routeName || ''}`.trim();
  // 특수문자 및 불필요한 단어 정리
  const clean = (stopName || '').replace(/[\(\)\[\]→➔]/g, ' ').trim();

  // 1. 완전 일치 검색
  if (SHUTTLE_BOARDING_LOCATIONS[clean]) {
    return SHUTTLE_BOARDING_LOCATIONS[clean];
  }

  // 2. 키워드 및 alias 검색
  for (const info of Object.values(SHUTTLE_BOARDING_LOCATIONS)) {
    if (info.aliasNames.some(alias => clean.includes(alias) || alias.includes(clean) || raw.includes(alias))) {
      return info;
    }
  }

  // 3. 주요 키워드 기반 매칭 (예: '판교역 1번출구 북문' -> '판교역')
  const majorKeys = [
    '판교역', '성남역', '이매역', '이매촌한신', '야탑역', '삼평교', '판교2밸리',
    '군자역', '건대역', '잠실역', '석촌역', '송파역', '가락시장역', '문정역', '장지역', '복정역', '모란역',
    '신도림역', '대림역', '사당역', '논현역', '신논현역', '강남역', '양재역',
    '광명역', '안양역', '범계역', '인덕원역',
    '오산 교촌 본사', '오산시청', '오산대역 후문', '사계절 꽃농원', 'UN군초전기념관',
    '금호어울림', '한신더휴', '신안2차,반도4차', '이주택지', '대방디엠시티', '한미약품', '예당고사거리',
    '사옥'
  ];

  for (const key of majorKeys) {
    if (raw.includes(key) || clean.includes(key) || (key.length > 2 && clean.includes(key.replace('역', '')))) {
      return SHUTTLE_BOARDING_LOCATIONS[key] || null;
    }
  }

  // 4. 노선명 기반 fallback 매칭
  if (routeName) {
    if (routeName.includes('판교셔틀')) return SHUTTLE_BOARDING_LOCATIONS['판교역'];
    if (routeName.includes('야탑셔틀')) return SHUTTLE_BOARDING_LOCATIONS['야탑역'];
    if (routeName.includes('잠실')) return SHUTTLE_BOARDING_LOCATIONS['군자역'] || SHUTTLE_BOARDING_LOCATIONS['잠실역'];
    if (routeName.includes('신도림')) return SHUTTLE_BOARDING_LOCATIONS['신도림역'];
    if (routeName.includes('강남')) return SHUTTLE_BOARDING_LOCATIONS['강남역'] || SHUTTLE_BOARDING_LOCATIONS['양재역'];
    if (routeName.includes('안양')) return SHUTTLE_BOARDING_LOCATIONS['안양역'] || SHUTTLE_BOARDING_LOCATIONS['인덕원역'];
    if (routeName.includes('오산')) return SHUTTLE_BOARDING_LOCATIONS['오산시청'] || SHUTTLE_BOARDING_LOCATIONS['오산 교촌 본사'];
    if (routeName.includes('동탄')) return SHUTTLE_BOARDING_LOCATIONS['금호어울림'] || SHUTTLE_BOARDING_LOCATIONS['한미약품'];
  }

  // 5. STATION_COORDS에 등록되어 있는 경우 즉석 fallback 생성
  const coord = STATION_COORDS[clean];
  if (coord) {
    return {
      id: `custom-${clean}`,
      stationName: clean,
      aliasNames: [clean],
      routeName: routeName || '통근/셔틀 노선',
      busType: 'shuttle',
      exactLocation: coord.address,
      address: coord.address,
      landmarks: `${clean} 탑승 정류소`,
      tip: "출발 5분 전 미리 정류소에 대기해 주세요.",
      imageUrl: `/images/boarding/${encodeURIComponent(clean)}.jpg`,
      coords: { lat: coord.lat, lng: coord.lng },
      kakaoMapUrl: `https://map.kakao.com/link/to/${encodeURIComponent(clean)},${coord.lat},${coord.lng}`
    };
  }

  return null;
}

/**
 * 특정 RouteStepItem이 셔틀 또는 통근버스 탑승 단계인지 확인하고 탑승지 정보 반환
 */
export function getStepBoardingLocation(step: RouteStepItem, routeName?: string): BoardingLocationInfo | null {
  if (step.type !== 'shuttle' && step.type !== 'commute_bus') {
    return null;
  }

  // 정류장 이름 후보 추출
  let rawStopName = step.boardingStopName || step.detailLocation || '';

  if (!rawStopName && step.subtitle) {
    // 화살표(→, ➔) 및 괄호 앞부분 추출
    const beforeArrow = step.subtitle.split(/[➔→]/)[0] || '';
    rawStopName = beforeArrow.split('(')[0].replace(/(승차|탑승|이동|통근버스 정류소|셔틀)/g, '').trim();
  }

  if (!rawStopName && step.title) {
    const beforeArrow = step.title.split(/[➔→]/)[0] || '';
    rawStopName = beforeArrow.split('(')[0].replace(/(승차|탑승|이동|통근버스 정류소|셔틀)/g, '').trim();
  }

  const found = findBoardingLocation(rawStopName, routeName || step.title);
  if (found) return found;

  // step.type이 셔틀 또는 통근인데 못 찾은 경우 노선명/스텝 타이틀로 강력 Fallback
  const isShuttle = step.type === 'shuttle';
  const fallbackKey = isShuttle
    ? ((step.title + (routeName || '')).includes('야탑') ? '야탑역' : '판교역')
    : '군자역';

  return SHUTTLE_BOARDING_LOCATIONS[fallbackKey] || SHUTTLE_BOARDING_LOCATIONS['판교역'];
}

/**
 * 경로(RouteCandidate)에 셔틀이나 통근버스가 포함되어 있는지 검사하고
 * 포함된 모든 탑승지 정보를 배열로 반환
 */
export function getCandidateBoardingLocations(candidate: RouteCandidate): BoardingLocationInfo[] {
  const result: BoardingLocationInfo[] = [];
  const seenIds = new Set<string>();

  // 1. steps에서 직접 추출
  for (const step of candidate.steps) {
    if (step.type === 'shuttle' || step.type === 'commute_bus') {
      const info = getStepBoardingLocation(step, candidate.routeName);
      if (info && !seenIds.has(info.id)) {
        seenIds.add(info.id);
        result.push(info);
      }
    }
  }

  // 2. routeCategory가 사내 셔틀/통근이거나 routeName에 셔틀/통근 키워드가 있는 경우 보완
  const isCompanyRoute = 
    candidate.routeCategory === 'company_only' || 
    candidate.routeCategory === 'transit_hybrid' ||
    candidate.routeName.includes('셔틀') ||
    candidate.routeName.includes('통근') ||
    candidate.title.includes('셔틀') ||
    candidate.title.includes('통근');

  if (result.length === 0 && isCompanyRoute) {
    // candidate.subtitle 및 title에서 정류장 키워드 검색
    const combined = `${candidate.title} ${candidate.subtitle} ${candidate.routeName}`;
    const fallbackInfo = findBoardingLocation(combined, candidate.routeName);
    if (fallbackInfo && !seenIds.has(fallbackInfo.id)) {
      seenIds.add(fallbackInfo.id);
      result.push(fallbackInfo);
    } else {
      // 기본 판교역 셔틀 탑승지라도 제공
      result.push(SHUTTLE_BOARDING_LOCATIONS['판교역']);
    }
  }

  return result;
}

