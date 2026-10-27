/**
 * 카카오맵 SDK 동적 로더
 * - 환경변수 VITE_KAKAO_JS_KEY 에서 앱키를 읽어 SDK를 동적으로 주입
 * - 중복 로딩 방지 (한 번만 로드)
 * - autoload=false 로 설정하여 kakao.maps.load() 콜백 후 사용 가능
 */

let sdkLoadPromise: Promise<void> | null = null;

export const loadKakaoMapSDK = (): Promise<void> => {
  // 이미 로드 중이거나 완료된 경우 동일한 Promise 반환
  if (sdkLoadPromise) return sdkLoadPromise;

  sdkLoadPromise = new Promise<void>((resolve, reject) => {
    // 이미 kakao SDK가 로드되어 있는 경우
    if (window.kakao && window.kakao.maps) {
      window.kakao.maps.load(() => resolve());
      return;
    }

    const appKey = (import.meta.env.VITE_KAKAO_JS_KEY as string) || 'd705565e259dda64b16999dd6f10f93e';
    if (!appKey) {
      reject(new Error('[KakaoMap] VITE_KAKAO_JS_KEY 환경변수가 설정되지 않았습니다. .env 파일을 확인하세요.'));
      return;
    }

    // script 태그 중복 방지
    const existingScript = document.querySelector('script[data-kakao-sdk]');
    if (existingScript) {
      // 이미 삽입됐지만 아직 로드 완료 전일 수 있으므로 로드 완료 감지
      existingScript.addEventListener('load', () => {
        window.kakao.maps.load(() => resolve());
      });
      existingScript.addEventListener('error', () => {
        reject(new Error('[KakaoMap] SDK 스크립트 로드에 실패했습니다.'));
      });
      return;
    }

    const script = document.createElement('script');
    script.type = 'text/javascript';
    script.setAttribute('data-kakao-sdk', 'true'); // 중복 삽입 방지용 마커
    script.src = `//dapi.kakao.com/v2/maps/sdk.js?appkey=${appKey}&autoload=false&libraries=services,clusterer`;
    script.async = false;

    script.onload = () => {
      // SDK 로드 완료 후 kakao.maps.load() 호출로 맵 API 초기화
      window.kakao.maps.load(() => resolve());
    };

    script.onerror = () => {
      sdkLoadPromise = null; // 재시도 허용
      reject(new Error('[KakaoMap] SDK 스크립트 로드에 실패했습니다. 앱키 및 도메인 등록을 확인하세요.'));
    };

    document.head.appendChild(script);
  });

  return sdkLoadPromise;
};
