// 카카오맵 SDK TypeScript 타입 선언
// 카카오맵 JavaScript SDK v3 기준

declare namespace kakao {
  namespace maps {
    // 지도 옵션
    interface MapOptions {
      center: LatLng;
      level?: number;
      mapTypeId?: MapTypeId;
      draggable?: boolean;
      scrollwheel?: boolean;
      disableDoubleClick?: boolean;
      disableDoubleClickZoom?: boolean;
      projectionId?: string;
      tileAnimation?: boolean;
      keyboardShortcuts?: boolean | { speed: number };
    }

    // 지도 클래스
    class Map {
      constructor(container: HTMLElement, options: MapOptions);
      setCenter(latlng: LatLng): void;
      panTo(latlng: LatLng): void;
      getCenter(): LatLng;
      setLevel(level: number, options?: { animate?: boolean; anchor?: LatLng }): void;
      getLevel(): number;
      setMapTypeId(mapTypeId: MapTypeId): void;
      addOverlayMapTypeId(mapTypeId: MapTypeId): void;
      removeOverlayMapTypeId(mapTypeId: MapTypeId): void;
      setBounds(bounds: LatLngBounds, paddingTop?: number, paddingRight?: number, paddingBottom?: number, paddingLeft?: number): void;
      getBounds(): LatLngBounds;
      setDraggable(draggable: boolean): void;
      setZoomable(zoomable: boolean): void;
      setProjectionId(projectionId: string): void;
      getProjectionId(): string;
      relayout(): void;
      getSize(): Size;
    }

    // 위경도
    class LatLng {
      constructor(lat: number, lng: number);
      getLat(): number;
      getLng(): number;
      equals(latlng: LatLng): boolean;
      toCoords(): Coords;
    }

    // 좌표 범위
    class LatLngBounds {
      constructor(sw?: LatLng, ne?: LatLng);
      extend(latlng: LatLng): void;
      contain(latlng: LatLng): boolean;
      isEmpty(): boolean;
      getSouthWest(): LatLng;
      getNorthEast(): LatLng;
    }

    // 크기
    class Size {
      constructor(width: number, height: number);
      width: number;
      height: number;
      equals(size: Size): boolean;
    }

    // 포인트
    class Point {
      constructor(x: number, y: number);
      x: number;
      y: number;
      equals(point: Point): boolean;
    }

    // 좌표
    class Coords {
      constructor(x: number, y: number);
      getX(): number;
      getY(): number;
      toLatLng(): LatLng;
    }

    // 지도 타입
    enum MapTypeId {
      ROADMAP = 1,
      SKYVIEW = 2,
      HYBRID = 3,
      OVERLAY = 4,
      ROADVIEW = 5,
      TRAFFIC = 6,
      TERRAIN = 7,
      BICYCLE = 8,
      BICYCLE_HYBRID = 9,
      USE_DISTRICT = 10,
    }

    // 마커 옵션
    interface MarkerOptions {
      map?: Map;
      position: LatLng;
      image?: MarkerImage;
      title?: string;
      draggable?: boolean;
      clickable?: boolean;
      zIndex?: number;
      opacity?: number;
    }

    // 마커
    class Marker {
      constructor(options?: MarkerOptions);
      setMap(map: Map | null): void;
      getMap(): Map | null;
      setImage(image: MarkerImage): void;
      getImage(): MarkerImage;
      setPosition(position: LatLng): void;
      getPosition(): LatLng;
      setZIndex(zIndex: number): void;
      getZIndex(): number;
      setVisible(visible: boolean): void;
      getVisible(): boolean;
      setTitle(title: string): void;
      getTitle(): string;
      setDraggable(draggable: boolean): void;
      getDraggable(): boolean;
      setClickable(clickable: boolean): void;
      getClickable(): boolean;
      setOpacity(opacity: number): void;
      getOpacity(): number;
    }

    // 마커 이미지
    class MarkerImage {
      constructor(src: string, size: Size, options?: { alt?: string; coords?: string; shape?: string; offset?: Point; spriteOrigin?: Point; spriteSize?: Size });
    }

    // 커스텀 오버레이 옵션
    interface CustomOverlayOptions {
      map?: Map;
      position: LatLng;
      content?: string | HTMLElement;
      xAnchor?: number;
      yAnchor?: number;
      zIndex?: number;
      clickable?: boolean;
    }

    // 커스텀 오버레이
    class CustomOverlay {
      constructor(options: CustomOverlayOptions);
      setMap(map: Map | null): void;
      getMap(): Map | null;
      setPosition(position: LatLng): void;
      getPosition(): LatLng;
      setContent(content: string | HTMLElement): void;
      getContent(): string | HTMLElement;
      setVisible(visible: boolean): void;
      getVisible(): boolean;
      setZIndex(zIndex: number): void;
      getZIndex(): number;
      setAltitude(altitude: number): void;
      getAltitude(): number;
      setRange(range: number): void;
      getRange(): number;
    }

    // 인포윈도우 옵션
    interface InfoWindowOptions {
      map?: Map;
      position?: LatLng;
      content?: string | HTMLElement;
      removable?: boolean;
      zIndex?: number;
      altitude?: number;
      range?: number;
    }

    // 인포윈도우
    class InfoWindow {
      constructor(options?: InfoWindowOptions);
      open(map: Map, marker?: Marker): void;
      close(): void;
      getMap(): Map | null;
      setPosition(position: LatLng): void;
      getPosition(): LatLng;
      setContent(content: string | HTMLElement): void;
      getContent(): string | HTMLElement;
      setZIndex(zIndex: number): void;
      getZIndex(): number;
      setAltitude(altitude: number): void;
      getAltitude(): number;
      setRange(range: number): void;
      getRange(): number;
    }

    // 폴리라인 옵션
    interface PolylineOptions {
      map?: Map;
      path: LatLng[] | LatLng[][];
      strokeWeight?: number;
      strokeColor?: string;
      strokeOpacity?: number;
      strokeStyle?: 'solid' | 'shortdash' | 'shortdot' | 'shortdashdot' | 'shortdashdotdot' | 'dot' | 'dash' | 'longdash' | 'dashdot' | 'longdashdot' | 'longdashdotdot';
      endArrow?: boolean;
      zIndex?: number;
    }

    // 폴리라인
    class Polyline {
      constructor(options?: PolylineOptions);
      setMap(map: Map | null): void;
      getMap(): Map | null;
      setPath(path: LatLng[] | LatLng[][]): void;
      getPath(): LatLng[] | LatLng[][];
      getLength(): number;
      setOptions(options: PolylineOptions): void;
    }

    // 이벤트
    namespace event {
      function addListener(target: object, type: string, handler: Function): void;
      function removeListener(target: object, type: string, handler: Function): void;
      function trigger(target: object, type: string, data?: object): void;
      function preventMap(): void;
    }

    // SDK 로드 함수
    function load(callback: () => void): void;

    // 서비스
    namespace services {
      enum Status {
        OK = 'OK',
        ZERO_RESULT = 'ZERO_RESULT',
        ERROR = 'ERROR',
      }

      class Places {
        constructor(map?: Map);
        keywordSearch(keyword: string, callback: (result: any[], status: Status, pagination?: any) => void, options?: object): void;
        categorySearch(categoryGroupCode: string, callback: (result: any[], status: Status, pagination?: any) => void, options?: object): void;
      }

      class Geocoder {
        addressSearch(address: string, callback: (result: any[], status: Status) => void, options?: object): void;
        coord2Address(lng: number, lat: number, callback: (result: any[], status: Status) => void, options?: object): void;
        coord2RegionCode(lng: number, lat: number, callback: (result: any[], status: Status) => void, options?: object): void;
      }
    }
  }
}

interface Window {
  kakao: typeof kakao;
}
