import React, { useState, useMemo } from 'react';
import { 
  Calendar, 
  Sparkles, 
  RefreshCw, 
  TrendingUp, 
  CheckCircle2, 
  Lightbulb, 
  Flame, 
  ChevronDown, 
  ChevronUp, 
  Feather, 
  Clock, 
  Layers,
  Heart
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
}

export const WeeklyReflectionCard: React.FC<WeeklyReflectionCardProps> = ({
  userId,
  entries,
  profileSummary,
  cachedWeeklySummary,
  onStartEntry,
  onReflectOnPrompt,
}) => {
  const [isGenerating, setIsGenerating] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isCollapsed, setIsCollapsed] = useState(false);

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

  // Compute active days in the week
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
    return (
      <div 
        id="card-weekly-reflection-empty"
        className="bg-white/60 dark:bg-slate-900/70 backdrop-blur-xl border border-dashed border-indigo-200/80 dark:border-indigo-800/60 rounded-3xl p-5 sm:p-6 shadow-xs transition-all"
      >
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-start gap-3.5">
            <div className="w-10 h-10 rounded-2xl bg-indigo-50 dark:bg-indigo-950/70 border border-indigo-200/80 dark:border-indigo-800/80 flex items-center justify-center text-indigo-600 dark:text-indigo-400 flex-shrink-0 shadow-inner">
              <Calendar className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-serif font-bold text-slate-800 dark:text-slate-100">
                  Your Week in Reflection
                </h3>
                <span className="text-[10px] font-mono uppercase tracking-wider px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 font-semibold border border-slate-200 dark:border-slate-700">
                  Past 7 Days
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-xl leading-relaxed">
                Not enough entries yet this week. Write at least one reflection to unlock your AI-powered weekly thematic summary, mood trajectory, and growth takeaways.
              </p>
            </div>
          </div>

          {onStartEntry && (
            <button
              id="btn-weekly-empty-write"
              type="button"
              onClick={onStartEntry}
              className="flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold bg-indigo-600 hover:bg-indigo-700 text-white shadow-sm shadow-indigo-600/20 transition-all flex-shrink-0 cursor-pointer"
            >
              <Feather className="w-3.5 h-3.5" />
              <span>Begin Today's Reflection</span>
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
        className="bg-white/70 dark:bg-slate-900/80 backdrop-blur-xl border border-indigo-200/80 dark:border-indigo-800/80 rounded-3xl p-5 sm:p-6 shadow-sm transition-all"
      >
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-start gap-3.5">
            <div className="w-10 h-10 rounded-2xl bg-amber-50 dark:bg-amber-950/60 border border-amber-200 dark:border-amber-800 flex items-center justify-center text-amber-600 dark:text-amber-400 flex-shrink-0 shadow-inner">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-serif font-bold text-slate-800 dark:text-slate-100">
                  Your Week in Reflection
                </h3>
                <span className="text-[11px] font-mono px-2.5 py-0.5 rounded-full bg-emerald-50 dark:bg-emerald-950/70 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 font-medium">
                  {recent7DayEntries.length} {recent7DayEntries.length === 1 ? 'entry' : 'entries'} • {activeDaysCount} active {activeDaysCount === 1 ? 'day' : 'days'}
                </span>
              </div>
              <p className="text-xs text-slate-600 dark:text-slate-300 mt-1 max-w-xl leading-relaxed">
                You have logged reflections across the past 7 days. Generate your friendly weekly recap to synthesize your emotional arc and highlight personal breakthroughs.
              </p>
            </div>
          </div>

          <button
            id="btn-generate-weekly-summary-initial"
            type="button"
            onClick={handleGenerateWeeklySummary}
            disabled={isGenerating}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-semibold bg-gradient-to-r from-indigo-600 to-indigo-700 hover:from-indigo-700 hover:to-indigo-800 text-white shadow-md shadow-indigo-600/25 transition-all flex-shrink-0 cursor-pointer disabled:opacity-50"
          >
            <Sparkles className="w-4 h-4" />
            <span>Generate Weekly Recap</span>
          </button>
        </div>

        {errorMessage && (
          <div className="mt-4 p-3 rounded-2xl bg-rose-50 dark:bg-rose-950/60 border border-rose-200 dark:border-rose-800 text-xs text-rose-700 dark:text-rose-300">
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
        className="bg-white/70 dark:bg-slate-900/80 backdrop-blur-xl border border-indigo-200 dark:border-indigo-800 rounded-3xl p-6 shadow-sm transition-all animate-pulse text-center space-y-3"
      >
        <div className="w-10 h-10 rounded-2xl bg-indigo-50 dark:bg-indigo-950/70 border border-indigo-200 dark:border-indigo-800 flex items-center justify-center text-indigo-600 dark:text-indigo-400 mx-auto">
          <RefreshCw className="w-5 h-5 animate-spin" />
        </div>
        <h3 className="text-sm font-serif font-bold text-slate-800 dark:text-slate-100">
          Synthesizing Your Week in Reflection...
        </h3>
        <p className="text-xs text-slate-500 dark:text-slate-400 max-w-md mx-auto">
          Reviewing {recent7DayEntries.length} reflections from the past 7 days, discovering recurring themes, and framing your weekly growth narrative.
        </p>
      </div>
    );
  }

  // State D: Render Cached Weekly Summary
  const summary = cachedWeeklySummary!;
  const formattedGenTime = new Date(summary.generatedAt).toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });

  return (
    <div 
      id="card-weekly-reflection"
      className="bg-white/75 dark:bg-slate-900/85 backdrop-blur-xl border border-white/80 dark:border-white/10 rounded-3xl p-5 sm:p-6 shadow-md transition-all space-y-4 relative overflow-hidden"
    >
      {/* Decorative ambient gradient backdrop */}
      <div className="absolute top-0 right-0 w-80 h-80 bg-gradient-to-br from-indigo-200/20 via-amber-100/10 to-transparent dark:from-indigo-950/30 dark:via-transparent rounded-full blur-2xl pointer-events-none -z-10" />

      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-200/60 dark:border-slate-800/80 pb-4">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-2xl bg-gradient-to-br from-indigo-500 to-indigo-700 text-white flex items-center justify-center shadow-sm shadow-indigo-600/30">
            <Sparkles className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="text-base font-serif font-bold text-slate-900 dark:text-white">
                Your Week in Reflection
              </h3>
              <span className="text-[11px] font-mono px-2.5 py-0.5 rounded-full bg-indigo-50 dark:bg-indigo-950/70 text-indigo-700 dark:text-indigo-300 border border-indigo-200/80 dark:border-indigo-800 font-semibold">
                {summary.weekRange}
              </span>
            </div>
            <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              <span>{summary.entryCount} {summary.entryCount === 1 ? 'reflection' : 'reflections'}</span>
              <span>•</span>
              <span>{summary.daysActive} active {summary.daysActive === 1 ? 'day' : 'days'}</span>
              <span>•</span>
              <span className="text-[11px] text-slate-400 dark:text-slate-500 font-mono">
                Cached: {formattedGenTime}
              </span>
            </div>
          </div>
        </div>

        {/* Header Action Buttons */}
        <div className="flex items-center gap-2 self-end sm:self-auto">
          <button
            id="btn-refresh-weekly-summary"
            type="button"
            onClick={handleGenerateWeeklySummary}
            disabled={isGenerating}
            title="Regenerate weekly recap with latest reflections"
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium bg-slate-100 dark:bg-slate-800 hover:bg-indigo-50 dark:hover:bg-indigo-950/70 text-slate-700 dark:text-slate-300 hover:text-indigo-600 dark:hover:text-indigo-300 border border-slate-200/70 dark:border-slate-700 transition-all cursor-pointer shadow-2xs"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isGenerating ? 'animate-spin' : ''}`} />
            <span>Refresh my week</span>
          </button>

          <button
            id="btn-toggle-weekly-collapse"
            type="button"
            onClick={() => setIsCollapsed(!isCollapsed)}
            className="p-1.5 rounded-xl text-slate-400 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
            title={isCollapsed ? 'Expand weekly recap' : 'Collapse weekly recap'}
          >
            {isCollapsed ? <ChevronDown className="w-4 h-4" /> : <ChevronUp className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {errorMessage && (
        <div className="p-3 rounded-2xl bg-rose-50 dark:bg-rose-950/60 border border-rose-200 dark:border-rose-800 text-xs text-rose-700 dark:text-rose-300">
          {errorMessage}
        </div>
      )}

      {/* Mood Arc & Themes Summary Strip */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-3">
        {/* Dominant Mood & Trajectory */}
        <div className="md:col-span-6 p-3.5 rounded-2xl bg-slate-50/80 dark:bg-slate-850/60 border border-slate-200/60 dark:border-slate-800/80 flex items-start gap-3">
          <div className="w-8 h-8 rounded-xl bg-amber-50 dark:bg-amber-950/70 border border-amber-200 dark:border-amber-800/80 flex items-center justify-center text-amber-600 dark:text-amber-400 flex-shrink-0">
            <TrendingUp className="w-4 h-4" />
          </div>
          <div>
            <span className="text-[10px] font-mono uppercase tracking-wider text-slate-500 dark:text-slate-400 font-semibold">
              Weekly Mood Trajectory
            </span>
            <p className="text-xs font-semibold text-slate-800 dark:text-slate-100 mt-0.5">
              {summary.dominantMood}
            </p>
            <p className="text-xs text-slate-600 dark:text-slate-400 italic mt-0.5 leading-relaxed">
              "{summary.moodTrend}"
            </p>
          </div>
        </div>

        {/* Top Weekly Themes */}
        <div className="md:col-span-6 p-3.5 rounded-2xl bg-slate-50/80 dark:bg-slate-850/60 border border-slate-200/60 dark:border-slate-800/80 flex items-start gap-3">
          <div className="w-8 h-8 rounded-xl bg-indigo-50 dark:bg-indigo-950/70 border border-indigo-200 dark:border-indigo-800/80 flex items-center justify-center text-indigo-600 dark:text-indigo-400 flex-shrink-0">
            <Layers className="w-4 h-4" />
          </div>
          <div className="flex-1 min-w-0">
            <span className="text-[10px] font-mono uppercase tracking-wider text-slate-500 dark:text-slate-400 font-semibold">
              Top Weekly Themes
            </span>
            <div className="flex flex-wrap items-center gap-1.5 mt-1.5">
              {summary.topThemes.map((themeName, idx) => (
                <span
                  key={idx}
                  className="text-[11px] font-medium px-2.5 py-0.5 rounded-full bg-white dark:bg-slate-800 text-indigo-700 dark:text-indigo-300 border border-indigo-100 dark:border-indigo-900 shadow-2xs"
                >
                  #{themeName}
                </span>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Expanded Narrative & Takeaways */}
      {!isCollapsed && (
        <div className="space-y-4 pt-1">
          {/* Narrative Paragraph */}
          <div className="p-4 rounded-2xl bg-indigo-50/40 dark:bg-indigo-950/30 border border-indigo-100/80 dark:border-indigo-900/50">
            <p className="text-xs sm:text-sm text-slate-700 dark:text-slate-200 leading-relaxed font-serif whitespace-pre-line">
              {summary.weekSummary}
            </p>
          </div>

          {/* Highlights & Key Takeaway Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
            {/* Weekly Highlights / Moments */}
            {summary.highlights && summary.highlights.length > 0 && (
              <div className="p-3.5 rounded-2xl bg-white/60 dark:bg-slate-850/50 border border-slate-200/70 dark:border-slate-800/80 space-y-2">
                <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-700 dark:text-slate-200 font-serif">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                  <span>Notable Moments & Wins</span>
                </div>
                <ul className="space-y-1.5">
                  {summary.highlights.map((h, i) => (
                    <li key={i} className="text-xs text-slate-600 dark:text-slate-300 flex items-start gap-2 leading-relaxed">
                      <span className="text-emerald-500 font-bold">•</span>
                      <span>{h}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Key Takeaway & Prompt for Upcoming Week */}
            <div className={`p-3.5 rounded-2xl bg-amber-50/50 dark:bg-amber-950/30 border border-amber-200/80 dark:border-amber-900/50 flex flex-col justify-between gap-2.5 ${!summary.highlights?.length ? 'md:col-span-2' : ''}`}>
              <div className="space-y-1.5">
                <div className="flex items-center gap-1.5 text-xs font-semibold text-amber-900 dark:text-amber-300 font-serif">
                  <Lightbulb className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
                  <span>Horizon Takeaway for the Week Ahead</span>
                </div>
                <p className="text-xs text-amber-950 dark:text-amber-200 font-sans leading-relaxed italic">
                  "{summary.keyTakeaway}"
                </p>
              </div>

              {onReflectOnPrompt && (
                <button
                  id="btn-weekly-reflect-takeaway"
                  type="button"
                  onClick={() => onReflectOnPrompt(`Reflecting on my weekly takeaway: "${summary.keyTakeaway}"`, 'weekly_takeaway')}
                  className="text-[11px] font-medium text-amber-800 dark:text-amber-300 hover:text-amber-950 dark:hover:text-white flex items-center gap-1 self-start transition-colors cursor-pointer"
                >
                  <span>Reflect on this takeaway in today's entry →</span>
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
