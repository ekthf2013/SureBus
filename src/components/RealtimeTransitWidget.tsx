import React, { useState, useEffect } from 'react';
import { RealtimeSubwayWidget } from './RealtimeSubwayWidget';
import { RealtimeBusWidget } from './RealtimeBusWidget';
import { Train, Bus, Activity, Zap } from 'lucide-react';

interface RealtimeTransitWidgetProps {
  stationName: string;
}

export const RealtimeTransitWidget: React.FC<RealtimeTransitWidgetProps> = ({ stationName }) => {
  const [activeTab, setActiveTab] = useState<'subway' | 'bus'>('subway');

  // 사옥 환승 거점 정류소 자동 매핑 (사옥 중심 통근 허브만 정직하게 매핑)
  const defaultBusStopKey = React.useMemo(() => {
    const lower = stationName.toLowerCase();
    if (lower.includes('모란') || lower.includes('수진')) {
      return 'moran'; // 모란역 5/6번출구 (사옥 직통 87/332번 승차홈)
    }
    if (lower.includes('판교')) {
      return 'pangyo_station'; // 판교역북편 (사옥 직통 310번 승차홈)
    }
    if (lower.includes('잠실')) {
      return 'jamsil_station'; // 잠실역 (사옥 직통 1007번 광역 승차홈)
    }
    if (lower.includes('야탑')) {
      return 'yatap_station'; // 야탑역
    }
    return 'hq'; // 슈어소프트 사옥 정문 앞 정류소
  }, [stationName]);

  return (
    <div className="space-y-3">
      {/* Tab Switcher: 지하철 vs 버스 실시간 API 선택 */}
      <div className="flex items-center justify-between bg-slate-950/80 p-1 rounded-2xl border border-slate-800 shadow-lg">
        <div className="flex items-center gap-1 w-full">
          <button
            type="button"
            onClick={() => setActiveTab('subway')}
            className={`flex-1 py-2 px-3 rounded-xl font-bold text-xs transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
              activeTab === 'subway'
                ? 'bg-gradient-to-r from-pink-600 to-indigo-600 text-white shadow-md shadow-indigo-600/30'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/60'
            }`}
          >
            <Train className="w-3.5 h-3.5" />
            <span>🚇 지하철 실시간 전광판</span>
            <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-white/20 font-normal">서울시</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('bus')}
            className={`flex-1 py-2 px-3 rounded-xl font-bold text-xs transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
              activeTab === 'bus'
                ? 'bg-gradient-to-r from-cyan-600 to-blue-600 text-white shadow-md shadow-cyan-600/30'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/60'
            }`}
          >
            <Bus className="w-3.5 h-3.5" />
            <span>🚌 버스 실시간 도착</span>
            <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-white/20 font-normal">국토교통부</span>
          </button>
        </div>
      </div>

      {/* Active Widget View */}
      {activeTab === 'subway' ? (
        <RealtimeSubwayWidget stationName={stationName} />
      ) : (
        <RealtimeBusWidget defaultStopKey={defaultBusStopKey} />
      )}
    </div>
  );
};
