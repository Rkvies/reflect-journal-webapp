import React, { useState, useRef, useEffect, useMemo } from 'react';
import { 
  Send, 
  Sparkles, 
  Tag, 
  Plus, 
  Square, 
  Radio, 
  Shuffle,
  Check,
  Feather,
  Flame,
  Mic,
  MicOff
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

const MOODS: { type: MoodType; label: string; icon: string }[] = [
  { type: 'reflective', label: 'Reflective', icon: '🌌' },
  { type: 'peaceful', label: 'Peaceful', icon: '🍃' },
  { type: 'optimistic', label: 'Optimistic', icon: '☀️' },
  { type: 'grounded', label: 'Grounded', icon: '⛰️' },
  { type: 'seeking_clarity', label: 'Seeking Clarity', icon: '🧭' },
  { type: 'anxious', label: 'Anxious', icon: '🌧️' },
  { type: 'fatigued', label: 'Fatigued', icon: '🌙' },
  { type: 'energized', label: 'Energized', icon: '⚡' },
];

export interface WritingStarter {
  prompt: string;
  tag: string;
  category: string;
}

const WRITING_STARTERS_POOL: WritingStarter[] = [
  { prompt: "What's been on your mind today?", tag: "clarity", category: "Mindfulness" },
  { prompt: "Describe a small win from this week that brought you joy.", tag: "gratitude", category: "Small Wins" },
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

  // Calculate daily reflection streak from recentEntries
  const streakCount = useMemo(() => {
    if (!recentEntries || recentEntries.length === 0) return 0;

    const localDates = recentEntries
      .filter(entry => entry.createdAt)
      .map(entry => {
        const date = new Date(entry.createdAt);
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
      });

    const uniqueDates = Array.from(new Set(localDates)).sort((a, b) => b.localeCompare(a));
    if (uniqueDates.length === 0) return 0;

    const today = new Date();
    const formatDate = (date: Date) => {
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const day = String(date.getDate()).padStart(2, '0');
      return `${year}-${month}-${day}`;
    };

    const todayStr = formatDate(today);
    const yesterday = new Date(today);
    yesterday.setDate(today.getDate() - 1);
    const yesterdayStr = formatDate(yesterday);

    const mostRecentDate = uniqueDates[0];
    if (mostRecentDate !== todayStr && mostRecentDate !== yesterdayStr) {
      return 0;
    }

    let streak = 0;
    const currentDateToCheck = new Date(mostRecentDate === todayStr ? today : yesterday);

    while (true) {
      const targetStr = formatDate(currentDateToCheck);
      if (uniqueDates.includes(targetStr)) {
        streak++;
        currentDateToCheck.setDate(currentDateToCheck.getDate() - 1);
      } else {
        break;
      }
    }

    return streak;
  }, [recentEntries]);

  const chatBottomRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  // Web Speech API Voice Dictation State & Ref
  const [isListening, setIsListening] = useState(false);
  const [speechSupported, setSpeechSupported] = useState(true);
  const recognitionRef = useRef<any>(null);

  useEffect(() => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      setSpeechSupported(false);
    }
  }, []);

  const toggleListening = () => {
    if (isListening) {
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
      setIsListening(false);
    } else {
      const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      if (!SpeechRecognition) {
        alert("Voice dictation is not supported by your browser. Please try Chrome, Safari, or Edge.");
        return;
      }

      try {
        const recognition = new SpeechRecognition();
        recognition.continuous = true;
        recognition.interimResults = true;
        recognition.lang = 'en-US';

        recognition.onstart = () => {
          setIsListening(true);
        };

        recognition.onerror = (event: any) => {
          console.error('Speech recognition error:', event.error);
          setIsListening(false);
        };

        recognition.onend = () => {
          setIsListening(false);
        };

        recognition.onresult = (event: any) => {
          let finalTranscript = '';
          for (let i = event.resultIndex; i < event.results.length; ++i) {
            if (event.results[i].isFinal) {
              finalTranscript += event.results[i][0].transcript;
            }
          }
          if (finalTranscript) {
            setCurrentInput(prev => {
              const trimmed = prev.trim();
              return trimmed ? trimmed + ' ' + finalTranscript.trim() : finalTranscript.trim();
            });
          }
        };

        recognitionRef.current = recognition;
        recognition.start();
      } catch (err) {
        console.error('Failed to start speech recognition:', err);
        setIsListening(false);
      }
    }
  };

  // Clean up speech recognition on unmount
  useEffect(() => {
    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
    };
  }, []);

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
      if (prefillPrompt.tag) {
        setTags(prev => prev.includes(prefillPrompt.tag) ? prev : [...prev, prefillPrompt.tag]);
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

      await persistEntry(finalHistory);
    } catch (err: any) {
      if (err?.name === 'AbortError') {
        console.log('Stream generation aborted by user');
        setStreamingReply(null);
        abortControllerRef.current = null;
        await persistEntry(newHistory);
        return;
      }

      console.error('Error generating streamed reflection:', err);
      setStreamingReply(null);
      abortControllerRef.current = null;

      const isHighDemand = err?.message?.includes('503') || err?.message?.includes('high demand');
      const errorMsg = isHighDemand
        ? "I'm holding space for this reflection. Gemini is momentarily busy, but your reflection has been safely saved."
        : `*Unable to complete reflection dialogue (${err.message || 'connection error'}). Your entry is safely saved.*`;

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

      await saveJournalEntry(userId, entry);
      onEntrySaved(entry);
      setSaveStatus('Saved');
      setTimeout(() => setSaveStatus(null), 2500);

      triggerMemoryUpdate({
        existingSummary: profileSummary?.summary || '',
        newEntryTitle: entry.title,
        newEntryContent: entry.content,
        newReflection: fullReflection,
      }).catch(err => console.warn('Background profile summary update error:', err));

    } catch (error: any) {
      console.error('Failed to save entry to Firestore:', error);
      setSaveStatus('Error saving');
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
    <div className="max-w-3xl mx-auto space-y-8">
      
      {/* Entry Header & Intention Controls */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2.5">
              <h2 className="text-xl font-serif font-bold text-slate-900 dark:text-white">
                Daily Reflection
              </h2>
              {streakCount > 0 && (
                <div 
                  id="streak-counter-badge"
                  className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-indigo-50/70 dark:bg-indigo-950/40 border border-indigo-200/20 dark:border-indigo-900/30 text-indigo-600 dark:text-indigo-400 text-[10px] font-sans font-medium select-none animate-fade-in"
                  title="Consecutive daily reflections streak"
                >
                  <Flame className="w-3 h-3 fill-current text-indigo-500 dark:text-indigo-400" />
                  <span>{streakCount} {streakCount === 1 ? 'day' : 'days'} streak</span>
                </div>
              )}
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Reflect with your personal AI companion
            </p>
          </div>

          <div className="flex items-center gap-3">
            {saveStatus && (
              <span className="text-xs text-indigo-600 dark:text-indigo-400 flex items-center gap-1 font-medium animate-fade-in">
                <Check className="w-3.5 h-3.5" />
                {saveStatus}
              </span>
            )}

            {(conversation.length > 0 || title.trim() || currentInput.trim()) && (
              <button
                id="btn-new-entry"
                onClick={handleStartNewEntry}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>New Reflection</span>
              </button>
            )}
          </div>
        </div>

        {/* Title Input */}
        <div>
          <input
            id="input-entry-title"
            type="text"
            placeholder="Reflection title (optional)..."
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="w-full px-0 py-1.5 bg-transparent border-b border-slate-200 dark:border-slate-800 text-slate-900 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 text-sm font-serif font-medium focus:outline-none focus:border-indigo-500 transition-colors"
          />
        </div>

        {/* Mood & Tags Bar (Clean and Muted) */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-1 text-xs">
          {/* Mood Selector Chips */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
            {MOODS.map((m) => (
              <button
                key={m.type}
                type="button"
                onClick={() => setSelectedMood(m.type)}
                className={`px-2.5 py-1 rounded-xl text-xs font-medium flex items-center gap-1.5 whitespace-nowrap transition-all cursor-pointer ${
                  selectedMood === m.type
                    ? 'bg-indigo-50 dark:bg-indigo-950/70 text-indigo-700 dark:text-indigo-300 font-semibold ring-1 ring-indigo-300 dark:ring-indigo-700'
                    : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800/80'
                }`}
              >
                <span>{m.icon}</span>
                <span>{m.label}</span>
              </button>
            ))}
          </div>

          {/* Tags */}
          <div className="flex items-center gap-1.5 flex-wrap">
            {Array.from(new Set(tags)).map((t, idx) => (
              <span
                key={`${t}-${idx}`}
                className="px-2 py-0.5 rounded-lg bg-slate-100 dark:bg-slate-800/90 text-slate-600 dark:text-slate-300 text-[11px] font-sans flex items-center gap-1"
              >
                #{t}
                <button
                  onClick={() => handleRemoveTag(t)}
                  className="text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 cursor-pointer ml-0.5"
                >
                  ×
                </button>
              </span>
            ))}
            <input
              id="input-tag-adder"
              type="text"
              placeholder="+ tag"
              value={tagInput}
              onChange={(e) => setTagInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleAddTag()}
              className="w-14 px-1 py-0.5 bg-transparent border-b border-slate-200 dark:border-slate-800 text-[11px] text-slate-600 dark:text-slate-300 focus:outline-none focus:border-indigo-500"
            />
          </div>
        </div>
      </div>

      {/* Active Conversation Thread */}
      {(conversation.length > 0 || streamingReply !== null || isLoading) && (
        <div className="space-y-5 pt-2">
          {conversation.map((turn) => {
            const isUser = turn.role === 'user';
            return (
              <div
                key={turn.id}
                className={`p-5 rounded-2xl transition-all ${
                  isUser
                    ? 'bg-slate-100/70 dark:bg-slate-900/60 text-slate-850 dark:text-slate-100 ml-4 sm:ml-8'
                    : 'bg-white dark:bg-slate-900 shadow-sm border border-slate-200/60 dark:border-slate-800 text-slate-800 dark:text-slate-100 mr-4 sm:mr-8'
                }`}
              >
                <div className="flex items-center justify-between text-xs text-slate-400 dark:text-slate-500 mb-2">
                  <span className="font-semibold text-slate-700 dark:text-slate-300 font-serif">
                    {isUser ? 'You' : 'Reflect'}
                  </span>
                  <span className="text-[11px] font-mono">
                    {new Date(turn.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>

                <div className="prose prose-slate dark:prose-invert max-w-none text-sm text-slate-700 dark:text-slate-200 leading-relaxed font-sans">
                  <Markdown>{turn.text}</Markdown>
                </div>
              </div>
            );
          })}

          {/* Loading state before streaming chunks */}
          {isLoading && (!streamingReply || streamingReply === '') && (
            <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/60 dark:border-slate-800 text-slate-800 dark:text-slate-100 mr-4 sm:mr-8 shadow-sm animate-fade-in space-y-2">
              <div className="flex items-center justify-between text-xs text-slate-400 dark:text-slate-500">
                <span className="font-semibold text-slate-700 dark:text-slate-300 font-serif">Reflect</span>
                <span className="text-[11px] font-mono">Reflecting...</span>
              </div>
              <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400 py-1">
                <span className="w-2 h-2 rounded-full bg-indigo-600 dark:bg-indigo-400 animate-pulse" />
                <span className="italic">Synthesizing context and holding space...</span>
              </div>
            </div>
          )}

          {/* Live Streaming Token Box */}
          {streamingReply !== null && streamingReply !== '' && (
            <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-indigo-200 dark:border-indigo-900/60 text-slate-800 dark:text-slate-100 mr-4 sm:mr-8 shadow-sm">
              <div className="flex items-center justify-between text-xs text-slate-400 dark:text-slate-500 mb-2">
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-slate-700 dark:text-slate-300 font-serif">Reflect</span>
                  <span className="inline-flex items-center gap-1 text-[10px] font-mono text-indigo-600 dark:text-indigo-400 font-medium">
                    <Radio className="w-2.5 h-2.5 animate-pulse" /> Streaming
                  </span>
                </div>
              </div>

              <div className="prose prose-slate dark:prose-invert max-w-none text-sm text-slate-700 dark:text-slate-200 leading-relaxed font-sans">
                <Markdown>{streamingReply}</Markdown>
                <span className="inline-block w-1.5 h-3.5 bg-indigo-600 dark:bg-indigo-400 animate-pulse ml-1 align-middle rounded-full" />
              </div>
            </div>
          )}

          <div ref={chatBottomRef} />
        </div>
      )}

      {/* Primary Journal Input Box (Hero Focal Point) */}
      <div className="bg-white dark:bg-slate-900 rounded-3xl p-5 sm:p-6 shadow-md border border-slate-200/70 dark:border-slate-800/80 transition-all space-y-3">
        
        {/* Integrated Quick Writing Starters */}
        <div className="flex items-center justify-between gap-2 overflow-x-auto pb-1 scrollbar-none text-xs">
          <div className="flex items-center gap-1.5 flex-1 min-w-0 overflow-x-auto scrollbar-none py-0.5">
            <span className="text-[11px] font-medium text-slate-400 dark:text-slate-500 flex-shrink-0">
              Prompt starters:
            </span>
            {activeStarters.map((starter, idx) => (
              <button
                key={idx}
                id={`btn-starter-${idx}`}
                type="button"
                onClick={() => handleSelectStarter(starter)}
                className="px-3 py-1 rounded-xl bg-slate-100/90 dark:bg-slate-800 hover:bg-indigo-50 dark:hover:bg-indigo-950/60 text-slate-700 dark:text-slate-300 hover:text-indigo-700 dark:hover:text-indigo-300 text-[11px] font-medium whitespace-nowrap transition-colors flex-shrink-0 cursor-pointer"
                title={starter.prompt}
              >
                <span className="truncate max-w-[220px] sm:max-w-[280px]">{starter.prompt}</span>
              </button>
            ))}
          </div>

          <button
            id="btn-shuffle-starters"
            type="button"
            onClick={handleShuffleStarters}
            className="p-1.5 rounded-lg text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors flex-shrink-0 cursor-pointer"
            title="Rotate starters"
          >
            <Shuffle className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Textarea */}
        <div className="space-y-3">
          <textarea
            id="textarea-journal-input"
            ref={textareaRef}
            rows={5}
            value={currentInput}
            onChange={(e) => setCurrentInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
                e.preventDefault();
                handleSendThought();
              }
            }}
            placeholder={
              conversation.length === 0
                ? "Write freely about your day, thoughts, or emotions... (Press Ctrl+Enter to reflect)"
                : "Continue your reflection..."
            }
            disabled={isLoading}
            className="w-full p-4 rounded-2xl bg-slate-50/80 dark:bg-slate-950/60 text-slate-850 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 text-sm font-sans leading-relaxed focus:outline-none focus:bg-white dark:focus:bg-slate-950 focus:ring-2 focus:ring-indigo-500/20 resize-none transition-all disabled:opacity-50"
          />

          <div className="flex items-center justify-between pt-1">
            <span className="text-[11px] text-slate-400 dark:text-slate-500 hidden sm:inline font-sans">
              Press <kbd className="px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 font-mono text-[10px]">Ctrl</kbd> + <kbd className="px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 font-mono text-[10px]">Enter</kbd> to reflect
            </span>

            <div className="flex items-center gap-2 ml-auto">
              {speechSupported && (
                <button
                  id="btn-voice-dictation"
                  type="button"
                  onClick={toggleListening}
                  disabled={isLoading}
                  className={`flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-xs font-semibold border transition-all cursor-pointer ${
                    isListening
                      ? 'bg-rose-500 hover:bg-rose-600 text-white border-rose-500 animate-pulse'
                      : 'bg-white dark:bg-slate-900 border-slate-200/80 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800/60'
                  }`}
                  title={isListening ? "Stop listening" : "Start speaking to dictate"}
                >
                  {isListening ? (
                    <>
                      <MicOff className="w-3.5 h-3.5" />
                      <span>Listening...</span>
                    </>
                  ) : (
                    <>
                      <Mic className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
                      <span>Dictate</span>
                    </>
                  )}
                </button>
              )}

              {isLoading ? (
                <button
                  id="btn-stop-streaming"
                  onClick={handleStopStreaming}
                  className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold bg-rose-50 dark:bg-rose-950/60 hover:bg-rose-100 text-rose-700 dark:text-rose-300 transition-colors cursor-pointer"
                >
                  <Square className="w-3 h-3 fill-current" />
                  <span>Stop</span>
                </button>
              ) : (
                <button
                  id="btn-send-journal"
                  onClick={handleSendThought}
                  disabled={!currentInput.trim() || isLoading}
                  className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-semibold bg-indigo-600 hover:bg-indigo-700 text-white disabled:opacity-40 disabled:cursor-not-allowed transition-all shadow-sm cursor-pointer"
                >
                  <span>Reflect</span>
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
