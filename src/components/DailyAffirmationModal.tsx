import React, { useState, useEffect } from 'react';
import { Sparkles, Heart, X, Copy, Check, Feather, Compass, Loader2 } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { JournalEntry, ProfileSummary } from '../types';
import { requestDailyAffirmation } from '../lib/api';

interface DailyAffirmationModalProps {
  isOpen: boolean;
  onClose: () => void;
  entries?: JournalEntry[];
  profileSummary?: ProfileSummary | null;
  onUseAsPrompt?: (promptText: string, topicTag: string) => void;
}

interface AffirmationData {
  affirmation: string;
  theme: string;
  explanation: string;
  promptText: string;
}

export const DailyAffirmationModal: React.FC<DailyAffirmationModalProps> = ({
  isOpen,
  onClose,
  entries = [],
  profileSummary = null,
  onUseAsPrompt,
}) => {
  const [affirmationData, setAffirmationData] = useState<AffirmationData | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [copied, setCopied] = useState<boolean>(false);

  const entriesRef = React.useRef(entries);
  entriesRef.current = entries;
  const profileSummaryRef = React.useRef(profileSummary);
  profileSummaryRef.current = profileSummary;
  const onCloseRef = React.useRef(onClose);
  onCloseRef.current = onClose;

  useEffect(() => {
    if (!isOpen) return;

    let isMounted = true;
    // Only load if not already loaded for this opening
    if (!affirmationData) {
      setIsLoading(true);
      setCopied(false);

      const loadAffirmation = async () => {
        try {
          const res = await requestDailyAffirmation({
            entries: entriesRef.current,
            profileSummary: profileSummaryRef.current,
          });
          if (isMounted) {
            setAffirmationData(res);
          }
        } catch (err) {
          console.warn('Failed to load personalized affirmation:', err);
          if (isMounted) {
            setAffirmationData({
              affirmation: "I am worthy of peace, clarity, and gentle growth. Each step forward, no matter how small, is a victory.",
              theme: "Self-Compassion & Grace",
              explanation: "Crafted to support your ongoing journey of intentional reflection and inner calm.",
              promptText: "What is one small kindness I can offer myself today?"
            });
          }
        } finally {
          if (isMounted) {
            setIsLoading(false);
          }
        }
      };

      loadAffirmation();
    }

    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onCloseRef.current();
    };
    document.addEventListener('keydown', handleEscape);
    document.body.style.overflow = 'hidden';

    return () => {
      isMounted = false;
      document.removeEventListener('keydown', handleEscape);
      document.body.style.overflow = 'unset';
    };
  }, [isOpen]);

  const handleCopy = () => {
    if (!affirmationData?.affirmation) return;
    navigator.clipboard.writeText(`"${affirmationData.affirmation}" — Daily Affirmation`);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleUsePrompt = () => {
    if (!affirmationData || !onUseAsPrompt) return;
    const promptToUse = affirmationData.promptText || `Reflecting on my daily affirmation: "${affirmationData.affirmation}"`;
    onUseAsPrompt(promptToUse, affirmationData.theme || 'Affirmation');
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.25 }}
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 dark:bg-black/70 backdrop-blur-md"
          role="dialog"
          aria-modal="true"
          aria-labelledby="daily-affirmation-title"
          aria-describedby="daily-affirmation-desc"
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 12 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 12 }}
            transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
            className="bg-white/85 dark:bg-slate-900/85 backdrop-blur-2xl rounded-3xl border border-white/80 dark:border-white/10 shadow-2xl max-w-lg w-full p-6 sm:p-8 relative overflow-hidden text-slate-800 dark:text-slate-100 transition-all"
          >
            {/* Decorative background ambient glows */}
            <div className="absolute -top-24 -right-24 w-56 h-56 bg-amber-500/15 dark:bg-amber-500/10 rounded-full blur-3xl pointer-events-none" aria-hidden="true" />
            <div className="absolute -bottom-24 -left-24 w-56 h-56 bg-rose-500/15 dark:bg-rose-500/10 rounded-full blur-3xl pointer-events-none" aria-hidden="true" />

            {/* Modal Header */}
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-amber-100 to-rose-100 dark:from-amber-950/80 dark:to-rose-950/80 border border-amber-200/80 dark:border-amber-800/80 flex items-center justify-center text-amber-600 dark:text-amber-300 shadow-2xs">
                  <Sparkles className="w-5 h-5" />
                </div>
                <div>
                  <span className="text-[11px] font-bold tracking-wider uppercase text-amber-600 dark:text-amber-300">Personalized Insights</span>
                  <h3 id="daily-affirmation-title" className="font-serif text-lg font-bold text-slate-900 dark:text-slate-100">
                    Daily Affirmation
                  </h3>
                </div>
              </div>
              <button
                type="button"
                onClick={onClose}
                className="w-8 h-8 rounded-full flex items-center justify-center text-slate-500 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-white/60 dark:hover:bg-slate-800/60 transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500 active:scale-95"
                aria-label="Close daily affirmation dialog"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

        {/* Main Content Area */}
        {isLoading ? (
          <div className="py-12 flex flex-col items-center justify-center text-center space-y-4">
            <div className="relative">
              <div className="w-12 h-12 rounded-2xl bg-amber-50 dark:bg-amber-950/50 border border-amber-200/80 dark:border-amber-800/80 flex items-center justify-center text-amber-600 dark:text-amber-300 animate-pulse">
                <Heart className="w-6 h-6 animate-spin" />
              </div>
            </div>
            <div className="space-y-1">
              <p className="text-sm font-semibold text-slate-700 dark:text-slate-200">Crafting Your Affirmation...</p>
              <p className="text-xs text-slate-600 dark:text-slate-300">Synthesizing your recent reflections from Firestore</p>
            </div>
          </div>
        ) : affirmationData ? (
          <div className="space-y-5 my-2">
            {/* Theme pill */}
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-50 dark:bg-amber-950/60 border border-amber-200/80 dark:border-amber-800/80 text-amber-700 dark:text-amber-300 text-xs font-semibold">
              <Compass className="w-3.5 h-3.5 text-amber-600" />
              <span>{affirmationData.theme}</span>
            </div>

            {/* Core Affirmation Quote */}
            <div className="p-5 sm:p-6 rounded-2xl bg-gradient-to-br from-amber-50/70 via-rose-50/40 to-indigo-50/50 dark:from-amber-950/30 dark:via-rose-950/20 dark:to-slate-900/50 border border-amber-200/60 dark:border-amber-800/40 relative shadow-2xs">
              <p id="daily-affirmation-desc" className="font-serif text-xl sm:text-2xl leading-relaxed font-semibold text-slate-900 dark:text-slate-100 italic">
                &ldquo;{affirmationData.affirmation}&rdquo;
              </p>
            </div>

            {/* Pattern Connection Context */}
            {affirmationData.explanation && (
              <div className="p-3.5 rounded-xl bg-slate-100/80 dark:bg-slate-800/60 border border-slate-200/70 dark:border-slate-700/60 text-xs text-slate-700 dark:text-slate-200 flex items-start gap-2.5">
                <Heart className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                <p className="leading-normal">{affirmationData.explanation}</p>
              </div>
            )}
          </div>
        ) : null}

        {/* Modal Footer Actions */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5 pt-5 border-t border-slate-200/70 dark:border-slate-800/80">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleCopy}
              disabled={isLoading || !affirmationData}
              className="flex-1 sm:flex-none px-3.5 py-2 rounded-xl text-xs font-semibold border border-slate-200/80 dark:border-slate-700/80 bg-white/70 dark:bg-slate-800/70 hover:bg-slate-100 dark:hover:bg-slate-700/70 text-slate-700 dark:text-slate-200 transition-colors flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
              title="Copy affirmation to clipboard"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5 text-slate-500" />}
              <span>{copied ? 'Copied' : 'Copy'}</span>
            </button>

            {onUseAsPrompt && affirmationData && (
              <button
                type="button"
                onClick={handleUsePrompt}
                disabled={isLoading}
                className="flex-1 sm:flex-none px-3.5 py-2 rounded-xl text-xs font-semibold border border-amber-200/80 dark:border-amber-800/80 bg-amber-50/80 dark:bg-amber-950/60 hover:bg-amber-100/80 dark:hover:bg-amber-900/60 text-amber-800 dark:text-amber-200 transition-colors flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
                title="Write a journal entry based on this prompt"
              >
                <Feather className="w-3.5 h-3.5 text-amber-600 dark:text-amber-300" />
                <span>Write About This</span>
              </button>
            )}
          </div>

          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2.5 rounded-xl text-xs font-semibold bg-indigo-600 hover:bg-indigo-700 text-white shadow-md shadow-indigo-500/20 transition-all cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 active:scale-95"
          >
            Continue to Journal
          </button>
        </div>
      </motion.div>
    </motion.div>
  )}
</AnimatePresence>
  );
};
