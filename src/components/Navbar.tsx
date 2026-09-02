import React, { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { 
  BookOpen, 
  Brain, 
  ShieldCheck, 
  LogOut, 
  User, 
  Sun, 
  Moon, 
  ChevronDown,
  UserX,
  Trash2,
  Settings,
  Sparkles,
  Heart,
  FileText,
  Lock
} from 'lucide-react';
import { AppUser } from '../types';

interface NavbarProps {
  user: AppUser | null;
  activeTab: 'journal' | 'history' | 'insights' | 'gratitude' | 'settings';
  setActiveTab: (tab: 'journal' | 'history' | 'insights' | 'gratitude' | 'settings') => void;
  onOpenMemory: () => void;
  onOpenSecurity: () => void;
  onOpenDeactivateModal: () => void;
  onOpenDeleteModal: () => void;
  onSignOut: () => void;
  theme: 'light' | 'dark';
  onToggleTheme: () => void;
  pinEnabled?: boolean;
  onLockApp?: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  user,
  activeTab,
  setActiveTab,
  onOpenMemory,
  onOpenSecurity,
  onOpenDeactivateModal,
  onOpenDeleteModal,
  onSignOut,
  theme,
  onToggleTheme,
  pinEnabled = false,
  onLockApp,
}) => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const profileButtonRef = useRef<HTMLButtonElement>(null);
  const [profileCoords, setProfileCoords] = useState({ top: 0, right: 0 });

  const handleToggleMenu = () => {
    if (!isMenuOpen && profileButtonRef.current) {
      const rect = profileButtonRef.current.getBoundingClientRect();
      setProfileCoords({
        top: rect.bottom + 8,
        right: window.innerWidth - rect.right,
      });
    }
    setIsMenuOpen(!isMenuOpen);
  };

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Node;
      if (
        menuRef.current && 
        !menuRef.current.contains(target) &&
        profileButtonRef.current && 
        !profileButtonRef.current.contains(target)
      ) {
        setIsMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <>
      <header className="sticky top-0 z-50 bg-white/60 dark:bg-slate-950/60 backdrop-blur-2xl border-b border-white/60 dark:border-white/10 text-slate-800 dark:text-slate-100 transition-colors shadow-xs overflow-visible">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
        
        {/* Brand */}
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 flex items-center justify-center">
            <img src="/reflect_logo.png" alt="Reflect Logo" className="w-full h-full object-contain dark:invert drop-shadow-xs" />
          </div>
          <div>
            <h1 className="font-serif text-lg font-bold tracking-tight text-slate-900 dark:text-white leading-none">
              Reflect
            </h1>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 font-sans">
              Mindful Journal
            </p>
          </div>
        </div>

        {/* Primary Navigation Tabs (Desktop & Tablet) */}
        {user && (
          <nav className="hidden md:flex items-center p-1 bg-white/40 dark:bg-slate-900/50 backdrop-blur-xl rounded-2xl border border-white/60 dark:border-white/10 shadow-xs">
            <button
              id="nav-tab-journal"
              onClick={() => setActiveTab('journal')}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-medium transition-all cursor-pointer ${
                activeTab === 'journal'
                  ? 'bg-white/90 dark:bg-slate-800/90 text-indigo-600 dark:text-indigo-400 shadow-xs font-semibold backdrop-blur-md'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-white/30 dark:hover:bg-slate-800/40'
              }`}
            >
              Daily Reflection
            </button>
            <button
              id="nav-tab-history"
              onClick={() => setActiveTab('history')}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-medium transition-all cursor-pointer ${
                activeTab === 'history'
                  ? 'bg-white/90 dark:bg-slate-800/90 text-indigo-600 dark:text-indigo-400 shadow-xs font-semibold backdrop-blur-md'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-white/30 dark:hover:bg-slate-800/40'
              }`}
            >
              Past Entries
            </button>
            <button
              id="nav-tab-insights"
              onClick={() => setActiveTab('insights')}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-medium transition-all cursor-pointer ${
                activeTab === 'insights'
                  ? 'bg-white/90 dark:bg-slate-800/90 text-indigo-600 dark:text-indigo-400 shadow-xs font-semibold backdrop-blur-md'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-white/30 dark:hover:bg-slate-800/40'
              }`}
            >
              Insights
            </button>
            <button
              id="nav-tab-gratitude"
              onClick={() => setActiveTab('gratitude')}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-medium transition-all cursor-pointer ${
                activeTab === 'gratitude'
                  ? 'bg-white/90 dark:bg-slate-800/90 text-indigo-600 dark:text-indigo-400 shadow-xs font-semibold backdrop-blur-md'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-white/30 dark:hover:bg-slate-800/40'
              }`}
            >
              Daily Gratitude
            </button>
          </nav>
        )}

        {/* Settings & Profile Menu Dropdown */}
        <div className="flex items-center gap-2">
          {user ? (
            <div className="relative" ref={menuRef}>
              <button
                ref={profileButtonRef}
                id="btn-user-settings-menu"
                type="button"
                onClick={handleToggleMenu}
                className="flex items-center gap-2 p-1.5 pr-2.5 rounded-2xl bg-white/40 dark:bg-slate-900/40 backdrop-blur-lg hover:bg-white/70 dark:hover:bg-slate-850 border border-white/60 dark:border-white/10 transition-all cursor-pointer shadow-2xs"
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
              {isMenuOpen && createPortal(
                <div 
                  ref={menuRef}
                  id="user-settings-dropdown"
                  style={{
                    top: `${profileCoords.top}px`,
                    right: `${profileCoords.right}px`,
                  }}
                  className="fixed w-64 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xl p-2 z-[2147483647] text-xs animate-fade-in space-y-1"
                >
                  {/* User Profile Header */}
                  <div className="px-3 py-2 border-b border-slate-200/50 dark:border-slate-800/80 mb-1">
                    <p className="font-semibold text-slate-900 dark:text-white truncate">
                      {user.displayName || 'Journal Author'}
                    </p>
                    <p className="text-[11px] text-slate-400 dark:text-slate-500 truncate mt-0.5">
                      {user.email || 'Authenticated with Google'}
                    </p>
                  </div>

                  {/* Settings Page Link */}
                  <button
                    id="btn-dropdown-settings-page"
                    type="button"
                    onClick={() => {
                      setIsMenuOpen(false);
                      setActiveTab('settings');
                    }}
                    className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-slate-700 dark:text-slate-200 hover:bg-slate-100/80 dark:hover:bg-slate-800/80 transition-colors cursor-pointer"
                  >
                    <Settings className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                    <span>Settings & Preferences</span>
                  </button>

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

                  {/* Quick Lock Application */}
                  {pinEnabled && onLockApp && (
                    <button
                      id="btn-dropdown-lock-app"
                      type="button"
                      onClick={() => {
                        setIsMenuOpen(false);
                        onLockApp();
                      }}
                      className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-950/40 transition-colors cursor-pointer font-medium"
                    >
                      <Lock className="w-4 h-4" />
                      <span>Lock Application Now</span>
                    </button>
                  )}

                  <div className="border-t border-slate-100 dark:border-slate-800/80 my-1" />

                  {/* Deactivate Account */}
                  <button
                    id="btn-dropdown-deactivate"
                    type="button"
                    onClick={() => {
                      setIsMenuOpen(false);
                      onOpenDeactivateModal();
                    }}
                    className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-amber-600 dark:text-amber-400 hover:bg-amber-50 dark:hover:bg-amber-950/40 transition-colors cursor-pointer"
                  >
                    <UserX className="w-4 h-4" />
                    <span>Deactivate Account</span>
                  </button>

                  {/* Delete Account Permanently */}
                  <button
                    id="btn-dropdown-delete-account"
                    type="button"
                    onClick={() => {
                      setIsMenuOpen(false);
                      onOpenDeleteModal();
                    }}
                    className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors cursor-pointer"
                  >
                    <Trash2 className="w-4 h-4" />
                    <span>Delete Account Permanently</span>
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
                </div>,
                document.body
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

    {/* Mobile Bottom Navigation Bar (Phone & Narrow Screens) */}
    {user && (
      <nav 
        id="mobile-bottom-nav"
        className="fixed bottom-0 left-0 right-0 z-40 md:hidden bg-white/70 dark:bg-slate-950/70 backdrop-blur-2xl border-t border-white/60 dark:border-white/10 px-2 py-1.5 flex items-center justify-around shadow-2xl transition-colors"
      >
        <button
          id="mobile-nav-tab-journal"
          onClick={() => setActiveTab('journal')}
          className={`flex flex-col items-center gap-1 py-1 px-2 rounded-xl text-[10px] font-medium transition-all cursor-pointer min-w-[56px] ${
            activeTab === 'journal'
              ? 'text-indigo-600 dark:text-indigo-400 font-semibold scale-105'
              : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
          }`}
        >
          <BookOpen className="w-4 h-4" />
          <span>Reflection</span>
        </button>

        <button
          id="mobile-nav-tab-history"
          onClick={() => setActiveTab('history')}
          className={`flex flex-col items-center gap-1 py-1 px-2 rounded-xl text-[10px] font-medium transition-all cursor-pointer min-w-[56px] ${
            activeTab === 'history'
              ? 'text-indigo-600 dark:text-indigo-400 font-semibold scale-105'
              : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
          }`}
        >
          <FileText className="w-4 h-4" />
          <span>Past Entries</span>
        </button>

        <button
          id="mobile-nav-tab-insights"
          onClick={() => setActiveTab('insights')}
          className={`flex flex-col items-center gap-1 py-1 px-2 rounded-xl text-[10px] font-medium transition-all cursor-pointer min-w-[56px] ${
            activeTab === 'insights'
              ? 'text-indigo-600 dark:text-indigo-400 font-semibold scale-105'
              : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
          }`}
        >
          <Sparkles className="w-4 h-4" />
          <span>Insights</span>
        </button>

        <button
          id="mobile-nav-tab-gratitude"
          onClick={() => setActiveTab('gratitude')}
          className={`flex flex-col items-center gap-1 py-1 px-2 rounded-xl text-[10px] font-medium transition-all cursor-pointer min-w-[56px] ${
            activeTab === 'gratitude'
              ? 'text-indigo-600 dark:text-indigo-400 font-semibold scale-105'
              : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
          }`}
        >
          <Heart className="w-4 h-4" />
          <span>Gratitude</span>
        </button>

        <button
          id="mobile-nav-tab-settings"
          onClick={() => setActiveTab('settings')}
          className={`flex flex-col items-center gap-1 py-1 px-2 rounded-xl text-[10px] font-medium transition-all cursor-pointer min-w-[56px] ${
            activeTab === 'settings'
              ? 'text-indigo-600 dark:text-indigo-400 font-semibold scale-105'
              : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
          }`}
        >
          <Settings className="w-4 h-4" />
          <span>Settings</span>
        </button>
      </nav>
    )}
    </>
  );
};
