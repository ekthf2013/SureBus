import React from 'react';
import { Bus, Map, Clock, Upload, Star, Navigation } from 'lucide-react';

export type NavTab = 'search' | 'routes' | 'timetable' | 'favorites' | 'admin';

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
          className="flex items-center gap-3 cursor-pointer group"
        >
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-indigo-600 to-emerald-400 p-0.5 shadow-lg shadow-indigo-500/20 group-hover:scale-105 transition-transform">
            <div className="w-full h-full bg-slate-950 rounded-[10px] flex items-center justify-center">
              <Bus className="w-5 h-5 text-emerald-400" />
            </div>
          </div>
          <div>
            <h1 className="font-extrabold text-base sm:text-lg bg-gradient-to-r from-white via-slate-100 to-indigo-200 bg-clip-text text-transparent">
              사옥 출퇴근 최적 경로
            </h1>
            <p className="text-[11px] text-emerald-400 font-medium tracking-wide">
              통근·셔틀·대중교통 스마트 추천
            </p>
          </div>
        </div>

        {/* Desktop Navigation */}
        <nav className="hidden md:flex items-center gap-1">
          <button
            onClick={() => setActiveTab('search')}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-sm font-medium transition-all ${
              activeTab === 'search'
                ? 'bg-indigo-600/20 text-indigo-400 border border-indigo-500/30'
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
                ? 'bg-indigo-600/20 text-indigo-400 border border-indigo-500/30'
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
                ? 'bg-indigo-600/20 text-indigo-400 border border-indigo-500/30'
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
                ? 'bg-indigo-600/20 text-indigo-400 border border-indigo-500/30'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
            }`}
          >
            <Star className="w-4 h-4" />
            즐겨찾기
          </button>
          <button
            onClick={() => setActiveTab('admin')}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-sm font-medium transition-all ${
              activeTab === 'admin'
                ? 'bg-indigo-600/20 text-indigo-400 border border-indigo-500/30'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
            }`}
          >
            <Upload className="w-4 h-4" />
            Excel Import
          </button>
        </nav>
      </div>

      {/* Mobile Navigation Bottom Bar */}
      <div className="md:hidden flex items-center justify-around bg-slate-950/95 border-t border-slate-800/80 px-2 py-2 fixed bottom-0 left-0 right-0 z-50 shadow-2xl">
        <button
          onClick={() => setActiveTab('search')}
          className={`flex flex-col items-center gap-1 text-[11px] font-medium py-1 px-3 rounded-lg ${
            activeTab === 'search' ? 'text-indigo-400' : 'text-slate-400'
          }`}
        >
          <Navigation className="w-5 h-5" />
          경로 추천
        </button>
        <button
          onClick={() => setActiveTab('routes')}
          className={`flex flex-col items-center gap-1 text-[11px] font-medium py-1 px-3 rounded-lg ${
            activeTab === 'routes' ? 'text-indigo-400' : 'text-slate-400'
          }`}
        >
          <Map className="w-5 h-5" />
          노선도
        </button>
        <button
          onClick={() => setActiveTab('timetable')}
          className={`flex flex-col items-center gap-1 text-[11px] font-medium py-1 px-3 rounded-lg ${
            activeTab === 'timetable' ? 'text-indigo-400' : 'text-slate-400'
          }`}
        >
          <Clock className="w-5 h-5" />
          시간표
        </button>
        <button
          onClick={() => setActiveTab('favorites')}
          className={`flex flex-col items-center gap-1 text-[11px] font-medium py-1 px-3 rounded-lg ${
            activeTab === 'favorites' ? 'text-indigo-400' : 'text-slate-400'
          }`}
        >
          <Star className="w-5 h-5" />
          즐겨찾기
        </button>
        <button
          onClick={() => setActiveTab('admin')}
          className={`flex flex-col items-center gap-1 text-[11px] font-medium py-1 px-3 rounded-lg ${
            activeTab === 'admin' ? 'text-indigo-400' : 'text-slate-400'
          }`}
        >
          <Upload className="w-5 h-5" />
          Import
        </button>
      </div>
    </header>
  );
};
