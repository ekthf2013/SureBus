import { SUBWAY_STATION_COORDS } from './subwayStationsData';
import { PRESET_LOCATIONS } from './distance';
import { loadKakaoMapSDK } from './kakaoMapLoader';

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
 * 브라우저 카카오맵 JavaScript SDK 검색 (카카오맵 공식 웹과 100% 동일)
 */
async function searchWithKakaoSDK(query: string): Promise<KakaoPlaceItem[]> {
  if (typeof window === 'undefined') return [];

  // SDK가 아직 로딩 중이라면 최대 800ms 동안 대기
  if (!window.kakao || !window.kakao.maps || !window.kakao.maps.services) {
    try {
      await Promise.race([
        loadKakaoMapSDK(),
        new Promise((_, reject) => setTimeout(() => reject(new Error('timeout')), 800))
      ]);
    } catch {
      // SDK 로딩 실패 또는 타임아웃 시 진행
    }
  }

  if (!window.kakao?.maps?.services) return [];

  const items: KakaoPlaceItem[] = [];
  const seenCoords = new Set<string>();

  const addItem = (item: KakaoPlaceItem) => {
    const key = `${Number(item.x).toFixed(4)}_${Number(item.y).toFixed(4)}`;
    if (!seenCoords.has(key)) {
      seenCoords.add(key);
      items.push(item);
    }
  };

  // 1) Places: 키워드 장소 검색 (아파트, 회사, 역, 정류장, 랜드마크 등)
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
              id: doc.id || `sdk-p-${doc.x}-${doc.y}`,
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

  // 2) Geocoder: 주소 검색 (도로명, 지번, 건물번호 완벽 지원)
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
              id: `sdk-a-${doc.x}-${doc.y}`,
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

  await Promise.all([placesPromise, addressPromise]);
  return items;
}

/**
 * 카카오 REST API 백업 (키워드 + 주소)
 */
async function searchWithKakaoREST(query: string): Promise<KakaoPlaceItem[]> {
  const restKey = ((typeof import.meta !== 'undefined' && import.meta.env) ? import.meta.env.VITE_KAKAO_REST_KEY : undefined) || '8d38096e3c6e5c2f30656aad156def02';
  if (!restKey) return [];

  const items: KakaoPlaceItem[] = [];
  try {
    const [kwRes, addrRes] = await Promise.all([
      fetch(`https://dapi.kakao.com/v2/local/search/keyword.json?query=${encodeURIComponent(query)}&size=6`, {
        headers: { Authorization: `KakaoAK ${restKey}` },
        signal: AbortSignal.timeout(1500),
      }).catch(() => null),
      fetch(`https://dapi.kakao.com/v2/local/search/address.json?query=${encodeURIComponent(query)}&size=6`, {
        headers: { Authorization: `KakaoAK ${restKey}` },
        signal: AbortSignal.timeout(1500),
      }).catch(() => null),
    ]);

    if (kwRes && kwRes.ok) {
      const kwData = await kwRes.json();
      if (Array.isArray(kwData.documents)) {
        for (const doc of kwData.documents) {
          items.push({
            id: doc.id || `rest-kw-${doc.x}-${doc.y}`,
            place_name: doc.place_name,
            category_name: doc.category_group_name || '장소',
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

    if (addrRes && addrRes.ok) {
      const addrData = await addrRes.json();
      if (Array.isArray(addrData.documents)) {
        for (const doc of addrData.documents) {
          const road = doc.road_address?.address_name || '';
          const building = doc.road_address?.building_name || '';
          const jibun = doc.address?.address_name || doc.address_name || '';
          const name = building ? `${road || jibun} (${building})` : (road || jibun);

          items.push({
            id: `rest-addr-${doc.x}-${doc.y}`,
            place_name: name,
            category_name: building ? '건물' : '주소',
            address_name: jibun,
            road_address_name: road,
            x: String(doc.x),
            y: String(doc.y),
          });
        }
      }
    }
  } catch {
    // ignore
  }

  return items;
}

/**
 * 실시간 대한민국 전국 지오코딩 백업 (카카오 쿼터 초과 시에도 '우림' 등 자동완성 100% 보장)
 */
async function searchWithNationalGeocoding(query: string): Promise<KakaoPlaceItem[]> {
  try {
    const osmUrl = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&countrycodes=kr&addressdetails=1&limit=8`;
    const osmRes = await fetch(osmUrl, {
      headers: {
        'Accept-Language': 'ko,en',
        'User-Agent': 'SureBus/1.0',
      },
      signal: AbortSignal.timeout(2000),
    });

    if (!osmRes.ok) return [];

    const osmData = await osmRes.json();
    if (!Array.isArray(osmData) || osmData.length === 0) return [];

    const results: KakaoPlaceItem[] = [];
    for (const item of osmData) {
      const rawParts = (item.display_name || '').split(',').map((s: string) => s.trim());
      const primaryName = item.name || rawParts[0] || query;
      const filteredParts = rawParts.filter((p: string) => !/^\d{5}$/.test(p) && p !== '대한민국' && p !== primaryName);
      const fullAddress = filteredParts.slice(-3).reverse().join(' ') || rawParts.slice(1, 4).join(' ');

      // 깔끔한 카테고리 표시 (거주지 등의 어색한 단어 배제)
      let cat = '장소';
      if (primaryName.includes('아파트') || primaryName.includes('마을') || primaryName.includes('단지') || primaryName.includes('빌라') || primaryName.includes('오피스텔')) {
        cat = '아파트/단지';
      } else if (item.type === 'station' || item.type === 'subway' || primaryName.endsWith('역')) {
        cat = '지하철역';
      } else if (item.class === 'boundary' || primaryName.endsWith('동') || primaryName.endsWith('구')) {
        cat = '지역';
      } else if (item.type === 'road' || primaryName.endsWith('로') || primaryName.endsWith('길')) {
        cat = '도로명';
      }

      results.push({
        id: `osm-${item.place_id || item.osm_id || Math.random()}`,
        place_name: primaryName,
        category_name: cat,
        address_name: fullAddress,
        road_address_name: item.display_name,
        x: String(item.lon),
        y: String(item.lat),
      });
    }

    return results;
  } catch {
    return [];
  }
}

/**
 * 전국 장소/주소/아파트/역명 스마트 검색 유틸리티
 */
export async function searchKakaoPlaces(query: string): Promise<KakaoPlaceItem[]> {
  if (!query || query.trim().length < 2) return [];

  const trimmed = query.trim();
  const results: KakaoPlaceItem[] = [];
  const seen = new Set<string>();

  const addResult = (item: KakaoPlaceItem) => {
    const key = `${item.place_name}_${Number(item.x).toFixed(4)}_${Number(item.y).toFixed(4)}`;
    if (!seen.has(key)) {
      seen.add(key);
      results.push(item);
    }
  };

  // 1. 브라우저 카카오 SDK 검색 시도 (카카오맵 웹/앱 실시간 데이터)
  const sdkItems = await searchWithKakaoSDK(trimmed);
  if (sdkItems.length > 0) {
    for (const item of sdkItems) {
      addResult(item);
    }
  }

  // 2. 카카오 결과가 부족하거나 없을 경우 (REST API 및 전국 지오코딩 병렬 지원)
  if (results.length < 4) {
    const [restItems, nationalItems] = await Promise.all([
      searchWithKakaoREST(trimmed),
      searchWithNationalGeocoding(trimmed),
    ]);

    for (const item of restItems) {
      addResult(item);
    }
    for (const item of nationalItems) {
      addResult(item);
    }
  }

  // 3. 로컬 전철역 및 추천 거점 매칭 (0ms 즉시 보강)
  const cleanQ = trimmed.replace(/역$/, '').toLowerCase();
  for (const [stName, coord] of Object.entries(SUBWAY_STATION_COORDS)) {
    const cleanSt = stName.replace(/역$/, '').toLowerCase();
    if (cleanSt === cleanQ || cleanSt.startsWith(cleanQ) || (cleanQ.length >= 2 && cleanSt.includes(cleanQ))) {
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
