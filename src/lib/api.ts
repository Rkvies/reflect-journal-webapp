import { JournalEntry, ProfileSummary, InsightReport, ProactiveNudge, ChatTurn, EntrySentiment, WeeklyReflectionReport } from '../types';

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

export async function streamGeminiReflection(params: {
  message: string;
  profileSummary: ProfileSummary | null;
  recentEntries: JournalEntry[];
  conversationHistory: ChatTurn[];
  signal?: AbortSignal;
  onChunk: (chunkText: string, accumulatedText: string) => void;
}): Promise<{ fullText: string; timestamp: string }> {
  const response = await fetch('/api/journal/chat-stream', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Accept': 'text/event-stream',
    },
    body: JSON.stringify({
      message: params.message,
      profileSummary: params.profileSummary,
      recentEntries: params.recentEntries,
      conversationHistory: params.conversationHistory,
    }),
    signal: params.signal,
  });

  if (!response.ok) {
    const err = await response.json().catch(() => ({ error: 'Network request failed' }));
    throw new Error(err.error || `Server returned error ${response.status}`);
  }

  const reader = response.body?.getReader();
  if (!reader) {
    throw new Error('ReadableStream not supported in this browser.');
  }

  const decoder = new TextDecoder('utf-8');
  let accumulated = '';
  let buffer = '';

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split('\n');
    buffer = lines.pop() || '';

    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed || !trimmed.startsWith('data:')) continue;
      const dataStr = trimmed.slice(5).trim();
      if (dataStr === '[DONE]') {
        return { fullText: accumulated, timestamp: new Date().toISOString() };
      }
      try {
        const parsed = JSON.parse(dataStr);
        if (parsed.error) {
          throw new Error(parsed.error);
        }
        if (parsed.text) {
          accumulated += parsed.text;
          params.onChunk(parsed.text, accumulated);
        }
        if (parsed.done && parsed.fullText) {
          accumulated = parsed.fullText;
        }
      } catch (jsonErr) {
        if (jsonErr instanceof Error && jsonErr.message !== 'Unexpected token') {
          throw jsonErr;
        }
      }
    }
  }

  return { fullText: accumulated, timestamp: new Date().toISOString() };
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

export async function requestWeeklySummary(params: {
  entries: JournalEntry[];
  profileSummary: ProfileSummary | null;
}): Promise<{ summary: Omit<WeeklyReflectionReport, 'id' | 'userId'> }> {
  const response = await fetch('/api/journal/weekly-summary', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(params),
  });

  if (!response.ok) {
    const err = await response.json().catch(() => ({ error: 'Weekly recap generation failed' }));
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

