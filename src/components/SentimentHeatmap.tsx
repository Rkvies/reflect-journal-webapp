import React, { useMemo } from 'react';
import { JournalEntry } from '../types';

interface SentimentHeatmapProps {
  entries: JournalEntry[];
}

export const SentimentHeatmap: React.FC<SentimentHeatmapProps> = ({ entries }) => {
  const heatmapData = useMemo(() => {
    const data: Record<string, number> = {};
    entries.forEach(entry => {
      const date = entry.createdAt.split('T')[0];
      if (entry.sentiment) {
        data[date] = (data[date] || 0) + entry.sentiment.score;
      }
    });
    
    // Normalize to 0-1
    const maxScore = Math.max(...Object.values(data), 1);
    const normalizedData: Record<string, number> = {};
    Object.entries(data).forEach(([date, score]) => {
      normalizedData[date] = score / maxScore;
    });

    return normalizedData;
  }, [entries]);

  const year = new Date().getFullYear();
  const days = [];
  const startOfYear = new Date(year, 0, 1);
  const endOfYear = new Date(year, 11, 31);

  for (let d = new Date(startOfYear); d <= endOfYear; d.setDate(d.getDate() + 1)) {
    days.push(new Date(d));
  }

  const getColor = (score: number | undefined) => {
    if (score === undefined) return 'bg-slate-100 dark:bg-slate-800';
    if (score < 0.2) return 'bg-indigo-100 dark:bg-indigo-900';
    if (score < 0.4) return 'bg-indigo-200 dark:bg-indigo-800';
    if (score < 0.6) return 'bg-indigo-400 dark:bg-indigo-600';
    if (score < 0.8) return 'bg-indigo-500 dark:bg-indigo-500';
    return 'bg-indigo-700 dark:bg-indigo-300';
  };

  return (
    <div className="p-6 rounded-3xl bg-white/75 dark:bg-slate-900/75 backdrop-blur-2xl border border-white/80 dark:border-white/10 shadow-sm">
      <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-200 font-serif mb-4">Yearly Sentiment Heatmap</h3>
      <div className="flex flex-wrap gap-1" style={{ maxWidth: '800px' }}>
        {days.map(date => {
          const dateStr = date.toISOString().split('T')[0];
          const score = heatmapData[dateStr];
          return (
            <div 
              key={dateStr}
              className={`w-3 h-3 rounded-sm ${getColor(score)}`}
              title={`${dateStr}: ${score ? Math.round(score * 100) : 'No data'}`}
            />
          );
        })}
      </div>
    </div>
  );
};
