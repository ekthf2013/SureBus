import React, { useState, useEffect, useRef } from 'react';
import { SearchParams, CommuteMode, PreferenceOption } from '../types/bus';
import { PRESET_LOCATIONS, PresetLocation } from '../utils/distance';
import { searchKakaoPlaces, KakaoPlaceItem } from '../utils/kakaoPlaceSearch';
import { loadKakaoMapSDK } from '../utils/kakaoMapLoader';
import { MapPin, Clock, Search, Navigation, Sun, Moon, Sparkles, Building2, Train } from 'lucide-react';

interface SearchFormProps {
  searchParams: SearchParams;
  onSearch: (params: SearchParams) => void;
}

export const SearchForm: React.FC<SearchFormProps> = ({ searchParams, onSearch }) => {
  const [originName, setOriginName] = useState(searchParams.originName);
  const [originLat, setOriginLat] = useState(searchParams.originLat);
  const [originLng, setOriginLng] = useState(searchParams.originLng);
  const [mode, setMode] = useState<CommuteMode>(searchParams.mode);
  const [targetTime, setTargetTime] = useState(searchParams.targetTime);
  const [preference, setPreference] = useState<PreferenceOption>(searchParams.preference);

  // Route Filters Checkboxes
  const [useCompanyBusOnly, setUseCompanyBusOnly] = useState(searchParams.filters.useCompanyBusOnly);
  const [usePublicTransit, setUsePublicTransit] = useState(searchParams.filters.usePublicTransit);

  const [isLocating, setIsLocating] = useState(false);

  // 카카오 장소 검색 자동완성 상태
  const [searchResults, setSearchResults] = useState<KakaoPlaceItem[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const isSelectedRef = useRef(false);
  const [selectedAddress, setSelectedAddress] = useState<string>('');

  // 컴포넌트 마운트 시 카카오 SDK 사전 로딩
  useEffect(() => {
    loadKakaoMapSDK().catch(() => {});
  }, []);

  // 검색어 입력 시 카카오 장소 검색 디바운스
  useEffect(() => {
    if (isSelectedRef.current) {
      isSelectedRef.current = false;
      return;
    }

    if (!originName || originName.trim().length < 2) {
      setSearchResults([]);
      setShowDropdown(false);
      return;
    }

    const timer = setTimeout(async () => {
      setIsSearching(true);
      const results = await searchKakaoPlaces(originName);
      setSearchResults(results);
      setIsSearching(false);
      setShowDropdown(results.length > 0);
    }, 300);

    return () => clearTimeout(timer);
  }, [originName]);

  // 바깥 클릭 시 드롭다운 닫기
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setShowDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSelectKakaoPlace = (place: KakaoPlaceItem) => {
    const lat = parseFloat(place.y);
    const lng = parseFloat(place.x);
    const address = place.road_address_name || place.address_name || '';
    const displayName = address ? `${place.place_name} (${address})` : place.place_name;

    isSelectedRef.current = true;
    setOriginName(displayName);
    setOriginLat(lat);
    setOriginLng(lng);
    setSelectedAddress(address);
    setShowDropdown(false);
    // 검색은 즉시 실행하지 않고, 사용자가 하단의 '경로 검색하기' 버튼을 누를 때 실행됩니다.
  };

  const handleSelectPreset = (preset: { name: string; lat: number; lng: number }) => {
    setOriginName(preset.name);
    setOriginLat(preset.lat);
    setOriginLng(preset.lng);
    setShowDropdown(false);

    onSearch({
      originName: preset.name,
      originLat: preset.lat,
      originLng: preset.lng,
      mode,
      targetTime,
      date: new Date().toISOString().split('T')[0],
      preference,
      filters: {
        useCompanyBusOnly,
        usePublicTransit,
      },
    });
  };

  const handleGetCurrentLocation = () => {
    if (!navigator.geolocation) {
      alert('현재 브라우저에서 위치 정보를 지원하지 않습니다.');
      return;
    }
    setIsLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setIsLocating(false);
        const lat = pos.coords.latitude;
        const lng = pos.coords.longitude;
        setOriginName('현재 내 위치');
        setOriginLat(lat);
        setOriginLng(lng);

        onSearch({
          originName: '현재 내 위치',
          originLat: lat,
          originLng: lng,
          mode,
          targetTime,
          date: new Date().toISOString().split('T')[0],
          preference,
          filters: {
            useCompanyBusOnly,
            usePublicTransit,
          },
        });
      },
      (err) => {
        setIsLocating(false);
        alert('위치 정보를 불러올 수 없습니다. 장소명을 직접 입력해 주세요.');
      }
    );
  };

  const handleTimeChange = (val: string) => {
    setTargetTime(val);
  };

  const handleSetCurrentTime = () => {
    const now = new Date();
    const hh = String(now.getHours()).padStart(2, '0');
    const mm = String(now.getMinutes()).padStart(2, '0');
    const curTime = `${hh}:${mm}`;
    setTargetTime(curTime);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!originName || originName.trim().length === 0) {
      alert(mode === 'commute_in' ? '출발지를 입력해 주세요!' : '목적지를 입력해 주세요!');
      return;
    }
    if (!useCompanyBusOnly && !usePublicTransit) {
      alert('최소 하나의 이동 수단 옵션을 체크해 주세요!');
      return;
    }

    let lat = originLat;
    let lng = originLng;
    let finalName = originName.trim();

    // 좌표가 아직 0이거나 미선택 상태일 때 자동 장소/주소 해석
    if (lat === 0 && lng === 0) {
      setIsSearching(true);
      const results = await searchKakaoPlaces(finalName);
      setIsSearching(false);
      if (results && results.length > 0) {
        lat = parseFloat(results[0].y);
        lng = parseFloat(results[0].x);
        finalName = results[0].place_name;
        setOriginLat(lat);
        setOriginLng(lng);
        setOriginName(finalName);
      }
    }

    setShowDropdown(false);

    onSearch({
      originName: finalName,
      originLat: lat,
      originLng: lng,
      mode,
      targetTime,
      date: new Date().toISOString().split('T')[0],
      preference,
      filters: {
        useCompanyBusOnly,
        usePublicTransit,
      },
    });
  };

  return (
    <div className="space-y-4">
      <div className="glass-panel rounded-2xl p-5 md:p-6 border border-slate-800 shadow-2xl relative overflow-hidden">
        {/* Decorative gradient glow */}
        <div className="absolute -top-24 -right-24 w-60 h-60 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-24 -left-24 w-60 h-60 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />

        <form onSubmit={handleSubmit} className="space-y-6 relative z-10">
          {/* Mode Selector Header: 출근 / 퇴근 */}
          <div className="flex items-center justify-between gap-3 bg-slate-950/80 p-1.5 rounded-xl border border-slate-800">
            <button
              type="button"
              onClick={() => {
                setMode('commute_in');
                setTargetTime('08:30');
              }}
              className={`flex-1 py-2.5 px-4 rounded-lg font-semibold text-xs sm:text-sm flex items-center justify-center gap-2 transition-all cursor-pointer ${mode === 'commute_in'
                ? 'bg-gradient-to-r from-indigo-600 to-indigo-700 text-white shadow-lg shadow-indigo-600/30'
                : 'text-slate-400 hover:text-slate-200'
                }`}
            >
              <Sun className="w-4 h-4 text-amber-300" />
              🌅 오늘 출근 (회사 도착)
            </button>
            <button
              type="button"
              onClick={() => {
                setMode('commute_out');
                setTargetTime('18:00');
              }}
              className={`flex-1 py-2.5 px-4 rounded-lg font-semibold text-xs sm:text-sm flex items-center justify-center gap-2 transition-all cursor-pointer ${mode === 'commute_out'
                ? 'bg-gradient-to-r from-purple-600 to-indigo-700 text-white shadow-lg shadow-purple-600/30'
                : 'text-slate-400 hover:text-slate-200'
                }`}
            >
              <Moon className="w-4 h-4 text-indigo-300" />
              🌃 오늘 퇴근 (회사 출발)
            </button>
          </div>

          {/* Departure Input & Location Button with Kakao Search Dropdown */}
          <div className="space-y-2">
            <label className="block text-xs font-semibold text-slate-300 flex items-center justify-between">
              <span className="flex items-center gap-1.5">
                <MapPin className="w-4 h-4 text-emerald-400" />
                {mode === 'commute_in' ? '출발지' : '퇴근 목적지'}
              </span>
              <span className="text-[11px] text-slate-500 font-normal">
                {mode === 'commute_in' ? '🏢 도착지: 슈어소프트 사옥' : '🏢 출발지: 슈어소프트 사옥'}
              </span>
            </label>

            {/* 텍스트 입력창 & 내 위치 버튼 (드롭다운 기준 컨테이너) */}
            <div ref={dropdownRef} className="relative">
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <input
                    type="text"
                    value={originName}
                    onChange={(e) => {
                      isSelectedRef.current = false;
                      setOriginName(e.target.value);
                      setOriginLat(0);
                      setOriginLng(0);
                      setSelectedAddress('');
                    }}
                    onFocus={async () => {
                      if (searchResults.length > 0) {
                        setShowDropdown(true);
                      } else if (originName && originName.trim().length >= 2) {
                        setIsSearching(true);
                        const results = await searchKakaoPlaces(originName);
                        setSearchResults(results);
                        setIsSearching(false);
                        setShowDropdown(results.length > 0);
                      }
                    }}
                    placeholder={mode === 'commute_in' ? "출발지를 입력해 주세요" : "목적지를 입력해 주세요"}
                    className="glass-input w-full px-4 py-2.5 pl-9 rounded-xl text-sm font-medium focus:ring-2 focus:ring-indigo-500"
                  />
                  <Search className={`w-4 h-4 absolute left-3 top-3 ${isSearching ? 'text-indigo-400 animate-spin' : 'text-slate-400'}`} />
                </div>

                <button
                  type="button"
                  onClick={handleGetCurrentLocation}
                  disabled={isLocating}
                  className="px-3.5 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium flex items-center gap-1.5 border border-slate-700 transition-colors shrink-0 cursor-pointer"
                >
                  <Navigation className={`w-3.5 h-3.5 text-emerald-400 ${isLocating ? 'animate-spin' : ''}`} />
                  {isLocating ? '찾는 중...' : '내 위치'}
                </button>
              </div>

              {/* Kakao Local Search Autocomplete Dropdown - 텍스트바 바로 아래에 정확히 표시 */}
              {showDropdown && searchResults.length > 0 && (
                <div className="absolute left-0 right-0 top-full mt-1.5 bg-slate-900/98 backdrop-blur-xl border border-indigo-500/30 rounded-xl shadow-2xl z-50 max-h-72 overflow-y-auto divide-y divide-slate-800">
                  <div className="p-2 text-[11px] text-slate-400 font-bold bg-slate-950/95 flex items-center justify-between sticky top-0 z-10 border-b border-slate-800">
                    <span className="flex items-center gap-1 text-indigo-300">
                      <span>🗺️</span> 카카오 장소 검색 결과:
                    </span>
                    <span className="text-[10px] text-emerald-400 font-semibold bg-emerald-500/10 px-1.5 py-0.5 rounded">클릭하여 선택</span>
                  </div>
                  {searchResults.map((place) => (
                    <button
                      key={place.id}
                      type="button"
                      onClick={() => handleSelectKakaoPlace(place)}
                      className="w-full text-left p-3 hover:bg-indigo-950/40 transition-colors flex items-start gap-2.5 group cursor-pointer"
                    >
                      {place.category_name?.includes('아파트') || place.category_name?.includes('주거') ? (
                        <Building2 className="w-4 h-4 text-emerald-400 mt-0.5 shrink-0 group-hover:scale-110 transition-transform" />
                      ) : place.category_name?.includes('역') ? (
                        <Train className="w-4 h-4 text-indigo-400 mt-0.5 shrink-0 group-hover:scale-110 transition-transform" />
                      ) : (
                        <MapPin className="w-4 h-4 text-amber-400 mt-0.5 shrink-0 group-hover:scale-110 transition-transform" />
                      )}
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center justify-between gap-1">
                          <p className="text-xs font-bold text-white group-hover:text-indigo-300 transition-colors truncate">
                            {place.place_name}
                          </p>
                          {place.category_name && (
                            <span className="text-[10px] text-slate-400 bg-slate-800 px-1.5 py-0.2 rounded shrink-0">
                              {place.category_name}
                            </span>
                          )}
                        </div>
                        <p className="text-[11px] text-slate-400 truncate mt-0.5">
                          {place.address_name || place.road_address_name}
                        </p>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* 장소 선택 완료 안내 뱃지 */}
            {selectedAddress && (
              <div className="mt-2 flex items-center justify-between px-3 py-2 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs">
                <div className="flex items-center gap-1.5 min-w-0">
                  <MapPin className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span className="font-semibold truncate">위치 선택 완료: {originName}</span>
                </div>
                <span className="text-[10px] bg-emerald-500/20 px-2 py-0.5 rounded text-emerald-300 shrink-0 font-bold ml-2">
                  하단 ‘경로 검색하기’ 클릭
                </span>
              </div>
            )}

            {/* Quick Preset Buttons - 통근버스/셔틀 실제 정차 거점 */}
            <div className="mt-2.5">
              <p className="text-[11px] text-slate-400 mb-1.5 font-medium flex items-center gap-1.5">
                <span className="text-emerald-400 font-bold">🚍 통근·셔틀 정차 거점:</span>
                <span className="text-[10px] text-slate-500">(클릭 시 즉시 통근/셔틀 직통 안내)</span>
              </p>
              <div className="flex flex-wrap gap-1.5">
                {[
                  { label: '판교역', badge: '셔틀', name: '판교역', lat: 37.3948, lng: 127.1111 },
                  { label: '야탑역', badge: '셔틀', name: '야탑역', lat: 37.4113, lng: 127.1287 },
                  { label: '잠실역', badge: '통근', name: '잠실역', lat: 37.5133, lng: 127.1001 },
                  { label: '강남역', badge: '통근', name: '강남역', lat: 37.4979, lng: 127.0276 },
                  { label: '양재역', badge: '통근', name: '양재역', lat: 37.4842, lng: 127.0345 },
                  { label: '사당역', badge: '통근', name: '사당역', lat: 37.4766, lng: 126.9816 },
                  { label: '신도림역', badge: '통근', name: '신도림역', lat: 37.5088, lng: 126.8912 },
                  { label: '모란역', badge: '통근', name: '모란역', lat: 37.4321, lng: 127.1292 },
                  { label: '복정역', badge: '통근', name: '복정역', lat: 37.4700, lng: 127.1267 },
                  { label: '가락시장역', badge: '통근', name: '가락시장역', lat: 37.4929, lng: 127.1182 },
                  { label: '인덕원역', badge: '통근', name: '인덕원역', lat: 37.4011, lng: 126.9768 },
                  { label: '범계역', badge: '통근', name: '범계역', lat: 37.3898, lng: 126.9507 },
                  { label: '광명역', badge: '통근', name: '광명역', lat: 37.4168, lng: 126.8851 },
                ].map((preset) => (
                  <button
                    key={preset.name}
                    type="button"
                    onClick={() => handleSelectPreset(preset)}
                    className={`text-xs px-2.5 py-1 rounded-lg border transition-all cursor-pointer flex items-center gap-1.5 ${originName.includes(preset.name)
                      ? 'bg-indigo-600/30 text-indigo-300 border-indigo-500/50 font-semibold shadow-sm'
                      : 'bg-slate-900/60 text-slate-300 border-slate-800 hover:bg-slate-800 hover:text-white'
                      }`}
                  >
                    <span className={`text-[9px] px-1 py-0.2 rounded font-extrabold ${preset.badge === '셔틀' ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30' : 'bg-indigo-500/20 text-indigo-300 border border-indigo-500/30'
                      }`}>
                      {preset.badge}
                    </span>
                    <span>{preset.label}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Time Picker */}
          <div className="bg-slate-950/80 p-4 rounded-xl border border-slate-800/90 space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-slate-200 flex items-center gap-1.5">
                <Clock className="w-4 h-4 text-indigo-400" />
                {mode === 'commute_in' ? '회사 도착 희망시간' : '회사 출발 시간'}
              </label>
              <button
                type="button"
                onClick={handleSetCurrentTime}
                className="text-[11px] text-emerald-300 hover:text-white font-bold bg-emerald-500/20 hover:bg-emerald-500/30 px-2.5 py-1 rounded-lg border border-emerald-500/40 flex items-center gap-1 transition-all cursor-pointer shadow-sm active:scale-95"
                title="현재 시각으로 즉시 입력"
              >
                <Sparkles className="w-3 h-3 text-amber-300" />
                현재 시간으로 맞추기
              </button>
            </div>

            <div>
              <input
                type="time"
                value={targetTime}
                min="05:00"
                max="23:59"
                onChange={(e) => handleTimeChange(e.target.value)}
                className="glass-input w-full px-4 py-2.5 rounded-xl text-base font-extrabold text-white text-center focus:ring-2 focus:ring-indigo-500 cursor-pointer"
              />
            </div>

            {/* Quick Time Pills */}
            <div>
              <p className="text-[11px] text-slate-400 mb-1.5 font-medium">빠른 시간 선택:</p>
              <div className="flex flex-wrap gap-1.5">
                {mode === 'commute_in' ? (
                  ['06:30', '07:00', '07:30', '08:00', '08:15', '08:30', '08:45', '09:00'].map((t) => (
                    <button
                      key={t}
                      type="button"
                      onClick={() => handleTimeChange(t)}
                      className={`text-xs px-2.5 py-1 rounded-lg border transition-all cursor-pointer ${targetTime === t
                        ? 'bg-indigo-600 text-white font-bold border-indigo-400 shadow-md'
                        : 'bg-slate-900/60 text-slate-400 border-slate-800 hover:bg-slate-800 hover:text-slate-200'
                        }`}
                    >
                      {t}
                    </button>
                  ))
                ) : (
                  ['15:00', '15:30', '16:00', '16:30', '17:00', '17:30', '18:00', '18:30', '19:00', '19:30', '20:00', '20:30'].map((t) => (
                    <button
                      key={t}
                      type="button"
                      onClick={() => handleTimeChange(t)}
                      className={`text-xs px-2.5 py-1 rounded-lg border transition-all cursor-pointer ${targetTime === t
                        ? 'bg-purple-600 text-white font-bold border-purple-400 shadow-md'
                        : 'bg-slate-900/60 text-slate-400 border-slate-800 hover:bg-slate-800 hover:text-slate-200'
                        }`}
                    >
                      {t}
                    </button>
                  ))
                )}
              </div>
            </div>
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            className="w-full py-3 px-6 rounded-xl bg-gradient-to-r from-indigo-600 via-indigo-700 to-emerald-600 hover:from-indigo-500 hover:to-emerald-500 text-white font-bold text-sm shadow-xl shadow-indigo-600/30 flex items-center justify-center gap-2 transition-all transform active:scale-[0.99] cursor-pointer"
          >
            <Sparkles className="w-4 h-4 text-amber-300" />
            경로 검색하기
          </button>
        </form>
      </div>
    </div>
  );
};
