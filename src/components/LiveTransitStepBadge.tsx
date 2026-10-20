import React, { useState, useEffect } from 'react';
import { RouteStepItem } from '../types/bus';
import { fetchRealtimeSubwayArrival, cleanSubwayStationName, RealtimeArrival, SUBWAY_LINE_MAP, getSubwayScheduleInfo, deduplicateSubwayArrivals, generateDailySubwayTimetable } from '../utils/subwayApi';
import { fetchLiveBusArrivals, fetchUpcomingBusesForRoute, fetchStationLiveArrivals, BusArrivalItem, formatBusArrivalTime, findNearestHubBusStop, getBusRouteConfig, calculateEstimatedArrival } from '../utils/busLiveApi';
import { Train, Bus, Clock, MapPin, Zap, ChevronDown, ChevronUp, Layers, Calendar, Info, ExternalLink, RefreshCw } from 'lucide-react';

interface LiveTransitStepBadgeProps {
  step: RouteStepItem;
}

// 지하철 호선별 공식 대표 색상 매핑
export const SUBWAY_LINE_COLORS: Record<string, string> = {
  '1호선': '#0052A4',
  '2호선': '#00A84D',
  '3호선': '#EF7C1C',
  '4호선': '#00A5DE',
  '5호선': '#996CAC',
  '6호선': '#CD7C2F',
  '7호선': '#747F00',
  '8호선': '#E6186C',
  '9호선': '#BDB092',
  '경의중앙': '#77C4A3',
  '경의중앙선': '#77C4A3',
  '공항철도': '#0090D2',
  '경춘선': '#0C8E72',
  '수인분당': '#F5A200',
  '수인분당선': '#F5A200',
  '신분당선': '#D4003B',
  '경강선': '#003DA5',
  '우이신설선': '#B0CE18',
  '서해선': '#81A914',
  'GTX-A': '#9A6292',
};

export function getSubwayLineColor(lineNameOrId: string, fallbackTitle: string = ''): string {
  // 1. Line ID 매핑 (1008 -> 8호선)
  if (SUBWAY_LINE_MAP[lineNameOrId]) {
    return SUBWAY_LINE_MAP[lineNameOrId].color;
  }
  // 2. 호선 이름 직접 매핑
  for (const [key, color] of Object.entries(SUBWAY_LINE_COLORS)) {
    if (lineNameOrId.includes(key) || fallbackTitle.includes(key)) {
      return color;
    }
  }
  return '#E6186C'; // 기본 8호선 핑크
}

export const LiveTransitStepBadge: React.FC<LiveTransitStepBadgeProps> = ({ step }) => {
  const [subwayArrivals, setSubwayArrivals] = useState<RealtimeArrival[]>([]);
  const [busArrivals, setBusArrivals] = useState<BusArrivalItem[]>([]);
  const [stationArrivals, setStationArrivals] = useState<BusArrivalItem[]>([]);
  const [stationDisplayName, setStationDisplayName] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);
  const [expanded, setExpanded] = useState<boolean>(false);

  // 지하철 호선 색상 및 스케줄 추출
  const { lineColor, scheduleInfo } = React.useMemo(() => {
    if (step.type !== 'subway') {
      return { lineColor: '#2563eb', scheduleInfo: getSubwayScheduleInfo('지하철') };
    }
    const lineHintMatch = step.title.match(/([0-9]호선|신분당선|수인분당선|경강선|GTX-A|경의중앙선|공항철도)/) || step.subtitle?.match(/([0-9]호선|신분당선|수인분당선|경강선|GTX-A|경의중앙선|공항철도)/);
    const lineName = lineHintMatch ? lineHintMatch[1] : step.title;
    const color = getSubwayLineColor(lineName, step.subtitle || '');
    const sched = getSubwayScheduleInfo(lineName);
    return { lineColor: color, scheduleInfo: sched };
  }, [step]);

  useEffect(() => {
    let isMounted = true;

    async function loadLiveInfo() {
      if (step.type === 'subway') {
        // 1. 탑승역 명칭 정밀 추출 (step.boardingStopName 우선, 없으면 title 앞부분에서 추출)
        let stationName = step.boardingStopName || '';
        if (!stationName) {
          const boardingPart = step.title.split('➔')[0] || step.title;
          stationName = boardingPart
            .replace(/([0-9]+호선|신분당선|수인분당선|경강선|GTX-A|GTX|경의중앙선|공항철도)/g, '')
            .replace(/지하철|전철|호선|환승|탑승|출발|승차|이동/g, '')
            .trim();
        }
        const cleanName = cleanSubwayStationName(stationName);

        const lineHintMatch = step.title.match(/([0-9]호선|신분당선|수인분당선|경강선|GTX-A|경의중앙선|공항철도)/) || step.subtitle?.match(/([0-9]호선|신분당선|수인분당선|경강선|GTX-A|경의중앙선|공항철도)/);
        const lineHint = lineHintMatch ? lineHintMatch[1] : '';

        // 2. 행선지/방면 힌트 정밀 추출 (step.dropoffStopName 우선, 없으면 subtitle/title에서 추출)
        let dirHint = '';
        if (step.dropoffStopName) {
          dirHint = cleanSubwayStationName(step.dropoffStopName);
        } else if (step.subtitle) {
          const dirMatch = step.subtitle.match(/([가-힣\d]+)\s*(?:행|방면)/);
          if (dirMatch) dirHint = cleanSubwayStationName(dirMatch[1]);
        }
        if (!dirHint && step.title.includes('➔')) {
          const destPart = step.title.split('➔')[1] || '';
          const cleanedDest = destPart
            .replace(/([0-9]+호선|신분당선|수인분당선|경강선|GTX-A|GTX|경의중앙선|공항철도)/g, '')
            .replace(/지하철|전철|호선|환승|탑승|출발|승차|이동|도착/g, '')
            .trim();
          dirHint = cleanSubwayStationName(cleanedDest);
        }

        if (!cleanName) return;

        setLoading(true);
        try {
          const list = await fetchRealtimeSubwayArrival(cleanName, lineHint, dirHint);
          if (!isMounted) return;

          if (list && list.length > 0) {
            const targetDirection = (step.title + ' ' + (step.subtitle || '') + ' ' + (step.note || '')).toLowerCase();
            
            // 행선지 방향에 맞는 열차 필터링
            const matchedList = list.filter(item => {
              const trainLine = (item.trainLineNm + ' ' + item.bstatnNm + ' ' + item.updnLine).toLowerCase();
              
              const tokens = targetDirection
                .replace(/지하철|전철|호선|탑승|이동|방면|행|도보|환승|하차|직통/g, ' ')
                .split(/[\s➔→\->·()]+/)
                .map(t => t.replace(/역$/, '').trim())
                .filter(t => t.length >= 2);

              for (const token of tokens) {
                if (trainLine.includes(token)) return true;
              }
              return false;
            });

            const finalArrivals = deduplicateSubwayArrivals(matchedList.length > 0 ? matchedList : list);
            setSubwayArrivals(finalArrivals);
          } else {
            setSubwayArrivals([]);
          }
        } catch (e) {
          console.error(e);
        } finally {
          if (isMounted) setLoading(false);
        }
      } else if (step.type === 'public_bus') {
        const fullText = (step.title + ' ' + (step.subtitle || '') + ' ' + (step.note || '')).trim();

        // 1. 버스 번호 정밀 파싱 (step.title 우선 추출, M/G/P 광역버스 및 일반/마을버스 모두 지원)
        // 1. 탑승 대상 버스 노선 번호 추출 (step.busNo 최우선)
        let routeNoList: string[] = [];
        if (step.busNo) {
          routeNoList = [step.busNo];
        }

        // ※ '5번출구', '4번출구' 등 지하철 출구 번호는 절대 버스 번호로 매칭되지 않도록 (?!\s*출구) 부정형 전방탐색 적용
        if (routeNoList.length === 0) {
          const titleMatches = [...step.title.matchAll(/(?:간선|지선|광역|시내|마을)?\s*([MGP]?[0-9]+(?:-[0-9A-Za-z]+)?)\s*번(?!\s*출구)/gi)];
          routeNoList = titleMatches.map(m => m[1]);
        }

        if (routeNoList.length === 0) {
          const allMatches = [...fullText.matchAll(/(?:간선|지선|광역|시내|마을)?\s*([MGP]?[0-9]+(?:-[0-9A-Za-z]+)?)\s*번(?!\s*출구)/gi)];
          routeNoList = allMatches.map(m => m[1]);
        }

        if (routeNoList.length === 0) {
          const numMatch = step.title.match(/\b([MGP]?[0-9]{1,4}(?:-[0-9A-Za-z]+)?)\s*번/i);
          if (numMatch) routeNoList = [numMatch[1]];
        }

        // 특정 노선 번호가 없는 일반 연계 버스는 빈 배열로 둠 (절대 87번 등으로 임의 왜곡하지 않음!)
        routeNoList = Array.from(new Set(routeNoList));
        const primaryRouteNo = routeNoList.length > 0 ? routeNoList[0] : '';

        // 2. 승차 정류장 판별 및 고유 정류소 ID 추출
        const stationIdMatch = (step.detailLocation || step.boardingStopName || '').match(/정류소\s*ID:\s*(\d+)/i);
        const odsayStationId = stationIdMatch ? stationIdMatch[1] : undefined;

        // 정류소 명칭: 카카오 API 및 경로 스텝에서 제공한 실제 정류소명 우선 (하드코딩 배제)
        let stopNameFallback = step.boardingStopName || '';
        if (!stopNameFallback) {
          if (step.title.includes('➔')) {
            const firstPart = step.title.replace(/\[.*?\]/g, '').split('➔')[0].trim();
            stopNameFallback = firstPart.replace(/(출발|탑승|승차|방면)/g, '').trim();
            if (stopNameFallback && !stopNameFallback.includes('정류')) {
              stopNameFallback += ' 버스정류장';
            }
          } else {
            stopNameFallback = step.subtitle?.split('➔')[0]?.trim() || '인근 버스정류장';
          }
        }

        // 사옥 정문 등 300m 이내 초근접 핵심 환승지점 여부만 감지
        let stopKey = '';
        if (step.coords?.lat && step.coords?.lng) {
          const nearest = findNearestHubBusStop(step.coords.lat, step.coords.lng, 350);
          if (nearest) {
            stopKey = nearest.key;
          }
        }

        setStationDisplayName(stopNameFallback);
        setLoading(true);
        try {
          // 1. 해당 정류소에 실시간 도착 중인 모든 버스 목록 조회 (국토부 BIS 및 동적 정류소 배차 연동)
          const liveStnBuses = await fetchStationLiveArrivals(
            stopKey, 
            odsayStationId, 
            stopNameFallback, 
            step.coords, 
            routeNoList
          );
          if (!isMounted) return;
          setStationArrivals(liveStnBuses);

          // 2. 탑승 대상 버스 도착 정보 매칭 (정규화된 번호 비교)
          const cleanTargetNos = routeNoList.map(n => n.replace(/[^0-9A-Za-z]/g, '').toLowerCase());
          const multiArrivals: BusArrivalItem[] = [];

          if (cleanTargetNos.length > 0) {
            for (const cNo of cleanTargetNos) {
              const matched = liveStnBuses.filter(b => {
                const bClean = b.routeNo.replace(/[^0-9A-Za-z]/g, '').toLowerCase();
                return bClean === cNo;
              });
              if (matched.length > 0) {
                multiArrivals.push(...matched);
              }
            }
          }

          if (multiArrivals.length > 0) {
            multiArrivals.sort((a, b) => a.arrTimeSec - b.arrTimeSec);
            setBusArrivals(multiArrivals);
          } else if (liveStnBuses.length > 0) {
            setBusArrivals(liveStnBuses);
          } else if (primaryRouteNo) {
            // BIS에 일시적으로 안 잡힌 경우 배차 주기 기반 도착 예정 시간 자동 제공
            const est = calculateEstimatedArrival(primaryRouteNo, stopNameFallback);
            setBusArrivals([est]);
          } else {
            const est = calculateEstimatedArrival('연계버스', stopNameFallback);
            setBusArrivals([est]);
          }
        } catch (e) {
          console.error(e);
          if (isMounted) {
            const fallbackNo = primaryRouteNo || '연계버스';
            const est = calculateEstimatedArrival(fallbackNo, stopNameFallback);
            setBusArrivals([est]);
          }
        } finally {
          if (isMounted) setLoading(false);
        }
      }
    }

    loadLiveInfo();
    const interval = setInterval(loadLiveInfo, 30000); // 30초 실시간 갱신

    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, [step]);

  const [showFullTimetable, setShowFullTimetable] = useState<boolean>(false);

  // 1. 지하철 실시간 도착 뱃지 (호선별 고유 역 색상 적용 + 클릭 시 다음 열차 목록 확장)
  if (step.type === 'subway') {
    let stationName = step.boardingStopName || '';
    if (!stationName) {
      const boardingPart = step.title.split('➔')[0] || step.title;
      stationName = boardingPart
        .replace(/([0-9]+호선|신분당선|수인분당선|경강선|GTX-A|GTX|경의중앙선|공항철도)/g, '')
        .replace(/지하철|전철|호선|환승|탑승|출발|승차|이동/g, '')
        .trim();
    }
    const cleanName = cleanSubwayStationName(stationName);

    const primaryArrival = subwayArrivals[0];

    // 전체 운행 시간표 데이터 (시간대별 그룹화)
    const dailyTimetable = generateDailySubwayTimetable(cleanName, scheduleInfo.line);
    const hourlyTimetable: Record<number, number[]> = {};
    dailyTimetable.forEach(mins => {
      const hour = Math.floor(mins / 60) % 24;
      const min = mins % 60;
      if (!hourlyTimetable[hour]) hourlyTimetable[hour] = [];
      hourlyTimetable[hour].push(min);
    });

    return (
      <div
        className="mt-2 rounded-xl border text-xs shadow-sm transition-all overflow-hidden"
        style={{
          backgroundColor: `${lineColor}12`,
          borderColor: `${lineColor}45`,
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header Clickable Row */}
        <div
          onClick={(e) => {
            e.stopPropagation();
            setExpanded(!expanded);
          }}
          className="p-2 flex flex-wrap items-center justify-between gap-1.5 cursor-pointer hover:bg-white/5 transition-colors"
        >
          <div className="flex items-center gap-1.5 min-w-0">
            <span className="w-2 h-2 rounded-full animate-ping shrink-0" style={{ backgroundColor: lineColor }} />
            <Train className="w-3.5 h-3.5 shrink-0" style={{ color: lineColor }} />
            
            {/* 호선 뱃지 */}
            <span
              className="px-1.5 py-0.5 rounded text-[10px] font-black text-white shrink-0 shadow-sm"
              style={{ backgroundColor: lineColor }}
            >
              {scheduleInfo.line}
            </span>

            <span className="font-bold truncate text-white">
              {(primaryArrival?.trainLineNm || `${cleanName}역`)
                .replace(/\s*\(\d{1,2}:\d{2}\s*출발\)/g, '')
                .replace(/\s*\(\d{1,2}:\d{2}\)/g, '')
                .trim()}
            </span>

            {/* 실시간 도착 메시지 */}
            {primaryArrival && (
              <span
                className="font-extrabold px-2 py-0.5 rounded-md text-[11px] shrink-0 text-white shadow-sm border"
                style={{
                  backgroundColor: `${lineColor}35`,
                  borderColor: `${lineColor}60`,
                }}
              >
                ⚡ {primaryArrival.arvlMsg2 || '운행 중'}
              </span>
            )}
          </div>

          <div className="flex items-center gap-1.5 shrink-0" onClick={(e) => e.stopPropagation()}>
            {/* 전체 시간표 버튼 */}
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setShowFullTimetable(!showFullTimetable);
              }}
              className="flex items-center gap-0.5 text-[10px] font-bold px-1.5 py-0.5 rounded bg-slate-900/90 text-indigo-300 border border-indigo-500/30 hover:bg-indigo-950/60 transition-colors"
            >
              <Calendar className="w-3 h-3" />
              <span>{showFullTimetable ? '시간표 닫기' : '전체 시간표'}</span>
            </button>

            {/* 다음 열차 토글 버튼 */}
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setExpanded(!expanded);
              }}
              className="flex items-center gap-0.5 text-[10px] font-bold px-1.5 py-0.5 rounded bg-slate-900/80 text-slate-300 border border-slate-800 hover:text-white"
            >
              {expanded ? (
                <>
                  <span>접기</span>
                  <ChevronUp className="w-3 h-3" />
                </>
              ) : (
                <>
                  <span>다음 열차 ({subwayArrivals.length || 3}대)</span>
                  <ChevronDown className="w-3 h-3" />
                </>
              )}
            </button>
          </div>
        </div>

        {/* Full Timetable Drawer (시간대별 지하철 출발 시간표 팝업) */}
        {showFullTimetable && (
          <div className="p-3 border-t border-slate-800 bg-slate-950/95 space-y-2 animate-fade-in" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between pb-1 border-b border-slate-800">
              <span className="font-bold text-white flex items-center gap-1.5 text-xs">
                <Calendar className="w-3.5 h-3.5" style={{ color: lineColor }} />
                {cleanName}역 {scheduleInfo.line} 표준 운행 시간표
              </span>
              <span className="text-[10px] text-emerald-400 font-semibold">
                첫차 {scheduleInfo.firstTrain} · 막차 {scheduleInfo.lastTrain}
              </span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5 max-h-48 overflow-y-auto pr-1 text-[10px]">
              {Object.entries(hourlyTimetable).map(([hourStr, mins]) => {
                const hour = Number(hourStr);
                const isCurrentHour = new Date().getHours() === hour;
                const isPeak = (hour >= 7 && hour <= 9) || (hour >= 18 && hour <= 20);

                return (
                  <div
                    key={hour}
                    className={`p-1.5 rounded border ${
                      isCurrentHour
                        ? 'bg-indigo-950/60 border-indigo-500/50 text-indigo-200'
                        : isPeak
                        ? 'bg-slate-900/90 border-slate-700/60 text-slate-300'
                        : 'bg-slate-900/50 border-slate-800/60 text-slate-400'
                    }`}
                  >
                    <div className="flex items-center justify-between font-bold pb-0.5 border-b border-slate-800/60">
                      <span className={isCurrentHour ? 'text-indigo-300' : 'text-white'}>
                        {String(hour).padStart(2, '0')}시
                      </span>
                      {isPeak && <span className="text-[9px] text-amber-400">배차 {scheduleInfo.peakIntervalMinutes}분</span>}
                    </div>
                    <div className="flex flex-wrap gap-1 mt-1">
                      {mins.map((m, idx) => (
                        <span
                          key={idx}
                          className={`px-1 py-0.5 rounded font-mono font-bold ${
                            isCurrentHour
                              ? 'bg-indigo-500/20 text-indigo-200'
                              : 'bg-slate-800/60 text-slate-300'
                          }`}
                        >
                          {String(m).padStart(2, '0')}
                        </span>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Expanded: 다음 열차 실시간 목록 및 첫차/막차 시각표 */}
        {expanded && (
          <div className="p-2.5 pt-1 border-t border-slate-800/80 bg-slate-950/80 space-y-2 animate-fade-in" onClick={(e) => e.stopPropagation()}>
            {/* 첫차 / 막차 / 배차간격 안내 바 */}
            <div className="flex flex-wrap items-center justify-between gap-1 p-2 rounded-lg bg-slate-900/90 border border-slate-800 text-[10px] text-slate-300">
              <span className="flex items-center gap-1 font-bold text-white">
                <Calendar className="w-3 h-3" style={{ color: lineColor }} />
                {scheduleInfo.line} 운행 현황
              </span>
              <div className="flex items-center gap-2">
                <span>🌅 첫차 <strong className="text-emerald-400">{scheduleInfo.firstTrain}</strong></span>
                <span>🌙 막차 <strong className="text-amber-400">{scheduleInfo.lastTrain}</strong></span>
                <span>⏱️ 출퇴근 배차 <strong className="text-indigo-300">{scheduleInfo.peakIntervalMinutes}분</strong></span>
              </div>
            </div>

            <p className="text-[10px] font-bold text-slate-400 flex items-center justify-between pb-0.5 border-b border-slate-800">
              <span className="flex items-center gap-1">
                <Layers className="w-3 h-3" style={{ color: lineColor }} />
                후속 열차 실시간 도착 예정 목록
              </span>
              <span className="text-[9px] text-slate-500">실시간 데이터 연동</span>
            </p>

            {subwayArrivals.map((train, idx) => (
              <div
                key={`${train.btrainNo}-${idx}`}
                className="flex items-center justify-between p-1.5 rounded-lg bg-slate-900/90 border border-slate-800/80 text-[11px]"
              >
                <div className="flex items-center gap-1.5">
                  <span
                    className="w-1.5 h-1.5 rounded-full"
                    style={{ backgroundColor: lineColor }}
                  />
                  <span className="font-bold text-slate-200">
                    {idx === 0 ? '이번 열차' : idx === 1 ? '다음 열차' : '다다음 열차'}
                  </span>
                  <span className="text-slate-300 font-semibold truncate max-w-[140px]">
                    {train.trainLineNm
                      .replace(/\s*\(\d{1,2}:\d{2}\s*출발\)/g, '')
                      .replace(/\s*\(\d{1,2}:\d{2}\)/g, '')
                      .trim()}
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  <span className="font-extrabold text-emerald-400">
                    {train.arvlMsg2}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  }

  // 2. 버스 실시간 도착 뱃지 (국토교통부 API 연동 + 클릭 시 다음 버스 2~3대 목록 확장)
  if (step.type === 'public_bus') {
    const primaryBus = busArrivals[0];

    // 버스 번호 힌트 추출 (step.busNo 최우선)
    const titleMatches = [...step.title.matchAll(/(?:간선|지선|광역|시내|마을)?\s*([MGP]?[0-9]+(?:-[0-9A-Za-z]+)?)\s*번(?!\s*출구)/gi)];
    const primaryRouteNo = step.busNo || (titleMatches.length > 0 ? titleMatches[0][1] : '');

    if (loading) {
      return (
        <div className="mt-2 rounded-xl border border-cyan-500/30 bg-slate-900/60 p-2.5 flex items-center justify-between gap-2 text-xs animate-pulse">
          <div className="flex items-center gap-2 min-w-0">
            <Bus className="w-3.5 h-3.5 text-cyan-400 animate-spin shrink-0" />
            <div className="min-w-0">
              <span className="font-semibold text-slate-200">
                {stationDisplayName || '정류소'} 버스 정보 조회 중...
              </span>
              <span className="text-[10px] text-slate-400 block truncate mt-0.5">
                국토교통부 BIS 공공데이터 실시간 연결 확인 중
              </span>
            </div>
          </div>
        </div>
      );
    }

    const activeBus = primaryBus || (primaryRouteNo ? calculateEstimatedArrival(primaryRouteNo, stationDisplayName) : calculateEstimatedArrival('연계버스', stationDisplayName));
    const formatted = formatBusArrivalTime(activeBus.arrTimeSec, activeBus.arrStationCount);

    return (
      <div
        className="mt-2 rounded-xl border border-cyan-500/40 bg-gradient-to-r from-cyan-950/40 via-slate-900/90 to-cyan-950/30 text-xs shadow-sm transition-all overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header Clickable Row */}
        <div
          onClick={(e) => {
            e.stopPropagation();
            setExpanded(!expanded);
          }}
          className="p-2 flex flex-wrap items-center justify-between gap-1.5 cursor-pointer hover:bg-white/5 transition-colors"
        >
          <div className="flex items-center gap-1.5 min-w-0">
            <span className="w-2 h-2 rounded-full bg-cyan-400 animate-ping shrink-0" />
            <Bus className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
            
            {/* 노선 번호 뱃지 */}
            <span
              className="px-2 py-0.5 rounded text-[11px] font-black text-white shrink-0 shadow-sm"
              style={{ backgroundColor: activeBus.routeColor }}
            >
              {activeBus.routeNo.includes('버스') ? activeBus.routeNo : `${activeBus.routeNo}번`}
            </span>

            {/* 실시간 카운트다운 또는 배차 주기 도착 예정 시간 안내 */}
            {activeBus.isRealtime ? (
              <span className={`font-extrabold px-2 py-0.5 rounded-md border text-[11px] shrink-0 flex items-center gap-1.5 ${
                formatted.isSoon
                  ? 'bg-rose-500/30 text-rose-200 border-rose-500/40 animate-pulse'
                  : 'bg-cyan-500/30 text-cyan-200 border-cyan-500/40'
              }`}>
                <span>{formatted.isSoon ? '⚡' : '⏱️'} {formatted.timeText}</span>
                {activeBus.arrStationCount > 0 && (
                  <span className="text-[10px] px-1 py-0.2 rounded bg-black/40 font-bold text-amber-300 border border-amber-500/30">
                    {activeBus.arrStationCount}정류장 전
                  </span>
                )}
              </span>
            ) : (
              <span className="font-extrabold px-2 py-0.5 rounded-md border text-[11px] shrink-0 flex items-center gap-1.5 bg-gradient-to-r from-cyan-950/80 to-blue-950/80 text-cyan-200 border-cyan-500/40 shadow-sm animate-pulse">
                <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-ping" />
                <span>⚡ 약 {activeBus.arrTimeMin}분 후 도착 예정</span>
              </span>
            )}
          </div>

          <div className="flex items-center gap-2 shrink-0" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center gap-1 text-[10px] text-slate-300">
              {activeBus.isRealtime ? (
                <span>(현재: <strong className="text-white">{activeBus.currentStationName}</strong>)</span>
              ) : (
                <span className="text-slate-400">({stationDisplayName || activeBus.stationName})</span>
              )}
              {activeBus.lowPlate && (
                <span className="px-1 py-0.2 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-[9px] font-bold">
                  저상
                </span>
              )}
            </div>

            {/* 카카오맵 실시간 위치 빠른 링크 */}
            <a
              href={`https://map.kakao.com/?q=${encodeURIComponent(
                activeBus.routeNo.includes('버스')
                  ? (stationDisplayName || '버스정류장')
                  : (activeBus.routeNo + '번 버스')
              )}`}
              target="_blank"
              rel="noopener noreferrer"
              onClick={(e) => e.stopPropagation()}
              className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-yellow-500/20 text-yellow-300 hover:bg-yellow-500/30 border border-yellow-500/30 transition-all flex items-center gap-0.5 shadow-sm"
              title="카카오맵에서 실시간 버스 위치 확인"
            >
              <span>실시간 지도</span>
              <ExternalLink className="w-2.5 h-2.5" />
            </a>

            {/* 다음 버스 토글 버튼 */}
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setExpanded(!expanded);
              }}
              className="flex items-center gap-0.5 text-[10px] font-bold px-1.5 py-0.5 rounded bg-slate-900/80 text-slate-300 border border-slate-800 hover:text-white"
            >
              {expanded ? (
                <>
                  <span>접기</span>
                  <ChevronUp className="w-3 h-3" />
                </>
              ) : (
                <>
                  <span>정류소 전광판</span>
                  <ChevronDown className="w-3 h-3" />
                </>
              )}
            </button>
          </div>
        </div>

        {/* Expanded: 버스 운행 상세 목록 및 해당 정류소 실시간 도착 전광판 */}
        {expanded && (
          <div className="p-2.5 pt-1 border-t border-slate-800/80 bg-slate-950/80 space-y-2.5 animate-fade-in" onClick={(e) => e.stopPropagation()}>
            <p className="text-[10px] font-bold text-slate-400 flex items-center justify-between pb-1 border-b border-slate-800">
              <span className="flex items-center gap-1">
                <Layers className="w-3 h-3 text-cyan-400" />
                {activeBus.isRealtime ? '탑승 노선 실시간 도착 정보' : '탑승 노선 운행 정보'}
              </span>
              <span className="text-[9px] text-slate-500">
                {activeBus.isRealtime ? '국토교통부 실시간 BIS' : '정규 배차 주기 기준'}
              </span>
            </p>

            {/* 실시간 미제공 시 명확한 안내 박스 */}
            {!activeBus.isRealtime && (
              <div className="p-2 rounded-lg bg-amber-950/30 border border-amber-500/20 text-[10.5px] text-amber-200/90 leading-relaxed flex items-start gap-1.5">
                <Info className="w-3.5 h-3.5 text-amber-400 shrink-0 mt-0.5" />
                <div>
                  <p className="font-semibold text-amber-300">
                    배차간격 기준 운행 안내 ({stationDisplayName || activeBus.stationName})
                  </p>
                  <p className="text-slate-300 text-[10px] mt-0.5">
                    현재 정류소의 정규 배차간격(약 {activeBus.arrTimeMin || 8}분)을 기준으로 운행 정보가 표시됩니다. 실시간 정류소 버스 위치는 우측 상단의 [실시간 지도]를 클릭하시면 카카오맵에서 즉시 확인하실 수 있습니다.
                  </p>
                </div>
              </div>
            )}

            {/* 탑승 대상 버스 목록 */}
            {(busArrivals.length > 0 ? busArrivals : [activeBus]).map((bus, idx) => {
              const busFmt = formatBusArrivalTime(bus.arrTimeSec, bus.arrStationCount);
              const isSameRoute = (busArrivals.length > 0 ? busArrivals : [activeBus]).every(b => b.routeNo === (busArrivals[0] || activeBus).routeNo);
              const displayRouteNo = bus.routeNo.includes('버스') ? bus.routeNo : `${bus.routeNo}번`;
              const label = isSameRoute
                ? (idx === 0 ? '이번 버스' : idx === 1 ? '다음 버스' : '후속 버스')
                : `${displayRouteNo} (${bus.routeType})`;

              return (
                <div
                  key={bus.routeId || idx}
                  className="flex items-center justify-between p-1.5 rounded-lg bg-slate-900/90 border border-slate-800/80 text-[11px]"
                >
                  <div className="flex items-center gap-1.5">
                    <span
                      className="px-1.5 py-0.5 rounded text-[10px] font-black text-white shrink-0 shadow-sm"
                      style={{ backgroundColor: bus.routeColor }}
                    >
                      {displayRouteNo}
                    </span>
                    <span className="font-bold text-slate-200">
                      {label}
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    {bus.isRealtime ? (
                      <>
                        <span className={`font-extrabold ${idx === 0 ? 'text-cyan-300' : 'text-slate-300'}`}>
                          ⏱️ {busFmt.timeText}
                        </span>
                        {bus.arrStationCount > 0 && (
                          <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-800 text-amber-300 font-bold border border-slate-700">
                            {bus.arrStationCount}정류장 전
                          </span>
                        )}
                      </>
                    ) : (
                      <span className="font-bold text-cyan-300">
                        ⚡ 약 {bus.arrTimeMin}분 후 도착 예정
                      </span>
                    )}
                    {bus.lowPlate && (
                      <span className="px-1 py-0.2 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-[9px] font-bold">
                        저상
                      </span>
                    )}
                  </div>
                </div>
              );
            })}

            {/* 🔥 정류소 전체 실시간 버스 도착 전광판 (웹사이트 화면에 직접 렌더링) */}
            {stationArrivals.length > 0 && (
              <div className="mt-2.5 pt-2 border-t border-slate-800 space-y-1.5">
                <div className="flex items-center justify-between pb-1 text-[10.5px]">
                  <span className="font-extrabold text-white flex items-center gap-1.5">
                    <Zap className="w-3.5 h-3.5 text-amber-400 fill-amber-400" />
                    <span>🚏 {stationDisplayName || primaryBus.stationName} 실시간 도착 전광판</span>
                  </span>
                  <span className="text-[9.5px] px-2 py-0.5 rounded bg-cyan-950/80 text-cyan-300 font-bold border border-cyan-500/30 flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-ping" />
                    {stationArrivals.some(b => b.isRealtime) ? '실시간 BIS 연동' : '실시간 배차 연동'} ({stationArrivals.length}대 운행 중)
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                  {stationArrivals.map((stnBus) => (
                    <div
                      key={stnBus.routeId}
                      className="flex items-center justify-between p-1.5 px-2 rounded-lg bg-slate-900/95 border border-slate-800 text-[11px] hover:border-cyan-500/40 transition-colors"
                    >
                      <div className="flex items-center gap-1.5 min-w-0">
                        <span
                          className="px-1.5 py-0.2 rounded text-[10px] font-black text-white shrink-0 shadow-sm"
                          style={{ backgroundColor: stnBus.routeColor }}
                        >
                          {stnBus.routeNo}번
                        </span>
                        <span className="text-slate-400 text-[10px] truncate max-w-[85px]">
                          {stnBus.routeType}
                        </span>
                      </div>

                      <div className="flex items-center gap-1.5 shrink-0">
                        <span className="font-black text-cyan-300 text-[11px]">
                          ⚡ {stnBus.arrTimeMin}분 후
                        </span>
                        {stnBus.arrStationCount > 0 && (
                          <span className="text-[9px] px-1 py-0.2 rounded bg-slate-800 text-amber-300 font-bold border border-slate-700">
                            {stnBus.arrStationCount}전
                          </span>
                        )}
                        {stnBus.lowPlate && (
                          <span className="text-[8.5px] px-1 py-0.2 rounded bg-emerald-500/20 text-emerald-300 font-bold">
                            저상
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* 🔥 정류소 연계 버스 도착 전광판 (실시간 BIS 대기 또는 복수 노선 배차 시) */}
            {stationArrivals.length === 0 && busArrivals.length > 1 && (
              <div className="mt-2.5 pt-2 border-t border-slate-800 space-y-1.5">
                <div className="flex items-center justify-between pb-1 text-[10.5px]">
                  <span className="font-extrabold text-white flex items-center gap-1.5">
                    <Zap className="w-3.5 h-3.5 text-cyan-400" />
                    <span>🚏 {stationDisplayName || primaryBus.stationName} 연계 노선 운행 정보</span>
                  </span>
                  <span className="text-[9.5px] px-2 py-0.5 rounded bg-cyan-950/80 text-cyan-300 font-bold border border-cyan-500/30 flex items-center gap-1">
                    배차 주기 연동 ({busArrivals.length}개 노선)
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                  {busArrivals.map((b) => (
                    <div
                      key={b.routeId}
                      className="flex items-center justify-between p-1.5 px-2 rounded-lg bg-slate-900/95 border border-slate-800 text-[11px] hover:border-cyan-500/40 transition-colors"
                    >
                      <div className="flex items-center gap-1.5 min-w-0">
                        <span
                          className="px-1.5 py-0.2 rounded text-[10px] font-black text-white shrink-0 shadow-sm"
                          style={{ backgroundColor: b.routeColor }}
                        >
                          {b.routeNo.includes('버스') ? b.routeNo : `${b.routeNo}번`}
                        </span>
                        <span className="text-slate-400 text-[10px] truncate max-w-[85px]">
                          {b.routeType}
                        </span>
                      </div>

                      <div className="flex items-center gap-1.5 shrink-0">
                        <span className="font-bold text-cyan-300 text-[11px]">
                          ⚡ 약 {b.arrTimeMin}분 후
                        </span>
                        {b.lowPlate && (
                          <span className="text-[8.5px] px-1 py-0.2 rounded bg-emerald-500/20 text-emerald-300 font-bold">
                            저상
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    );
  }

  return null;
};
