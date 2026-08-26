import { JournalEntry, ProfileSummary, InsightReport, ProactiveNudge, ChatTurn, EntrySentiment, WeeklyReflectionReport } from '../types';

async function fetchWithTimeout(url: string, options: RequestInit = {}, timeoutMs = 18000): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => {
    controller.abort();
  }, timeoutMs);

  const existingSignal = options.signal;
  if (existingSignal) {
    if (existingSignal.aborted) {
      controller.abort();
    } else {
      existingSignal.addEventListener('abort', () => controller.abort(), { once: true });
    }
  }

  try {
    const res = await fetch(url, {
      ...options,
      signal: controller.signal,
    });
    return res;
  } catch (err: any) {
    if (existingSignal?.aborted) {
      const abortErr = new Error('The user aborted a request.');
      abortErr.name = 'AbortError';
      throw abortErr;
    }
    if (err?.name === 'AbortError') {
      throw new Error('Request timed out. Something went wrong, please try again.');
    }
    throw err;
  } finally {
    clearTimeout(timer);
  }
}

export async function askGeminiReflection(params: {
  message: string;
  profileSummary: ProfileSummary | null;
  recentEntries: JournalEntry[];
  conversationHistory: ChatTurn[];
}): Promise<{ reply: string; timestamp: string }> {
  const response = await fetchWithTimeout('/api/journal/chat', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(params),
  }, 16000);

  if (!response.ok) {
    const err = await response.json().catch(() => ({ error: 'Something went wrong, please try again.' }));
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
  if (params.signal?.aborted) {
    const abortErr = new Error('The user aborted a request.');
    abortErr.name = 'AbortError';
    throw abortErr;
  }

  const response = await fetchWithTimeout('/api/journal/chat-stream', {
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
  }, 20000);

  if (!response.ok) {
    const err = await response.json().catch(() => ({ error: 'Something went wrong, please try again.' }));
    throw new Error(err.error || `Server returned error ${response.status}`);
  }

  const reader = response.body?.getReader();
  if (!reader) {
    throw new Error('ReadableStream not supported in this browser.');
  }

  const onAbort = () => {
    try {
      reader.cancel();
    } catch {}
  };

  if (params.signal) {
    params.signal.addEventListener('abort', onAbort, { once: true });
  }

  const decoder = new TextDecoder('utf-8');
  let accumulated = '';
  let buffer = '';

  try {
    while (true) {
      if (params.signal?.aborted) {
        const abortErr = new Error('The user aborted a request.');
        abortErr.name = 'AbortError';
        throw abortErr;
      }

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
          if (jsonErr instanceof Error && jsonErr.name === 'AbortError') {
            throw jsonErr;
          }
          if (jsonErr instanceof Error && jsonErr.message !== 'Unexpected token') {
            throw jsonErr;
          }
        }
      }
    }
  } catch (readErr: any) {
    if (params.signal?.aborted || readErr?.name === 'AbortError') {
      const abortErr = new Error('The user aborted a request.');
      abortErr.name = 'AbortError';
      throw abortErr;
    }
    throw readErr;
  } finally {
    if (params.signal) {
      params.signal.removeEventListener('abort', onAbort);
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
  const response = await fetchWithTimeout('/api/journal/update-profile', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(params),
  }, 14000);

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
  const response = await fetchWithTimeout('/api/journal/generate-insights', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(params),
  }, 18000);

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
  const response = await fetchWithTimeout('/api/journal/weekly-summary', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(params),
  }, 18000);

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
  const response = await fetchWithTimeout('/api/journal/generate-nudge', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(params),
  }, 12000);

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
  const response = await fetchWithTimeout('/api/journal/analyze-sentiment', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(params),
  }, 10000);

  if (!response.ok) {
    const err = await response.json().catch(() => ({ error: 'Failed to analyze sentiment' }));
    throw new Error(err.error || `Server error ${response.status}`);
  }

  return response.json();
}

