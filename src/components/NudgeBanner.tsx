import React, { useState } from 'react';
import { Sparkles, X, ChevronRight, RefreshCw } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { ProactiveNudge } from '../types';

interface NudgeBannerProps {
  nudge: ProactiveNudge | null;
  onDismiss: (nudgeId: string) => void;
  onReflectOnNudge: (promptText: string, topicTag: string) => void;
  onTriggerNewNudge: () => Promise<void>;
  isLoadingNudge?: boolean;
}

export const NudgeBanner: React.FC<NudgeBannerProps> = ({
  nudge,
  onDismiss,
  onReflectOnNudge,
  onTriggerNewNudge,
  isLoadingNudge = false,
}) => {
  const [isSimulating, setIsSimulating] = useState(false);

  const handleSimulateScheduler = async () => {
    setIsSimulating(true);
    try {
      await onTriggerNewNudge();
    } finally {
      setIsSimulating(false);
    }
  };

  return (
    <AnimatePresence mode="wait">
      {nudge && (
        <motion.div
          key={nudge.id}
          initial={{ opacity: 0, y: -6, filter: 'blur(3px)' }}
          animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
          exit={{ opacity: 0, y: -6, filter: 'blur(3px)' }}
          transition={{
            opacity: { duration: 0.6, ease: 'easeOut' },
            filter: { duration: 0.5, ease: 'easeOut' },
            y: { duration: 0.45, ease: [0.16, 1, 0.3, 1] },
          }}
          className="overflow-hidden"
        >
          <motion.div
            animate={{
              boxShadow: [
                '0 1px 2px 0 rgba(99, 102, 241, 0.05)',
                '0 4px 16px -2px rgba(99, 102, 241, 0.18)',
                '0 1px 2px 0 rgba(99, 102, 241, 0.05)',
              ],
            }}
            transition={{
              duration: 3,
              repeat: Infinity,
              ease: 'easeInOut',
            }}
            className="bg-indigo-50/70 dark:bg-indigo-950/50 backdrop-blur-xl border-b border-indigo-200/60 dark:border-indigo-900/50 text-slate-800 dark:text-slate-200 px-3 sm:px-4 py-2.5 sm:py-3 transition-colors shadow-xs relative"
          >
            <div className="max-w-5xl mx-auto flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 sm:gap-3">
              
              {/* Left: Nudge Content */}
              <div className="flex items-start gap-3">
                {/* Icon Badge with Gentle Motion & Pulse Halo */}
                <div className="relative flex-shrink-0 mt-0.5">
                  <span className="absolute inset-0 rounded-xl bg-indigo-400/30 dark:bg-indigo-400/20 animate-ping opacity-25 pointer-events-none" />
                  <motion.div
                    animate={{
                      scale: [1, 1.08, 1],
                    }}
                    transition={{
                      duration: 2.8,
                      repeat: Infinity,
                      ease: 'easeInOut',
                    }}
                    className="relative w-7 h-7 rounded-xl bg-indigo-100/90 dark:bg-indigo-900/70 backdrop-blur-md flex items-center justify-center text-indigo-600 dark:text-indigo-300 border border-indigo-200/80 dark:border-indigo-800/80 shadow-2xs"
                  >
                    <Sparkles className="w-3.5 h-3.5" />
                  </motion.div>
                </div>

                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-semibold text-slate-900 dark:text-white font-serif">
                      {nudge.title || 'Check-In'}
                    </span>
                    <span className="text-[10px] px-2 py-0.2 rounded-md bg-white/80 dark:bg-slate-800/80 backdrop-blur-xs text-indigo-900 dark:text-indigo-200 font-medium border border-indigo-100 dark:border-slate-700">
                      #{nudge.topicTag || 'reflection'}
                    </span>
                  </div>
                  <p className="text-xs text-slate-700 dark:text-slate-200 mt-0.5 font-sans leading-relaxed">
                    "{nudge.promptText}"
                  </p>
                </div>
              </div>

              {/* Right: Actions */}
              <div className="flex items-center gap-2 self-end sm:self-center flex-shrink-0">
                <button
                  id={`btn-reflect-nudge-${nudge.id}`}
                  onClick={() => onReflectOnNudge(nudge.promptText, nudge.topicTag)}
                  className="flex items-center gap-1 px-3 py-1.5 rounded-xl text-xs font-medium bg-indigo-600 hover:bg-indigo-700 text-white shadow-xs transition-colors cursor-pointer active:scale-95"
                >
                  <span>Reflect on this</span>
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>

                <button
                  id={`btn-refresh-nudge-${nudge.id}`}
                  onClick={handleSimulateScheduler}
                  disabled={isSimulating || isLoadingNudge}
                  title="Refresh check-in prompt"
                  className="p-1.5 rounded-xl text-slate-500 hover:text-indigo-600 dark:hover:text-indigo-600 hover:bg-slate-200/50 dark:hover:bg-slate-800 transition-colors cursor-pointer disabled:opacity-50"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${isSimulating || isLoadingNudge ? 'animate-spin' : ''}`} />
                </button>

                <button
                  id={`btn-dismiss-nudge-${nudge.id}`}
                  onClick={() => onDismiss(nudge.id)}
                  title="Dismiss check-in"
                  className="p-1.5 rounded-xl text-slate-500 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-200/50 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>

            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
