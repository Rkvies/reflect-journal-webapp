import React, { useState, useMemo } from 'react';
import { 
  Sparkles, 
  TrendingUp, 
  Compass, 
  Lightbulb, 
  Brain, 
  Clock, 
  CheckCircle2, 
  BarChart3,
  ArrowUpRight,
  Flame,
  FileText,
  Layers
} from 'lucide-react';
import { JournalEntry, ProfileSummary, InsightReport } from '../types';
import { requestInsights } from '../lib/api';
import { saveInsightReport } from '../lib/firebase';

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

  const latestInsight = insightsHistory[0] || null;

  // Build quick lookup map of entries by id
  const entriesMap = useMemo(() => {
    const map = new Map<string, JournalEntry>();
    entries.forEach((e) => map.set(e.id, e));
    return map;
  }, [entries]);

  const handleGenerate = async () => {
    if (entries.length === 0) {
      setErrorMessage('You need at least one journal entry to generate insights.');
      return;
    }

    setIsGenerating(true);
    setErrorMessage(null);

    try {
      const res = await requestInsights({
        entries,
        profileSummary,
      });

      const newReport: InsightReport = {
        id: 'insight_' + Date.now(),
        userId,
        ...res.insight,
        generatedAt: res.generatedAt,
        entriesAnalyzedCount: res.entriesAnalyzedCount,
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
    <div className="max-w-5xl mx-auto space-y-6">
      
      {/* Header Banner */}
      <div className="bg-white/60 backdrop-blur-xl border border-white/70 rounded-3xl p-5 sm:p-6 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-xl bg-amber-50 border border-amber-200 flex items-center justify-center text-amber-600">
                <Sparkles className="w-4 h-4" />
              </div>
              <h2 className="text-xl font-serif font-bold text-slate-900">Mindful Insights & Pattern Analysis</h2>
              <span className="hidden sm:inline-flex items-center gap-1 text-[11px] font-mono px-2.5 py-0.5 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-200 font-semibold">
                <Layers className="w-3 h-3" /> Transparent Attribution
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-1 max-w-2xl">
              On-demand psychological synthesis across your reflections with auditable reasoning attributing every theme to its source entries.
            </p>
          </div>

          <button
            id="btn-generate-insights"
            onClick={handleGenerate}
            disabled={isGenerating || entries.length === 0}
            className="flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl text-xs font-semibold bg-indigo-600 hover:bg-indigo-700 text-white disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-md shadow-indigo-600/20 flex-shrink-0 cursor-pointer"
          >
            <Brain className={`w-4 h-4 ${isGenerating ? 'animate-pulse' : ''}`} />
            <span>{isGenerating ? 'Synthesizing Patterns...' : 'Generate New Insights'}</span>
          </button>
        </div>

        {errorMessage && (
          <div className="mt-4 p-3.5 rounded-2xl bg-rose-50 border border-rose-200 text-xs text-rose-700">
            {errorMessage}
          </div>
        )}
      </div>

      {/* Main Analysis Display */}
      {isGenerating ? (
        <div className="bg-white/70 dark:bg-slate-900/80 backdrop-blur-xl border border-indigo-200 dark:border-indigo-800/80 rounded-3xl p-10 text-center space-y-4 shadow-sm animate-pulse">
          <div className="w-14 h-14 rounded-2xl bg-indigo-50 dark:bg-indigo-950/70 border border-indigo-200 dark:border-indigo-800 flex items-center justify-center text-indigo-600 dark:text-indigo-400 mx-auto shadow-inner">
            <Brain className="w-7 h-7 animate-bounce" />
          </div>
          <div className="space-y-1">
            <h3 className="text-base font-serif font-bold text-slate-900 dark:text-white">
              Synthesizing Psychological Patterns & Themes
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 max-w-md mx-auto">
              Gemini is analyzing your journal entries, calculating sentiment distribution, and mapping verifiable attributions...
            </p>
          </div>
          <div className="flex items-center justify-center gap-1.5 pt-2">
            <span className="w-2.5 h-2.5 rounded-full bg-indigo-600 dark:bg-indigo-400 animate-typing-dot" />
            <span className="w-2.5 h-2.5 rounded-full bg-indigo-600 dark:bg-indigo-400 animate-typing-dot [animation-delay:0.2s]" />
            <span className="w-2.5 h-2.5 rounded-full bg-indigo-600 dark:bg-indigo-400 animate-typing-dot [animation-delay:0.4s]" />
          </div>
        </div>
      ) : latestInsight ? (
        <div className="space-y-6">
          
          {/* Top Mood & Trajectory Card */}
          <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
            
            {/* Trajectory */}
            <div className="md:col-span-8 bg-white/70 dark:bg-slate-900/70 backdrop-blur-xl border border-white/80 dark:border-white/10 rounded-3xl p-6 space-y-3 shadow-xs">
              <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 font-mono">
                <span className="flex items-center gap-1.5 text-indigo-700 dark:text-indigo-400 font-semibold">
                  <TrendingUp className="w-4 h-4" />
                  <span>EMOTIONAL TRAJECTORY</span>
                </span>
                <span>Analyzed {latestInsight.entriesAnalyzedCount} entries</span>
              </div>

              <h3 className="text-base sm:text-lg font-serif font-bold text-slate-900 dark:text-white leading-snug">
                "{latestInsight.overallMoodTrend}"
              </h3>

              <div className="flex items-center gap-2 pt-2 border-t border-slate-200/60 dark:border-slate-800">
                <span className="text-xs text-slate-500 dark:text-slate-400">Dominant Sentiment:</span>
                <span className="px-3 py-0.5 rounded-full bg-indigo-50 dark:bg-indigo-950/70 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800 text-xs font-semibold font-serif">
                  {latestInsight.primaryMood}
                </span>
              </div>
            </div>

            {/* Sentiment Balance breakdown */}
            <div className="md:col-span-4 bg-white/70 dark:bg-slate-900/70 backdrop-blur-xl border border-white/80 dark:border-white/10 rounded-3xl p-6 space-y-3 shadow-xs">
              <div className="text-xs font-semibold font-mono flex items-center gap-1.5 text-emerald-700 dark:text-emerald-400">
                <BarChart3 className="w-4 h-4" />
                <span>SENTIMENT BALANCE</span>
              </div>

              <div className="space-y-2.5 pt-1 text-xs">
                <div>
                  <div className="flex justify-between text-slate-700 dark:text-slate-300 mb-1 font-medium">
                    <span>Positive / Uplifting</span>
                    <span className="font-mono text-slate-500 dark:text-slate-400">{latestInsight.sentimentDistribution?.positive || 35}%</span>
                  </div>
                  <div className="w-full h-1.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-emerald-500 rounded-full"
                      style={{ width: `${latestInsight.sentimentDistribution?.positive || 35}%` }}
                    />
                  </div>
                </div>

                <div>
                  <div className="flex justify-between text-slate-700 dark:text-slate-300 mb-1 font-medium">
                    <span>Deeply Reflective</span>
                    <span className="font-mono text-slate-500 dark:text-slate-400">{latestInsight.sentimentDistribution?.reflective || 40}%</span>
                  </div>
                  <div className="w-full h-1.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-indigo-500 rounded-full"
                      style={{ width: `${latestInsight.sentimentDistribution?.reflective || 40}%` }}
                    />
                  </div>
                </div>

                <div>
                  <div className="flex justify-between text-slate-700 dark:text-slate-300 mb-1 font-medium">
                    <span>Challenging / Tension</span>
                    <span className="font-mono text-slate-500 dark:text-slate-400">{latestInsight.sentimentDistribution?.challenging || 25}%</span>
                  </div>
                  <div className="w-full h-1.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-rose-500 rounded-full"
                      style={{ width: `${latestInsight.sentimentDistribution?.challenging || 25}%` }}
                    />
                  </div>
                </div>
              </div>
            </div>

          </div>

          {/* Theme Breakdown Cards with Evidence Attribution */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-mono font-semibold text-slate-500 dark:text-slate-400 tracking-wider uppercase flex items-center gap-1.5">
                <Compass className="w-4 h-4 text-slate-400 dark:text-slate-500" />
                <span>Core Themes & Focus Areas</span>
              </h4>
              <span className="text-[11px] font-mono text-slate-400 dark:text-slate-500">Click any reflection badge to navigate</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {latestInsight.themes && latestInsight.themes.map((th, idx) => {
                const hasEvidence = Array.isArray(th.influencedBy) && th.influencedBy.length > 0;
                return (
                  <div
                    key={idx}
                    className="p-5 rounded-2xl bg-white/70 dark:bg-slate-900/70 backdrop-blur-xl border border-white/80 dark:border-white/10 flex flex-col justify-between space-y-3 shadow-xs hover:border-indigo-200/80 dark:hover:border-indigo-500/30 transition-colors"
                  >
                    <div className="space-y-2">
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-sm font-bold font-serif text-slate-800 dark:text-white">{th.name}</span>
                        <span className="text-xs font-mono font-semibold text-indigo-700 dark:text-indigo-300 px-2.5 py-0.5 rounded-full bg-indigo-50 dark:bg-indigo-950/70 border border-indigo-100 dark:border-indigo-800 flex-shrink-0">
                          {th.score}% resonance
                        </span>
                      </div>

                      <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed font-sans">
                        {th.observation}
                      </p>
                    </div>

                    {/* Attributed Evidence Links */}
                    {hasEvidence && (
                      <div className="pt-2.5 border-t border-slate-200/50 dark:border-slate-800 space-y-1.5">
                        <div className="flex items-center gap-1 text-[11px] text-slate-500 dark:text-slate-400 font-mono font-semibold">
                          <FileText className="w-3 h-3 text-indigo-500 dark:text-indigo-400" />
                          <span>Based on {th.influencedBy!.length} {th.influencedBy!.length === 1 ? 'reflection' : 'reflections'}:</span>
                        </div>
                        <div className="flex flex-wrap gap-1.5">
                          {th.influencedBy!.map((entryId) => {
                            const entry = entriesMap.get(entryId);
                            const title = entry?.title || `Reflection #${entryId.slice(-6)}`;
                            const emoji = entry?.sentiment?.emoji || (entry?.mood ? MOOD_EMOJIS[entry.mood] : '📝');
                            const date = entry?.createdAt
                              ? new Date(entry.createdAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
                              : '';
                            return (
                              <button
                                key={entryId}
                                id={`btn-insight-entry-${entryId}`}
                                onClick={() => onNavigateToEntry?.(entryId)}
                                title={`Navigate to reflection: "${entry?.title || entryId}"`}
                                className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-indigo-50/90 dark:bg-slate-800 hover:bg-indigo-100 dark:hover:bg-slate-700 text-indigo-900 dark:text-indigo-200 border border-indigo-200/70 dark:border-slate-700 text-[11px] transition-all hover:scale-[1.02] active:scale-[0.98] cursor-pointer shadow-2xs font-medium max-w-full truncate"
                              >
                                <span>{emoji}</span>
                                <span className="truncate max-w-[110px]">{title}</span>
                                {date && <span className="text-[10px] text-indigo-600/80 dark:text-indigo-400 font-mono">({date})</span>}
                                <ArrowUpRight className="w-2.5 h-2.5 text-indigo-500 dark:text-indigo-400 flex-shrink-0" />
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

          {/* Notable Shift & Mindful Suggestion with Attributions */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            
            {/* Shift */}
            <div className="p-6 rounded-3xl bg-white/70 dark:bg-slate-900/70 backdrop-blur-xl border border-white/80 dark:border-white/10 flex flex-col justify-between space-y-3 shadow-xs">
              <div className="space-y-2">
                <div className="flex items-center gap-1.5 text-xs font-semibold text-indigo-700 dark:text-indigo-400 font-mono">
                  <Flame className="w-4 h-4 text-amber-500" />
                  <span>NOTABLE PERSPECTIVE SHIFT</span>
                </div>
                <p className="text-sm text-slate-700 dark:text-slate-200 leading-relaxed font-serif">
                  {latestInsight.notableShift}
                </p>
              </div>

              {/* Notable shift evidence links */}
              {latestInsight.notableShiftInfluencedBy && latestInsight.notableShiftInfluencedBy.length > 0 && (
                <div className="pt-3 border-t border-slate-200/60 dark:border-slate-800 space-y-1.5">
                  <div className="flex items-center gap-1 text-[11px] text-slate-500 dark:text-slate-400 font-mono font-semibold">
                    <FileText className="w-3 h-3 text-amber-500" />
                    <span>Demonstrated in {latestInsight.notableShiftInfluencedBy.length} {latestInsight.notableShiftInfluencedBy.length === 1 ? 'reflection' : 'reflections'}:</span>
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {latestInsight.notableShiftInfluencedBy.map((entryId) => {
                      const entry = entriesMap.get(entryId);
                      const title = entry?.title || `Reflection #${entryId.slice(-6)}`;
                      const emoji = entry?.sentiment?.emoji || (entry?.mood ? MOOD_EMOJIS[entry.mood] : '📝');
                      const date = entry?.createdAt
                        ? new Date(entry.createdAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
                        : '';
                      return (
                        <button
                          key={entryId}
                          id={`btn-shift-entry-${entryId}`}
                          onClick={() => onNavigateToEntry?.(entryId)}
                          title={`Navigate to reflection: "${entry?.title || entryId}"`}
                          className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-amber-50/80 dark:bg-amber-950/50 hover:bg-amber-100 dark:hover:bg-amber-900/60 text-amber-950 dark:text-amber-200 border border-amber-200 dark:border-amber-800/80 text-[11px] transition-all hover:scale-[1.02] cursor-pointer font-medium max-w-full truncate shadow-2xs"
                        >
                          <span>{emoji}</span>
                          <span className="truncate max-w-[130px]">{title}</span>
                          {date && <span className="text-[10px] text-amber-700/80 dark:text-amber-400 font-mono">({date})</span>}
                          <ArrowUpRight className="w-3 h-3 text-amber-600 dark:text-amber-400 flex-shrink-0" />
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>

            {/* Actionable Suggestion */}
            <div className="p-6 rounded-3xl bg-indigo-50/70 dark:bg-indigo-950/50 backdrop-blur-xl border border-indigo-200/80 dark:border-indigo-900/60 flex flex-col justify-between space-y-3 shadow-xs">
              <div className="space-y-2.5">
                <div className="flex items-center gap-1.5 text-xs font-semibold text-indigo-900 dark:text-indigo-300 font-mono">
                  <Lightbulb className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                  <span>RECOMMENDED REFLECTION FOCUS</span>
                </div>
                <p className="text-sm text-slate-800 dark:text-slate-100 leading-relaxed font-sans">
                  {latestInsight.suggestion}
                </p>

                <button
                  id="btn-reflect-suggestion"
                  onClick={() => onReflectOnSuggestion(latestInsight.suggestion, 'insight-prompt')}
                  className="inline-flex items-center gap-1.5 text-xs font-bold text-indigo-700 dark:text-indigo-300 hover:text-indigo-900 dark:hover:text-white transition-colors pt-1 cursor-pointer"
                >
                  <span>Write a journal entry on this prompt</span>
                  <ArrowUpRight className="w-3.5 h-3.5" />
                </button>
              </div>

              {/* Suggestion inspiration links */}
              {latestInsight.suggestionInfluencedBy && latestInsight.suggestionInfluencedBy.length > 0 && (
                <div className="pt-3 border-t border-indigo-200/60 dark:border-indigo-900/60 space-y-1.5">
                  <div className="flex items-center gap-1 text-[11px] text-indigo-800/80 dark:text-indigo-300 font-mono font-semibold">
                    <FileText className="w-3 h-3 text-indigo-600 dark:text-indigo-400" />
                    <span>Inspired by {latestInsight.suggestionInfluencedBy.length} {latestInsight.suggestionInfluencedBy.length === 1 ? 'reflection' : 'reflections'}:</span>
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {latestInsight.suggestionInfluencedBy.map((entryId) => {
                      const entry = entriesMap.get(entryId);
                      const title = entry?.title || `Reflection #${entryId.slice(-6)}`;
                      const emoji = entry?.sentiment?.emoji || (entry?.mood ? MOOD_EMOJIS[entry.mood] : '📝');
                      const date = entry?.createdAt
                        ? new Date(entry.createdAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
                        : '';
                      return (
                        <button
                          key={entryId}
                          id={`btn-sugg-entry-${entryId}`}
                          onClick={() => onNavigateToEntry?.(entryId)}
                          title={`Navigate to reflection: "${entry?.title || entryId}"`}
                          className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-white/90 dark:bg-slate-800 hover:bg-white dark:hover:bg-slate-700 text-indigo-900 dark:text-indigo-200 border border-indigo-200 dark:border-slate-700 text-[11px] transition-all hover:scale-[1.02] cursor-pointer font-medium max-w-full truncate shadow-2xs"
                        >
                          <span>{emoji}</span>
                          <span className="truncate max-w-[130px]">{title}</span>
                          {date && <span className="text-[10px] text-indigo-600 dark:text-indigo-400 font-mono">({date})</span>}
                          <ArrowUpRight className="w-3 h-3 text-indigo-500 dark:text-indigo-400 flex-shrink-0" />
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>

          </div>

          {/* Past Insights History Timeline */}
          {insightsHistory.length > 1 && (
            <div className="pt-4 border-t border-slate-200/60 dark:border-slate-800 space-y-3">
              <h4 className="text-xs font-mono font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5" />
                <span>Historical Insight Snapshots ({insightsHistory.length})</span>
              </h4>

              <div className="space-y-2">
                {insightsHistory.slice(1).map((item) => (
                  <div
                    key={item.id}
                    className="p-4 rounded-2xl bg-white/60 dark:bg-slate-900/60 backdrop-blur-md border border-white/80 dark:border-white/10 flex items-center justify-between text-xs text-slate-700 dark:text-slate-300 shadow-xs"
                  >
                    <div>
                      <span className="font-serif font-bold text-slate-800 dark:text-white mr-2">
                        {item.primaryMood}
                      </span>
                      <span className="text-slate-500 dark:text-slate-400 text-[11px]">
                        "{item.overallMoodTrend.slice(0, 70)}..."
                      </span>
                    </div>
                    <span className="text-slate-400 dark:text-slate-500 font-mono text-[10px]">
                      {new Date(item.generatedAt).toLocaleDateString()}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

        </div>
      ) : (
        <div className="bg-white/50 dark:bg-slate-900/50 backdrop-blur-md border border-dashed border-slate-300 dark:border-slate-800 rounded-3xl p-12 text-center text-slate-500 dark:text-slate-400 space-y-3">
          <Brain className="w-10 h-10 text-slate-400 dark:text-slate-600 mx-auto" />
          <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-300 font-serif">No insights generated yet</h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 max-w-sm mx-auto">
            Click "Generate New Insights" above to synthesize emotional trends, recurring themes, and perspective shifts from your journal entries.
          </p>
        </div>
      )}

    </div>
  );
};
