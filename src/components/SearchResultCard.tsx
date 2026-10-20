import React, { useState, useEffect } from 'react';
import { RouteCandidate, BadgeType } from '../types/bus';
import { addStoredFavorite, removeStoredFavorite, isCandidateFavorite } from '../utils/favoritesStorage';
import { LiveTransitStepBadge, getSubwayLineColor } from './LiveTransitStepBadge';
import { Trophy, Zap, Footprints, ChevronDown, ChevronUp, ArrowRight, ExternalLink, MapPin, Train, Bus, Clock, ShieldCheck, CheckCircle2, Star, Sunrise } from 'lucide-react';

// 사옥 고정 좌표
const HQ_LAT = 37.40698104234706;
const HQ_LNG = 127.08871065248748;
const HQ_NAME = '슈어소프트테크 판교캠퍼스';

interface SearchResultCardProps {
  candidate: RouteCandidate;
  onSelectDetail: (candidate: RouteCandidate) => void;
  onOpenModal?: (candidate: RouteCandidate) => void;
  userLat?: number;
  userLng?: number;
  userName?: string;
  isSelected?: boolean;
}

const buildKakaoRouteUrl = (fromLat: number, fromLng: number, fromName: string): string => {
  const sp = encodeURIComponent(fromName || '출발지');
  const ep = encodeURIComponent(HQ_NAME);
  if (fromLat && fromLng && fromLat !== 0 && fromLng !== 0) {
    return `https://map.kakao.com/link/from/${sp},${fromLat},${fromLng}/to/${ep},${HQ_LAT},${HQ_LNG}`;
  }
  return `https://map.kakao.com/?sName=${sp}&eName=${ep}`;
};

export const SearchResultCard: React.FC<SearchResultCardProps> = ({
  candidate,
  onSelectDetail,
  onOpenModal,
  userLat = 0,
  userLng = 0,
  userName = '',
  isSelected = false,
}) => {
  const [expanded, setExpanded] = useState<boolean>(true);
  const [isFav, setIsFav] = useState<boolean>(false);
  const hasOrigin = userLat !== 0 && userLng !== 0;

  useEffect(() => {
    if (userName && candidate.id) {
      setIsFav(isCandidateFavorite(candidate.id, userName, 'commute_in'));
    } else {
      setIsFav(false);
    }
  }, [userName, candidate.id]);

  const handleToggleFavorite = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!userName || !userLat) {
      alert('출발지가 설정된 노선만 즐겨찾기에 추가할 수 있습니다.');
      return;
    }

    const favId = `fav_${candidate.id}_${userName}`;
    if (isFav) {
      removeStoredFavorite(favId);
      setIsFav(false);
    } else {
      addStoredFavorite({
        id: favId,
        candidateId: candidate.id,
        routeName: candidate.routeName,
        title: `🏠 ${userName} ➔ 🏢 사옥 [${candidate.routeName}] (${candidate.departureTime}➔${candidate.arrivalTime})`,
        originName: userName,
        originLat: userLat,
        originLng: userLng,
        mode: 'commute_in',
        targetTime: candidate.arrivalTime || '08:30',
      });
      setIsFav(true);
    }
  };

  const getBadgeElement = (badge: BadgeType) => {
    switch (badge) {
      case 'recommend':
        return (
          <span key="rec" className="inline-flex items-center gap-1 text-xs px-2.5 py-1 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/40 font-bold shadow-sm">
            <Trophy className="w-3.5 h-3.5 text-amber-400" />
            🥇 최적 추천 경로
          </span>
        );
      case 'fastest':
        return (
          <span key="fast" className="inline-flex items-center gap-1 text-xs px-2.5 py-1 rounded-full bg-indigo-500/20 text-indigo-300 border border-indigo-500/40 font-semibold">
            <Zap className="w-3.5 h-3.5 text-indigo-400" />
            ⚡ 빠른 소요시간
          </span>
        );
      case 'min_walk':
        return (
          <span key="walk" className="inline-flex items-center gap-1 text-xs px-2.5 py-1 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 font-semibold">
            <Footprints className="w-3.5 h-3.5 text-emerald-400" />
            🚶 최소 도보
          </span>
        );
      case 'free':
        return (
          <span key="free" className="inline-flex items-center gap-1 text-xs px-2.5 py-1 rounded-full bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 font-semibold">
            🆓 무료 셔틀
          </span>
        );
      case 'early_bird':
        return (
          <span key="early" className="inline-flex items-center gap-1 text-xs px-2.5 py-1 rounded-full bg-orange-500/20 text-orange-300 border border-orange-500/40 font-bold shadow-sm">
            <Sunrise className="w-3.5 h-3.5 text-orange-400" />
            🌅 조조할인
          </span>
        );
      case 'direct':
        return (
          <span key="direct" className="inline-flex items-center gap-1 text-xs px-2.5 py-1 rounded-full bg-purple-500/20 text-purple-300 border border-purple-500/40 font-semibold">
            🚀 사옥 직통
          </span>
        );
      case 'transfer':
        return (
          <span key="transfer" className="inline-flex items-center gap-1 text-xs px-2.5 py-1 rounded-full bg-blue-500/20 text-blue-300 border border-blue-500/40 font-semibold">
            🔄 환승 연계
          </span>
        );
      default:
        return null;
    }
  };

  return (
    <div
      onClick={() => onSelectDetail(candidate)}
      className={`glass-panel glass-panel-hover rounded-2xl p-5 border transition-all cursor-pointer relative ${
        isSelected
          ? 'border-indigo-400 shadow-2xl ring-2 ring-indigo-500/50 bg-slate-900/90'
          : candidate.badges.includes('recommend')
          ? 'border-amber-500/50 shadow-xl shadow-amber-500/5 ring-1 ring-amber-500/20'
          : 'border-slate-800'
      }`}
    >
      {/* Top Header: Badges & Route Type & Favorite Button */}
      <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
        <div className="flex flex-wrap items-center gap-1.5">
          {candidate.badges.map(getBadgeElement)}
          <span
            className="text-[11px] font-semibold px-2 py-0.5 rounded-md text-slate-200 border"
            style={{
              backgroundColor: `${candidate.routeColor}25`,
              borderColor: `${candidate.routeColor}70`,
              color: '#ffffff',
            }}
          >
            {candidate.routeName}
          </span>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
            {candidate.fare === 0 ? (
              '💰 요금: 무료'
            ) : (
              <>
                <span>💰 요금: ₩{candidate.fare.toLocaleString()}</span>
                {candidate.badges.includes('early_bird') && (
                  <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-orange-500/20 text-orange-300 border border-orange-500/40 font-bold">
                    조조할인
                  </span>
                )}
              </>
            )}
          </span>
          {/* Favorite Toggle Button */}
          <button
            type="button"
            onClick={handleToggleFavorite}
            className={`p-1.5 rounded-lg border transition-all cursor-pointer ${
              isFav
                ? 'bg-amber-500/20 border-amber-500/50 text-amber-400'
                : 'bg-slate-900/80 border-slate-800 text-slate-500 hover:text-amber-300'
            }`}
            title={isFav ? '즐겨찾기 해제' : '노선 즐겨찾기에 추가'}
          >
            <Star className={`w-4 h-4 ${isFav ? 'fill-amber-400' : ''}`} />
          </button>
        </div>
      </div>

      {/* Main Time Flow Header */}
      <div className="flex items-center justify-between mb-3">
        <div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl sm:text-3xl font-black text-white tracking-tight">
              {candidate.departureTime}
            </span>
            <ArrowRight className="w-4 h-4 text-slate-500" />
            <span className="text-2xl sm:text-3xl font-black text-emerald-400 tracking-tight">
              {candidate.arrivalTime}
            </span>
            <span className="text-xs font-semibold text-slate-300 ml-1 bg-slate-800/80 px-2 py-0.5 rounded-lg border border-slate-700">
              총 {candidate.totalDurationMinutes}분 소요
            </span>
          </div>
          <p className="text-xs text-slate-300 mt-1 font-semibold flex items-center gap-1.5">
            <MapPin className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
            {candidate.subtitle}
          </p>
        </div>
      </div>

      {/* Summary Stat Pill Grid */}
      <div className="grid grid-cols-4 gap-2 py-2 px-3 rounded-xl bg-slate-950/80 border border-slate-800/80 mb-4 text-center">
        <div>
          <p className="text-[10px] text-slate-400">총 소요</p>
          <p className="text-xs font-bold text-white">{candidate.totalDurationMinutes}분</p>
        </div>
        <div>
          <p className="text-[10px] text-slate-400">도보</p>
          <p className="text-xs font-bold text-emerald-400">{candidate.walkMinutes}분</p>
        </div>
        <div>
          <p className="text-[10px] text-slate-400">환승</p>
          <p className="text-xs font-bold text-indigo-400">{candidate.transferCount}회</p>
        </div>
        <div>
          <p className="text-[10px] text-slate-400">요금</p>
          <p className="text-xs font-bold text-amber-400">
            {candidate.fare === 0 ? '무료' : `₩${candidate.fare.toLocaleString()}`}
            {candidate.badges.includes('early_bird') && (
              <span className="block text-[9px] text-orange-400 font-bold leading-none mt-0.5">
                🌅 조조할인
              </span>
            )}
          </p>
        </div>
      </div>

      {/* Detailed Timeline Steps (웹 내부에서 바로 보여주는 실시간 길찾기 타임라인) */}
      {expanded && (
        <div className="space-y-3 pt-2 border-t border-slate-800/80 my-3" onClick={(e) => e.stopPropagation()}>
          <p className="text-[11px] font-bold text-indigo-300 flex items-center justify-between">
            <span>📍 이동 경로 상세 타임라인:</span>
            <span className="text-[10px] text-slate-500 font-normal">지하철/버스 실시간 정보 클릭하여 다음 차 확인</span>
          </p>
          <div className="space-y-2 relative before:absolute before:left-3 before:top-2 before:bottom-2 before:w-0.5 before:bg-slate-800">
            {candidate.steps.map((step, idx) => (
              <div key={step.id} className="relative flex items-start gap-3 pl-1" onClick={(e) => e.stopPropagation()}>
                {/* Step Icon */}
                <div
                  className="w-6 h-6 rounded-full flex items-center justify-center text-[11px] font-bold shrink-0 z-10 shadow-md border"
                  style={{
                    backgroundColor: step.type === 'subway' ? getSubwayLineColor(step.title, step.subtitle || '') : step.type === 'shuttle' ? '#10B981' : step.type === 'commute_bus' ? '#6366f1' : step.type === 'public_bus' ? '#2563eb' : '#334155',
                    borderColor: '#ffffff30',
                    color: '#ffffff',
                  }}
                >
                  {step.type === 'walk' ? '🚶' : step.type === 'subway' ? '🚇' : '🚌'}
                </div>

                {/* Step Content */}
                <div className="flex-1 min-w-0 bg-slate-950/70 p-2.5 rounded-xl border border-slate-800/60" onClick={(e) => e.stopPropagation()}>
                  <div className="flex items-center justify-between text-xs font-bold">
                    <span className="text-white truncate">{step.title}</span>
                    <span className="text-emerald-400 font-semibold shrink-0 ml-2">
                      {step.departureTime} {step.arrivalTime ? `➔ ${step.arrivalTime}` : ''}
                      {step.durationMinutes > 0 && ` (${step.durationMinutes}분)`}
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-400 mt-0.5">{step.subtitle}</p>
                  {step.note && (
                    <div className={`mt-1 text-[10px] font-semibold px-2 py-0.5 rounded border inline-block ${
                      step.note.includes('조조할인')
                        ? 'text-orange-300 bg-orange-950/40 border-orange-500/30'
                        : step.note.includes('거리비례')
                        ? 'text-cyan-300 bg-cyan-950/40 border-cyan-500/30'
                        : 'text-indigo-300 bg-indigo-950/40 border-indigo-500/20'
                    }`}>
                      {step.note}
                    </div>
                  )}

                  {/* 버스 승차 및 하차 정류장 상세 안내 */}
                  {(step.type === 'public_bus' || step.type === 'commute_bus' || step.type === 'shuttle') && (
                    <div className="mt-2 p-2 rounded-lg bg-slate-900/90 border border-cyan-500/30 text-[11px] space-y-1">
                      <div className="flex items-center gap-1.5 text-slate-200">
                        <span className="px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-300 font-extrabold text-[9px] border border-emerald-500/30 shrink-0">
                          승차 정류장
                        </span>
                        <span className="font-bold text-white truncate">
                          {step.boardingStopName || step.detailLocation || step.subtitle?.split('➔')[0]?.replace(/(승차|탑승|이동)/g, '').trim() || '승차 정류소'}
                        </span>
                      </div>
                      <div className="flex items-center gap-1.5 text-slate-200">
                        <span className="px-1.5 py-0.5 rounded bg-rose-500/20 text-rose-300 font-extrabold text-[9px] border border-rose-500/30 shrink-0">
                          하차 정류장
                        </span>
                        <span className="font-bold text-slate-200 truncate">
                          {step.dropoffStopName || step.subtitle?.split('➔')[1]?.split('(')[0]?.replace(/(하차|도착|이동)/g, '').trim() || step.title?.split('➔')[1]?.split('(')[0]?.replace(/(하차|도착|이동)/g, '').trim() || '하차 정류장'}
                        </span>
                      </div>
                      {step.passStops && step.passStops.length > 0 && (
                        <div className="text-[10px] text-slate-400 pt-1 border-t border-slate-800/80 flex items-center gap-1 truncate">
                          <span className="text-cyan-400 font-semibold shrink-0">🚏 주요 경유:</span>
                          <span className="truncate">{step.passStops.slice(0, 4).join(' ➔ ')}{step.passStops.length > 4 ? ` 외 ${step.passStops.length - 4}곳` : ''}</span>
                        </div>
                      )}
                    </div>
                  )}

                  {/* 실시간 열차/버스 도착 정보 뱃지 (경로 안내에 실시간 연동) */}
                  {(step.type === 'subway' || step.type === 'public_bus') && (
                    <div onClick={(e) => e.stopPropagation()}>
                      <LiveTransitStepBadge step={step} />
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Bottom Actions */}
      <div className="flex flex-wrap items-center justify-between gap-2 pt-3 border-t border-slate-800/60" onClick={(e) => e.stopPropagation()}>
        {/* 펼치기/접기 버튼 */}
        <button
          type="button"
          onClick={() => setExpanded(!expanded)}
          className="px-3 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-300 text-xs font-semibold flex items-center gap-1 border border-slate-800 transition-all cursor-pointer"
        >
          {expanded ? (
            <>
              <ChevronUp className="w-3.5 h-3.5" />
              타임라인 접기
            </>
          ) : (
            <>
              <ChevronDown className="w-3.5 h-3.5" />
              상세 타임라인 보기
            </>
          )}
        </button>

        <div className="flex items-center gap-2">
          {/* 지도에 표시 버튼 (모달 열지 않고 상단 지도로 스크롤 & 노선 그리기) */}
          <button
            type="button"
            onClick={() => onSelectDetail(candidate)}
            className="px-3.5 py-1.5 rounded-xl bg-indigo-600/30 hover:bg-indigo-600/50 text-indigo-300 text-xs font-bold flex items-center gap-1 border border-indigo-500/40 transition-all cursor-pointer"
          >
            🗺️ 지도에 노선 표시
          </button>

          {/* 타임라인 모달 팝업 버튼 */}
          {onOpenModal && (
            <button
              type="button"
              onClick={() => onOpenModal(candidate)}
              className="px-2.5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold flex items-center gap-1 border border-slate-700 transition-all cursor-pointer"
              title="상세 팝업창으로 보기"
            >
              📋 팝업
            </button>
          )}

          {/* 카카오맵 외부 길찾기 버튼 */}
          <a
            href={buildKakaoRouteUrl(userLat, userLng, userName || candidate.title)}
            target="_blank"
            rel="noopener noreferrer"
            onClick={(e) => e.stopPropagation()}
            className="px-3 py-1.5 rounded-xl bg-yellow-500/15 hover:bg-yellow-500/25 text-yellow-300 text-xs font-bold flex items-center gap-1.5 border border-yellow-500/30 transition-all shadow-sm"
            title="카카오맵에서 실시간 대중교통 길찾기 열기"
          >
            <span className="w-2 h-2 rounded-full bg-yellow-400 animate-pulse shrink-0" />
            카카오맵 길찾기
            <ExternalLink className="w-3.5 h-3.5 opacity-80 shrink-0" />
          </a>
        </div>
      </div>
    </div>
  );
};
