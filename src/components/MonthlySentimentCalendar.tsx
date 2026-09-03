import React, { useState, useMemo } from 'react';
import { 
  ChevronLeft, 
  ChevronRight, 
  Calendar as CalendarIcon, 
  Sparkles, 
  ArrowUpRight, 
  Smile, 
  Heart,
  TrendingUp,
  BookOpen,
  Info
} from 'lucide-react';
import { JournalEntry, MoodType, EntrySentiment } from '../types';
import { ConfidenceTooltip } from './ConfidenceTooltip';

interface MonthlySentimentCalendarProps {
  entries: JournalEntry[];
  onNavigateToEntry?: (entryId: string) => void;
  onStartWriting?: () => void;
}

const MOOD_FALLBACK_SCORES: Record<MoodType, number> = {
  peaceful: 85,
  reflective: 75,
  optimistic: 90,
  grounded: 85,
  seeking_clarity: 70,
  anxious: 45,
  fatigued: 40,
  energized: 88,
};

const MOOD_EMOJIS: Record<string, string> = {
  reflective: '🌌',
  peaceful: '🍃',
  optimistic: '☀️',
  grounded: '⛰️',
  seeking_clarity: '🧭',
  anxious: '🌧️',
  fatigued: '🌙',
  energized: '⚡',
};

function getEntryScore(entry: JournalEntry): number {
  if (typeof entry.sentiment?.score === 'number' && !isNaN(entry.sentiment.score)) {
    return Math.max(0, Math.min(100, Math.round(entry.sentiment.score)));
  }
  return entry.mood ? (MOOD_FALLBACK_SCORES[entry.mood] ?? 75) : 75;
}

function formatDateKey(dateObj: Date): string {
  const y = dateObj.getFullYear();
  const m = String(dateObj.getMonth() + 1).padStart(2, '0');
  const d = String(dateObj.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export const MonthlySentimentCalendar: React.FC<MonthlySentimentCalendarProps> = ({
  entries,
  onNavigateToEntry,
  onStartWriting,
}) => {
  const [currentMonth, setCurrentMonth] = useState<Date>(() => new Date());
  const [selectedDateKey, setSelectedDateKey] = useState<string | null>(null);

  const year = currentMonth.getFullYear();
  const month = currentMonth.getMonth(); // 0-indexed

  // Navigation handlers
  const handlePrevMonth = () => {
    setCurrentMonth(new Date(year, month - 1, 1));
    setSelectedDateKey(null);
  };

  const handleNextMonth = () => {
    setCurrentMonth(new Date(year, month + 1, 1));
    setSelectedDateKey(null);
  };

  const handleCurrentMonth = () => {
    setCurrentMonth(new Date());
    setSelectedDateKey(formatDateKey(new Date()));
  };

  // Group entries by dateKey (YYYY-MM-DD)
  const entriesByDate = useMemo(() => {
    const map = new Map<string, JournalEntry[]>();
    entries.forEach((e) => {
      if (!e.createdAt) return;
      const d = new Date(e.createdAt);
      const key = formatDateKey(d);
      if (!map.has(key)) {
        map.set(key, []);
      }
      map.get(key)!.push(e);
    });
    return map;
  }, [entries]);

  // Calculate daily aggregates for the selected month
  const dailyStats = useMemo(() => {
    const statsMap = new Map<
      string,
      {
        entries: JournalEntry[];
        avgScore: number;
        dominantEmoji: string;
        dominantLabel: string;
        count: number;
      }
    >();

    entriesByDate.forEach((dayEntries, dateKey) => {
      if (dayEntries.length === 0) return;
      
      let totalScore = 0;
      dayEntries.forEach((e) => {
        totalScore += getEntryScore(e);
      });
      const avgScore = Math.round(totalScore / dayEntries.length);

      // Determine primary emoji and label
      const latestEntry = dayEntries[dayEntries.length - 1];
      const emoji =
        latestEntry.sentiment?.emoji ||
        (latestEntry.mood ? MOOD_EMOJIS[latestEntry.mood] : '📝');
      const label =
        latestEntry.sentiment?.label ||
        (avgScore >= 80
          ? 'Radiant'
          : avgScore >= 65
          ? 'Peaceful'
          : avgScore >= 50
          ? 'Balanced'
          : avgScore >= 35
          ? 'Processing'
          : 'Tender');

      statsMap.set(dateKey, {
        entries: dayEntries,
        avgScore,
        dominantEmoji: emoji,
        dominantLabel: label,
        count: dayEntries.length,
      });
    });

    return statsMap;
  }, [entriesByDate]);

  // Monthly summary metrics
  const monthSummary = useMemo(() => {
    let dayCount = 0;
    let totalScoreSum = 0;
    let totalEntries = 0;

    // Check days in current month
    const daysInThisMonth = new Date(year, month + 1, 0).getDate();
    for (let day = 1; day <= daysInThisMonth; day++) {
      const dateKey = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
      const stats = dailyStats.get(dateKey);
      if (stats) {
        dayCount++;
        totalScoreSum += stats.avgScore;
        totalEntries += stats.count;
      }
    }

    const monthAvgScore = dayCount > 0 ? Math.round(totalScoreSum / dayCount) : null;

    return {
      dayCount,
      totalEntries,
      monthAvgScore,
      daysInThisMonth,
    };
  }, [dailyStats, year, month]);

  // Build calendar matrix
  const firstDayOfMonth = new Date(year, month, 1);
  const startDayOfWeek = firstDayOfMonth.getDay(); // 0 = Sun
  const daysInMonthCount = new Date(year, month + 1, 0).getDate();
  const prevMonthDaysCount = new Date(year, month, 0).getDate();

  const calendarCells = useMemo(() => {
    const cells: Array<{
      dateKey: string;
      dayNum: number;
      isCurrentMonth: boolean;
      dateObj: Date;
    }> = [];

    // Leading days from previous month
    for (let i = startDayOfWeek - 1; i >= 0; i--) {
      const pDay = prevMonthDaysCount - i;
      const prevDate = new Date(year, month - 1, pDay);
      cells.push({
        dateKey: formatDateKey(prevDate),
        dayNum: pDay,
        isCurrentMonth: false,
        dateObj: prevDate,
      });
    }

    // Days of current month
    for (let d = 1; d <= daysInMonthCount; d++) {
      const currDate = new Date(year, month, d);
      cells.push({
        dateKey: formatDateKey(currDate),
        dayNum: d,
        isCurrentMonth: true,
        dateObj: currDate,
      });
    }

    // Trailing days for next month to complete row
    const remainingCells = (7 - (cells.length % 7)) % 7;
    for (let n = 1; n <= remainingCells; n++) {
      const nextDate = new Date(year, month + 1, n);
      cells.push({
        dateKey: formatDateKey(nextDate),
        dayNum: n,
        isCurrentMonth: false,
        dateObj: nextDate,
      });
    }

    return cells;
  }, [year, month, startDayOfWeek, daysInMonthCount, prevMonthDaysCount]);

  const todayKey = formatDateKey(new Date());

  // Sentiment category colors
  const getSentimentStyle = (score: number) => {
    if (score >= 80) {
      return {
        bg: 'bg-emerald-100/90 hover:bg-emerald-200/90 dark:bg-emerald-950/70 dark:hover:bg-emerald-900/80',
        border: 'border-emerald-300 dark:border-emerald-700/80',
        text: 'text-emerald-950 dark:text-emerald-100',
        badgeBg: 'bg-emerald-200/90 dark:bg-emerald-900/90 text-emerald-900 dark:text-emerald-100',
        category: 'Radiant',
      };
    }
    if (score >= 65) {
      return {
        bg: 'bg-indigo-100/90 hover:bg-indigo-200/90 dark:bg-indigo-950/70 dark:hover:bg-indigo-900/80',
        border: 'border-indigo-300 dark:border-indigo-700/80',
        text: 'text-indigo-950 dark:text-indigo-100',
        badgeBg: 'bg-indigo-200/90 dark:bg-indigo-900/90 text-indigo-900 dark:text-indigo-100',
        category: 'Peaceful',
      };
    }
    if (score >= 50) {
      return {
        bg: 'bg-teal-100/90 hover:bg-teal-200/90 dark:bg-teal-950/70 dark:hover:bg-teal-900/80',
        border: 'border-teal-300 dark:border-teal-700/80',
        text: 'text-teal-950 dark:text-teal-100',
        badgeBg: 'bg-teal-200/90 dark:bg-teal-900/90 text-teal-900 dark:text-teal-100',
        category: 'Balanced',
      };
    }
    if (score >= 35) {
      return {
        bg: 'bg-amber-100/90 hover:bg-amber-200/90 dark:bg-amber-950/70 dark:hover:bg-amber-900/80',
        border: 'border-amber-300 dark:border-amber-700/80',
        text: 'text-amber-950 dark:text-amber-100',
        badgeBg: 'bg-amber-200/90 dark:bg-amber-900/90 text-amber-900 dark:text-amber-100',
        category: 'Processing',
      };
    }
    return {
      bg: 'bg-rose-100/90 hover:bg-rose-200/90 dark:bg-rose-950/70 dark:hover:bg-rose-900/80',
      border: 'border-rose-300 dark:border-rose-700/80',
      text: 'text-rose-950 dark:text-rose-100',
      badgeBg: 'bg-rose-200/90 dark:bg-rose-900/90 text-rose-900 dark:text-rose-100',
      category: 'Tender',
    };
  };

  const selectedDayData = selectedDateKey ? dailyStats.get(selectedDateKey) : null;
  const selectedDateObj = selectedDateKey ? new Date(selectedDateKey + 'T00:00:00') : null;

  const monthLabel = currentMonth.toLocaleString('default', { month: 'long', year: 'numeric' });

  return (
    <div id="monthly-sentiment-calendar-card" className="bg-white/75 dark:bg-slate-900/75 backdrop-blur-2xl border border-white/80 dark:border-white/10 rounded-3xl p-5 sm:p-7 space-y-6 shadow-sm transition-all">
      
      {/* Calendar Header & Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200/60 dark:border-slate-800/60">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-indigo-50 dark:bg-indigo-950/80 border border-indigo-200/60 dark:border-indigo-800/60 flex items-center justify-center text-indigo-600 dark:text-indigo-300">
              <CalendarIcon className="w-4 h-4" />
            </div>
            <h3 className="text-base sm:text-lg font-serif font-semibold text-slate-900 dark:text-white flex items-center gap-2">
              <span>Monthly Sentiment Calendar</span>
              <ConfidenceTooltip explanation="Average emotional score calculated from your journal entries for each calendar day." />
            </h3>
          </div>
          <p className="text-xs text-slate-600 dark:text-slate-300 pl-10">
            Daily average emotional harmony mapped across the month.
          </p>
        </div>

        {/* Month Selector Controls */}
        <div className="flex items-center gap-2 self-start sm:self-auto">
          <button
            onClick={handlePrevMonth}
            className="p-2 rounded-xl bg-slate-100/80 dark:bg-slate-800/80 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 transition-colors cursor-pointer border border-slate-200/60 dark:border-slate-700/60"
            title="Previous Month"
            aria-label="Previous Month"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>

          <span className="text-xs sm:text-sm font-semibold font-serif text-slate-800 dark:text-slate-200 px-3 py-1.5 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200/60 dark:border-slate-700/60 min-w-[140px] text-center">
            {monthLabel}
          </span>

          <button
            onClick={handleNextMonth}
            className="p-2 rounded-xl bg-slate-100/80 dark:bg-slate-800/80 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 transition-colors cursor-pointer border border-slate-200/60 dark:border-slate-700/60"
            title="Next Month"
            aria-label="Next Month"
          >
            <ChevronRight className="w-4 h-4" />
          </button>

          <button
            onClick={handleCurrentMonth}
            className="px-3 py-1.5 rounded-xl text-xs font-semibold bg-indigo-50 dark:bg-indigo-950/80 hover:bg-indigo-100 dark:hover:bg-indigo-900 text-indigo-700 dark:text-indigo-300 border border-indigo-200/80 dark:border-indigo-800/80 transition-colors cursor-pointer"
            title="Jump to Today"
          >
            Today
          </button>
        </div>
      </div>

      {/* Monthly Summary Strip */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        <div className="p-3.5 rounded-2xl bg-slate-50/80 dark:bg-slate-800/50 border border-slate-200/60 dark:border-slate-800/60 space-y-1">
          <span className="text-[11px] font-medium text-slate-500 dark:text-slate-400">Reflections Logged</span>
          <div className="text-sm sm:text-base font-serif font-bold text-slate-900 dark:text-white flex items-baseline gap-1.5">
            <span>{monthSummary.totalEntries}</span>
            <span className="text-[11px] font-sans font-normal text-slate-500 dark:text-slate-400">
              ({monthSummary.dayCount} / {monthSummary.daysInThisMonth} days)
            </span>
          </div>
        </div>

        <div className="p-3.5 rounded-2xl bg-indigo-50/60 dark:bg-indigo-950/40 border border-indigo-200/50 dark:border-indigo-900/50 space-y-1">
          <span className="text-[11px] font-medium text-indigo-600/80 dark:text-indigo-300">Monthly Avg Sentiment</span>
          <div className="text-sm sm:text-base font-serif font-bold text-indigo-950 dark:text-indigo-200 flex items-center gap-1.5">
            {monthSummary.monthAvgScore !== null ? (
              <>
                <span>{monthSummary.monthAvgScore}%</span>
                <span className="text-xs font-sans font-medium opacity-80">
                  • {getSentimentStyle(monthSummary.monthAvgScore).category}
                </span>
              </>
            ) : (
              <span className="text-xs font-sans font-normal text-slate-400">No reflections this month</span>
            )}
          </div>
        </div>

        <div className="col-span-2 sm:col-span-1 p-3.5 rounded-2xl bg-emerald-50/60 dark:bg-emerald-950/40 border border-emerald-200/50 dark:border-emerald-900/50 space-y-1 flex flex-col justify-center">
          <span className="text-[11px] font-medium text-emerald-700/80 dark:text-emerald-300">Active Consistency</span>
          <div className="text-xs sm:text-sm font-semibold text-emerald-900 dark:text-emerald-200">
            {monthSummary.daysInThisMonth > 0 
              ? `${Math.round((monthSummary.dayCount / monthSummary.daysInThisMonth) * 100)}% of month active`
              : '0%'}
          </div>
        </div>
      </div>

      {/* Calendar Grid Container */}
      <div className="space-y-2">
        {/* Days of Week Header */}
        <div className="grid grid-cols-7 text-center gap-1.5">
          {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((dayName) => (
            <div key={dayName} className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 py-1">
              {dayName}
            </div>
          ))}
        </div>

        {/* Calendar Day Cells */}
        <div className="grid grid-cols-7 gap-1.5">
          {calendarCells.map((cell) => {
            const stats = cell.isCurrentMonth ? dailyStats.get(cell.dateKey) : null;
            const isToday = cell.dateKey === todayKey;
            const isSelected = cell.dateKey === selectedDateKey;

            if (!cell.isCurrentMonth) {
              return (
                <div
                  key={cell.dateKey}
                  className="min-h-[68px] sm:min-h-[82px] p-1.5 sm:p-2 rounded-2xl bg-slate-50/30 dark:bg-slate-900/20 border border-dashed border-slate-200/40 dark:border-slate-800/40 opacity-40 select-none"
                >
                  <span className="text-xs font-medium text-slate-400 dark:text-slate-600">
                    {cell.dayNum}
                  </span>
                </div>
              );
            }

            const style = stats ? getSentimentStyle(stats.avgScore) : null;

            return (
              <button
                key={cell.dateKey}
                onClick={() => setSelectedDateKey(cell.dateKey)}
                className={`min-h-[68px] sm:min-h-[82px] p-1.5 sm:p-2 rounded-2xl border text-left flex flex-col justify-between transition-all duration-200 cursor-pointer relative group ${
                  isSelected
                    ? 'ring-2 ring-indigo-600 dark:ring-indigo-400 shadow-md scale-[1.02] z-10'
                    : 'hover:scale-[1.01]'
                } ${
                  style
                    ? `${style.bg} ${style.border} ${style.text}`
                    : 'bg-slate-50/70 dark:bg-slate-800/30 border-slate-200/60 dark:border-slate-800/40 text-slate-600 dark:text-slate-400 hover:bg-slate-100/80 dark:hover:bg-slate-800/60'
                }`}
                title={
                  stats
                    ? `${cell.dateKey}: ${stats.count} reflection(s), Avg Sentiment ${stats.avgScore}% (${stats.dominantLabel})`
                    : `${cell.dateKey}: No reflections logged`
                }
              >
                {/* Top Row: Day Number & Today Indicator */}
                <div className="flex items-center justify-between w-full">
                  <span
                    className={`text-xs font-bold font-serif ${
                      isToday
                        ? 'w-5 h-5 rounded-full bg-indigo-600 text-white flex items-center justify-center text-[10px] shadow-2xs'
                        : ''
                    }`}
                  >
                    {cell.dayNum}
                  </span>

                  {stats && (
                    <span className="text-sm sm:text-base leading-none" aria-hidden="true">
                      {stats.dominantEmoji}
                    </span>
                  )}
                </div>

                {/* Bottom Row: Score pill or empty state */}
                {stats ? (
                  <div className="space-y-0.5">
                    <div className="flex items-center justify-between">
                      <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-md ${style?.badgeBg} leading-tight`}>
                        {stats.avgScore}%
                      </span>
                      {stats.count > 1 && (
                        <span className="text-[9px] font-medium opacity-75 hidden sm:inline">
                          {stats.count}x
                        </span>
                      )}
                    </div>
                  </div>
                ) : (
                  <div className="text-[9px] opacity-40 font-mono text-center sm:text-left">
                    —
                  </div>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Color Scale Legend */}
      <div className="pt-2 border-t border-slate-200/60 dark:border-slate-800/60 flex flex-wrap items-center justify-between gap-3 text-xs text-slate-600 dark:text-slate-300">
        <span className="font-medium text-slate-500 dark:text-slate-400">Sentiment Legend:</span>
        <div className="flex flex-wrap items-center gap-2 text-[11px]">
          <div className="flex items-center gap-1 px-2 py-0.5 rounded-lg bg-rose-100 dark:bg-rose-950/80 border border-rose-300 dark:border-rose-800 text-rose-900 dark:text-rose-200">
            <span className="w-2 h-2 rounded-full bg-rose-500" />
            <span>0-34% Tender</span>
          </div>
          <div className="flex items-center gap-1 px-2 py-0.5 rounded-lg bg-amber-100 dark:bg-amber-950/80 border border-amber-300 dark:border-amber-800 text-amber-900 dark:text-amber-200">
            <span className="w-2 h-2 rounded-full bg-amber-500" />
            <span>35-49% Processing</span>
          </div>
          <div className="flex items-center gap-1 px-2 py-0.5 rounded-lg bg-teal-100 dark:bg-teal-950/80 border border-teal-300 dark:border-teal-800 text-teal-900 dark:text-teal-200">
            <span className="w-2 h-2 rounded-full bg-teal-500" />
            <span>50-64% Balanced</span>
          </div>
          <div className="flex items-center gap-1 px-2 py-0.5 rounded-lg bg-indigo-100 dark:bg-indigo-950/80 border border-indigo-300 dark:border-indigo-800 text-indigo-900 dark:text-indigo-200">
            <span className="w-2 h-2 rounded-full bg-indigo-500" />
            <span>65-79% Peaceful</span>
          </div>
          <div className="flex items-center gap-1 px-2 py-0.5 rounded-lg bg-emerald-100 dark:bg-emerald-950/80 border border-emerald-300 dark:border-emerald-800 text-emerald-900 dark:text-emerald-200">
            <span className="w-2 h-2 rounded-full bg-emerald-500" />
            <span>80-100% Radiant</span>
          </div>
        </div>
      </div>

      {/* Selected Day Details Card */}
      {selectedDateKey && (
        <div className="p-4 sm:p-5 rounded-2xl bg-indigo-50/70 dark:bg-indigo-950/60 border border-indigo-200/80 dark:border-indigo-800/80 space-y-3.5 animate-fade-in shadow-xs">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-lg" aria-hidden="true">
                {selectedDayData ? selectedDayData.dominantEmoji : '📅'}
              </span>
              <div>
                <h4 className="text-sm font-serif font-bold text-slate-900 dark:text-white">
                  {selectedDateObj?.toLocaleDateString('default', {
                    weekday: 'long',
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric',
                  })}
                </h4>
                {selectedDayData ? (
                  <p className="text-xs text-indigo-700 dark:text-indigo-300 font-medium">
                    Average Sentiment Score: {selectedDayData.avgScore}% • {selectedDayData.dominantLabel}
                  </p>
                ) : (
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    No reflections recorded on this date.
                  </p>
                )}
              </div>
            </div>

            <button
              onClick={() => setSelectedDateKey(null)}
              className="text-xs text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 cursor-pointer"
            >
              Close
            </button>
          </div>

          {/* Reflections List for Selected Day */}
          {selectedDayData && selectedDayData.entries.length > 0 ? (
            <div className="space-y-2 pt-1">
              <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                Logged Reflections ({selectedDayData.entries.length}):
              </span>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {selectedDayData.entries.map((entry) => {
                  const score = getEntryScore(entry);
                  const emoji =
                    entry.sentiment?.emoji ||
                    (entry.mood ? MOOD_EMOJIS[entry.mood] : '📝');
                  return (
                    <div
                      key={entry.id}
                      className="p-3 rounded-xl bg-white/80 dark:bg-slate-900/80 border border-white/90 dark:border-white/10 flex items-center justify-between gap-2 shadow-2xs hover:shadow-xs transition-shadow"
                    >
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1.5">
                          <span>{emoji}</span>
                          <span className="text-xs font-semibold text-slate-900 dark:text-white truncate">
                            {entry.title || 'Untitled Reflection'}
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate mt-0.5">
                          {entry.content?.slice(0, 75) || 'No text content'}...
                        </p>
                      </div>

                      <div className="flex flex-col items-end gap-1 flex-shrink-0">
                        <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-indigo-100 dark:bg-indigo-900/80 text-indigo-800 dark:text-indigo-200">
                          {score}%
                        </span>
                        {onNavigateToEntry && (
                          <button
                            onClick={() => onNavigateToEntry(entry.id)}
                            className="inline-flex items-center gap-0.5 text-[10px] font-semibold text-indigo-600 dark:text-indigo-300 hover:underline cursor-pointer"
                          >
                            <span>View</span>
                            <ArrowUpRight className="w-3 h-3" />
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ) : (
            <div className="text-center py-3 space-y-2">
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Would you like to write a reflection for this day?
              </p>
              {onStartWriting && (
                <button
                  onClick={onStartWriting}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-indigo-600 hover:bg-indigo-700 text-white shadow-xs cursor-pointer transition-colors"
                >
                  <BookOpen className="w-3.5 h-3.5" />
                  <span>Start Writing</span>
                </button>
              )}
            </div>
          )}
        </div>
      )}

    </div>
  );
};
