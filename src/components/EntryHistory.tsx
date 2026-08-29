import React, { useState, useMemo, useEffect } from 'react';
import { 
  Search, 
  Trash2, 
  ChevronDown, 
  ChevronUp, 
  Calendar, 
  Sparkles, 
  Feather, 
  FileText, 
  Filter, 
  Activity, 
  RefreshCw, 
  Pencil, 
  Check, 
  X, 
  AlertTriangle, 
  Lock
} from 'lucide-react';
import Markdown from 'react-markdown';
import { JournalEntry, MoodType } from '../types';
import { deleteJournalEntry, saveJournalEntry } from '../lib/firebase';
import { analyzeEntrySentiment } from '../lib/api';
import { ConfidenceTooltip } from './ConfidenceTooltip';

interface EntryHistoryProps {
  userId: string;
  entries: JournalEntry[];
  onSelectEntryForReflection?: (entry: JournalEntry) => void;
  onStartWriting?: (starterPrompt?: string) => void;
  targetEntryId?: string | null;
  onClearTargetEntry?: () => void;
}

const MOOD_EMOJIS: Record<string, string> = {
  reflective: '🌌',
  peaceful: '🍃',
  optimistic: '☀️',
  grounded: '⛰️',
  seeking_clarity: '🧭',
  anxious: '🌧️',
  fatigued: '🌙',
  energized: '⚡',
};

const SENTIMENT_THEMES: Record<string, { 
  bg: string; 
  text: string; 
  border: string; 
  badgeBg: string; 
  dot: string; 
  ring: string; 
  progressBar: string; 
}> = {
  emerald: {
    bg: 'bg-emerald-50/80',
    text: 'text-emerald-900',
    border: 'border-emerald-200/90',
    badgeBg: 'bg-emerald-100/80 text-emerald-800 border-emerald-300/80',
    dot: 'bg-emerald-500',
    ring: 'ring-emerald-400/30',
    progressBar: 'bg-emerald-500',
  },
  indigo: {
    bg: 'bg-indigo-50/80',
    text: 'text-indigo-900',
    border: 'border-indigo-200/90',
    badgeBg: 'bg-indigo-100/80 text-indigo-800 border-indigo-300/80',
    dot: 'bg-indigo-500',
    ring: 'ring-indigo-400/30',
    progressBar: 'bg-indigo-500',
  },
  amber: {
    bg: 'bg-amber-50/80',
    text: 'text-amber-900',
    border: 'border-amber-200/90',
    badgeBg: 'bg-amber-100/80 text-amber-900 border-amber-300/80',
    dot: 'bg-amber-500',
    ring: 'ring-amber-400/30',
    progressBar: 'bg-amber-500',
  },
  rose: {
    bg: 'bg-rose-50/80',
    text: 'text-rose-900',
    border: 'border-rose-200/90',
    badgeBg: 'bg-rose-100/80 text-rose-800 border-rose-300/80',
    dot: 'bg-rose-500',
    ring: 'ring-rose-400/30',
    progressBar: 'bg-rose-500',
  },
  sky: {
    bg: 'bg-sky-50/80',
    text: 'text-sky-900',
    border: 'border-sky-200/90',
    badgeBg: 'bg-sky-100/80 text-sky-800 border-sky-300/80',
    dot: 'bg-sky-500',
    ring: 'ring-sky-400/30',
    progressBar: 'bg-sky-500',
  },
  purple: {
    bg: 'bg-purple-50/80',
    text: 'text-purple-900',
    border: 'border-purple-200/90',
    badgeBg: 'bg-purple-100/80 text-purple-800 border-purple-300/80',
    dot: 'bg-purple-500',
    ring: 'ring-purple-400/30',
    progressBar: 'bg-purple-500',
  },
  teal: {
    bg: 'bg-teal-50/80',
    text: 'text-teal-900',
    border: 'border-teal-200/90',
    badgeBg: 'bg-teal-100/80 text-teal-800 border-teal-300/80',
    dot: 'bg-teal-500',
    ring: 'ring-teal-400/30',
    progressBar: 'bg-teal-500',
  },
};

export const EntryHistory: React.FC<EntryHistoryProps> = ({
  userId,
  entries,
  onSelectEntryForReflection,
  onStartWriting,
  targetEntryId,
  onClearTargetEntry,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedMoodFilter, setSelectedMoodFilter] = useState<string>('all');
  const [expandedEntryId, setExpandedEntryId] = useState<string | null>(null);
  const [analyzingIds, setAnalyzingIds] = useState<Record<string, boolean>>({});

  // Delete modal state
  const [entryToDelete, setEntryToDelete] = useState<JournalEntry | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // When targetEntryId is provided (e.g. from Insights transparent reasoning link),
  // ensure the entry is un-filtered, expanded, and scrolled into view smoothly.
  useEffect(() => {
    if (targetEntryId) {
      setExpandedEntryId(targetEntryId);

      const targetEntry = entries.find((e) => e.id === targetEntryId);
      if (targetEntry && selectedMoodFilter !== 'all' && targetEntry.mood !== selectedMoodFilter) {
        setSelectedMoodFilter('all');
      }
      if (searchQuery.trim() !== '') {
        setSearchQuery('');
      }

      const timer = setTimeout(() => {
        const el = document.getElementById(`entry-card-${targetEntryId}`);
        if (el) {
          el.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
      }, 120);

      return () => clearTimeout(timer);
    }
  }, [targetEntryId, entries]);

  const filteredEntries = useMemo(() => {
    return entries.filter((e) => {
      const matchSearch =
        searchQuery.trim() === '' ||
        e.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        e.content.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (e.sentiment?.label && e.sentiment.label.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (e.tags && e.tags.some((t) => t.toLowerCase().includes(searchQuery.toLowerCase())));

      const matchMood =
        selectedMoodFilter === 'all' || e.mood === selectedMoodFilter;

      return matchSearch && matchMood;
    });
  }, [entries, searchQuery, selectedMoodFilter]);

  // Open Delete Confirmation Modal (only allowed if current user owns the entry)
  const handleOpenDelete = (entry: JournalEntry, e: React.MouseEvent) => {
    e.stopPropagation();
    if (entry.userId !== userId) {
      console.warn('Unauthorized delete attempt blocked in UI');
      return;
    }
    setEntryToDelete(entry);
  };

  // Confirm and execute delete from users/{uid}/entries/{entryId}
  const handleConfirmDelete = async () => {
    if (!entryToDelete || entryToDelete.userId !== userId) return;

    try {
      setIsDeleting(true);
      await deleteJournalEntry(userId, entryToDelete.id);
      
      // If deleted entry was active in target or expanded view, reset it
      if (targetEntryId === entryToDelete.id && onClearTargetEntry) {
        onClearTargetEntry();
      }
      if (expandedEntryId === entryToDelete.id) {
        setExpandedEntryId(null);
      }
      setEntryToDelete(null);
    } catch (err) {
      console.error('Delete error:', err);
    } finally {
      setIsDeleting(false);
    }
  };

  const handleAnalyzeSentiment = async (entry: JournalEntry, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    if (analyzingIds[entry.id]) return;

    try {
      setAnalyzingIds(prev => ({ ...prev, [entry.id]: true }));
      const result = await analyzeEntrySentiment({
        title: entry.title,
        content: entry.content,
        conversation: entry.conversation,
        mood: entry.mood,
      });

      if (result && result.sentiment) {
        const updatedEntry: JournalEntry = {
          ...entry,
          sentiment: result.sentiment,
          updatedAt: new Date().toISOString(),
        };
        await saveJournalEntry(userId, updatedEntry);
      }
    } catch (err: any) {
      console.error('Error analyzing entry sentiment:', err);
    } finally {
      setAnalyzingIds(prev => ({ ...prev, [entry.id]: false }));
    }
  };

  const toggleExpand = (entryId: string) => {
    setExpandedEntryId((prev) => (prev === entryId ? null : entryId));
  };

  // If user has zero journal entries overall, render the requested friendly onboarding screen
  if (entries.length === 0) {
    return (
      <div className="max-w-3xl mx-auto space-y-6 animate-fade-in">
        <div className="bg-white/70 dark:bg-slate-900/80 backdrop-blur-xl border border-white/80 dark:border-white/10 rounded-3xl p-8 sm:p-12 text-center shadow-md space-y-6">
          <div className="w-16 h-16 rounded-3xl bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-200 dark:border-indigo-800 flex items-center justify-center text-indigo-600 dark:text-indigo-400 mx-auto shadow-inner">
            <Feather className="w-8 h-8" />
          </div>

          <div className="space-y-2 max-w-md mx-auto">
            <h2 className="text-xl sm:text-2xl font-serif font-bold text-slate-900 dark:text-white">
              Your Memory Archive is Waiting
            </h2>
            <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed font-sans">
              Write your first reflection — try starting with{' '}
              <span className="font-semibold text-indigo-600 dark:text-indigo-400">"Today I..."</span>
            </p>
          </div>

          <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-3">
            <button
              id="btn-start-first-reflection"
              onClick={() => onStartWriting?.("Today I ")}
              className="w-full sm:w-auto px-6 py-3 rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs transition-all shadow-md shadow-indigo-600/20 flex items-center justify-center gap-2 cursor-pointer"
            >
              <Sparkles className="w-4 h-4 text-amber-300" />
              <span>Begin First Reflection</span>
            </button>
          </div>

          <div className="pt-4 border-t border-slate-200/60 dark:border-slate-800 flex items-center justify-center gap-4 text-xs text-slate-500 dark:text-slate-400 font-mono">
            <span>🔒 Isolated user partition</span>
            <span>•</span>
            <span>🧠 Semantic profile memory</span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      
      {/* Header & Filter Bar */}
      <div className="bg-white/60 dark:bg-slate-900/70 backdrop-blur-xl border border-white/70 dark:border-white/10 rounded-3xl p-5 sm:p-6 shadow-sm transition-colors">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200/60 dark:border-slate-800/80 pb-4 mb-4">
          <div>
            <h2 className="text-xl font-serif font-bold text-slate-900 dark:text-white">Journal Archive</h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              {entries.length} personal reflection{entries.length === 1 ? '' : 's'} with full edit and deletion sovereignty
            </p>
          </div>

          {/* Search bar */}
          <div className="relative w-full sm:w-72">
            <Search className="w-4 h-4 text-slate-400 dark:text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              id="input-search-entries"
              type="text"
              placeholder="Search reflections, tags, or sentiment..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-2 rounded-xl bg-white/80 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 text-xs focus:outline-none focus:bg-white dark:focus:bg-slate-800 focus:border-indigo-400 dark:focus:border-indigo-500 shadow-xs"
            />
          </div>
        </div>

        {/* Mood filter chips */}
        <div className="space-y-2.5">
          <div className="text-slate-400 dark:text-slate-500 flex items-center gap-1.5 text-[11px] font-semibold">
            <Filter className="w-3.5 h-3.5" /> Filter by Mood:
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-5 gap-2 text-xs">
            <button
              onClick={() => setSelectedMoodFilter('all')}
              className={`w-full px-3 py-2 rounded-xl text-xs font-medium border transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                selectedMoodFilter === 'all'
                  ? 'bg-indigo-600 text-white border-indigo-600 shadow-sm shadow-indigo-600/20 font-semibold'
                  : 'bg-white/60 dark:bg-slate-800/60 text-slate-600 dark:text-slate-300 border-slate-200/70 dark:border-slate-700 hover:bg-white dark:hover:bg-slate-800'
              }`}
            >
              <span>All Moods</span>
              <span className="text-[10px] opacity-70">({entries.length})</span>
            </button>
            {(['reflective', 'peaceful', 'optimistic', 'grounded', 'seeking_clarity', 'anxious', 'fatigued', 'energized'] as MoodType[]).map((mood) => {
              const count = entries.filter((e) => e.mood === mood).length;
              if (count === 0) return null;
              return (
                <button
                  key={mood}
                  onClick={() => setSelectedMoodFilter(mood)}
                  className={`w-full px-3 py-2 rounded-xl text-xs font-medium border transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                    selectedMoodFilter === mood
                      ? 'bg-indigo-600 text-white border-indigo-600 shadow-sm shadow-indigo-600/20 font-semibold'
                      : 'bg-white/60 dark:bg-slate-800/60 text-slate-600 dark:text-slate-300 border-slate-200/70 dark:border-slate-700 hover:bg-white dark:hover:bg-slate-800'
                  }`}
                >
                  <span>{MOOD_EMOJIS[mood] || '📝'}</span>
                  <span className="capitalize truncate">{mood.replace('_', ' ')}</span>
                  <span className="text-[10px] opacity-70">({count})</span>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Entries List */}
      {filteredEntries.length === 0 ? (
        <div className="bg-white/50 dark:bg-slate-900/50 backdrop-blur-md border border-dashed border-slate-300 dark:border-slate-800 rounded-3xl p-12 text-center text-slate-500 dark:text-slate-400 space-y-3">
          <FileText className="w-10 h-10 text-slate-400 dark:text-slate-600 mx-auto" />
          <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-300 font-serif">No matching journal entries found</h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 max-w-sm mx-auto">
            Try adjusting your search keywords or mood filter.
          </p>
        </div>
      ) : (
        <div className="space-y-3.5">
          {filteredEntries.map((entry) => {
            const isExpanded = expandedEntryId === entry.id;
            const isAnalyzing = analyzingIds[entry.id];
            const isOwner = entry.userId === userId;

            const dateStr = new Date(entry.createdAt).toLocaleDateString(undefined, {
              weekday: 'short',
              year: 'numeric',
              month: 'short',
              day: 'numeric',
            });
            const timeStr = new Date(entry.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

            const sentimentTheme = entry.sentiment?.color 
              ? (SENTIMENT_THEMES[entry.sentiment.color] || SENTIMENT_THEMES.indigo)
              : null;

            const isTarget = targetEntryId === entry.id;

            return (
              <div
                key={entry.id}
                id={`entry-card-${entry.id}`}
                className={`bg-white/70 dark:bg-slate-900/70 hover:bg-white/90 dark:hover:bg-slate-900/90 backdrop-blur-xl border transition-all shadow-xs rounded-3xl overflow-hidden ${
                  isTarget
                    ? 'border-indigo-500 ring-4 ring-indigo-500/20 shadow-md shadow-indigo-500/10'
                    : sentimentTheme ? `${sentimentTheme.border} dark:border-slate-800` : 'border-white/80 dark:border-white/10'
                } hover:border-indigo-300 dark:hover:border-indigo-500/40`}
              >
                {/* Target Entry Focused Banner */}
                {isTarget && (
                  <div className="bg-indigo-600 text-white px-4 py-1.5 text-xs font-mono font-semibold flex items-center justify-between">
                    <span className="flex items-center gap-1.5">
                      <Sparkles className="w-3.5 h-3.5 text-amber-300" />
                      <span>Referenced in Mindful Insights</span>
                    </span>
                    {onClearTargetEntry && (
                      <button 
                        onClick={(e) => { e.stopPropagation(); onClearTargetEntry(); }}
                        className="text-[11px] font-sans font-medium underline text-indigo-100 hover:text-white cursor-pointer"
                      >
                        Clear highlight
                      </button>
                    )}
                  </div>
                )}

                {/* Entry Header / Collapsible row */}
                <div
                  onClick={() => toggleExpand(entry.id)}
                  className="p-4 sm:p-5 flex items-start sm:items-center justify-between gap-4 cursor-pointer select-none"
                >
                  <div className="flex items-start sm:items-center gap-3.5 min-w-0">
                    {/* Visual Sentiment Icon Avatar */}
                    <div 
                      className={`w-11 h-11 rounded-2xl flex items-center justify-center text-xl flex-shrink-0 shadow-xs border transition-transform hover:scale-105 ${
                        sentimentTheme 
                          ? `${sentimentTheme.bg} ${sentimentTheme.border} ${sentimentTheme.ring} dark:bg-slate-800 dark:border-slate-700`
                          : 'bg-indigo-50 dark:bg-slate-800 border-indigo-100 dark:border-slate-700'
                      }`}
                      title={entry.sentiment ? `Gemini Sentiment: ${entry.sentiment.label}` : `Mood: ${entry.mood}`}
                    >
                      {entry.sentiment?.emoji || MOOD_EMOJIS[entry.mood] || '📝'}
                    </div>

                    <div className="min-w-0 space-y-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="text-sm sm:text-base font-serif font-bold text-slate-900 dark:text-white truncate">
                          {entry.title || 'Untitled Reflection'}
                        </h3>

                        {/* Gemini-derived Sentiment Indicator Badge */}
                        {entry.sentiment ? (
                          <div 
                            className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold border ${sentimentTheme?.badgeBg} dark:bg-slate-800 dark:border-slate-700 dark:text-indigo-300 shadow-2xs`}
                            title={`Emotional Harmony: ${entry.sentiment.score}%`}
                          >
                            <span className="w-1.5 h-1.5 rounded-full animate-pulse bg-current" />
                            <span>{entry.sentiment.emoji}</span>
                            <span>{entry.sentiment.label}</span>
                            <ConfidenceTooltip explanation="Gemini's estimated confidence based on language and sentiment in this entry.">
                              <span className="text-[10px] opacity-75 font-mono">({entry.sentiment.score}%)</span>
                            </ConfidenceTooltip>
                          </div>
                        ) : (
                          <button
                            id={`btn-analyze-entry-${entry.id}`}
                            onClick={(e) => handleAnalyzeSentiment(entry, e)}
                            disabled={isAnalyzing}
                            title="Derive visual sentiment indicator using Gemini"
                            className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-slate-100 dark:bg-slate-800 hover:bg-indigo-50 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 hover:text-indigo-700 dark:hover:text-white border border-slate-200 dark:border-slate-700 hover:border-indigo-200 transition-colors cursor-pointer"
                          >
                            <Sparkles className={`w-3 h-3 ${isAnalyzing ? 'animate-spin text-indigo-600 dark:text-indigo-400' : 'text-amber-500'}`} />
                            <span>{isAnalyzing ? 'Evaluating...' : 'Detect Sentiment'}</span>
                          </button>
                        )}

                        {/* Edited badge indicator */}
                        {entry.isEdited && (
                          <span 
                            title={entry.editedAt ? `Edited on ${new Date(entry.editedAt).toLocaleString()}` : 'Entry narrative edited'}
                            className="inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 border border-slate-200 dark:border-slate-700 font-mono"
                          >
                            <Pencil className="w-2.5 h-2.5" />
                            <span>edited</span>
                          </span>
                        )}

                        {entry.tags && entry.tags.map((t) => (
                          <span
                            key={t}
                            className="text-[10px] px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700 font-mono"
                          >
                            #{t}
                          </span>
                        ))}
                      </div>

                      <div className="flex items-center gap-2.5 text-xs text-slate-500 dark:text-slate-400 flex-wrap">
                        <span className="flex items-center gap-1 font-mono text-[11px]">
                          <Calendar className="w-3 h-3 text-slate-400 dark:text-slate-500" />
                          {dateStr} at {timeStr}
                        </span>
                        <span>•</span>
                        <span className="font-mono text-[11px]">{entry.wordCount || 0} words</span>
                        <span>•</span>
                        <span className="text-slate-600 dark:text-slate-400 font-medium capitalize flex items-center gap-1">
                          <span>User mood:</span>
                          <span className="text-slate-800 dark:text-slate-200 font-semibold">{entry.mood.replace('_', ' ')}</span>
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Actions Header Row */}
                  <div className="flex items-center gap-1 sm:gap-2 flex-shrink-0">

                    {/* Owner-Only Delete Button */}
                    {isOwner && (
                      <button
                        id={`btn-delete-entry-${entry.id}`}
                        onClick={(e) => handleOpenDelete(entry, e)}
                        title="Delete reflection from Firestore"
                        className="p-2 rounded-xl text-slate-400 dark:text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/60 transition-colors cursor-pointer"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}

                    <div className="p-1 text-slate-400 dark:text-slate-500">
                      {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                    </div>
                  </div>
                </div>

                {/* Expanded Content View */}
                {isExpanded && (
                  <div className="border-t border-slate-200/60 dark:border-slate-800 bg-white/40 dark:bg-slate-950/40 backdrop-blur-md p-5 sm:p-6 space-y-4">
                    
                    {/* Visual Sentiment Detail Card */}
                    {entry.sentiment ? (
                      <div className={`p-4 sm:p-5 rounded-2xl border ${sentimentTheme?.bg} ${sentimentTheme?.border} dark:bg-slate-800/80 dark:border-slate-700 space-y-2.5 shadow-2xs`}>
                        <div className="flex items-center justify-between flex-wrap gap-2">
                          <div className="flex items-center gap-2">
                            <span className="text-2xl">{entry.sentiment.emoji}</span>
                            <div>
                              <div className="flex items-center gap-2">
                                <span className={`text-sm font-serif font-bold ${sentimentTheme?.text} dark:text-white`}>
                                  {entry.sentiment.label}
                                </span>
                                <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-white/80 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 text-slate-700 dark:text-slate-200">
                                  Color: {entry.sentiment.color.toUpperCase()}
                                </span>
                              </div>
                              <p className="text-xs text-slate-600 dark:text-slate-300 mt-0.5">
                                {entry.sentiment.summary || 'Mindful psychological sentiment distilled from your writing.'}
                              </p>
                            </div>
                          </div>

                          {/* Emotional resonance score gauge */}
                          <div className="flex items-center gap-3 bg-white/80 dark:bg-slate-800 px-3.5 py-1.5 rounded-xl border border-slate-200/80 dark:border-slate-700 shadow-2xs">
                            <div className="text-right">
                              <div className="text-[10px] text-slate-400 dark:text-slate-400 font-mono uppercase">Harmonic Score</div>
                              <div className="text-xs font-bold font-mono text-slate-800 dark:text-white flex items-center justify-end">
                                <ConfidenceTooltip explanation="Gemini's estimated confidence based on language and sentiment in this entry.">
                                  <span>{entry.sentiment.score}/100</span>
                                </ConfidenceTooltip>
                              </div>
                            </div>
                            <div className="w-16 h-2 bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden">
                              <div 
                                className={`h-full rounded-full ${sentimentTheme?.progressBar || 'bg-indigo-600'}`}
                                style={{ width: `${entry.sentiment.score}%` }}
                              />
                            </div>
                            <button
                              onClick={(e) => handleAnalyzeSentiment(entry, e)}
                              disabled={isAnalyzing}
                              title="Re-analyze with Gemini"
                              className="p-1 rounded-lg text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors cursor-pointer"
                            >
                              <RefreshCw className={`w-3.5 h-3.5 ${isAnalyzing ? 'animate-spin text-indigo-600 dark:text-indigo-400' : ''}`} />
                            </button>
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div className="p-4 rounded-2xl bg-indigo-50/60 dark:bg-indigo-950/40 border border-indigo-100 dark:border-indigo-900/60 flex items-center justify-between gap-3">
                        <div className="flex items-center gap-2.5 text-xs text-indigo-900 dark:text-indigo-300">
                          <Sparkles className="w-4 h-4 text-amber-500 flex-shrink-0" />
                          <span>No sentiment indicator derived yet for this entry.</span>
                        </div>
                        <button
                          onClick={(e) => handleAnalyzeSentiment(entry, e)}
                          disabled={isAnalyzing}
                          className="px-3 py-1.5 rounded-xl text-xs font-semibold bg-indigo-600 hover:bg-indigo-700 text-white shadow-xs transition-colors flex items-center gap-1.5 cursor-pointer"
                        >
                          <Activity className={`w-3.5 h-3.5 ${isAnalyzing ? 'animate-spin' : ''}`} />
                          <span>{isAnalyzing ? 'Analyzing...' : 'Generate Sentiment'}</span>
                        </button>
                      </div>
                    )}

                    {/* User Raw Narrative Header + Quick Edit Option */}
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-600 dark:text-slate-300 uppercase tracking-wider font-mono">
                          <Feather className="w-3.5 h-3.5 text-slate-400 dark:text-slate-500" />
                          <span>Journal Entry Narrative</span>
                        </div>
                      </div>
                      <div className="p-4 rounded-2xl bg-white/80 dark:bg-slate-800/80 border border-slate-200/80 dark:border-slate-700 text-sm text-slate-800 dark:text-slate-100 leading-relaxed font-sans whitespace-pre-wrap shadow-inner">
                        {entry.content || '(No narrative text)'}
                      </div>
                    </div>

                    {/* Dialogue / Reflections */}
                    {entry.conversation && entry.conversation.length > 0 && (
                      <div className="space-y-2">
                        <div className="flex items-center gap-1.5 text-xs font-semibold text-indigo-700 dark:text-indigo-400 uppercase tracking-wider font-mono">
                          <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                          <span>Gemini Reflective Dialogue ({entry.conversation.length} turns)</span>
                        </div>
                        <div className="space-y-2.5">
                          {entry.conversation.map((turn) => (
                            <div
                              key={turn.id}
                              className={`p-4 rounded-2xl text-xs sm:text-sm ${
                                turn.role === 'user'
                                  ? 'bg-indigo-50/70 dark:bg-indigo-950/50 border border-indigo-100 dark:border-indigo-900/60 text-slate-800 dark:text-slate-100 ml-4'
                                  : 'bg-white/90 dark:bg-slate-800/90 border border-slate-200/80 dark:border-slate-700 text-slate-800 dark:text-slate-100 mr-4 shadow-xs'
                              }`}
                            >
                              <div className="font-semibold text-xs mb-1 font-serif text-slate-600 dark:text-slate-400">
                                {turn.role === 'user' ? 'You' : 'Reflect AI Companion'}
                              </div>
                              <Markdown>{typeof turn.text === 'string' ? turn.text : String(turn.text || '')}</Markdown>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* ========================================================================= */}
      {/* DELETE CONFIRMATION DIALOG MODAL (Requirement 2 & Security Isolation) */}
      {/* ========================================================================= */}
      {entryToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-md animate-fade-in">
          <div className="w-full max-w-md bg-white/95 dark:bg-slate-900/95 backdrop-blur-2xl border border-white/80 dark:border-white/10 rounded-3xl shadow-2xl overflow-hidden flex flex-col transition-colors">
            
            {/* Modal Header */}
            <div className="p-5 border-b border-slate-200/60 dark:border-slate-800 flex items-center justify-between bg-rose-50/40 dark:bg-rose-950/20">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-rose-100 dark:bg-rose-950/60 border border-rose-200 dark:border-rose-800 flex items-center justify-center text-rose-600 dark:text-rose-400 shadow-xs">
                  <Trash2 className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-serif font-bold text-slate-900 dark:text-white">
                    Delete Journal Entry
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Confirm deletion from your Firestore partition
                  </p>
                </div>
              </div>

              <button
                id="btn-close-delete-modal"
                onClick={() => setEntryToDelete(null)}
                disabled={isDeleting}
                className="p-2 rounded-xl text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-5 sm:p-6 space-y-4 text-xs sm:text-sm text-slate-700 dark:text-slate-200">
              <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700 space-y-1">
                <div className="font-serif font-bold text-slate-900 dark:text-white">
                  "{entryToDelete.title || 'Untitled Reflection'}"
                </div>
                <div className="text-[11px] text-slate-500 dark:text-slate-400 font-mono">
                  Created on {new Date(entryToDelete.createdAt).toLocaleDateString(undefined, {
                    weekday: 'short',
                    year: 'numeric',
                    month: 'short',
                    day: 'numeric'
                  })} • {entryToDelete.wordCount || 0} words
                </div>
              </div>

              <p className="text-slate-600 dark:text-slate-300 leading-relaxed text-xs">
                Are you sure you want to permanently delete this reflection? This entry and its reflective dialogue will be removed from your personal journal archive.
              </p>

              {/* Requirement 2 Isolation Notice */}
              <div className="p-3 rounded-2xl bg-amber-50/80 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900/60 text-amber-900 dark:text-amber-300 text-[11px] flex items-start gap-2">
                <AlertTriangle className="w-4 h-4 text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5" />
                <span>
                  <strong>Note:</strong> Deleting an entry removes this reflection directly. Your continuous memory profile is preserved and only updates through its normal periodic reflection cycle.
                </span>
              </div>
            </div>

            {/* Modal Actions */}
            <div className="p-4 sm:p-5 border-t border-slate-200/60 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/40 flex items-center justify-end gap-3">
              <button
                id="btn-cancel-delete"
                onClick={() => setEntryToDelete(null)}
                disabled={isDeleting}
                className="px-4 py-2 rounded-xl text-xs font-semibold bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 transition-colors cursor-pointer"
              >
                Cancel
              </button>

              <button
                id="btn-confirm-delete"
                onClick={handleConfirmDelete}
                disabled={isDeleting}
                className="px-4 py-2 rounded-xl text-xs font-semibold bg-rose-600 hover:bg-rose-700 text-white shadow-md shadow-rose-600/20 transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
              >
                <Trash2 className={`w-3.5 h-3.5 ${isDeleting ? 'animate-spin' : ''}`} />
                <span>{isDeleting ? 'Deleting Entry...' : 'Confirm Delete'}</span>
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  );
};
