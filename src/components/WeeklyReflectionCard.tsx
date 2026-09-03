import React, { useMemo, useState } from 'react';
import { Calendar, Sparkles, RefreshCw, Eye } from 'lucide-react';
import { JournalEntry, ProfileSummary, WeeklyReflectionReport } from '../types';
import { requestWeeklySummary } from '../lib/api';
import { saveWeeklySummary } from '../lib/firebase';
import { WeeklyReflectionModal } from './WeeklyReflectionModal';

interface WeeklyReflectionCardProps {
  userId: string;
  entries: JournalEntry[];
  profileSummary: ProfileSummary | null;
  cachedWeeklySummary: WeeklyReflectionReport | null;
  onStartEntry: () => void;
  onReflectOnPrompt?: (prompt: string, tag: string) => void;
  onWeeklySummaryGenerated?: (report: WeeklyReflectionReport) => void;
}

export const WeeklyReflectionCard: React.FC<WeeklyReflectionCardProps> = ({
  userId,
  entries,
  profileSummary,
  cachedWeeklySummary,
  onStartEntry,
  onReflectOnPrompt,
  onWeeklySummaryGenerated,
}) => {
  const [isGenerating, setIsGenerating] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Active entries in the past 7 days (local time buffer)
  const recent7DayEntries = useMemo(() => {
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    sevenDaysAgo.setHours(0, 0, 0, 0);

    return entries.filter((e) => {
      if (!e.createdAt) return false;
      const entryDate = new Date(e.createdAt);
      return entryDate >= sevenDaysAgo;
    });
  }, [entries]);

  const activeDaysCount = useMemo(() => {
    const daysSet = new Set(
      recent7DayEntries.map((e) => {
        const d = new Date(e.createdAt!);
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
      onWeeklySummaryGenerated?.(newSummaryReport);
      // Automatically open the modal once generated successfully
      setIsModalOpen(true);
    } catch (err: any) {
      console.error('Failed to generate weekly summary:', err);
      setErrorMessage(err.message || 'Unable to synthesize weekly recap. Please try again.');
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <>
      <div 
        id="card-weekly-reflection-intro"
        className="bg-white/75 dark:bg-slate-900/75 backdrop-blur-2xl border border-white/80 dark:border-white/10 rounded-3xl p-5 sm:p-6 shadow-sm hover:shadow-lg transition-all"
      >
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-base font-serif font-semibold text-slate-900 dark:text-white">
                Your Week in Reflection
              </h3>
              <span className="text-[11px] font-mono px-2.5 py-0.5 rounded-full bg-white/60 dark:bg-slate-800/60 backdrop-blur-xs text-slate-700 dark:text-slate-300 font-medium border border-white/70 dark:border-white/10">
                {recent7DayEntries.length} {recent7DayEntries.length === 1 ? 'entry' : 'entries'} • {activeDaysCount} {activeDaysCount === 1 ? 'active day' : 'active days'}
              </span>
            </div>
            <p className="text-xs text-slate-600 dark:text-slate-300 mt-1 max-w-xl leading-relaxed">
              Synthesize your reflections over the past 7 days to uncover personal breakthroughs and weekly emotional trends.
            </p>
          </div>
          
          <div className="flex items-center gap-3 self-end sm:self-center">
            {cachedWeeklySummary && !isGenerating && (
              <button
                id="btn-view-weekly-summary"
                type="button"
                onClick={() => setIsModalOpen(true)}
                className="flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold bg-white/60 hover:bg-white/80 dark:bg-slate-800/60 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 border border-white/70 dark:border-white/10 shadow-2xs transition-colors cursor-pointer"
              >
                <Eye className="w-3.5 h-3.5" />
                <span>View Latest Recap</span>
              </button>
            )}
            <button
              id="btn-generate-weekly-summary"
              type="button"
              onClick={handleGenerateWeeklySummary}
              disabled={isGenerating}
              className="flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold bg-indigo-600 hover:bg-indigo-700 text-white shadow-md shadow-indigo-600/20 transition-colors cursor-pointer disabled:opacity-50"
            >
              <Sparkles className={`w-3.5 h-3.5 ${isGenerating ? 'animate-spark-glimmer' : ''}`} />
              <span>{isGenerating ? 'Synthesizing...' : (cachedWeeklySummary ? 'Refresh Recap' : 'Generate Weekly Recap')}</span>
            </button>
          </div>
        </div>

        {errorMessage && (
          <div className="mt-4 p-3 rounded-2xl bg-rose-50/80 dark:bg-rose-950/60 backdrop-blur-md border border-rose-200/80 dark:border-rose-900/60 text-xs text-rose-700 dark:text-rose-300">
            {errorMessage}
          </div>
        )}
      </div>

      {/* The Modal */}
      <WeeklyReflectionModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        summary={cachedWeeklySummary}
        onReflectOnPrompt={onReflectOnPrompt}
      />
    </>
  );
};
