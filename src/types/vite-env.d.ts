/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_KAKAO_JS_KEY: string;
  readonly VITE_KAKAO_REST_KEY: string;
  readonly VITE_SEOUL_METRO_API_KEY: string;
  readonly VITE_PUBLIC_DATA_API_KEY: string;
  readonly VITE_ODSAY_API_KEY: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}