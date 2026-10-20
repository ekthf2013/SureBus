import React, { useState } from 'react';
import { RouteData, INITIAL_ROUTES, STATION_COORDS } from '../data/initialBusData';
import { Clock, Bus, MapPin, AlertCircle, Sun, Moon } from 'lucide-react';

export const TimetableExplorer: React.FC = () => {
  const [selectedRouteId, setSelectedRouteId] = useState<string>('route_shuttle_pangyo');
  const [dirMode, setDirMode] = useState<'inbound' | 'outbound'>('inbound');

  const selectedRoute = INITIAL_ROUTES.find(r => r.id === selectedRouteId) || INITIAL_ROUTES[0];

  return (
    <div className="glass-panel rounded-2xl p-5 md:p-6 border border-slate-800 shadow-2xl space-y-6">
      {/* Title & Route Select */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800/80 pb-4">
        <div>
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <Clock className="w-5 h-5 text-indigo-400" />
            전체 노선별 시간표 조회
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            회사 통근버스 및 셔틀버스의 정류장별 상세 운행 시간표를 확인하세요.
          </p>
        </div>

        {/* Direction Switcher */}
        <div className="flex items-center gap-1.5 bg-slate-950 p-1 rounded-xl border border-slate-800">
          <button
            onClick={() => setDirMode('inbound')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all ${
              dirMode === 'inbound'
                ? 'bg-indigo-600 text-white shadow-md'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Sun className="w-3.5 h-3.5" />
            출근 시간표
          </button>
          <button
            onClick={() => setDirMode('outbound')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all ${
              dirMode === 'outbound'
                ? 'bg-purple-600 text-white shadow-md'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Moon className="w-3.5 h-3.5" />
            퇴근 시간표
          </button>
        </div>
      </div>

      {/* Route Select Tabs */}
      <div className="flex flex-wrap gap-2">
        {INITIAL_ROUTES.map((route) => (
          <button
            key={route.id}
            onClick={() => setSelectedRouteId(route.id)}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all border ${
              selectedRouteId === route.id
                ? 'bg-indigo-600/30 border-indigo-500/50 text-indigo-300 shadow-lg'
                : 'bg-slate-900/60 border-slate-800 text-slate-400 hover:bg-slate-800 hover:text-slate-200'
            }`}
          >
            <span
              className="inline-block w-2.5 h-2.5 rounded-full mr-2"
              style={{ backgroundColor: route.color }}
            />
            {route.name} ({route.bus_type === 'shuttle' ? '셔틀' : '통근'})
          </button>
        ))}
      </div>

      {/* Selected Route Info Box */}
      <div className="p-4 rounded-xl bg-slate-950/80 border border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <span
              className="text-xs font-extrabold px-2.5 py-0.5 rounded-md text-white"
              style={{ backgroundColor: selectedRoute.color }}
            >
              {selectedRoute.name}
            </span>
            <span className="text-xs text-slate-300 font-semibold">{selectedRoute.description}</span>
          </div>
          <p className="text-[11px] text-slate-400 mt-1">
            {selectedRoute.is_free ? '비용: 무료' : '유료'} | {selectedRoute.reservation_required ? '예약 필요 노선' : '자율 탑승 (예약 불필요)'}
          </p>
        </div>
      </div>

      {/* Timetable Data Table */}
      {dirMode === 'inbound' ? (
        <div className="overflow-x-auto rounded-xl border border-slate-800">
          <table className="w-full text-left text-xs text-slate-300">
            <thead className="bg-slate-900 text-slate-200 uppercase font-bold border-b border-slate-800">
              <tr>
                <th className="py-3 px-4">정류장</th>
                {selectedRoute.inbound_trips.map((t) => (
                  <th key={t.trip_no} className="py-3 px-3 text-center">
                    {t.trip_no}호차
                  </th>
                ))}
                <th className="py-3 px-4">상세 승차 위치</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 bg-slate-950/40">
              {/* Collect all distinct stop names */}
              {Array.from(
                new Set(selectedRoute.inbound_trips.flatMap((t) => Object.keys(t.times)))
              ).map((stopName) => (
                <tr key={stopName} className="hover:bg-slate-900/50 transition-colors">
                  <td className="py-3 px-4 font-bold text-white whitespace-nowrap">
                    {stopName}
                  </td>
                  {selectedRoute.inbound_trips.map((t) => (
                    <td key={t.trip_no} className="py-3 px-3 text-center font-semibold text-indigo-400 whitespace-nowrap">
                      {t.times[stopName] || '-'}
                    </td>
                  ))}
                  <td className="py-3 px-4 text-slate-400 text-[11px]">
                    {STATION_COORDS[stopName]?.address || '-'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-slate-800">
          <table className="w-full text-left text-xs text-slate-300">
            <thead className="bg-slate-900 text-slate-200 uppercase font-bold border-b border-slate-800">
              <tr>
                <th className="py-3 px-4">호차</th>
                <th className="py-3 px-4">사옥 출발시간</th>
                <th className="py-3 px-4">행선지 / 경유지</th>
                <th className="py-3 px-4">비고</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 bg-slate-950/40">
              {selectedRoute.outbound_trips.map((out) => (
                <tr key={out.trip_no} className="hover:bg-slate-900/50 transition-colors">
                  <td className="py-3 px-4 font-bold text-white">{out.trip_no}호차</td>
                  <td className="py-3 px-4 font-bold text-purple-400">{out.departure}</td>
                  <td className="py-3 px-4 font-medium text-slate-200">{out.destination}</td>
                  <td className="py-3 px-4 text-amber-300 text-[11px] font-medium">{out.note || '-'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};
