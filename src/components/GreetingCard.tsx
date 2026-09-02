import React from 'react';
import { Flame, Clock, CheckCircle2, Plus, Check } from 'lucide-react';
import { ReflectMascot } from './ReflectMascot';

interface GreetingCardProps {
  firstName: string;
  greetingSubtext: string;
  streakCount: number;
  timeSinceLastEntry: string;
  latestEntryTitle?: string;
  hasEntryToday: boolean;
  saveStatus: string | null;
  onNewEntry: () => void;
  className?: string;
}

/**
 * Editorial GreetingCard component featuring the static soft-flat Fox companion mascot,
 * personalized salutation, and minimalist engagement snapshot metrics.
 * Designed with a responsive flexbox architecture to stack and wrap cleanly on mobile
 * while remaining compact and non-disruptive on desktop screens.
 */
export const GreetingCard: React.FC<GreetingCardProps> = ({
  firstName,
  greetingSubtext,
  streakCount,
  timeSinceLastEntry,
  latestEntryTitle,
  hasEntryToday,
  saveStatus,
  onNewEntry,
  className = '',
}) => {
  return (
    <div
      id="greeting-card-container"
      className={`flex flex-col gap-2.5 sm:gap-3 pb-3 sm:pb-3.5 border-b border-white/60 dark:border-white/10 ${className}`}
    >
      {/* Primary Header Row: Mascot, Salutation & Action Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 sm:gap-4">
        {/* Left / Top Group: Mascot & Greeting Salutation */}
        <div className="flex items-center gap-3 sm:gap-3.5 min-w-0">
          <ReflectMascot size="md" interactive={true} className="flex-shrink-0" />
          <div className="min-w-0 flex-1">
            <h2 className="text-xl sm:text-2xl md:text-3xl font-serif font-bold text-slate-950 dark:text-white tracking-tight truncate sm:whitespace-normal">
              Hi, {firstName}
            </h2>
            <p className="text-xs sm:text-sm text-slate-700 dark:text-slate-200 font-medium mt-0.5 line-clamp-1 sm:line-clamp-none">
              {greetingSubtext}
            </p>
          </div>
        </div>

        {/* Right / Secondary Group: Save Status & New Entry Action */}
        <div className="flex items-center gap-2 self-start sm:self-center flex-shrink-0">
          {saveStatus && (
            <span className="text-xs text-indigo-600 dark:text-indigo-400 flex items-center gap-1 font-medium animate-fade-in pr-1">
              <Check className="w-3.5 h-3.5" />
              {saveStatus}
            </span>
          )}

          <button
            id="btn-new-entry"
            onClick={onNewEntry}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium bg-white/60 dark:bg-slate-800/60 backdrop-blur-md text-slate-700 dark:text-slate-200 hover:text-slate-900 dark:hover:text-white hover:bg-white/90 dark:hover:bg-slate-800/90 transition-all cursor-pointer border border-white/80 dark:border-white/10 shadow-xs active:scale-95"
            title="Start a fresh reflection"
          >
            <Plus className="w-3.5 h-3.5" />
            <span className="whitespace-nowrap">New entry</span>
          </button>
        </div>
      </div>

      {/* Minimalist Snapshot Metadata Bar (Wrapping Flexbox) */}
      <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap">
        {/* Streak Indicator */}
        <div
          id="snapshot-streak-pill"
          className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium border backdrop-blur-md transition-colors whitespace-nowrap shadow-2xs ${
            streakCount > 0
              ? 'bg-amber-50/70 dark:bg-amber-950/40 text-amber-800 dark:text-amber-300 border-amber-200/70 dark:border-amber-800/60'
              : 'bg-white/50 dark:bg-slate-800/50 text-slate-600 dark:text-slate-400 border-white/60 dark:border-white/10'
          }`}
          title="Consecutive days with journal reflections"
        >
          <Flame
            className={`w-3.5 h-3.5 flex-shrink-0 ${
              streakCount > 0 ? 'text-amber-500 fill-amber-500' : 'text-slate-400'
            }`}
          />
          <span>{streakCount > 0 ? `${streakCount} day streak` : 'Start streak'}</span>
        </div>

        {/* Time Since Last Entry */}
        <div
          id="snapshot-recency-pill"
          className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium bg-white/50 dark:bg-slate-800/50 backdrop-blur-md text-slate-600 dark:text-slate-400 border border-white/60 dark:border-white/10 whitespace-nowrap shadow-2xs"
          title={
            latestEntryTitle
              ? `Latest entry: "${latestEntryTitle}"`
              : 'Time since your last entry'
          }
        >
          <Clock className="w-3.5 h-3.5 text-slate-400 dark:text-slate-500 flex-shrink-0" />
          <span>
            {timeSinceLastEntry !== 'No reflections yet'
              ? `Last entry: ${timeSinceLastEntry}`
              : 'First reflection'}
          </span>
        </div>

        {/* Today's Log Status */}
        {hasEntryToday && (
          <div
            id="snapshot-today-status"
            className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium bg-emerald-50/70 dark:bg-emerald-950/40 backdrop-blur-md text-emerald-800 dark:text-emerald-300 border border-emerald-200/70 dark:border-emerald-800/60 whitespace-nowrap shadow-2xs"
          >
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 flex-shrink-0" />
            <span>Logged today</span>
          </div>
        )}
      </div>
    </div>
  );
};

export default GreetingCard;
