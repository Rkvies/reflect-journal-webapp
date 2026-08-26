import React, { useState, useRef, useEffect } from 'react';
import { 
  BookOpen, 
  Brain, 
  ShieldCheck, 
  LogOut, 
  User, 
  Sun, 
  Moon, 
  ChevronDown, 
  Settings 
} from 'lucide-react';
import { AppUser } from '../types';

interface NavbarProps {
  user: AppUser | null;
  activeTab: 'journal' | 'history' | 'insights';
  setActiveTab: (tab: 'journal' | 'history' | 'insights') => void;
  onOpenMemory: () => void;
  onOpenSecurity: () => void;
  onSignOut: () => void;
  theme: 'light' | 'dark';
  onToggleTheme: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  user,
  activeTab,
  setActiveTab,
  onOpenMemory,
  onOpenSecurity,
  onSignOut,
  theme,
  onToggleTheme,
}) => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <header className="sticky top-0 z-30 bg-white/80 dark:bg-slate-950/80 backdrop-blur-xl border-b border-slate-200/60 dark:border-slate-800/60 text-slate-800 dark:text-slate-100 transition-colors">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
        
        {/* Brand */}
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-2xl bg-indigo-600/10 dark:bg-indigo-500/15 flex items-center justify-center text-indigo-600 dark:text-indigo-400">
            <BookOpen className="w-4 h-4" />
          </div>
          <div>
            <h1 className="font-serif text-lg font-bold tracking-tight text-slate-900 dark:text-white leading-none">
              Reflect
            </h1>
            <p className="text-[11px] text-slate-400 dark:text-slate-500 mt-0.5 font-sans">
              Mindful Journal
            </p>
          </div>
        </div>

        {/* Primary Navigation Tabs */}
        {user && (
          <nav className="flex items-center p-1 bg-slate-100/90 dark:bg-slate-900 rounded-2xl border border-slate-200/50 dark:border-slate-800/60">
            <button
              id="nav-tab-journal"
              onClick={() => setActiveTab('journal')}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-medium transition-all cursor-pointer ${
                activeTab === 'journal'
                  ? 'bg-white dark:bg-slate-800 text-indigo-600 dark:text-indigo-400 shadow-xs font-semibold'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              Daily Reflection
            </button>
            <button
              id="nav-tab-history"
              onClick={() => setActiveTab('history')}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-medium transition-all cursor-pointer ${
                activeTab === 'history'
                  ? 'bg-white dark:bg-slate-800 text-indigo-600 dark:text-indigo-400 shadow-xs font-semibold'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              Past Entries
            </button>
            <button
              id="nav-tab-insights"
              onClick={() => setActiveTab('insights')}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-medium transition-all cursor-pointer ${
                activeTab === 'insights'
                  ? 'bg-white dark:bg-slate-800 text-indigo-600 dark:text-indigo-400 shadow-xs font-semibold'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              Insights
            </button>
          </nav>
        )}

        {/* Settings & Profile Menu Dropdown */}
        <div className="flex items-center gap-2">
          {user ? (
            <div className="relative" ref={menuRef}>
              <button
                id="btn-user-settings-menu"
                type="button"
                onClick={() => setIsMenuOpen(!isMenuOpen)}
                className="flex items-center gap-2 p-1.5 pr-2.5 rounded-2xl hover:bg-slate-100 dark:hover:bg-slate-900 border border-transparent hover:border-slate-200/60 dark:hover:border-slate-800/60 transition-all cursor-pointer"
                title="Account & Settings"
                aria-expanded={isMenuOpen}
              >
                {user.photoURL ? (
                  <img
                    src={user.photoURL}
                    alt={user.displayName || 'User'}
                    className="w-7 h-7 rounded-full object-cover"
                    referrerPolicy="no-referrer"
                  />
                ) : (
                  <div className="w-7 h-7 rounded-full bg-indigo-100 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300 flex items-center justify-center font-medium text-xs">
                    <User className="w-3.5 h-3.5" />
                  </div>
                )}
                <ChevronDown className="w-3.5 h-3.5 text-slate-400 dark:text-slate-500" />
              </button>

              {/* Dropdown Card */}
              {isMenuOpen && (
                <div 
                  id="user-settings-dropdown"
                  className="absolute right-0 mt-2 w-64 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-lg p-2 z-50 text-xs animate-fade-in space-y-1"
                >
                  {/* User Profile Header */}
                  <div className="px-3 py-2 border-b border-slate-100 dark:border-slate-800/80 mb-1">
                    <p className="font-semibold text-slate-900 dark:text-white truncate">
                      {user.displayName || 'Journal Author'}
                    </p>
                    <p className="text-[11px] text-slate-400 dark:text-slate-500 truncate mt-0.5">
                      {user.email || 'Authenticated with Google'}
                    </p>
                  </div>

                  {/* Theme Toggle */}
                  <button
                    id="btn-dropdown-theme-toggle"
                    type="button"
                    onClick={() => {
                      onToggleTheme();
                    }}
                    className="w-full flex items-center justify-between px-3 py-2 rounded-xl text-slate-700 dark:text-slate-200 hover:bg-slate-100/80 dark:hover:bg-slate-800/80 transition-colors cursor-pointer"
                  >
                    <div className="flex items-center gap-2.5">
                      {theme === 'dark' ? (
                        <Sun className="w-4 h-4 text-amber-500" />
                      ) : (
                        <Moon className="w-4 h-4 text-indigo-600" />
                      )}
                      <span>Appearance</span>
                    </div>
                    <span className="text-[11px] text-slate-400 dark:text-slate-500 capitalize">
                      {theme} mode
                    </span>
                  </button>

                  {/* Memory Context Layer Modal Trigger */}
                  <button
                    id="btn-dropdown-memory"
                    type="button"
                    onClick={() => {
                      setIsMenuOpen(false);
                      onOpenMemory();
                    }}
                    className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-slate-700 dark:text-slate-200 hover:bg-slate-100/80 dark:hover:bg-slate-800/80 transition-colors cursor-pointer"
                  >
                    <Brain className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                    <span>Memory Context Layer</span>
                  </button>

                  {/* Security & Transparency Inspector Modal Trigger */}
                  <button
                    id="btn-dropdown-security"
                    type="button"
                    onClick={() => {
                      setIsMenuOpen(false);
                      onOpenSecurity();
                    }}
                    className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-slate-700 dark:text-slate-200 hover:bg-slate-100/80 dark:hover:bg-slate-800/80 transition-colors cursor-pointer"
                  >
                    <ShieldCheck className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                    <span>Security & Transparency</span>
                  </button>

                  <div className="border-t border-slate-100 dark:border-slate-800/80 my-1" />

                  {/* Sign Out */}
                  <button
                    id="btn-dropdown-signout"
                    type="button"
                    onClick={() => {
                      setIsMenuOpen(false);
                      onSignOut();
                    }}
                    className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors cursor-pointer"
                  >
                    <LogOut className="w-4 h-4" />
                    <span>Sign Out</span>
                  </button>
                </div>
              )}
            </div>
          ) : (
            <div className="text-xs text-slate-500 font-medium">
              Private Journal
            </div>
          )}
        </div>

      </div>
    </header>
  );
};
