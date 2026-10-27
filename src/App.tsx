import React, { useState, useEffect, useMemo } from 'react';
import { Navbar, NavTab } from './components/Navbar';
import { SearchForm } from './components/SearchForm';
import { SearchResultCard } from './components/SearchResultCard';
import { RouteDetailModal } from './components/RouteDetailModal';
import { MapView } from './components/MapView';
import { TimetableExplorer } from './components/TimetableExplorer';
import { FullRouteMap } from './components/FullRouteMap';
import { FavoritesManager } from './components/FavoritesManager';

import { SearchParams, RouteCandidate, UserFavorite } from './types/bus';
import { INITIAL_ROUTES } from './data/initialBusData';
import { calculateOptimalRoutes, findNearestSubwayHub } from './utils/searchEngine';
import { fetchOdsayCandidates } from './utils/transitRouter';
import { fetchKakaoTransitCandidates, fetchDynamicFeederBus, callKakaoPublicTraffic } from './utils/kakaoTransitApi';
import { useApiQuotaStatus } from './utils/apiQuotaManager';
import { Bus, PhoneCall, Sparkles, Navigation, Info, AlertTriangle, Zap, Footprints, ArrowLeftRight, SlidersHorizontal } from 'lucide-react';

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
  const quotaStatus = useApiQuotaStatus();

  // 상단 빠른 필터 & 정렬 옵션 상태
  const [filterCategory, setFilterCategory] = useState<'all' | 'company' | 'public'>('all');
  const [sortBy, setSortBy] = useState<'recommended' | 'fastest' | 'min_walk' | 'min_transfer'>('recommended');

  // 앱 마운트 시 카카오 대중교통 API 가용성(일일 쿼터 초과 여부) 사전 점검
  useEffect(() => {
    callKakaoPublicTraffic(127.147, 37.591, 127.088, 37.406).catch(() => { });
  }, []);

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
          .catch(() => { });
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

  // ── 사내 셔틀/통근 버스 사용 여부 판별 헬퍼 ──
  const isCompanyCandidate = (cand: RouteCandidate) => {
    return (
      cand.routeCategory === 'company_only' ||
      cand.routeCategory === 'transit_hybrid' ||
      cand.steps.some(s => s.type === 'commute_bus' || s.type === 'shuttle')
    );
  };

  // 실시간 사내 셔틀/통근 버스 경로 개수
  const companyRouteCount = useMemo(() => {
    return candidates.filter(isCompanyCandidate).length;
  }, [candidates]);

  // 실시간 일반 대중교통 경로 개수
  const publicRouteCount = useMemo(() => {
    return candidates.filter(c => !isCompanyCandidate(c)).length;
  }, [candidates]);

  // 필터링 및 정렬이 적용된 최종 표시 목록
  const filteredCandidates = useMemo(() => {
    let list = [...candidates];

    // 1. 카테고리 필터링
    if (filterCategory === 'company') {
      list = list.filter(isCompanyCandidate);
    } else if (filterCategory === 'public') {
      list = list.filter(c => !isCompanyCandidate(c));
    }

    // 2. 정렬 옵션 적용
    if (sortBy === 'fastest') {
      list.sort((a, b) => a.totalDurationMinutes - b.totalDurationMinutes);
    } else if (sortBy === 'min_walk') {
      list.sort((a, b) => {
        if (a.walkMinutes !== b.walkMinutes) {
          return a.walkMinutes - b.walkMinutes;
        }
        return a.totalDurationMinutes - b.totalDurationMinutes;
      });
    } else if (sortBy === 'min_transfer') {
      list.sort((a, b) => {
        if (a.transferCount !== b.transferCount) {
          return a.transferCount - b.transferCount;
        }
        return a.totalDurationMinutes - b.totalDurationMinutes;
      });
    }
    // 'recommended'는 이미 자체 스코어 및 셔틀 우대 우선순위가 반영된 기본 정렬을 유지합니다.

    return list;
  }, [candidates, filterCategory, sortBy]);

  // 필터/정렬 변경 시 현재 선택된 후보가 표시 목록에 없으면 첫 번째 후보 자동 선택
  useEffect(() => {
    if (filteredCandidates.length > 0) {
      if (!selectedCandidate || !filteredCandidates.some(c => c.id === selectedCandidate.id)) {
        setSelectedCandidate(filteredCandidates[0]);
      }
    }
  }, [filteredCandidates, selectedCandidate]);

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
            <div className="glass-panel p-5 rounded-2xl border border-blue-500/30 bg-gradient-to-r from-blue-950/40 via-slate-900/60 to-slate-950 flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-xl">
              <div>
                <h2 className="text-lg sm:text-xl font-black text-white">
                  내 위치에서 가장 효율적인 출퇴근 경로
                </h2>
                <p className="text-xs text-slate-300 mt-1">
                  사내 통근버스 · 무료 셔틀 · 수도권 전철 · 연계 시내버스를 종합 분석하여 가장 빠른 경로를 스마트 추천합니다.
                </p>
              </div>
              <div className="flex items-center gap-3 bg-slate-950/80 px-4 py-2.5 rounded-xl border border-slate-800 shrink-0 text-xs">
                <PhoneCall className="w-4 h-4 text-amber-400 shrink-0" />
                <div>
                  <p className="font-bold text-slate-200">운행 문의 / 분실물</p>
                  <p className="text-sky-400 font-semibold">동영관광 010-9800-2542</p>
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
                {/* ── API 쿼터 소진 알림 배너 ── */}
                {quotaStatus.isExceeded && (
                  <div className="p-4 rounded-2xl border border-rose-500/40 bg-gradient-to-r from-rose-950/60 via-slate-900/90 to-amber-950/40 shadow-lg">
                    <div className="flex items-start gap-3">
                      <div className="w-8 h-8 rounded-xl bg-rose-500/20 border border-rose-500/40 flex items-center justify-center shrink-0 text-rose-400 font-bold text-base">
                        <AlertTriangle className="w-5 h-5 text-rose-400" />
                      </div>
                      <div className="space-y-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h4 className="text-sm font-bold text-white">대중교통 길찾기 API 일일 사용량 소진 (무료 한도 초과)</h4>
                          <span className="text-[10px] px-2 py-0.5 rounded-full bg-rose-500/20 text-rose-300 border border-rose-500/30 font-bold">
                            API 사용 종료
                          </span>
                        </div>
                        <p className="text-xs text-slate-300 leading-relaxed">
                          {quotaStatus.kakaoTrafficExceeded && quotaStatus.odsayExceeded
                            ? '카카오 대중교통 길찾기 및 ODsay API의 일일 무료 호출 쿼터가 모두 소진되어 실시간 정류장/버스 경로 조회가 일시 제한됩니다. 현재는 자체 기본 경로 엔진으로 운행 경로를 안내하고 있습니다. (자정 리셋 후 정상 재개)'
                            : quotaStatus.kakaoTrafficExceeded
                              ? '카카오 대중교통 길찾기 API의 일일 무료 호출 쿼터가 소진되어 실시간 정류장/버스 경로 조회가 일시 제한됩니다. 현재는 자체 기본 경로 엔진으로 운행 경로를 안내하고 있습니다. (자정 리셋 후 정상 재개)'
                              : 'ODsay 대중교통 API의 일일 무료 호출 한도가 초과되어 실시간 경로 조회가 제한됩니다.'}
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                <div className="flex items-center justify-between px-1">
                  <h3 className="text-base font-bold text-white flex items-center gap-2">
                    <Navigation className="w-4 h-4 text-indigo-400" />
                    추천 출퇴근 경로
                    {candidates.length > 0 && (
                      <span className="text-xs px-2 py-0.5 rounded-md bg-indigo-500/20 text-indigo-300 font-semibold border border-indigo-500/30">
                        {filterCategory !== 'all' ? `${filteredCandidates.length}개 표시 / 전체 ${candidates.length}개` : `총 ${candidates.length}개 후보`}
                      </span>
                    )}
                  </h3>
                  <span className="text-xs text-slate-400 font-medium">
                    {searchParams.mode === 'commute_in' ? `🎯 ${searchParams.targetTime} 회사 도착 목표` : `🎯 ${searchParams.targetTime} 회사 출발`}
                  </span>
                </div>

                {/* ── 상단 빠른 필터 & 정렬 컨트롤 바 ── */}
                {candidates.length > 0 && (
                  <div className="glass-panel p-3.5 rounded-2xl border border-slate-800/90 bg-slate-900/70 shadow-lg space-y-3">
                    {/* 상단 탭: 경로 유형 필터 (전체 / 사내 셔틀·통근 / 일반 대중교통) */}
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 pb-2.5 border-b border-slate-800/70">
                      <div className="flex items-center gap-2">
                        <SlidersHorizontal className="w-4 h-4 text-indigo-400" />
                        <span className="text-xs font-bold text-slate-300">경로 필터</span>
                      </div>
                      <div className="flex items-center gap-1.5 flex-wrap">
                        {/* 1. 전체 보기 */}
                        <button
                          type="button"
                          onClick={() => setFilterCategory('all')}
                          className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
                            filterCategory === 'all'
                              ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30 border border-indigo-500'
                              : 'bg-slate-800/70 text-slate-400 hover:text-slate-200 hover:bg-slate-800 border border-slate-700/60'
                          }`}
                        >
                          전체
                          <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-bold ${
                            filterCategory === 'all' ? 'bg-indigo-800/90 text-indigo-100' : 'bg-slate-700/80 text-slate-400'
                          }`}>
                            {candidates.length}
                          </span>
                        </button>

                        {/* 2. 사내 셔틀 / 통근 버스 필터 */}
                        <button
                          type="button"
                          onClick={() => setFilterCategory('company')}
                          className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
                            filterCategory === 'company'
                              ? 'bg-gradient-to-r from-emerald-600 to-teal-600 text-white shadow-lg shadow-emerald-600/30 border border-emerald-400 ring-1 ring-emerald-400/50'
                              : 'bg-slate-800/70 text-emerald-400 hover:text-emerald-300 hover:bg-emerald-950/40 border border-emerald-900/50'
                          }`}
                        >
                          <Bus className="w-3.5 h-3.5 text-emerald-300" />
                          사내 셔틀/통근
                          <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-bold ${
                            filterCategory === 'company'
                              ? 'bg-emerald-800/90 text-white'
                              : 'bg-emerald-950/90 text-emerald-300 border border-emerald-700/50'
                          }`}>
                            {companyRouteCount}
                          </span>
                        </button>

                        {/* 3. 일반 대중교통만 */}
                        <button
                          type="button"
                          onClick={() => setFilterCategory('public')}
                          className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
                            filterCategory === 'public'
                              ? 'bg-sky-600 text-white shadow-md shadow-sky-600/30 border border-sky-500'
                              : 'bg-slate-800/70 text-slate-400 hover:text-slate-200 hover:bg-slate-800 border border-slate-700/60'
                          }`}
                        >
                          일반 대중교통
                          <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-bold ${
                            filterCategory === 'public' ? 'bg-sky-800/90 text-sky-100' : 'bg-slate-700/80 text-slate-400'
                          }`}>
                            {publicRouteCount}
                          </span>
                        </button>
                      </div>
                    </div>

                    {/* 하단 정렬: 추천순, 최단시간, 최소도보, 최소환승 */}
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pt-0.5">
                      <div className="flex items-center gap-2">
                        <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                        <span className="text-xs font-semibold text-slate-400">정렬 기준</span>
                      </div>
                      <div className="grid grid-cols-2 sm:flex sm:items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => setSortBy('recommended')}
                          className={`px-2.5 py-1.5 rounded-xl text-xs font-semibold transition-all flex items-center justify-center gap-1.5 ${
                            sortBy === 'recommended'
                              ? 'bg-amber-500/20 text-amber-300 border border-amber-500/50 font-bold shadow-sm'
                              : 'bg-slate-800/50 text-slate-400 hover:text-slate-200 hover:bg-slate-800/80 border border-slate-800'
                          }`}
                        >
                          <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                          추천순
                        </button>

                        <button
                          type="button"
                          onClick={() => setSortBy('fastest')}
                          className={`px-2.5 py-1.5 rounded-xl text-xs font-semibold transition-all flex items-center justify-center gap-1.5 ${
                            sortBy === 'fastest'
                              ? 'bg-indigo-500/20 text-indigo-300 border border-indigo-500/50 font-bold shadow-sm'
                              : 'bg-slate-800/50 text-slate-400 hover:text-slate-200 hover:bg-slate-800/80 border border-slate-800'
                          }`}
                        >
                          <Zap className="w-3.5 h-3.5 text-indigo-400" />
                          최단시간
                        </button>

                        <button
                          type="button"
                          onClick={() => setSortBy('min_walk')}
                          className={`px-2.5 py-1.5 rounded-xl text-xs font-semibold transition-all flex items-center justify-center gap-1.5 ${
                            sortBy === 'min_walk'
                              ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/50 font-bold shadow-sm'
                              : 'bg-slate-800/50 text-slate-400 hover:text-slate-200 hover:bg-slate-800/80 border border-slate-800'
                          }`}
                        >
                          <Footprints className="w-3.5 h-3.5 text-emerald-400" />
                          최소도보
                        </button>

                        <button
                          type="button"
                          onClick={() => setSortBy('min_transfer')}
                          className={`px-2.5 py-1.5 rounded-xl text-xs font-semibold transition-all flex items-center justify-center gap-1.5 ${
                            sortBy === 'min_transfer'
                              ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/50 font-bold shadow-sm'
                              : 'bg-slate-800/50 text-slate-400 hover:text-slate-200 hover:bg-slate-800/80 border border-slate-800'
                          }`}
                        >
                          <ArrowLeftRight className="w-3.5 h-3.5 text-cyan-400" />
                          최소환승
                        </button>
                      </div>
                    </div>
                  </div>
                )}

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
                          도착/출발 희망시간을 조정해 주세요.
                        </p>
                      </>
                    )}
                  </div>
                ) : filteredCandidates.length === 0 ? (
                  <div className="glass-panel p-8 text-center rounded-2xl border border-slate-800 space-y-3">
                    <Info className="w-8 h-8 text-amber-400 mx-auto" />
                    <p className="text-sm font-bold text-white">
                      {filterCategory === 'company'
                        ? '이 출발지/시간대에는 운행 중인 사내 셔틀/통근버스 경로가 없습니다.'
                        : '선택하신 조건에 해당하는 경로가 없습니다.'}
                    </p>
                    <p className="text-xs text-slate-400">
                      {filterCategory === 'company'
                        ? '대중교통을 포함한 전체 경로를 확인해 보세요.'
                        : '정렬이나 필터 기준을 다시 선택해 보세요.'}
                    </p>
                    <button
                      type="button"
                      onClick={() => setFilterCategory('all')}
                      className="mt-2 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold transition-all shadow-md inline-flex items-center gap-1.5"
                    >
                      전체 경로 보기 ({candidates.length}개)
                    </button>
                  </div>
                ) : (
                  filteredCandidates.map((cand) => (
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
      </main>

      {/* Detail Timeline Modal (별도 팝업 보기 버튼을 눌렀을 때만 열림) */}
      <RouteDetailModal
        candidate={modalCandidate}
        onClose={() => setModalCandidate(null)}
      />

      {/* Footer */}
      <footer className="mt-auto border-t border-slate-900 bg-slate-950 py-6 text-center text-xs text-slate-500 space-y-1">
        <p className="font-semibold text-slate-400">
          슈어 출퇴근 최적 경로 서비스
        </p>
        <p className="text-[11px] text-slate-600">
          실제 버스시간표__최종공지.xlsx 데이터 기반 | 개정일: 2026.08.03 | 운송사 문의: 동영관광 010-9800-2542
        </p>
      </footer>
    </div>
  );
};

export default App;
