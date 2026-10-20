import React from 'react';
import { INITIAL_ROUTES, STATION_COORDS } from '../data/initialBusData';
import { Map, Bus, ArrowRight, CheckCircle2, MapPin } from 'lucide-react';

export const FullRouteMap: React.FC = () => {
  return (
    <div className="glass-panel rounded-2xl p-5 md:p-6 border border-slate-800 shadow-2xl space-y-6">
      {/* Title */}
      <div className="border-b border-slate-800/80 pb-4">
        <h2 className="text-xl font-bold text-white flex items-center gap-2">
          <Map className="w-5 h-5 text-emerald-400" />
          회사 통근·셔틀버스 전체 노선도
        </h2>
        <p className="text-xs text-slate-400 mt-1">
          현재 컨소시엄 5사(텔레칩스, 클레무브, 교촌, 지란지교, 슈어소프트)에서 운행 중인 8개 전체 노선 정류장 순서입니다.
        </p>
      </div>

      {/* Routes Diagram Grid */}
      <div className="grid grid-cols-1 gap-6">
        {INITIAL_ROUTES.map((route) => (
          <div 
            key={route.id}
            className="p-5 rounded-2xl bg-slate-950/80 border border-slate-800 hover:border-slate-700 transition-all space-y-4"
          >
            {/* Route Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-800/60 pb-3">
              <div className="flex items-center gap-3">
                <div 
                  className="w-8 h-8 rounded-xl flex items-center justify-center text-white font-bold shadow-md"
                  style={{ backgroundColor: route.color }}
                >
                  <Bus className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-base font-extrabold text-white flex items-center gap-2">
                    {route.name}
                    <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-slate-800 text-slate-300">
                      {route.bus_type === 'shuttle' ? '셔틀버스 (무료)' : '통근버스'}
                    </span>
                  </h3>
                  <p className="text-xs text-slate-400">{route.description}</p>
                </div>
              </div>
              <div className="text-left sm:text-right text-xs text-slate-400">
                <p><span className="text-emerald-400 font-semibold">출근 {route.inbound_trips.length}회</span> | <span className="text-purple-400 font-semibold">퇴근 {route.outbound_trips.length}회</span></p>
              </div>
            </div>

            {/* Sequence Flow */}
            <div className="flex flex-wrap items-center gap-2 pt-2">
              {Array.from(
                new Set(route.inbound_trips.flatMap((t) => Object.keys(t.times)))
              ).map((stopName, idx, arr) => (
                <React.Fragment key={stopName}>
                  <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-900 border border-slate-800 text-xs font-semibold text-slate-200">
                    <MapPin className="w-3 h-3 text-indigo-400" />
                    {stopName}
                  </div>
                  {idx < arr.length - 1 && (
                    <ArrowRight className="w-3.5 h-3.5 text-slate-600 shrink-0" />
                  )}
                </React.Fragment>
              ))}
            </div>

            {/* Detailed Stop Locations */}
            <div className="mt-3 p-3 rounded-xl bg-slate-900/40 border border-slate-800/60 text-[11px] text-slate-400 space-y-1">
              <p className="font-semibold text-slate-300">📍 정류장별 탑승 위치 팁:</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-1 pt-1">
                {Array.from(
                  new Set(route.inbound_trips.flatMap((t) => Object.keys(t.times)))
                ).map((stopName) => (
                  <div key={stopName} className="flex items-baseline gap-1">
                    <span className="font-bold text-slate-300 shrink-0">• {stopName}:</span>
                    <span className="truncate">{STATION_COORDS[stopName]?.address || '상세 위치 참조'}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
