import React, { useEffect } from 'react';
import { Sparkles, X } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { MilestoneKey } from '../types';

export interface MilestoneToastData {
  key: MilestoneKey;
  message: string;
  id?: string;
}

interface MilestoneToastProps {
  toast: MilestoneToastData | null;
  onDismiss: () => void;
}

export const MilestoneToast: React.FC<MilestoneToastProps> = ({ toast, onDismiss }) => {
  useEffect(() => {
    if (!toast) return;

    // Auto-dismiss after 4 seconds (~4000ms) as specified
    const timer = setTimeout(() => {
      onDismiss();
    }, 4000);

    return () => clearTimeout(timer);
  }, [toast, onDismiss]);

  return (
    <AnimatePresence>
      {toast && (
        <motion.div
          id="milestone-toast-container"
          role="status"
          aria-live="polite"
          initial={{ opacity: 0, y: 24, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 24, scale: 0.95 }}
          transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
          className="fixed bottom-20 right-4 sm:bottom-6 sm:right-6 z-50 max-w-sm sm:max-w-md pointer-events-auto"
        >
          <div className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-2xl border border-white/80 dark:border-white/10 rounded-2xl p-3.5 sm:p-4 shadow-xl shadow-indigo-500/10 dark:shadow-indigo-950/40 flex items-center gap-3.5 transition-all">
            {/* Subtle Indigo/Sage Spark Badge */}
            <div className="w-8 h-8 rounded-xl bg-indigo-50/80 dark:bg-indigo-950/80 border border-indigo-100 dark:border-indigo-800/80 flex items-center justify-center text-indigo-600 dark:text-indigo-300 shrink-0 shadow-2xs">
              <Sparkles className="w-4 h-4 animate-pulse" />
            </div>

            {/* Milestone Message (exact string, no exclamation marks) */}
            <div className="flex-1 min-w-0 pr-1">
              <p className="text-xs sm:text-sm font-medium text-slate-800 dark:text-slate-100 font-sans leading-snug">
                {toast.message}
              </p>
            </div>

            {/* Optional gentle dismiss button */}
            <button
              type="button"
              onClick={onDismiss}
              aria-label="Dismiss notification"
              className="p-1 rounded-lg text-slate-500 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-white/60 dark:hover:bg-slate-800/60 transition-colors cursor-pointer shrink-0"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

