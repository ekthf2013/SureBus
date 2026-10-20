import React, { useState, useEffect } from 'react';
import { UserFavorite } from '../types/bus';
import { getStoredFavorites, removeStoredFavorite } from '../utils/favoritesStorage';
import { Star, Trash2, Navigation, MapPin, Clock, Plus, Sparkles } from 'lucide-react';

interface FavoritesManagerProps {
  onSelectFavorite: (fav: UserFavorite) => void;
}

export const FavoritesManager: React.FC<FavoritesManagerProps> = ({ onSelectFavorite }) => {
  const [favorites, setFavorites] = useState<UserFavorite[]>([]);

  const loadFavorites = () => {
    setFavorites(getStoredFavorites());
  };

  useEffect(() => {
    loadFavorites();
    const handler = () => loadFavorites();
    window.addEventListener('favorites_updated', handler);
    return () => window.removeEventListener('favorites_updated', handler);
  }, []);

  const handleDelete = (id: string) => {
    removeStoredFavorite(id);
    loadFavorites();
  };

  return (
    <div className="glass-panel rounded-2xl p-5 md:p-6 border border-slate-800 shadow-2xl space-y-6">
      <div className="border-b border-slate-800/80 pb-4">
        <h2 className="text-xl font-bold text-white flex items-center gap-2">
          <Star className="w-5 h-5 text-amber-400 fill-amber-400" />
          자주 가는 출퇴근 즐겨찾기
        </h2>
        <p className="text-xs text-slate-400 mt-1">
          경로 검색 결과에서 <span className="text-amber-300 font-bold">⭐ 별 모양 버튼</span>을 누르면 여기에 즉시 저장됩니다.
        </p>
      </div>

      {favorites.length === 0 ? (
        <div className="p-8 text-center bg-slate-950/60 rounded-2xl border border-slate-800 space-y-2">
          <Star className="w-8 h-8 text-slate-600 mx-auto" />
          <p className="text-sm font-bold text-slate-300">등록된 즐겨찾기가 없습니다.</p>
          <p className="text-xs text-slate-500">
            [경로 탐색] 탭에서 원하는 노선을 검색하고 ⭐ 버튼을 눌러 추가해 보세요!
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {favorites.map((fav) => (
            <div
              key={fav.id}
              className="p-4 rounded-xl bg-slate-950/80 border border-slate-800 hover:border-indigo-500/40 transition-all flex flex-col justify-between gap-3 group"
            >
              <div>
                <div className="flex items-center justify-between mb-1">
                  <h3 className="text-sm font-bold text-white group-hover:text-indigo-300 transition-colors flex items-center gap-1.5 truncate">
                    <Star className="w-3.5 h-3.5 text-amber-400 fill-amber-400 shrink-0" />
                    {fav.title}
                  </h3>
                </div>
                <p className="text-xs text-slate-400 flex items-center gap-1">
                  <MapPin className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                  {fav.originName}
                </p>
                <p className="text-xs text-slate-400 flex items-center gap-1 mt-1">
                  <Clock className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
                  {fav.mode === 'commute_in' ? `출근 (${fav.targetTime} 도착 목표)` : `퇴근 (${fav.targetTime} 출발)`}
                </p>
              </div>

              <div className="flex items-center justify-between pt-2 border-t border-slate-800/60">
                <button
                  onClick={() => handleDelete(fav.id)}
                  className="p-1.5 rounded-lg text-slate-500 hover:text-rose-400 hover:bg-slate-900 transition-colors cursor-pointer"
                  title="삭제"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
                <button
                  onClick={() => onSelectFavorite(fav)}
                  className="px-3.5 py-1.5 rounded-lg bg-indigo-600/30 hover:bg-indigo-600/50 text-indigo-300 text-xs font-bold border border-indigo-500/40 flex items-center gap-1.5 transition-all cursor-pointer"
                >
                  <Navigation className="w-3.5 h-3.5" />
                  이 노선 즉시 탐색
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
