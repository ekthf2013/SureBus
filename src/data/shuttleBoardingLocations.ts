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
    aliasNames: ["건대역", "건대입구역", "건대입구역 롯데백화점", "건대입구역 스타시티"],
    routeName: "잠실노선 통근버스",
    busType: "commute",
    exactLocation: "건대입구역 롯데백화점·교보문고 앞 택시정류장",
    address: "서울 광진구 능동로 92 (롯데백화점 스타시티점 앞)",
    landmarks: "건대입구역 5번 출구 나와 능동로 스타시티 롯데백화점(교보문고 정문 앞) 택시승강장 (빨간 화살표 위치)",
    tip: "롯데백화점 교보문고 정문 앞 도로변 택시승강장 부근에서 통근버스가 정차합니다.",
    imageUrl: "/images/boarding/geondae.jpg",
    coords: { lat: 37.538995, lng: 127.071408 },
    kakaoMapUrl: "https://map.kakao.com/link/to/건대역통근탑승장,37.538995,127.071408"
  },
  "잠실역": {
    id: "jamsil",
    stationName: "잠실역",
    aliasNames: ["잠실역", "2호선 잠실역", "잠실역 1번출구", "잠실역 6번출구", "잠실역 중앙차선"],
    routeName: "잠실노선 통근버스",
    busType: "commute",
    exactLocation: "잠실역 6번 출구 앞 버스 중앙차선 정류장",
    address: "서울 송파구 송파대로 (잠실역 6번 출구 앞 중앙차선)",
    landmarks: "잠실역 6번 출구 앞 송파대로 중앙차선 버스정류장 (롯데백화점 잠실점 건너편 버스 쉘터, 빨간 화살표 위치)",
    tip: "송파·성남·사옥 방면 중앙차선 버스 쉘터에서 대기해 주세요. 출근 시간 혼잡하므로 5분 전 도착을 권장합니다.",
    imageUrl: "/images/boarding/jamsil.jpg",
    coords: { lat: 37.513273, lng: 127.101018 },
    kakaoMapUrl: "https://map.kakao.com/link/to/잠실역통근탑승장,37.513273,127.101018"
  },
  "석촌역": {
    id: "seokchon",
    stationName: "석촌역",
    aliasNames: ["석촌역", "석촌역 1번출구", "석촌역 6번출구", "석촌역 중앙차선"],
    routeName: "잠실노선 통근버스",
    busType: "commute",
    exactLocation: "석촌역 중앙차선 버스정류장 (성남·사옥 방면)",
    address: "서울 송파구 송파대로 (석촌역 6번·7번 출구 방면 중앙차선)",
    landmarks: "석촌역 6번·7번 출구 나와 송파대로 중앙차선 버스 쉘터 (빨간 화살표 위치)",
    tip: "성남·판교 방면 중앙차선 승강장에서 대기해 주세요.",
    imageUrl: "/images/boarding/seokchon.jpg",
    coords: { lat: 37.505708, lng: 127.107138 },
    kakaoMapUrl: "https://map.kakao.com/link/to/석촌역통근탑승장,37.505708,127.107138"
  },
  "송파역": {
    id: "songpa",
    stationName: "송파역",
    aliasNames: ["송파역", "송파역 1번출구", "송파역 2번출구", "송파역 중앙차선"],
    routeName: "잠실노선 통근버스",
    busType: "commute",
    exactLocation: "송파역 중앙차선 버스정류장 (성남·사옥 방면)",
    address: "서울 송파구 송파대로 (송파역 1번·2번 출구 북측 중앙차선)",
    landmarks: "송파역 1번·2번 출구 북측 송파대로 중앙차선 버스 쉘터 (빨간 화살표 위치)",
    tip: "성남 방면 중앙차선 버스 쉘터에서 탑승합니다.",
    imageUrl: "/images/boarding/songpa.jpg",
    coords: { lat: 37.499657, lng: 127.112603 },
    kakaoMapUrl: "https://map.kakao.com/link/to/송파역통근탑승장,37.499657,127.112603"
  },
  "가락시장역": {
    id: "garakmarket",
    stationName: "가락시장역",
    aliasNames: ["가락시장역", "가락시장역 3번출구", "가락시장역 2번출구", "가락시장역 2-1번출구", "가락시장역 중앙차선", "가락몰"],
    routeName: "잠실노선 통근버스",
    busType: "commute",
    exactLocation: "가락시장역 송파대로 중앙차선 버스정류장 (가락몰 앞)",
    address: "서울 송파구 송파대로 257 (가락시장역 가락몰 앞 중앙차선 버스 쉘터)",
    landmarks: "가락시장역 2-1번·3번 출구 나와 송파대로 중앙차선 버스 쉘터 (가락몰 전문식당가 앞, 빨간 화살표 위치)",
    tip: "3호선/8호선 가락시장역 환승 후 가락몰 방면 송파대로 중앙차선 버스 쉘터에서 탑승합니다.",
    imageUrl: "/images/boarding/garakmarket.jpg",
    coords: { lat: 37.492249, lng: 127.117642 },
    kakaoMapUrl: "https://map.kakao.com/link/to/가락시장역통근탑승장,37.492249,127.117642"
  },
  "문정역": {
    id: "munjeong",
    stationName: "문정역",
    aliasNames: ["문정역", "문정역 2번출구", "문정역 3번출구", "문정역 중앙차선", "문정오피스텔"],
    routeName: "잠실노선 통근버스",
    busType: "commute",
    exactLocation: "문정역 2번·3번 출구 남측 송파대로 중앙차선 버스정류장 (문정오피스텔 앞)",
    address: "서울 송파구 송파대로 175 (문정역 중앙차선 승강장)",
    landmarks: "문정역 2번·3번 출구 남측 송파대로 중앙차선 버스 쉘터 (문정오피스텔 / 송파법조타운 푸르지오시티 앞, 빨간 화살표 위치)",
    tip: "송파대로 중앙차선 버스 쉘터에서 탑승합니다. 정시 발차하므로 5분 전 미리 대기해 주세요.",
    imageUrl: "/images/boarding/munjeong.jpg",
    coords: { lat: 37.486042, lng: 127.122159 },
    kakaoMapUrl: "https://map.kakao.com/link/to/문정역통근탑승장,37.486042,127.122159"
  },
  "장지역": {
    id: "jangji",
    stationName: "장지역",
    aliasNames: ["장지역", "장지역 1번출구", "장지역 4번출구", "가든파이브 장지역", "가든파이브라이프", "가든파이브 영관"],
    routeName: "잠실노선 통근버스",
    busType: "commute",
    exactLocation: "장지역 1번·4번 출구 남측 가든파이브 앞 가변차로(도로변) 버스정류장",
    address: "서울 송파구 충민로 66 (가든파이브라이프 영관 앞 도로변 버스정류소)",
    landmarks: "장지역 1번·4번 출구 나와 가든파이브 라이프동·영관 앞 도로변 버스정류소 쉘터 (빨간 화살표 위치)",
    tip: "중앙차선이 아닌 가든파이브 쪽 가변차로(도로변) 버스정류장에서 탑승하므로 주의해 주세요.",
    imageUrl: "/images/boarding/jangji.jpg",
    coords: { lat: 37.478785, lng: 127.126432 },
    kakaoMapUrl: "https://map.kakao.com/link/to/장지역통근탑승장,37.478785,127.126432"
  },
  "복정역": {
    id: "bokjeong",
    stationName: "복정역",
    aliasNames: ["복정역", "복정역 1번출구", "복정역 2번출구", "복정역 1-1번출구", "복정 환승센터", "복정역 환승주차장"],
    routeName: "잠실노선 통근버스",
    busType: "commute",
    exactLocation: "복정역 2번·1-1번 출구 남서쪽 환승주차장 옆 도로변 버스정류장",
    address: "서울 송파구 장지동 597 (복정역 환승주차장 앞 도로변)",
    landmarks: "복정역 2번 및 1-1번 출구 나와 복정역 환승주차장 옆 도로변 버스정류소 쉘터 (빨간 화살표 위치)",
    tip: "8호선/수인분당선 복정역 환승주차장 옆 도로변 버스정류소에서 탑승합니다.",
    imageUrl: "/images/boarding/bokjeong.jpg",
    coords: { lat: 37.471531, lng: 127.127042 },
    kakaoMapUrl: "https://map.kakao.com/link/to/복정역통근탑승장,37.471531,127.127042"
  },
  "모란역": {
    id: "moran",
    stationName: "모란역",
    aliasNames: ["모란역", "모란역 9번출구", "모란역 5번출구", "모란역 삼성스토어", "모란역 스타벅스", "수인분당선 모란역"],
    routeName: "잠실노선 통근버스",
    busType: "commute",
    exactLocation: "모란역 9번 출구 서쪽 삼성스토어 모란점 앞 도로변 버스 승강장",
    address: "경기 성남시 중원구 성남대로 1149 (삼성스토어 모란점 앞 도로변)",
    landmarks: "모란역 9번 출구 나와 서쪽 도보 직진, 삼성스토어 모란점 / 스타벅스 건물 앞 도로변 버스 승강장 (빨간 화살표 위치)",
    tip: "9번 출구 나와 삼성스토어 앞 도로변 승강장에서 통근버스가 정차합니다. 5분 전 미리 대기해 주세요.",
    imageUrl: "/images/boarding/moran.jpg",
    coords: { lat: 37.431163, lng: 127.128985 },
    kakaoMapUrl: "https://map.kakao.com/link/to/모란역통근탑승장,37.431163,127.128985"
  },

  // ── 신도림 노선 (통근버스) ──
  "신도림역": {
    id: "sindorim",
    stationName: "신도림역",
    aliasNames: ["신도림역", "신도림역 2번출구", "신도림역 3번출구", "신도림 테크노마트", "신도림역 테크노마트", "테크노마트 신도림점"],
    routeName: "신도림노선 통근버스",
    busType: "commute",
    exactLocation: "신도림역 테크노마트 정문 광장 앞 새말로 도로변",
    address: "서울 구로구 새말로 97 (신도림역 테크노마트 정문 광장 앞 도로변)",
    landmarks: "신도림역 2번·3번 출구 나와 테크노근린공원 지나 테크노마트 정문 광장 앞 새말로 도로변 (빨간 화살표 위치)",
    tip: "테크노마트 정문 광장 앞 도로변에서 통근버스가 정차합니다. 사전 모바일 예약 필수 노선이므로 5분 전 미리 대기해 주세요.",
    imageUrl: "/images/boarding/sindorim.jpg",
    coords: { lat: 37.507905, lng: 126.891784 },
    kakaoMapUrl: "https://map.kakao.com/link/to/신도림역통근탑승장,37.507905,126.891784"
  },
  "대림역": {
    id: "daerim",
    stationName: "대림역",
    aliasNames: ["대림역", "대림역 4번출구", "대림역 3번출구", "대림역 1번출구", "2호선 대림역", "7호선 대림역", "대림역 서울교통공사"],
    routeName: "신도림노선 통근버스",
    busType: "commute",
    exactLocation: "대림역 4번 출구 도림천로 서울교통공사·스마트도서관 앞 도로변 버스정류장",
    address: "서울 구로구 도림천로 351 (대림역 4번 출구 서울교통공사 별관 앞)",
    landmarks: "대림역 4번 출구 나와 도림천로 방향, 서울교통공사 별관 및 스마트도서관 앞 도로변 버스 승강장 (빨간 화살표 위치)",
    tip: "서울교통공사 별관 앞 도로변 버스 승강장에서 탑승합니다. 정시 발차하므로 3분 전 미리 대기해 주세요.",
    imageUrl: "/images/boarding/daerim.jpg",
    coords: { lat: 37.492321, lng: 126.894860 },
    kakaoMapUrl: "https://map.kakao.com/link/to/대림역통근탑승장,37.492321,126.894860"
  },
  "사당역": {
    id: "sadang",
    stationName: "사당역",
    aliasNames: ["사당역", "사당역 6번출구", "사당역 네스코 N타워", "사당역 네스코타워", "사당 네스코 N타워", "사당 웅진약국", "사당역 14번출구", "2호선 사당역", "4호선 사당역"],
    routeName: "신도림노선 통근버스",
    busType: "commute",
    exactLocation: "사당역 6번 출구 서측 웅진약국·네스코 N타워 앞 도로변 버스정류장",
    address: "서울 관악구 남부순환로 2060 (네스코 N타워 / 웅진약국 앞)",
    landmarks: "사당역 6번 출구 나와 남부순환로 서쪽 방면 직진 150m, 르메이에르 1층 웅진약국·네스코 N타워 앞 버스 쉘터 (빨간 화살표 위치)",
    tip: "사당역 14번 출구가 아닌 6번 출구 방면 웅진약국/네스코 N타워 앞 버스 쉘터에서 탑승합니다. 혼잡 지역이므로 5분 전 미리 대기해 주세요.",
    imageUrl: "/images/boarding/sadang.jpg",
    coords: { lat: 37.476743, lng: 126.982431 },
    kakaoMapUrl: "https://map.kakao.com/link/to/사당역통근탑승장,37.476743,126.982431"
  },

  // ── 강남 노선 (통근버스: 클레무브 1호차, 텔레칩스 2호차, 교촌 3호차) ──
  "논현역": {
    id: "nonhyeon",
    stationName: "논현역 (텔레칩스)",
    aliasNames: ["논현역", "논현역 4번출구", "논현역 6번출구", "7호선 논현역", "신분당선 논현역", "논현역 써브웨이"],
    routeName: "강남노선 (텔레칩스 2호차)",
    busType: "commute",
    exactLocation: "논현역 4번 출구 바로 앞 도로변 (써브웨이 앞)",
    address: "서울 서초구 강남대로 521 (논현역 4번 출구 앞 써브웨이 앞)",
    landmarks: "신분당선·7호선 논현역 4번 출구 나오자마자 바로 앞 써브웨이 매장 앞 도로변 볼라드 부근 (빨간 화살표 위치)",
    tip: "강남노선 2호차(텔레칩스 08:00 출발) 첫 출발 지점입니다. 4번 출구 바로 앞 써브웨이 앞에서 대기해 주세요.",
    imageUrl: "/images/boarding/nonhyeon.jpg",
    coords: { lat: 37.510872, lng: 127.021060 },
    kakaoMapUrl: "https://map.kakao.com/link/to/논현역통근탑승장,37.510872,127.021060"
  },
  "신논현역": {
    id: "sinnonhyeon-telechips",
    stationName: "신논현역 (텔레칩스)",
    aliasNames: ["신논현역", "신논현역 7번출구", "신논현역 중앙차선", "신논현역 텔레칩스"],
    routeName: "강남노선 (텔레칩스 2호차)",
    busType: "commute",
    exactLocation: "신논현역 7번 출구 신분당선 강남역 방면 버스중앙차선 정류장",
    address: "서울 서초구 강남대로 479 (신논현역 7번 출구 앞 중앙차선)",
    landmarks: "신논현역 7번 출구 나와 강남대로 강남역 방면 버스중앙차선 쉘터 (빨간 화살표 위치)",
    tip: "광역버스 등 여러 버스로 혼잡하므로 잘못 타거나 못 타는 일이 없도록 꼭 주의해서 탑승 바랍니다. (텔레칩스 2호차 08:02)",
    imageUrl: "/images/boarding/sinnonhyeon.jpg",
    coords: { lat: 37.503312, lng: 127.024768 },
    kakaoMapUrl: "https://map.kakao.com/link/to/신논현역통근탑승장,37.503312,127.024768"
  },
  "강남역": {
    id: "gangnam-telechips",
    stationName: "강남역 (텔레칩스)",
    aliasNames: ["강남역", "강남역 5,6번출구", "강남역 중앙차선", "강남역 텔레칩스", "신분당선 강남역"],
    routeName: "강남노선 (텔레칩스 2호차)",
    busType: "commute",
    exactLocation: "강남역 5,6번 출구 사이 신분당선 양재역 방면 버스중앙차선 정류장",
    address: "서울 서초구 강남대로 (강남역 5·6번 출구 사이 중앙차선 버스 쉘터)",
    landmarks: "신분당선 강남역 5번·6번 출구 사이 양재역 방면 버스중앙차선 승강장 쉘터 (빨간 화살표 위치)",
    tip: "광역버스 등 여러 버스로 혼잡하므로 주의해서 탑승 바랍니다. 텔레칩스 2호차(08:04)는 중앙차선 승강장에서 정차합니다.",
    imageUrl: "/images/boarding/gangnam-telechips.jpg",
    coords: { lat: 37.495283, lng: 127.028599 },
    kakaoMapUrl: "https://map.kakao.com/link/to/강남역통근탑승장,37.495283,127.028599"
  },
  "강남역 (교촌)": {
    id: "gangnam-kyochon",
    stationName: "강남역 (교촌 3호차)",
    aliasNames: ["강남역 (교촌)", "강남역 교촌", "강남역 5번출구", "강남역 3호차"],
    routeName: "강남노선 (교촌 3호차)",
    busType: "commute",
    exactLocation: "강남역 5번 출구 앞 도로변 버스 승강장 (가변차로)",
    address: "서울 서초구 강남대로 369 (강남역 5번 출구 앞)",
    landmarks: "신분당선 강남역 5번 출구 나와서 우측 도로변 승강장 부근 (빨간 화살표 위치)",
    tip: "⚠️ 교촌 3호차(08:20)는 중앙차선이 아닌 5번 출구 바로 앞 도로변(가변차로)에서 탑승합니다.",
    imageUrl: "/images/boarding/gangnam-kyochon.jpg",
    coords: { lat: 37.495283, lng: 127.028599 },
    kakaoMapUrl: "https://map.kakao.com/link/to/강남역교촌탑승장,37.495283,127.028599"
  },
  "양재역": {
    id: "yangjae-klemove",
    stationName: "양재역 (클레무브 1호차)",
    aliasNames: ["양재역", "양재역 2번출구", "양재역 클레무브", "양재역2번출구 (클레무브)", "HL클레무브"],
    routeName: "강남노선 (클레무브 1호차)",
    busType: "commute",
    exactLocation: "양재역 2번 출구 북측 강남대로37길 코너 (HL클레무브 앞 도로변)",
    address: "서울 서초구 강남대로 233 (양재역 2번 출구 북측 강남대로37길 코너)",
    landmarks: "양재역 2번 출구 나와 강남대로 북쪽 방면 도보 직진, 강남대로37길 코너 볼라드 앞 / HL클레무브 앞 (빨간 화살표 위치)",
    tip: "클레무브 1호차(07:40) 전용 승차 위치입니다. 2번 출구 나와 강남대로37길 코너 볼라드 앞에서 탑승합니다.",
    imageUrl: "/images/boarding/yangjae-klemove.jpg",
    coords: { lat: 37.484731, lng: 127.033332 },
    kakaoMapUrl: "https://map.kakao.com/link/to/양재역통근탑승장,37.484731,127.033332"
  },
  "양재역 (텔레칩스·교촌)": {
    id: "yangjae-telechips",
    stationName: "양재역 (텔레칩스·교촌)",
    aliasNames: ["양재역 (텔레칩스·교촌)", "양재역 1번출구", "양재역 수협은행", "양재역 텔레칩스", "양재역 교촌"],
    routeName: "강남노선 (텔레칩스 2호차 / 교촌 3호차)",
    busType: "commute",
    exactLocation: "양재역 1번 출구 전방 100m 수협은행 앞 버스정류장",
    address: "서울 서초구 남부순환로 2568 (수협은행 서초지점 앞 도로변)",
    landmarks: "양재역 1번 출구 나와 남부순환로 서초IC 방면 직진 100m, 수협은행 정문 앞 도로변 (빨간 화살표 위치)",
    tip: "텔레칩스 2호차(08:12) 및 교촌 3호차(08:25)는 1번 출구 전방 100m 수협은행 앞에서 탑승합니다. 혼잡하므로 5분 전 대기해 주세요.",
    imageUrl: "/images/boarding/yangjae-telechips.jpg",
    coords: { lat: 37.484731, lng: 127.033332 },
    kakaoMapUrl: "https://map.kakao.com/link/to/양재역수협은행탑승장,37.484731,127.033332"
  },

  // ── 안양 노선 (통근버스) ──
  "광명역": {
    id: "gwangmyeong",
    stationName: "광명역",
    aliasNames: ["광명역", "KTX 광명역", "광명역 아브뉴프랑", "광명역 1번출구"],
    routeName: "안양노선 통근버스",
    busType: "commute",
    exactLocation: "광명역 아브뉴프랑 앞 버스정류장 (06:45)",
    address: "경기 광명시 양지로 16 (아브뉴프랑 광명점 앞 도로변)",
    landmarks: "KTX 광명역 서편 아브뉴프랑 앞 시내버스 승강장 쉘터 (빨간 화살표 위치)",
    tip: "안양노선 첫 출발 정류장(06:45)입니다. 정시 출발하므로 5분 전 미리 대기해 주세요.",
    imageUrl: "/images/boarding/gwangmyeong.jpg",
    coords: { lat: 37.417689, lng: 126.884549 },
    kakaoMapUrl: "https://map.kakao.com/link/to/광명역통근탑승장,37.417689,126.884549"
  },
  "안양역": {
    id: "anyang",
    stationName: "안양역",
    aliasNames: ["안양역", "안양역 시계상자", "1호선 안양역", "안양역 1번출구"],
    routeName: "안양노선 통근버스",
    busType: "commute",
    exactLocation: "안양역 시계상자 앞 도로변 (06:55)",
    address: "경기 안양시 만안구 만안로 221 (안양역 시계상자 앞)",
    landmarks: "안양역 광장 도로변 시계상자 매장 앞 (빨간 화살표 위치)",
    tip: "안양역 시계상자 앞 도로변에서 06:55에 정차합니다. 3분 전 미리 도착해 대기해 주세요.",
    imageUrl: "/images/boarding/anyang.jpg",
    coords: { lat: 37.401259, lng: 126.922635 },
    kakaoMapUrl: "https://map.kakao.com/link/to/안양역통근탑승장,37.401259,126.922635"
  },
  "범계역": {
    id: "beomgye",
    stationName: "범계역",
    aliasNames: ["범계역", "범계역 롯데백화점", "평촌 롯데백화점", "범계역 시외버스"],
    routeName: "안양노선 통근버스",
    busType: "commute",
    exactLocation: "범계역 롯데백화점 앞 시외버스정류장 (07:13)",
    address: "경기 안양시 동안구 시민대로 180 (롯데백화점 평촌점 앞)",
    landmarks: "롯데백화점 평촌점 정문 앞 시외버스 승강장 쉘터 (빨간 화살표 위치)",
    tip: "롯데백화점 정문 앞 시외버스 승강장에서 07:13에 출발합니다.",
    imageUrl: "/images/boarding/beomgye.jpg",
    coords: { lat: 37.390222, lng: 126.950466 },
    kakaoMapUrl: "https://map.kakao.com/link/to/범계역통근탑승장,37.390222,126.950466"
  },
  "인덕원역": {
    id: "indeogwon",
    stationName: "인덕원역",
    aliasNames: ["인덕원역", "인덕원역 3번출구", "인덕원 3번출구", "4호선 인덕원역"],
    routeName: "안양노선 통근버스",
    busType: "commute",
    exactLocation: "인덕원역 3번출구 버스정류장 (07:20)",
    address: "경기 안양시 동안구 관악대로 483 (인덕원역 3번 출구 앞)",
    landmarks: "인덕원역 4호선 3번 출구 나와 직진 30m 시내버스 승강장 쉘터 (빨간 화살표 위치)",
    tip: "판교 방면 도로변 3번 출구 버스 쉘터에서 07:20에 탑승합니다.",
    imageUrl: "/images/boarding/indeogwon.jpg",
    coords: { lat: 37.401092, lng: 126.977141 },
    kakaoMapUrl: "https://map.kakao.com/link/to/인덕원역통근탑승장,37.401092,126.977141"
  },

  // ── 오산 노선 (통근버스) ──
  "오산 교촌 본사": {
    id: "osan-kyochon",
    stationName: "오산 교촌 본사",
    aliasNames: ["오산 교촌 본사", "교촌본사", "원동 교촌", "오산 교촌 에프앤비"],
    routeName: "오산노선 통근버스",
    busType: "commute",
    exactLocation: "오산 교촌 에프앤비 본사 앞 (07:20)",
    address: "경기 오산시 원동 391-4 (교촌에프앤비 본사 입구)",
    landmarks: "교촌 F&B 본사 입구 도로변 (빨간 화살표 위치)",
    tip: "오산노선 첫 출발 지점(07:20)입니다. 5분 전 미리 대기해 주세요.",
    imageUrl: "/images/boarding/osan-kyochon.jpg",
    coords: { lat: 37.138555, lng: 127.073592 },
    kakaoMapUrl: "https://map.kakao.com/link/to/오산교촌본사통근탑승장,37.138555,127.073592"
  },
  "사계절 꽃농원": {
    id: "osan-flower",
    stationName: "사계절 꽃농원",
    aliasNames: ["사계절 꽃농원", "사계절꽃농원", "사계절 꽃농원 앞"],
    routeName: "오산노선 통근버스",
    busType: "commute",
    exactLocation: "사계절 꽃농원 앞 버스정류장 (07:23)",
    address: "경기 오산시 오산동 193-2 (사계절 꽃농원 앞 도로변)",
    landmarks: "사계절 꽃농원 입구 도로변 (빨간 화살표 위치)",
    tip: "도로변 07:23 정차 지점입니다. 손을 들어 승차 의사를 표시해 주세요.",
    imageUrl: "/images/boarding/osan-flower.jpg",
    coords: { lat: 37.148711, lng: 127.082811 },
    kakaoMapUrl: "https://map.kakao.com/link/to/사계절꽃농원통근탑승장,37.148711,127.082811"
  },
  "오산시청": {
    id: "osan-cityhall",
    stationName: "오산시청",
    aliasNames: ["오산시청", "오산시청 정문", "오산시청 정문 앞"],
    routeName: "오산노선 통근버스",
    busType: "commute",
    exactLocation: "오산시청 정문 앞 버스 승강장 (07:26)",
    address: "경기 오산시 성호대로 141 (오산시청 정문 앞)",
    landmarks: "오산시청 정문 출입구 앞 시내버스 승강장 부근 (빨간 화살표 위치)",
    tip: "오산시청 정문 앞 승강장에서 07:26 탑승합니다.",
    imageUrl: "/images/boarding/osan-cityhall.jpg",
    coords: { lat: 37.149877, lng: 127.077524 },
    kakaoMapUrl: "https://map.kakao.com/link/to/오산시청통근탑승장,37.149877,127.077524"
  },
  "오산대역 후문": {
    id: "osandae",
    stationName: "오산대역 후문",
    aliasNames: ["오산대역 후문", "오산대역 2번출구", "오산대역 후문 버스정류장", "24322"],
    routeName: "오산노선 통근버스",
    busType: "commute",
    exactLocation: "오산대역 후문 버스정류장 (24322) (07:35)",
    address: "경기 오산시 수청동 609-1 (오산대역 2번 출구 후문 앞)",
    landmarks: "오산대역 2번 출구 후문 앞 시내버스 쉘터 [정류장 번호: 24322] (빨간 화살표 위치)",
    tip: "정류장 번호 24322 쉘터에서 07:35 출발합니다.",
    imageUrl: "/images/boarding/osandae.jpg",
    coords: { lat: 37.169394, lng: 127.062682 },
    kakaoMapUrl: "https://map.kakao.com/link/to/오산대역통근탑승장,37.169394,127.062682"
  },
  "UN군초전기념관": {
    id: "un-memorial",
    stationName: "UN군초전기념관 (UN참전기념관)",
    aliasNames: ["UN군초전기념관", "유엔군초전기념관", "UN참전기념관", "24406"],
    routeName: "오산노선 통근버스",
    busType: "commute",
    exactLocation: "UN참전기념관(24406) 앞 버스정류장 (07:40)",
    address: "경기 오산시 경기대로 742 (기념관 정문 앞)",
    landmarks: "UN참전기념관 앞 시내버스 쉘터 [정류장 번호: 24406] (빨간 화살표 위치)",
    tip: "고속도로 진입 전 마지막 승차 정류장(07:40)입니다.",
    imageUrl: "/images/boarding/un-memorial.jpg",
    coords: { lat: 37.184495, lng: 127.049299 },
    kakaoMapUrl: "https://map.kakao.com/link/to/UN군초전기념관통근탑승장,37.184495,127.049299"
  },

  // ── 동탄 노선 (통근버스) ──
  "금호어울림": {
    id: "dongtan-kumho",
    stationName: "금호어울림",
    aliasNames: ["금호어울림", "금호어울림·계룡리슈빌", "금호어울림, 계룡리슈빌", "55523"],
    routeName: "동탄노선 통근버스",
    busType: "commute",
    exactLocation: "금호어울림, 계룡리슈빌 버스정류장 (55523) (07:20)",
    address: "경기 화성시 동탄순환대로20길 124 (정류장 번호: 55523)",
    landmarks: "금호어울림레이크 및 계룡리슈빌 단지 앞 도로변 버스 쉘터 (빨간 화살표 위치)",
    tip: "동탄노선 첫 출발 지점(07:20)입니다. 5분 전 미리 대기해 주세요.",
    imageUrl: "/images/boarding/dongtan-kumho.jpg",
    coords: { lat: 37.182703, lng: 127.124714 },
    kakaoMapUrl: "https://map.kakao.com/link/to/금호어울림통근탑승장,37.182703,127.124714"
  },
  "한신더휴": {
    id: "dongtan-hanshin",
    stationName: "한신더휴",
    aliasNames: ["한신더휴", "동탄 한신더휴", "55489"],
    routeName: "동탄노선 통근버스",
    busType: "commute",
    exactLocation: "한신더휴 버스정류장 (55489) (07:27)",
    address: "경기 화성시 동탄순환대로20길 70 (정류장 번호: 55489)",
    landmarks: "한신더휴 아파트 단지 앞 도로변 버스 쉘터 (빨간 화살표 위치)",
    tip: "정류장 번호 55489 쉘터에서 07:27 탑승합니다.",
    imageUrl: "/images/boarding/dongtan-hanshin.jpg",
    coords: { lat: 37.186575, lng: 127.125650 },
    kakaoMapUrl: "https://map.kakao.com/link/to/한신더휴통근탑승장,37.186575,127.125650"
  },
  "신안2차,반도4차": {
    id: "dongtan-sinan",
    stationName: "신안2차, 반도4차",
    aliasNames: ["신안2차,반도4차", "신안2차·반도4차", "신안2차, 반도4차", "77102"],
    routeName: "동탄노선 통근버스",
    busType: "commute",
    exactLocation: "신안2차, 반도4차 버스정류장 (77102) (07:31)",
    address: "경기 화성시 동탄청계로 303-13 (정류장 번호: 77102)",
    landmarks: "카림애비뉴 및 신안2차·반도4차 아파트 사거리 앞 버스 쉘터 (빨간 화살표 위치)",
    tip: "정류장 번호 77102 쉘터에서 07:31 탑승합니다.",
    imageUrl: "/images/boarding/dongtan-sinan.jpg",
    coords: { lat: 37.199904, lng: 127.116830 },
    kakaoMapUrl: "https://map.kakao.com/link/to/신안2차반도4차통근탑승장,37.199904,127.116830"
  },
  "이주택지": {
    id: "dongtan-ijutaekji",
    stationName: "이주택지",
    aliasNames: ["이주택지", "이주택지·상록·경남아파트", "이주택지, 상록, 경남아파트", "77103"],
    routeName: "동탄노선 통근버스",
    busType: "commute",
    exactLocation: "이주택지, 상록, 경남아파트 버스정류장 (77103) (07:34)",
    address: "경기 화성시 영천동 723 (정류장 번호: 77103)",
    landmarks: "상록·경남아파트 앞 도로변 버스 쉘터 (빨간 화살표 위치)",
    tip: "정류장 번호 77103 쉘터에서 07:34 탑승합니다.",
    imageUrl: "/images/boarding/dongtan-ijutaekji.jpg",
    coords: { lat: 37.206661, lng: 127.123837 },
    kakaoMapUrl: "https://map.kakao.com/link/to/이주택지통근탑승장,37.206661,127.123837"
  },
  "대방디엠시티": {
    id: "dongtan-daebang",
    stationName: "대방디엠시티",
    aliasNames: ["대방디엠시티", "대방디엠시티·센트럴상록", "대방디엠시티, 센트럴 상록", "55308"],
    routeName: "동탄노선 통근버스",
    busType: "commute",
    exactLocation: "대방디엠시티, 센트럴 상록 (55308) (07:36)",
    address: "경기 화성시 동탄대로 636-14 (정류장 번호: 55308)",
    landmarks: "대방디엠시티 센트럴상록 상가 앞 도로변 버스 쉘터 (빨간 화살표 위치)",
    tip: "07:36 출발하며, ⚠️ 퇴근 시에는 정차하지 않으므로 유의하세요.",
    imageUrl: "/images/boarding/dongtan-daebang.jpg",
    coords: { lat: 37.210272, lng: 127.099442 },
    kakaoMapUrl: "https://map.kakao.com/link/to/대방디엠시티통근탑승장,37.210272,127.099442"
  },
  "한미약품": {
    id: "dongtan-hanmi",
    stationName: "한미약품",
    aliasNames: ["한미약품", "한미약품·푸르지오", "한미약품, 푸르지오", "한미약품 연구센터", "55315"],
    routeName: "동탄노선 통근버스",
    busType: "commute",
    exactLocation: "한미약품, 푸르지오 버스정류장 (55315) (07:39)",
    address: "경기 화성시 동탄기흥로 550 (정류장 번호: 55315)",
    landmarks: "한미약품 연구센터 및 푸르지오 단지 앞 버스 쉘터 (빨간 화살표 위치)",
    tip: "정류장 번호 55315 쉘터에서 07:39 탑승합니다.",
    imageUrl: "/images/boarding/dongtan-hanmi.jpg",
    coords: { lat: 37.209629, lng: 127.094633 },
    kakaoMapUrl: "https://map.kakao.com/link/to/한미약품통근탑승장,37.209629,127.094633"
  },
  "예당고사거리": {
    id: "dongtan-yedang",
    stationName: "예당고사거리",
    aliasNames: ["예당고사거리", "예당고", "55311"],
    routeName: "동탄노선 통근버스",
    busType: "commute",
    exactLocation: "예당고사거리 버스정류장 (55311) (07:42)",
    address: "경기 화성시 석우동 60 (정류장 번호: 55311)",
    landmarks: "예당고등학교 사거리 판교 방면 도로변 버스 쉘터 (빨간 화살표 위치)",
    tip: "기흥동탄IC 고속도로 진입 전 마지막 승차 정류장(07:42)입니다.",
    imageUrl: "/images/boarding/dongtan-yedang.jpg",
    coords: { lat: 37.206951, lng: 127.078460 },
    kakaoMapUrl: "https://map.kakao.com/link/to/예당고사거리통근탑승장,37.206951,127.078460"
  },

  // ── 사옥 (퇴근 시 승차 및 출근 시 하차) ──
  "사옥": {
    id: "hq-infinity",
    stationName: "사옥 (인피니티타워 탑승/하차장)",
    aliasNames: ["사옥", "도착(사옥)", "사옥 도착", "슈어소프트테크", "슈어소프트", "판교캠퍼스", "인피니티타워", "사옥 승차장", "사옥 하차장", "슈어소프트 사옥", "슈어소프트테크 사옥", "도착(사옥)", "사옥(도착)"],
    routeName: "전 노선 셔틀·통근",
    busType: "shuttle",
    exactLocation: "경기 성남시 수정구 금토로80번길 37 인피니티타워 E동 앞 도로변 (횡단보도 옆 승하차 구역)",
    address: "경기 성남시 수정구 금토로80번길 37 인피니티타워 E동",
    landmarks: "인피니티타워 E동 맞은편 지란지교 건물 앞 횡단보도 옆 도로변 (빨간 화살표 및 원형 점선 위치)",
    tip: "출근 시 셔틀/통근버스가 하차하며, 퇴근 시 판교·야탑 셔틀 및 권역별 통근버스가 순서대로 정차하여 승차하는 전용 승강장입니다.",
    imageUrl: "/images/boarding/hq-infinity.jpg",
    coords: { lat: 37.406981, lng: 127.088711 },
    kakaoMapUrl: "https://map.kakao.com/link/to/슈어소프트인피니티타워,37.406981,127.088711"
  }
};

/**
 * 정류장 명칭 및 노선/운영사 컨텍스트로 탑승 위치 정보 검색
 * (회사별/호차별 탑승 위치 정밀 분기 지원: 클레무브, 텔레칩스, 교촌 등)
 */
export function findBoardingLocation(
  stopName: string, 
  routeName?: string, 
  contextText?: string
): BoardingLocationInfo | null {
  if (!stopName && !routeName) return null;

  const raw = `${stopName || ''} ${routeName || ''} ${contextText || ''}`.trim();
  const clean = (stopName || '').replace(/[\(\)\[\]→➔]/g, ' ').trim();

  // ── 1. 강남노선 회사별(운영사별) 탑승 위치 정밀 분기 ──
  if (clean.includes('강남역')) {
    // 교촌 3호차 (08:20): 강남역 5번 출구 앞 도로변 (가변차로)
    if (raw.includes('교촌') || raw.includes('3호차') || raw.includes('08:20')) {
      return SHUTTLE_BOARDING_LOCATIONS['강남역 (교촌)'];
    }
    // 텔레칩스 2호차 (08:04): 강남역 5,6번 출구 사이 중앙차선
    return SHUTTLE_BOARDING_LOCATIONS['강남역'];
  }

  if (clean.includes('양재역')) {
    // 텔레칩스 2호차 (08:12) 또는 교촌 3호차 (08:25): 1번 출구 전방 100m 수협은행 앞
    if (raw.includes('텔레칩스') || raw.includes('2호차') || raw.includes('교촌') || raw.includes('3호차') || raw.includes('08:12') || raw.includes('08:25') || raw.includes('수협은행')) {
      return SHUTTLE_BOARDING_LOCATIONS['양재역 (텔레칩스·교촌)'];
    }
    // 클레무브 1호차 (07:40) 또는 기본: 2번 출구 북측 HL클레무브 앞 코너
    return SHUTTLE_BOARDING_LOCATIONS['양재역'];
  }

  // ── 2. 완전 일치 검색 ──
  if (SHUTTLE_BOARDING_LOCATIONS[clean]) {
    return SHUTTLE_BOARDING_LOCATIONS[clean];
  }

  // ── 3. 키워드 및 alias 검색 ──
  for (const info of Object.values(SHUTTLE_BOARDING_LOCATIONS)) {
    if (info.aliasNames.some(alias => clean.includes(alias) || alias.includes(clean) || raw.includes(alias))) {
      return info;
    }
  }

  // ── 4. 주요 키워드 기반 매칭 ──
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

  // ── 5. 노선명 기반 fallback 매칭 ──
  if (routeName) {
    if (routeName.includes('판교셔틀')) return SHUTTLE_BOARDING_LOCATIONS['판교역'];
    if (routeName.includes('야탑셔틀')) return SHUTTLE_BOARDING_LOCATIONS['야탑역'];
    if (routeName.includes('잠실')) return SHUTTLE_BOARDING_LOCATIONS['군자역'] || SHUTTLE_BOARDING_LOCATIONS['잠실역'];
    if (routeName.includes('신도림')) return SHUTTLE_BOARDING_LOCATIONS['신도림역'];
    if (routeName.includes('강남')) return SHUTTLE_BOARDING_LOCATIONS['양재역'] || SHUTTLE_BOARDING_LOCATIONS['강남역'];
    if (routeName.includes('안양')) return SHUTTLE_BOARDING_LOCATIONS['안양역'] || SHUTTLE_BOARDING_LOCATIONS['인덕원역'];
    if (routeName.includes('오산')) return SHUTTLE_BOARDING_LOCATIONS['오산시청'] || SHUTTLE_BOARDING_LOCATIONS['오산 교촌 본사'];
    if (routeName.includes('동탄')) return SHUTTLE_BOARDING_LOCATIONS['금호어울림'] || SHUTTLE_BOARDING_LOCATIONS['한미약품'];
  }

  // ── 6. STATION_COORDS에 등록되어 있는 경우 즉석 fallback 생성 ──
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
    const beforeArrow = step.subtitle.split(/[➔→]/)[0] || '';
    rawStopName = beforeArrow.split('(')[0].replace(/(승차|탑승|이동|통근버스 정류소|셔틀)/g, '').trim();
  }

  if (!rawStopName && step.title) {
    const beforeArrow = step.title.split(/[➔→]/)[0] || '';
    rawStopName = beforeArrow.split('(')[0].replace(/(승차|탑승|이동|통근버스 정류소|셔틀)/g, '').trim();
  }

  // 운영사 컨텍스트 (클레무브, 텔레칩스, 교촌 등 호차 및 시간 정보)
  const contextText = `${step.note || ''} ${step.title || ''} ${step.departureTime || ''} ${routeName || ''}`;

  const found = findBoardingLocation(rawStopName, routeName || step.title, contextText);
  if (found) return found;

  // step.type이 셔틀 또는 통근인데 못 찾은 경우 노선명/스텝 타이틀로 Fallback
  const isShuttle = step.type === 'shuttle';
  const fallbackKey = isShuttle
    ? ((step.title + (routeName || '')).includes('야탑') ? '야탑역' : '판교역')
    : '군자역';

  return SHUTTLE_BOARDING_LOCATIONS[fallbackKey] || SHUTTLE_BOARDING_LOCATIONS['판교역'];
}

/**
 * 경로(RouteCandidate)에 셔틀이나 통근버스가 실제로 탑승되는지 검사하고
 * 포함된 모든 탑승지 정보를 반환 (통근/셔틀 탈 때만 반환)
 */
export function getCandidateBoardingLocations(candidate: RouteCandidate): BoardingLocationInfo[] {
  const result: BoardingLocationInfo[] = [];
  const seenIds = new Set<string>();

  // 1. steps에서 통근버스/셔틀버스 탑승 단계가 실제로 존재하는지 검사
  const shuttleOrCommuteSteps = candidate.steps.filter(
    step => step.type === 'shuttle' || step.type === 'commute_bus'
  );

  for (const step of shuttleOrCommuteSteps) {
    const info = getStepBoardingLocation(step, candidate.routeName);
    if (info && !seenIds.has(info.id)) {
      seenIds.add(info.id);
      result.push(info);
    }

    // 통근/셔틀 하차 정류장이 사옥인 경우 사옥 탑승/하차장 위치 안내도 함께 제공
    const dropoffRaw = `${step.dropoffStopName || ''} ${step.subtitle || ''} ${candidate.title || ''}`;
    if (dropoffRaw.includes('사옥') || dropoffRaw.includes('인피니티') || dropoffRaw.includes('슈어소프트')) {
      const hqInfo = SHUTTLE_BOARDING_LOCATIONS['사옥'];
      if (hqInfo && !seenIds.has(hqInfo.id)) {
        seenIds.add(hqInfo.id);
        result.push(hqInfo);
      }
    }
  }

  // 2. 회사 직통 노선이지만 steps에 step.type 매핑이 아직 덜 된 특수 직통 케이스에 한해서만 보완
  if (result.length === 0 && candidate.routeCategory === 'company_only') {
    const combined = `${candidate.title} ${candidate.subtitle} ${candidate.routeName}`;
    const fallbackInfo = findBoardingLocation(combined, candidate.routeName);
    if (fallbackInfo && !seenIds.has(fallbackInfo.id)) {
      seenIds.add(fallbackInfo.id);
      result.push(fallbackInfo);
    }
  }

  return result;
}
