import { JournalEntry, ProfileSummary, InsightReport, ProactiveNudge, ChatTurn, EntrySentiment, WeeklyReflectionReport } from '../types';

async function fetchWithTimeout(url: string, options: RequestInit = {}, timeoutMs = 18000): Promise<Response> {
  const controller = new AbortController();
  let timer: NodeJS.Timeout | null = setTimeout(() => {
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
    const isAborted =
      existingSignal?.aborted ||
      err?.name === 'AbortError' ||
      String(err?.message || '').toLowerCase().includes('abort') ||
      String(err?.message || '').includes('BodyStreamBuffer') ||
      String(err?.message || '').toLowerCase().includes('cancel');

    if (isAborted) {
      const abortErr = new Error('The user aborted a request.');
      abortErr.name = 'AbortError';
      throw abortErr;
    }
    throw err;
  } finally {
    if (timer) {
      clearTimeout(timer);
      timer = null;
    }
  }
}

export async function askGeminiReflection(params: {
  message: string;
  profileSummary: ProfileSummary | null;
  recentEntries: JournalEntry[];
  conversationHistory: ChatTurn[];
  signal?: AbortSignal;
}): Promise<{ reply: string; sentiment?: EntrySentiment; timestamp: string }> {
  const response = await fetchWithTimeout('/api/journal/chat', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      message: params.message,
      profileSummary: params.profileSummary,
      recentEntries: params.recentEntries,
      conversationHistory: params.conversationHistory,
    }),
    signal: params.signal,
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
}): Promise<{ fullText: string; sentiment?: EntrySentiment; timestamp: string }> {
  if (params.signal?.aborted) {
    const abortErr = new Error('The user aborted a request.');
    abortErr.name = 'AbortError';
    throw abortErr;
  }

  // Connection timeout controller for initial response header reception
  const connectController = new AbortController();
  const connectTimer = setTimeout(() => connectController.abort(), 18000);

  const onUserAbort = () => {
    connectController.abort();
  };

  if (params.signal) {
    params.signal.addEventListener('abort', onUserAbort, { once: true });
  }

  let response: Response;
  try {
    response = await fetch('/api/journal/chat-stream', {
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
      signal: connectController.signal,
    });
  } catch (fetchErr: any) {
    const isAborted =
      params.signal?.aborted ||
      fetchErr?.name === 'AbortError' ||
      String(fetchErr?.message || '').toLowerCase().includes('abort') ||
      String(fetchErr?.message || '').includes('BodyStreamBuffer') ||
      String(fetchErr?.message || '').toLowerCase().includes('cancel');

    if (isAborted) {
      const abortErr = new Error('The user aborted a request.');
      abortErr.name = 'AbortError';
      throw abortErr;
    }
    throw fetchErr;
  } finally {
    clearTimeout(connectTimer);
    if (params.signal) {
      params.signal.removeEventListener('abort', onUserAbort);
    }
  }

  if (!response.ok) {
    const err = await response.json().catch(() => ({ error: 'Something went wrong, please try again.' }));
    throw new Error(err.error || `Server returned error ${response.status}`);
  }

  const reader = response.body?.getReader();
  if (!reader) {
    throw new Error('ReadableStream not supported in this browser.');
  }

  const onStreamAbort = () => {
    try {
      reader.cancel().catch(() => {});
    } catch {}
  };

  if (params.signal) {
    params.signal.addEventListener('abort', onStreamAbort, { once: true });
  }

  const decoder = new TextDecoder('utf-8');
  let accumulated = '';
  let buffer = '';
  let finalSentiment: EntrySentiment | undefined;

  try {
    while (true) {
      if (params.signal?.aborted) {
        const abortErr = new Error('The user aborted a request.');
        abortErr.name = 'AbortError';
        throw abortErr;
      }

      let readResult;
      try {
        readResult = await reader.read();
      } catch (rErr: any) {
        const isAborted =
          params.signal?.aborted ||
          rErr?.name === 'AbortError' ||
          String(rErr?.message || '').toLowerCase().includes('abort') ||
          String(rErr?.message || '').includes('BodyStreamBuffer') ||
          String(rErr?.message || '').toLowerCase().includes('cancel');

        if (isAborted) {
          const abortErr = new Error('The user aborted a request.');
          abortErr.name = 'AbortError';
          throw abortErr;
        }
        throw rErr;
      }

      const { done, value } = readResult;
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop() || '';

      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed || !trimmed.startsWith('data:')) continue;
        const dataStr = trimmed.slice(5).trim();
        if (dataStr === '[DONE]') {
          return { fullText: accumulated, sentiment: finalSentiment, timestamp: new Date().toISOString() };
        }
        try {
          const parsed = JSON.parse(dataStr);
          if (parsed.error) {
            throw new Error(parsed.error);
          }
          if (parsed.sentiment) {
            finalSentiment = parsed.sentiment;
          }
          if (parsed.text) {
            accumulated += parsed.text;
            params.onChunk(parsed.text, accumulated);
          }
          if (parsed.done && parsed.fullText) {
            accumulated = parsed.fullText;
            params.onChunk('', accumulated);
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
    const isAborted =
      params.signal?.aborted ||
      readErr?.name === 'AbortError' ||
      String(readErr?.message || '').toLowerCase().includes('abort') ||
      String(readErr?.message || '').includes('BodyStreamBuffer') ||
      String(readErr?.message || '').toLowerCase().includes('cancel');

    if (isAborted) {
      const abortErr = new Error('The user aborted a request.');
      abortErr.name = 'AbortError';
      throw abortErr;
    }
    
    // If stream read was interrupted, attempt fallback via standard endpoint
    if (!accumulated || accumulated.trim().length === 0) {
      try {
        const fallback = await askGeminiReflection({
          message: params.message,
          profileSummary: params.profileSummary,
          recentEntries: params.recentEntries,
          conversationHistory: params.conversationHistory,
          signal: params.signal,
        });
        params.onChunk('', fallback.reply);
        return { fullText: fallback.reply, sentiment: fallback.sentiment, timestamp: fallback.timestamp };
      } catch (fallbackErr) {
        console.error('[streamGeminiReflection] Both streaming and non-streaming fallback failed:', fallbackErr);
        throw readErr;
      }
    }
  } finally {
    if (params.signal) {
      params.signal.removeEventListener('abort', onStreamAbort);
    }
    try {
      reader.releaseLock?.();
    } catch {}
  }

  const finalAccumulated = accumulated.trim();
  if (!finalAccumulated) {
    const reflectiveFallback = "Thank you for sharing your reflection today. I'm holding space for this thought. Take a mindful breath, notice what feels most present right now, and give yourself space as you reflect.";
    params.onChunk('', reflectiveFallback);
    return { fullText: reflectiveFallback, sentiment: finalSentiment, timestamp: new Date().toISOString() };
  }

  return { fullText: finalAccumulated, sentiment: finalSentiment, timestamp: new Date().toISOString() };
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

export async function deactivateAccount(idToken: string): Promise<{ success: boolean }> {
  const response = await fetchWithTimeout('/api/account/deactivate', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${idToken}`,
    },
  }, 10000);

  if (!response.ok) {
    const err = await response.json().catch(() => ({ error: 'Deactivation failed' }));
    throw new Error(err.error || `Server error ${response.status}`);
  }

  return response.json();
}

export async function deleteAccount(idToken: string): Promise<{ success: boolean }> {
  const response = await fetchWithTimeout('/api/account/delete', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${idToken}`,
    },
  }, 20000);

  if (!response.ok) {
    const err = await response.json().catch(() => ({ error: 'Account deletion failed' }));
    throw new Error(err.error || `Server error ${response.status}`);
  }

  return response.json();
}

