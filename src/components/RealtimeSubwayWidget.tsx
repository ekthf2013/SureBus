import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { fetchRealtimeSubwayArrival, RealtimeArrival, SUBWAY_LINE_MAP, cleanSubwayStationName } from '../utils/subwayApi';
import { RefreshCw, Train, ArrowUpRight, ArrowDownRight, Layers } from 'lucide-react';

interface RealtimeSubwayWidgetProps {
  stationName: string;
}

interface LineGroup {
  subwayId: string;
  subwayName: string;
  color: string;
  upLines: RealtimeArrival[];
  downLines: RealtimeArrival[];
  totalCount: number;
}

export const RealtimeSubwayWidget: React.FC<RealtimeSubwayWidgetProps> = ({ stationName }) => {
  const [arrivals, setArrivals] = useState<RealtimeArrival[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [lastUpdated, setLastUpdated] = useState<string>('');
  const [hasSearched, setHasSearched] = useState<boolean>(false);
  const [selectedLineFilter, setSelectedLineFilter] = useState<string>('all');

  const cleanName = cleanSubwayStationName(stationName);

  const loadData = useCallback(async () => {
    if (!cleanName) return;
    setLoading(true);
    try {
      const data = await fetchRealtimeSubwayArrival(cleanName);
      setArrivals(data);
      setLastUpdated(new Date().toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit', second: '2-digit' }));
      setHasSearched(true);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [cleanName]);

  useEffect(() => {
    if (cleanName) {
      loadData();
      const timer = setInterval(() => {
        loadData();
      }, 30000);
      return () => clearInterval(timer);
    }
  }, [cleanName, loadData]);

  // 호선(Line)별로 1차 그룹화 후 각 호선 내에서 상행/하행으로 2차 분류
  const lineGroups: LineGroup[] = useMemo(() => {
    const map = new Map<string, { up: RealtimeArrival[]; down: RealtimeArrival[] }>();

    arrivals.forEach((item) => {
      const id = item.subwayId || 'etc';
      if (!map.has(id)) {
        map.set(id, { up: [], down: [] });
      }
      const group = map.get(id)!;
      const isUp = item.updnLine.includes('상행') || item.updnLine.includes('외선');
      if (isUp) {
        group.up.push(item);
      } else {
        group.down.push(item);
      }
    });

    const groups: LineGroup[] = [];
    map.forEach((value, key) => {
      const lineInfo = SUBWAY_LINE_MAP[key];
      groups.push({
        subwayId: key,
        subwayName: lineInfo ? lineInfo.name : '지하철',
        color: lineInfo ? lineInfo.color : '#6366f1',
        upLines: value.up,
        downLines: value.down,
        totalCount: value.up.length + value.down.length,
      });
    });

    // 호선 번호순 정렬
    groups.sort((a, b) => a.subwayName.localeCompare(b.subwayName, 'ko-KR', { numeric: true }));
    return groups;
  }, [arrivals]);

  if (!cleanName) return null;

  const displayedGroups =
    selectedLineFilter === 'all'
      ? lineGroups
      : lineGroups.filter((g) => g.subwayId === selectedLineFilter);

  const renderArrivalCard = (item: RealtimeArrival, idx: number, lineColor: string) => {
    const isUp = item.updnLine.includes('상행') || item.updnLine.includes('외선');

    return (
      <div
        key={`${item.btrainNo}-${idx}`}
        className="p-2.5 rounded-xl bg-slate-950/90 border border-slate-800/90 hover:border-slate-700 transition-all space-y-1.5 shadow-sm"
      >
        {/* Top: Train Heading + Direction Badge */}
        <div className="flex items-start justify-between gap-1.5">
          <div className="flex items-center gap-1.5 flex-wrap min-w-0">
            <span
              className="w-2 h-2 rounded-full shrink-0"
              style={{ backgroundColor: lineColor }}
            />
            <span className="font-bold text-xs text-white leading-tight break-words">
              {item.trainLineNm}
            </span>
          </div>

          <span
            className={`text-[10px] font-bold px-1.5 py-0.5 rounded shrink-0 flex items-center gap-0.5 border ${
              isUp
                ? 'bg-indigo-500/20 text-indigo-300 border-indigo-500/30'
                : 'bg-purple-500/20 text-purple-300 border-purple-500/30'
            }`}
          >
            {isUp ? <ArrowUpRight className="w-2.5 h-2.5" /> : <ArrowDownRight className="w-2.5 h-2.5" />}
            {item.updnLine}
          </span>
        </div>

        {/* Bottom: Arrival Message + Location Pill */}
        <div className="flex flex-wrap items-center justify-between gap-1 pt-1 border-t border-slate-800/60 text-xs">
          <div className="flex items-center gap-1.5 font-bold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-md border border-emerald-500/20">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping shrink-0" />
            <span className="text-[11px] font-bold leading-none">{item.arvlMsg2}</span>
          </div>

          {item.arvlMsg3 && (
            <div className="text-[10px] text-slate-400 bg-slate-900/90 px-1.5 py-0.5 rounded border border-slate-800">
              현재: <strong className="text-slate-200 font-semibold">{item.arvlMsg3}</strong>
            </div>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="glass-panel rounded-2xl p-4 border border-indigo-500/30 bg-gradient-to-br from-slate-900/95 via-indigo-950/20 to-slate-950 shadow-2xl space-y-3">
      {/* Widget Header: 컴팩트한 헤더 및 소형 새로고침 버튼 */}
      <div className="flex items-center justify-between border-b border-slate-800/80 pb-2.5 gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <div className="w-7 h-7 rounded-lg bg-pink-500/20 border border-pink-500/40 flex items-center justify-center text-pink-400 shrink-0">
            <Train className="w-3.5 h-3.5" />
          </div>
          <div className="min-w-0">
            <h4 className="text-xs sm:text-sm font-bold text-white flex items-center gap-1.5 truncate">
              <span>🚇 {cleanName}역 실시간 도착</span>
              <span className="flex h-1.5 w-1.5 relative shrink-0">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-emerald-500"></span>
              </span>
            </h4>
            <p className="text-[10px] text-slate-400 truncate">
              {lastUpdated ? `서울시 API (갱신: ${lastUpdated})` : '서울시 실시간 API 연동'}
            </p>
          </div>
        </div>

        {/* 작고 깔끔한 소형 새로고침 버튼 */}
        <button
          type="button"
          onClick={loadData}
          disabled={loading}
          className="p-1.5 rounded-lg bg-slate-800/80 hover:bg-slate-700 text-slate-400 hover:text-slate-200 border border-slate-700/80 transition-all cursor-pointer shrink-0"
          title="새로고침"
        >
          <RefreshCw className={`w-3.5 h-3.5 text-indigo-400 ${loading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {/* 환승역 다중 호선 선택 탭 (2개 이상 호선인 경우) */}
      {lineGroups.length > 1 && (
        <div className="flex items-center gap-1 bg-slate-950/80 p-0.5 rounded-xl border border-slate-800 text-[11px] overflow-x-auto">
          <button
            type="button"
            onClick={() => setSelectedLineFilter('all')}
            className={`px-2.5 py-1 rounded-lg font-bold transition-all cursor-pointer shrink-0 flex items-center gap-1 ${
              selectedLineFilter === 'all'
                ? 'bg-indigo-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Layers className="w-3 h-3" />
            전체 호선 ({arrivals.length})
          </button>
          {lineGroups.map((lg) => (
            <button
              key={lg.subwayId}
              type="button"
              onClick={() => setSelectedLineFilter(lg.subwayId)}
              className={`px-2.5 py-1 rounded-lg font-bold transition-all cursor-pointer shrink-0 flex items-center gap-1.5 border ${
                selectedLineFilter === lg.subwayId
                  ? 'bg-slate-800 text-white border-slate-600 shadow-sm'
                  : 'text-slate-400 border-transparent hover:text-slate-200'
              }`}
            >
              <span className="w-2 h-2 rounded-full" style={{ backgroundColor: lg.color }} />
              {lg.subwayName} ({lg.totalCount})
            </button>
          ))}
        </div>
      )}

      {/* Arrival List Container */}
      {arrivals.length === 0 ? (
        <div className="p-6 text-center text-xs text-slate-400 bg-slate-950/50 rounded-xl border border-slate-800/60 space-y-1.5 min-h-[140px] flex flex-col items-center justify-center">
          {loading ? (
            <p className="flex items-center justify-center gap-2 text-indigo-300 font-semibold py-2">
              <RefreshCw className="w-4 h-4 animate-spin text-indigo-400" />
              실시간 열차 위치를 조회하는 중입니다...
            </p>
          ) : hasSearched ? (
            <div className="py-2 space-y-1">
              <p className="text-slate-300 font-bold">현재 운행 중인 열차가 없습니다.</p>
              <p className="text-[11px] text-slate-500">
                심야/새벽 시간이거나 실시간 전광판 데이터 제공 외 구간일 수 있습니다.
              </p>
            </div>
          ) : (
            <p className="py-2">역명을 입력하면 실시간 도착 정보가 표시됩니다.</p>
          )}
        </div>
      ) : (
        <div className="space-y-4 max-h-[580px] overflow-y-auto pr-1.5 scrollbar-thin">
          {displayedGroups.map((group) => (
            <div
              key={group.subwayId}
              className="p-3 rounded-2xl bg-slate-900/60 border border-slate-800/80 space-y-3"
            >
              {/* 1단계: 호선 헤더 */}
              <div className="flex items-center justify-between pb-1.5 border-b border-slate-800">
                <div className="flex items-center gap-2">
                  <span
                    className="px-2 py-0.5 rounded-md text-[11px] font-black text-white shadow-sm"
                    style={{ backgroundColor: group.color }}
                  >
                    {group.subwayName}
                  </span>
                  <span className="text-xs font-bold text-slate-200">
                    실시간 열차 현황
                  </span>
                </div>
                <span className="text-[10px] text-slate-400 font-medium">
                  총 {group.totalCount}대 운행 중
                </span>
              </div>

              {/* 2단계: 호선 내부 상행 / 하행 분류 */}
              <div className="space-y-3">
                {/* 상행 방면 */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between px-1 text-[11px] font-bold text-indigo-300">
                    <span className="flex items-center gap-1">
                      <ArrowUpRight className="w-3 h-3 text-indigo-400" />
                      상행 방면 ({group.upLines.length}대)
                    </span>
                  </div>
                  {group.upLines.length === 0 ? (
                    <p className="text-[10px] text-slate-500 py-1.5 px-2 bg-slate-950/40 rounded-lg border border-slate-800/40">
                      상행 도착 예정 열차 없음
                    </p>
                  ) : (
                    group.upLines.map((item, idx) =>
                      renderArrivalCard(item, idx, group.color)
                    )
                  )}
                </div>

                {/* 하행 방면 */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between px-1 text-[11px] font-bold text-purple-300">
                    <span className="flex items-center gap-1">
                      <ArrowDownRight className="w-3 h-3 text-purple-400" />
                      하행 방면 ({group.downLines.length}대)
                    </span>
                  </div>
                  {group.downLines.length === 0 ? (
                    <p className="text-[10px] text-slate-500 py-1.5 px-2 bg-slate-950/40 rounded-lg border border-slate-800/40">
                      하행 도착 예정 열차 없음
                    </p>
                  ) : (
                    group.downLines.map((item, idx) =>
                      renderArrivalCard(item, idx, group.color)
                    )
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};



