import React, { useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { X, Sparkles, ArrowRight, BrainCircuit } from 'lucide-react';
import { WeeklyReflectionReport } from '../types';

interface WeeklyReflectionModalProps {
  isOpen: boolean;
  onClose: () => void;
  summary: WeeklyReflectionReport | null;
  onReflectOnPrompt?: (prompt: string, tag: string) => void;
}

export const WeeklyReflectionModal: React.FC<WeeklyReflectionModalProps> = ({
  isOpen,
  onClose,
  summary,
  onReflectOnPrompt,
}) => {
  const modalRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
      document.body.style.overflow = 'hidden';
    }
    return () => {
      document.removeEventListener('keydown', handleEscape);
      document.body.style.overflow = 'unset';
    };
  }, [isOpen, onClose]);

  if (!isOpen || !summary) return null;

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-slate-900/40 dark:bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div 
        ref={modalRef}
        className="w-full max-w-2xl bg-white dark:bg-slate-900 rounded-3xl shadow-xl border border-slate-200/50 dark:border-slate-800 flex flex-col max-h-[90vh] overflow-hidden animate-in zoom-in-95 duration-200"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl bg-indigo-50 dark:bg-indigo-900/50 flex items-center justify-center text-indigo-600 dark:text-indigo-400">
              <Sparkles className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-bold font-serif text-slate-800 dark:text-slate-100">Your Week in Reflection</h2>
              <p className="text-[11px] font-sans text-slate-500 dark:text-slate-400">
                {summary.weekRange} • {summary.entryCount} {summary.entryCount === 1 ? 'reflection' : 'reflections'}
              </p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content Body */}
        <div className="overflow-y-auto p-6 space-y-6 custom-scrollbar">
          
          {/* Highlights bar */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
            <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800/80">
              <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">Dominant Mood & Trend</span>
              <p className="font-semibold text-slate-800 dark:text-slate-200 mt-1">
                {summary.dominantMood}
              </p>
              <p className="text-slate-600 dark:text-slate-400 text-xs italic mt-0.5">"{summary.moodTrend}"</p>
            </div>
            
            <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800/80">
              <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">Weekly Themes</span>
              <div className="flex flex-wrap items-center gap-2 mt-1.5">
                {summary.topThemes.map((themeName, idx) => (
                  <span
                    key={idx}
                    className="text-xs px-2.5 py-1 rounded-md bg-white dark:bg-slate-900 border border-slate-200/60 dark:border-slate-700 text-slate-700 dark:text-slate-300 font-medium shadow-2xs"
                  >
                    #{themeName}
                  </span>
                ))}
              </div>
            </div>
          </div>

          {/* Narrative Summary */}
          <div className="space-y-2">
            <h3 className="text-xs font-semibold text-slate-800 dark:text-slate-200 font-serif flex items-center gap-1.5">
              <BrainCircuit className="w-3.5 h-3.5 text-indigo-500" />
              <span>Weekly Synthesis</span>
            </h3>
            <div className="p-5 rounded-2xl bg-indigo-50/40 dark:bg-indigo-950/20 border border-indigo-100/50 dark:border-indigo-900/30 text-slate-700 dark:text-slate-200 leading-relaxed font-serif text-sm">
              {summary.weekSummary}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Key Moments */}
            {summary.highlights && summary.highlights.length > 0 && (
              <div className="space-y-2">
                <h3 className="text-xs font-semibold text-slate-800 dark:text-slate-200 font-serif">Key Moments & Wins</h3>
                <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800/80 h-full">
                  <ul className="space-y-2.5 text-xs text-slate-600 dark:text-slate-300">
                    {summary.highlights.map((h, i) => (
                      <li key={i} className="flex items-start gap-2">
                        <span className="text-indigo-500 dark:text-indigo-400 mt-0.5">•</span>
                        <span className="leading-relaxed">{h}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            )}
            
            {/* Horizon Takeaway */}
            <div className="space-y-2">
               <h3 className="text-xs font-semibold text-slate-800 dark:text-slate-200 font-serif">Horizon Takeaway</h3>
               <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800/80 flex flex-col justify-between h-full gap-3">
                 <p className="text-slate-700 dark:text-slate-300 text-sm italic leading-relaxed font-serif">
                   "{summary.keyTakeaway}"
                 </p>
                 {onReflectOnPrompt && (
                   <button
                     id="btn-weekly-modal-reflect"
                     type="button"
                     onClick={() => {
                       onClose();
                       onReflectOnPrompt(`Reflecting on my weekly takeaway: "${summary.keyTakeaway}"`, 'weekly_takeaway');
                     }}
                     className="text-xs font-medium text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 dark:hover:text-indigo-300 hover:underline flex items-center gap-1.5 self-start cursor-pointer transition-colors"
                   >
                     <span>Reflect on this takeaway</span>
                     <ArrowRight className="w-3.5 h-3.5" />
                   </button>
                 )}
               </div>
            </div>
          </div>
          
        </div>
      </div>
    </div>,
    document.body
  );
};
