import React, { useState, useEffect, useCallback } from 'react';
import { fetchLiveBusArrivals, BusArrivalItem, HUB_BUS_STOPS, HubBusStop, formatBusArrivalTime } from '../utils/busLiveApi';
import { Bus, RefreshCw, Clock, MapPin, ShieldCheck, Zap, ArrowRight, Navigation } from 'lucide-react';

interface RealtimeBusWidgetProps {
  defaultStopKey?: string;
  className?: string;
}

export const RealtimeBusWidget: React.FC<RealtimeBusWidgetProps> = ({
  defaultStopKey = 'moran',
  className = '',
}) => {
  const [selectedStopKey, setSelectedStopKey] = useState<string>(defaultStopKey);
  const [arrivals, setArrivals] = useState<BusArrivalItem[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [lastUpdated, setLastUpdated] = useState<string>('');

  const currentStop: HubBusStop = HUB_BUS_STOPS[selectedStopKey] || HUB_BUS_STOPS.moran;

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const data = await fetchLiveBusArrivals(selectedStopKey);
      setArrivals(data);
      setLastUpdated(new Date().toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit', second: '2-digit' }));
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [selectedStopKey]);

  useEffect(() => {
    loadData();
    const interval = setInterval(loadData, 30000); // 30초 주기 실시간 갱신
    return () => clearInterval(interval);
  }, [loadData]);

  return (
    <div className={`glass-panel rounded-2xl p-4 border border-cyan-500/30 bg-gradient-to-br from-slate-900/95 via-cyan-950/20 to-slate-950 shadow-2xl space-y-3 ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between border-b border-slate-800/80 pb-2.5 gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <div className="w-7 h-7 rounded-lg bg-cyan-500/20 border border-cyan-500/40 flex items-center justify-center text-cyan-400 shrink-0">
            <Bus className="w-3.5 h-3.5" />
          </div>
          <div className="min-w-0">
            <h4 className="text-xs sm:text-sm font-bold text-white flex items-center gap-1.5 truncate">
              <span>🚌 국토교통부 실시간 버스 도착</span>
              <span className="flex h-1.5 w-1.5 relative shrink-0">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-cyan-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-cyan-500"></span>
              </span>
            </h4>
            <p className="text-[10px] text-slate-400 truncate">
              {lastUpdated ? `공공데이터포털 API 연동 (갱신: ${lastUpdated})` : '국토교통부 대중교통 API 연동'}
            </p>
          </div>
        </div>

        {/* Refresh Button */}
        <button
          type="button"
          onClick={loadData}
          disabled={loading}
          className="p-1.5 rounded-lg bg-slate-800/80 hover:bg-slate-700 text-slate-400 hover:text-slate-200 border border-slate-700/80 transition-all cursor-pointer shrink-0"
          title="실시간 도착정보 새로고침"
        >
          <RefreshCw className={`w-3.5 h-3.5 text-cyan-400 ${loading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {/* Stop Selector Pills */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-thin text-xs">
        {Object.values(HUB_BUS_STOPS).map((stop) => {
          const isSelected = stop.key === selectedStopKey;
          return (
            <button
              key={stop.key}
              type="button"
              onClick={() => setSelectedStopKey(stop.key)}
              className={`px-2.5 py-1 rounded-xl font-bold whitespace-nowrap transition-all cursor-pointer flex items-center gap-1 border text-[11px] ${
                isSelected
                  ? 'bg-cyan-600 text-white border-cyan-400 shadow-md shadow-cyan-600/30'
                  : 'bg-slate-900/80 text-slate-400 border-slate-800 hover:text-slate-200 hover:border-slate-700'
              }`}
            >
              <Navigation className="w-2.5 h-2.5" />
              {stop.name.split(' ')[0]}
            </button>
          );
        })}
      </div>

      {/* Stop Description Badge */}
      <div className="p-2 rounded-xl bg-slate-950/70 border border-slate-800/70 text-[11px] text-slate-300 flex items-center justify-between gap-2">
        <div className="flex items-center gap-1.5 min-w-0 truncate">
          <MapPin className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
          <span className="font-bold text-white truncate">{currentStop.name}</span>
          <span className="text-[10px] text-slate-500">({currentStop.arsId})</span>
        </div>
        <span className="text-[10px] font-semibold text-cyan-300 bg-cyan-500/10 px-1.5 py-0.5 rounded border border-cyan-500/20 shrink-0">
          연계: {currentStop.supportedRoutes.map(r => `${r}번`).join(', ')}
        </span>
      </div>

      {/* Bus Arrival Cards List */}
      <div className="space-y-2 max-h-[380px] overflow-y-auto pr-1 scrollbar-thin">
        {arrivals.length === 0 ? (
          <div className="p-6 text-center text-xs text-slate-400 bg-slate-950/50 rounded-xl border border-slate-800/60 flex flex-col items-center justify-center min-h-[120px]">
            {loading ? (
              <p className="flex items-center gap-2 text-cyan-300 font-semibold">
                <RefreshCw className="w-4 h-4 animate-spin text-cyan-400" />
                실시간 버스 위치를 조회하는 중입니다...
              </p>
            ) : (
              <p className="text-slate-400">현재 운행 중인 버스 도착 정보가 없습니다.</p>
            )}
          </div>
        ) : (
          arrivals.map((bus) => (
            <div
              key={bus.routeId || `${bus.routeNo}-${bus.arrTimeSec}`}
              className="p-3 rounded-xl bg-slate-950/85 border border-slate-800/90 hover:border-cyan-500/40 transition-all space-y-2 shadow-sm"
            >
              {/* Top: Route No & Type & Remaining Time */}
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <span
                    className="px-2.5 py-0.5 rounded-lg text-xs font-black text-white shadow-sm"
                    style={{ backgroundColor: bus.routeColor }}
                  >
                    {bus.routeNo}번
                  </span>
                  <span className="text-[11px] font-medium text-slate-400">
                    {bus.routeType}
                  </span>
                  {bus.lowPlate && (
                    <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                      저상
                    </span>
                  )}
                </div>

                {/* Arrival Countdown Badge */}
                <div className="flex items-center gap-1.5 font-black text-sm">
                  {(() => {
                    const formatted = formatBusArrivalTime(bus.arrTimeSec, bus.arrStationCount);
                    return formatted.isSoon ? (
                      <span className="px-2 py-0.5 rounded-md bg-rose-500/20 text-rose-300 border border-rose-500/30 text-xs font-bold animate-pulse flex items-center gap-1.5">
                        <span>⚡ {formatted.timeText}</span>
                        <span className="text-[10px] px-1 rounded bg-rose-950/80 text-amber-300 font-bold border border-rose-500/30">
                          {bus.arrStationCount}정류장 전
                        </span>
                      </span>
                    ) : (
                      <span className="px-2 py-0.5 rounded-md bg-cyan-500/15 text-cyan-300 border border-cyan-500/30 text-xs font-bold flex items-center gap-1.5">
                        <span>⏱️ {formatted.timeText}</span>
                        <span className="text-[10px] px-1 rounded bg-cyan-950/80 text-amber-300 font-bold border border-cyan-500/30">
                          {bus.arrStationCount}정류장 전
                        </span>
                      </span>
                    );
                  })()}
                </div>
              </div>

              {/* Bottom: Current Location & Remaining Stops & Crowded */}
              <div className="flex items-center justify-between gap-2 pt-1.5 border-t border-slate-800/70 text-[11px]">
                <div className="flex items-center gap-1.5 text-slate-300 truncate">
                  <span className="text-slate-500">현재:</span>
                  <span className="font-semibold text-slate-200 truncate">{bus.currentStationName}</span>
                  <span className="text-slate-500 text-[10px]">({bus.arrStationCount}번째 전)</span>
                </div>

                <div className="flex items-center gap-1.5 shrink-0 text-[10px]">
                  {bus.crowded && (
                    <span
                      className={`px-1.5 py-0.5 rounded font-semibold border ${
                        bus.crowded === '여유'
                          ? 'bg-emerald-500/10 text-emerald-300 border-emerald-500/20'
                          : bus.crowded === '보통'
                          ? 'bg-amber-500/10 text-amber-300 border-amber-500/20'
                          : 'bg-rose-500/10 text-rose-300 border-rose-500/20'
                      }`}
                    >
                      {bus.crowded}
                    </span>
                  )}
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};
