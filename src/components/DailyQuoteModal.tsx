import React, { useState, useEffect } from 'react';
import { Sparkles, X, Quote } from 'lucide-react';
import { MINDFUL_QUOTES, QuoteItem } from '../data/quotes';

interface DailyQuoteModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const DailyQuoteModal: React.FC<DailyQuoteModalProps> = ({ isOpen, onClose }) => {
  const [quote, setQuote] = useState<QuoteItem | null>(null);

  useEffect(() => {
    if (isOpen) {
      // Pick a random quote or pick based on day of year for consistency
      const randomIndex = Math.floor(Math.random() * MINDFUL_QUOTES.length);
      setQuote(MINDFUL_QUOTES[randomIndex]);

      const handleEscape = (e: KeyboardEvent) => {
        if (e.key === 'Escape') onClose();
      };
      document.addEventListener('keydown', handleEscape);
      document.body.style.overflow = 'hidden';
      return () => {
        document.removeEventListener('keydown', handleEscape);
        document.body.style.overflow = 'unset';
      };
    }
  }, [isOpen, onClose]);

  if (!isOpen || !quote) return null;

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 dark:bg-black/70 backdrop-blur-md animate-fade-in"
      role="dialog"
      aria-modal="true"
      aria-labelledby="daily-quote-title"
      aria-describedby="daily-quote-desc"
    >
      <div className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-2xl rounded-3xl border border-white/80 dark:border-white/10 shadow-2xl max-w-lg w-full p-8 relative overflow-hidden text-slate-800 dark:text-slate-100 transition-all">
        {/* Decorative background ambient glow */}
        <div className="absolute -top-24 -right-24 w-48 h-48 bg-indigo-500/15 dark:bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" aria-hidden="true" />
        <div className="absolute -bottom-24 -left-24 w-48 h-48 bg-purple-500/15 dark:bg-purple-500/10 rounded-full blur-3xl pointer-events-none" aria-hidden="true" />

        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-2xl bg-indigo-50/80 dark:bg-indigo-950/60 border border-indigo-200/80 dark:border-indigo-800/80 flex items-center justify-center text-indigo-600 dark:text-indigo-400 shadow-2xs" aria-hidden="true">
              <Sparkles className="w-4 h-4" />
            </div>
            <div>
              <span className="text-xs font-semibold tracking-wider uppercase text-indigo-600 dark:text-indigo-400">Daily Reflection</span>
              <h3 id="daily-quote-title" className="font-serif text-lg font-bold">Thought for Today</h3>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-full flex items-center justify-center text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-white/60 dark:hover:bg-slate-800/60 transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
            aria-label="Close daily quote dialog"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="my-6 relative pl-6 border-l-2 border-indigo-500/40">
          <Quote className="absolute -top-3 -left-3 w-6 h-6 text-indigo-400/20 dark:text-indigo-400/10 pointer-events-none" aria-hidden="true" />
          <p id="daily-quote-desc" className="font-serif text-xl md:text-2xl leading-relaxed text-slate-900 dark:text-slate-100 italic mb-4">
            &ldquo;{quote.quote}&rdquo;
          </p>
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-slate-700 dark:text-slate-300">
              — {quote.author}
            </span>
            <span className="text-xs px-2.5 py-1 rounded-full bg-white/60 dark:bg-slate-800/60 border border-white/80 dark:border-white/10 text-slate-600 dark:text-slate-300 font-medium">
              {quote.theme}
            </span>
          </div>
        </div>

        <div className="flex items-center justify-end pt-4 border-t border-white/60 dark:border-white/10">
          <button
            type="button"
            onClick={onClose}
            className="px-6 py-2.5 rounded-2xl text-sm font-semibold bg-indigo-600 hover:bg-indigo-700 text-white shadow-md shadow-indigo-500/20 transition-all cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
          >
            Continue to Journal
          </button>
        </div>
      </div>
    </div>
  );
};
