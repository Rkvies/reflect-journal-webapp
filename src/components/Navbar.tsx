import React from 'react';
import { ShieldCheck, Brain, Sparkles, LogOut, User, Lock, BookOpen } from 'lucide-react';
import { AppUser } from '../types';

interface NavbarProps {
  user: AppUser | null;
  activeTab: 'journal' | 'history' | 'insights';
  setActiveTab: (tab: 'journal' | 'history' | 'insights') => void;
  onOpenMemory: () => void;
  onOpenSecurity: () => void;
  onSignOut: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  user,
  activeTab,
  setActiveTab,
  onOpenMemory,
  onOpenSecurity,
  onSignOut,
}) => {
  return (
    <header className="sticky top-0 z-30 bg-white/70 backdrop-blur-xl border-b border-white/60 text-slate-800 shadow-sm transition-all">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        
        {/* Brand */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-indigo-600/10 border border-indigo-500/20 flex items-center justify-center text-indigo-700 shadow-inner backdrop-blur-md">
            <BookOpen className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-serif text-lg font-bold tracking-tight text-slate-900">Reflect</span>
              <span className="text-[10px] font-mono uppercase px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200/80 font-semibold shadow-xs">
                ABAC Encrypted
              </span>
            </div>
            <p className="text-xs text-slate-500 hidden sm:block">Agentic Journaling with Context Memory</p>
          </div>
        </div>

        {/* Navigation Tabs */}
        {user && (
          <nav className="flex items-center p-1 bg-slate-100/80 backdrop-blur-md rounded-2xl border border-slate-200/60 shadow-inner">
            <button
              id="nav-tab-journal"
              onClick={() => setActiveTab('journal')}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-medium transition-all ${
                activeTab === 'journal'
                  ? 'bg-white text-indigo-900 shadow-sm border border-slate-200/50 font-semibold'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Daily Reflection
            </button>
            <button
              id="nav-tab-history"
              onClick={() => setActiveTab('history')}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-medium transition-all ${
                activeTab === 'history'
                  ? 'bg-white text-indigo-900 shadow-sm border border-slate-200/50 font-semibold'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Past Entries
            </button>
            <button
              id="nav-tab-insights"
              onClick={() => setActiveTab('insights')}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-medium transition-all flex items-center gap-1.5 ${
                activeTab === 'insights'
                  ? 'bg-white text-indigo-900 shadow-sm border border-slate-200/50 font-semibold'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Sparkles className="w-3.5 h-3.5 text-amber-500" />
              <span>Insights</span>
            </button>
          </nav>
        )}

        {/* Actions & Profile */}
        <div className="flex items-center gap-2 sm:gap-3">
          {user ? (
            <>
              {/* Memory Inspector Button */}
              <button
                id="btn-inspect-memory"
                onClick={onOpenMemory}
                title="View User Memory Layer (users/{uid}/profile/summary)"
                className="hidden md:flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium bg-white/80 hover:bg-white text-slate-700 border border-slate-200/80 hover:border-indigo-300 shadow-xs backdrop-blur-md transition-all cursor-pointer"
              >
                <Brain className="w-3.5 h-3.5 text-indigo-600" />
                <span>Memory Layer</span>
              </button>

              {/* Threat Model / Security Inspector */}
              <button
                id="btn-inspect-security"
                onClick={onOpenSecurity}
                title="View Security Rules & Threat Model"
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium bg-white/80 hover:bg-white text-slate-700 border border-slate-200/80 hover:border-emerald-300 shadow-xs backdrop-blur-md transition-all cursor-pointer"
              >
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                <span className="hidden sm:inline">Security</span>
              </button>

              {/* User Avatar / Sign Out */}
              <div className="flex items-center gap-2 pl-2 border-l border-slate-200">
                {user.photoURL ? (
                  <img
                    src={user.photoURL}
                    alt={user.displayName || 'User'}
                    className="w-8 h-8 rounded-full border border-white shadow-xs"
                    referrerPolicy="no-referrer"
                  />
                ) : (
                  <div className="w-8 h-8 rounded-full bg-indigo-100 text-indigo-700 flex items-center justify-center font-medium text-xs border border-indigo-200">
                    <User className="w-4 h-4" />
                  </div>
                )}
                <button
                  id="btn-signout"
                  onClick={onSignOut}
                  title="Sign Out"
                  className="p-1.5 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100/80 transition-colors cursor-pointer"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </div>
            </>
          ) : (
            <div className="flex items-center gap-2 text-xs text-slate-500 font-medium bg-white/60 px-3 py-1 rounded-full border border-white/80">
              <Lock className="w-3.5 h-3.5 text-emerald-600" />
              <span>Isolated Tenant Sandbox</span>
            </div>
          )}
        </div>

      </div>
    </header>
  );
};
