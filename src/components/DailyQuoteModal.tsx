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
    }
  }, [isOpen]);

  if (!isOpen || !quote) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm animate-fade-in">
      <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-300 dark:border-slate-700 shadow-2xl max-w-lg w-full p-8 relative overflow-hidden text-slate-800 dark:text-slate-100 transition-all">
        {/* Decorative background ambient glow */}
        <div className="absolute -top-24 -right-24 w-48 h-48 bg-indigo-500/10 dark:bg-indigo-500/5 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-24 -left-24 w-48 h-48 bg-purple-500/10 dark:bg-purple-500/5 rounded-full blur-3xl pointer-events-none" />

        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-2xl bg-indigo-50 dark:bg-indigo-950/60 flex items-center justify-center text-indigo-600 dark:text-indigo-400 shadow-sm">
              <Sparkles className="w-4 h-4" />
            </div>
            <div>
              <span className="text-xs font-semibold tracking-wider uppercase text-indigo-600 dark:text-indigo-400">Daily Reflection</span>
              <h3 className="font-serif text-lg font-bold">Thought for Today</h3>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-full flex items-center justify-center text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
            aria-label="Close"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="my-6 relative pl-6 border-l-2 border-indigo-500/40">
          <Quote className="absolute -top-3 -left-3 w-6 h-6 text-indigo-400/20 dark:text-indigo-400/10 pointer-events-none" />
          <p className="font-serif text-xl md:text-2xl leading-relaxed text-slate-900 dark:text-slate-100 italic mb-4">
            &ldquo;{quote.quote}&rdquo;
          </p>
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-slate-700 dark:text-slate-300">
              — {quote.author}
            </span>
            <span className="text-xs px-2.5 py-1 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 font-medium">
              {quote.theme}
            </span>
          </div>
        </div>

        <div className="flex items-center justify-end pt-4 border-t border-slate-100 dark:border-slate-800">
          <button
            type="button"
            onClick={onClose}
            className="px-6 py-2.5 rounded-2xl text-sm font-semibold bg-indigo-600 hover:bg-indigo-700 text-white shadow-md shadow-indigo-500/20 transition-all cursor-pointer"
          >
            Continue to Journal
          </button>
        </div>
      </div>
    </div>
  );
};
