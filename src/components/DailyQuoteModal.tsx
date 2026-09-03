import React, { useState, useEffect, useRef } from 'react';
import { Sparkles, X, Quote } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { getDailyQuoteForDate, QuoteItem } from '../data/quotes';

interface DailyQuoteModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const DailyQuoteModal: React.FC<DailyQuoteModalProps> = ({ isOpen, onClose }) => {
  // Stable, deterministic quote for today - never flickers or changes during the session
  const [quote] = useState<QuoteItem>(() => getDailyQuoteForDate());
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  useEffect(() => {
    if (!isOpen) return;

    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onCloseRef.current();
    };
    document.addEventListener('keydown', handleEscape);
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', handleEscape);
      document.body.style.overflow = 'unset';
    };
  }, [isOpen]);

  return (
    <AnimatePresence>
      {isOpen && quote && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.25 }}
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 dark:bg-black/70 backdrop-blur-md"
          role="dialog"
          aria-modal="true"
          aria-labelledby="daily-quote-title"
          aria-describedby="daily-quote-desc"
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 12 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 12 }}
            transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
            className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-2xl rounded-3xl border border-white/80 dark:border-white/10 shadow-2xl max-w-lg w-full p-8 relative overflow-hidden text-slate-800 dark:text-slate-100 transition-all"
          >
            {/* Decorative background ambient glow */}
            <div className="absolute -top-24 -right-24 w-48 h-48 bg-indigo-500/15 dark:bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" aria-hidden="true" />
            <div className="absolute -bottom-24 -left-24 w-48 h-48 bg-purple-500/15 dark:bg-purple-500/10 rounded-full blur-3xl pointer-events-none" aria-hidden="true" />

            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-2xl bg-indigo-50/80 dark:bg-indigo-950/60 border border-indigo-200/80 dark:border-indigo-800/80 flex items-center justify-center text-indigo-600 dark:text-indigo-300 shadow-2xs" aria-hidden="true">
                  <Sparkles className="w-4 h-4" />
                </div>
                <div>
                  <span className="text-xs font-semibold tracking-wider uppercase text-indigo-600 dark:text-indigo-300">Daily Reflection</span>
                  <h3 id="daily-quote-title" className="font-serif text-lg font-bold">Thought for Today</h3>
                </div>
              </div>
              <button
                type="button"
                onClick={onClose}
                className="w-8 h-8 rounded-full flex items-center justify-center text-slate-500 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-white/60 dark:hover:bg-slate-800/60 transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 active:scale-95"
                aria-label="Close daily quote dialog"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="my-6 relative pl-6 border-l-2 border-indigo-500/40">
              <Quote className="absolute -top-3 -left-3 w-6 h-6 text-indigo-600/20 dark:text-indigo-300/10 pointer-events-none" aria-hidden="true" />
              <p id="daily-quote-desc" className="font-serif text-xl md:text-2xl leading-relaxed text-slate-900 dark:text-slate-100 italic mb-4">
                &ldquo;{quote.quote}&rdquo;
              </p>
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-slate-700 dark:text-slate-200">
                  — {quote.author}
                </span>
                <span className="text-xs px-2.5 py-1 rounded-full bg-white/60 dark:bg-slate-800/60 border border-white/80 dark:border-white/10 text-slate-700 dark:text-slate-200 font-medium">
                  {quote.theme}
                </span>
              </div>
            </div>

            <div className="flex items-center justify-end pt-4 border-t border-white/60 dark:border-white/10">
              <button
                type="button"
                onClick={onClose}
                className="px-6 py-2.5 rounded-2xl text-sm font-semibold bg-indigo-600 hover:bg-indigo-700 text-white shadow-md shadow-indigo-500/20 transition-all cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 active:scale-95"
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

