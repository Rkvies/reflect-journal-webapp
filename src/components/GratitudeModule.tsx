import React, { useState } from 'react';
import { 
  Heart, 
  Sparkles, 
  Plus, 
  Check, 
  Trash2, 
  Calendar, 
  Sun, 
  Smile, 
  BookOpen,
  AlertCircle
} from 'lucide-react';
import { GratitudeEntry } from '../types';

interface GratitudeModuleProps {
  userId: string;
  gratitudeEntries: GratitudeEntry[];
  onSaveGratitude: (entry: GratitudeEntry) => Promise<void>;
  onDeleteGratitude: (entryId: string) => Promise<void>;
}

export const GratitudeModule: React.FC<GratitudeModuleProps> = ({
  userId,
  gratitudeEntries,
  onSaveGratitude,
  onDeleteGratitude,
}) => {
  const todayStr = new Date().toISOString().split('T')[0];
  const existingToday = gratitudeEntries.find(e => e.date === todayStr);

  const [item1, setItem1] = useState(existingToday?.item1 || '');
  const [item2, setItem2] = useState(existingToday?.item2 || '');
  const [item3, setItem3] = useState(existingToday?.item3 || '');
  const [reflection, setReflection] = useState(existingToday?.reflection || '');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!item1.trim() || !item2.trim() || !item3.trim()) {
      setError('Please list all three things you are grateful for today.');
      return;
    }

    try {
      setIsSubmitting(true);
      setError(null);

      const entryId = existingToday?.id || `gratitude-${todayStr}-${Date.now()}`;
      const newEntry: GratitudeEntry = {
        id: entryId,
        userId,
        date: todayStr,
        item1: item1.trim(),
        item2: item2.trim(),
        item3: item3.trim(),
        reflection: reflection.trim(),
        createdAt: existingToday?.createdAt || new Date().toISOString(),
      };

      await onSaveGratitude(newEntry);
      setSuccessMessage('Today’s gratitude saved successfully! ✨');
      setTimeout(() => setSuccessMessage(null), 4000);
    } catch (err: any) {
      console.error('Failed to save gratitude:', err);
      setError(err.message || 'Failed to save gratitude entry.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const streakCount = gratitudeEntries.length;

  return (
    <div className="max-w-4xl mx-auto px-4 py-8 space-y-8 animate-fade-in">
      
      {/* Header Banner */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-amber-500/10 via-teal-500/10 to-indigo-500/10 dark:from-amber-950/30 dark:via-teal-950/20 dark:to-indigo-950/30 border border-amber-200/50 dark:border-amber-900/40 p-6 sm:p-8 shadow-sm">
        <div className="absolute top-0 right-0 -mt-6 -mr-6 w-36 h-36 bg-amber-400/10 dark:bg-amber-600/10 rounded-full blur-2xl pointer-events-none" />
        <div className="relative z-10 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-100 dark:bg-amber-950/80 text-amber-800 dark:text-amber-300 text-xs font-semibold border border-amber-200 dark:border-amber-800">
              <Sun className="w-3.5 h-3.5 text-amber-500" />
              <span>Daily Practice</span>
            </div>
            <h2 className="text-2xl sm:text-3xl font-serif font-bold text-slate-900 dark:text-white tracking-tight">
              Daily Gratitude
            </h2>
            <p className="text-sm text-slate-600 dark:text-slate-300 max-w-xl">
              Cultivate mindfulness by pausing to acknowledge three simple gifts or moments from your day.
            </p>
          </div>

          <div className="flex items-center gap-3 px-4 py-3 rounded-2xl bg-white/80 dark:bg-slate-900/80 backdrop-blur-md border border-slate-200/80 dark:border-slate-800 shadow-xs">
            <div className="p-2 rounded-xl bg-teal-50 dark:bg-teal-950/50 text-teal-600 dark:text-teal-400">
              <Heart className="w-5 h-5 fill-current" />
            </div>
            <div>
              <div className="text-xs font-medium text-slate-500 dark:text-slate-400">Gratitude Streak</div>
              <div className="text-lg font-bold font-serif text-slate-900 dark:text-white">
                {streakCount} {streakCount === 1 ? 'Entry' : 'Entries'}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Form Card */}
      <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/80 dark:border-slate-800 p-6 sm:p-8 shadow-xl">
        <div className="flex items-center justify-between mb-6 pb-4 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-2xl bg-indigo-50 dark:bg-indigo-950/70 border border-indigo-200 dark:border-indigo-800 flex items-center justify-center text-indigo-600 dark:text-indigo-400">
              <Sparkles className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-serif font-bold text-base text-slate-900 dark:text-white">
                What are you grateful for today?
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                {new Date().toLocaleDateString(undefined, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
              </p>
            </div>
          </div>

          {existingToday && (
            <span className="px-3 py-1 rounded-full bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 text-xs font-semibold border border-emerald-200 dark:border-emerald-800 flex items-center gap-1.5">
              <Check className="w-3.5 h-3.5" />
              Completed for Today
            </span>
          )}
        </div>

        {successMessage && (
          <div className="mb-6 p-4 rounded-2xl bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-200 text-xs font-medium flex items-center gap-2 animate-fade-in">
            <Check className="w-4 h-4 shrink-0 text-emerald-600 dark:text-emerald-400" />
            <span>{successMessage}</span>
          </div>
        )}

        {error && (
          <div className="mb-6 p-4 rounded-2xl bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-800 text-rose-800 dark:text-rose-200 text-xs font-medium flex items-center gap-2 animate-fade-in">
            <AlertCircle className="w-4 h-4 shrink-0 text-rose-600 dark:text-rose-400" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="space-y-4">
            {/* Item 1 */}
            <div className="space-y-1.5">
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 font-mono uppercase tracking-wider flex items-center gap-2">
                <span className="w-5 h-5 rounded-full bg-amber-100 dark:bg-amber-950 text-amber-700 dark:text-amber-300 flex items-center justify-center text-[10px] font-bold">1</span>
                First Gratitude
              </label>
              <input
                id="input-gratitude-1"
                type="text"
                value={item1}
                onChange={(e) => setItem1(e.target.value)}
                placeholder="e.g., A warm cup of morning coffee in silence..."
                className="w-full px-4 py-3 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 text-sm focus:outline-none focus:border-amber-500 shadow-xs transition-all"
              />
            </div>

            {/* Item 2 */}
            <div className="space-y-1.5">
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 font-mono uppercase tracking-wider flex items-center gap-2">
                <span className="w-5 h-5 rounded-full bg-teal-100 dark:bg-teal-950 text-teal-700 dark:text-teal-300 flex items-center justify-center text-[10px] font-bold">2</span>
                Second Gratitude
              </label>
              <input
                id="input-gratitude-2"
                type="text"
                value={item2}
                onChange={(e) => setItem2(e.target.value)}
                placeholder="e.g., A meaningful conversation with an old friend..."
                className="w-full px-4 py-3 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 text-sm focus:outline-none focus:border-teal-500 shadow-xs transition-all"
              />
            </div>

            {/* Item 3 */}
            <div className="space-y-1.5">
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 font-mono uppercase tracking-wider flex items-center gap-2">
                <span className="w-5 h-5 rounded-full bg-indigo-100 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300 flex items-center justify-center text-[10px] font-bold">3</span>
                Third Gratitude
              </label>
              <input
                id="input-gratitude-3"
                type="text"
                value={item3}
                onChange={(e) => setItem3(e.target.value)}
                placeholder="e.g., Progress on a personal project that made me smile..."
                className="w-full px-4 py-3 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 text-sm focus:outline-none focus:border-indigo-500 shadow-xs transition-all"
              />
            </div>

            {/* Optional Reflection */}
            <div className="space-y-1.5 pt-2">
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 font-mono uppercase tracking-wider">
                Daily Reflection Note (Optional)
              </label>
              <textarea
                id="textarea-gratitude-reflection"
                rows={3}
                value={reflection}
                onChange={(e) => setReflection(e.target.value)}
                placeholder="How did noticing these things make you feel today?"
                className="w-full p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 text-xs sm:text-sm focus:outline-none focus:border-indigo-500 resize-none shadow-xs"
              />
            </div>
          </div>

          <div className="flex items-center justify-end pt-2">
            <button
              id="btn-save-gratitude"
              type="submit"
              disabled={isSubmitting}
              className="px-6 py-3 rounded-2xl text-xs sm:text-sm font-semibold bg-indigo-600 hover:bg-indigo-700 text-white shadow-md shadow-indigo-600/25 transition-all flex items-center gap-2 cursor-pointer disabled:opacity-50"
            >
              <Heart className={`w-4 h-4 fill-current ${isSubmitting ? 'animate-pulse' : ''}`} />
              <span>{isSubmitting ? 'Saving Gratitude...' : (existingToday ? 'Update Today’s Gratitude' : 'Save Today’s Gratitude')}</span>
            </button>
          </div>
        </form>
      </div>

      {/* Gratitude History Section */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="font-serif font-bold text-lg text-slate-900 dark:text-white flex items-center gap-2">
            <Calendar className="w-5 h-5 text-indigo-500" />
            <span>Gratitude Archive</span>
          </h3>
          <span className="text-xs font-medium text-slate-500 dark:text-slate-400">
            {gratitudeEntries.length} {gratitudeEntries.length === 1 ? 'entry' : 'entries'} recorded
          </span>
        </div>

        {gratitudeEntries.length === 0 ? (
          <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-300 dark:border-slate-700 p-12 text-center shadow-xs">
            <div className="w-12 h-12 rounded-2xl bg-indigo-50 dark:bg-indigo-950 flex items-center justify-center mx-auto mb-3 text-indigo-500 border border-indigo-100 dark:border-indigo-800">
              <Heart className="w-6 h-6" />
            </div>
            <h4 className="text-sm font-semibold text-slate-800 dark:text-slate-200">No gratitude entries yet</h4>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-sm mx-auto">
              Start your daily practice above by listing three things you are grateful for today.
            </p>
            <button
              id="btn-gratitude-empty-cta"
              onClick={() => {
                const el = document.getElementById('gratitude-form');
                if (el) {
                  el.scrollIntoView({ behavior: 'smooth', block: 'center' });
                }
                const inputEl = document.getElementById('input-gratitude-1') as HTMLInputElement;
                if (inputEl) {
                  inputEl.focus();
                }
              }}
              className="mt-5 px-5 py-2.5 rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold shadow-md shadow-indigo-600/20 transition-all flex items-center justify-center gap-2 mx-auto cursor-pointer"
            >
              <Heart className="w-4 h-4 text-amber-300 fill-current" />
              <span>Record First Gratitude</span>
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {gratitudeEntries.map((entry) => (
              <div 
                key={entry.id}
                className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/80 dark:border-slate-800 p-6 shadow-xs flex flex-col justify-between space-y-4 hover:border-indigo-300 dark:hover:border-indigo-800 transition-all group"
              >
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold px-3 py-1 rounded-full bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 border border-indigo-100 dark:border-indigo-900 font-mono">
                      {entry.date}
                    </span>
                    <button
                      onClick={() => onDeleteGratitude(entry.id)}
                      className="p-1.5 rounded-xl text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/50 opacity-0 group-hover:opacity-100 transition-all cursor-pointer"
                      title="Delete gratitude entry"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>

                  <ul className="space-y-2 text-xs sm:text-sm text-slate-700 dark:text-slate-200">
                    <li className="flex items-start gap-2">
                      <span className="w-4 h-4 rounded-full bg-amber-100 dark:bg-amber-950 text-amber-700 dark:text-amber-300 flex items-center justify-center text-[10px] font-bold shrink-0 mt-0.5">1</span>
                      <span className="leading-snug">{entry.item1}</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="w-4 h-4 rounded-full bg-teal-100 dark:bg-teal-950 text-teal-700 dark:text-teal-300 flex items-center justify-center text-[10px] font-bold shrink-0 mt-0.5">2</span>
                      <span className="leading-snug">{entry.item2}</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="w-4 h-4 rounded-full bg-indigo-100 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300 flex items-center justify-center text-[10px] font-bold shrink-0 mt-0.5">3</span>
                      <span className="leading-snug">{entry.item3}</span>
                    </li>
                  </ul>

                  {entry.reflection && (
                    <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800 text-xs text-slate-600 dark:text-slate-300 italic">
                      "{entry.reflection}"
                    </div>
                  )}
                </div>

                <div className="pt-2 border-t border-slate-100 dark:border-slate-800 text-[10px] text-slate-400 font-mono flex items-center justify-between">
                  <span>Saved {new Date(entry.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                  <Heart className="w-3.5 h-3.5 text-teal-500 fill-current" />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

    </div>
  );
};
