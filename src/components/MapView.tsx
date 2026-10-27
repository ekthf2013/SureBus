import React, { useEffect, useRef, useState, useCallback } from 'react';
import { STATION_COORDS, INITIAL_ROUTES } from '../data/initialBusData';
import { SUBWAY_STATION_COORDS } from '../utils/subwayStationsData';
import { RouteCandidate } from '../types/bus';
import { loadKakaoMapSDK } from '../utils/kakaoMapLoader';
import { Loader2, AlertTriangle, MapPin, X, Navigation, ExternalLink, Clock, Bus, CheckCircle2 } from 'lucide-react';

// 슈어소프트테크 판교캠퍼스 사옥 좌표 (카카오 Local API 실측값)
const HQ_LAT = 37.40698104234706;
const HQ_LNG = 127.08871065248748;

interface StationRouteInfo {
  routeName: string;
  busType: string;
  color: string;
  times: string[];
}

function normalizeStationName(name: string): string {
  return name.replace(/\s*\(.*?\)/g, '').replace(/역$/, '').trim();
}

function isStationMatch(target: string, candidate: string): boolean {
  if (target === candidate) return true;
  const normTarget = normalizeStationName(target);
  const normCandidate = normalizeStationName(candidate);
  if (normTarget === normCandidate) return true;

  // 사옥 별칭 처리
  if ((normTarget === '사옥' || normTarget === '도착(사옥)') && (normCandidate === '사옥' || normCandidate === '도착(사옥)')) {
    return true;
  }

  return false;
}

function getStationRouteInfo(stationName: string): StationRouteInfo[] {
  const results: StationRouteInfo[] = [];

  INITIAL_ROUTES.forEach((route) => {
    const matchingTimes: string[] = [];
    route.inbound_trips.forEach((trip) => {
      Object.entries(trip.times).forEach(([stName, time]) => {
        if (isStationMatch(stationName, stName)) {
          matchingTimes.push(time);
        }
      });
    });

    if (matchingTimes.length > 0) {
      results.push({
        routeName: route.name,
        busType: route.bus_type === 'shuttle' ? '무료 셔틀' : '통근버스 (1,500원)',
        color: route.color,
        times: [...new Set(matchingTimes)],
      });
    }
  });

  return results;
}

interface PlaceDetail {
  emoji: string;
  label: string;
  sublabel: string;
  address: string;
  lat: number;
  lng: number;
  routes: StationRouteInfo[];
  isHQ: boolean;
  isUserOrigin: boolean;
}

interface MapViewProps {
  userLat: number;
  userLng: number;
  userName: string;
  selectedCandidate?: RouteCandidate | null;
  onSelectOrigin?: (name: string, lat: number, lng: number) => void;
}

type LoadState = 'idle' | 'loading' | 'ready' | 'error';

export const MapView: React.FC<MapViewProps> = ({
  userLat,
  userLng,
  userName,
  selectedCandidate,
  onSelectOrigin,
}) => {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<kakao.maps.Map | null>(null);
  const markersRef = useRef<kakao.maps.CustomOverlay[]>([]);
  const polylineRef = useRef<kakao.maps.Polyline | null>(null);

  const [loadState, setLoadState] = useState<LoadState>('idle');
  const [errorMsg, setErrorMsg] = useState<string>('');
  const [selectedPlace, setSelectedPlace] = useState<PlaceDetail | null>(null);

  // ─── 지도 초기화 ───────────────────────────────────────────────
  const initMap = useCallback(() => {
    if (!mapContainerRef.current || mapInstanceRef.current) return;

    const map = new kakao.maps.Map(mapContainerRef.current, {
      center: new kakao.maps.LatLng(HQ_LAT, HQ_LNG), // 사옥 기준 기본 중심
      level: 6,
    });

    mapInstanceRef.current = map;
  }, []);

  // ─── SDK 로드 ───────────────────────────────────────────────────
  useEffect(() => {
    setLoadState('loading');
    loadKakaoMapSDK()
      .then(() => {
        initMap();
        setLoadState('ready');
      })
      .catch((err: Error) => {
        console.error(err);
        setErrorMsg(err.message);
        setLoadState('error');
      });
  }, [initMap]);

  // ─── 마커/폴리라인 갱신 ─────────────────────────────────────────
  useEffect(() => {
    if (loadState !== 'ready' || !mapInstanceRef.current) return;

    const map = mapInstanceRef.current;

    // 기존 마커 제거
    markersRef.current.forEach((marker) => {
      marker.setMap(null);
    });
    markersRef.current = [];

    // 기존 폴리라인 제거
    if (polylineRef.current) {
      polylineRef.current.setMap(null);
      polylineRef.current = null;
    }

    // ─── 헬퍼: 커스텀 마커 오버레이 생성 ──────────────────────────
    const createMarker = (
      lat: number,
      lng: number,
      emoji: string,
      bgColor: string,
      borderColor: string,
      label: string,
      sublabel: string,
      address: string,
      isHQ: boolean = false,
      isUserOrigin: boolean = false,
      zIndex: number = 1
    ): kakao.maps.CustomOverlay => {
      const position = new kakao.maps.LatLng(lat, lng);

      const markerEl = document.createElement('div');
      markerEl.style.cssText =
        'display:flex;flex-direction:column;align-items:center;cursor:pointer;filter:drop-shadow(0 4px 10px rgba(0,0,0,0.6));transition:transform 0.15s ease;';
      markerEl.onmouseenter = () => {
        markerEl.style.transform = 'scale(1.15)';
      };
      markerEl.onmouseleave = () => {
        markerEl.style.transform = 'scale(1)';
      };

      const iconEl = document.createElement('div');
      iconEl.style.cssText = `width:38px;height:38px;border-radius:50%;background:${bgColor};border:2.5px solid ${borderColor};display:flex;align-items:center;justify-content:center;font-size:18px;`;
      iconEl.textContent = emoji;

      const labelEl = document.createElement('div');
      labelEl.style.cssText = `margin-top:3px;background:rgba(15,23,42,0.95);border:1px solid ${borderColor};border-radius:6px;padding:2px 6px;font-size:10px;font-weight:700;color:#f1f5f9;white-space:nowrap;max-width:110px;overflow:hidden;text-overflow:ellipsis;`;
      labelEl.textContent = label;

      markerEl.appendChild(iconEl);
      markerEl.appendChild(labelEl);

      const overlay = new kakao.maps.CustomOverlay({
        map,
        position,
        content: markerEl,
        yAnchor: 1,
        zIndex,
      });

      // 핀 클릭 핸들러: 지도를 부드럽게 이동시키고 상세 정보 패널 활성화
      markerEl.addEventListener('click', (e) => {
        e.stopPropagation();
        map.panTo(position);
        setSelectedPlace({
          emoji,
          label,
          sublabel,
          address,
          lat,
          lng,
          routes: getStationRouteInfo(label),
          isHQ,
          isUserOrigin,
        });
      });

      return overlay;
    };

    // ─── 1. 사옥 마커 ──────────────────────────────────────────────
    const hqCoord = STATION_COORDS['사옥'];
    if (hqCoord) {
      const ref = createMarker(
        hqCoord.lat,
        hqCoord.lng,
        '🏢',
        'linear-gradient(135deg,#4f46e5,#7c3aed)',
        '#818cf8',
        '판교 사옥 (슈어소프트)',
        '슈어소프트테크 판교캠퍼스',
        hqCoord.address,
        true,
        false,
        10
      );
      markersRef.current.push(ref);
    }

    // ─── 2. 내 출발지 마커 ────────────────────────────────────────
    if (userLat && userLng && userLat !== 0 && userLng !== 0) {
      const ref = createMarker(
        userLat,
        userLng,
        '🏠',
        'linear-gradient(135deg,#059669,#10b981)',
        '#34d399',
        userName || '내 출발지',
        '설정된 출발지',
        userName || '입력된 출발 위치',
        false,
        true,
        9
      );
      markersRef.current.push(ref);
    }

    // ─── 3. 주요 정류장 마커 ───────────────────────────────────────
    Object.entries(STATION_COORDS).forEach(([name, coord]) => {
      if (name === '사옥' || name === '도착(사옥)') return;
      const ref = createMarker(
        coord.lat,
        coord.lng,
        '🚏',
        'linear-gradient(135deg,#1e293b,#334155)',
        '#64748b',
        name,
        coord.address,
        coord.address,
        false,
        false,
        2
      );
      markersRef.current.push(ref);
    });

    // ─── 4. 선택된 경로 폴리라인 및 경유지 하이라이트 ─────────────
    if (selectedCandidate) {
      const validPoints: { lat: number; lng: number; title: string }[] = [];

      // 각 단계(steps)를 순서대로 순회하며 경로 좌표를 순차적으로 추출
      selectedCandidate.steps.forEach((st, idx) => {
        let lat = st.coords?.lat;
        let lng = st.coords?.lng;

        // 좌표가 없는 단계는 명칭(사옥, 지하철역, 정류소 등)으로 정확한 좌표 매핑
        if (!lat || !lng || (lat === 0 && lng === 0)) {
          if (st.title.includes('사옥') || (st.subtitle && st.subtitle.includes('사옥')) || st.title.includes('인피니티타워')) {
            lat = HQ_LAT;
            lng = HQ_LNG;
          } else if (userLat && userLng && (st.title.includes(userName) || (idx === 0 && !st.title.includes('사옥')))) {
            lat = userLat;
            lng = userLng;
          } else {
            // 주요 정류장 매핑
            for (const [stName, coord] of Object.entries(STATION_COORDS)) {
              if (st.title.includes(stName) || (st.subtitle && st.subtitle.includes(stName))) {
                lat = coord.lat;
                lng = coord.lng;
                break;
              }
            }
            // 지하철역 매핑
            if (!lat || !lng) {
              for (const [subName, coord] of Object.entries(SUBWAY_STATION_COORDS)) {
                if (st.title.includes(subName) || (st.subtitle && st.subtitle.includes(subName))) {
                  lat = coord.lat;
                  lng = coord.lng;
                  break;
                }
              }
            }
          }
        }

        if (lat && lng && lat !== 0 && lng !== 0) {
          const last = validPoints[validPoints.length - 1];
          // 연속된 중복 좌표 제거 (20m 이내 중복 방지)
          if (!last || Math.hypot(last.lat - lat, last.lng - lng) > 0.0002) {
            validPoints.push({ lat, lng, title: st.title });
          }
        }
      });

      // 좌표가 2개 미만인 경우 기본 2점(출발지 ➔ 사옥 또는 사옥 ➔ 목적지) 연결
      if (validPoints.length < 2) {
        if (userLat && userLng && hqCoord) {
          const isCommuteOut = selectedCandidate.steps[0]?.title.includes('사옥') || selectedCandidate.title.includes('귀가') || selectedCandidate.title.includes('퇴근');
          if (isCommuteOut) {
            validPoints.push({ lat: HQ_LAT, lng: HQ_LNG, title: '판교 사옥 출발' });
            validPoints.push({ lat: userLat, lng: userLng, title: userName || '목적지' });
          } else {
            validPoints.push({ lat: userLat, lng: userLng, title: userName || '출발지' });
            validPoints.push({ lat: HQ_LAT, lng: HQ_LNG, title: '판교 사옥 도착' });
          }
        }
      }

      if (validPoints.length >= 2) {
        const kakaoPoints = validPoints.map((p) => new kakao.maps.LatLng(p.lat, p.lng));
        const routeColor = selectedCandidate.routeColor || '#3b82f6';

        // 깔끔하고 선명한 단일 경로 폴리라인 생성
        const polyline = new kakao.maps.Polyline({
          map,
          path: kakaoPoints,
          strokeWeight: 6,
          strokeColor: routeColor,
          strokeOpacity: 0.9,
          strokeStyle: 'solid',
        });
        polylineRef.current = polyline;

        // 환승/경유 지점 마커 추가 (출발지와 도착지를 제외한 중간 경유역)
        validPoints.forEach((p, idx) => {
          if (idx === 0 || idx === validPoints.length - 1) return;
          const cleanTitle = p.title
            .replace(/(환승|탑승|이동|하차|출발|도착|승강장)/g, '')
            .trim()
            .split(' ')[0] || `경유 ${idx}`;

          const stepOverlay = createMarker(
            p.lat,
            p.lng,
            '🔄',
            'linear-gradient(135deg,#f59e0b,#d97706)',
            '#fbbf24',
            cleanTitle,
            p.title,
            p.title,
            false,
            false,
            8
          );
          markersRef.current.push(stepOverlay);
        });

        // 지도 뷰포트를 전체 경로에 맞춤 (패딩 40px)
        const bounds = new kakao.maps.LatLngBounds();
        kakaoPoints.forEach((p) => bounds.extend(p));
        map.setBounds(bounds, 40, 40, 40, 40);
      }
    } else {
      map.setCenter(new kakao.maps.LatLng(HQ_LAT, HQ_LNG));
      map.setLevel(6);
    }
  }, [loadState, userLat, userLng, userName, selectedCandidate]);

  const handleSetAsOrigin = (place: PlaceDetail) => {
    if (onSelectOrigin) {
      onSelectOrigin(place.label, place.lat, place.lng);
    }
  };

  return (
    <div className="glass-panel rounded-2xl p-4 border border-slate-800 shadow-2xl space-y-3">
      {/* 헤더 */}
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-bold text-white flex items-center gap-2">
          <MapPin className="w-4 h-4 text-indigo-400" />
          노선 및 정류장 지도
        </h3>
        <span className="text-[11px] text-slate-400 flex items-center gap-1">
          💡 핀을 누르면 정류장 상세 정보 및 시간표를 확인할 수 있습니다.
        </span>
      </div>

      {/* 지도 컨테이너 */}
      <div className="relative w-full h-80 sm:h-96 rounded-xl border border-slate-800 overflow-hidden">
        {loadState === 'loading' && (
          <div className="absolute inset-0 z-20 flex flex-col items-center justify-center bg-slate-950/90 gap-3">
            <Loader2 className="w-8 h-8 text-indigo-400 animate-spin" />
            <p className="text-xs text-slate-400 font-medium">카카오맵 로딩 중...</p>
          </div>
        )}

        {loadState === 'error' && (
          <div className="absolute inset-0 z-20 flex flex-col items-center justify-center bg-slate-950/90 gap-3 p-4">
            <AlertTriangle className="w-8 h-8 text-amber-400" />
            <p className="text-xs font-bold text-amber-400">카카오맵 로드 실패</p>
            <p className="text-[11px] text-slate-400 text-center leading-relaxed">{errorMsg}</p>
            <p className="text-[10px] text-slate-500 text-center">
              카카오 개발자 콘솔에서 현재 도메인(localhost)을 허용해 주세요.
            </p>
          </div>
        )}

        <div ref={mapContainerRef} className="w-full h-full" />

        {/* ── 선택된 핀 정보 오버레이 카드 ── */}
        {selectedPlace && (
          <div className="absolute bottom-3 left-3 right-3 sm:right-auto sm:max-w-md z-30 bg-slate-900/95 backdrop-blur-md border border-indigo-500/40 rounded-xl p-4 shadow-2xl text-white space-y-2.5 animate-in fade-in slide-in-from-bottom-2 duration-200">
            <div className="flex items-start justify-between gap-2 border-b border-slate-800 pb-2">
              <div className="flex items-center gap-2">
                <span className="text-2xl">{selectedPlace.emoji}</span>
                <div>
                  <h4 className="text-sm font-bold text-white flex items-center gap-1.5">
                    {selectedPlace.label}
                    {selectedPlace.isHQ && (
                      <span className="text-[10px] bg-indigo-500/20 text-indigo-300 px-1.5 py-0.5 rounded border border-indigo-500/30">
                        회사 본사
                      </span>
                    )}
                    {selectedPlace.isUserOrigin && (
                      <span className="text-[10px] bg-emerald-500/20 text-emerald-300 px-1.5 py-0.5 rounded border border-emerald-500/30">
                        내 출발지
                      </span>
                    )}
                  </h4>
                  <p className="text-[11px] text-slate-400 flex items-center gap-1 mt-0.5">
                    <MapPin className="w-3 h-3 text-emerald-400 shrink-0" />
                    {selectedPlace.address}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setSelectedPlace(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
                title="닫기"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* 정차 통근버스 및 시간표 */}
            {selectedPlace.routes.length > 0 ? (
              <div className="space-y-1.5 pt-1">
                <p className="text-[11px] font-bold text-indigo-300 flex items-center gap-1">
                  <Bus className="w-3.5 h-3.5" />
                  정차 통근·셔틀 노선 ({selectedPlace.routes.length}개):
                </p>
                <div className="space-y-1.5 max-h-28 overflow-y-auto pr-1">
                  {selectedPlace.routes.map((rt, idx) => (
                    <div
                      key={idx}
                      className="bg-slate-950/70 p-2 rounded-lg border border-slate-800 flex flex-col gap-1 text-[11px]"
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-slate-200" style={{ color: rt.color }}>
                          {rt.routeName}
                        </span>
                        <span className="text-[10px] text-slate-400">{rt.busType}</span>
                      </div>
                      <div className="flex flex-wrap gap-1 items-center">
                        <Clock className="w-3 h-3 text-slate-500 shrink-0" />
                        {rt.times.map((t, tidx) => (
                          <span
                            key={tidx}
                            className="px-1.5 py-0.2 rounded bg-slate-800 text-[10px] font-mono text-emerald-300 border border-slate-700"
                          >
                            {t}
                          </span>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              !selectedPlace.isHQ && (
                <p className="text-[11px] text-slate-400">
                  대중교통(지하철/버스) 연계 정류장입니다.
                </p>
              )
            )}

            {/* 하단 액션 버튼 */}
            <div className="flex items-center justify-between gap-2 pt-1 border-t border-slate-800/80">
              {!selectedPlace.isHQ && onSelectOrigin && (
                <button
                  type="button"
                  onClick={() => handleSetAsOrigin(selectedPlace)}
                  className="px-3 py-1.5 rounded-lg bg-emerald-600/30 hover:bg-emerald-600/50 text-emerald-300 text-xs font-bold border border-emerald-500/40 flex items-center gap-1.5 transition-all cursor-pointer"
                >
                  <Navigation className="w-3.5 h-3.5" />
                  이 정류장을 출발지로 설정
                </button>
              )}

              <a
                href={`https://map.kakao.com/link/search/${encodeURIComponent(selectedPlace.label)}`}
                target="_blank"
                rel="noopener noreferrer"
                className="ml-auto px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium flex items-center gap-1 border border-slate-700 transition-colors"
              >
                <ExternalLink className="w-3 h-3 text-amber-400" />
                카카오맵 보기
              </a>
            </div>
          </div>
        )}
      </div>

      {/* 범례 */}
      {loadState === 'ready' && (
        <div className="flex flex-wrap gap-x-4 gap-y-1.5 px-1">
          {[
            { emoji: '🏢', label: '사옥', color: '#818cf8' },
            { emoji: '🏠', label: '내 출발지', color: '#34d399' },
            { emoji: '🚏', label: '정류장 (클릭 시 정보)', color: '#475569' },
          ].map(({ emoji, label, color }) => (
            <div key={label} className="flex items-center gap-1.5 text-[11px] text-slate-400">
              <span
                className="w-3 h-3 rounded-full inline-block"
                style={{ background: color }}
              />
              {emoji} {label}
            </div>
          ))}
          {selectedCandidate && (
            <div className="flex items-center gap-1.5 text-[11px] text-indigo-400 font-semibold">
              ···선택 경로
            </div>
          )}
        </div>
      )}
    </div>
  );
};

