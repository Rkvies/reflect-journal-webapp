import React, { useState, useMemo } from 'react';
import { 
  Sparkles, 
  RefreshCw, 
  ChevronDown, 
  ChevronUp, 
  ArrowRight
} from 'lucide-react';
import { JournalEntry, ProfileSummary, WeeklyReflectionReport } from '../types';
import { requestWeeklySummary } from '../lib/api';
import { saveWeeklySummary } from '../lib/firebase';

interface WeeklyReflectionCardProps {
  userId: string;
  entries: JournalEntry[];
  profileSummary: ProfileSummary | null;
  cachedWeeklySummary: WeeklyReflectionReport | null;
  onStartEntry?: () => void;
  onReflectOnPrompt?: (prompt: string, tag: string) => void;
  compact?: boolean;
}

export const WeeklyReflectionCard: React.FC<WeeklyReflectionCardProps> = ({
  userId,
  entries,
  profileSummary,
  cachedWeeklySummary,
  onStartEntry,
  onReflectOnPrompt,
  compact = false,
}) => {
  const [isGenerating, setIsGenerating] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isCollapsed, setIsCollapsed] = useState(compact);

  // Filter entries strictly to the last 7 days
  const recent7DayEntries = useMemo(() => {
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - 7);
    cutoff.setHours(0, 0, 0, 0);

    return entries.filter((entry) => {
      if (!entry.createdAt) return false;
      const d = new Date(entry.createdAt);
      return d >= cutoff;
    });
  }, [entries]);

  const activeDaysCount = useMemo(() => {
    const daysSet = new Set(
      recent7DayEntries.map((e) => {
        const d = new Date(e.createdAt);
        return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
      })
    );
    return daysSet.size;
  }, [recent7DayEntries]);

  const handleGenerateWeeklySummary = async () => {
    if (recent7DayEntries.length === 0) {
      setErrorMessage('You need at least 1 journal entry in the past 7 days to generate your weekly recap.');
      return;
    }

    setIsGenerating(true);
    setErrorMessage(null);

    try {
      const res = await requestWeeklySummary({
        entries: recent7DayEntries,
        profileSummary,
      });

      const newSummaryReport: WeeklyReflectionReport = {
        id: 'weeklySummary',
        userId,
        ...res.summary,
      };

      await saveWeeklySummary(userId, newSummaryReport);
    } catch (err: any) {
      console.error('Failed to generate weekly summary:', err);
      setErrorMessage(err.message || 'Unable to synthesize weekly recap. Please try again.');
    } finally {
      setIsGenerating(false);
    }
  };

  // State A: User has 0 entries in the last 7 days
  if (recent7DayEntries.length === 0) {
    if (compact) return null;
    return (
      <div 
        id="card-weekly-reflection-empty"
        className="bg-white dark:bg-slate-900 border border-slate-200/60 dark:border-slate-800 rounded-3xl p-6 shadow-sm transition-all"
      >
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <h3 className="text-base font-serif font-semibold text-slate-900 dark:text-white">
              Your Week in Reflection
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-xl leading-relaxed">
              Log reflections across this week to unlock your AI-powered weekly thematic summary, mood trajectory, and growth takeaways.
            </p>
          </div>

          {onStartEntry && (
            <button
              id="btn-weekly-empty-write"
              type="button"
              onClick={onStartEntry}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold bg-indigo-600 hover:bg-indigo-700 text-white shadow-xs transition-colors cursor-pointer"
            >
              <span>Begin Reflection</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>
    );
  }

  // State B: Has entries, but no summary generated yet
  if (!cachedWeeklySummary && !isGenerating) {
    return (
      <div 
        id="card-weekly-reflection-ready"
        className="bg-white dark:bg-slate-900 border border-slate-200/60 dark:border-slate-800 rounded-3xl p-5 sm:p-6 shadow-sm transition-all"
      >
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-base font-serif font-semibold text-slate-900 dark:text-white">
                Your Week in Reflection
              </h3>
              <span className="text-[11px] font-sans px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 font-medium">
                {recent7DayEntries.length} {recent7DayEntries.length === 1 ? 'entry' : 'entries'} • {activeDaysCount} {activeDaysCount === 1 ? 'day' : 'days'}
              </span>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-xl leading-relaxed">
              Synthesize your reflections over the past 7 days to uncover personal breakthroughs and weekly emotional trends.
            </p>
          </div>

          <button
            id="btn-generate-weekly-summary-initial"
            type="button"
            onClick={handleGenerateWeeklySummary}
            disabled={isGenerating}
            className="flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold bg-indigo-600 hover:bg-indigo-700 text-white shadow-xs transition-colors cursor-pointer disabled:opacity-50"
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>Generate Weekly Recap</span>
          </button>
        </div>

        {errorMessage && (
          <div className="mt-4 p-3 rounded-2xl bg-rose-50 dark:bg-rose-950/60 text-xs text-rose-700 dark:text-rose-300">
            {errorMessage}
          </div>
        )}
      </div>
    );
  }

  // State C: Generating loader
  if (isGenerating) {
    return (
      <div 
        id="card-weekly-reflection-loading"
        className="bg-white dark:bg-slate-900 border border-slate-200/60 dark:border-slate-800 rounded-3xl p-6 shadow-sm text-center space-y-3"
      >
        <div className="w-8 h-8 rounded-full bg-indigo-50 dark:bg-indigo-950 flex items-center justify-center text-indigo-600 dark:text-indigo-400 mx-auto">
          <RefreshCw className="w-4 h-4 animate-spin" />
        </div>
        <p className="text-xs text-slate-600 dark:text-slate-300 font-medium">
          Synthesizing your week in reflection...
        </p>
      </div>
    );
  }

  // State D: Render Cached Weekly Summary
  const summary = cachedWeeklySummary!;

  return (
    <div 
      id="card-weekly-reflection"
      className="bg-white dark:bg-slate-900 border border-slate-200/60 dark:border-slate-800 rounded-3xl p-5 sm:p-6 shadow-sm transition-all space-y-4"
    >
      {/* Header */}
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2.5 flex-wrap">
          <h3 className="text-base font-serif font-semibold text-slate-900 dark:text-white">
            Your Week in Reflection
          </h3>
          <span className="text-[11px] text-slate-500 dark:text-slate-400 font-sans">
            {summary.weekRange}
          </span>
          <span className="text-slate-300 dark:text-slate-700">•</span>
          <span className="text-[11px] text-slate-500 dark:text-slate-400 font-sans">
            {summary.entryCount < recent7DayEntries.length
              ? `Recap of ${summary.entryCount} of ${recent7DayEntries.length} entries this week`
              : `${summary.entryCount} ${summary.entryCount === 1 ? 'reflection' : 'reflections'} this week`}
          </span>
        </div>

        <div className="flex items-center gap-2">
          <button
            id="btn-refresh-weekly-summary"
            type="button"
            onClick={handleGenerateWeeklySummary}
            disabled={isGenerating}
            title="Refresh weekly summary"
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isGenerating ? 'animate-spin' : ''}`} />
          </button>

          <button
            id="btn-toggle-weekly-collapse"
            type="button"
            onClick={() => setIsCollapsed(!isCollapsed)}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
            title={isCollapsed ? 'Expand' : 'Collapse'}
          >
            {isCollapsed ? <ChevronDown className="w-4 h-4" /> : <ChevronUp className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {errorMessage && (
        <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/60 text-xs text-rose-700 dark:text-rose-300">
          {errorMessage}
        </div>
      )}

      {/* Highlights bar */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
        <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-850">
          <span className="text-[11px] text-slate-400 dark:text-slate-500 font-medium">
            Dominant Mood & Trend
          </span>
          <p className="font-medium text-slate-800 dark:text-slate-200 mt-0.5">
            {summary.dominantMood} — <span className="text-slate-600 dark:text-slate-400 font-normal italic">"{summary.moodTrend}"</span>
          </p>
        </div>

        <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-850">
          <span className="text-[11px] text-slate-400 dark:text-slate-500 font-medium">
            Weekly Themes
          </span>
          <div className="flex flex-wrap items-center gap-1.5 mt-1">
            {summary.topThemes.map((themeName, idx) => (
              <span
                key={idx}
                className="text-[11px] px-2 py-0.5 rounded-md bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-medium shadow-2xs"
              >
                #{themeName}
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* Expanded Narrative & Takeaway */}
      {!isCollapsed && (
        <div className="space-y-4 pt-1 text-xs">
          <div className="p-4 rounded-2xl bg-indigo-50/50 dark:bg-indigo-950/30 text-slate-700 dark:text-slate-200 leading-relaxed font-serif">
            {summary.weekSummary}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {summary.highlights && summary.highlights.length > 0 && (
              <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-850 space-y-1.5">
                <span className="font-semibold text-slate-800 dark:text-slate-200 font-serif">
                  Key Moments & Wins
                </span>
                <ul className="space-y-1 text-slate-600 dark:text-slate-300">
                  {summary.highlights.map((h, i) => (
                    <li key={i} className="flex items-start gap-1.5">
                      <span className="text-indigo-600 dark:text-indigo-400">•</span>
                      <span>{h}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-850 flex flex-col justify-between gap-2">
              <div>
                <span className="font-semibold text-slate-800 dark:text-slate-200 font-serif">
                  Horizon Takeaway
                </span>
                <p className="text-slate-600 dark:text-slate-300 mt-1 italic leading-relaxed">
                  "{summary.keyTakeaway}"
                </p>
              </div>

              {onReflectOnPrompt && (
                <button
                  id="btn-weekly-reflect-takeaway"
                  type="button"
                  onClick={() => onReflectOnPrompt(`Reflecting on my weekly takeaway: "${summary.keyTakeaway}"`, 'weekly_takeaway')}
                  className="text-[11px] font-medium text-indigo-600 dark:text-indigo-400 hover:underline flex items-center gap-1 self-start cursor-pointer"
                >
                  <span>Reflect on this takeaway →</span>
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
