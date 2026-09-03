import React, { useState, useRef, useEffect, useMemo } from 'react';
import { 
  Send, 
  Sparkles, 
  Plus, 
  Square, 
  Radio, 
  Shuffle,
  Check,
  Flame,
  Mic,
  MicOff,
  Pencil,
  X,
  Clock,
  CheckCircle2,
  Focus,
  Maximize2,
  Minimize2,
  Languages,
  Globe,
  RotateCcw,
  Loader2,
  ChevronDown
} from 'lucide-react';
import Markdown from 'react-markdown';
import { 
  JournalEntry, 
  ChatTurn, 
  MoodType, 
  ProfileSummary,
  ProactiveNudge,
  EntrySentiment,
  AppUser
} from '../types';
import { streamGeminiReflection, triggerMemoryUpdate, translateText } from '../lib/api';
import { saveJournalEntry, saveProfileSummary } from '../lib/firebase';
import { SUPPORTED_LANGUAGES, getLanguageByCode, LanguageOption } from '../lib/languages';
import { SparkLoader } from './SparkVisual';
import { StreakParticles } from './StreakParticles';
import { ReflectMascot } from './ReflectMascot';
import { GreetingCard } from './GreetingCard';
import { motion, AnimatePresence } from 'motion/react';

interface JournalChatProps {
  user?: AppUser | null;
  userId: string;
  profileSummary: ProfileSummary | null;
  recentEntries: JournalEntry[];
  onEntrySaved: (entry: JournalEntry) => void;
  prefillPrompt?: { prompt: string; tag: string } | null;
  existingEntry?: JournalEntry | null;
  onClearExistingEntry?: () => void;
  onClearPrefill?: () => void;
  activeNudge?: ProactiveNudge | null;
  isDeepFocus?: boolean;
  onToggleDeepFocus?: () => void;
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

const isPromptMatchingNudge = (starterPrompt: string, nudgePrompt?: string) => {
  if (!nudgePrompt) return false;
  const p1 = starterPrompt.trim().toLowerCase().replace(/[^a-z0-9]/g, '');
  const p2 = nudgePrompt.trim().toLowerCase().replace(/[^a-z0-9]/g, '');
  if (!p1 || !p2) return false;
  return p1 === p2 || p1.includes(p2) || p2.includes(p1);
};

export const JournalChat: React.FC<JournalChatProps> = ({
  user,
  userId,
  profileSummary,
  recentEntries,
  onEntrySaved,
  prefillPrompt,
  existingEntry,
  onClearExistingEntry,
  onClearPrefill,
  activeNudge,
  isDeepFocus = false,
  onToggleDeepFocus,
}) => {
  const [localDeepFocus, setLocalDeepFocus] = useState(false);
  const isFocusMode = isDeepFocus !== undefined ? isDeepFocus : localDeepFocus;
  const rawToggleFocus = onToggleDeepFocus || (() => setLocalDeepFocus(prev => !prev));

  const [isRippling, setIsRippling] = useState(false);

  const handleToggleFocus = () => {
    setIsRippling(true);
    setTimeout(() => setIsRippling(false), 700);
    rawToggleFocus();
  };

  const [title, setTitle] = useState(() => {
    try {
      const draft = JSON.parse(localStorage.getItem(`reflect_draft_${userId}`) || '{}');
      return draft.title || '';
    } catch {
      return '';
    }
  });
  const [currentInput, setCurrentInput] = useState(() => {
    try {
      const draft = JSON.parse(localStorage.getItem(`reflect_draft_${userId}`) || '{}');
      return draft.currentInput || '';
    } catch {
      return '';
    }
  });
  const [selectedMood, setSelectedMood] = useState<MoodType>(() => {
    try {
      const draft = JSON.parse(localStorage.getItem(`reflect_draft_${userId}`) || '{}');
      return draft.selectedMood || 'reflective';
    } catch {
      return 'reflective';
    }
  });
  const [tags, setTags] = useState<string[]>(() => {
    try {
      const draft = JSON.parse(localStorage.getItem(`reflect_draft_${userId}`) || '{}');
      return draft.tags && draft.tags.length > 0 ? draft.tags : ['daily-reflection'];
    } catch {
      return ['daily-reflection'];
    }
  });
  const [tagInput, setTagInput] = useState('');
  const [conversation, setConversation] = useState<ChatTurn[]>(() => {
    try {
      const draft = JSON.parse(localStorage.getItem(`reflect_draft_${userId}`) || '{}');
      return Array.isArray(draft.conversation) ? draft.conversation : [];
    } catch {
      return [];
    }
  });
  const [isLoading, setIsLoading] = useState(false);
  const [streamingReply, setStreamingReply] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [currentEntryId, setCurrentEntryId] = useState<string>(() => {
    try {
      const draft = JSON.parse(localStorage.getItem(`reflect_draft_${userId}`) || '{}');
      return draft.currentEntryId || ('entry_' + Date.now());
    } catch {
      return 'entry_' + Date.now();
    }
  });
  const [saveStatus, setSaveStatus] = useState<string | null>(null);
  const [activeStarters, setActiveStarters] = useState<WritingStarter[]>(() => getRandomStarters(3));
  const [loadingStage, setLoadingStage] = useState<number>(0);
  const [editingTurnId, setEditingTurnId] = useState<string | null>(null);
  const [editingTurnText, setEditingTurnText] = useState<string>('');
  const [isEditingSaving, setIsEditingSaving] = useState(false);
  const [entryCreatedAt, setEntryCreatedAt] = useState<string>(() => {
    try {
      const draft = JSON.parse(localStorage.getItem(`reflect_draft_${userId}`) || '{}');
      return draft.entryCreatedAt || new Date().toISOString();
    } catch {
      return new Date().toISOString();
    }
  });
  const [entrySentiment, setEntrySentiment] = useState<EntrySentiment | null>(() => {
    try {
      const draft = JSON.parse(localStorage.getItem(`reflect_draft_${userId}`) || '{}');
      return draft.entrySentiment || null;
    } catch {
      return null;
    }
  });
  const [isContinuing, setIsContinuing] = useState(() => {
    try {
      const draft = JSON.parse(localStorage.getItem(`reflect_draft_${userId}`) || '{}');
      return !!draft.isContinuing;
    } catch {
      return false;
    }
  });

  // Automatically save in-progress reflection draft so tab navigation doesn't discard progress
  useEffect(() => {
    try {
      if (currentInput || title || conversation.length > 0) {
        localStorage.setItem(`reflect_draft_${userId}`, JSON.stringify({
          title,
          currentInput,
          selectedMood,
          tags,
          conversation,
          currentEntryId,
          entryCreatedAt,
          entrySentiment,
          isContinuing,
        }));
      } else {
        localStorage.removeItem(`reflect_draft_${userId}`);
      }
    } catch {
      // ignore storage errors
    }
  }, [title, currentInput, selectedMood, tags, conversation, currentEntryId, entryCreatedAt, entrySentiment, isContinuing, userId]);

  // Escape key listener for exiting focus mode
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isFocusMode && !editingTurnId) {
        handleToggleFocus();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isFocusMode, editingTurnId, handleToggleFocus]);

  // Real-time word count calculation
  const currentWordCount = useMemo(() => {
    const text = currentInput.trim();
    if (!text) return 0;
    return text.split(/\s+/).filter(Boolean).length;
  }, [currentInput]);

  // Personalized greeting calculations
  const firstName = useMemo(() => {
    if (user?.displayName) {
      const trimmed = user.displayName.trim();
      const first = trimmed.split(/\s+/)[0];
      return first || trimmed;
    }
    if (user?.email) {
      const emailPrefix = user.email.split('@')[0];
      if (emailPrefix) {
        return emailPrefix.charAt(0).toUpperCase() + emailPrefix.slice(1);
      }
    }
    return 'there';
  }, [user?.displayName, user?.email]);

  const greetingSubtext = useMemo(() => {
    const hour = new Date().getHours();
    if (hour >= 5 && hour < 12) {
      return "What's on your mind this morning?";
    } else if (hour >= 12 && hour < 17) {
      return "What's on your mind this afternoon?";
    } else if (hour >= 17 && hour < 22) {
      return "What's on your mind this evening?";
    } else {
      return "What's on your mind tonight?";
    }
  }, []);

  // Progressive loading status updates during reflection synthesis
  useEffect(() => {
    if (isLoading && (!streamingReply || streamingReply === '')) {
      setLoadingStage(0);
      const t1 = setTimeout(() => setLoadingStage(1), 1100);
      const t2 = setTimeout(() => setLoadingStage(2), 2400);
      return () => {
        clearTimeout(t1);
        clearTimeout(t2);
      };
    } else {
      setLoadingStage(0);
    }
  }, [isLoading, streamingReply]);

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

  // Compute latest reflection and recency calculations for engagement snapshot
  const latestEntry = useMemo(() => {
    if (!recentEntries || recentEntries.length === 0) return null;
    return [...recentEntries].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())[0];
  }, [recentEntries]);

  const hasEntryToday = useMemo(() => {
    if (!recentEntries || recentEntries.length === 0) return false;
    const now = new Date();
    const todayStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
    return recentEntries.some(e => {
      if (!e.createdAt) return false;
      const d = new Date(e.createdAt);
      const dStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
      return dStr === todayStr;
    });
  }, [recentEntries]);

  const timeSinceLastEntry = useMemo(() => {
    if (!latestEntry?.createdAt) return 'No reflections yet';
    const entryDate = new Date(latestEntry.createdAt);
    const now = new Date();
    const diffMs = now.getTime() - entryDate.getTime();
    if (diffMs < 0) return 'Just now';
    const diffMinutes = Math.floor(diffMs / (1000 * 60));
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    
    if (diffMinutes < 1) return 'Just now';
    if (diffMinutes < 60) return `${diffMinutes}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 7) return `${diffDays}d ago`;
    if (diffDays < 30) return `${Math.floor(diffDays / 7)}w ago`;
    return entryDate.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
  }, [latestEntry]);

  const chatBottomRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  // Web Speech API Voice Dictation State & Ref
  const [isListening, setIsListening] = useState(false);
  const [speechSupported, setSpeechSupported] = useState(true);
  const [dictateLangCode, setDictateLangCode] = useState<string>('en-US');
  const [showDictateLangMenu, setShowDictateLangMenu] = useState(false);
  const [interimSpeech, setInterimSpeech] = useState<string>('');
  const recognitionRef = useRef<any>(null);

  // Language Translation State
  const [isTranslatingInput, setIsTranslatingInput] = useState(false);
  const [showInputTransMenu, setShowInputTransMenu] = useState(false);
  const [originalInputBackup, setOriginalInputBackup] = useState<string | null>(null);
  const [translatedTurns, setTranslatedTurns] = useState<Record<string, { text: string; lang: string; isTranslating?: boolean }>>({});
  const [showTurnTransMenu, setShowTurnTransMenu] = useState<string | null>(null);
  const [activeTurnView, setActiveTurnView] = useState<Record<string, 'original' | 'translated'>>({});

  const activeDictateLang = useMemo(() => getLanguageByCode(dictateLangCode), [dictateLangCode]);

  useEffect(() => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      setSpeechSupported(false);
    }
  }, []);

  const stopListening = () => {
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch (e) {
        // ignore if already stopped
      }
      recognitionRef.current = null;
    }
    setIsListening(false);
    setInterimSpeech('');
  };

  const startListeningWithLang = (langCode: string) => {
    stopListening();

    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      alert("Voice dictation is not supported by your browser. Please try Chrome, Safari, or Edge.");
      return;
    }

    try {
      const recognition = new SpeechRecognition();
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.lang = langCode;

      recognition.onstart = () => {
        setIsListening(true);
      };

      recognition.onerror = (event: any) => {
        console.error('Speech recognition error:', event.error);
        stopListening();
      };

      recognition.onend = () => {
        setIsListening(false);
        setInterimSpeech('');
      };

      recognition.onresult = (event: any) => {
        let finalTranscript = '';
        let currentInterim = '';
        for (let i = event.resultIndex; i < event.results.length; ++i) {
          if (event.results[i].isFinal) {
            finalTranscript += event.results[i][0].transcript;
          } else {
            currentInterim += event.results[i][0].transcript;
          }
        }
        setInterimSpeech(currentInterim);
        if (finalTranscript) {
          setInterimSpeech('');
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
      stopListening();
    }
  };

  const toggleListening = () => {
    if (isListening) {
      stopListening();
    } else {
      startListeningWithLang(dictateLangCode);
    }
  };

  const handleSelectDictateLang = (code: string) => {
    setDictateLangCode(code);
    setShowDictateLangMenu(false);
    if (isListening) {
      startListeningWithLang(code);
    }
  };

  const handleTranslateInput = async (targetLang: LanguageOption) => {
    if (!currentInput.trim() || isTranslatingInput) return;
    setShowInputTransMenu(false);
    setIsTranslatingInput(true);
    if (originalInputBackup === null) {
      setOriginalInputBackup(currentInput);
    }
    try {
      const res = await translateText({
        text: currentInput,
        targetLanguage: targetLang.langName,
      });
      if (res.translatedText) {
        setCurrentInput(res.translatedText);
      }
    } catch (err) {
      console.error('Failed to translate input:', err);
      alert('Could not translate text at this time. Please try again.');
    } finally {
      setIsTranslatingInput(false);
    }
  };

  const handleUndoInputTranslation = () => {
    if (originalInputBackup !== null) {
      setCurrentInput(originalInputBackup);
      setOriginalInputBackup(null);
    }
  };

  const handleTranslateTurn = async (turnId: string, turnText: string, targetLang: LanguageOption) => {
    setShowTurnTransMenu(null);
    setTranslatedTurns(prev => ({
      ...prev,
      [turnId]: { text: prev[turnId]?.text || '', lang: targetLang.langName, isTranslating: true },
    }));

    try {
      const res = await translateText({
        text: turnText,
        targetLanguage: targetLang.langName,
      });
      if (res.translatedText) {
        setTranslatedTurns(prev => ({
          ...prev,
          [turnId]: { text: res.translatedText, lang: targetLang.langName, isTranslating: false },
        }));
        setActiveTurnView(prev => ({ ...prev, [turnId]: 'translated' }));
      }
    } catch (err) {
      console.error('Failed to translate turn:', err);
      setTranslatedTurns(prev => {
        const copy = { ...prev };
        delete copy[turnId];
        return copy;
      });
      alert('Could not translate this message right now.');
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


  useEffect(() => {
    if (existingEntry) {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
      setTitle(existingEntry.title || '');
      setSelectedMood(existingEntry.mood || 'reflective');
      setTags(existingEntry.tags && existingEntry.tags.length > 0 ? existingEntry.tags : ['daily-reflection']);

      let turns: ChatTurn[] = [];
      if (existingEntry.conversation && Array.isArray(existingEntry.conversation) && existingEntry.conversation.length > 0) {
        turns = existingEntry.conversation;
      } else if (existingEntry.content) {
        turns = [
          {
            id: 'turn_user_' + (existingEntry.id || Date.now()),
            role: 'user' as const,
            text: existingEntry.content,
            timestamp: existingEntry.createdAt,
          },
          ...(existingEntry.reflectionSummary ? [{
            id: 'turn_assistant_' + (existingEntry.id || Date.now()),
            role: 'assistant' as const,
            text: existingEntry.reflectionSummary,
            timestamp: existingEntry.createdAt,
          }] : [])
        ];
      }
      setConversation(turns);
      setCurrentEntryId(existingEntry.id);
      setEntryCreatedAt(existingEntry.createdAt);
      if (existingEntry.sentiment) {
        setEntrySentiment(existingEntry.sentiment);
      } else {
        setEntrySentiment(null);
      }
      setCurrentInput('');
      setStreamingReply(null);
      setEditingTurnId(null);
      setEditingTurnText('');
      setSaveStatus(null);
      setIsContinuing(true);
    }
  }, [existingEntry]);

  // Auto-scroll when chat updates or tokens stream in
  useEffect(() => {
    chatBottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [conversation, isLoading, streamingReply]);

  // Rotate / shuffle starters
  const handleShuffleStarters = () => {
    setActiveStarters(getRandomStarters(3));
  };

  // Sync active nudge with starter chips when active nudge is present
  useEffect(() => {
    if (activeNudge?.promptText) {
      const match = WRITING_STARTERS_POOL.find(s => 
        isPromptMatchingNudge(s.prompt, activeNudge.promptText)
      );
      if (match) {
        setActiveStarters(prev => {
          if (prev.some(s => isPromptMatchingNudge(s.prompt, activeNudge.promptText))) return prev;
          return [match, ...prev.filter(s => s.prompt !== match.prompt).slice(0, 2)];
        });
      }
    }
  }, [activeNudge?.promptText]);

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
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
      setConversation([]);
      setStreamingReply(null);
      setCurrentEntryId('entry_' + Date.now());
      setEditingTurnId(null);
      setEditingTurnText('');
      setEntryCreatedAt(new Date().toISOString());
      setEntrySentiment(null);

      setCurrentInput(prefillPrompt.prompt);
      
      const newTags = ['daily-reflection'];
      if (prefillPrompt.tag && !newTags.includes(prefillPrompt.tag)) {
        newTags.push(prefillPrompt.tag);
      }
      setTags(newTags);
      setTitle(`Reflecting on ${prefillPrompt.tag}`);
      setIsContinuing(false);
      
      onClearPrefill?.();
      onClearExistingEntry?.();
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

  // Automatically suggest relevant tags as user types based on past entries & profile themes
  const suggestedTags = useMemo(() => {
    const pastTagsSet = new Set<string>();
    recentEntries.forEach(entry => {
      if (entry.tags) {
        entry.tags.forEach(t => pastTagsSet.add(t.toLowerCase()));
      }
    });

    const profileThemes = profileSummary?.keyThemes || [];
    const candidates = new Set<string>([
      ...Array.from(pastTagsSet),
      ...profileThemes.map(t => t.toLowerCase().replace(/\s+/g, '-')),
      'gratitude', 'reflection', 'clarity', 'growth', 'mindfulness', 'energy', 'work', 'relationships', 'rest', 'intent', 'peace', 'balance'
    ]);

    const activeTagsLower = new Set(tags.map(t => t.toLowerCase()));
    const unselected = Array.from(candidates).filter(t => !activeTagsLower.has(t));

    const typedText = currentInput.toLowerCase();
    if (!typedText.trim()) {
      return unselected.slice(0, 5);
    }

    const typedWords = typedText.split(/\W+/).filter(Boolean);
    const scored = unselected.map(candidate => {
      let score = 0;
      const candidateLower = candidate.toLowerCase();
      typedWords.forEach(word => {
        if (candidateLower.includes(word) || word.includes(candidateLower)) {
          score += 3;
        }
      });
      let pastFreq = 0;
      recentEntries.forEach(e => {
        if (e.tags?.some(t => t.toLowerCase() === candidateLower)) {
          pastFreq++;
        }
      });
      score += pastFreq * 0.5;
      return { tag: candidate, score };
    });

    scored.sort((a, b) => b.score - a.score);
    const filtered = scored.filter(s => s.score > 0).map(s => s.tag);
    if (filtered.length === 0) {
      return unselected.slice(0, 5);
    }
    return filtered.slice(0, 5);
  }, [recentEntries, profileSummary, tags, currentInput]);

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
      abortControllerRef.current = null;
    }
    setIsLoading(false);
    setStreamingReply(null);
  };

  const handleSendThought = async () => {
    if (!currentInput.trim() || isLoading) return;

    // Stop active dictation microphone session when message is sent
    stopListening();

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
          if (!controller.signal.aborted) {
            setStreamingReply(accumulated);
          }
        },
      });

      if (controller.signal.aborted) {
        return;
      }

      const safeText = (typeof res?.fullText === 'string' && res.fullText.trim().length > 0)
        ? res.fullText.trim()
        : "Thank you for sharing your reflection today. I'm holding space for this thought. Take a mindful breath, notice what feels most present right now, and give yourself space as you reflect.";

      const assistantTurn: ChatTurn = {
        id: 'turn_' + (Date.now() + 1),
        role: 'assistant',
        text: safeText,
        timestamp: res.timestamp || new Date().toISOString(),
      };

      const finalHistory = [...newHistory, assistantTurn];
      setConversation(finalHistory);
      setStreamingReply(null);
      abortControllerRef.current = null;
      setIsLoading(false);

      await persistEntry(finalHistory, res.sentiment);
    } catch (err: any) {
      const isAbort =
        err?.name === 'AbortError' ||
        controller.signal.aborted ||
        String(err?.message || '').toLowerCase().includes('abort') ||
        String(err?.message || '').includes('BodyStreamBuffer') ||
        String(err?.message || '').toLowerCase().includes('cancel');

      if (isAbort) {
        console.log('Stream generation halted by user');
        setStreamingReply(null);
        abortControllerRef.current = null;
        setIsLoading(false);
        // Persist only the user's reflection turns without saving broken/partial text
        await persistEntry(newHistory);
        return;
      }

      console.error('Error generating streamed reflection:', err);
      setStreamingReply(null);
      abortControllerRef.current = null;
      setIsLoading(false);

      const reflectiveMessage =
        "Thank you for sharing your thoughts today. Even in quiet moments when words take time to form, what you've expressed is deeply meaningful. Take a slow, grounding breath and allow yourself space to sit with these feelings.\n\n*Your reflection has been safely saved in your journal.*";

      const fallbackTurn: ChatTurn = {
        id: 'turn_fallback_' + Date.now(),
        role: 'assistant',
        text: reflectiveMessage,
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

  const persistEntry = async (chatTurns: ChatTurn[], aiSentiment?: EntrySentiment) => {
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

      // Immediate heuristic sentiment based on self-reported mood
      const moodSentimentMap: Record<MoodType, EntrySentiment> = {
        peaceful: { label: 'Quiet Peace', emoji: '🌿', color: 'emerald', score: 85, summary: 'A calm, serene state of inner equilibrium and clarity.' },
        reflective: { label: 'Deeply Introspective', emoji: '🌌', color: 'indigo', score: 75, summary: 'Thoughtful exploration of personal perspectives and themes.' },
        optimistic: { label: 'Heartfelt Optimism', emoji: '☀️', color: 'amber', score: 90, summary: 'Hopeful anticipation and positive forward momentum.' },
        grounded: { label: 'Solid & Centered', emoji: '⛰️', color: 'teal', score: 85, summary: 'Anchored presence and steady internal grounding.' },
        seeking_clarity: { label: 'Seeking Perspective', emoji: '🧭', color: 'sky', score: 70, summary: 'Navigating uncertainty with mindful curiosity.' },
        anxious: { label: 'Tender & Processing', emoji: '🌧️', color: 'rose', score: 45, summary: 'Working gently through underlying tension and vulnerability.' },
        fatigued: { label: 'Resting & Restoring', emoji: '🌙', color: 'purple', score: 40, summary: 'Honoring tiredness and creating space to recharge.' },
        energized: { label: 'Energized & Focused', emoji: '⚡', color: 'teal', score: 88, summary: 'High vitality, creative momentum, and proactive intent.' },
      };

      const defaultSentiment: EntrySentiment = aiSentiment || moodSentimentMap[selectedMood] || {
        label: 'Reflective Thought',
        emoji: '🧘',
        color: 'indigo',
        score: 75,
        summary: 'A mindful moment of conscious personal reflection.',
      };

      const entry: JournalEntry = {
        id: currentEntryId,
        userId,
        title: title.trim() || 'Untitled Reflection',
        content: fullContent,
        mood: selectedMood,
        tags,
        conversation: chatTurns,
        reflectionSummary: fullReflection.slice(0, 500),
        sentiment: defaultSentiment,
        createdAt: entryCreatedAt,
        updatedAt: new Date().toISOString(),
        wordCount: fullContent.split(/\s+/).filter(Boolean).length,
      };

      // Save to Firestore with unified sentiment in a single write
      await saveJournalEntry(userId, entry);
      try {
        localStorage.removeItem(`reflect_draft_${userId}`);
      } catch {}
      setEntryCreatedAt(entry.createdAt);
      setEntrySentiment(defaultSentiment);
      onEntrySaved(entry);
      setSaveStatus('Saved');
      setTimeout(() => setSaveStatus(null), 2500);

      // Batch profile summary updates: only update every 3-4 entries or when initial profile is empty
      const isInitialProfile = !profileSummary?.summary || profileSummary.summary.length < 50;
      const isBatchThreshold = (recentEntries.length + 1) % 4 === 0;

      if (isInitialProfile || isBatchThreshold) {
        triggerMemoryUpdate({
          existingSummary: profileSummary?.summary || '',
          newEntryTitle: entry.title,
          newEntryContent: entry.content,
          newReflection: fullReflection,
        }).then(async (res) => {
          if (res?.updatedSummary) {
            await saveProfileSummary(userId, {
              userId,
              summary: res.updatedSummary,
              lastUpdated: res.updatedAt || new Date().toISOString(),
              keyThemes: profileSummary?.keyThemes || ['personal-growth'],
              totalEntriesAnalyzed: (profileSummary?.totalEntriesAnalyzed || 0) + 1,
            });
            console.log('[Memory Layer] Profile summary successfully updated & persisted to Firestore.');
          }
        }).catch(err => console.warn('Background profile summary update error:', err));
      }

    } catch (error: any) {
      console.error('Failed to save entry to Firestore:', error);
      setSaveStatus('Error saving');
    } finally {
      setIsSaving(false);
    }
  };

  const handleStartEditTurn = (turn: ChatTurn) => {
    setEditingTurnId(turn.id);
    setEditingTurnText(typeof turn.text === 'string' ? turn.text : String(turn.text || ''));
  };

  const handleCancelEditTurn = () => {
    setEditingTurnId(null);
    setEditingTurnText('');
  };

  const handleSaveEditTurn = async (turnId: string) => {
    if (!editingTurnText.trim() || isEditingSaving) return;

    setIsEditingSaving(true);
    try {
      const updatedHistory = conversation.map((turn) =>
        turn.id === turnId ? { ...turn, text: editingTurnText.trim() } : turn
      );
      setConversation(updatedHistory);

      const fullContent = updatedHistory
        .filter((t) => t.role === 'user')
        .map((t) => t.text)
        .join('\n\n');

      const fullReflection = updatedHistory
        .filter((t) => t.role === 'assistant')
        .map((t) => t.text)
        .join('\n\n');

      const now = new Date().toISOString();
      const updatedEntry: JournalEntry = {
        id: currentEntryId,
        userId,
        title: title.trim() || 'Untitled Reflection',
        content: fullContent,
        mood: selectedMood,
        tags,
        conversation: updatedHistory,
        reflectionSummary: fullReflection.slice(0, 500),
        sentiment: entrySentiment || {
          label: 'Reflective Thought',
          emoji: '🧘',
          color: 'indigo',
          score: 75,
          summary: 'A mindful moment of conscious personal reflection.',
        },
        createdAt: entryCreatedAt || now,
        updatedAt: now,
        wordCount: fullContent.split(/\s+/).filter(Boolean).length,
        isEdited: true,
        editedAt: now,
      };

      // Save modified entry text directly to Firestore scoped to userId
      await saveJournalEntry(userId, updatedEntry);
      onEntrySaved(updatedEntry);
      setSaveStatus('Saved');
      setTimeout(() => setSaveStatus(null), 2500);
      setEditingTurnId(null);
      setEditingTurnText('');
    } catch (err: any) {
      console.error('Failed to update journal entry in Firestore:', err);
      setSaveStatus('Error saving');
      setTimeout(() => setSaveStatus(null), 2500);
    } finally {
      setIsEditingSaving(false);
    }
  };

  const handleStartNewEntry = () => {
    try {
      localStorage.removeItem(`reflect_draft_${userId}`);
    } catch {}
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
    setEditingTurnId(null);
    setEditingTurnText('');
    setEntryCreatedAt(new Date().toISOString());
    setEntrySentiment(null);
    setIsContinuing(false);
    if (onClearExistingEntry) {
      onClearExistingEntry();
    }
  };

  return (
    <div className={`max-w-3xl mx-auto space-y-4 sm:space-y-8 transition-all duration-500 ${isFocusMode ? 'pt-2 sm:pt-4 max-w-3xl' : ''}`}>
      
      {/* Entry Header & Intention Controls */}
      <div className="space-y-2.5 sm:space-y-4">
        {/* Deep Focus Tranquil Sanctuary Header */}
        {!isFocusMode ? (
          <GreetingCard
            firstName={firstName}
            greetingSubtext={greetingSubtext}
            streakCount={streakCount}
            timeSinceLastEntry={timeSinceLastEntry}
            latestEntryTitle={latestEntry?.title}
            hasEntryToday={hasEntryToday}
            saveStatus={saveStatus}
            onNewEntry={handleStartNewEntry}
          />
        ) : (
          /* Deep Focus Tranquil Sanctuary Header */
          <div className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-2xl rounded-2xl p-3.5 sm:p-4 shadow-xl border border-indigo-200/60 dark:border-indigo-800/40 flex items-center justify-between gap-3 animate-fade-in">
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-10 h-10 rounded-xl bg-indigo-500/10 dark:bg-indigo-400/10 border border-indigo-300/60 dark:border-indigo-700/60 flex items-center justify-center text-indigo-600 dark:text-indigo-300 shrink-0 shadow-2xs">
                <Focus className="w-5 h-5 animate-pulse" />
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-xs sm:text-sm font-serif font-semibold text-slate-800 dark:text-slate-100">Deep Focus Mode</span>
                  <span className="text-[10px] px-2 py-0.5 rounded-md bg-indigo-50 dark:bg-indigo-950/80 text-indigo-700 dark:text-indigo-300 font-mono font-medium">
                    {currentWordCount} {currentWordCount === 1 ? 'word' : 'words'}
                  </span>
                </div>
                <p className="text-[11px] text-slate-600 dark:text-slate-300 truncate hidden sm:block">
                  Non-essentials hidden & background softened. Focus purely on your thoughts.
                </p>
              </div>
            </div>
            <button
              id="btn-exit-deep-focus-top"
              type="button"
              onClick={handleToggleFocus}
              className="relative overflow-hidden flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/70 dark:bg-slate-800/70 hover:bg-white dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 border border-white/80 dark:border-white/10 text-xs font-medium cursor-pointer transition-all shrink-0 shadow-2xs"
              title="Exit Deep Focus (or press Esc)"
            >
              {isRippling && (
                <motion.span
                  initial={{ scale: 0, opacity: 0.8 }}
                  animate={{ scale: 3, opacity: 0 }}
                  transition={{ duration: 0.65, ease: 'easeOut' }}
                  className="absolute inset-0 m-auto w-6 h-6 rounded-full bg-indigo-500/50 dark:bg-indigo-300/60 pointer-events-none"
                />
              )}
              <Minimize2 className={`w-4 h-4 transition-transform duration-300 ${isRippling ? 'scale-125' : ''}`} />
              <span>Exit Focus</span>
              <kbd className="hidden sm:inline-block px-1.5 py-0.2 bg-slate-200/60 dark:bg-slate-700/60 rounded text-[10px] font-mono text-slate-600 dark:text-slate-200">Esc</kbd>
            </button>
          </div>
        )}

        {/* Continuing Past Entry Indicator */}
        {isContinuing && (
          <div 
            id="banner-continuing-journal"
            className="flex items-center justify-between gap-3 px-4 py-2.5 rounded-2xl bg-indigo-50/90 dark:bg-indigo-950/70 border border-indigo-200/80 dark:border-indigo-800/60 backdrop-blur-md text-xs text-indigo-950 dark:text-indigo-100 animate-fade-in shadow-xs"
          >
            <div className="flex items-center gap-2.5 min-w-0">
              <Sparkles className="w-4 h-4 text-indigo-600 dark:text-indigo-400 shrink-0" />
              <span className="truncate">
                Continuing journal from{' '}
                <span className="font-semibold font-mono">
                  {new Date(entryCreatedAt).toLocaleDateString(undefined, {
                    month: 'short',
                    day: 'numeric',
                    year: 'numeric'
                  })}
                </span>
                {title ? `: "${title}"` : ''}
              </span>
            </div>
            <button
              type="button"
              id="btn-start-fresh-entry-banner"
              onClick={handleStartNewEntry}
              className="px-3 py-1.5 rounded-xl bg-white/90 dark:bg-slate-800/90 hover:bg-white dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-semibold border border-slate-200/80 dark:border-slate-700/80 transition-all shrink-0 cursor-pointer shadow-2xs"
            >
              Start New Entry
            </button>
          </div>
        )}

        {/* Title Input & Deep Focus Button Row */}
        <div className="flex items-center justify-between gap-3">
          <div className="flex-1 min-w-0">
            <input
              id="input-entry-title"
              type="text"
              placeholder="Reflection title (optional)..."
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full px-0 py-1.5 bg-transparent border-b border-slate-200 dark:border-slate-800 text-slate-900 dark:text-slate-100 placeholder-slate-600 dark:placeholder-slate-400 text-sm font-serif font-medium focus:outline-none focus:border-indigo-500 transition-colors"
            />
          </div>

          {/* Deep Focus Mode Toggle Button */}
          <button
            id="btn-toggle-deep-focus"
            type="button"
            onClick={handleToggleFocus}
            className={`relative overflow-hidden px-3.5 py-2 sm:px-3 sm:py-1.5 rounded-xl text-xs font-semibold flex items-center gap-2 transition-all hover:-translate-y-0.5 cursor-pointer shadow-xs backdrop-blur-md shrink-0 ${
              isFocusMode
                ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/25 border border-transparent'
                : 'bg-white/80 dark:bg-slate-800/80 hover:bg-white dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 border border-slate-200/80 dark:border-white/10'
            }`}
            title={isFocusMode ? "Exit Deep Focus mode (Esc)" : "Enter Deep Focus mode (fades background and hides non-essential elements)"}
          >
            {/* Ripple Wave Feedback */}
            {isRippling && (
              <motion.span
                initial={{ scale: 0, opacity: 0.85 }}
                animate={{ scale: 3.5, opacity: 0 }}
                transition={{ duration: 0.65, ease: 'easeOut' }}
                className="absolute inset-0 m-auto w-8 h-8 rounded-full bg-indigo-400/60 dark:bg-indigo-300/60 pointer-events-none"
              />
            )}
            <Focus className={`w-5 h-5 sm:w-4 sm:h-4 shrink-0 transition-transform duration-300 ${isRippling ? 'scale-125 rotate-45' : ''} ${isFocusMode ? 'text-white' : 'text-indigo-600 dark:text-indigo-300'}`} />
            <span className="inline-block whitespace-nowrap">{isFocusMode ? 'Focus Active' : 'Deep Focus'}</span>
          </button>
        </div>

        {/* Mood & Tags Bar (Clean and Muted) */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-2.5 sm:gap-3 pt-0.5 text-xs w-full">
          {/* Mood Selector Chips */}
          <div className="flex items-center gap-1.5 py-0.5 overflow-x-auto scrollbar-none whitespace-nowrap md:flex-wrap flex-1 min-w-0 max-w-full">
            {MOODS.map((m) => (
              <button
                key={m.type}
                type="button"
                onClick={() => setSelectedMood(m.type)}
                className={`px-2.5 py-1 rounded-xl text-xs font-medium flex items-center gap-1.5 whitespace-nowrap flex-shrink-0 transition-all hover:-translate-y-0.5 cursor-pointer backdrop-blur-md shadow-2xs ${
                  selectedMood === m.type
                    ? 'bg-indigo-50/90 dark:bg-indigo-950/80 text-indigo-700 dark:text-indigo-300 font-semibold border border-indigo-300/80 dark:border-indigo-700'
                    : 'bg-white/40 dark:bg-slate-900/40 text-slate-700 dark:text-slate-300 border border-white/60 dark:border-white/10 hover:bg-white/70 dark:hover:bg-slate-800/60'
                }`}
              >
                <span>{m.icon}</span>
                <span>{m.label}</span>
              </button>
            ))}
          </div>

          {/* Tags */}
          <div className="flex items-center gap-1.5 flex-wrap flex-1 min-w-0 justify-start md:justify-end pt-0.5">
            {Array.from(new Set(tags)).map((t, idx) => (
              <span
                key={`${t}-${idx}`}
                className="px-2 py-0.5 rounded-lg bg-white/60 dark:bg-slate-800/80 backdrop-blur-xs text-slate-700 dark:text-slate-200 text-[11px] font-sans flex items-center gap-1 whitespace-nowrap border border-white/60 dark:border-white/10 shadow-2xs"
              >
                #{t}
                <button
                  onClick={() => handleRemoveTag(t)}
                  className="text-slate-500 hover:text-slate-700 dark:hover:text-slate-200 cursor-pointer ml-0.5"
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
              className="w-14 px-1 py-0.5 bg-transparent border-b border-slate-300/60 dark:border-slate-700/60 text-[11px] text-slate-700 dark:text-slate-200 focus:outline-none focus:border-indigo-500 flex-shrink-0"
            />
          </div>
        </div>
      </div>

      {/* Active Conversation Thread */}
      {(conversation.length > 0 || streamingReply !== null || isLoading) && (
        <div className="space-y-5 pt-2">
          {conversation.map((turn) => {
            const isUser = turn.role === 'user';
            const isEditingThisTurn = editingTurnId === turn.id;

            return (
              <div
                key={turn.id}
                className={`p-5 rounded-3xl transition-all backdrop-blur-2xl ${
                  isUser
                    ? 'bg-indigo-50/70 dark:bg-indigo-950/45 text-slate-900 dark:text-slate-100 ml-4 sm:ml-8 border border-indigo-200/60 dark:border-indigo-800/40 shadow-sm'
                    : 'bg-white/75 dark:bg-slate-900/75 shadow-md border border-white/80 dark:border-white/10 text-slate-800 dark:text-slate-100 mr-4 sm:mr-8'
                }`}
              >
                <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 mb-2">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-slate-700 dark:text-slate-200 font-serif">
                      {isUser ? 'You' : 'Reflect'}
                    </span>
                    {isEditingThisTurn && (
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-indigo-100 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300 font-medium font-sans">
                        Editing
                      </span>
                    )}
                    {translatedTurns[turn.id] && !translatedTurns[turn.id].isTranslating && (
                      <div className="flex items-center gap-1 bg-indigo-100/70 dark:bg-indigo-950/70 p-0.5 rounded-lg border border-indigo-200/60 dark:border-indigo-800/60 text-[10px]">
                        <button
                          type="button"
                          onClick={() => setActiveTurnView(prev => ({ ...prev, [turn.id]: 'original' }))}
                          className={`px-1.5 py-0.5 rounded font-medium transition-colors cursor-pointer ${
                            (activeTurnView[turn.id] || 'translated') === 'original'
                              ? 'bg-white dark:bg-slate-800 text-indigo-700 dark:text-indigo-300 shadow-xs font-semibold'
                              : 'text-slate-600 hover:text-slate-700 dark:hover:text-slate-300'
                          }`}
                        >
                          Original
                        </button>
                        <button
                          type="button"
                          onClick={() => setActiveTurnView(prev => ({ ...prev, [turn.id]: 'translated' }))}
                          className={`px-1.5 py-0.5 rounded font-medium transition-colors cursor-pointer ${
                            (activeTurnView[turn.id] || 'translated') === 'translated'
                              ? 'bg-indigo-600 text-white shadow-xs font-semibold'
                              : 'text-slate-600 hover:text-slate-700 dark:hover:text-slate-300'
                          }`}
                        >
                          Translated ({translatedTurns[turn.id].lang})
                        </button>
                      </div>
                    )}
                  </div>
                  <div className="flex items-center gap-2 relative">
                    <span className="text-[11px] font-mono">
                      {new Date(turn.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                    
                    {/* Translate Turn Button */}
                    {!isEditingThisTurn && !isLoading && (
                      <div className="relative">
                        <button
                          id={`btn-translate-turn-${turn.id}`}
                          type="button"
                          onClick={() => setShowTurnTransMenu(prev => prev === turn.id ? null : turn.id)}
                          title="Translate this message into another language"
                          className="flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-medium text-slate-600 hover:text-indigo-600 dark:hover:text-indigo-600 hover:bg-slate-200/60 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                        >
                          <Languages className="w-3 h-3 text-indigo-600" />
                          <span>Translate</span>
                        </button>

                        {/* Turn Translation Language Menu Dropdown */}
                        {showTurnTransMenu === turn.id && (
                          <div className="absolute right-0 top-full mt-1.5 w-56 bg-white dark:bg-slate-900 rounded-2xl shadow-xl border border-slate-200/80 dark:border-slate-800 z-50 p-1.5 backdrop-blur-2xl animate-fade-in max-h-60 overflow-y-auto">
                            <div className="text-[10px] font-semibold text-slate-500 dark:text-slate-400 px-2 py-1 uppercase tracking-wider">
                              Translate message into:
                            </div>
                            {SUPPORTED_LANGUAGES.map((lang) => (
                              <button
                                key={lang.code}
                                type="button"
                                onClick={() => handleTranslateTurn(turn.id, typeof turn.text === 'string' ? turn.text : String(turn.text || ''), lang)}
                                className="w-full text-left px-2.5 py-1.5 rounded-xl text-xs font-medium text-slate-700 dark:text-slate-200 hover:bg-indigo-50 dark:hover:bg-indigo-950/60 hover:text-indigo-600 dark:hover:text-indigo-600 flex items-center gap-2 transition-colors cursor-pointer"
                              >
                                <span className="text-sm">{lang.flag}</span>
                                <span className="truncate">{lang.langName}</span>
                                <span className="text-[10px] text-slate-500 ml-auto">{lang.nativeName}</span>
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                    )}

                    {isUser && !isEditingThisTurn && !isLoading && (
                      <button
                        id={`btn-edit-turn-${turn.id}`}
                        type="button"
                        onClick={() => handleStartEditTurn(turn)}
                        title="Edit your reflection text"
                        className="flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-medium text-slate-600 hover:text-indigo-600 dark:hover:text-indigo-600 hover:bg-slate-200/60 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                      >
                        <Pencil className="w-3 h-3" />
                        <span>Edit</span>
                      </button>
                    )}
                  </div>
                </div>

                {isEditingThisTurn ? (
                  <div className="space-y-2.5 pt-1">
                    <textarea
                      id={`textarea-edit-turn-${turn.id}`}
                      rows={3}
                      value={editingTurnText}
                      onChange={(e) => setEditingTurnText(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Escape') {
                          e.preventDefault();
                          handleCancelEditTurn();
                        } else if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
                          e.preventDefault();
                          handleSaveEditTurn(turn.id);
                        }
                      }}
                      disabled={isEditingSaving}
                      className="w-full p-3 rounded-xl bg-white/90 dark:bg-slate-950/90 text-slate-900 dark:text-slate-100 placeholder-slate-500 text-sm font-sans leading-relaxed border border-indigo-300 dark:border-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500/30 resize-none backdrop-blur-md"
                      autoFocus
                    />
                    <div className="flex items-center justify-between gap-2 flex-wrap">
                      <span className="text-[10px] text-slate-500 dark:text-slate-400 font-mono">
                        Press Esc to cancel, Ctrl+Enter to save
                      </span>
                      <div className="flex items-center gap-2">
                        <button
                          id={`btn-cancel-edit-${turn.id}`}
                          type="button"
                          onClick={handleCancelEditTurn}
                          disabled={isEditingSaving}
                          className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-200/70 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                        >
                          <X className="w-3.5 h-3.5" />
                          <span>Cancel</span>
                        </button>
                        <button
                          id={`btn-save-edit-${turn.id}`}
                          type="button"
                          onClick={() => handleSaveEditTurn(turn.id)}
                          disabled={!editingTurnText.trim() || isEditingSaving}
                          className="flex items-center gap-1 px-3 py-1 rounded-lg text-xs font-semibold bg-indigo-600 hover:bg-indigo-700 text-white disabled:opacity-40 disabled:cursor-not-allowed transition-colors shadow-xs cursor-pointer"
                        >
                          <Check className="w-3.5 h-3.5" />
                          <span>{isEditingSaving ? 'Saving...' : 'Save'}</span>
                        </button>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div>
                    {translatedTurns[turn.id]?.isTranslating ? (
                      <div className="flex items-center gap-2 py-3 text-xs text-indigo-600 dark:text-indigo-300">
                        <Loader2 className="w-4 h-4 animate-spin" />
                        <span>Translating message into {translatedTurns[turn.id].lang}...</span>
                      </div>
                    ) : (
                      <div className="prose prose-slate dark:prose-invert max-w-none text-sm text-slate-700 dark:text-slate-200 leading-relaxed font-sans">
                        <Markdown>
                          {(translatedTurns[turn.id] && (activeTurnView[turn.id] || 'translated') === 'translated')
                            ? translatedTurns[turn.id].text
                            : (typeof turn.text === 'string' ? turn.text : String(turn.text || ''))}
                        </Markdown>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}

          {/* Progressive Loading state with subtle SparkLoader */}
          {isLoading && (!streamingReply || streamingReply === '') && (
            <div className="p-5 rounded-3xl bg-white/75 dark:bg-slate-900/75 backdrop-blur-2xl border border-white/80 dark:border-white/10 text-slate-800 dark:text-slate-100 mr-4 sm:mr-8 shadow-md animate-fade-in space-y-2.5">
              <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
                <span className="font-semibold text-slate-700 dark:text-slate-200 font-serif">Reflect</span>
                <span className="text-[11px] font-mono text-indigo-600 dark:text-indigo-300 font-medium">
                  {loadingStage === 0 ? 'Loading context...' : loadingStage === 1 ? 'Holding space...' : 'Synthesizing...'}
                </span>
              </div>
              <div className="flex items-center gap-3 text-xs text-slate-700 dark:text-slate-200 py-1">
                <SparkLoader size="sm" variant="indigo" />
                <span className="italic">
                  {loadingStage === 0
                    ? 'Loading your journal context and recency memory...'
                    : loadingStage === 1
                    ? 'Synthesizing mindful reflection with Gemini...'
                    : 'Holding space and streaming reflection...'}
                </span>
              </div>
            </div>
          )}

          {/* Live Streaming Token Box with Spark motif */}
          {streamingReply !== null && streamingReply !== '' && (
            <div className="p-5 rounded-3xl bg-white/80 dark:bg-slate-900/80 backdrop-blur-2xl border border-indigo-400/50 dark:border-indigo-500/40 text-slate-800 dark:text-slate-100 mr-4 sm:mr-8 shadow-lg ring-1 ring-indigo-300/30 space-y-2">
              <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 mb-2">
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-slate-700 dark:text-slate-200 font-serif">Reflect</span>
                  <span className="inline-flex items-center gap-1.5 text-[10px] font-mono text-indigo-600 dark:text-indigo-300 font-medium">
                    <Sparkles className="w-3 h-3 text-indigo-600 animate-spark-glimmer" />
                    <span>Streaming reflection</span>
                  </span>
                </div>
              </div>

              <div className="prose prose-slate dark:prose-invert max-w-none text-sm text-slate-700 dark:text-slate-200 leading-relaxed font-sans">
                <Markdown>{streamingReply}</Markdown>
                <span className="inline-flex items-center gap-1 ml-1.5 align-middle">
                  <Sparkles className="w-3 h-3 text-indigo-600 animate-spark-glimmer inline" />
                </span>
              </div>
            </div>
          )}

          <div ref={chatBottomRef} />
        </div>
      )}

      {/* Primary Journal Input Box (Hero Focal Point) */}
      <div className="bg-white/75 dark:bg-slate-900/75 backdrop-blur-2xl rounded-3xl p-5 sm:p-6 shadow-xl border border-white/80 dark:border-white/10 transition-all space-y-3">
        
        {/* Integrated Quick Writing Starters */}
        <div className="flex items-center justify-between gap-2 overflow-x-auto pb-1 scrollbar-none text-xs">
          <div className="flex items-center gap-1.5 flex-1 min-w-0 overflow-x-auto scrollbar-none py-0.5">
            <span className="text-[11px] font-medium text-slate-600 dark:text-slate-300 flex-shrink-0">
              Prompt starters:
            </span>
            {activeStarters.map((starter, idx) => {
              const isMatching = isPromptMatchingNudge(starter.prompt, activeNudge?.promptText);

              return (
                <button
                  key={idx}
                  id={`btn-starter-${idx}`}
                  type="button"
                  onClick={() => handleSelectStarter(starter)}
                  className={`px-3 py-1 rounded-xl text-[11px] font-medium whitespace-nowrap transition-all hover:-translate-y-0.5 flex-shrink-0 cursor-pointer flex items-center gap-1.5 backdrop-blur-md shadow-2xs ${
                    isMatching
                      ? 'bg-indigo-100/90 dark:bg-indigo-950/90 text-indigo-900 dark:text-indigo-200 border border-indigo-300/80 dark:border-indigo-700 shadow-xs'
                      : 'bg-white/50 dark:bg-slate-800/60 hover:bg-white/80 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 border border-white/60 dark:border-white/10'
                  }`}
                  title={isMatching ? `Matches active check-in above: "${starter.prompt}"` : starter.prompt}
                >
                  {isMatching && (
                    <span className="inline-flex items-center gap-1 px-1.5 py-0.2 rounded-md bg-indigo-200/80 dark:bg-indigo-900/90 text-indigo-950 dark:text-indigo-100 text-[10px] font-semibold">
                      <Sparkles className="w-2.5 h-2.5 text-indigo-600 dark:text-indigo-300" />
                      Check-in flow
                    </span>
                  )}
                  <span className="truncate max-w-[200px] sm:max-w-[260px]">{starter.prompt}</span>
                </button>
              );
            })}
          </div>

          <button
            id="btn-shuffle-starters"
            type="button"
            onClick={handleShuffleStarters}
            className="p-1.5 rounded-lg text-slate-500 hover:text-indigo-600 dark:hover:text-indigo-600 hover:bg-white/60 dark:hover:bg-slate-800/60 transition-colors flex-shrink-0 cursor-pointer"
            title="Rotate starters"
          >
            <Shuffle className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Textarea */}
        <div className="space-y-3 relative">
          
          {/* Active Voice Listening Banner */}
          {isListening && (
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 p-3 rounded-xl bg-rose-50/90 dark:bg-rose-950/60 border border-rose-200 dark:border-rose-900/60 text-xs animate-fade-in shadow-xs">
              <div className="flex items-center gap-2">
                <span className="relative flex h-2.5 w-2.5">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-rose-500"></span>
                </span>
                <span className="font-semibold text-rose-900 dark:text-rose-200">
                  Listening in {activeDictateLang.nativeName} ({activeDictateLang.langName}) {activeDictateLang.flag}...
                </span>
              </div>
              {interimSpeech && (
                <div className="text-slate-700 dark:text-slate-200 italic font-mono text-[11px] truncate max-w-xs">
                  "{interimSpeech}"
                </div>
              )}
            </div>
          )}

          {/* Translation Status Badge */}
          {originalInputBackup !== null && (
            <div className="flex items-center justify-between gap-2 px-3 py-1.5 rounded-xl bg-indigo-50/90 dark:bg-indigo-950/70 border border-indigo-200 dark:border-indigo-800 text-xs text-indigo-900 dark:text-indigo-200 animate-fade-in">
              <div className="flex items-center gap-1.5 font-medium">
                <Languages className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-300" />
                <span>Text translated. You can reflect in this language or undo.</span>
              </div>
              <button
                type="button"
                onClick={handleUndoInputTranslation}
                className="flex items-center gap-1 px-2 py-0.5 rounded-lg bg-indigo-200/80 dark:bg-indigo-900/80 hover:bg-indigo-300 text-indigo-950 dark:text-indigo-100 font-semibold text-[11px] transition-colors cursor-pointer"
              >
                <RotateCcw className="w-3 h-3" />
                <span>Undo</span>
              </button>
            </div>
          )}

          <textarea
            id="textarea-journal-input"
            ref={textareaRef}
            rows={isFocusMode ? 8 : 5}
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
                ? isFocusMode
                  ? "Breathe in, and write freely into the quiet space... (Ctrl+Enter to reflect)"
                  : "Write freely about your day, thoughts, or emotions... (Press Ctrl+Enter to reflect)"
                : "Continue your reflection..."
            }
            disabled={isLoading}
            className={`w-full p-4 sm:p-5 rounded-2xl bg-white/50 dark:bg-slate-950/50 backdrop-blur-md text-slate-900 dark:text-slate-100 placeholder-slate-500 dark:placeholder-slate-400 leading-relaxed focus:outline-none focus:bg-white/80 dark:focus:bg-slate-950/80 focus:ring-2 focus:ring-indigo-500/30 border border-white/60 dark:border-white/10 resize-none transition-all disabled:opacity-50 shadow-inner ${
              isFocusMode ? 'text-base font-serif' : 'text-sm font-sans'
            }`}
          />

          {/* Smart Tag Suggestions based on user typing and previous entries/themes */}
          {suggestedTags.length > 0 && (
            <div className="flex items-center gap-1.5 flex-wrap pt-1 px-1 animate-fade-in">
              <span className="text-[11px] text-slate-600 dark:text-slate-300 font-medium flex items-center gap-1">
                <Sparkles className="w-3 h-3 text-indigo-600 dark:text-indigo-300" />
                Suggested tags:
              </span>
              {suggestedTags.map((sTag) => (
                <button
                  key={sTag}
                  type="button"
                  onClick={() => {
                    if (!tags.includes(sTag)) {
                      setTags(prev => [...prev, sTag]);
                    }
                  }}
                  className="px-2.5 py-0.5 rounded-lg bg-indigo-50/80 dark:bg-indigo-950/60 hover:bg-indigo-100 dark:hover:bg-indigo-900 text-indigo-700 dark:text-indigo-300 text-[11px] font-sans transition-all cursor-pointer border border-indigo-200/50 dark:border-indigo-800/60 shadow-2xs backdrop-blur-xs"
                  title="Click to add suggested tag"
                >
                  +{sTag}
                </button>
              ))}
            </div>
          )}

          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 pt-1">
            <div className="flex items-center gap-2">
              <span className="text-[11px] text-slate-500 dark:text-slate-400 hidden sm:inline font-sans">
                Press <kbd className="px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-mono text-[10px]">Ctrl</kbd> + <kbd className="px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-mono text-[10px]">Enter</kbd> to reflect
              </span>
              {currentInput.length > 0 && (
                <span className="text-[11px] font-mono text-slate-500 dark:text-slate-400">
                  • {currentWordCount} {currentWordCount === 1 ? 'word' : 'words'} ({currentInput.length} chars)
                </span>
              )}
            </div>

            <div className="flex items-center gap-2 ml-auto flex-wrap sm:flex-nowrap justify-end">
              
              {/* Translate Input Button & Language Dropdown */}
              <div className="relative">
                <button
                  id="btn-translate-input"
                  type="button"
                  onClick={() => setShowInputTransMenu(prev => !prev)}
                  disabled={!currentInput.trim() || isTranslatingInput || isLoading}
                  className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold bg-white/60 dark:bg-slate-800/60 border border-white/80 dark:border-white/10 text-slate-700 dark:text-slate-200 hover:bg-white/90 dark:hover:bg-slate-800/90 disabled:opacity-40 disabled:cursor-not-allowed transition-all cursor-pointer shadow-xs"
                  title="Translate your written or dictated text into another language"
                >
                  {isTranslatingInput ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin text-indigo-600 dark:text-indigo-300" />
                      <span>Translating...</span>
                    </>
                  ) : (
                    <>
                      <Globe className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-300" />
                      <span>Translate</span>
                      <ChevronDown className="w-3 h-3 text-slate-500" />
                    </>
                  )}
                </button>

                {/* Input Translation Target Language Selector */}
                {showInputTransMenu && (
                  <div className="absolute right-0 bottom-full mb-2 w-60 bg-white dark:bg-slate-900 rounded-2xl shadow-xl border border-slate-200/80 dark:border-slate-800 z-50 p-2 backdrop-blur-2xl animate-fade-in max-h-64 overflow-y-auto">
                    <div className="text-[10px] font-semibold text-slate-500 dark:text-slate-400 px-2.5 py-1 uppercase tracking-wider">
                      Translate current text to:
                    </div>
                    {SUPPORTED_LANGUAGES.map((lang) => (
                      <button
                        key={lang.code}
                        type="button"
                        onClick={() => handleTranslateInput(lang)}
                        className="w-full text-left px-2.5 py-1.5 rounded-xl text-xs font-medium text-slate-700 dark:text-slate-200 hover:bg-indigo-50 dark:hover:bg-indigo-950/60 hover:text-indigo-600 dark:hover:text-indigo-600 flex items-center gap-2 transition-colors cursor-pointer"
                      >
                        <span className="text-base">{lang.flag}</span>
                        <span className="truncate">{lang.langName}</span>
                        <span className="text-[10px] text-slate-500 ml-auto">{lang.nativeName}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Multi-Language Dictate Tool Control */}
              {speechSupported && (
                <div className="flex items-center gap-1 bg-white/60 dark:bg-slate-800/60 border border-white/80 dark:border-white/10 rounded-xl p-0.5 shadow-xs relative">
                  
                  {/* Dictate Language Selector Button */}
                  <div className="relative">
                    <button
                      id="btn-dictate-language"
                      type="button"
                      onClick={() => setShowDictateLangMenu(prev => !prev)}
                      disabled={isLoading}
                      className="flex items-center gap-1 px-2.5 py-2 rounded-lg text-xs font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700/60 transition-colors cursor-pointer"
                      title="Select dictation spoken language"
                    >
                      <span className="text-base">{activeDictateLang.flag}</span>
                      <span className="hidden md:inline text-[11px] font-semibold">{activeDictateLang.nativeName}</span>
                      <ChevronDown className="w-3 h-3 text-slate-500" />
                    </button>

                    {/* Dictation Language Selection Menu */}
                    {showDictateLangMenu && (
                      <div className="absolute right-0 bottom-full mb-2 w-64 bg-white dark:bg-slate-900 rounded-2xl shadow-xl border border-slate-200/80 dark:border-slate-800 z-50 p-2 backdrop-blur-2xl animate-fade-in max-h-64 overflow-y-auto">
                        <div className="text-[10px] font-semibold text-slate-500 dark:text-slate-400 px-2.5 py-1 uppercase tracking-wider">
                          Speak in language:
                        </div>
                        {SUPPORTED_LANGUAGES.map((lang) => (
                          <button
                            key={lang.code}
                            type="button"
                            onClick={() => handleSelectDictateLang(lang.code)}
                            className={`w-full text-left px-2.5 py-1.5 rounded-xl text-xs font-medium flex items-center gap-2 transition-colors cursor-pointer ${
                              dictateLangCode === lang.code
                                ? 'bg-indigo-600 text-white shadow-xs font-semibold'
                                : 'text-slate-700 dark:text-slate-200 hover:bg-indigo-50 dark:hover:bg-indigo-950/60 hover:text-indigo-600 dark:hover:text-indigo-600'
                            }`}
                          >
                            <span className="text-base">{lang.flag}</span>
                            <span className="truncate">{lang.langName}</span>
                            <span className={`text-[10px] ml-auto ${dictateLangCode === lang.code ? 'text-indigo-100' : 'text-slate-500'}`}>
                              {lang.nativeName}
                            </span>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Primary Dictate Button */}
                  <button
                    id="btn-voice-dictation"
                    type="button"
                    onClick={toggleListening}
                    disabled={isLoading}
                    className={`flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                      isListening
                        ? 'bg-rose-500 hover:bg-rose-600 text-white shadow-sm animate-pulse'
                        : 'bg-indigo-50/80 dark:bg-indigo-950/80 text-indigo-700 dark:text-indigo-300 hover:bg-indigo-100 dark:hover:bg-indigo-900/90'
                    }`}
                    title={isListening ? "Stop listening" : `Start speaking in ${activeDictateLang.langName}`}
                  >
                    {isListening ? (
                      <>
                        <MicOff className="w-3.5 h-3.5" />
                        <span>Listening...</span>
                      </>
                    ) : (
                      <>
                        <Mic className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-300" />
                        <span>Dictate</span>
                      </>
                    )}
                  </button>
                </div>
              )}

              {isLoading ? (
                <button
                  id="btn-stop-streaming"
                  onClick={handleStopStreaming}
                  className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-xs font-semibold bg-rose-50/80 dark:bg-rose-950/60 hover:bg-rose-100/90 text-rose-700 dark:text-rose-300 backdrop-blur-md border border-rose-200/60 dark:border-rose-800/60 transition-colors cursor-pointer"
                >
                  <Square className="w-3 h-3 fill-current" />
                  <span>Stop</span>
                </button>
              ) : (
                <button
                  id="btn-send-journal"
                  onClick={handleSendThought}
                  disabled={!currentInput.trim() || isLoading}
                  className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-semibold bg-indigo-600/90 hover:bg-indigo-600 text-white disabled:opacity-40 disabled:cursor-not-allowed transition-all shadow-md backdrop-blur-md cursor-pointer active:scale-98"
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
