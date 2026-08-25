import React, { useState } from 'react';
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
  Flame
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
}

export const InsightsPanel: React.FC<InsightsPanelProps> = ({
  userId,
  entries,
  profileSummary,
  insightsHistory,
  onReflectOnSuggestion,
}) => {
  const [isGenerating, setIsGenerating] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const latestInsight = insightsHistory[0] || null;

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
            </div>
            <p className="text-xs text-slate-500 mt-1 max-w-2xl">
              On-demand psychological synthesis across your reflections. Generated securely on-demand to respect API quota and privacy.
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
      {latestInsight ? (
        <div className="space-y-6">
          
          {/* Top Mood & Trajectory Card */}
          <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
            
            {/* Trajectory */}
            <div className="md:col-span-8 bg-white/70 backdrop-blur-xl border border-white/80 rounded-3xl p-6 space-y-3 shadow-xs">
              <div className="flex items-center justify-between text-xs text-slate-500 font-mono">
                <span className="flex items-center gap-1.5 text-indigo-700 font-semibold">
                  <TrendingUp className="w-4 h-4" />
                  <span>EMOTIONAL TRAJECTORY</span>
                </span>
                <span>Analyzed {latestInsight.entriesAnalyzedCount} entries</span>
              </div>

              <h3 className="text-base sm:text-lg font-serif font-bold text-slate-900 leading-snug">
                "{latestInsight.overallMoodTrend}"
              </h3>

              <div className="flex items-center gap-2 pt-2 border-t border-slate-200/60">
                <span className="text-xs text-slate-500">Dominant Sentiment:</span>
                <span className="px-3 py-0.5 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-200 text-xs font-semibold font-serif">
                  {latestInsight.primaryMood}
                </span>
              </div>
            </div>

            {/* Sentiment Balance breakdown */}
            <div className="md:col-span-4 bg-white/70 backdrop-blur-xl border border-white/80 rounded-3xl p-6 space-y-3 shadow-xs">
              <div className="text-xs font-semibold font-mono flex items-center gap-1.5 text-emerald-700">
                <BarChart3 className="w-4 h-4" />
                <span>SENTIMENT BALANCE</span>
              </div>

              <div className="space-y-2.5 pt-1 text-xs">
                <div>
                  <div className="flex justify-between text-slate-700 mb-1 font-medium">
                    <span>Positive / Uplifting</span>
                    <span className="font-mono text-slate-500">{latestInsight.sentimentDistribution?.positive || 35}%</span>
                  </div>
                  <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-emerald-500 rounded-full"
                      style={{ width: `${latestInsight.sentimentDistribution?.positive || 35}%` }}
                    />
                  </div>
                </div>

                <div>
                  <div className="flex justify-between text-slate-700 mb-1 font-medium">
                    <span>Deeply Reflective</span>
                    <span className="font-mono text-slate-500">{latestInsight.sentimentDistribution?.reflective || 40}%</span>
                  </div>
                  <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-indigo-500 rounded-full"
                      style={{ width: `${latestInsight.sentimentDistribution?.reflective || 40}%` }}
                    />
                  </div>
                </div>

                <div>
                  <div className="flex justify-between text-slate-700 mb-1 font-medium">
                    <span>Challenging / Tension</span>
                    <span className="font-mono text-slate-500">{latestInsight.sentimentDistribution?.challenging || 25}%</span>
                  </div>
                  <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-rose-500 rounded-full"
                      style={{ width: `${latestInsight.sentimentDistribution?.challenging || 25}%` }}
                    />
                  </div>
                </div>
              </div>
            </div>

          </div>

          {/* Theme Breakdown Cards */}
          <div className="space-y-3">
            <h4 className="text-xs font-mono font-semibold text-slate-500 tracking-wider uppercase flex items-center gap-1.5">
              <Compass className="w-4 h-4 text-slate-400" />
              <span>Core Themes & Focus Areas</span>
            </h4>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {latestInsight.themes && latestInsight.themes.map((th, idx) => (
                <div
                  key={idx}
                  className="p-5 rounded-2xl bg-white/70 backdrop-blur-xl border border-white/80 space-y-2.5 shadow-xs"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-bold font-serif text-slate-800">{th.name}</span>
                    <span className="text-xs font-mono font-semibold text-indigo-700 px-2.5 py-0.5 rounded-full bg-indigo-50 border border-indigo-100">
                      {th.score}% resonance
                    </span>
                  </div>

                  <p className="text-xs text-slate-600 leading-relaxed font-sans">
                    {th.observation}
                  </p>
                </div>
              ))}
            </div>
          </div>

          {/* Notable Shift & Mindful Suggestion */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            
            {/* Shift */}
            <div className="p-6 rounded-3xl bg-white/70 backdrop-blur-xl border border-white/80 space-y-2.5 shadow-xs">
              <div className="flex items-center gap-1.5 text-xs font-semibold text-indigo-700 font-mono">
                <Flame className="w-4 h-4 text-amber-500" />
                <span>NOTABLE PERSPECTIVE SHIFT</span>
              </div>
              <p className="text-sm text-slate-700 leading-relaxed font-serif">
                {latestInsight.notableShift}
              </p>
            </div>

            {/* Actionable Suggestion */}
            <div className="p-6 rounded-3xl bg-indigo-50/70 backdrop-blur-xl border border-indigo-200/80 space-y-3 shadow-xs">
              <div className="flex items-center gap-1.5 text-xs font-semibold text-indigo-900 font-mono">
                <Lightbulb className="w-4 h-4 text-indigo-600" />
                <span>RECOMMENDED REFLECTION FOCUS</span>
              </div>
              <p className="text-sm text-slate-800 leading-relaxed font-sans">
                {latestInsight.suggestion}
              </p>

              <button
                id="btn-reflect-suggestion"
                onClick={() => onReflectOnSuggestion(latestInsight.suggestion, 'insight-prompt')}
                className="flex items-center gap-1.5 text-xs font-bold text-indigo-700 hover:text-indigo-900 transition-colors pt-1 cursor-pointer"
              >
                <span>Write a journal entry on this prompt</span>
                <ArrowUpRight className="w-3.5 h-3.5" />
              </button>
            </div>

          </div>

          {/* Past Insights History Timeline */}
          {insightsHistory.length > 1 && (
            <div className="pt-4 border-t border-slate-200/60 space-y-3">
              <h4 className="text-xs font-mono font-semibold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5" />
                <span>Historical Insight Snapshots ({insightsHistory.length})</span>
              </h4>

              <div className="space-y-2">
                {insightsHistory.slice(1).map((item) => (
                  <div
                    key={item.id}
                    className="p-4 rounded-2xl bg-white/60 backdrop-blur-md border border-white/80 flex items-center justify-between text-xs text-slate-700 shadow-xs"
                  >
                    <div>
                      <span className="font-serif font-bold text-slate-800 mr-2">
                        {item.primaryMood}
                      </span>
                      <span className="text-slate-500 text-[11px]">
                        "{item.overallMoodTrend.slice(0, 70)}..."
                      </span>
                    </div>
                    <span className="text-slate-400 font-mono text-[10px]">
                      {new Date(item.generatedAt).toLocaleDateString()}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

        </div>
      ) : (
        <div className="bg-white/50 backdrop-blur-md border border-dashed border-slate-300 rounded-3xl p-12 text-center text-slate-500 space-y-3">
          <Brain className="w-10 h-10 text-slate-400 mx-auto" />
          <h3 className="text-sm font-semibold text-slate-700 font-serif">No insights generated yet</h3>
          <p className="text-xs text-slate-500 max-w-sm mx-auto">
            Click "Generate New Insights" above to synthesize emotional trends, recurring themes, and perspective shifts from your journal entries.
          </p>
        </div>
      )}

    </div>
  );
};
