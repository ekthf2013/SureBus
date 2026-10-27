import { SUBWAY_STATION_COORDS } from './subwayStationsData';
import { PRESET_LOCATIONS } from './distance';

/**
 * 전국 장소/주소/아파트/역명 스마트 검색 유틸리티
 * 1. Kakao Local REST API & SDK (우선 시도)
 * 2. OSM Nominatim 대한민국 정밀 지오코딩 (일일 쿼터 제한 없는 전국 검색 백업)
 * 3. 수도권 700+ 전철역 및 주요 거점 즉시 매칭
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

  // 1. 카카오 REST API 시도 (키가 있고 쿼터가 남아있는 경우)
  const restKey = ((typeof import.meta !== 'undefined' && import.meta.env) ? import.meta.env.VITE_KAKAO_REST_KEY : undefined) || '8d38096e3c6e5c2f30656aad156def02';
  if (restKey) {
    try {
      const keywordUrl = `https://dapi.kakao.com/v2/local/search/keyword.json?query=${encodeURIComponent(trimmed)}&size=6`;
      const kwRes = await fetch(keywordUrl, {
        headers: { Authorization: `KakaoAK ${restKey}` },
        signal: AbortSignal.timeout(2000),
      });

      if (kwRes.ok) {
        const kwData = await kwRes.json();
        if (Array.isArray(kwData.documents) && kwData.documents.length > 0) {
          for (const doc of kwData.documents) {
            addResult({
              id: doc.id || `kakao-${doc.x}-${doc.y}`,
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
    } catch {
      // API 쿼터 초과 또는 네트워크 오류 시 백업 엔진으로 자연스럽게 진행
    }
  }

  // 2. 카카오 결과가 부족하거나 쿼터 초과 시: OpenStreetMap Nominatim 대한민국 전국 지오코딩
  if (results.length < 3) {
    try {
      const osmUrl = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(trimmed)}&countrycodes=kr&addressdetails=1&limit=6`;
      const osmRes = await fetch(osmUrl, {
        headers: {
          'Accept-Language': 'ko,en',
        },
        signal: AbortSignal.timeout(2500),
      });

      if (osmRes.ok) {
        const osmData = await osmRes.json();
        if (Array.isArray(osmData) && osmData.length > 0) {
          for (const item of osmData) {
            // 이름과 주소 가공
            const nameParts = (item.display_name || '').split(',').map((s: string) => s.trim());
            const primaryName = item.name || nameParts[0] || trimmed;
            const fullAddress = nameParts.slice(0, 4).join(' ');

            let cat = '주요 장소';
            if (item.type === 'residential' || item.type === 'apartments' || primaryName.includes('아파트') || primaryName.includes('자이') || primaryName.includes('푸르지오') || primaryName.includes('래미안')) {
              cat = '아파트/주거지';
            } else if (item.type === 'station' || item.type === 'subway') {
              cat = '지하철역/기차역';
            } else if (item.class === 'boundary') {
              cat = '행정구역/동';
            }

            addResult({
              id: `osm-${item.place_id || item.osm_id || Math.random()}`,
              place_name: primaryName,
              category_name: cat,
              address_name: fullAddress,
              road_address_name: item.display_name,
              x: String(item.lon),
              y: String(item.lat),
            });
          }
        }
      }
    } catch {
      // OSM 타임아웃 무시
    }
  }

  // 3. 로컬 프리셋 및 전철역 700+ DB 빠른 매칭 보강
  const cleanQ = trimmed.replace(/역$/, '').toLowerCase();

  // 프리셋 매칭
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

  // 전국 지하철역 매칭
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

  return results.slice(0, 8);
}


