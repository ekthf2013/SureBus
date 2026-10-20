// Distance and Transit Utilities

export function getHaversineDistanceMeters(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371e3; // Earth radius in meters
  const rad = Math.PI / 180;
  const dLat = (lat2 - lat1) * rad;
  const dLon = (lon2 - lon1) * rad;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * rad) * Math.cos(lat2 * rad) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Math.round(R * c);
}

export function estimateWalkMinutes(distanceMeters: number): number {
  const walkSpeedMeterPerMin = 75; // 4.5 km/h
  return Math.max(1, Math.round(distanceMeters / walkSpeedMeterPerMin));
}

export function parseTimeToMinutes(timeStr: string): number {
  if (!timeStr || !timeStr.includes(':')) return 0;
  const [h, m] = timeStr.split(':').map(Number);
  return h * 60 + m;
}

export function minutesToTimeString(totalMinutes: number): string {
  const h = Math.floor(totalMinutes / 60) % 24;
  const m = Math.round(totalMinutes % 60);
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

export function addMinutesToTime(timeStr: string, minutesToAdd: number): string {
  const currentMins = parseTimeToMinutes(timeStr);
  return minutesToTimeString(currentMins + minutesToAdd);
}

export function subtractMinutesFromTime(timeStr: string, minutesToSub: number): string {
  const currentMins = parseTimeToMinutes(timeStr);
  return minutesToTimeString(Math.max(0, currentMins - minutesToSub));
}

// Seoul-Centric Preset Locations (Requested by user)
export interface PresetLocation {
  name: string;
  category: '서울 주요거점' | '경기 거점';
  lat: number;
  lng: number;
  address: string;
  nearbySubway?: string;
}

export const PRESET_LOCATIONS: PresetLocation[] = [
  { name: '판교역 (셔틀)', category: '경기 거점', lat: 37.3948, lng: 127.1111, address: '성남시 분당구 판교역로 160 (판교역 1번출구 북문)', nearbySubway: '신분당선/경강선' },
  { name: '야탑역 (셔틀)', category: '경기 거점', lat: 37.4113, lng: 127.1287, address: '성남시 분당구 야탑로 64 (야탑역 우리은행 앞)', nearbySubway: '수인분당선' },
  { name: '잠실역 (통근)', category: '서울 주요거점', lat: 37.5133, lng: 127.1001, address: '서울 송파구 올림픽로 265 (잠실역 버스 중앙차선)', nearbySubway: '2호선/8호선' },
  { name: '강남역 (통근)', category: '서울 주요거점', lat: 37.4979, lng: 127.0276, address: '서울 서초구 강남대로 396 (강남역 5·6번출구 중앙차선)', nearbySubway: '2호선/신분당선' },
  { name: '양재역 (통근)', category: '서울 주요거점', lat: 37.4842, lng: 127.0345, address: '서울 서초구 강남대로 224 (양재역 1·2번출구 서초IC방면)', nearbySubway: '3호선/신분당선' },
  { name: '사당역 (통근)', category: '서울 주요거점', lat: 37.4766, lng: 126.9816, address: '서울 관악구 남부순환로 2089 (사당역 네스코N타워 앞)', nearbySubway: '2호선/4호선' },
  { name: '신도림역 (통근)', category: '서울 주요거점', lat: 37.5088, lng: 126.8912, address: '서울 구로구 경인로 688 (신도림역 테크노마트 앞)', nearbySubway: '1호선/2호선' },
  { name: '모란역 (통근)', category: '경기 거점', lat: 37.4321, lng: 127.1292, address: '성남시 중원구 성남대로 1133 (모란역 삼성디지털프라자 앞)', nearbySubway: '8호선/수인분당선' },
  { name: '복정역 (통근)', category: '서울 주요거점', lat: 37.4700, lng: 127.1267, address: '서울 송파구 송파대로 60 (복정역 임마누엘교회 앞)', nearbySubway: '8호선/수인분당선' },
  { name: '가락시장역 (통근)', category: '서울 주요거점', lat: 37.4929, lng: 127.1182, address: '서울 송파구 중대로 80 (가락시장 중앙차선)', nearbySubway: '3호선/8호선' },
  { name: '인덕원역 (통근)', category: '경기 거점', lat: 37.4011, lng: 126.9768, address: '안양시 동안구 관악대로 483 (인덕원역 3번출구)', nearbySubway: '4호선' },
  { name: '범계역 (통근)', category: '경기 거점', lat: 37.3898, lng: 126.9507, address: '안양시 동안구 시민대로 180 (범계역 롯데백화점 앞)', nearbySubway: '4호선' },
  { name: '광명역 (통근)', category: '경기 거점', lat: 37.4168, lng: 126.8851, address: '광명시 일직로 12 (광명역 아브뉴프랑 앞)', nearbySubway: '1호선/KTX' }
];
