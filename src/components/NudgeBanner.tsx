import React, { useState } from 'react';
import { Sparkles, X, Clock, RefreshCw, ChevronRight } from 'lucide-react';
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
    return (
      <div className="bg-white/40 dark:bg-slate-900/50 backdrop-blur-md border-b border-white/50 dark:border-slate-800 px-4 py-2.5 transition-colors">
        <div className="max-w-7xl mx-auto flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
          <div className="flex items-center gap-2">
            <Clock className="w-3.5 h-3.5 text-indigo-500 dark:text-indigo-400" />
            <span>Agentic Nudge Monitor (Cloud Scheduler): Ready</span>
          </div>
          <button
            id="btn-simulate-scheduler-cron"
            onClick={handleSimulateScheduler}
            disabled={isSimulating || isLoadingNudge}
            className="flex items-center gap-1.5 text-indigo-700 dark:text-indigo-400 hover:text-indigo-900 dark:hover:text-indigo-200 font-semibold transition-colors disabled:opacity-50 cursor-pointer"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isSimulating ? 'animate-spin' : ''}`} />
            <span>{isSimulating ? 'Evaluating recent patterns...' : 'Simulate Proactive Check-in'}</span>
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-gradient-to-r from-amber-500/10 via-white/70 to-indigo-500/10 dark:from-amber-500/15 dark:via-slate-900/80 dark:to-indigo-500/15 backdrop-blur-xl border-b border-amber-300/40 dark:border-amber-500/20 text-slate-800 dark:text-slate-100 px-4 py-3.5 shadow-sm transition-colors">
      <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        
        {/* Left: Nudge Content */}
        <div className="flex items-start gap-3">
          <div className="w-8 h-8 rounded-xl bg-amber-500/20 border border-amber-500/30 flex items-center justify-center text-amber-700 dark:text-amber-300 flex-shrink-0 mt-0.5 shadow-inner">
            <Sparkles className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-amber-900 dark:text-amber-300 font-serif tracking-wide">
                {nudge.title || 'Proactive Check-In'}
              </span>
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-100/80 dark:bg-amber-950/70 text-amber-800 dark:text-amber-300 border border-amber-200 dark:border-amber-800 font-medium">
                #{nudge.topicTag || 'reflection'}
              </span>
              <span className="text-[10px] text-slate-500 dark:text-slate-400 hidden md:inline">
                {new Date(nudge.createdAt).toLocaleDateString()}
              </span>
            </div>
            <p className="text-xs sm:text-sm text-slate-700 dark:text-slate-200 mt-0.5 font-sans leading-relaxed">
              "{nudge.promptText}"
            </p>
          </div>
        </div>

        {/* Right: Actions */}
        <div className="flex items-center gap-2 self-end sm:self-center flex-shrink-0">
          <button
            id={`btn-reflect-nudge-${nudge.id}`}
            onClick={() => onReflectOnNudge(nudge.promptText, nudge.topicTag)}
            className="flex items-center gap-1 px-3.5 py-1.5 rounded-xl text-xs font-semibold bg-amber-500 hover:bg-amber-600 text-slate-950 shadow-sm transition-all cursor-pointer"
          >
            <span>Reflect on this</span>
            <ChevronRight className="w-3.5 h-3.5" />
          </button>

          <button
            id={`btn-dismiss-nudge-${nudge.id}`}
            onClick={() => onDismiss(nudge.id)}
            title="Dismiss check-in"
            className="p-1.5 rounded-xl text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-200/50 dark:hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

      </div>
    </div>
  );
};
