import React, { useMemo, useState } from 'react';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ReferenceLine,
  Area,
  ComposedChart
} from 'recharts';
import { 
  TrendingUp, 
  TrendingDown, 
  Minus, 
  Calendar, 
  Sparkles, 
  ArrowUpRight, 
  PenLine,
  HelpCircle
} from 'lucide-react';
import { JournalEntry, MoodType, EntrySentiment } from '../types';

interface SentimentTrendChartProps {
  entries: JournalEntry[];
  onNavigateToEntry?: (entryId: string) => void;
  onStartWriting?: () => void;
}

const MOOD_FALLBACK_MAP: Record<MoodType, EntrySentiment> = {
  peaceful: { label: 'Quiet Peace', emoji: '🌿', color: 'emerald', score: 85 },
  reflective: { label: 'Deeply Introspective', emoji: '🌌', color: 'indigo', score: 75 },
  optimistic: { label: 'Heartfelt Optimism', emoji: '☀️', color: 'amber', score: 90 },
  grounded: { label: 'Solid & Centered', emoji: '⛰️', color: 'teal', score: 85 },
  seeking_clarity: { label: 'Seeking Perspective', emoji: '🧭', color: 'sky', score: 70 },
  anxious: { label: 'Tender & Processing', emoji: '🌧️', color: 'rose', score: 45 },
  fatigued: { label: 'Resting & Restoring', emoji: '🌙', color: 'purple', score: 40 },
  energized: { label: 'Energized & Focused', emoji: '⚡', color: 'teal', score: 88 },
};

function getEntryScore(entry: JournalEntry): number {
  if (typeof entry.sentiment?.score === 'number' && !isNaN(entry.sentiment.score)) {
    return Math.max(0, Math.min(100, Math.round(entry.sentiment.score)));
  }
  const fallback = entry.mood ? MOOD_FALLBACK_MAP[entry.mood] : null;
  return fallback ? fallback.score : 75;
}

function getEntrySentimentLabel(entry: JournalEntry): { label: string; emoji: string } {
  if (entry.sentiment?.label) {
    return {
      label: entry.sentiment.label,
      emoji: entry.sentiment.emoji || '✨',
    };
  }
  const fallback = entry.mood ? MOOD_FALLBACK_MAP[entry.mood] : null;
  return fallback 
    ? { label: fallback.label, emoji: fallback.emoji }
    : { label: 'Reflective', emoji: '🧘' };
}

interface DayDataPoint {
  dateKey: string; // YYYY-MM-DD
  displayDate: string; // e.g. "Sep 02"
  fullDate: string; // e.g. "Tuesday, Sep 2"
  score: number; // 0 - 100 average
  rawEntries: JournalEntry[];
  dominantSentiment: string;
  dominantEmoji: string;
  entryCount: number;
}

export const SentimentTrendChart: React.FC<SentimentTrendChartProps> = ({
  entries,
  onNavigateToEntry,
  onStartWriting,
}) => {
  const [viewMode, setViewMode] = useState<'active_only' | 'full_30_days'>('active_only');
  const [selectedDayKey, setSelectedDayKey] = useState<string | null>(null);

  // 1. Filter entries within the last 30 days
  const {
    last30DaysEntries,
    trendData,
    avgScore,
    trendSlope,
    peakEntry,
    lowestEntry,
    activeDaysCount,
  } = useMemo(() => {
    const now = new Date();
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 29); // include today + past 29 days = 30 days
    thirtyDaysAgo.setHours(0, 0, 0, 0);

    const filtered = entries.filter((e) => {
      if (!e.createdAt) return false;
      const d = new Date(e.createdAt);
      return d >= thirtyDaysAgo && d <= now;
    });

    // Group entries by local calendar day (YYYY-MM-DD)
    const dayMap = new Map<string, JournalEntry[]>();
    filtered.forEach((entry) => {
      const d = new Date(entry.createdAt);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
      const list = dayMap.get(key) || [];
      list.push(entry);
      dayMap.set(key, list);
    });

    // Build timeline points
    const activePoints: DayDataPoint[] = [];
    const fullPoints: (DayDataPoint | { dateKey: string; displayDate: string; fullDate: string; score: null; rawEntries: []; entryCount: 0 })[] = [];

    let totalScoreSum = 0;
    let totalScoreCount = 0;
    let peak: { score: number; entry: JournalEntry; dateStr: string } | null = null;
    let lowest: { score: number; entry: JournalEntry; dateStr: string } | null = null;

    // Iterate through all 30 days in chronological sequence
    for (let i = 0; i < 30; i++) {
      const curDate = new Date(thirtyDaysAgo);
      curDate.setDate(thirtyDaysAgo.getDate() + i);
      const key = `${curDate.getFullYear()}-${String(curDate.getMonth() + 1).padStart(2, '0')}-${String(curDate.getDate()).padStart(2, '0')}`;
      
      const displayDate = curDate.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
      const fullDate = curDate.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' });

      const dayEntries = dayMap.get(key);
      if (dayEntries && dayEntries.length > 0) {
        // Average score for this day
        const scores = dayEntries.map(getEntryScore);
        const dayAvg = Math.round(scores.reduce((a, b) => a + b, 0) / scores.length);
        
        // Track overall sum
        totalScoreSum += dayAvg;
        totalScoreCount += 1;

        // Dominant sentiment for day
        const lastEntry = dayEntries[dayEntries.length - 1];
        const { label, emoji } = getEntrySentimentLabel(lastEntry);

        dayEntries.forEach((e) => {
          const s = getEntryScore(e);
          if (!peak || s > peak.score) {
            peak = { score: s, entry: e, dateStr: displayDate };
          }
          if (!lowest || s < lowest.score) {
            lowest = { score: s, entry: e, dateStr: displayDate };
          }
        });

        const point: DayDataPoint = {
          dateKey: key,
          displayDate,
          fullDate,
          score: dayAvg,
          rawEntries: dayEntries,
          dominantSentiment: label,
          dominantEmoji: emoji,
          entryCount: dayEntries.length,
        };

        activePoints.push(point);
        fullPoints.push(point);
      } else {
        fullPoints.push({
          dateKey: key,
          displayDate,
          fullDate,
          score: null,
          rawEntries: [],
          entryCount: 0,
        });
      }
    }

    const calculatedAvg = totalScoreCount > 0 ? Math.round(totalScoreSum / totalScoreCount) : 0;

    // Calculate trend direction comparing first half vs second half of the 30-day window
    let slope = 0;
    if (activePoints.length >= 2) {
      const midIndex = Math.floor(activePoints.length / 2);
      const firstHalf = activePoints.slice(0, midIndex);
      const secondHalf = activePoints.slice(midIndex);

      const avg1 = firstHalf.reduce((a, b) => a + b.score, 0) / (firstHalf.length || 1);
      const avg2 = secondHalf.reduce((a, b) => a + b.score, 0) / (secondHalf.length || 1);
      slope = Math.round(avg2 - avg1);
    }

    return {
      last30DaysEntries: filtered,
      trendData: viewMode === 'active_only' ? activePoints : fullPoints,
      avgScore: calculatedAvg,
      trendSlope: slope,
      peakEntry: peak,
      lowestEntry: lowest,
      activeDaysCount: activePoints.length,
    };
  }, [entries, viewMode]);

  // Selected day details if user clicks a point on the chart
  const selectedDayData = useMemo(() => {
    if (!selectedDayKey) return null;
    return (trendData as any[]).find((p) => p.dateKey === selectedDayKey && p.score !== null) as DayDataPoint | undefined;
  }, [trendData, selectedDayKey]);

  return (
    <section 
      id="sentiment-trend-section"
      className="bg-white/75 dark:bg-slate-900/75 backdrop-blur-2xl border border-white/80 dark:border-white/10 rounded-3xl p-6 sm:p-7 shadow-sm transition-all duration-300 hover:shadow-md space-y-6"
      aria-label="30-Day Sentiment Trend Chart"
    >
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-2 rounded-xl bg-indigo-50 dark:bg-indigo-950/70 border border-indigo-200/60 dark:border-indigo-800/60 text-indigo-600 dark:text-indigo-400">
              <TrendingUp className="w-4 h-4" />
            </span>
            <h3 className="text-base sm:text-lg font-serif font-bold text-slate-900 dark:text-white">
              30-Day Sentiment Trajectory
            </h3>
            <span className="text-[11px] font-medium px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200/80 dark:border-slate-700 font-mono">
              Past 30 Days
            </span>
          </div>
          <p className="text-xs text-slate-600 dark:text-slate-300 mt-1 max-w-xl">
            A longitudinal timeline visualizing emotional harmony scores (0–100) extracted across your mindful journaling entries.
          </p>
        </div>

        {/* View mode toggle */}
        {activeDaysCount > 0 && (
          <div className="flex items-center self-start sm:self-auto p-1 bg-slate-100/80 dark:bg-slate-800/70 rounded-2xl border border-slate-200/60 dark:border-slate-700/60 text-xs">
            <button
              id="btn-trend-active-days"
              type="button"
              onClick={() => setViewMode('active_only')}
              className={`px-3 py-1.5 rounded-xl font-medium transition-all cursor-pointer ${
                viewMode === 'active_only'
                  ? 'bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-300 shadow-xs font-semibold'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              Active Days ({activeDaysCount})
            </button>
            <button
              id="btn-trend-full-timeline"
              type="button"
              onClick={() => setViewMode('full_30_days')}
              className={`px-3 py-1.5 rounded-xl font-medium transition-all cursor-pointer ${
                viewMode === 'full_30_days'
                  ? 'bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-300 shadow-xs font-semibold'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              Full 30 Days
            </button>
          </div>
        )}
      </div>

      {/* Metric Tiles Summary */}
      {last30DaysEntries.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-1">
          {/* Average Score */}
          <div className="p-3.5 rounded-2xl bg-white/60 dark:bg-slate-800/50 border border-white/60 dark:border-white/5 space-y-1">
            <span className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">30-Day Mean</span>
            <div className="flex items-baseline gap-1.5">
              <span className="text-xl font-serif font-bold text-slate-900 dark:text-white font-mono">
                {avgScore}
              </span>
              <span className="text-xs text-slate-500 dark:text-slate-400 font-mono">/ 100</span>
            </div>
            <span className="text-[10px] text-slate-500 dark:text-slate-400 block truncate">
              {avgScore >= 80 ? '🌿 Uplifting & Centered' : avgScore >= 60 ? '🌌 Mindful & Introspective' : '🌧️ Tender & Processing'}
            </span>
          </div>

          {/* Trajectory */}
          <div className="p-3.5 rounded-2xl bg-white/60 dark:bg-slate-800/50 border border-white/60 dark:border-white/5 space-y-1">
            <span className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">Net Momentum</span>
            <div className="flex items-center gap-1.5">
              {trendSlope > 3 ? (
                <>
                  <TrendingUp className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                  <span className="text-sm font-semibold text-emerald-600 dark:text-emerald-400 font-mono">
                    +{trendSlope}% Upward
                  </span>
                </>
              ) : trendSlope < -3 ? (
                <>
                  <TrendingDown className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                  <span className="text-sm font-semibold text-amber-600 dark:text-amber-400 font-mono">
                    {trendSlope}% Shift
                  </span>
                </>
              ) : (
                <>
                  <Minus className="w-4 h-4 text-slate-500" />
                  <span className="text-sm font-semibold text-slate-700 dark:text-slate-200 font-mono">
                    Steady State
                  </span>
                </>
              )}
            </div>
            <span className="text-[10px] text-slate-500 dark:text-slate-400 block truncate">
              First half vs. second half
            </span>
          </div>

          {/* Total Entries */}
          <div className="p-3.5 rounded-2xl bg-white/60 dark:bg-slate-800/50 border border-white/60 dark:border-white/5 space-y-1">
            <span className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">Reflections Logged</span>
            <div className="flex items-baseline gap-1.5">
              <span className="text-xl font-serif font-bold text-slate-900 dark:text-white font-mono">
                {last30DaysEntries.length}
              </span>
              <span className="text-xs text-slate-500 dark:text-slate-400">entries</span>
            </div>
            <span className="text-[10px] text-slate-500 dark:text-slate-400 block truncate">
              Across {activeDaysCount} active days
            </span>
          </div>

          {/* Peak Harmony Day */}
          <div className="p-3.5 rounded-2xl bg-white/60 dark:bg-slate-800/50 border border-white/60 dark:border-white/5 space-y-1">
            <span className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">Peak Day</span>
            <div className="flex items-baseline gap-1.5">
              <span className="text-xl font-serif font-bold text-indigo-600 dark:text-indigo-400 font-mono">
                {peakEntry ? peakEntry.score : '--'}
              </span>
              <span className="text-xs text-slate-500 dark:text-slate-400 font-mono">/ 100</span>
            </div>
            <span className="text-[10px] text-slate-500 dark:text-slate-400 block truncate" title={peakEntry?.dateStr}>
              {peakEntry ? `${peakEntry.dateStr}` : 'No reflections yet'}
            </span>
          </div>
        </div>
      )}

      {/* Main Line Chart Canvas */}
      {last30DaysEntries.length === 0 ? (
        <div className="p-8 sm:p-10 rounded-2xl bg-slate-50/60 dark:bg-slate-800/40 border border-dashed border-slate-200 dark:border-slate-700 text-center space-y-3">
          <div className="w-10 h-10 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center mx-auto border border-indigo-200/60 dark:border-indigo-800/60">
            <Calendar className="w-5 h-5" />
          </div>
          <div className="space-y-1">
            <h4 className="text-sm font-serif font-semibold text-slate-900 dark:text-white">
              No Reflections in the Last 30 Days
            </h4>
            <p className="text-xs text-slate-600 dark:text-slate-300 max-w-sm mx-auto leading-relaxed">
              When you write your daily thoughts, your emotional trajectory and sentiment scores will map right here.
            </p>
          </div>
          {onStartWriting && (
            <div className="pt-2">
              <button
                id="btn-start-writing-from-chart"
                onClick={onStartWriting}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold bg-indigo-600 hover:bg-indigo-700 text-white transition-all shadow-sm cursor-pointer"
              >
                <PenLine className="w-3.5 h-3.5" />
                <span>Begin Today's Reflection</span>
              </button>
            </div>
          )}
        </div>
      ) : (
        <div className="space-y-3">
          {/* Chart Container with explicit height */}
          <div className="w-full h-72 sm:h-80 relative select-none">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart
                data={trendData}
                margin={{ top: 15, right: 15, left: -15, bottom: 5 }}
                onClick={(e: any) => {
                  if (e && e.activePayload && e.activePayload.length > 0) {
                    const payload = e.activePayload[0].payload;
                    if (payload && payload.score !== null) {
                      setSelectedDayKey(payload.dateKey);
                    }
                  }
                }}
              >
                <defs>
                  {/* Subtle area gradient for sentiment score */}
                  <linearGradient id="sentimentAreaGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#6366f1" stopOpacity={0.28} />
                    <stop offset="100%" stopColor="#6366f1" stopOpacity={0.01} />
                  </linearGradient>
                </defs>

                <CartesianGrid 
                  strokeDasharray="3 3" 
                  vertical={false} 
                  stroke="rgba(148, 163, 184, 0.18)" 
                />

                <XAxis 
                  dataKey="displayDate" 
                  tickLine={false}
                  axisLine={{ stroke: 'rgba(148, 163, 184, 0.25)' }}
                  tick={{ fontSize: 11, fill: 'currentColor', opacity: 0.65 }}
                  interval={viewMode === 'full_30_days' ? 4 : 'preserveStartEnd'}
                />

                <YAxis 
                  domain={[20, 100]} 
                  ticks={[30, 50, 70, 90, 100]}
                  tickLine={false}
                  axisLine={false}
                  tick={{ fontSize: 11, fill: 'currentColor', opacity: 0.65 }}
                  tickFormatter={(val) => `${val}%`}
                />

                {/* 30-Day Mean Reference Line */}
                {avgScore > 0 && (
                  <ReferenceLine 
                    y={avgScore} 
                    stroke="#818cf8" 
                    strokeDasharray="4 4" 
                    strokeWidth={1.5}
                    label={{
                      value: `Mean ${avgScore}%`,
                      position: 'insideTopRight',
                      fill: '#818cf8',
                      fontSize: 10,
                      offset: 8,
                    }}
                  />
                )}

                <Tooltip 
                  content={<CustomSentimentTooltip onNavigateToEntry={onNavigateToEntry} />}
                />

                {/* Soft Area fill under the line */}
                <Area
                  type="monotone"
                  dataKey="score"
                  fill="url(#sentimentAreaGradient)"
                  stroke="none"
                  connectNulls
                  isAnimationActive
                />

                {/* Primary Sentiment Trajectory Line */}
                <Line
                  type="monotone"
                  dataKey="score"
                  stroke="#6366f1"
                  strokeWidth={2.5}
                  connectNulls
                  dot={(props: any) => {
                    const { cx, cy, payload, index } = props;
                    if (payload.score === null) return null;
                    const isSelected = selectedDayKey === payload.dateKey;
                    return (
                      <circle
                        key={`dot-${index}`}
                        cx={cx}
                        cy={cy}
                        r={isSelected ? 6 : 4}
                        fill={isSelected ? '#4f46e5' : '#6366f1'}
                        stroke="#ffffff"
                        strokeWidth={2}
                        className="transition-all cursor-pointer hover:scale-125"
                      />
                    );
                  }}
                  activeDot={{
                    r: 7,
                    fill: '#4f46e5',
                    stroke: '#ffffff',
                    strokeWidth: 2,
                  }}
                  isAnimationActive
                />
              </ComposedChart>
            </ResponsiveContainer>
          </div>

          {/* Bottom Chart Legend & Guidance */}
          <div className="flex flex-wrap items-center justify-between gap-2 pt-1 px-1 text-[11px] text-slate-500 dark:text-slate-400">
            <div className="flex items-center gap-4">
              <span className="inline-flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-indigo-500 inline-block" />
                <span>Daily Sentiment Score (0–100)</span>
              </span>
              <span className="inline-flex items-center gap-1.5">
                <span className="w-3 border-b-2 border-dashed border-indigo-400 inline-block" />
                <span>30-Day Average ({avgScore}%)</span>
              </span>
            </div>
            <span className="text-[10px] text-slate-600 dark:text-slate-300">
              Tip: Click any point on the curve to inspect entries from that day
            </span>
          </div>

          {/* Selected Day Details Panel */}
          {selectedDayData && (
            <div 
              id="selected-day-details"
              className="mt-4 p-4 sm:p-5 rounded-2xl bg-indigo-50/70 dark:bg-indigo-950/40 border border-indigo-200/80 dark:border-indigo-900/60 backdrop-blur-md space-y-3 animate-fade-in"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-xl" aria-hidden="true">{selectedDayData.dominantEmoji}</span>
                  <div>
                    <h5 className="text-xs font-semibold font-serif text-slate-900 dark:text-white">
                      {selectedDayData.fullDate}
                    </h5>
                    <p className="text-[11px] text-indigo-700 dark:text-indigo-300 font-medium">
                      {selectedDayData.dominantSentiment} • Score {selectedDayData.score}/100
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setSelectedDayKey(null)}
                  className="text-xs text-slate-600 dark:text-slate-300 hover:text-slate-800 dark:hover:text-slate-100 px-2 py-0.5 rounded-lg hover:bg-white/50 dark:hover:bg-slate-800/50 cursor-pointer"
                >
                  Dismiss
                </button>
              </div>

              {/* Day's Entries list */}
              <div className="space-y-2 pt-1 border-t border-indigo-200/60 dark:border-indigo-900/50">
                <span className="text-[11px] text-slate-600 dark:text-slate-300 font-medium block">
                  Reflections recorded on this date ({selectedDayData.rawEntries.length}):
                </span>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {selectedDayData.rawEntries.map((entry) => {
                    const score = getEntryScore(entry);
                    const { label, emoji } = getEntrySentimentLabel(entry);
                    return (
                      <button
                        key={entry.id}
                        id={`btn-chart-day-entry-${entry.id}`}
                        onClick={() => onNavigateToEntry?.(entry.id)}
                        className="flex items-center justify-between p-2.5 rounded-xl bg-white/80 dark:bg-slate-800/80 hover:bg-white dark:hover:bg-slate-800 border border-indigo-100 dark:border-indigo-900 text-left transition-all hover:shadow-xs group cursor-pointer"
                      >
                        <div className="min-w-0 flex-1 pr-2">
                          <div className="flex items-center gap-1.5">
                            <span className="text-xs">{emoji}</span>
                            <span className="text-xs font-medium text-slate-800 dark:text-slate-200 truncate">
                              {entry.title || 'Untitled Reflection'}
                            </span>
                          </div>
                          <span className="text-[10px] text-slate-500 dark:text-slate-400 block truncate">
                            {label} • {new Date(entry.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </div>
                        <div className="flex items-center gap-1.5 shrink-0">
                          <span className="text-xs font-mono font-semibold text-indigo-600 dark:text-indigo-400">
                            {score}%
                          </span>
                          <ArrowUpRight className="w-3 h-3 text-slate-400 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors" />
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </section>
  );
};

// Custom Recharts Tooltip Component
const CustomSentimentTooltip: React.FC<any> = ({ active, payload, onNavigateToEntry }) => {
  if (!active || !payload || !payload.length) return null;

  const data: DayDataPoint = payload[0].payload;
  if (!data || data.score === null) {
    return (
      <div className="p-2.5 rounded-xl bg-white/95 dark:bg-slate-900/95 backdrop-blur-xl border border-slate-200 dark:border-slate-800 shadow-lg text-xs">
        <span className="text-slate-500 dark:text-slate-400">{data?.displayDate}</span>
        <p className="text-[11px] text-slate-400 mt-0.5">Quiet day (no reflection logged)</p>
      </div>
    );
  }

  return (
    <div className="p-3.5 rounded-2xl bg-white/95 dark:bg-slate-900/95 backdrop-blur-xl border border-slate-200/80 dark:border-slate-800/80 shadow-xl text-xs space-y-2 max-w-xs pointer-events-auto">
      <div className="flex items-center justify-between gap-3 border-b border-slate-100 dark:border-slate-800 pb-1.5">
        <span className="font-serif font-bold text-slate-900 dark:text-white">
          {data.fullDate}
        </span>
        <span className="px-2 py-0.5 rounded-md bg-indigo-50 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-300 font-mono font-bold text-[11px]">
          {data.score} / 100
        </span>
      </div>

      <div className="space-y-1 text-[11px]">
        <div className="flex items-center gap-1.5 text-slate-700 dark:text-slate-300 font-medium">
          <span className="text-sm">{data.dominantEmoji}</span>
          <span>{data.dominantSentiment}</span>
        </div>

        {data.rawEntries && data.rawEntries.length > 0 && (
          <div className="pt-1">
            <span className="text-[10px] text-slate-500 dark:text-slate-400 block mb-1">
              {data.rawEntries.length} {data.rawEntries.length === 1 ? 'reflection' : 'reflections'}:
            </span>
            <ul className="space-y-1">
              {data.rawEntries.slice(0, 3).map((e) => (
                <li key={e.id} className="text-slate-600 dark:text-slate-300 truncate flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-indigo-500 shrink-0" />
                  <span className="truncate">{e.title || 'Untitled'}</span>
                </li>
              ))}
              {data.rawEntries.length > 3 && (
                <li className="text-[10px] text-slate-400 italic">
                  +{data.rawEntries.length - 3} more...
                </li>
              )}
            </ul>
          </div>
        )}
      </div>
      <p className="text-[10px] text-indigo-500 dark:text-indigo-400 pt-0.5 border-t border-slate-100 dark:border-slate-800">
        Click point to expand entry details
      </p>
    </div>
  );
};
