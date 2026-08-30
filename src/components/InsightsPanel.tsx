import React, { useState, useMemo } from 'react';
import { 
  Sparkles, 
  TrendingUp, 
  Compass, 
  Lightbulb, 
  Brain, 
  BarChart3,
  ArrowUpRight,
  Flame,
  FileText
} from 'lucide-react';
import { JournalEntry, ProfileSummary, InsightReport } from '../types';
import { requestInsights } from '../lib/api';
import { saveInsightReport } from '../lib/firebase';
import { ConfidenceTooltip } from './ConfidenceTooltip';

interface InsightsPanelProps {
  userId: string;
  entries: JournalEntry[];
  profileSummary: ProfileSummary | null;
  insightsHistory: InsightReport[];
  onReflectOnSuggestion: (prompt: string, tag: string) => void;
  onNavigateToEntry?: (entryId: string) => void;
}

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

export const InsightsPanel: React.FC<InsightsPanelProps> = ({
  userId,
  entries,
  profileSummary,
  insightsHistory,
  onReflectOnSuggestion,
  onNavigateToEntry,
}) => {
  const [isGenerating, setIsGenerating] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');

  const latestInsight = insightsHistory[0] || null;

  const entriesMap = useMemo(() => {
    const map = new Map<string, JournalEntry>();
    entries.forEach((e) => map.set(e.id, e));
    return map;
  }, [entries]);

  const filteredEntries = useMemo(() => {
    return entries.filter(entry => {
      const entryDate = new Date(entry.createdAt);
      if (startDate && new Date(startDate) > entryDate) return false;
      
      if (endDate) {
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);
        if (end < entryDate) return false;
      }
      return true;
    });
  }, [entries, startDate, endDate]);

  const sentimentDistributionList = useMemo(() => {
    const dist = latestInsight?.sentimentDistribution;
    
    if (!dist) {
      return [
        { label: 'Uplifting', value: 35, barColor: 'bg-purple-600 dark:bg-purple-400' },
        { label: 'Reflective', value: 35, barColor: 'bg-purple-500 dark:bg-purple-500' },
        { label: 'Tension / Challenge', value: 15, barColor: 'bg-purple-400 dark:bg-purple-600' },
        { label: 'Neutral / Unclassified', value: 15, barColor: 'bg-purple-300 dark:bg-purple-700' },
      ];
    }

    const pos = Math.max(0, Math.round(Number(dist.positive) || 0));
    const ref = Math.max(0, Math.round(Number(dist.reflective) || 0));
    const cha = Math.max(0, Math.round(Number(dist.challenging) || 0));
    let neu = Math.max(0, Math.round(Number(dist.neutral) || 0));

    let sum = pos + ref + cha + neu;

    if (sum < 100 && neu === 0) {
      neu = 100 - (pos + ref + cha);
      sum = 100;
    }

    if (sum <= 0) {
      return [
        { label: 'Uplifting', value: 35, barColor: 'bg-purple-600 dark:bg-purple-400' },
        { label: 'Reflective', value: 35, barColor: 'bg-purple-500 dark:bg-purple-500' },
        { label: 'Tension / Challenge', value: 15, barColor: 'bg-purple-400 dark:bg-purple-600' },
        { label: 'Neutral / Unclassified', value: 15, barColor: 'bg-purple-300 dark:bg-purple-700' },
      ];
    }

    let posScaled = Math.round((pos / sum) * 100);
    let refScaled = Math.round((ref / sum) * 100);
    let chaScaled = Math.round((cha / sum) * 100);
    let neuScaled = 100 - (posScaled + refScaled + chaScaled);

    if (neuScaled < 0) {
      neuScaled = 0;
      const subTotal = posScaled + refScaled + chaScaled;
      if (subTotal > 0) {
        posScaled = Math.round((posScaled / subTotal) * 100);
        refScaled = Math.round((refScaled / subTotal) * 100);
        chaScaled = 100 - (posScaled + refScaled);
      }
    }

    const items = [
      { label: 'Uplifting', value: posScaled, barColor: 'bg-purple-600 dark:bg-purple-400' },
      { label: 'Reflective', value: refScaled, barColor: 'bg-purple-500 dark:bg-purple-500' },
      { label: 'Tension / Challenge', value: chaScaled, barColor: 'bg-purple-400 dark:bg-purple-600' },
    ];

    if (neuScaled > 0) {
      items.push({
        label: 'Neutral / Unclassified',
        value: neuScaled,
        barColor: 'bg-purple-300 dark:bg-purple-700',
      });
    }

    return items;
  }, [latestInsight?.sentimentDistribution]);

  const handleGenerate = async () => {
    if (filteredEntries.length === 0) {
      setErrorMessage('You need at least one journal entry in this date range to generate insights.');
      return;
    }

    setIsGenerating(true);
    setErrorMessage(null);

    try {
      const res = await requestInsights({
        entries: filteredEntries,
        profileSummary,
      });

      const newReport: InsightReport = {
        id: 'insight_' + Date.now(),
        userId,
        ...res.insight,
        generatedAt: res.generatedAt,
        entriesAnalyzedCount: res.entriesAnalyzedCount,
        dateRange: (startDate || endDate) ? { start: startDate || undefined, end: endDate || undefined } : undefined
      };

      await saveInsightReport(userId, newReport);
    } catch (err: any) {
      console.error('Failed to generate insight report:', err);
      setErrorMessage(err.message || 'Failed to synthesize insights');
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="max-w-5xl mx-auto space-y-8">
      
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-serif font-bold text-slate-900 dark:text-white">
            Insights & Patterns
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-xl">
            On-demand synthesis across your reflections, revealing emotional trajectories, recurring themes, and actionable growth horizons.
          </p>
        </div>

        <div className="flex flex-col sm:flex-row items-end sm:items-center gap-3">
          <div className="flex items-center gap-2 text-xs">
            <input 
              type="date" 
              value={startDate} 
              onChange={e => setStartDate(e.target.value)}
              title="Start Date"
              className="bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg px-2.5 py-2 text-slate-700 dark:text-slate-300 outline-none focus:border-indigo-500 transition-colors"
            />
            <span className="text-slate-400">to</span>
            <input 
              type="date" 
              value={endDate} 
              onChange={e => setEndDate(e.target.value)}
              title="End Date"
              className="bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg px-2.5 py-2 text-slate-700 dark:text-slate-300 outline-none focus:border-indigo-500 transition-colors"
            />
          </div>

          <button
            id="btn-generate-insights"
            onClick={handleGenerate}
            disabled={isGenerating || entries.length === 0}
            className="flex items-center justify-center gap-2 px-5 py-2 rounded-xl text-xs font-semibold bg-indigo-600 hover:bg-indigo-700 text-white disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-xs flex-shrink-0 cursor-pointer"
          >
            <Sparkles className={`w-3.5 h-3.5 ${isGenerating ? 'animate-spin' : ''}`} />
            <span>{isGenerating ? 'Synthesizing...' : 'Generate'}</span>
          </button>
        </div>
      </div>

      {errorMessage && (
        <div className="p-3.5 rounded-2xl bg-rose-50 dark:bg-rose-950/60 text-xs text-rose-700 dark:text-rose-300">
          {errorMessage}
        </div>
      )}

      {/* Main Analysis Display */}
      {isGenerating ? (
        <div className="bg-white dark:bg-slate-900 border border-slate-200/60 dark:border-slate-800 rounded-3xl p-10 text-center space-y-3 shadow-sm animate-pulse">
          <div className="w-10 h-10 rounded-full bg-indigo-50 dark:bg-indigo-950 flex items-center justify-center text-indigo-600 dark:text-indigo-400 mx-auto">
            <Brain className="w-5 h-5 animate-pulse" />
          </div>
          <h3 className="text-sm font-serif font-semibold text-slate-900 dark:text-white">
            Synthesizing Emotional Patterns & Themes...
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 max-w-md mx-auto">
            Reviewing your reflections, analyzing sentiment trajectory, and discovering meaningful connections.
          </p>
        </div>
      ) : latestInsight ? (
        <div className="space-y-6">
          
          {/* Top Mood & Trajectory Card */}
          <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
            
            {/* Trajectory */}
            <div className="md:col-span-8 bg-white dark:bg-slate-900 border border-slate-200/60 dark:border-slate-800 rounded-3xl p-6 space-y-3 shadow-sm">
              <div className="flex items-center justify-between text-xs text-slate-400 dark:text-slate-500">
                <span className="flex items-center gap-1.5 text-indigo-600 dark:text-indigo-400 font-medium">
                  <TrendingUp className="w-4 h-4" />
                  <span>Emotional Trajectory</span>
                </span>
                <span>
                  {entries.length > (latestInsight.entriesAnalyzedCount ?? (latestInsight as any).entryCount ?? entries.length)
                    ? `Analyzed ${latestInsight.entriesAnalyzedCount ?? (latestInsight as any).entryCount ?? entries.length} of ${entries.length} reflections`
                    : `Analyzed ${latestInsight.entriesAnalyzedCount ?? (latestInsight as any).entryCount ?? entries.length} reflections`}
                </span>
              </div>

              <h3 className="text-base sm:text-lg font-serif font-semibold text-slate-900 dark:text-white leading-snug">
                "{latestInsight.overallMoodTrend}"
              </h3>

              <div className="flex items-center gap-2 pt-2 border-t border-slate-100 dark:border-slate-800 text-xs">
                <span className="text-slate-400 dark:text-slate-500">Dominant State:</span>
                <span className="px-2.5 py-0.5 rounded-lg bg-indigo-50 dark:bg-indigo-950/70 text-indigo-700 dark:text-indigo-300 font-medium font-serif">
                  {latestInsight.primaryMood}
                </span>
              </div>
            </div>

            {/* Sentiment Balance breakdown */}
            <div className="md:col-span-4 bg-white dark:bg-slate-900 border border-slate-200/60 dark:border-slate-800 rounded-3xl p-6 space-y-3 shadow-sm">
              <div className="text-xs font-semibold flex items-center gap-1.5 text-slate-700 dark:text-slate-300">
                <BarChart3 className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                <span>Sentiment Balance</span>
              </div>

              <div className="space-y-2.5 pt-1 text-xs">
                {sentimentDistributionList.map((item) => (
                  <div key={item.label}>
                    <div className="flex justify-between text-slate-600 dark:text-slate-400 mb-1">
                      <span>{item.label}</span>
                      <ConfidenceTooltip explanation="Gemini's estimated confidence based on language and sentiment across analyzed reflections.">
                        <span className="font-mono">{item.value}%</span>
                      </ConfidenceTooltip>
                    </div>
                    <div className="w-full h-1.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                      <div
                        className={`h-full ${item.barColor} rounded-full`}
                        style={{ width: `${item.value}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>

          </div>

          {/* Theme Breakdown Cards with Evidence Attribution */}
          <div className="space-y-3">
            <h4 className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
              <Compass className="w-3.5 h-3.5" />
              <span>Core Themes & Focus Areas</span>
            </h4>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {latestInsight.themes && latestInsight.themes.map((th, idx) => {
                const hasEvidence = Array.isArray(th.influencedBy) && th.influencedBy.length > 0;
                return (
                  <div
                    key={idx}
                    className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/60 dark:border-slate-800 flex flex-col justify-between space-y-3 shadow-sm hover:border-indigo-300 dark:hover:border-indigo-700 transition-colors"
                  >
                    <div className="space-y-2">
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-sm font-semibold font-serif text-slate-900 dark:text-white">{th.name}</span>
                        <span className={`text-xs font-medium px-2.5 py-0.5 rounded-md border ${
                          th.score >= 80 
                            ? 'bg-emerald-50 text-emerald-700 border-emerald-200/60 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800/60' 
                            : th.score >= 50 
                            ? 'bg-amber-50 text-amber-700 border-amber-200/60 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-800/60'
                            : 'bg-slate-50 text-slate-600 border-slate-200/60 dark:bg-slate-800/80 dark:text-slate-400 dark:border-slate-700'
                        }`}>
                          <ConfidenceTooltip explanation="Gemini's estimated confidence based on language and sentiment in this entry.">
                            <span>{th.score}% resonance</span>
                          </ConfidenceTooltip>
                        </span>
                      </div>

                      <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed font-sans">
                        {th.observation}
                      </p>
                    </div>

                    {/* Attributed Evidence Links */}
                    {hasEvidence && (
                      <div className="pt-2.5 border-t border-slate-100 dark:border-slate-800 space-y-1.5">
                        <div className="flex items-center gap-1 text-[11px] text-slate-400 dark:text-slate-500">
                          <FileText className="w-3 h-3" />
                          <span>Referenced in {th.influencedBy!.length} reflections:</span>
                        </div>
                        <div className="flex flex-wrap gap-1.5">
                          {th.influencedBy!.map((entryId) => {
                            const entry = entriesMap.get(entryId);
                            const title = entry?.title || `Reflection #${entryId.slice(-6)}`;
                            const emoji = entry?.sentiment?.emoji || (entry?.mood ? MOOD_EMOJIS[entry.mood] : '📝');
                            return (
                              <button
                                key={entryId}
                                id={`btn-insight-entry-${entryId}`}
                                onClick={() => onNavigateToEntry?.(entryId)}
                                title={`Open: "${entry?.title || entryId}"`}
                                className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-indigo-50 dark:hover:bg-indigo-950 text-slate-700 dark:text-slate-300 hover:text-indigo-600 dark:hover:text-indigo-300 text-[11px] transition-colors cursor-pointer"
                              >
                                <span>{emoji}</span>
                                <span className="truncate max-w-[120px]">{title}</span>
                                <ArrowUpRight className="w-2.5 h-2.5 opacity-60" />
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Notable Shift & Mindful Suggestion */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            
            {/* Shift */}
            <div className="p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/60 dark:border-slate-800 flex flex-col justify-between space-y-3 shadow-sm">
              <div className="space-y-2">
                <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-700 dark:text-slate-300">
                  <Flame className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                  <span>Notable Perspective Shift</span>
                </div>
                <p className="text-sm text-slate-700 dark:text-slate-200 leading-relaxed font-serif">
                  {latestInsight.notableShift}
                </p>
              </div>

              {latestInsight.notableShiftInfluencedBy && latestInsight.notableShiftInfluencedBy.length > 0 && (
                <div className="pt-3 border-t border-slate-100 dark:border-slate-800 space-y-1.5">
                  <div className="flex items-center gap-1 text-[11px] text-slate-400 dark:text-slate-500">
                    <FileText className="w-3 h-3" />
                    <span>Evident in {latestInsight.notableShiftInfluencedBy.length} reflections:</span>
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {latestInsight.notableShiftInfluencedBy.map((entryId) => {
                      const entry = entriesMap.get(entryId);
                      const title = entry?.title || `Reflection #${entryId.slice(-6)}`;
                      const emoji = entry?.sentiment?.emoji || (entry?.mood ? MOOD_EMOJIS[entry.mood] : '📝');
                      return (
                        <button
                          key={entryId}
                          id={`btn-shift-entry-${entryId}`}
                          onClick={() => onNavigateToEntry?.(entryId)}
                          className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-indigo-50 dark:hover:bg-indigo-950 text-slate-700 dark:text-slate-300 text-[11px] cursor-pointer transition-colors"
                        >
                          <span>{emoji}</span>
                          <span className="truncate max-w-[130px]">{title}</span>
                          <ArrowUpRight className="w-2.5 h-2.5 opacity-60" />
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>

            {/* Actionable Suggestion */}
            <div className="p-6 rounded-3xl bg-indigo-50/50 dark:bg-indigo-950/30 border border-indigo-100 dark:border-indigo-900/50 flex flex-col justify-between space-y-3 shadow-sm">
              <div className="space-y-2">
                <div className="flex items-center gap-1.5 text-xs font-semibold text-indigo-700 dark:text-indigo-300">
                  <Lightbulb className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                  <span>Recommended Focus</span>
                </div>
                <p className="text-sm text-slate-800 dark:text-slate-100 leading-relaxed font-sans">
                  {latestInsight.suggestion}
                </p>

                <button
                  id="btn-reflect-suggestion"
                  onClick={() => onReflectOnSuggestion(latestInsight.suggestion, 'insight-prompt')}
                  className="inline-flex items-center gap-1.5 text-xs font-semibold text-indigo-600 dark:text-indigo-400 hover:underline pt-1 cursor-pointer"
                >
                  <span>Reflect on this prompt in a new entry</span>
                  <ArrowUpRight className="w-3.5 h-3.5" />
                </button>
              </div>

              {latestInsight.suggestionInfluencedBy && latestInsight.suggestionInfluencedBy.length > 0 && (
                <div className="pt-3 border-t border-indigo-100 dark:border-indigo-900/50 space-y-1.5">
                  <div className="flex items-center gap-1 text-[11px] text-indigo-600/80 dark:text-indigo-400">
                    <FileText className="w-3 h-3" />
                    <span>Inspired by reflections:</span>
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {latestInsight.suggestionInfluencedBy.map((entryId) => {
                      const entry = entriesMap.get(entryId);
                      const title = entry?.title || `Reflection #${entryId.slice(-6)}`;
                      const emoji = entry?.sentiment?.emoji || (entry?.mood ? MOOD_EMOJIS[entry.mood] : '📝');
                      return (
                        <button
                          key={entryId}
                          id={`btn-sugg-entry-${entryId}`}
                          onClick={() => onNavigateToEntry?.(entryId)}
                          className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-[11px] cursor-pointer"
                        >
                          <span>{emoji}</span>
                          <span className="truncate max-w-[130px]">{title}</span>
                          <ArrowUpRight className="w-2.5 h-2.5 opacity-60" />
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>

          </div>

        </div>
      ) : (
        <div className="bg-white dark:bg-slate-900 border border-slate-200/60 dark:border-slate-800 rounded-3xl p-12 text-center text-slate-500 dark:text-slate-400 space-y-3">
          <Brain className="w-8 h-8 text-slate-400 dark:text-slate-600 mx-auto" />
          <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-300 font-serif">No insights generated yet</h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 max-w-sm mx-auto">
            Click "Generate New Insights" above to synthesize emotional trends, recurring themes, and perspective shifts from your journal entries.
          </p>
        </div>
      )}

    </div>
  );
};
