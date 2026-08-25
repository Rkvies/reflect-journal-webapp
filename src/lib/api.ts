import { JournalEntry, ProfileSummary, InsightReport, ProactiveNudge, ChatTurn, EntrySentiment } from '../types';

export async function askGeminiReflection(params: {
  message: string;
  profileSummary: ProfileSummary | null;
  recentEntries: JournalEntry[];
  conversationHistory: ChatTurn[];
}): Promise<{ reply: string; timestamp: string }> {
  const response = await fetch('/api/journal/chat', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(params),
  });

  if (!response.ok) {
    const err = await response.json().catch(() => ({ error: 'Network request failed' }));
    throw new Error(err.error || `Server returned error ${response.status}`);
  }

  return response.json();
}

export async function triggerMemoryUpdate(params: {
  existingSummary: string;
  newEntryTitle: string;
  newEntryContent: string;
  newReflection: string;
}): Promise<{ updatedSummary: string; updatedAt: string }> {
  const response = await fetch('/api/journal/update-profile', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(params),
  });

  if (!response.ok) {
    const err = await response.json().catch(() => ({ error: 'Memory update failed' }));
    throw new Error(err.error || `Server error ${response.status}`);
  }

  return response.json();
}

export async function requestInsights(params: {
  entries: JournalEntry[];
  profileSummary: ProfileSummary | null;
}): Promise<{ insight: Omit<InsightReport, 'id' | 'userId'>; generatedAt: string; entriesAnalyzedCount: number }> {
  const response = await fetch('/api/journal/generate-insights', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(params),
  });

  if (!response.ok) {
    const err = await response.json().catch(() => ({ error: 'Insight analysis failed' }));
    throw new Error(err.error || `Server error ${response.status}`);
  }

  return response.json();
}

export async function requestAgenticNudge(params: {
  profileSummary: ProfileSummary | null;
  recentEntries: JournalEntry[];
}): Promise<{ nudge: Omit<ProactiveNudge, 'id' | 'userId'> }> {
  const response = await fetch('/api/journal/generate-nudge', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(params),
  });

  if (!response.ok) {
    const err = await response.json().catch(() => ({ error: 'Failed to generate nudge' }));
    throw new Error(err.error || `Server error ${response.status}`);
  }

  return response.json();
}

export async function analyzeEntrySentiment(params: {
  title: string;
  content: string;
  conversation?: ChatTurn[];
  mood?: string;
}): Promise<{ sentiment: EntrySentiment }> {
  const response = await fetch('/api/journal/analyze-sentiment', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(params),
  });

  if (!response.ok) {
    const err = await response.json().catch(() => ({ error: 'Failed to analyze sentiment' }));
    throw new Error(err.error || `Server error ${response.status}`);
  }

  return response.json();
}

