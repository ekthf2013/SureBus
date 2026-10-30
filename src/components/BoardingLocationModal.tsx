import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { BoardingLocationInfo } from '../data/shuttleBoardingLocations';
import { X, MapPin, Bus, ExternalLink, AlertCircle, Sparkles, Navigation, Info, Camera, CheckCircle2 } from 'lucide-react';

interface BoardingLocationModalProps {
  locations: BoardingLocationInfo[];
  initialLocationId?: string;
  onClose: () => void;
}

export const BoardingLocationModal: React.FC<BoardingLocationModalProps> = ({
  locations,
  initialLocationId,
  onClose,
}) => {
  const [selectedId, setSelectedId] = useState<string>(() => {
    if (initialLocationId && locations.some(loc => loc.id === initialLocationId)) {
      return initialLocationId;
    }
    return locations[0]?.id || '';
  });

  const [imageError, setImageError] = useState<Record<string, boolean>>({});

  // 모달 오픈 시 배경 스크롤 고정 및 ESC 키 이벤트 리스너 등록 (안정성 강화)
  useEffect(() => {
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);

    return () => {
      document.body.style.overflow = originalOverflow;
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [onClose]);

  if (!locations || locations.length === 0) return null;

  const currentLoc = locations.find(loc => loc.id === selectedId) || locations[0];
  const hasImage = !!currentLoc.imageUrl && !imageError[currentLoc.id];

  const handleImageError = () => {
    setImageError(prev => ({ ...prev, [currentLoc.id]: true }));
  };

  const modalContent = (
    <div 
      className="fixed inset-0 z-[9999] flex items-center justify-center p-3 sm:p-5 bg-slate-950/80 backdrop-blur-sm transition-opacity"
      onClick={onClose}
    >
      <div 
        className="w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-3xl border border-indigo-500/30 shadow-2xl p-5 sm:p-6 relative bg-slate-900/98 text-slate-100"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header Close Button */}
        <button
          type="button"
          onClick={onClose}
          className="absolute top-4 right-4 p-2 rounded-2xl bg-slate-800/90 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors cursor-pointer border border-slate-700/60 z-10"
          title="닫기"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Modal Top Title & Badge */}
        <div className="mb-4 pr-10">
          <div className="flex flex-wrap items-center gap-2 mb-2">
            <span className={`inline-flex items-center gap-1.5 text-xs font-bold px-2.5 py-1 rounded-lg border ${
              currentLoc.busType === 'shuttle'
                ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                : 'bg-indigo-500/20 text-indigo-300 border-indigo-500/40'
            }`}>
              <Bus className="w-3.5 h-3.5" />
              {currentLoc.busType === 'shuttle' ? '사내 무료 셔틀버스' : '사내 통근버스 (1,500원)'}
            </span>
            <span className="text-xs font-semibold px-2 py-0.5 rounded-md bg-slate-800 text-slate-300 border border-slate-700">
              {currentLoc.routeName}
            </span>
          </div>

          <h2 className="text-xl sm:text-2xl font-black text-white flex items-center gap-2">
            <MapPin className="w-5 h-5 sm:w-6 sm:h-6 text-indigo-400 shrink-0" />
            <span>{currentLoc.stationName} 탑승 위치 안내</span>
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            정확한 승차 위치 사진 및 주변 랜드마크 안내입니다.
          </p>
        </div>

        {/* Multiple Stop Tabs (경로 내 셔틀/통근 정류장이 여러 개인 경우 선택 탭 제공) */}
        {locations.length > 1 && (
          <div className="flex items-center gap-2 overflow-x-auto pb-2 mb-4 scrollbar-thin">
            {locations.map((loc) => (
              <button
                key={loc.id}
                type="button"
                onClick={() => setSelectedId(loc.id)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all border flex items-center gap-1.5 cursor-pointer ${
                  selectedId === loc.id
                    ? 'bg-indigo-600 text-white border-indigo-400 shadow-md shadow-indigo-600/30'
                    : 'bg-slate-800/80 text-slate-400 border-slate-700 hover:text-slate-200'
                }`}
              >
                <MapPin className="w-3 h-3" />
                {loc.stationName}
              </button>
            ))}
          </div>
        )}

        {/* Main Photo Area (레이아웃 흔들림 방지 컨테이너 & 오버레이 제거) */}
        <div className="mb-5">
          <div className="relative rounded-2xl overflow-hidden border border-slate-700/80 bg-slate-950 min-h-[200px] flex items-center justify-center">
            {hasImage ? (
              <img
                src={currentLoc.imageUrl}
                alt={`${currentLoc.stationName} 탑승 위치`}
                onError={handleImageError}
                className="w-full h-auto max-h-[55vh] object-contain rounded-xl block select-none"
              />
            ) : (
              /* Photo Placeholder when photo is pending / not yet attached */
              <div className="py-12 px-6 text-center space-y-4 bg-gradient-to-b from-slate-900 to-slate-950 w-full">
                <div className="w-16 h-16 rounded-3xl bg-indigo-500/10 border border-indigo-500/30 flex items-center justify-center text-indigo-400 mx-auto shadow-lg shadow-indigo-500/10">
                  <Camera className="w-8 h-8 animate-pulse text-indigo-400" />
                </div>
                <div className="space-y-1">
                  <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-500/15 border border-amber-500/30 text-amber-300 text-xs font-bold">
                    <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                    <span>현장 사진 준비 중 (사진 등록 예정)</span>
                  </div>
                  <h4 className="text-base font-bold text-white pt-1">
                    {currentLoc.stationName} 탑승 정류소
                  </h4>
                  <p className="text-xs text-slate-400 max-w-md mx-auto leading-relaxed">
                    실제 현장 사진이 등록되면 이 위치에 선명한 사진이 표시됩니다.<br />
                    아래 상세 위치 설명과 카카오맵 로드뷰를 먼저 참고해 주세요.
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Detailed Information Cards */}
        <div className="space-y-3">
          {/* Card 1: Exact Location */}
          <div className="p-3.5 rounded-2xl bg-slate-950/80 border border-indigo-500/20 space-y-1">
            <div className="flex items-center gap-2 text-indigo-300 text-xs font-bold">
              <Navigation className="w-3.5 h-3.5 text-indigo-400" />
              <span>정확한 승차 위치</span>
            </div>
            <p className="text-sm font-black text-white pl-5">
              {currentLoc.exactLocation}
            </p>
            <p className="text-xs text-slate-400 pl-5 flex items-center gap-1">
              <span className="text-slate-500">주소:</span> {currentLoc.address}
            </p>
          </div>

          {/* Card 2: Landmarks & Finding Way */}
          <div className="p-3.5 rounded-2xl bg-slate-950/80 border border-slate-800 space-y-1">
            <div className="flex items-center gap-2 text-emerald-300 text-xs font-bold">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
              <span>주변 랜드마크 & 찾아가는 길</span>
            </div>
            <p className="text-xs font-medium text-slate-200 pl-5 leading-relaxed">
              {currentLoc.landmarks}
            </p>
          </div>

          {/* Card 3: Boarding Tips */}
          {currentLoc.tip && (
            <div className="p-3.5 rounded-2xl bg-amber-500/10 border border-amber-500/20 space-y-1">
              <div className="flex items-center gap-2 text-amber-300 text-xs font-bold">
                <AlertCircle className="w-3.5 h-3.5 text-amber-400" />
                <span>탑승 유의사항 및 팁</span>
              </div>
              <p className="text-xs font-medium text-amber-200/90 pl-5">
                {currentLoc.tip}
              </p>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="mt-6 flex flex-wrap items-center justify-between gap-3 pt-4 border-t border-slate-800">
          {currentLoc.kakaoMapUrl ? (
            <a
              href={currentLoc.kakaoMapUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="px-4 py-2.5 rounded-xl bg-yellow-500/20 hover:bg-yellow-500/30 text-yellow-300 text-xs font-bold flex items-center gap-1.5 border border-yellow-500/40 transition-all shadow-sm"
            >
              <ExternalLink className="w-4 h-4 text-yellow-400" />
              카카오맵에서 로드뷰/지도 보기
            </a>
          ) : <div />}

          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white text-xs font-bold transition-all border border-slate-700 cursor-pointer"
          >
            닫기
          </button>
        </div>
      </div>
    </div>
  );

  return createPortal(modalContent, document.body);
};
