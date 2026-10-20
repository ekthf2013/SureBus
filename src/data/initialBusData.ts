// System Auto-generated Initial Bus Timetable & Station Data
// Parsed directly from 버스시간표__최종공지.xlsx (2026.08.03~)

export interface StationCoord {
  lat: number;
  lng: number;
  address: string;
}

export interface InboundTrip {
  trip_no: number;
  times: Record<string, string>;
  note?: string;
}

export interface OutboundTrip {
  trip_no: number;
  departure: string;
  destination: string;
  note?: string;
}

export interface RouteData {
  id: string;
  name: string;
  bus_type: 'shuttle' | 'commute';
  color: string;
  is_free: boolean;
  reservation_required: boolean;
  description: string;
  inbound_trips: InboundTrip[];
  outbound_trips: OutboundTrip[];
}

export const STATION_COORDS: Record<string, StationCoord> = {
  "사옥": {
    "lat": 37.40698104234706,
    "lng": 127.08871065248748,
    "address": "경기도 성남시 수정구 금토로80번길 37 인피니티타워 E동 (슈어소프트테크)"
  },
  "도착(사옥)": {
    "lat": 37.40698104234706,
    "lng": 127.08871065248748,
    "address": "경기도 성남시 수정구 금토로80번길 37 인피니티타워 E동 (슈어소프트테크)"
  },
  "성남역": {
    "lat": 37.3942,
    "lng": 127.126,
    "address": "성남역 5번 출구 앞"
  },
  "이매역": {
    "lat": 37.396,
    "lng": 127.1283,
    "address": "이매역 5번 출구 앞"
  },
  "이매촌한신": {
    "lat": 37.385,
    "lng": 127.1245,
    "address": "이매촌한신 버스정류장 (07561, 47105)"
  },
  "판교역": {
    "lat": 37.3948,
    "lng": 127.1111,
    "address": "판교역 1번출구 북문 버스정류장"
  },
  "삼평교": {
    "lat": 37.401,
    "lng": 127.1085,
    "address": "삼평교 버스정류장"
  },
  "야탑역": {
    "lat": 37.4113,
    "lng": 127.1287,
    "address": "야탑역 우리은행 앞"
  },
  "판교2밸리": {
    "lat": 37.4087,
    "lng": 127.1008,
    "address": "판교 제2테크노밸리 버스정류장"
  },
  "군자역": {
    "lat": 37.5572,
    "lng": 127.0795,
    "address": "군자역 5번 출구 앞 (무척나은병원 앞)"
  },
  "건대역": {
    "lat": 37.5404,
    "lng": 127.0692,
    "address": "건대입구역 롯데백화점 택시정류장"
  },
  "잠실역": {
    "lat": 37.5133,
    "lng": 127.1001,
    "address": "잠실역 버스 중앙차선 정류장"
  },
  "석촌역": {
    "lat": 37.5055,
    "lng": 127.1069,
    "address": "석촌역 중앙차선 정류장 앞"
  },
  "송파역": {
    "lat": 37.4996,
    "lng": 127.1122,
    "address": "송파역 중앙차선 정류장 앞"
  },
  "가락시장역": {
    "lat": 37.4929,
    "lng": 127.1182,
    "address": "가락시장동문 버스정류장 / 중앙차선 정류장"
  },
  "문정역": {
    "lat": 37.4859,
    "lng": 127.1225,
    "address": "문정역 버스중앙차선 정류장"
  },
  "장지역": {
    "lat": 37.4786,
    "lng": 127.1262,
    "address": "장지역 버스정류장"
  },
  "복정역": {
    "lat": 37.47,
    "lng": 127.1267,
    "address": "복정역 임마누엘교회 앞 버스정류장"
  },
  "모란역": {
    "lat": 37.4321,
    "lng": 127.1292,
    "address": "모란역 삼성디지털프라자 앞"
  },
  "신도림역": {
    "lat": 37.5088,
    "lng": 126.8912,
    "address": "신도림역 테크노마트 앞"
  },
  "대림역": {
    "lat": 37.4932,
    "lng": 126.8955,
    "address": "대림역 앞 공항버스 정류장 (6003번)"
  },
  "사당역": {
    "lat": 37.4766,
    "lng": 126.9816,
    "address": "사당역 네스코N타워 앞 택시정류장"
  },
  "논현역": {
    "lat": 37.5111,
    "lng": 127.0215,
    "address": "논현역 4번출구 앞"
  },
  "신논현역": {
    "lat": 37.5045,
    "lng": 127.0251,
    "address": "신논현역 7번출구 버스중앙차선 정류장"
  },
  "강남역": {
    "lat": 37.4979,
    "lng": 127.0276,
    "address": "강남역 5·6번출구 버스중앙차선 / 5번출구"
  },
  "양재역": {
    "lat": 37.4842,
    "lng": 127.0345,
    "address": "양재역 1·2번출구 서초IC방면"
  },
  "광명역": {
    "lat": 37.4168,
    "lng": 126.8851,
    "address": "광명역 아브뉴프랑 앞 버스정류장"
  },
  "안양역": {
    "lat": 37.4018,
    "lng": 126.9227,
    "address": "안양역 시계상자 앞"
  },
  "범계역": {
    "lat": 37.3898,
    "lng": 126.9507,
    "address": "범계역 롯데백화점 앞 시외버스정류장"
  },
  "인덕원역": {
    "lat": 37.4011,
    "lng": 126.9768,
    "address": "인덕원역 3번출구 버스정류장"
  },
  "오산 교촌 본사": {
    "lat": 37.15,
    "lng": 127.07,
    "address": "오산 교촌에프엔비 본사 앞"
  },
  "사계절 꽃농원": {
    "lat": 37.154,
    "lng": 127.072,
    "address": "사계절 꽃농원 앞"
  },
  "오산시청": {
    "lat": 37.1498,
    "lng": 127.0775,
    "address": "오산시청 정문 앞"
  },
  "오산대역 후문": {
    "lat": 37.169,
    "lng": 127.062,
    "address": "오산대역후문 버스정류장 (24322)"
  },
  "UN군초전기념관": {
    "lat": 37.178,
    "lng": 127.058,
    "address": "UN군초전기념관 (24406)"
  },
  "금호어울림 ": {
    "lat": 37.185,
    "lng": 127.108,
    "address": "금호어울림, 계룡리슈빌 버스정류장 (55523)"
  },
  "금호어울림": {
    "lat": 37.185,
    "lng": 127.108,
    "address": "금호어울림, 계룡리슈빌 버스정류장 (55523)"
  },
  "한신더휴": {
    "lat": 37.189,
    "lng": 127.103,
    "address": "한신더휴 버스정류장 (55489)"
  },
  "신안2차,반도4차": {
    "lat": 37.195,
    "lng": 127.098,
    "address": "신안2차, 반도4차 버스정류장 (77102)"
  },
  "이주택지": {
    "lat": 37.199,
    "lng": 127.095,
    "address": "이주택지, 상록, 경남아파트 버스정류장 (77103)"
  },
  "대방디엠시티": {
    "lat": 37.202,
    "lng": 127.092,
    "address": "대방디엠시티, 센트럴상록 (55308)"
  },
  "한미약품": {
    "lat": 37.206,
    "lng": 127.089,
    "address": "한미약품, 푸르지오 버스정류장 (55315)"
  },
  "예당고사거리": {
    "lat": 37.21,
    "lng": 127.086,
    "address": "예당고사거리 버스정류장 (55311)"
  }
};

export const INITIAL_ROUTES: RouteData[] = [
  {
    "id": "route_shuttle_pangyo",
    "name": "판교셔틀",
    "bus_type": "shuttle",
    "color": "#10B981",
    "is_free": true,
    "reservation_required": false,
    "description": "판교역 / 성남역 / 이매역 ↔ 사옥 순환 셔틀 (무료)",
    "inbound_trips": [
      {
        "trip_no": 1,
        "times": {
          "판교역": "07:10",
          "삼평교": "07:15",
          "사옥": "07:25"
        }
      },
      {
        "trip_no": 2,
        "times": {
          "판교역": "07:40",
          "삼평교": "07:45",
          "사옥": "07:55"
        }
      },
      {
        "trip_no": 3,
        "times": {
          "판교역": "08:00",
          "삼평교": "08:05",
          "사옥": "08:15"
        }
      },
      {
        "trip_no": 4,
        "times": {
          "판교역": "08:20",
          "삼평교": "08:25",
          "사옥": "08:35"
        }
      },
      {
        "trip_no": 5,
        "times": {
          "성남역": "08:13",
          "이매역": "08:16",
          "이매촌한신": "08:20",
          "판교역": "08:30",
          "사옥": "08:45"
        },
        "note": "성남/이매/이매촌 경유"
      },
      {
        "trip_no": 6,
        "times": {
          "판교역": "08:40",
          "삼평교": "08:45",
          "사옥": "08:55"
        }
      },
      {
        "trip_no": 7,
        "times": {
          "판교역": "09:00",
          "삼평교": "09:05",
          "사옥": "09:15"
        }
      },
      {
        "trip_no": 8,
        "times": {
          "판교역": "09:20",
          "삼평교": "09:25",
          "사옥": "09:35"
        }
      },
      {
        "trip_no": 9,
        "times": {
          "판교역": "09:40",
          "삼평교": "09:45",
          "사옥": "09:55"
        }
      }
    ],
    "outbound_trips": [
      {
        "trip_no": 1,
        "departure": "15:15",
        "destination": "판교역"
      },
      {
        "trip_no": 2,
        "departure": "16:30",
        "destination": "판교역"
      },
      {
        "trip_no": 3,
        "departure": "17:00",
        "destination": "판교역"
      },
      {
        "trip_no": 4,
        "departure": "17:20",
        "destination": "판교역"
      },
      {
        "trip_no": 5,
        "departure": "17:40",
        "destination": "판교역"
      },
      {
        "trip_no": 6,
        "departure": "18:00",
        "destination": "판교역"
      },
      {
        "trip_no": 7,
        "departure": "18:10",
        "destination": "판교역 → 이매촌한신 → 이매 → 성남",
        "note": "교촌셔틀 (역방향 운행)"
      },
      {
        "trip_no": 8,
        "departure": "18:20",
        "destination": "판교역"
      },
      {
        "trip_no": 9,
        "departure": "18:40",
        "destination": "판교역"
      },
      {
        "trip_no": 10,
        "departure": "19:10",
        "destination": "판교역"
      },
      {
        "trip_no": 11,
        "departure": "19:40",
        "destination": "판교역"
      },
      {
        "trip_no": 12,
        "departure": "20:10",
        "destination": "판교역"
      },
      {
        "trip_no": 13,
        "departure": "21:00",
        "destination": "판교역"
      }
    ]
  },
  {
    "id": "route_shuttle_yatap",
    "name": "야탑셔틀",
    "bus_type": "shuttle",
    "color": "#F59E0B",
    "is_free": true,
    "reservation_required": false,
    "description": "야탑역 ↔ 판교2밸리 ↔ 사옥 셔틀 (무료)",
    "inbound_trips": [
      {
        "trip_no": 1,
        "times": {
          "야탑역": "07:35",
          "판교2밸리": "07:45",
          "사옥": "07:55"
        }
      },
      {
        "trip_no": 2,
        "times": {
          "야탑역": "07:50",
          "판교2밸리": "08:00",
          "사옥": "08:10"
        }
      },
      {
        "trip_no": 3,
        "times": {
          "야탑역": "08:20",
          "판교2밸리": "08:30",
          "사옥": "08:40"
        }
      },
      {
        "trip_no": 4,
        "times": {
          "야탑역": "08:40",
          "판교2밸리": "08:50",
          "사옥": "09:00"
        }
      },
      {
        "trip_no": 5,
        "times": {
          "야탑역": "09:00",
          "판교2밸리": "09:10",
          "사옥": "09:20"
        }
      }
    ],
    "outbound_trips": [
      {
        "trip_no": 1,
        "departure": "17:45",
        "destination": "야탑역"
      },
      {
        "trip_no": 2,
        "departure": "18:30",
        "destination": "야탑역"
      },
      {
        "trip_no": 3,
        "departure": "19:15",
        "destination": "야탑역"
      },
      {
        "trip_no": 4,
        "departure": "20:00",
        "destination": "야탑역"
      },
      {
        "trip_no": 5,
        "departure": "21:10",
        "destination": "야탑역"
      }
    ]
  },
  {
    "id": "route_commute_jamsil",
    "name": "잠실노선",
    "bus_type": "commute",
    "color": "#3B82F6",
    "is_free": false,
    "reservation_required": true,
    "description": "군자·건대·잠실·송파·가락시장 ↔ 사옥 통근버스 (1,500원)",
    "inbound_trips": [
      {
        "trip_no": 1,
        "times": {
          "군자역": "06:30",
          "잠실역": "06:45",
          "가락시장역": "06:50",
          "도착(사옥)": "07:10"
        }
      },
      {
        "trip_no": 2,
        "times": {
          "군자역": "07:30",
          "잠실역": "07:45",
          "가락시장역": "07:50",
          "도착(사옥)": "08:20"
        }
      },
      {
        "trip_no": 3,
        "times": {
          "건대역": "07:40",
          "잠실역": "07:50",
          "석촌역": "07:53",
          "송파역": "07:56",
          "가락시장역": "07:58",
          "문정역": "08:00",
          "장지역": "08:02",
          "복정역": "08:05",
          "모란역": "08:15",
          "도착(사옥)": "08:45"
        }
      },
      {
        "trip_no": 4,
        "times": {
          "건대역": "08:10",
          "잠실역": "08:20",
          "석촌역": "08:23",
          "송파역": "08:26",
          "가락시장역": "08:28",
          "문정역": "08:30",
          "장지역": "08:32",
          "복정역": "08:35",
          "모란역": "08:45",
          "도착(사옥)": "09:15"
        }
      },
      {
        "trip_no": 5,
        "times": {
          "군자역": "08:30",
          "잠실역": "08:45",
          "가락시장역": "08:50",
          "도착(사옥)": "09:10"
        }
      }
    ],
    "outbound_trips": [
      {
        "trip_no": 1,
        "departure": "16:40",
        "destination": "잠실 / 군자방면"
      },
      {
        "trip_no": 2,
        "departure": "17:40",
        "destination": "잠실 / 군자방면"
      },
      {
        "trip_no": 3,
        "departure": "18:15",
        "destination": "잠실 / 군자방면"
      },
      {
        "trip_no": 4,
        "departure": "18:45",
        "destination": "잠실 / 군자방면"
      },
      {
        "trip_no": 5,
        "departure": "21:00",
        "destination": "잠실 / 군자방면"
      }
    ]
  },
  {
    "id": "route_commute_sindorim",
    "name": "신도림노선",
    "bus_type": "commute",
    "color": "#8B5CF6",
    "is_free": false,
    "reservation_required": true,
    "description": "신도림·대림·사당 ↔ 사옥 통근버스 (1,500원)",
    "inbound_trips": [
      {
        "trip_no": 1,
        "times": {
          "신도림역": "06:45",
          "대림역": "06:50",
          "사당역": "07:10",
          "도착(사옥)": "07:50"
        }
      },
      {
        "trip_no": 2,
        "times": {
          "신도림역": "07:30",
          "대림역": "07:35",
          "사당역": "07:55",
          "도착(사옥)": "08:50"
        }
      },
      {
        "trip_no": 3,
        "times": {
          "신도림역": "08:20",
          "대림역": "08:25",
          "사당역": "08:45",
          "도착(사옥)": "09:40"
        }
      }
    ],
    "outbound_trips": [
      {
        "trip_no": 1,
        "departure": "17:10",
        "destination": "사당 / 대림 / 신도림 방면"
      },
      {
        "trip_no": 2,
        "departure": "18:10",
        "destination": "사당 / 대림 / 신도림 방면"
      }
    ]
  },
  {
    "id": "route_commute_gangnam",
    "name": "강남노선",
    "bus_type": "commute",
    "color": "#EC4899",
    "is_free": false,
    "reservation_required": false,
    "description": "논현·신논현·강남·양재 ↔ 사옥 통근버스 (1,500원)",
    "inbound_trips": [
      {
        "trip_no": 1,
        "times": {
          "양재역": "07:40",
          "도착(사옥)": "08:00"
        },
        "note": "클레무브 버스"
      },
      {
        "trip_no": 2,
        "times": {
          "논현역": "08:00",
          "신논현역": "08:02",
          "강남역": "08:04",
          "양재역": "08:12",
          "도착(사옥)": "08:30"
        },
        "note": "텔레칩스 버스"
      },
      {
        "trip_no": 3,
        "times": {
          "강남역": "08:20",
          "양재역": "08:25",
          "도착(사옥)": "08:40"
        },
        "note": "교촌 버스"
      }
    ],
    "outbound_trips": [
      {
        "trip_no": 1,
        "departure": "17:45",
        "destination": "양재 / 강남 / 논현 방면"
      },
      {
        "trip_no": 2,
        "departure": "18:05",
        "destination": "양재 / 강남 / 논현 방면"
      },
      {
        "trip_no": 3,
        "departure": "18:20",
        "destination": "양재 / 강남 / 논현 방면"
      }
    ]
  },
  {
    "id": "route_commute_anyang",
    "name": "안양노선",
    "bus_type": "commute",
    "color": "#06B6D4",
    "is_free": false,
    "reservation_required": false,
    "description": "광명·안양·범계·인덕원 ↔ 사옥 통근버스 (1,500원)",
    "inbound_trips": [
      {
        "trip_no": 1,
        "times": {
          "광명역": "06:45",
          "안양역": "06:55",
          "범계역": "07:13",
          "인덕원역": "07:20",
          "도착(사옥)": "08:00"
        }
      }
    ],
    "outbound_trips": [
      {
        "trip_no": 1,
        "departure": "17:45",
        "destination": "인덕원 / 범계 / 안양 / 광명 방면"
      }
    ]
  },
  {
    "id": "route_commute_osan",
    "name": "오산노선",
    "bus_type": "commute",
    "color": "#F97316",
    "is_free": false,
    "reservation_required": false,
    "description": "오산 교촌본사·시청·오산대역 ↔ 사옥 통근버스 (1,500원)",
    "inbound_trips": [
      {
        "trip_no": 1,
        "times": {
          "오산 교촌 본사": "07:20",
          "사계절 꽃농원": "07:23",
          "오산시청": "07:26",
          "오산대역 후문": "07:35",
          "UN군초전기념관": "07:40",
          "도착(사옥)": "08:40"
        }
      }
    ],
    "outbound_trips": [
      {
        "trip_no": 1,
        "departure": "18:20",
        "destination": "오산 방면"
      }
    ]
  },
  {
    "id": "route_commute_dongtan",
    "name": "동탄노선",
    "bus_type": "commute",
    "color": "#6366F1",
    "is_free": false,
    "reservation_required": false,
    "description": "동탄 금호어울림·한신더휴·한미약품 ↔ 사옥 통근버스 (1,500원)",
    "inbound_trips": [
      {
        "trip_no": 1,
        "times": {
          "금호어울림": "07:20",
          "한신더휴": "07:27",
          "신안2차,반도4차": "07:31",
          "이주택지": "07:34",
          "대방디엠시티": "07:36",
          "한미약품": "07:39",
          "예당고사거리": "07:42",
          "도착(사옥)": "08:40"
        }
      }
    ],
    "outbound_trips": [
      {
        "trip_no": 1,
        "departure": "18:20",
        "destination": "동탄 방면 (대방디엠시티 미정차)"
      }
    ]
  }
];
