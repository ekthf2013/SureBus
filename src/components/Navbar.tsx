import React from 'react';
import { Map, Clock, Star, Navigation } from 'lucide-react';

export type NavTab = 'search' | 'routes' | 'timetable' | 'favorites';

interface NavbarProps {
  activeTab: NavTab;
  setActiveTab: (tab: NavTab) => void;
}

export const Navbar: React.FC<NavbarProps> = ({ activeTab, setActiveTab }) => {
  return (
    <header className="sticky top-0 z-40 bg-slate-900/90 backdrop-blur-md border-b border-slate-800/80">
      <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
        {/* Brand Logo */}
        <div 
          onClick={() => setActiveTab('search')}
          className="flex items-center gap-3 cursor-pointer group select-none shrink-0"
        >
          {/* SURESOFT Official Logo Badge */}
          <div className="h-9 px-3 py-1.5 bg-white rounded-xl shadow-md shadow-blue-500/10 border border-white/60 flex items-center justify-center shrink-0 group-hover:scale-105 group-hover:shadow-blue-500/30 transition-all">
            <img 
              src="/suresoft_logo.png" 
              alt="SURESOFT" 
              className="h-4.5 w-[96px] object-contain shrink-0 block"
              width={1024}
              height={194}
            />
          </div>
          <div className="flex flex-col min-w-0">
            <div className="flex items-center gap-2">
              <h1 className="font-black text-base sm:text-lg bg-gradient-to-r from-white via-slate-100 to-sky-200 bg-clip-text text-transparent tracking-tight whitespace-nowrap">
                슈어버스
              </h1>
              <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-blue-500/20 text-sky-300 border border-blue-500/30 font-bold shrink-0">
                판교 사옥
              </span>
            </div>
            <p className="text-[11px] text-sky-400 font-medium tracking-wide whitespace-nowrap">
              사옥 출퇴근 최적 경로 안내
            </p>
          </div>
        </div>

        {/* Desktop Navigation */}
        <nav className="hidden md:flex items-center gap-1">
          <button
            onClick={() => setActiveTab('search')}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-sm font-medium transition-all ${
              activeTab === 'search'
                ? 'bg-blue-600/20 text-sky-300 border border-blue-500/30 shadow-sm'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
            }`}
          >
            <Navigation className="w-4 h-4" />
            경로 추천
          </button>
          <button
            onClick={() => setActiveTab('routes')}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-sm font-medium transition-all ${
              activeTab === 'routes'
                ? 'bg-blue-600/20 text-sky-300 border border-blue-500/30 shadow-sm'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
            }`}
          >
            <Map className="w-4 h-4" />
            전체 노선도
          </button>
          <button
            onClick={() => setActiveTab('timetable')}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-sm font-medium transition-all ${
              activeTab === 'timetable'
                ? 'bg-blue-600/20 text-sky-300 border border-blue-500/30 shadow-sm'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
            }`}
          >
            <Clock className="w-4 h-4" />
            시간표
          </button>
          <button
            onClick={() => setActiveTab('favorites')}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-sm font-medium transition-all ${
              activeTab === 'favorites'
                ? 'bg-blue-600/20 text-sky-300 border border-blue-500/30 shadow-sm'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
            }`}
          >
            <Star className="w-4 h-4" />
            즐겨찾기
          </button>
        </nav>
      </div>

      {/* Mobile Navigation Bottom Bar */}
      <div className="md:hidden flex items-center justify-around bg-slate-950/95 border-t border-slate-800/80 px-2 py-2 fixed bottom-0 left-0 right-0 z-50 shadow-2xl">
        <button
          onClick={() => setActiveTab('search')}
          className={`flex flex-col items-center gap-1 text-[11px] font-medium py-1 px-3 rounded-lg ${
            activeTab === 'search' ? 'text-sky-400' : 'text-slate-400'
          }`}
        >
          <Navigation className="w-5 h-5" />
          경로 추천
        </button>
        <button
          onClick={() => setActiveTab('routes')}
          className={`flex flex-col items-center gap-1 text-[11px] font-medium py-1 px-3 rounded-lg ${
            activeTab === 'routes' ? 'text-sky-400' : 'text-slate-400'
          }`}
        >
          <Map className="w-5 h-5" />
          노선도
        </button>
        <button
          onClick={() => setActiveTab('timetable')}
          className={`flex flex-col items-center gap-1 text-[11px] font-medium py-1 px-3 rounded-lg ${
            activeTab === 'timetable' ? 'text-sky-400' : 'text-slate-400'
          }`}
        >
          <Clock className="w-5 h-5" />
          시간표
        </button>
        <button
          onClick={() => setActiveTab('favorites')}
          className={`flex flex-col items-center gap-1 text-[11px] font-medium py-1 px-3 rounded-lg ${
            activeTab === 'favorites' ? 'text-sky-400' : 'text-slate-400'
          }`}
        >
          <Star className="w-5 h-5" />
          즐겨찾기
        </button>
      </div>
    </header>
  );
};
