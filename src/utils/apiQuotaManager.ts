import { useState, useEffect } from 'react';

export interface ApiQuotaStatus {
  isExceeded: boolean;
  kakaoTrafficExceeded: boolean;
  odsayExceeded: boolean;
  lastCheckedTime: string;
  message: string;
}

let quotaStatus: ApiQuotaStatus = {
  isExceeded: false,
  kakaoTrafficExceeded: false,
  odsayExceeded: false,
  lastCheckedTime: '',
  message: '',
};

type Listener = (status: ApiQuotaStatus) => void;
const listeners = new Set<Listener>();

function notify() {
  listeners.forEach(fn => fn({ ...quotaStatus }));
}

export function markKakaoQuotaExceeded() {
  if (!quotaStatus.kakaoTrafficExceeded) {
    quotaStatus = {
      ...quotaStatus,
      isExceeded: true,
      kakaoTrafficExceeded: true,
      lastCheckedTime: new Date().toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' }),
      message: '카카오 대중교통 길찾기 API 일일 무료 쿼터 소진',
    };
    notify();
  }
}

export function markOdsayQuotaExceeded() {
  if (!quotaStatus.odsayExceeded) {
    quotaStatus = {
      ...quotaStatus,
      isExceeded: true,
      odsayExceeded: true,
      lastCheckedTime: new Date().toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' }),
      message: 'ODsay 대중교통 API 일일 호출 한도 초과',
    };
    notify();
  }
}

export function getApiQuotaStatus(): ApiQuotaStatus {
  return { ...quotaStatus };
}

export function useApiQuotaStatus(): ApiQuotaStatus {
  const [status, setStatus] = useState<ApiQuotaStatus>(() => getApiQuotaStatus());

  useEffect(() => {
    const handler: Listener = (newStatus) => {
      setStatus(newStatus);
    };
    listeners.add(handler);
    return () => {
      listeners.delete(handler);
    };
  }, []);

  return status;
}
