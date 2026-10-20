import { UserFavorite } from '../types/bus';

const FAVORITES_STORAGE_KEY = 'commute_bus_favorites_v1';

export function getStoredFavorites(): UserFavorite[] {
  try {
    const raw = localStorage.getItem(FAVORITES_STORAGE_KEY);
    if (!raw) {
      return [];
    }
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) {
      return parsed;
    }
    return [];
  } catch (err) {
    console.error('Failed to read favorites from localStorage', err);
    return [];
  }
}

export function saveStoredFavorites(favs: UserFavorite[]): void {
  try {
    localStorage.setItem(FAVORITES_STORAGE_KEY, JSON.stringify(favs));
    window.dispatchEvent(new Event('favorites_updated'));
  } catch (err) {
    console.error('Failed to save favorites to localStorage', err);
  }
}

export function addStoredFavorite(fav: UserFavorite): void {
  const current = getStoredFavorites();
  const exists = current.some((f) => f.id === fav.id);
  if (!exists) {
    saveStoredFavorites([fav, ...current]);
  }
}

export function removeStoredFavorite(id: string): void {
  const current = getStoredFavorites();
  saveStoredFavorites(current.filter((f) => f.id !== id && f.candidateId !== id));
}

/**
 * 특정 후보 노선(candidateId)이 즐겨찾기에 등록되어 있는지 확인
 * 디폴트는 false
 */
export function isCandidateFavorite(candidateId: string, originName: string, mode: string = 'commute_in'): boolean {
  if (!candidateId || !originName) return false;
  const current = getStoredFavorites();
  const targetId = `fav_${candidateId}_${originName}`;
  return current.some((f) => f.id === targetId || (f.candidateId === candidateId && f.originName === originName && f.mode === mode));
}

// 하위 호환용
export function isFavoriteStored(originName: string, mode: string): boolean {
  if (!originName) return false;
  const current = getStoredFavorites();
  return current.some((f) => f.originName === originName && f.mode === mode);
}

