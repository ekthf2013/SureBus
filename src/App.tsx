import React, { useState, useEffect } from 'react';
import { Navbar, NavTab } from './components/Navbar';
import { SearchForm } from './components/SearchForm';
import { SearchResultCard } from './components/SearchResultCard';
import { RouteDetailModal } from './components/RouteDetailModal';
import { MapView } from './components/MapView';
import { TimetableExplorer } from './components/TimetableExplorer';
import { FullRouteMap } from './components/FullRouteMap';
import { ExcelImporter } from './components/ExcelImporter';
import { FavoritesManager } from './components/FavoritesManager';

import { SearchParams, RouteCandidate, UserFavorite } from './types/bus';
import { INITIAL_ROUTES } from './data/initialBusData';
import { calculateOptimalRoutes, findNearestSubwayHub } from './utils/searchEngine';
import { fetchOdsayCandidates } from './utils/transitRouter';
import { fetchKakaoTransitCandidates, fetchDynamicFeederBus } from './utils/kakaoTransitApi';
import { Bus, PhoneCall, Sparkles, Navigation, Info } from 'lucide-react';

export const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState<NavTab>('search');

  // Initial Search Parameters
  const [searchParams, setSearchParams] = useState<SearchParams>({
    originName: '',
    originLat: 0,
    originLng: 0,
    mode: 'commute_in',
    targetTime: '08:30',
    date: new Date().toISOString().split('T')[0],
    preference: 'balance',
    filters: {
      useCompanyBusOnly: false,
      usePublicTransit: true,
    },
  });

  const [candidates, setCandidates] = useState<RouteCandidate[]>([]);
  const [selectedCandidate, setSelectedCandidate] = useState<RouteCandidate | null>(null);
  const [modalCandidate, setModalCandidate] = useState<RouteCandidate | null>(null);

  // Run calculation whenever searchParams change
  useEffect(() => {
    // 1. 자체 고속 라우팅 엔진으로 즉각 경로 계산 (0ms 지연 없음)
    const localResults = calculateOptimalRoutes(searchParams, INITIAL_ROUTES);
    setCandidates(localResults);

    if (localResults.length > 0) {
      setSelectedCandidate(localResults[0]);
    } else {
      setSelectedCandidate(null);
    }

    // 2. 카카오 공식 대중교통 길찾기 API 및 ODsay 비동기 연동
    if (searchParams.filters.usePublicTransit && !searchParams.filters.useCompanyBusOnly && searchParams.originName) {
      let isSubscribed = true;

      // A. 카카오 API로 집 앞 ➔ 거점 전철역 간 연계 버스(Feeder Bus) 동적 조회 및 로컬 경로 자동 보완
      const nearestHub = findNearestSubwayHub(searchParams.originLat, searchParams.originLng, searchParams.originName);
      if (nearestHub) {
        fetchDynamicFeederBus(searchParams.originLat, searchParams.originLng, nearestHub.lat, nearestHub.lng)
          .then((feeder) => {
            if (!isSubscribed || !feeder) return;
            setCandidates((prev) => {
              return prev.map(cand => {
                const firstStep = cand.steps[0];
                if (firstStep && firstStep.type === 'public_bus' && cand.id.startsWith('hub-transit-')) {
                  return {
                    ...cand,
                    steps: [
                      {
                        ...firstStep,
                        title: `[집 앞 정류장] ${feeder.startStopName} 출발 ➔ ${nearestHub.name} 버스 이동 (${feeder.busLineDesc})`,
                        subtitle: `${feeder.startStopName} ➔ ${feeder.endStopName} (${feeder.busLineDesc}, 약 ${feeder.durationMinutes}분)`,
                        boardingStopName: feeder.startStopName,
                        dropoffStopName: feeder.endStopName,
                        busNo: feeder.busNo,
                        coords: feeder.coords || firstStep.coords
                      },
                      ...cand.steps.slice(1)
                    ]
                  };
                }
                return cand;
              });
            });
          })
          .catch(() => {});
      }

      // B. 카카오 공식 대중교통 경로 검색 (주변 정류장 및 실시간 운행 버스 100% 동적 조회)
      fetchKakaoTransitCandidates(searchParams)
        .then((kakaoCandidates) => {
          if (!isSubscribed || !kakaoCandidates || kakaoCandidates.length === 0) return;

          setCandidates((prev) => {
            const nonKakao = prev.filter((c) => !c.id.startsWith('kakao-transit-candidate-'));
            const merged = [...kakaoCandidates, ...nonKakao];

            // 1. 통근/셔틀 버스 우선순위 및 현실적인 추천 정렬
            // - 사내 통근/셔틀 버스를 이용할 수 있고 소요시간이 최적 대중교통 대비 합리적인 경우(15분 이내) 최우선 추천 (BEST)
            // - 만약 셔틀/통근 버스가 없거나, 억지로 타려고 과도하게 우회해야 하는 경우(15분 이상 지연) 직통 대중교통 우선 추천
            const minDuration = Math.min(...merged.map((c) => c.totalDurationMinutes));

            merged.sort((a, b) => {
              const aIsCompany = a.routeCategory === 'company_only' || a.routeCategory === 'transit_hybrid';
              const bIsCompany = b.routeCategory === 'company_only' || b.routeCategory === 'transit_hybrid';

              const aReasonable = aIsCompany && a.totalDurationMinutes <= minDuration + 15;
              const bReasonable = bIsCompany && b.totalDurationMinutes <= minDuration + 15;

              if (aReasonable && !bReasonable) return -1;
              if (!aReasonable && bReasonable) return 1;

              return a.score - b.score;
            });

            if (merged.length > 0) {
              merged.forEach(c => {
                c.badges = c.badges.filter(b => b !== 'recommend');
              });
              merged[0].badges.unshift('recommend');
            }
            return merged.slice(0, 15);
          });

          setSelectedCandidate((prev) => (prev ? prev : kakaoCandidates[0]));
        })
        .catch((err) => {
          console.warn('Kakao dynamic transit fetch failed:', err);
        });

      // ODsay 연동 (보조)
      fetchOdsayCandidates(searchParams)
        .then((odsayCandidates) => {
          if (!isSubscribed || !odsayCandidates || odsayCandidates.length === 0) return;

          setCandidates((prev) => {
            const nonOdsay = prev.filter((c) => !c.id.startsWith('odsay-'));
            const merged = [...nonOdsay, ...odsayCandidates];
            merged.sort((a, b) => a.score - b.score);
            return merged.slice(0, 15);
          });
        })
        .catch((err) => {
          console.warn('ODsay dynamic fetch failed:', err);
        });

      return () => {
        isSubscribed = false;
      };
    }
  }, [searchParams]);

  const handleSearch = (newParams: SearchParams) => {
    setSearchParams(newParams);
  };

  const handleSelectMapRoute = (cand: RouteCandidate) => {
    setSelectedCandidate(cand);
    const mapEl = document.getElementById('map-view-section');
    if (mapEl) {
      mapEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  };

  const handleSelectFavorite = (fav: UserFavorite) => {
    setSearchParams(prev => ({
      ...prev,
      originName: fav.originName,
      originLat: fav.originLat,
      originLng: fav.originLng,
      mode: fav.mode,
      targetTime: fav.targetTime,
    }));
    setActiveTab('search');
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans pb-16 md:pb-0">
      {/* Top Navbar Header */}
      <Navbar activeTab={activeTab} setActiveTab={setActiveTab} />

      {/* Main Content Body */}
      <main className="flex-1 max-w-6xl w-full mx-auto px-4 py-6">
        {/* Tab 1: Route Search & Recommendations */}
        {activeTab === 'search' && (
          <div className="space-y-6">
            {/* Quick Hero Banner */}
            <div className="glass-panel p-5 rounded-2xl border border-indigo-500/20 bg-gradient-to-r from-indigo-900/30 via-slate-900/40 to-slate-950 flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <Sparkles className="w-4 h-4 text-emerald-400" />
                  <span className="text-xs font-bold text-emerald-400 uppercase tracking-wider">스마트 경로 엔진</span>
                </div>
                <h2 className="text-lg sm:text-xl font-black text-white">
                  내 상황에 딱 맞는 최적의 출퇴근 경로
                </h2>
                <p className="text-xs text-slate-300 mt-1">
                  "어떤 버스를 타야 할지" 고민 없이 출발지와 시간을 입력하면 맞춤 추천해 드립니다.
                </p>
              </div>
              <div className="flex items-center gap-3 bg-slate-950/80 px-4 py-2.5 rounded-xl border border-slate-800 shrink-0 text-xs">
                <PhoneCall className="w-4 h-4 text-amber-400 shrink-0" />
                <div>
                  <p className="font-bold text-slate-200">운행 문의 / 분실물</p>
                  <p className="text-indigo-400 font-semibold">동영관광 010-9800-2542</p>
                </div>
              </div>
            </div>

            {/* ── 지도 (상단 중앙, 전폭) ─────────────────────────────── */}
            <div id="map-view-section" className="w-full scroll-mt-20">
              <MapView
                userLat={searchParams.originLat}
                userLng={searchParams.originLng}
                userName={searchParams.originName}
                selectedCandidate={selectedCandidate}
                onSelectOrigin={(name, lat, lng) => {
                  handleSearch({
                    ...searchParams,
                    originName: name,
                    originLat: lat,
                    originLng: lng,
                  });
                }}
              />
            </div>

            {/* ── 검색폼 + 결과 (하단 좌우) ──────────────────────────── */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
              {/* Left Column: Search Form */}
              <div className="lg:col-span-4 space-y-4">
                <SearchForm searchParams={searchParams} onSearch={handleSearch} />
              </div>

              {/* Right Column: Search Results */}
              <div className="lg:col-span-8 space-y-4">
                <div className="flex items-center justify-between px-1">
                  <h3 className="text-base font-bold text-white flex items-center gap-2">
                    <Navigation className="w-4 h-4 text-indigo-400" />
                    추천 출퇴근 경로 (총 {candidates.length}개 후보)
                  </h3>
                  <span className="text-xs text-slate-400 font-medium">
                    {searchParams.mode === 'commute_in' ? `🎯 ${searchParams.targetTime} 회사 도착 목표` : `🎯 ${searchParams.targetTime} 회사 출발`}
                  </span>
                </div>

                {candidates.length === 0 ? (
                  <div className="glass-panel p-8 text-center rounded-2xl border border-slate-800 space-y-3">
                    {!searchParams.originName ? (
                      <>
                        <div className="w-12 h-12 rounded-2xl bg-indigo-500/10 border border-indigo-500/30 flex items-center justify-center text-indigo-400 mx-auto">
                          <Navigation className="w-6 h-6 animate-pulse" />
                        </div>
                        <p className="text-sm font-bold text-white">출발지 또는 목적지를 입력해 주세요</p>
                        <p className="text-xs text-slate-400">
                          집 주소, 아파트명, 건물명 등을 입력하시면 최적의 출퇴근 경로와 탑승 시간표가 자동으로 계산됩니다.
                        </p>
                      </>
                    ) : (
                      <>
                        <Info className="w-8 h-8 text-amber-400 mx-auto" />
                        <p className="text-sm font-bold text-white">조건에 부합하는 경로를 찾을 수 없습니다.</p>
                        <p className="text-xs text-slate-400">
                          도착/출발 희망시간을 조정하거나 대중교통 연계 체크박스를 확인해 주세요.
                        </p>
                      </>
                    )}
                  </div>
                ) : (
                  candidates.map((cand) => (
                    <SearchResultCard
                      key={cand.id}
                      candidate={cand}
                      isSelected={selectedCandidate?.id === cand.id}
                      onSelectDetail={(c) => handleSelectMapRoute(c)}
                      onOpenModal={(c) => setModalCandidate(c)}
                      userLat={searchParams.originLat}
                      userLng={searchParams.originLng}
                      userName={searchParams.originName}
                    />
                  ))
                )}
              </div>
            </div>
          </div>
        )}

        {/* Tab 2: Full Route Diagram */}
        {activeTab === 'routes' && <FullRouteMap />}

        {/* Tab 3: Timetable Viewer */}
        {activeTab === 'timetable' && <TimetableExplorer />}

        {/* Tab 4: User Favorites */}
        {activeTab === 'favorites' && (
          <FavoritesManager onSelectFavorite={handleSelectFavorite} />
        )}

        {/* Tab 5: Admin Excel Importer */}
        {activeTab === 'admin' && <ExcelImporter />}
      </main>

      {/* Detail Timeline Modal (별도 팝업 보기 버튼을 눌렀을 때만 열림) */}
      <RouteDetailModal
        candidate={modalCandidate}
        onClose={() => setModalCandidate(null)}
      />

      {/* Footer */}
      <footer className="mt-auto border-t border-slate-900 bg-slate-950 py-6 text-center text-xs text-slate-500 space-y-1">
        <p className="font-semibold text-slate-400">
          5사 컨소시엄 (텔레칩스 · 클레무브 · 교촌 · 지란지교 · 슈어소프트) 통근버스 최적 경로 서비스
        </p>
        <p className="text-[11px] text-slate-600">
          실제 버스시간표__최종공지.xlsx 데이터 기반 | 개정일: 2026.08.03 | 운송사 문의: 동영관광 010-9800-2542
        </p>
      </footer>
    </div>
  );
};

export default App;
