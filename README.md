# 🚌 SureBus - 슈어소프트테크 통근버스 & 대중교통 최적 경로 안내 시스템

슈어소프트테크 사옥(판교 제2테크노밸리 인피니티타워) 임직원의 쾌적한 출퇴근을 위한 스마트 모빌리티 웹 애플리케이션입니다.  
출발지에서 사옥까지 통근버스 직통 노선뿐만 아니라 **지하철, 광역/시내/마을버스 및 판교 셔틀**을 유기적으로 연계한 멀티모달 최적 이동 경로와 실시간 대중교통 도착 정보를 제공합니다.

---

## ✨ 주요 기능

### 1. 멀티모달 최적 출퇴근 경로 추천
- **출근 모드**: 목표 출근 시각(기본 08:50) 기준 역산 설계된 최적 승하차 스케줄 안내
- **퇴근 모드**: 퇴근 시각(기본 18:20) 기준 사옥 승차장 출발 통근/대중교통 안내
- **맞춤 추천 알고리즘**:
  - 🥇 **추천 경로**: 환승 횟수, 총 소요 시간, 도보 거리를 종합 평가한 스마트 최적 경로
  - ⚡ **최단 시간**: 가장 빠른 도착 경로
  - 🚶 **도보 최소**: 보행 이동을 최소화한 편안한 경로
  - 💰 **무료/직통**: 사옥 직통 무료 통근버스 및 무료 셔틀 우선 경로

### 2. 국토교통부 BIS & 서울교통공사 실시간 데이터 연동
- **실시간 버스 도착정보**: 국토교통부 버스도착정보(TAGO) API 연동으로 정류소별 잔여 시간(초단위) 및 실시간 버스 목록 제공
- **지하철 실시간 도착정보**: 서울시 열린데이터광장 지하철 API 연동으로 실시간 열차 운행 및 첫차/막차/배차 시각표 표출
- **카카오맵 실시간 위치 연동**: 원클릭으로 카카오맵의 실시간 버스/정류소 위치 지도로 즉시 이동

### 3. 정밀 요금 및 수도권 환승할인 시스템
- 수도권 통합환승할인 기본 요금 및 거리비례 운임 자동 계산
- 아침 첫차~06:30 조조할인(20% 감면) 실시간 적용

### 4. 카카오맵 지도 렌더링 및 위치 검색
- 카카오맵 SDK 기반 고해상도 벡터 지도 렌더링
- 거주지 및 주요 허브 정류소 검색 및 자동 좌표 매핑

---

## 🛠 기술 스택

- **Core**: React 18, TypeScript
- **Build & Dev**: Vite
- **Styling**: Tailwind CSS, Vanilla CSS
- **Icons**: Lucide React
- **Data & APIs**:
  - 국토교통부 대중교통(BIS) 도착정보 API
  - 서울시 열린데이터광장 지하철 실시간 도착정보 API
  - 카카오 지도 SDK (JavaScript & Local API)
  - ODsay 대중교통 경로탐색 API

---

## 🚀 시작하기

### 1. 패키지 설치
```bash
npm install
```

### 2. 환경 변수 설정
`.env.example` 파일을 복사하여 `.env` 파일을 생성하고 발급받은 API 키를 입력합니다.
```bash
cp .env.example .env
```

```env
# 카카오맵 API 키 (https://developers.kakao.com/)
VITE_KAKAO_JS_KEY=your_kakao_js_key
VITE_KAKAO_REST_KEY=your_kakao_rest_key

# 서울 열린데이터광장 지하철 API 키 (https://data.seoul.go.kr/)
VITE_SEOUL_METRO_API_KEY=your_seoul_metro_api_key

# 국토교통부 공공데이터포털 버스도착정보 API 키 (https://www.data.go.kr/)
VITE_PUBLIC_DATA_API_KEY=your_public_data_api_key

# ODsay API 키 (https://lab.odsay.com/)
VITE_ODSAY_API_KEY=your_odsay_api_key
```

### 3. 개발 서버 실행
```bash
npm run dev
```

브라우저에서 `http://localhost:5173`으로 접속합니다.

### 4. 배포 빌드
```bash
npm run build
```

---

## 📁 디렉토리 구조

```
├── src/
│   ├── components/      # UI 컴포넌트 (MapView, SearchResultCard, LiveTransitStepBadge 등)
│   ├── data/            # 통근버스 정류장 좌표 및 초기 노선 데이터
│   ├── hooks/           # 커스텀 훅 (카카오맵 등)
│   ├── types/           # TypeScript 인터페이스 정의
│   ├── utils/           # 최적 경로 탐색 엔진, 실시간 API 클라이언트 등
│   ├── App.tsx          # 메인 애플리케이션 컴포넌트
│   └── main.tsx         # 엔트리 포인트
├── .env.example         # 환경 변수 템플릿
├── package.json         # 종속성 및 스크립트 정의
├── vite.config.ts       # Vite 설정 및 API 프록시 구성
└── README.md
```

---

## 📄 라이선스

This project is licensed under the MIT License.
