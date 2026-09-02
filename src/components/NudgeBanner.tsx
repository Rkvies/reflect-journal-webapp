import React, { useState } from 'react';
import { Sparkles, X, ChevronRight, RefreshCw } from 'lucide-react';
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

  if (!nudge) {
    return null;
  }

  return (
    <div className="bg-indigo-50/60 dark:bg-indigo-950/40 backdrop-blur-xl border-b border-indigo-200/50 dark:border-indigo-900/40 text-slate-800 dark:text-slate-200 px-4 py-3 transition-colors shadow-xs">
      <div className="max-w-5xl mx-auto flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        
        {/* Left: Nudge Content */}
        <div className="flex items-start gap-3">
          <div className="w-7 h-7 rounded-xl bg-indigo-100/80 dark:bg-indigo-900/60 backdrop-blur-md flex items-center justify-center text-indigo-600 dark:text-indigo-400 flex-shrink-0 mt-0.5 border border-indigo-200/60 dark:border-indigo-800/60 shadow-2xs">
            <Sparkles className="w-3.5 h-3.5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-slate-900 dark:text-white font-serif">
                {nudge.title || 'Check-In'}
              </span>
              <span className="text-[10px] px-2 py-0.2 rounded-md bg-white/70 dark:bg-slate-800/70 backdrop-blur-xs text-slate-700 dark:text-slate-300 font-medium border border-white/60 dark:border-slate-700">
                #{nudge.topicTag || 'reflection'}
              </span>
            </div>
            <p className="text-xs text-slate-700 dark:text-slate-300 mt-0.5 font-sans leading-relaxed">
              "{nudge.promptText}"
            </p>
          </div>
        </div>

        {/* Right: Actions */}
        <div className="flex items-center gap-2 self-end sm:self-center flex-shrink-0">
          <button
            id={`btn-reflect-nudge-${nudge.id}`}
            onClick={() => onReflectOnNudge(nudge.promptText, nudge.topicTag)}
            className="flex items-center gap-1 px-3 py-1.5 rounded-xl text-xs font-medium bg-indigo-600 hover:bg-indigo-700 text-white shadow-xs transition-colors cursor-pointer"
          >
            <span>Reflect on this</span>
            <ChevronRight className="w-3.5 h-3.5" />
          </button>

          <button
            id={`btn-refresh-nudge-${nudge.id}`}
            onClick={handleSimulateScheduler}
            disabled={isSimulating || isLoadingNudge}
            title="Refresh check-in prompt"
            className="p-1.5 rounded-xl text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-slate-200/50 dark:hover:bg-slate-800 transition-colors cursor-pointer disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isSimulating || isLoadingNudge ? 'animate-spin' : ''}`} />
          </button>

          <button
            id={`btn-dismiss-nudge-${nudge.id}`}
            onClick={() => onDismiss(nudge.id)}
            title="Dismiss check-in"
            className="p-1.5 rounded-xl text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-200/50 dark:hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>

      </div>
    </div>
  );
};
