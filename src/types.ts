export type MoodType = 'peaceful' | 'reflective' | 'optimistic' | 'anxious' | 'grounded' | 'fatigued' | 'energized' | 'seeking_clarity';

export interface ChatTurn {
  id: string;
  role: 'user' | 'assistant';
  text: string;
  timestamp: string;
}

export interface EntrySentiment {
  label: string;
  emoji: string;
  color: string; // e.g. 'emerald' | 'indigo' | 'amber' | 'rose' | 'sky' | 'purple' | 'teal'
  score: number; // 0 - 100
  summary?: string;
}

export interface JournalEntry {
  id: string;
  userId: string;
  title: string;
  content: string;
  mood: MoodType;
  tags: string[];
  conversation: ChatTurn[];
  reflectionSummary?: string;
  sentiment?: EntrySentiment;
  createdAt: string;
  updatedAt: string;
  wordCount: number;
  isEdited?: boolean;
  editedAt?: string;
}

export interface ProfileSummary {
  userId: string;
  summary: string;
  lastUpdated: string;
  keyThemes: string[];
  totalEntriesAnalyzed: number;
  coreValues?: string[];
  lastQuoteShownDate?: string;
}

export interface ThemeMetric {
  name: string;
  score: number;
  observation: string;
  influencedBy?: string[];
}

export interface InsightReport {
  id: string;
  userId: string;
  overallMoodTrend: string;
  primaryMood: string;
  dateRange?: {
    start?: string;
    end?: string;
  };
  themes: ThemeMetric[];
  notableShift: string;
  notableShiftInfluencedBy?: string[];
  suggestion: string;
  suggestionInfluencedBy?: string[];
  sentimentDistribution: {
    positive: number;
    neutral: number;
    reflective: number;
    challenging: number;
  };
  generatedAt: string;
  entriesAnalyzedCount: number;
}

export interface ProactiveNudge {
  id: string;
  userId: string;
  title: string;
  promptText: string;
  topicTag: string;
  createdAt: string;
  isDismissed?: boolean;
  dismissed?: boolean;
  dismissedAt?: string;
  source?: string;
}

export interface WeeklyReflectionReport {
  id: string; // 'weeklySummary'
  userId: string;
  weekRange: string;
  entryCount: number;
  daysActive: number;
  moodTrend: string;
  dominantMood: string;
  weekSummary: string;
  topThemes: string[];
  keyTakeaway: string;
  highlights?: string[];
  generatedAt: string;
}

export interface AppNotification {
  id: string;
  userId: string;
  title: string;
  message: string;
  type: 'insight' | 'reminder' | 'milestone' | 'system' | 'reflection';
  createdAt: string;
  isRead: boolean;
  readAt?: string;
}

export interface GratitudeEntry {
  id: string;
  userId: string;
  date: string; // YYYY-MM-DD
  item1: string;
  item2: string;
  item3: string;
  reflection?: string;
  createdAt: string;
}

export interface AppUser {
  uid: string;
  email: string | null;
  displayName: string | null;
  photoURL: string | null;
  isAnonymous?: boolean;
}
