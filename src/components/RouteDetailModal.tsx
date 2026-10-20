import React from 'react';
import { RouteCandidate } from '../types/bus';
import { LiveTransitStepBadge, getSubwayLineColor } from './LiveTransitStepBadge';
import { X, Clock, MapPin, Footprints, Bus, AlertTriangle, ShieldCheck, ChevronRight, Train, Sunrise } from 'lucide-react';

interface RouteDetailModalProps {
  candidate: RouteCandidate | null;
  onClose: () => void;
}

export const RouteDetailModal: React.FC<RouteDetailModalProps> = ({ candidate, onClose }) => {
  if (!candidate) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-fade-in">
      <div className="glass-panel w-full max-w-xl max-h-[90vh] overflow-y-auto rounded-2xl border border-slate-700 shadow-2xl p-6 relative">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-slate-300 transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Modal Header */}
        <div className="mb-6">
          <div className="flex flex-wrap items-center gap-2 mb-2">
            <span 
              className="text-xs font-bold px-2.5 py-1 rounded-md text-white"
              style={{ backgroundColor: candidate.routeColor }}
            >
              {candidate.routeName}
            </span>
            {candidate.badges?.includes('early_bird') && (
              <span className="inline-flex items-center gap-1 text-xs font-bold px-2.5 py-0.5 rounded-full bg-orange-500/20 text-orange-300 border border-orange-500/40 shadow-sm">
                <Sunrise className="w-3.5 h-3.5 text-orange-400" />
                🌅 조조할인 적용
              </span>
            )}
            <span className="text-xs text-slate-400 font-medium">상세 이동 타임라인</span>
          </div>
          <h2 className="text-xl font-bold text-white mb-1">{candidate.title}</h2>
          <p className="text-xs text-slate-300">{candidate.subtitle}</p>
        </div>

        {/* Overview Stats Bar */}
        <div className="grid grid-cols-5 gap-2 p-3 rounded-xl bg-slate-900/90 border border-slate-800 text-center mb-6">
          <div>
            <p className="text-[10px] text-slate-400">출발</p>
            <p className="text-xs font-bold text-white">{candidate.departureTime}</p>
          </div>
          <div>
            <p className="text-[10px] text-slate-400">도착</p>
            <p className="text-xs font-bold text-emerald-400">{candidate.arrivalTime}</p>
          </div>
          <div>
            <p className="text-[10px] text-slate-400">총 소요</p>
            <p className="text-xs font-bold text-indigo-400">{candidate.totalDurationMinutes}분</p>
          </div>
          <div>
            <p className="text-[10px] text-slate-400">도보</p>
            <p className="text-xs font-bold text-slate-300">{candidate.walkMinutes}분</p>
          </div>
          <div>
            <p className="text-[10px] text-slate-400">요금</p>
            <p className="text-xs font-bold text-amber-400">
              {candidate.fare === 0 ? '무료' : `${candidate.fare.toLocaleString()}원`}
              {candidate.badges?.includes('early_bird') && (
                <span className="block text-[9px] text-orange-400 font-bold leading-none mt-0.5">
                  🌅 조조할인
                </span>
              )}
            </p>
          </div>
        </div>

        {/* Detailed Timeline Steps */}
        <div className="space-y-6 relative before:absolute before:left-4 before:top-2 before:bottom-2 before:w-0.5 before:bg-slate-800">
          {candidate.steps.map((step, idx) => {
            const subwayColor = step.type === 'subway' ? getSubwayLineColor(step.title, step.subtitle || '') : '#6366f1';

            return (
              <div key={step.id} className="relative pl-10">
                {/* Step Node Icon */}
                <div
                  className="absolute left-1.5 top-0.5 w-6 h-6 rounded-full bg-slate-900 border-2 flex items-center justify-center -translate-x-1/2 z-10 shadow-md"
                  style={{
                    borderColor: step.type === 'subway' ? subwayColor : step.type === 'shuttle' ? '#10B981' : step.type === 'public_bus' ? '#2563eb' : step.type === 'commute_bus' ? '#6366f1' : '#10b981'
                  }}
                >
                  {step.type === 'walk' && <Footprints className="w-3 h-3 text-emerald-400" />}
                  {step.type === 'shuttle' && <Bus className="w-3 h-3 text-emerald-400" />}
                  {step.type === 'commute_bus' && <Bus className="w-3 h-3 text-indigo-400" />}
                  {step.type === 'subway' && <Train className="w-3 h-3" style={{ color: subwayColor }} />}
                  {step.type === 'public_bus' && <Bus className="w-3 h-3 text-cyan-400" />}
                </div>

              {/* Step Detail */}
              <div className="bg-slate-900/60 p-3.5 rounded-xl border border-slate-800">
                <div className="flex items-center justify-between mb-1">
                  <h4 className="text-sm font-bold text-white">{step.title}</h4>
                  {step.departureTime && (
                    <span className="text-xs font-semibold text-indigo-400">{step.departureTime}</span>
                  )}
                </div>
                {step.subtitle && (
                  <p className="text-xs text-slate-300 mb-1 flex items-center gap-1">
                    <MapPin className="w-3 h-3 text-emerald-400 shrink-0" />
                    {step.subtitle}
                  </p>
                )}
                {step.note && (
                  <p className={`text-[11px] p-2 rounded-lg border mt-2 font-medium ${
                    step.note.includes('조조할인')
                      ? 'text-orange-300 bg-orange-500/15 border-orange-500/30 font-semibold'
                      : step.note.includes('거리비례')
                      ? 'text-cyan-300 bg-cyan-500/15 border-cyan-500/30 font-semibold'
                      : 'text-amber-300 bg-amber-500/10 border-amber-500/20'
                  }`}>
                    💡 {step.note}
                  </p>
                )}

                {/* 버스 승차 및 하차 정류장 상세 안내 */}
                {(step.type === 'public_bus' || step.type === 'commute_bus' || step.type === 'shuttle') && (
                  <div className="mt-2.5 p-2.5 rounded-lg bg-slate-950/80 border border-cyan-500/30 text-xs space-y-1.5">
                    <div className="flex items-center gap-2 text-slate-200">
                      <span className="px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-300 font-extrabold text-[10px] border border-emerald-500/30 shrink-0">
                        승차 정류장
                      </span>
                      <span className="font-bold text-white truncate">
                        {step.boardingStopName || step.detailLocation || step.subtitle?.split('➔')[0]?.replace(/(승차|탑승|이동)/g, '').trim() || '승차 정류소'}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 text-slate-200">
                      <span className="px-1.5 py-0.5 rounded bg-rose-500/20 text-rose-300 font-extrabold text-[10px] border border-rose-500/30 shrink-0">
                        하차 정류장
                      </span>
                      <span className="font-bold text-slate-200 truncate">
                        {step.dropoffStopName || step.subtitle?.split('➔')[1]?.split('(')[0]?.replace(/(하차|도착|이동)/g, '').trim() || step.title?.split('➔')[1]?.split('(')[0]?.replace(/(하차|도착|이동)/g, '').trim() || '하차 정류장'}
                      </span>
                    </div>
                    {step.passStops && step.passStops.length > 0 && (
                      <div className="text-[11px] text-slate-400 pt-1.5 border-t border-slate-800 flex items-center gap-1 truncate">
                        <span className="text-cyan-400 font-semibold shrink-0">🚏 주요 경유 정류소:</span>
                        <span className="truncate">{step.passStops.slice(0, 4).join(' ➔ ')}{step.passStops.length > 4 ? ` 외 ${step.passStops.length - 4}곳` : ''}</span>
                      </div>
                    )}
                  </div>
                )}

                {/* 실시간 열차 및 버스 도착 현황 (해당 이동 단계에 바로 표시) */}
                {(step.type === 'subway' || step.type === 'public_bus') && (
                  <LiveTransitStepBadge step={step} />
                )}
              </div>
            </div>
          );
        })}
      </div>

        {/* Operating Rules & Policy Section */}
        <div className="mt-6 p-4 rounded-xl bg-slate-900/80 border border-slate-800 space-y-2">
          <h4 className="text-xs font-bold text-slate-200 flex items-center gap-1.5">
            <AlertTriangle className="w-4 h-4 text-amber-400" />
            통근버스 탑승 유의사항 및 노쇼 정책
          </h4>
          <ul className="text-[11px] text-slate-400 space-y-1 pl-4 list-disc">
            <li>예약제 노선(잠실, 신도림 등)은 앱을 통해 사전 예약 후 탑승하셔야 합니다.</li>
            <li>노쇼 3회 누적 시 시점부터 2주간(14일) 자동 예약 제한됩니다.</li>
            <li>취소는 출발 2시간 전까지만 취소 인정 처리됩니다.</li>
            <li>바코드 미태깅 시 기사님 재량으로 승차가 제지될 수 있습니다.</li>
          </ul>
        </div>

        {/* Transfer Policy Notice */}
        {candidate.routeCategory !== 'public_transit' && candidate.fare > 0 && (
          <div className="mt-3 p-3 rounded-xl bg-amber-500/10 border border-amber-500/30">
            <h4 className="text-xs font-bold text-amber-300 flex items-center gap-1.5 mb-1">
              <AlertTriangle className="w-3.5 h-3.5" />
              요금 안내
            </h4>
            <p className="text-[11px] text-amber-200/80">
              통근버스(1,500원)는 일반 대중교통(지하철·시내버스)과 환승 할인이 적용되지 않습니다.
              대중교통과 함께 이용하는 경우 각 요금이 별도로 청구됩니다.
            </p>
          </div>
        )}

        {/* Modal Close Footer */}
        <div className="mt-6 text-right">
          <button
            onClick={onClose}
            className="px-5 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold transition-colors"
          >
            닫기
          </button>
        </div>
      </div>
    </div>
  );
};
