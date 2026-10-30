/**
 * 수도권 전체 전철역 평일 운행 시각표 데이터베이스
 * 1호선~9호선, 신분당선, 수인분당선, 경강선, GTX-A, 공항철도, 경의중앙선 전체 역 정적 시간표
 */
import { SUBWAY_LINES_DATA } from '../utils/subwayStationsData';
import { SUBWAY_LINE_MAP } from '../utils/subwayApi';

// 1. 역명 정제 헬퍼
function cleanName(raw: string): string {
  return raw.replace(/\s*\(.*?\)/g, '').replace(/역\b|역$/g, '').trim();
}

// 2. 수도권 모든 역의 상행/하행 전체 시간표 사전 (메모리 정적 로드)
export const METROPOLITAN_FULL_TIMETABLES: Record<string, Record<number, number[]>> = {};

// 3. 노선별 공식 첫차/배차 템플릿 기반으로 전체 15개 노선 600여개 모든 역의 평일 시간표 사전 빌드
Object.entries(SUBWAY_LINES_DATA).forEach(([lineName, lineData]) => {
  const lineInfo = Object.values(SUBWAY_LINE_MAP).find(info => info.name === lineName) || {
    name: lineName,
    firstTrain: '05:30',
    lastTrain: '23:55',
    peakInterval: 3.5,
    offPeakInterval: 6.5
  };

  const [firstH, firstM] = lineInfo.firstTrain.split(':').map(Number);
  const [lastH, lastM] = lineInfo.lastTrain.split(':').map(Number);
  const firstMins = firstH * 60 + firstM;
  const lastMins = lastH < 4 ? (lastH + 24) * 60 + lastM : lastH * 60 + lastM;

  // 종착역 기준 열차 출발 스케줄 생성
  const terminal0DeptSlots: number[] = [];
  const terminal1DeptSlots: number[] = [];

  let cur0 = firstMins;
  let cur1 = firstMins + 2; // 반대 방향 미세 엇갈림 배차

  while (cur0 <= lastMins) {
    terminal0DeptSlots.push(cur0);
    const hour = Math.floor(cur0 / 60) % 24;
    const isPeak = (hour >= 7 && hour <= 9) || (hour >= 18 && hour <= 20);
    const interval = isPeak ? lineInfo.peakInterval : lineInfo.offPeakInterval;
    cur0 += Math.max(2, Math.round(interval));
  }

  while (cur1 <= lastMins) {
    terminal1DeptSlots.push(cur1);
    const hour = Math.floor(cur1 / 60) % 24;
    const isPeak = (hour >= 7 && hour <= 9) || (hour >= 18 && hour <= 20);
    const interval = isPeak ? lineInfo.peakInterval : lineInfo.offPeakInterval;
    cur1 += Math.max(2, Math.round(interval));
  }

  const term0Clean = cleanName(lineData.terminals[0]);
  const term1Clean = cleanName(lineData.terminals[1]);

  // 노선 내 모든 역에 대해 상행/하행 시간표 생성
  lineData.stations.forEach((stRaw, idx) => {
    const stClean = cleanName(stRaw);
    const distFromTerm0 = Math.round(idx * lineData.timePerStation);
    const distFromTerm1 = Math.round((lineData.stations.length - 1 - idx) * lineData.timePerStation);

    // 하행 (term0 -> term1 방면)
    const downKey = `${stClean}_${term1Clean}`;
    const downHourly: Record<number, number[]> = {};

    terminal0DeptSlots.forEach(tSlot => {
      const arrMins = tSlot + distFromTerm0;
      const hour = Math.floor(arrMins / 60) % 24;
      const min = arrMins % 60;
      if (!downHourly[hour]) downHourly[hour] = [];
      if (!downHourly[hour].includes(min)) downHourly[hour].push(min);
    });

    Object.keys(downHourly).forEach(h => downHourly[Number(h)].sort((a, b) => a - b));
    METROPOLITAN_FULL_TIMETABLES[downKey] = downHourly;

    // 상행 (term1 -> term0 방면)
    const upKey = `${stClean}_${term0Clean}`;
    const upHourly: Record<number, number[]> = {};

    terminal1DeptSlots.forEach(tSlot => {
      const arrMins = tSlot + distFromTerm1;
      const hour = Math.floor(arrMins / 60) % 24;
      const min = arrMins % 60;
      if (!upHourly[hour]) upHourly[hour] = [];
      if (!upHourly[hour].includes(min)) upHourly[hour].push(min);
    });

    Object.keys(upHourly).forEach(h => upHourly[Number(h)].sort((a, b) => a - b));
    METROPOLITAN_FULL_TIMETABLES[upKey] = upHourly;

    // 일반 역 단독 키도 등록 (방향 무관 조회용)
    if (!METROPOLITAN_FULL_TIMETABLES[stClean]) {
      METROPOLITAN_FULL_TIMETABLES[stClean] = downHourly;
    }
  });
});

/**
 * 특정 역과 방향에 대한 평일 전체 시간표(분 배열) 조회
 */
export function getFullStationTimetableMinutes(stationName: string, directionHint: string = ''): number[] {
  const stClean = cleanName(stationName);
  const dirClean = cleanName(directionHint);

  // 1. 역명_방면 정확 매칭
  let targetHourly = METROPOLITAN_FULL_TIMETABLES[`${stClean}_${dirClean}`];

  // 2. 부분 매칭
  if (!targetHourly) {
    for (const [key, hourly] of Object.entries(METROPOLITAN_FULL_TIMETABLES)) {
      const [st, dir] = key.split('_');
      if (st === stClean && (!dirClean || dir.includes(dirClean) || dirClean.includes(dir))) {
        targetHourly = hourly;
        break;
      }
    }
  }

  // 3. 기본 역명 매칭
  if (!targetHourly) {
    targetHourly = METROPOLITAN_FULL_TIMETABLES[stClean];
  }

  if (!targetHourly) {
    return [];
  }

  const result: number[] = [];
  Object.entries(targetHourly).forEach(([hourStr, mins]) => {
    const hour = Number(hourStr);
    mins.forEach(m => {
      const totalMins = (hour >= 24 ? hour - 24 : hour) * 60 + m;
      result.push(hour >= 24 ? totalMins + 24 * 60 : totalMins);
    });
  });

  result.sort((a, b) => a - b);
  return result;
}
