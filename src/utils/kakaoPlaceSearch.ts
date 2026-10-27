import { SUBWAY_STATION_COORDS } from './subwayStationsData';
import { PRESET_LOCATIONS } from './distance';
import { loadKakaoMapSDK } from './kakaoMapLoader';

/**
 * 전국 장소/주소/아파트/역명 스마트 검색 엔진 (카카오맵 공식 엔진 100% 동일)
 * 1. 브라우저 카카오맵 JavaScript SDK Services (최우선: 쿼터 제한 없이 실시간 카카오맵 검색)
 *    - kakao.maps.services.Geocoder: 모든 도로명 주소, 지번 주소, 번지수 검색
 *    - kakao.maps.services.Places: 모든 건물명, 아파트단지, 역명, 상호, 랜드마크 검색
 * 2. 카카오 Local REST API (주소 + 키워드 병렬 검색)
 * 3. 수도권 700+ 전철역 및 주요 거점 정밀 매칭
 */

export interface KakaoPlaceItem {
  id: string;
  place_name: string;
  category_name: string;
  address_name: string;
  road_address_name: string;
  x: string; // 경도 (lng)
  y: string; // 위도 (lat)
  phone?: string;
  place_url?: string;
}

/**
 * 카카오맵 브라우저 SDK 서비스를 통한 공식 검색 (카카오맵 웹/앱과 100% 동일)
 */
async function searchWithKakaoSDK(query: string): Promise<KakaoPlaceItem[]> {
  if (typeof window === 'undefined') return [];

  // SDK 미로딩 상태라면 로딩 시도
  if (!window.kakao || !window.kakao.maps || !window.kakao.maps.services) {
    try {
      await loadKakaoMapSDK();
    } catch {
      return [];
    }
  }

  if (!window.kakao?.maps?.services) return [];

  const items: KakaoPlaceItem[] = [];
  const seenCoords = new Set<string>();

  const addItem = (item: KakaoPlaceItem) => {
    const coordKey = `${Number(item.x).toFixed(4)}_${Number(item.y).toFixed(4)}`;
    if (!seenCoords.has(coordKey)) {
      seenCoords.add(coordKey);
      items.push(item);
    }
  };

  // 1) Geocoder: 주소 검색 (도로명, 지번, 건물번호 완벽 지원)
  const addressPromise = new Promise<void>((resolve) => {
    try {
      const geocoder = new window.kakao.maps.services.Geocoder();
      geocoder.addressSearch(query, (result, status) => {
        if (status === window.kakao.maps.services.Status.OK && Array.isArray(result)) {
          for (const doc of result) {
            const road = doc.road_address?.address_name || '';
            const building = doc.road_address?.building_name || '';
            const jibun = doc.address?.address_name || doc.address_name || '';
            const displayName = building ? `${road || jibun} (${building})` : (road || jibun);

            addItem({
              id: `sdk-addr-${doc.x}-${doc.y}`,
              place_name: displayName,
              category_name: building ? '건물' : '주소',
              address_name: jibun,
              road_address_name: road,
              x: String(doc.x),
              y: String(doc.y),
            });
          }
        }
        resolve();
      });
    } catch {
      resolve();
    }
  });

  // 2) Places: 키워드 장소 검색 (아파트, 회사, 역, 정류장, 랜드마크 등)
  const placesPromise = new Promise<void>((resolve) => {
    try {
      const places = new window.kakao.maps.services.Places();
      places.keywordSearch(query, (result, status) => {
        if (status === window.kakao.maps.services.Status.OK && Array.isArray(result)) {
          for (const doc of result) {
            let cat = doc.category_group_name || '';
            if (!cat && doc.category_name) {
              const parts = doc.category_name.split('>');
              cat = parts[parts.length - 1].trim();
            }
            if (!cat) cat = '장소';

            addItem({
              id: doc.id || `sdk-place-${doc.x}-${doc.y}`,
              place_name: doc.place_name,
              category_name: cat,
              address_name: doc.address_name || '',
              road_address_name: doc.road_address_name || '',
              x: String(doc.x),
              y: String(doc.y),
              phone: doc.phone || '',
              place_url: doc.place_url || '',
            });
          }
        }
        resolve();
      });
    } catch {
      resolve();
    }
  });

  await Promise.all([addressPromise, placesPromise]);
  return items;
}

export async function searchKakaoPlaces(query: string): Promise<KakaoPlaceItem[]> {
  if (!query || query.trim().length < 2) return [];

  const trimmed = query.trim();
  const results: KakaoPlaceItem[] = [];
  const seen = new Set<string>();

  const addResult = (item: KakaoPlaceItem) => {
    const key = `${Number(item.x).toFixed(4)}_${Number(item.y).toFixed(4)}`;
    if (!seen.has(key)) {
      seen.add(key);
      results.push(item);
    }
  };

  // ── 1. 브라우저 카카오맵 SDK 서비스 우선 실행 (카카오맵과 100% 동일, 쿼터 무제한) ──
  const sdkResults = await searchWithKakaoSDK(trimmed);
  if (sdkResults.length > 0) {
    for (const item of sdkResults) {
      addResult(item);
    }
    return results.slice(0, 10);
  }

  // ── 2. 카카오 REST API 백업 (SDK 미로딩 시 주소 + 키워드 동시 조회) ──
  const restKey = ((typeof import.meta !== 'undefined' && import.meta.env) ? import.meta.env.VITE_KAKAO_REST_KEY : undefined) || '8d38096e3c6e5c2f30656aad156def02';
  if (restKey) {
    try {
      const [addrRes, kwRes] = await Promise.all([
        fetch(`https://dapi.kakao.com/v2/local/search/address.json?query=${encodeURIComponent(trimmed)}&size=8`, {
          headers: { Authorization: `KakaoAK ${restKey}` },
          signal: AbortSignal.timeout(2000),
        }).catch(() => null),
        fetch(`https://dapi.kakao.com/v2/local/search/keyword.json?query=${encodeURIComponent(trimmed)}&size=8`, {
          headers: { Authorization: `KakaoAK ${restKey}` },
          signal: AbortSignal.timeout(2000),
        }).catch(() => null),
      ]);

      if (addrRes && addrRes.ok) {
        const addrData = await addrRes.json();
        if (Array.isArray(addrData.documents)) {
          for (const doc of addrData.documents) {
            const road = doc.road_address?.address_name || '';
            const building = doc.road_address?.building_name || '';
            const jibun = doc.address?.address_name || doc.address_name || '';
            const displayName = building ? `${road || jibun} (${building})` : (road || jibun);

            addResult({
              id: `rest-addr-${doc.x}-${doc.y}`,
              place_name: displayName,
              category_name: building ? '건물' : '주소',
              address_name: jibun,
              road_address_name: road,
              x: String(doc.x),
              y: String(doc.y),
            });
          }
        }
      }

      if (kwRes && kwRes.ok) {
        const kwData = await kwRes.json();
        if (Array.isArray(kwData.documents)) {
          for (const doc of kwData.documents) {
            let cat = doc.category_group_name || '';
            if (!cat && doc.category_name) {
              const parts = doc.category_name.split('>');
              cat = parts[parts.length - 1].trim();
            }
            if (!cat) cat = '장소';

            addResult({
              id: doc.id || `rest-kw-${doc.x}-${doc.y}`,
              place_name: doc.place_name,
              category_name: cat,
              address_name: doc.address_name || '',
              road_address_name: doc.road_address_name || '',
              x: String(doc.x),
              y: String(doc.y),
              phone: doc.phone || '',
              place_url: doc.place_url || '',
            });
          }
        }
      }
    } catch {
      // ignore
    }
  }

  // ── 3. 전국 지하철역 및 추천 거점 빠른 매칭 ──
  const cleanQ = trimmed.replace(/역$/, '').toLowerCase();

  for (const [stName, coord] of Object.entries(SUBWAY_STATION_COORDS)) {
    const cleanSt = stName.replace(/역$/, '').toLowerCase();
    if (cleanSt === cleanQ || cleanSt.startsWith(cleanQ) || cleanQ.startsWith(cleanSt)) {
      addResult({
        id: `subway-${stName}`,
        place_name: stName,
        category_name: '지하철역',
        address_name: `수도권 전철 ${stName}`,
        road_address_name: '',
        x: String(coord.lng),
        y: String(coord.lat),
      });
    }
  }

  for (const preset of PRESET_LOCATIONS) {
    if (preset.name.toLowerCase().includes(cleanQ) || cleanQ.includes(preset.name.toLowerCase())) {
      addResult({
        id: `preset-${preset.name}`,
        place_name: preset.name,
        category_name: '추천 거점',
        address_name: `수도권 주요 거점 ${preset.name}`,
        road_address_name: '',
        x: String(preset.lng),
        y: String(preset.lat),
      });
    }
  }

  return results.slice(0, 10);
}
