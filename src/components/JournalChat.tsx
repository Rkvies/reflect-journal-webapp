import React, { useState, useRef, useEffect } from 'react';
import { 
  Send, 
  Sparkles, 
  BookmarkCheck, 
  Brain, 
  Tag, 
  Smile, 
  History, 
  Plus, 
  RefreshCw, 
  ShieldCheck,
  Compass,
  Heart,
  Feather
} from 'lucide-react';
import Markdown from 'react-markdown';
import { 
  JournalEntry, 
  ChatTurn, 
  MoodType, 
  ProfileSummary 
} from '../types';
import { askGeminiReflection, triggerMemoryUpdate, analyzeEntrySentiment } from '../lib/api';
import { saveJournalEntry } from '../lib/firebase';

interface JournalChatProps {
  userId: string;
  profileSummary: ProfileSummary | null;
  recentEntries: JournalEntry[];
  onEntrySaved: (entry: JournalEntry) => void;
  prefillPrompt?: { prompt: string; tag: string } | null;
  onClearPrefill?: () => void;
}

const MOODS: { type: MoodType; label: string; icon: string; color: string }[] = [
  { type: 'reflective', label: 'Reflective', icon: '🌌', color: 'bg-indigo-50 text-indigo-700 border-indigo-200 shadow-xs' },
  { type: 'peaceful', label: 'Peaceful', icon: '🍃', color: 'bg-emerald-50 text-emerald-700 border-emerald-200 shadow-xs' },
  { type: 'optimistic', label: 'Optimistic', icon: '☀️', color: 'bg-amber-50 text-amber-800 border-amber-200 shadow-xs' },
  { type: 'grounded', label: 'Grounded', icon: '⛰️', color: 'bg-slate-100 text-slate-700 border-slate-200 shadow-xs' },
  { type: 'seeking_clarity', label: 'Seeking Clarity', icon: '🧭', color: 'bg-sky-50 text-sky-700 border-sky-200 shadow-xs' },
  { type: 'anxious', label: 'Anxious', icon: '🌧️', color: 'bg-rose-50 text-rose-700 border-rose-200 shadow-xs' },
  { type: 'fatigued', label: 'Fatigued', icon: '🌙', color: 'bg-purple-50 text-purple-700 border-purple-200 shadow-xs' },
  { type: 'energized', label: 'Energized', icon: '⚡', color: 'bg-yellow-50 text-yellow-800 border-yellow-200 shadow-xs' },
];

const PROMPT_STARTERS = [
  { text: "What gave me energy today, and what drained it?", tag: "energy" },
  { text: "A conversation or moment that lingered in my mind...", tag: "relationships" },
  { text: "Where am I feeling tension or uncertainty right now?", tag: "clarity" },
  { text: "A small win or insight I want to acknowledge...", tag: "gratitude" },
];

export const JournalChat: React.FC<JournalChatProps> = ({
  userId,
  profileSummary,
  recentEntries,
  onEntrySaved,
  prefillPrompt,
  onClearPrefill,
}) => {
  const [title, setTitle] = useState('');
  const [currentInput, setCurrentInput] = useState('');
  const [selectedMood, setSelectedMood] = useState<MoodType>('reflective');
  const [tags, setTags] = useState<string[]>(['daily-reflection']);
  const [tagInput, setTagInput] = useState('');
  const [conversation, setConversation] = useState<ChatTurn[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [currentEntryId, setCurrentEntryId] = useState<string>(() => 'entry_' + Date.now());
  const [saveStatus, setSaveStatus] = useState<string | null>(null);

  const chatBottomRef = useRef<HTMLDivElement>(null);

  // Auto-scroll when chat updates
  useEffect(() => {
    chatBottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [conversation, isLoading]);

  // Handle prefilled prompt from nudge
  useEffect(() => {
    if (prefillPrompt) {
      setCurrentInput(prefillPrompt.prompt);
      if (prefillPrompt.tag && !tags.includes(prefillPrompt.tag)) {
        setTags(prev => [...prev, prefillPrompt.tag]);
      }
      if (!title) {
        setTitle(`Reflecting on ${prefillPrompt.tag}`);
      }
      onClearPrefill?.();
    }
  }, [prefillPrompt]);

  const handleAddTag = () => {
    const clean = tagInput.trim().toLowerCase().replace(/^#/, '');
    if (clean && !tags.includes(clean)) {
      setTags([...tags, clean]);
      setTagInput('');
    }
  };

  const handleRemoveTag = (tagToRemove: string) => {
    setTags(tags.filter(t => t !== tagToRemove));
  };

  const handleSendThought = async () => {
    if (!currentInput.trim() || isLoading) return;

    const userText = currentInput.trim();
    setCurrentInput('');

    // Generate title if empty
    if (!title.trim()) {
      const generatedTitle = userText.split('\n')[0].slice(0, 45) + (userText.length > 45 ? '...' : '');
      setTitle(generatedTitle);
    }

    const userTurn: ChatTurn = {
      id: 'turn_' + Date.now(),
      role: 'user',
      text: userText,
      timestamp: new Date().toISOString(),
    };

    const newHistory = [...conversation, userTurn];
    setConversation(newHistory);
    setIsLoading(true);

    try {
      // 1. Call secure server-side Gemini endpoint with memory + recency context
      const res = await askGeminiReflection({
        message: userText,
        profileSummary,
        recentEntries,
        conversationHistory: newHistory,
      });

      const assistantTurn: ChatTurn = {
        id: 'turn_' + (Date.now() + 1),
        role: 'assistant',
        text: res.reply,
        timestamp: res.timestamp || new Date().toISOString(),
      };

      const finalHistory = [...newHistory, assistantTurn];
      setConversation(finalHistory);

      // Auto-save entry to Firestore after each turn
      await persistEntry(finalHistory);
    } catch (err: any) {
      console.error('Error generating reflection:', err);
      const isHighDemand = err?.message?.includes('503') || err?.message?.includes('high demand');
      const errorMsg = isHighDemand
        ? "I'm holding space for this reflection. Gemini is momentarily under high demand, but your journal thoughts are safely recorded."
        : `*I had trouble processing that thought (${err.message || 'connection error'}). Your journal entry has been safely preserved.*`;

      const fallbackTurn: ChatTurn = {
        id: 'turn_err_' + Date.now(),
        role: 'assistant',
        text: errorMsg,
        timestamp: new Date().toISOString(),
      };
      const fallbackHistory = [...newHistory, fallbackTurn];
      setConversation(fallbackHistory);
      await persistEntry(fallbackHistory);
    } finally {
      setIsLoading(false);
    }
  };

  const persistEntry = async (chatTurns: ChatTurn[]) => {
    try {
      setIsSaving(true);
      const fullContent = chatTurns
        .filter(t => t.role === 'user')
        .map(t => t.text)
        .join('\n\n');

      const fullReflection = chatTurns
        .filter(t => t.role === 'assistant')
        .map(t => t.text)
        .join('\n\n');

      // Attempt to analyze visual sentiment with Gemini
      let derivedSentiment = undefined;
      try {
        if (fullContent.trim().length > 10) {
          const sentRes = await analyzeEntrySentiment({
            title: title.trim() || 'Untitled Reflection',
            content: fullContent,
            conversation: chatTurns,
            mood: selectedMood,
          });
          if (sentRes && sentRes.sentiment) {
            derivedSentiment = sentRes.sentiment;
          }
        }
      } catch (sentimentErr) {
        console.warn('Silent fallback for sentiment derivation:', sentimentErr);
      }

      const entry: JournalEntry = {
        id: currentEntryId,
        userId,
        title: title.trim() || 'Untitled Reflection',
        content: fullContent,
        mood: selectedMood,
        tags,
        conversation: chatTurns,
        reflectionSummary: fullReflection.slice(0, 500),
        sentiment: derivedSentiment,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        wordCount: fullContent.split(/\s+/).filter(Boolean).length,
      };

      // 1. Save to users/{uid}/entries/{id}
      await saveJournalEntry(userId, entry);
      onEntrySaved(entry);
      setSaveStatus('Entry saved & sentiment indexed');
      setTimeout(() => setSaveStatus(null), 3000);

      // 2. Trigger asynchronous memory update in the background
      triggerMemoryUpdate({
        existingSummary: profileSummary?.summary || '',
        newEntryTitle: entry.title,
        newEntryContent: entry.content,
        newReflection: fullReflection,
      }).catch(err => console.warn('Background profile summary update error:', err));

    } catch (error: any) {
      console.error('Failed to save entry to Firestore:', error);
      setSaveStatus('Save error: ' + error.message);
    } finally {
      setIsSaving(false);
    }
  };

  const handleStartNewEntry = () => {
    setTitle('');
    setCurrentInput('');
    setSelectedMood('reflective');
    setTags(['daily-reflection']);
    setConversation([]);
    setCurrentEntryId('entry_' + Date.now());
  };

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      
      {/* Top Header Card */}
      <div className="bg-white/60 backdrop-blur-xl border border-white/70 rounded-3xl p-5 sm:p-6 shadow-sm">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-200/60 pb-4 mb-4">
          <div>
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-xl bg-indigo-50 border border-indigo-200/80 flex items-center justify-center text-indigo-700">
                <Feather className="w-4 h-4" />
              </div>
              <h2 className="text-xl font-serif font-bold text-slate-900">Mindful Journaling Studio</h2>
            </div>
            <p className="text-xs text-slate-500 mt-1">
              Reflective dialogue powered by Gemini 3.7 Flash with persistent user memory
            </p>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            {saveStatus && (
              <span className="text-xs font-mono px-3 py-1 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 flex items-center gap-1 font-medium shadow-xs">
                <BookmarkCheck className="w-3.5 h-3.5" />
                {saveStatus}
              </span>
            )}

            <button
              id="btn-new-entry"
              onClick={handleStartNewEntry}
              className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-semibold bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 shadow-xs transition-all cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5 text-indigo-600" />
              <span>New Entry</span>
            </button>
          </div>
        </div>

        {/* Title & Mood Configuration */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
          <div className="md:col-span-7">
            <label className="block text-xs font-semibold text-slate-600 mb-1">
              Entry Title
            </label>
            <input
              id="input-entry-title"
              type="text"
              placeholder="e.g. Unpacking this afternoon's career pivot..."
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full px-3.5 py-2 rounded-xl bg-white/70 backdrop-blur-md border border-slate-200/80 text-slate-800 placeholder-slate-400 text-sm focus:outline-none focus:bg-white focus:border-indigo-400 shadow-xs"
            />
          </div>

          <div className="md:col-span-5">
            <label className="block text-xs font-semibold text-slate-600 mb-1">
              Current Emotion / State
            </label>
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
              {MOODS.slice(0, 4).map((m) => (
                <button
                  key={m.type}
                  onClick={() => setSelectedMood(m.type)}
                  className={`px-2.5 py-1.5 rounded-xl text-xs font-medium border flex items-center gap-1 whitespace-nowrap transition-all cursor-pointer ${
                    selectedMood === m.type
                      ? `${m.color} ring-2 ring-indigo-500/30 font-semibold`
                      : 'bg-white/50 text-slate-600 border-slate-200/60 hover:bg-white'
                  }`}
                >
                  <span>{m.icon}</span>
                  <span>{m.label}</span>
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Tags & Context Pill */}
        <div className="flex flex-wrap items-center justify-between gap-3 mt-4 pt-3 border-t border-slate-200/60 text-xs">
          
          {/* Tags */}
          <div className="flex items-center gap-2 flex-wrap">
            <Tag className="w-3.5 h-3.5 text-slate-400" />
            {tags.map((t) => (
              <span
                key={t}
                className="px-2.5 py-0.5 rounded-full bg-slate-100/90 text-slate-700 border border-slate-200 flex items-center gap-1 font-mono text-[11px]"
              >
                #{t}
                <button
                  onClick={() => handleRemoveTag(t)}
                  className="text-slate-400 hover:text-slate-700 ml-0.5 cursor-pointer"
                >
                  ×
                </button>
              </span>
            ))}
            <div className="flex items-center gap-1">
              <input
                id="input-tag-adder"
                type="text"
                placeholder="+ tag"
                value={tagInput}
                onChange={(e) => setTagInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleAddTag()}
                className="w-16 px-1.5 py-0.5 bg-transparent border-b border-slate-300 text-[11px] text-slate-700 focus:outline-none focus:border-indigo-500"
              />
            </div>
          </div>

          {/* RAG / Memory Context Indicator */}
          <div className="flex items-center gap-2 text-slate-500 font-mono text-[11px]">
            <div className="flex items-center gap-1 text-indigo-700 font-medium">
              <Brain className="w-3.5 h-3.5 text-indigo-600" />
              <span>Memory Layer:</span>
            </div>
            <span>
              {profileSummary ? 'Profile Context Injected' : 'Initializing memory...'}
            </span>
            <span className="text-slate-300">|</span>
            <span>{recentEntries.length} prior entries cached</span>
          </div>

        </div>
      </div>

      {/* Starter Suggestions (Shown if no turns yet) */}
      {conversation.length === 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {PROMPT_STARTERS.map((starter, idx) => (
            <button
              key={idx}
              onClick={() => {
                setCurrentInput(starter.text);
                if (!tags.includes(starter.tag)) setTags([...tags, starter.tag]);
              }}
              className="p-4 text-left rounded-2xl bg-white/60 hover:bg-white/90 backdrop-blur-md border border-white/80 hover:border-indigo-200 transition-all text-xs text-slate-600 flex items-start gap-3 shadow-xs group cursor-pointer"
            >
              <div className="w-7 h-7 rounded-xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600 flex-shrink-0 group-hover:scale-105 transition-transform">
                <Compass className="w-3.5 h-3.5" />
              </div>
              <div>
                <span className="font-semibold text-slate-800 font-serif">Prompt Starter</span>
                <p className="text-slate-600 group-hover:text-slate-800 mt-0.5 leading-relaxed">{starter.text}</p>
              </div>
            </button>
          ))}
        </div>
      )}

      {/* Conversation / Reflection Thread */}
      {conversation.length > 0 && (
        <div className="space-y-4">
          {conversation.map((turn) => {
            const isUser = turn.role === 'user';
            return (
              <div
                key={turn.id}
                className={`flex gap-3 p-4 sm:p-5 rounded-3xl border transition-all ${
                  isUser
                    ? 'bg-indigo-50/80 backdrop-blur-md border-indigo-100 text-slate-800 ml-4 sm:ml-12 shadow-xs'
                    : 'bg-white/80 backdrop-blur-xl border-white/90 text-slate-800 mr-4 sm:mr-12 shadow-sm'
                }`}
              >
                <div className="flex-shrink-0">
                  {isUser ? (
                    <div className="w-8 h-8 rounded-xl bg-indigo-100 border border-indigo-200 flex items-center justify-center text-indigo-700">
                      <Feather className="w-4 h-4" />
                    </div>
                  ) : (
                    <div className="w-8 h-8 rounded-xl bg-amber-50 border border-amber-200 flex items-center justify-center text-amber-600">
                      <Sparkles className="w-4 h-4" />
                    </div>
                  )}
                </div>

                <div className="flex-1 space-y-1.5 overflow-hidden">
                  <div className="flex items-center justify-between text-xs text-slate-500">
                    <span className="font-semibold text-slate-800 font-serif">
                      {isUser ? 'My Reflection' : 'Reflect AI Companion'}
                    </span>
                    <span className="text-[10px] font-mono text-slate-400">
                      {new Date(turn.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>

                  <div className="prose prose-slate max-w-none text-sm text-slate-700 leading-relaxed font-sans">
                    <Markdown>{turn.text}</Markdown>
                  </div>
                </div>
              </div>
            );
          })}

          {isLoading && (
            <div className="flex gap-3 p-4 sm:p-5 rounded-3xl bg-white/80 backdrop-blur-xl border border-indigo-100 mr-12 text-slate-700 shadow-sm">
              <div className="w-8 h-8 rounded-xl bg-indigo-50 border border-indigo-200 flex items-center justify-center text-indigo-600 flex-shrink-0">
                <Sparkles className="w-4 h-4 animate-spin text-indigo-600" />
              </div>
              <div className="space-y-1">
                <div className="text-xs text-indigo-900 font-semibold font-serif">Reflecting on your entry...</div>
                <div className="text-xs text-slate-500 font-sans">
                  Synthesizing psychological context & personal themes
                </div>
              </div>
            </div>
          )}

          <div ref={chatBottomRef} />
        </div>
      )}

      {/* Input Box */}
      <div className="bg-white/70 backdrop-blur-xl border border-white/80 rounded-3xl p-3 sm:p-4 shadow-md">
        <div className="relative">
          <textarea
            id="textarea-journal-input"
            rows={3}
            value={currentInput}
            onChange={(e) => setCurrentInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
                e.preventDefault();
                handleSendThought();
              }
            }}
            placeholder="Write your journal thoughts freely... (Ctrl+Enter to reflect)"
            className="w-full p-3.5 rounded-2xl bg-white/80 border border-slate-200/80 text-slate-800 placeholder-slate-400 text-sm focus:outline-none focus:bg-white focus:border-indigo-400 resize-none font-sans leading-relaxed shadow-inner"
          />

          <div className="flex items-center justify-between mt-2 pt-2 border-t border-slate-200/60 text-xs">
            <div className="text-slate-400 text-[11px] hidden sm:block">
              Press <kbd className="px-1.5 py-0.5 rounded bg-slate-100 text-slate-600 font-mono text-[10px] border border-slate-200">Ctrl</kbd> + <kbd className="px-1.5 py-0.5 rounded bg-slate-100 text-slate-600 font-mono text-[10px] border border-slate-200">Enter</kbd> to reflect
            </div>

            <div className="flex items-center gap-2 ml-auto">
              <button
                id="btn-send-journal"
                onClick={handleSendThought}
                disabled={!currentInput.trim() || isLoading}
                className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold bg-indigo-600 hover:bg-indigo-700 text-white disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-md shadow-indigo-600/20 cursor-pointer"
              >
                <span>Reflect with AI</span>
                <Send className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>
      </div>

    </div>
  );
};
