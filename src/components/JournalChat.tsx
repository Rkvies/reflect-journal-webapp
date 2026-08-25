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
  Feather,
  Square,
  Radio,
  Lightbulb,
  Shuffle
} from 'lucide-react';
import Markdown from 'react-markdown';
import { 
  JournalEntry, 
  ChatTurn, 
  MoodType, 
  ProfileSummary 
} from '../types';
import { streamGeminiReflection, triggerMemoryUpdate, analyzeEntrySentiment } from '../lib/api';
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
  { type: 'reflective', label: 'Reflective', icon: '🌌', color: 'bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 border-indigo-200 dark:border-indigo-800 shadow-xs' },
  { type: 'peaceful', label: 'Peaceful', icon: '🍃', color: 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800 shadow-xs' },
  { type: 'optimistic', label: 'Optimistic', icon: '☀️', color: 'bg-amber-50 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 border-amber-200 dark:border-amber-800 shadow-xs' },
  { type: 'grounded', label: 'Grounded', icon: '⛰️', color: 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 shadow-xs' },
  { type: 'seeking_clarity', label: 'Seeking Clarity', icon: '🧭', color: 'bg-sky-50 dark:bg-sky-950/60 text-sky-700 dark:text-sky-300 border-sky-200 dark:border-sky-800 shadow-xs' },
  { type: 'anxious', label: 'Anxious', icon: '🌧️', color: 'bg-rose-50 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300 border-rose-200 dark:border-rose-800 shadow-xs' },
  { type: 'fatigued', label: 'Fatigued', icon: '🌙', color: 'bg-purple-50 dark:bg-purple-950/60 text-purple-700 dark:text-purple-300 border-purple-200 dark:border-purple-800 shadow-xs' },
  { type: 'energized', label: 'Energized', icon: '⚡', color: 'bg-yellow-50 dark:bg-yellow-950/60 text-yellow-800 dark:text-yellow-300 border-yellow-200 dark:border-yellow-800 shadow-xs' },
];

export interface WritingStarter {
  prompt: string;
  tag: string;
  category: string;
}

const WRITING_STARTERS_POOL: WritingStarter[] = [
  { prompt: "What's been on your mind today?", tag: "clarity", category: "Mindfulness" },
  { prompt: "Describe a small win from this week that brought you joy.", tag: "gratitude", category: "Small Wins" },
  { prompt: "What's something you're looking forward to, and why?", tag: "optimism", category: "Looking Forward" },
  { prompt: "What gave me energy today, and what drained it?", tag: "energy", category: "Energy Audit" },
  { prompt: "Where am I feeling tension or uncertainty right now?", tag: "emotional-checkin", category: "Emotional Check-in" },
  { prompt: "A conversation or moment that lingered in my thoughts...", tag: "relationships", category: "Connection" },
  { prompt: "What is one thing I need to forgive myself or let go of today?", tag: "self-compassion", category: "Release" },
  { prompt: "What boundary did I honor or wish I had honored today?", tag: "boundaries", category: "Personal Growth" },
  { prompt: "If I could give myself gentle advice right now, what would it be?", tag: "wisdom", category: "Self-Wisdom" },
  { prompt: "What made me pause or feel truly present today?", tag: "presence", category: "Presence" },
  { prompt: "What would make tomorrow feel deeply peaceful or fulfilling?", tag: "intentions", category: "Daily Intent" },
  { prompt: "How has my body felt today, and what is it trying to tell me?", tag: "grounding", category: "Body & Mind" }
];

const getRandomStarters = (count = 3): WritingStarter[] => {
  const shuffled = [...WRITING_STARTERS_POOL].sort(() => 0.5 - Math.random());
  return shuffled.slice(0, count);
};

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
  const [streamingReply, setStreamingReply] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [currentEntryId, setCurrentEntryId] = useState<string>(() => 'entry_' + Date.now());
  const [saveStatus, setSaveStatus] = useState<string | null>(null);
  const [activeStarters, setActiveStarters] = useState<WritingStarter[]>(() => getRandomStarters(3));

  const chatBottomRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  // Auto-scroll when chat updates or tokens stream in
  useEffect(() => {
    chatBottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [conversation, isLoading, streamingReply]);

  // Rotate / shuffle starters
  const handleShuffleStarters = () => {
    setActiveStarters(getRandomStarters(3));
  };

  // Insert starter into input box for editing before submit
  const handleSelectStarter = (starter: WritingStarter) => {
    setCurrentInput(starter.prompt + ' ');
    if (starter.tag && !tags.includes(starter.tag)) {
      setTags(prev => [...prev, starter.tag]);
    }
    if (!title.trim()) {
      setTitle(starter.prompt.length > 40 ? starter.prompt.slice(0, 37) + '...' : starter.prompt);
    }
    // Smoothly focus textarea
    setTimeout(() => {
      if (textareaRef.current) {
        textareaRef.current.focus();
        textareaRef.current.setSelectionRange(starter.prompt.length + 1, starter.prompt.length + 1);
      }
    }, 50);
  };

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

  // Clean up in-flight streaming on component unmount
  useEffect(() => {
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, []);

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

  const handleStopStreaming = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
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
    setStreamingReply('');

    const controller = new AbortController();
    abortControllerRef.current = controller;

    try {
      // 1. Call secure server-side Gemini streaming endpoint with memory + recency context
      const res = await streamGeminiReflection({
        message: userText,
        profileSummary,
        recentEntries,
        conversationHistory: newHistory,
        signal: controller.signal,
        onChunk: (_chunk, accumulated) => {
          setStreamingReply(accumulated);
        },
      });

      const assistantTurn: ChatTurn = {
        id: 'turn_' + (Date.now() + 1),
        role: 'assistant',
        text: res.fullText,
        timestamp: res.timestamp || new Date().toISOString(),
      };

      const finalHistory = [...newHistory, assistantTurn];
      setConversation(finalHistory);
      setStreamingReply(null);
      abortControllerRef.current = null;

      // Auto-save complete entry to Firestore after full response is received
      await persistEntry(finalHistory);
    } catch (err: any) {
      if (err?.name === 'AbortError') {
        console.log('Stream generation aborted by user/navigation');
        setStreamingReply(null);
        abortControllerRef.current = null;
        // Interrupted stream: do not save corrupted partial reflection; preserve user's written thought
        await persistEntry(newHistory);
        return;
      }

      console.error('Error generating streamed reflection:', err);
      setStreamingReply(null);
      abortControllerRef.current = null;

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
      setStreamingReply(null);
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
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    setTitle('');
    setCurrentInput('');
    setSelectedMood('reflective');
    setTags(['daily-reflection']);
    setConversation([]);
    setStreamingReply(null);
    setCurrentEntryId('entry_' + Date.now());
  };

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      
      {/* Top Header Card */}
      <div className="bg-white/60 dark:bg-slate-900/70 backdrop-blur-xl border border-white/70 dark:border-white/10 rounded-3xl p-5 sm:p-6 shadow-sm transition-colors">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-200/60 dark:border-slate-800/80 pb-4 mb-4">
          <div>
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-200/80 dark:border-indigo-800/60 flex items-center justify-center text-indigo-700 dark:text-indigo-400">
                <Feather className="w-4 h-4" />
              </div>
              <h2 className="text-xl font-serif font-bold text-slate-900 dark:text-white">Mindful Journaling Studio</h2>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              Live streamed reflective dialogue powered by Gemini 3.7 Flash with persistent user memory
            </p>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            {saveStatus && (
              <span className="text-xs font-mono px-3 py-1 rounded-full bg-emerald-50 dark:bg-emerald-950/70 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 flex items-center gap-1 font-medium shadow-xs">
                <BookmarkCheck className="w-3.5 h-3.5" />
                {saveStatus}
              </span>
            )}

            <button
              id="btn-new-entry"
              onClick={handleStartNewEntry}
              className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-semibold bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 shadow-xs transition-all cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
              <span>New Entry</span>
            </button>
          </div>
        </div>

        {/* Title & Mood Configuration */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
          <div className="md:col-span-7">
            <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">
              Entry Title
            </label>
            <input
              id="input-entry-title"
              type="text"
              placeholder="e.g. Unpacking this afternoon's career pivot..."
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full px-3.5 py-2 rounded-xl bg-white/70 dark:bg-slate-800/80 backdrop-blur-md border border-slate-200/80 dark:border-slate-700 text-slate-800 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 text-sm focus:outline-none focus:bg-white dark:focus:bg-slate-800 focus:border-indigo-400 dark:focus:border-indigo-500 shadow-xs"
            />
          </div>

          <div className="md:col-span-5">
            <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">
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
                      : 'bg-white/50 dark:bg-slate-800/50 text-slate-600 dark:text-slate-400 border-slate-200/60 dark:border-slate-700/60 hover:bg-white dark:hover:bg-slate-800'
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
        <div className="flex flex-wrap items-center justify-between gap-3 mt-4 pt-3 border-t border-slate-200/60 dark:border-slate-800/80 text-xs">
          
          {/* Tags */}
          <div className="flex items-center gap-2 flex-wrap">
            <Tag className="w-3.5 h-3.5 text-slate-400 dark:text-slate-500" />
            {tags.map((t) => (
              <span
                key={t}
                className="px-2.5 py-0.5 rounded-full bg-slate-100/90 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 flex items-center gap-1 font-mono text-[11px]"
              >
                #{t}
                <button
                  onClick={() => handleRemoveTag(t)}
                  className="text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 ml-0.5 cursor-pointer"
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
                className="w-16 px-1.5 py-0.5 bg-transparent border-b border-slate-300 dark:border-slate-700 text-[11px] text-slate-700 dark:text-slate-300 focus:outline-none focus:border-indigo-500"
              />
            </div>
          </div>

          {/* RAG / Memory Context Indicator */}
          <div className="flex items-center gap-2 text-slate-500 dark:text-slate-400 font-mono text-[11px]">
            <div className="flex items-center gap-1 text-indigo-700 dark:text-indigo-400 font-medium">
              <Brain className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
              <span>Memory Layer:</span>
            </div>
            <span>
              {profileSummary ? 'Profile Context Injected' : 'Initializing memory...'}
            </span>
            <span className="text-slate-300 dark:text-slate-700">|</span>
            <span>{recentEntries.length} prior entries cached</span>
          </div>

        </div>
      </div>

      {/* Onboarding Welcome Banner (Shown when user has zero journal entries) */}
      {recentEntries.length === 0 && conversation.length === 0 && (
        <div className="p-5 sm:p-6 rounded-3xl bg-gradient-to-br from-indigo-500/10 via-amber-500/5 to-white/70 dark:from-indigo-950/40 dark:via-slate-900/40 dark:to-slate-800/80 backdrop-blur-xl border border-indigo-200/80 dark:border-indigo-500/30 shadow-sm space-y-3">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-indigo-600 dark:bg-indigo-500 text-white flex items-center justify-center shadow-xs">
              <Sparkles className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-serif font-bold text-slate-900 dark:text-white">Welcome to your Reflect sanctuary</h3>
              <p className="text-xs text-slate-600 dark:text-slate-300">Your secure, private space for personal clarity and growth.</p>
            </div>
          </div>
          <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed font-sans">
            Write your first reflection — try starting with{' '}
            <button
              onClick={() => setCurrentInput("Today I ")}
              className="font-semibold text-indigo-700 dark:text-indigo-400 underline hover:text-indigo-900 dark:hover:text-indigo-300 cursor-pointer"
            >
              "Today I..."
            </button>{' '}
            or choose one of the gentle starters below.
          </p>
        </div>
      )}

      {/* Starter Suggestions (Shown if no turns yet) */}
      {conversation.length === 0 && !streamingReply && (
        <div className="space-y-2.5">
          <div className="flex items-center justify-between px-1">
            <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-700 dark:text-slate-300 font-serif">
              <Sparkles className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
              <span>Thought Starters for Today</span>
            </div>
            <button
              id="btn-shuffle-starters-top"
              type="button"
              onClick={handleShuffleStarters}
              className="text-[11px] font-mono text-indigo-600 dark:text-indigo-400 hover:text-indigo-800 dark:hover:text-indigo-300 flex items-center gap-1 transition-colors cursor-pointer"
              title="Shuffle prompt suggestions"
            >
              <Shuffle className="w-3 h-3" />
              <span>Rotate Starters</span>
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {activeStarters.map((starter, idx) => (
              <button
                key={idx}
                id={`btn-starter-card-${idx}`}
                type="button"
                onClick={() => handleSelectStarter(starter)}
                className="p-4 text-left rounded-2xl bg-white/70 dark:bg-slate-900/70 hover:bg-white/95 dark:hover:bg-slate-850 backdrop-blur-md border border-white/80 dark:border-white/10 hover:border-indigo-200 dark:hover:border-indigo-500/40 transition-all text-xs text-slate-600 dark:text-slate-400 flex flex-col justify-between gap-2 shadow-xs group cursor-pointer"
              >
                <div className="flex items-center justify-between w-full">
                  <span className="text-[10px] font-mono uppercase tracking-wider px-2 py-0.5 rounded-full bg-indigo-50 dark:bg-indigo-950/70 text-indigo-700 dark:text-indigo-300 border border-indigo-100 dark:border-indigo-800 font-semibold">
                    {starter.category}
                  </span>
                  <Compass className="w-3.5 h-3.5 text-slate-400 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors" />
                </div>
                <p className="text-slate-700 dark:text-slate-200 group-hover:text-indigo-900 dark:group-hover:text-white font-sans text-xs leading-relaxed">
                  "{starter.prompt}"
                </p>
                <span className="text-[10px] text-indigo-600 dark:text-indigo-400 font-mono font-medium flex items-center gap-1 group-hover:translate-x-0.5 transition-transform">
                  Insert to draft →
                </span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Conversation / Reflection Thread */}
      {(conversation.length > 0 || streamingReply !== null || isLoading) && (
        <div className="space-y-4">
          {conversation.map((turn) => {
            const isUser = turn.role === 'user';
            return (
              <div
                key={turn.id}
                className={`flex gap-3 p-4 sm:p-5 rounded-3xl border transition-all ${
                  isUser
                    ? 'bg-indigo-50/80 dark:bg-indigo-950/50 backdrop-blur-md border-indigo-100 dark:border-indigo-900/60 text-slate-800 dark:text-slate-100 ml-4 sm:ml-12 shadow-xs'
                    : 'bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl border-white/90 dark:border-slate-800 text-slate-800 dark:text-slate-100 mr-4 sm:mr-12 shadow-sm'
                }`}
              >
                <div className="flex-shrink-0">
                  {isUser ? (
                    <div className="w-8 h-8 rounded-xl bg-indigo-100 dark:bg-indigo-900/80 border border-indigo-200 dark:border-indigo-800 flex items-center justify-center text-indigo-700 dark:text-indigo-300">
                      <Feather className="w-4 h-4" />
                    </div>
                  ) : (
                    <div className="w-8 h-8 rounded-xl bg-amber-50 dark:bg-amber-950/60 border border-amber-200 dark:border-amber-800 flex items-center justify-center text-amber-600 dark:text-amber-400">
                      <Sparkles className="w-4 h-4" />
                    </div>
                  )}
                </div>

                <div className="flex-1 space-y-1.5 overflow-hidden">
                  <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
                    <span className="font-semibold text-slate-800 dark:text-slate-200 font-serif">
                      {isUser ? 'My Reflection' : 'Reflect AI Companion'}
                    </span>
                    <span className="text-[10px] font-mono text-slate-400 dark:text-slate-500">
                      {new Date(turn.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>

                  <div className="prose prose-slate dark:prose-invert max-w-none text-sm text-slate-700 dark:text-slate-200 leading-relaxed font-sans">
                    <Markdown>{turn.text}</Markdown>
                  </div>
                </div>
              </div>
            );
          })}

          {/* Loading / Typing Indicator before streamed tokens arrive */}
          {isLoading && (!streamingReply || streamingReply === '') && (
            <div className="flex gap-3 p-4 sm:p-5 rounded-3xl bg-white/90 dark:bg-slate-900/90 backdrop-blur-xl border border-indigo-200/80 dark:border-indigo-500/30 text-slate-800 dark:text-slate-100 mr-4 sm:mr-12 shadow-sm animate-fade-in">
              <div className="flex-shrink-0">
                <div className="w-8 h-8 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-200 dark:border-indigo-800 flex items-center justify-center text-indigo-600 dark:text-indigo-400">
                  <Sparkles className="w-4 h-4 animate-pulse" />
                </div>
              </div>
              <div className="flex-1 space-y-2">
                <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
                  <span className="font-semibold text-slate-800 dark:text-slate-200 font-serif">Reflect AI Companion</span>
                  <span className="text-[10px] font-mono text-slate-400 dark:text-slate-500">Synthesizing context...</span>
                </div>
                <div className="flex items-center gap-2.5 text-xs text-indigo-700 dark:text-indigo-300 font-serif py-1">
                  <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-indigo-50 dark:bg-indigo-950/70 border border-indigo-200/80 dark:border-indigo-800/80 shadow-2xs">
                    <span className="w-2 h-2 rounded-full bg-indigo-600 dark:bg-indigo-400 typing-dot-1" />
                    <span className="w-2 h-2 rounded-full bg-indigo-600 dark:bg-indigo-400 typing-dot-2" />
                    <span className="w-2 h-2 rounded-full bg-indigo-600 dark:bg-indigo-400 typing-dot-3" />
                  </div>
                  <span className="text-xs text-slate-500 dark:text-slate-400 italic">Holding space and gathering thoughts...</span>
                </div>
              </div>
            </div>
          )}

          {/* Active Streaming Token Render */}
          {streamingReply !== null && streamingReply !== '' && (
            <div className="flex gap-3 p-4 sm:p-5 rounded-3xl bg-white/90 dark:bg-slate-900/90 backdrop-blur-xl border border-indigo-200/80 dark:border-indigo-500/40 text-slate-800 dark:text-slate-100 mr-4 sm:mr-12 shadow-md">
              <div className="flex-shrink-0">
                <div className="w-8 h-8 rounded-xl bg-amber-50 dark:bg-amber-950/60 border border-amber-200 dark:border-amber-800 flex items-center justify-center text-amber-600 dark:text-amber-400">
                  <Sparkles className="w-4 h-4 animate-pulse" />
                </div>
              </div>

              <div className="flex-1 space-y-1.5 overflow-hidden">
                <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-slate-800 dark:text-slate-200 font-serif">Reflect AI Companion</span>
                    <span className="inline-flex items-center gap-1 text-[10px] font-mono font-medium px-2 py-0.5 rounded-full bg-indigo-50 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800">
                      <Radio className="w-2.5 h-2.5 text-indigo-600 dark:text-indigo-400 animate-pulse" /> Streaming
                    </span>
                  </div>
                  <span className="text-[10px] font-mono text-slate-400 dark:text-slate-500">Just now</span>
                </div>

                <div className="prose prose-slate dark:prose-invert max-w-none text-sm text-slate-700 dark:text-slate-200 leading-relaxed font-sans">
                  <div>
                    <Markdown>{streamingReply}</Markdown>
                    <span className="inline-block w-1.5 h-4 bg-indigo-600 dark:bg-indigo-400 animate-pulse ml-1 align-middle rounded-full" />
                  </div>
                </div>
              </div>
            </div>
          )}

          <div ref={chatBottomRef} />
        </div>
      )}

      {/* Input Box */}
      <div className="bg-white/70 dark:bg-slate-900/70 backdrop-blur-xl border border-white/80 dark:border-white/10 rounded-3xl p-3.5 sm:p-4 shadow-md transition-colors space-y-2.5">
        
        {/* Quick Rotating Prompts Bar Above Textarea */}
        <div className="flex items-center justify-between gap-2 overflow-x-auto pb-0.5 scrollbar-none">
          <div className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400 font-serif flex-shrink-0">
            <Lightbulb className="w-3.5 h-3.5 text-amber-500" />
            <span className="font-semibold text-[11px] text-slate-700 dark:text-slate-300">Prompt Starters:</span>
          </div>

          <div className="flex items-center gap-1.5 flex-1 min-w-0 overflow-x-auto scrollbar-none py-0.5">
            {activeStarters.map((starter, idx) => (
              <button
                key={idx}
                id={`btn-quick-starter-${idx}`}
                type="button"
                onClick={() => handleSelectStarter(starter)}
                className="px-2.5 py-1 rounded-xl bg-indigo-50/70 dark:bg-indigo-950/60 hover:bg-indigo-100 dark:hover:bg-indigo-900/80 text-indigo-800 dark:text-indigo-200 border border-indigo-200/70 dark:border-indigo-800 text-[11px] font-medium whitespace-nowrap transition-all flex items-center gap-1 cursor-pointer flex-shrink-0 shadow-2xs hover:scale-[1.01]"
                title={`Click to insert: "${starter.prompt}"`}
              >
                <span>✨</span>
                <span className="truncate max-w-[200px] sm:max-w-[260px]">{starter.prompt}</span>
              </button>
            ))}
          </div>

          <button
            id="btn-shuffle-starters-input"
            type="button"
            onClick={handleShuffleStarters}
            className="p-1.5 rounded-lg text-slate-400 dark:text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors flex-shrink-0 cursor-pointer"
            title="Rotate / Shuffle prompts"
          >
            <Shuffle className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="relative">
          <textarea
            id="textarea-journal-input"
            ref={textareaRef}
            rows={3}
            value={currentInput}
            onChange={(e) => setCurrentInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
                e.preventDefault();
                handleSendThought();
              }
            }}
            placeholder={isLoading ? "Reflecting in progress..." : "Write your journal thoughts freely... (Ctrl+Enter to reflect)"}
            disabled={isLoading}
            className="w-full p-3.5 rounded-2xl bg-white/80 dark:bg-slate-800/80 border border-slate-200/80 dark:border-slate-700 text-slate-800 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 text-sm focus:outline-none focus:bg-white dark:focus:bg-slate-800 focus:border-indigo-400 dark:focus:border-indigo-500 resize-none font-sans leading-relaxed shadow-inner disabled:bg-slate-50 dark:disabled:bg-slate-900/50 disabled:text-slate-500"
          />

          <div className="flex items-center justify-between mt-2 pt-2 border-t border-slate-200/60 dark:border-slate-800 text-xs">
            <div className="text-slate-400 dark:text-slate-500 text-[11px] hidden sm:block">
              Press <kbd className="px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 font-mono text-[10px] border border-slate-200 dark:border-slate-700">Ctrl</kbd> + <kbd className="px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 font-mono text-[10px] border border-slate-200 dark:border-slate-700">Enter</kbd> to reflect
            </div>

            <div className="flex items-center gap-2 ml-auto">
              {isLoading ? (
                <button
                  id="btn-stop-streaming"
                  onClick={handleStopStreaming}
                  className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold bg-rose-50 dark:bg-rose-950/60 hover:bg-rose-100 dark:hover:bg-rose-900/80 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-800 transition-all cursor-pointer shadow-2xs"
                  title="Stop generating reflection"
                >
                  <Square className="w-3 h-3 fill-rose-600 dark:fill-rose-400 text-rose-600 dark:text-rose-400" />
                  <span>Stop</span>
                </button>
              ) : (
                <button
                  id="btn-send-journal"
                  onClick={handleSendThought}
                  disabled={!currentInput.trim() || isLoading}
                  className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold bg-indigo-600 hover:bg-indigo-700 text-white disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-md shadow-indigo-600/20 cursor-pointer"
                >
                  <span>Reflect with AI</span>
                  <Send className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

    </div>
  );
};
