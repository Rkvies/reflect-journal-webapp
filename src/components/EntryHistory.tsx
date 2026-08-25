import React, { useState, useMemo } from 'react';
import { 
  Search, 
  Trash2, 
  ChevronDown, 
  ChevronUp, 
  Calendar, 
  Tag, 
  Sparkles, 
  Feather, 
  FileText,
  Filter,
  Activity,
  RefreshCw,
  Sliders,
  Check
} from 'lucide-react';
import Markdown from 'react-markdown';
import { JournalEntry, MoodType, EntrySentiment } from '../types';
import { deleteJournalEntry, saveJournalEntry } from '../lib/firebase';
import { analyzeEntrySentiment } from '../lib/api';

interface EntryHistoryProps {
  userId: string;
  entries: JournalEntry[];
  onSelectEntryForReflection?: (entry: JournalEntry) => void;
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
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedMoodFilter, setSelectedMoodFilter] = useState<string>('all');
  const [expandedEntryId, setExpandedEntryId] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState<string | null>(null);
  const [analyzingIds, setAnalyzingIds] = useState<Record<string, boolean>>({});

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

  const handleDelete = async (entryId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!window.confirm('Are you sure you want to delete this reflection entry?')) return;
    try {
      setIsDeleting(entryId);
      await deleteJournalEntry(userId, entryId);
    } catch (err) {
      console.error('Delete error:', err);
    } finally {
      setIsDeleting(null);
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

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      
      {/* Header & Filter Bar */}
      <div className="bg-white/60 backdrop-blur-xl border border-white/70 rounded-3xl p-5 sm:p-6 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200/60 pb-4 mb-4">
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-xl font-serif font-bold text-slate-900">Journal Archive</h2>
              <span className="text-xs font-mono font-semibold px-2.5 py-0.5 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-200">
                Gemini Sentiment Visualized
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-1">
              {entries.length} personal reflection{entries.length === 1 ? '' : 's'} with visual emotional indicators & themes
            </p>
          </div>

          {/* Search bar */}
          <div className="relative w-full sm:w-72">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              id="input-search-entries"
              type="text"
              placeholder="Search reflections, tags, or sentiment..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-2 rounded-xl bg-white/80 border border-slate-200 text-slate-800 placeholder-slate-400 text-xs focus:outline-none focus:bg-white focus:border-indigo-400 shadow-xs"
            />
          </div>
        </div>

        {/* Mood filter chips */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs">
          <span className="text-slate-400 flex items-center gap-1 mr-2 text-[11px] font-semibold">
            <Filter className="w-3 h-3" /> Filter:
          </span>
          <button
            onClick={() => setSelectedMoodFilter('all')}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all cursor-pointer ${
              selectedMoodFilter === 'all'
                ? 'bg-indigo-600 text-white border-indigo-600 shadow-sm shadow-indigo-600/20'
                : 'bg-white/60 text-slate-600 border-slate-200/70 hover:bg-white'
            }`}
          >
            All Moods ({entries.length})
          </button>
          {['reflective', 'peaceful', 'optimistic', 'grounded', 'seeking_clarity', 'anxious'].map((mood) => {
            const count = entries.filter((e) => e.mood === mood).length;
            if (count === 0) return null;
            return (
              <button
                key={mood}
                onClick={() => setSelectedMoodFilter(mood)}
                className={`px-3 py-1.5 rounded-xl text-xs font-medium border flex items-center gap-1.5 transition-all cursor-pointer ${
                  selectedMoodFilter === mood
                    ? 'bg-indigo-600 text-white border-indigo-600 shadow-sm shadow-indigo-600/20 font-semibold'
                    : 'bg-white/60 text-slate-600 border-slate-200/70 hover:bg-white'
                }`}
              >
                <span>{MOOD_EMOJIS[mood] || '📝'}</span>
                <span className="capitalize">{mood.replace('_', ' ')}</span>
                <span className="text-[10px] opacity-70">({count})</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Entries List */}
      {filteredEntries.length === 0 ? (
        <div className="bg-white/50 backdrop-blur-md border border-dashed border-slate-300 rounded-3xl p-12 text-center text-slate-500 space-y-3">
          <FileText className="w-10 h-10 text-slate-400 mx-auto" />
          <h3 className="text-sm font-semibold text-slate-700 font-serif">No journal entries found</h3>
          <p className="text-xs text-slate-500 max-w-sm mx-auto">
            {searchQuery || selectedMoodFilter !== 'all'
              ? 'Try changing your search keywords or mood filter.'
              : 'Write your first entry in the Daily Reflection tab to start building your personal memory archive.'}
          </p>
        </div>
      ) : (
        <div className="space-y-3.5">
          {filteredEntries.map((entry) => {
            const isExpanded = expandedEntryId === entry.id;
            const isAnalyzing = analyzingIds[entry.id];
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

            return (
              <div
                key={entry.id}
                className={`bg-white/70 hover:bg-white/90 backdrop-blur-xl border ${
                  sentimentTheme ? sentimentTheme.border : 'border-white/80'
                } hover:border-indigo-300 rounded-3xl overflow-hidden transition-all shadow-xs`}
              >
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
                          ? `${sentimentTheme.bg} ${sentimentTheme.border} ${sentimentTheme.ring}`
                          : 'bg-indigo-50 border-indigo-100'
                      }`}
                      title={entry.sentiment ? `Gemini Sentiment: ${entry.sentiment.label}` : `Mood: ${entry.mood}`}
                    >
                      {entry.sentiment?.emoji || MOOD_EMOJIS[entry.mood] || '📝'}
                    </div>

                    <div className="min-w-0 space-y-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="text-sm sm:text-base font-serif font-bold text-slate-900 truncate">
                          {entry.title || 'Untitled Reflection'}
                        </h3>

                        {/* Gemini-derived Sentiment Indicator Badge */}
                        {entry.sentiment ? (
                          <div 
                            className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold border ${sentimentTheme?.badgeBg} shadow-2xs`}
                            title={`Emotional Harmony: ${entry.sentiment.score}%`}
                          >
                            <span className="w-1.5 h-1.5 rounded-full animate-pulse bg-current" />
                            <span>{entry.sentiment.emoji}</span>
                            <span>{entry.sentiment.label}</span>
                            <span className="text-[10px] opacity-75 font-mono">({entry.sentiment.score}%)</span>
                          </div>
                        ) : (
                          <button
                            id={`btn-analyze-entry-${entry.id}`}
                            onClick={(e) => handleAnalyzeSentiment(entry, e)}
                            disabled={isAnalyzing}
                            title="Derive visual sentiment indicator using Gemini"
                            className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-slate-100 hover:bg-indigo-50 text-slate-600 hover:text-indigo-700 border border-slate-200 hover:border-indigo-200 transition-colors cursor-pointer"
                          >
                            <Sparkles className={`w-3 h-3 ${isAnalyzing ? 'animate-spin text-indigo-600' : 'text-amber-500'}`} />
                            <span>{isAnalyzing ? 'Evaluating...' : 'Detect Sentiment'}</span>
                          </button>
                        )}

                        {entry.tags && entry.tags.map((t) => (
                          <span
                            key={t}
                            className="text-[10px] px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 border border-slate-200 font-mono"
                          >
                            #{t}
                          </span>
                        ))}
                      </div>

                      <div className="flex items-center gap-2.5 text-xs text-slate-500 flex-wrap">
                        <span className="flex items-center gap-1 font-mono text-[11px]">
                          <Calendar className="w-3 h-3 text-slate-400" />
                          {dateStr} at {timeStr}
                        </span>
                        <span>•</span>
                        <span className="font-mono text-[11px]">{entry.wordCount || 0} words</span>
                        <span>•</span>
                        <span className="text-slate-600 font-medium capitalize flex items-center gap-1">
                          <span>User mood:</span>
                          <span className="text-slate-800 font-semibold">{entry.mood.replace('_', ' ')}</span>
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 flex-shrink-0">
                    <button
                      id={`btn-delete-entry-${entry.id}`}
                      onClick={(e) => handleDelete(entry.id, e)}
                      disabled={isDeleting === entry.id}
                      title="Delete entry"
                      className="p-2 rounded-xl text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>

                    <div className="p-1 text-slate-400">
                      {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                    </div>
                  </div>
                </div>

                {/* Expanded Content View */}
                {isExpanded && (
                  <div className="border-t border-slate-200/60 bg-white/40 backdrop-blur-md p-5 sm:p-6 space-y-4">
                    
                    {/* Visual Sentiment Detail Card */}
                    {entry.sentiment ? (
                      <div className={`p-4 sm:p-5 rounded-2xl border ${sentimentTheme?.bg} ${sentimentTheme?.border} space-y-2.5 shadow-2xs`}>
                        <div className="flex items-center justify-between flex-wrap gap-2">
                          <div className="flex items-center gap-2">
                            <span className="text-2xl">{entry.sentiment.emoji}</span>
                            <div>
                              <div className="flex items-center gap-2">
                                <span className={`text-sm font-serif font-bold ${sentimentTheme?.text}`}>
                                  {entry.sentiment.label}
                                </span>
                                <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-white/80 border border-slate-200 text-slate-700">
                                  Color: {entry.sentiment.color.toUpperCase()}
                                </span>
                              </div>
                              <p className="text-xs text-slate-600 mt-0.5">
                                {entry.sentiment.summary || 'Mindful psychological sentiment distilled from your writing.'}
                              </p>
                            </div>
                          </div>

                          {/* Emotional resonance score gauge */}
                          <div className="flex items-center gap-3 bg-white/80 px-3.5 py-1.5 rounded-xl border border-slate-200/80 shadow-2xs">
                            <div className="text-right">
                              <div className="text-[10px] text-slate-400 font-mono uppercase">Harmonic Score</div>
                              <div className="text-xs font-bold font-mono text-slate-800">{entry.sentiment.score}/100</div>
                            </div>
                            <div className="w-16 h-2 bg-slate-100 rounded-full overflow-hidden">
                              <div 
                                className={`h-full rounded-full ${sentimentTheme?.progressBar || 'bg-indigo-600'}`}
                                style={{ width: `${entry.sentiment.score}%` }}
                              />
                            </div>
                            <button
                              onClick={(e) => handleAnalyzeSentiment(entry, e)}
                              disabled={isAnalyzing}
                              title="Re-analyze with Gemini"
                              className="p-1 rounded-lg text-slate-400 hover:text-indigo-600 hover:bg-slate-100 transition-colors cursor-pointer"
                            >
                              <RefreshCw className={`w-3.5 h-3.5 ${isAnalyzing ? 'animate-spin text-indigo-600' : ''}`} />
                            </button>
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div className="p-4 rounded-2xl bg-indigo-50/60 border border-indigo-100 flex items-center justify-between gap-3">
                        <div className="flex items-center gap-2.5 text-xs text-indigo-900">
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

                    {/* User Raw Narrative */}
                    <div className="space-y-2">
                      <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-600 uppercase tracking-wider font-mono">
                        <Feather className="w-3.5 h-3.5 text-slate-400" />
                        <span>Journal Entry Narrative</span>
                      </div>
                      <div className="p-4 rounded-2xl bg-white/80 border border-slate-200/80 text-sm text-slate-800 leading-relaxed font-sans whitespace-pre-wrap shadow-inner">
                        {entry.content || '(No narrative text)'}
                      </div>
                    </div>

                    {/* Dialogue / Reflections */}
                    {entry.conversation && entry.conversation.length > 0 && (
                      <div className="space-y-2">
                        <div className="flex items-center gap-1.5 text-xs font-semibold text-indigo-700 uppercase tracking-wider font-mono">
                          <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                          <span>Gemini Reflective Dialogue ({entry.conversation.length} turns)</span>
                        </div>
                        <div className="space-y-2.5">
                          {entry.conversation.map((turn) => (
                            <div
                              key={turn.id}
                              className={`p-4 rounded-2xl text-xs sm:text-sm ${
                                turn.role === 'user'
                                  ? 'bg-indigo-50/70 border border-indigo-100 text-slate-800 ml-4'
                                  : 'bg-white/90 border border-slate-200/80 text-slate-800 mr-4 shadow-xs'
                              }`}
                            >
                              <div className="font-semibold text-xs mb-1 font-serif text-slate-600">
                                {turn.role === 'user' ? 'You' : 'Reflect AI Companion'}
                              </div>
                              <Markdown>{turn.text}</Markdown>
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

    </div>
  );
};

