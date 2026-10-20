/**
 * 수도권 지하철 네트워크 그래프 라우팅 엔진 (Dijkstra 최단 경로 알고리즘 기반)
 * 하드코딩 없이 수도권 전체 노선망 그래프 탐색으로 최적 환승 경로, 소요시간, 세부 구간을 동적 계산합니다.
 */
import { RouteStepItem } from '../types/bus';
import { minutesToTimeString, parseTimeToMinutes } from './distance';
import { matchScheduledSubwayDeparture } from './subwayApi';

export interface SubwayTransitSegment {
  line: string; // e.g. "3호선", "신분당선", "8호선", "2호선", "수인분당선", "경강선", "GTX-A"
  fromStation: string; // e.g. "화정역", "강남역", "장자호수공원역"
  toStation: string; // e.g. "양재역", "판교역", "잠실역"
  durationMinutes: number; // 구간별 소요시간 (분)
  directionHint?: string; // e.g. "오금행", "광교행", "모란행"
  transferWalkMinutes?: number; // 환승 도보 시간 (기본 3분)
  stationCount?: number;
  note?: string;
}

export interface SubwayTransitInfo {
  minutes: number;
  transferCount: number;
  routeDesc: string;
  segments: SubwayTransitSegment[];
}

export interface SubwayStationInfo {
  name: string;
  lines: string[];
  lat: number;
  lng: number;
}

// -------------------------------------------------------------
import { SUBWAY_LINES_DATA, SUBWAY_STATION_COORDS } from './subwayStationsData';
export { SUBWAY_LINES_DATA, SUBWAY_STATION_COORDS };

// -------------------------------------------------------------
// 3. 지하철 네트워크 역 정보 생성 (노선별 역 모음)
// -------------------------------------------------------------
export const SUBWAY_NETWORK_HUBS: Record<string, SubwayStationInfo> = {};

// 노선 데이터로부터 모든 역 정보 자동 등록
Object.entries(SUBWAY_LINES_DATA).forEach(([lineName, lineData]) => {
  lineData.stations.forEach((stName) => {
    if (!SUBWAY_NETWORK_HUBS[stName]) {
      const coord = SUBWAY_STATION_COORDS[stName] || { lat: 37.5000, lng: 127.0300 };
      SUBWAY_NETWORK_HUBS[stName] = {
        name: stName,
        lines: [lineName],
        lat: coord.lat,
        lng: coord.lng
      };
    } else {
      if (!SUBWAY_NETWORK_HUBS[stName].lines.includes(lineName)) {
        SUBWAY_NETWORK_HUBS[stName].lines.push(lineName);
      }
    }
  });
});

/**
 * 역 이름 정규화 (예: "화정", "화정역" -> "화정역")
 */
export function normalizeStationName(raw: string): string {
  if (!raw) return '';
  let clean = raw.trim().replace(/\s*\(.*?\)/g, '');
  if (!clean.endsWith('역') && clean.length >= 2) {
    clean += '역';
  }
  return clean;
}

// -------------------------------------------------------------
// 4. Dijkstra 최단 경로 지하철 라우팅 알고리즘
// -------------------------------------------------------------
interface GraphNode {
  station: string;
  line: string;
}

interface Edge {
  toNode: GraphNode;
  weight: number; // minutes
  isTransfer: boolean;
}

/**
 * 역과 노선 그래프 생성
 */
const subwayGraph = new Map<string, Edge[]>();

function nodeKey(node: GraphNode): string {
  return `${node.station}::${node.line}`;
}

// 1) 인접 역 연결 (동일 노선 주행 간선)
Object.entries(SUBWAY_LINES_DATA).forEach(([lineName, lineData]) => {
  const { stations, timePerStation } = lineData;
  for (let i = 0; i < stations.length - 1; i++) {
    const stA = stations[i];
    const stB = stations[i + 1];

    const nodeA: GraphNode = { station: stA, line: lineName };
    const nodeB: GraphNode = { station: stB, line: lineName };

    const keyA = nodeKey(nodeA);
    const keyB = nodeKey(nodeB);

    if (!subwayGraph.has(keyA)) subwayGraph.set(keyA, []);
    if (!subwayGraph.has(keyB)) subwayGraph.set(keyB, []);

    subwayGraph.get(keyA)!.push({ toNode: nodeB, weight: timePerStation, isTransfer: false });
    subwayGraph.get(keyB)!.push({ toNode: nodeA, weight: timePerStation, isTransfer: false });
  }
});

// 2) 환승역 간선 연결 (동일 역명의 서로 다른 노선 간 환승 보행 간선: 3.5분)
const stationsByLine = new Map<string, string[]>();
Object.entries(SUBWAY_LINES_DATA).forEach(([lineName, lineData]) => {
  lineData.stations.forEach((st) => {
    if (!stationsByLine.has(st)) stationsByLine.set(st, []);
    if (!stationsByLine.get(st)!.includes(lineName)) {
      stationsByLine.get(st)!.push(lineName);
    }
  });
});

stationsByLine.forEach((lines, station) => {
  if (lines.length > 1) {
    for (let i = 0; i < lines.length; i++) {
      for (let j = i + 1; j < lines.length; j++) {
        const lineA = lines[i];
        const lineB = lines[j];

        const nodeA: GraphNode = { station, line: lineA };
        const nodeB: GraphNode = { station, line: lineB };

        const keyA = nodeKey(nodeA);
        const keyB = nodeKey(nodeB);

        if (!subwayGraph.has(keyA)) subwayGraph.set(keyA, []);
        if (!subwayGraph.has(keyB)) subwayGraph.set(keyB, []);

        // 환승 도보 및 승강장 대기 패널티:
        // 1) 일반 전철 환승: 10분 가중치 적용 (불필요한 잦은 환승 억제 및 직통/최소 환승 경로 유도)
        // 2) GTX-A 환승: 35분 가중치 적용 (출발지가 GTX역이 아닌 경우 중간 1정거장 환승용으로 쓰이지 않도록 방지)
        const isGtxTransfer = lineA === 'GTX-A' || lineB === 'GTX-A';
        const transferWeight = isGtxTransfer ? 35 : 10;

        subwayGraph.get(keyA)!.push({ toNode: nodeB, weight: transferWeight, isTransfer: true });
        subwayGraph.get(keyB)!.push({ toNode: nodeA, weight: transferWeight, isTransfer: true });
      }
    }
  }
});

/**
 * 방향 힌트 계산 (예: 3호선 화정 -> 양재 일 때 "오금행")
 */
function getDirectionHint(line: string, fromStation: string, toStation: string): string {
  const lineData = SUBWAY_LINES_DATA[line];
  if (!lineData) return `${toStation} 방면`;

  const { stations, terminals } = lineData;
  const fromIdx = stations.indexOf(fromStation);
  const toIdx = stations.indexOf(toStation);

  if (fromIdx === -1 || toIdx === -1) return `${toStation} 방면`;

  if (line === '2호선') {
    return toIdx > fromIdx ? '내선순환 (강남/잠실 방면)' : '외선순환 (신도림/홍대 방면)';
  }

  if (toIdx > fromIdx) {
    return `${terminals[1]} 방면`;
  } else {
    return `${terminals[0]} 방면`;
  }
}

/**
 * 수도권 전체 전철망에서 출발역 -> 도착역 간 최적의 최단 경로 및 환승 세부 구간을 동적으로 계산합니다.
 */
export function calculateSubwayRoute(fromStationRaw: string, toStationRaw: string): SubwayTransitInfo {
  const fromStation = normalizeStationName(fromStationRaw);
  const toStation = normalizeStationName(toStationRaw);

  if (fromStation === toStation) {
    return {
      minutes: 0,
      transferCount: 0,
      routeDesc: `${fromStation} 직통`,
      segments: []
    };
  }

  // 1. 출발역과 도착역의 소속 노선 확인
  const fromLines = stationsByLine.get(fromStation) || [];
  const toLines = stationsByLine.get(toStation) || [];

  if (fromLines.length === 0 || toLines.length === 0) {
    // 그래프에 미등록된 역(버스정류장 등)인 경우: segments를 비워서
    // 호출부(getSubwaySegments)의 fallbackLine이 정상 사용되도록 함
    return {
      minutes: 25,
      transferCount: 0,
      routeDesc: `${fromStation} ➔ ${toStation}`,
      segments: []
    };
  }

  // 2. Dijkstra 최단 경로 탐색
  const allowGtx = fromLines.includes('GTX-A') || toLines.includes('GTX-A');

  const distances = new Map<string, number>();
  const previous = new Map<string, { prevKey: string; edge: Edge }>();
  const pq: { key: string; dist: number }[] = [];

  fromLines.forEach((line) => {
    if (!allowGtx && line === 'GTX-A') return;
    const key = nodeKey({ station: fromStation, line });
    distances.set(key, 0);
    pq.push({ key, dist: 0 });
  });

  let destKey: string | null = null;
  let minDist = Infinity;

  while (pq.length > 0) {
    pq.sort((a, b) => a.dist - b.dist);
    const { key: curKey, dist: curDist } = pq.shift()!;

    if (curDist > (distances.get(curKey) ?? Infinity)) continue;

    const [curStation, curLine] = curKey.split('::');

    if (curStation === toStation) {
      if (curDist < minDist) {
        minDist = curDist;
        destKey = curKey;
        break; // 최단거리 도착
      }
    }

    const neighbors = subwayGraph.get(curKey) || [];
    for (const edge of neighbors) {
      if (!allowGtx && (edge.toNode.line === 'GTX-A' || curLine === 'GTX-A')) {
        continue;
      }
      const nextKey = nodeKey(edge.toNode);
      const newDist = curDist + edge.weight;

      if (newDist < (distances.get(nextKey) ?? Infinity)) {
        distances.set(nextKey, newDist);
        previous.set(nextKey, { prevKey: curKey, edge });
        pq.push({ key: nextKey, dist: newDist });
      }
    }
  }

  // 3. 경로 복원
  if (!destKey) {
    return {
      minutes: 30,
      transferCount: 1,
      routeDesc: `${fromStation} ➔ ${toStation}`,
      segments: [
        { line: fromLines[0], fromStation, toStation, durationMinutes: 30, directionHint: `${toStation} 방면` }
      ]
    };
  }

  const pathNodes: GraphNode[] = [];
  let curr: string | null = destKey;

  while (curr) {
    const [station, line] = curr.split('::');
    pathNodes.unshift({ station, line });
    const prev = previous.get(curr);
    curr = prev ? prev.prevKey : null;
  }

  // 4. 동일 노선 탑승 구간을 하나의 세그먼트로 축약(Collapse)하여 깔끔한 환승 단계 생성
  const segments: SubwayTransitSegment[] = [];
  let curSegment: { line: string; fromStation: string; toStation: string; stations: string[] } | null = null;

  for (let i = 0; i < pathNodes.length; i++) {
    const node = pathNodes[i];
    if (!curSegment) {
      curSegment = { line: node.line, fromStation: node.station, toStation: node.station, stations: [node.station] };
    } else if (curSegment.line === node.line) {
      curSegment.toStation = node.station;
      curSegment.stations.push(node.station);
    } else {
      // 환승 발생 -> 이전 구간 완료
      if (curSegment.stations.length > 1) {
        const lineTime = SUBWAY_LINES_DATA[curSegment.line]?.timePerStation || 2.2;
        const dur = Math.max(3, Math.round((curSegment.stations.length - 1) * lineTime));
        segments.push({
          line: curSegment.line,
          fromStation: curSegment.fromStation,
          toStation: curSegment.toStation,
          durationMinutes: dur,
          directionHint: getDirectionHint(curSegment.line, curSegment.fromStation, curSegment.toStation),
          stationCount: curSegment.stations.length - 1,
          transferWalkMinutes: 3
        });
      }
      curSegment = { line: node.line, fromStation: node.station, toStation: node.station, stations: [node.station] };
    }
  }

  if (curSegment && curSegment.stations.length > 1) {
    const lineTime = SUBWAY_LINES_DATA[curSegment.line]?.timePerStation || 2.2;
    const dur = Math.max(3, Math.round((curSegment.stations.length - 1) * lineTime));
    segments.push({
      line: curSegment.line,
      fromStation: curSegment.fromStation,
      toStation: curSegment.toStation,
      durationMinutes: dur,
      directionHint: getDirectionHint(curSegment.line, curSegment.fromStation, curSegment.toStation),
      stationCount: curSegment.stations.length - 1
    });
  }

  // 총 소요시간 및 환승 횟수 산출
  const transferCount = Math.max(0, segments.length - 1);
  const totalMinutes = segments.reduce((sum, s) => sum + s.durationMinutes, 0) + (transferCount * 3);

  // 노선 설명 문구 생성 (예: "3호선 화정역 ➔ 양재역 환승 ➔ 신분당선 판교역")
  const descParts: string[] = [];
  segments.forEach((seg, idx) => {
    if (idx === 0) {
      descParts.push(`${seg.line} ${seg.fromStation}`);
    }
    if (idx < segments.length - 1) {
      descParts.push(`${seg.toStation} 환승`);
    } else {
      descParts.push(`${seg.line} ${seg.toStation}`);
    }
  });

  const routeDesc = descParts.join(' ➔ ');

  return {
    minutes: Math.max(5, totalMinutes),
    transferCount,
    routeDesc,
    segments
  };
}

/**
 * 텍스트 설명 또는 노선 그래프로부터 지하철 환승 세부 구간(segments)을 동적으로 계산합니다.
 */
export function getSubwaySegments(
  fromStation: string,
  toHubStation: string,
  transitInfo?: SubwayTransitInfo,
  fallbackLine: string = '지하철'
): SubwayTransitSegment[] {
  if (transitInfo?.segments && transitInfo.segments.length > 0) {
    return transitInfo.segments;
  }

  // 그래프 탐색 엔진으로 동적 최단 환승 경로 계산
  const computed = calculateSubwayRoute(fromStation, toHubStation);
  if (computed.segments && computed.segments.length > 0) {
    // Dijkstra가 '지하철'이라는 모호한 노선명만 반환했다면(미등록 역 fallback)
    // 호출부가 전달한 정확한 fallbackLine을 대신 사용
    const onlyGenericFallback = computed.segments.length === 1 && computed.segments[0].line === '지하철';
    if (!onlyGenericFallback) {
      return computed.segments;
    }
  }

  return [
    {
      line: fallbackLine,
      fromStation: normalizeStationName(fromStation),
      toStation: normalizeStationName(toHubStation),
      durationMinutes: transitInfo?.minutes || 25,
      directionHint: `${toHubStation} 방면`
    }
  ];
}

/**
 * 지하철 다중 환승 구간을 개별 지하철 탑승 단계 및 환승 도보 단계로 분해하여 RouteStepItem 배열로 생성합니다.
 */
export function buildSubwayRouteSteps(
  fromStation: string,
  toStation: string,
  transitInfo: SubwayTransitInfo | undefined,
  startDeptMins: number,
  baseStepId: string,
  totalSubwayFare: number = 1500,
  fallbackLine: string = '지하철'
): { steps: RouteStepItem[]; totalMinutes: number; startDeptMins: number; endArrMins: number } {
  const segments = getSubwaySegments(fromStation, toStation, transitInfo, fallbackLine);
  const steps: RouteStepItem[] = [];

  let currentMins = startDeptMins;

  segments.forEach((seg, idx) => {
    const isFirst = idx === 0;
    const isLast = idx === segments.length - 1;

    // 실제 지하철 시간표 기반 배차 매칭 (승강장 도착 시각 기준 다음 출발 열차 산출)
    const sched = matchScheduledSubwayDeparture(seg.fromStation, seg.line, currentMins, seg.directionHint);
    const segDeptMins = sched.scheduledDepartureMins;
    const waitMins = sched.platformWaitMins;
    const segArrMins = segDeptMins + seg.durationMinutes;

    const fromCoord = SUBWAY_STATION_COORDS[seg.fromStation] ? { lat: SUBWAY_STATION_COORDS[seg.fromStation].lat, lng: SUBWAY_STATION_COORDS[seg.fromStation].lng } : undefined;
    const toCoord = SUBWAY_STATION_COORDS[seg.toStation] ? { lat: SUBWAY_STATION_COORDS[seg.toStation].lat, lng: SUBWAY_STATION_COORDS[seg.toStation].lng } : undefined;

    // 1. 지하철 탑승 단계
    const stepTitle = isFirst
      ? `${seg.line} ${seg.fromStation} 탑승 ➔ ${seg.toStation} 이동`
      : `${seg.line} ${seg.fromStation} 환승 탑승 ➔ ${seg.toStation} 이동`;

    let stepSubtitle = seg.directionHint
      ? `${seg.directionHint} (${seg.durationMinutes}분 소요${seg.stationCount ? `, ${seg.stationCount}개 역` : ''})`
      : `${seg.toStation} 방면 (${seg.durationMinutes}분 소요)`;

    if (waitMins > 0) {
      stepSubtitle += ` · 승강장 대기 ${waitMins}분`;
    }

    const note = isFirst
      ? `🚇 ${seg.line} ${sched.departureTimeStr} 출발${waitMins > 0 ? ` (대기 ${waitMins}분)` : ''}`
      : `🚇 ${seg.line} ${sched.departureTimeStr} 환승 출발${waitMins > 0 ? ` (대기 ${waitMins}분)` : ''}`;

    steps.push({
      id: `${baseStepId}-subway-${idx + 1}`,
      type: 'subway',
      title: stepTitle,
      subtitle: stepSubtitle,
      departureTime: minutesToTimeString(segDeptMins),
      arrivalTime: minutesToTimeString(segArrMins),
      durationMinutes: seg.durationMinutes,
      distanceMeters: Math.round((seg.stationCount || Math.max(1, seg.durationMinutes / 2)) * 1250),
      fare: isFirst ? totalSubwayFare : 0,
      note,
      boardingStopName: seg.fromStation,
      dropoffStopName: seg.toStation,
      coords: fromCoord || toCoord
    });

    currentMins = segArrMins;

    // 2. 환승 도보 단계 (다음 지하철 세그먼트가 있을 때)
    if (!isLast) {
      const nextSeg = segments[idx + 1];
      const transferWalkMins = seg.transferWalkMinutes || 3;
      const walkDeptMins = currentMins;
      const walkArrMins = walkDeptMins + transferWalkMins;

      steps.push({
        id: `${baseStepId}-transfer-${idx + 1}`,
        type: 'walk',
        title: `${seg.toStation} 환승 이동`,
        subtitle: `${seg.line} 하차 ➔ ${nextSeg.line} 승강장 환승 통로 이동 (${transferWalkMins}분)`,
        departureTime: minutesToTimeString(walkDeptMins),
        arrivalTime: minutesToTimeString(walkArrMins),
        durationMinutes: transferWalkMins,
        fare: 0,
        coords: toCoord
      });

      currentMins = walkArrMins;
    }
  });

  const actualStartDeptMins = steps[0]?.departureTime ? parseTimeToMinutes(steps[0].departureTime) : startDeptMins;
  const totalMinutes = currentMins - actualStartDeptMins;
  return { steps, totalMinutes, startDeptMins: actualStartDeptMins, endArrMins: currentMins };
}
