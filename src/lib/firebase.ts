import { initializeApp, getApps, getApp } from 'firebase/app';
import { 
  getAuth, 
  GoogleAuthProvider, 
  signInWithPopup, 
  signInAnonymously,
  signOut as fbSignOut, 
  onAuthStateChanged, 
  User 
} from 'firebase/auth';
import { 
  getFirestore, 
  doc, 
  setDoc, 
  getDoc, 
  getDocs,
  collection, 
  query, 
  orderBy, 
  limit, 
  startAfter,
  QueryDocumentSnapshot,
  DocumentData,
  onSnapshot, 
  deleteDoc, 
  updateDoc 
} from 'firebase/firestore';
import firebaseConfig from '../../firebase-applet-config.json';
import { JournalEntry, ProfileSummary, InsightReport, ProactiveNudge, WeeklyReflectionReport, AppNotification, GratitudeEntry, UserMilestones, MilestoneKey, AppUser, MoodType } from '../types';

// Initialize Firebase App
const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();

// Use specific Firestore database ID if provided, otherwise default
export const db = firebaseConfig.firestoreDatabaseId 
  ? getFirestore(app, firebaseConfig.firestoreDatabaseId)
  : getFirestore(app);

export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();

export interface GoogleSignInOptions {
  forceSelectAccount?: boolean;
  loginHint?: string;
}

export function createGoogleProvider(forceSelectAccount = true, loginHint?: string | null): GoogleAuthProvider {
  const provider = new GoogleAuthProvider();
  const customParams: Record<string, string> = {};
  if (forceSelectAccount) {
    customParams.prompt = 'select_account';
  } else if (loginHint) {
    customParams.login_hint = loginHint;
  }
  if (Object.keys(customParams).length > 0) {
    provider.setCustomParameters(customParams);
  }
  return provider;
}

export async function signInWithGoogle(options?: GoogleSignInOptions): Promise<User | null> {
  try {
    const isTimeout = 
      sessionStorage.getItem('reflect_session_timeout') === 'true' || 
      localStorage.getItem('reflect_force_select_account') === 'false';

    const forceSelect = options?.forceSelectAccount !== undefined
      ? options.forceSelectAccount
      : !isTimeout;

    const loginHint = options?.loginHint ?? (localStorage.getItem('reflect_last_user_email') || undefined);

    const provider = createGoogleProvider(forceSelect, loginHint);
    const result = await signInWithPopup(auth, provider);

    // Reset timeout and selection states upon successful authentication
    sessionStorage.removeItem('reflect_session_timeout');
    localStorage.removeItem('reflect_force_select_account');
    if (result.user.email) {
      localStorage.setItem('reflect_last_user_email', result.user.email);
    }

    return result.user;
  } catch (error: any) {
    // If the user closed or cancelled the popup window, handle gracefully without logging an error
    if (
      error?.code === 'auth/popup-closed-by-user' ||
      error?.code === 'auth/cancelled-popup-request'
    ) {
      return null;
    }
    console.error('Google Sign In Error:', error);
    // If popup is blocked by browser security/sandbox, inform user
    if (error?.code === 'auth/popup-blocked') {
      throw new Error('Sign-in popup was blocked by the browser. Please allow popups for this site and try again.');
    }
    throw error;
  }
}

export async function logOut(isManual = true) {
  if (isManual) {
    localStorage.setItem('reflect_force_select_account', 'true');
    sessionStorage.removeItem('reflect_session_timeout');
  }
  localStorage.removeItem('reflect_is_guest_mode');
  if (auth.currentUser) {
    return fbSignOut(auth);
  }
}

// ==========================================
// Guest Mode Engine (Local ABAC Sandbox & Fallback)
// ==========================================

export function isGuestModeActive(): boolean {
  if (typeof window === 'undefined') return false;
  return localStorage.getItem('reflect_is_guest_mode') === 'true';
}

export function getGuestUid(): string {
  if (typeof window === 'undefined') return 'guest_default';
  let uid = localStorage.getItem('reflect_guest_uid');
  if (!uid) {
    uid = `guest_${Math.random().toString(36).substring(2, 10)}_${Date.now()}`;
    localStorage.setItem('reflect_guest_uid', uid);
  }
  return uid;
}

export function isGuestUid(uid?: string | null): boolean {
  if (!uid) return false;
  if (uid.startsWith('guest_')) return true;
  if (!auth.currentUser && isGuestModeActive()) return true;
  return false;
}

export function dispatchGuestDataChanged(type: string, uid: string) {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('reflect_guest_data_changed', { detail: { type, uid } }));
  }
}

export function isDemoEntry(e: any): boolean {
  if (!e) return true;
  const title = (e.title || '').toLowerCase();
  const content = (e.content || '').toLowerCase();
  const id = (e.id || '').toLowerCase();
  if (id.startsWith('entry_guest_welcome') || id.includes('welcome') || id.includes('demo') || id.includes('sample')) return true;
  if (title.includes('welcome to reflect') || title.includes('guest mode') || title === 'welcome') return true;
  if (content.includes('private sanctuary for mindful reflection') || content.includes('in guest mode, all your thoughts') || content.includes('mindful reflection space')) return true;
  return false;
}

export function isDemoGratitude(g: any): boolean {
  if (!g) return true;
  const id = (g.id || '').toLowerCase();
  const i1 = (g.item1 || '').toLowerCase();
  const i2 = (g.item2 || '').toLowerCase();
  const i3 = (g.item3 || '').toLowerCase();
  const r = (g.reflection || '').toLowerCase();
  if (id.includes('welcome') || id.includes('demo') || id.includes('sample')) return true;
  if (i1.includes('distraction-free') || i2.includes('mindful breath today') || i3.includes('without an account')) return true;
  if (r.includes('quiet moment of self-connection')) return true;
  return false;
}

export function isDemoNotification(n: any): boolean {
  if (!n) return true;
  const id = (n.id || '').toLowerCase();
  const title = (n.title || '').toLowerCase();
  if (id === 'welcome_notif' || id === 'insight_notif' || id === 'reminder_notif' || id.startsWith('notif_guest') || id.includes('welcome') || id.includes('demo') || id.includes('sample')) return true;
  if (title.includes('welcome to reflect') || title.includes('welcome to guest mode') || title.includes('ai insight ready') || title.includes('evening reflection reminder')) return true;
  return false;
}

export function isDemoSummary(s: any): boolean {
  if (!s || !s.summary) return true;
  const text = (s.summary || '').toLowerCase();
  if (text.includes('guest journaling session initiated') || text.includes('new user journey')) return true;
  return false;
}

export function purgeAllGuestDemoData(specificUid?: string) {
  try {
    if (typeof window === 'undefined' || !window.localStorage) return;

    // Scan all keys in localStorage to purge any guest demo data across all keys
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (!key) continue;

      if (key.startsWith('reflect_guest_entries_')) {
        try {
          const raw = localStorage.getItem(key);
          if (raw) {
            const list = JSON.parse(raw);
            if (Array.isArray(list)) {
              const cleaned = list.filter(e => !isDemoEntry(e));
              if (cleaned.length !== list.length) {
                localStorage.setItem(key, JSON.stringify(cleaned));
              }
            }
          }
        } catch {}
      }

      if (key.startsWith('reflect_guest_gratitude_')) {
        try {
          const raw = localStorage.getItem(key);
          if (raw) {
            const list = JSON.parse(raw);
            if (Array.isArray(list)) {
              const cleaned = list.filter(g => !isDemoGratitude(g));
              if (cleaned.length !== list.length) {
                localStorage.setItem(key, JSON.stringify(cleaned));
              }
            }
          }
        } catch {}
      }

      if (key.startsWith('reflect_guest_summary_')) {
        try {
          const raw = localStorage.getItem(key);
          if (raw) {
            const sum = JSON.parse(raw);
            if (isDemoSummary(sum)) {
              localStorage.removeItem(key);
            }
          }
        } catch {}
      }

      if (key.startsWith('reflect_guest_notifs_')) {
        try {
          const raw = localStorage.getItem(key);
          if (raw) {
            const list = JSON.parse(raw);
            if (Array.isArray(list)) {
              const cleaned = list.filter(n => !isDemoNotification(n));
              if (cleaned.length !== list.length) {
                localStorage.setItem(key, JSON.stringify(cleaned));
              }
            }
          }
        } catch {}
      }

      if (key.startsWith('reflect_draft_')) {
        try {
          const raw = localStorage.getItem(key);
          if (raw) {
            const draft = JSON.parse(raw);
            if (draft?.title && draft.title.toLowerCase().includes('welcome')) {
              localStorage.removeItem(key);
            }
          }
        } catch {}
      }
    }
  } catch (err) {
    console.warn('Failed during guest demo data purge:', err);
  }
}

export function getGuestEntries(uid: string): JournalEntry[] {
  try {
    const raw = localStorage.getItem(`reflect_guest_entries_${uid}`);
    if (!raw) return [];
    const entries: JournalEntry[] = JSON.parse(raw);
    return entries.filter(e => !isDemoEntry(e));
  } catch {
    return [];
  }
}

export function saveGuestEntries(uid: string, entries: JournalEntry[]) {
  try {
    const cleaned = entries.filter(e => !isDemoEntry(e));
    localStorage.setItem(`reflect_guest_entries_${uid}`, JSON.stringify(cleaned));
  } catch (err) {
    console.warn('Failed to persist guest entries locally:', err);
  }
}

export function getGuestGratitude(uid: string): GratitudeEntry[] {
  try {
    const raw = localStorage.getItem(`reflect_guest_gratitude_${uid}`);
    if (!raw) return [];
    const list: GratitudeEntry[] = JSON.parse(raw);
    return list.filter(g => !isDemoGratitude(g));
  } catch {
    return [];
  }
}

export function saveGuestGratitude(uid: string, list: GratitudeEntry[]) {
  try {
    const cleaned = list.filter(g => !isDemoGratitude(g));
    localStorage.setItem(`reflect_guest_gratitude_${uid}`, JSON.stringify(cleaned));
  } catch (err) {
    console.warn('Failed to persist guest gratitude locally:', err);
  }
}

export function getGuestProfileSummary(uid: string): ProfileSummary | null {
  try {
    const raw = localStorage.getItem(`reflect_guest_summary_${uid}`);
    if (!raw) return null;
    const summary: ProfileSummary = JSON.parse(raw);
    if (isDemoSummary(summary)) {
      return null;
    }
    return summary;
  } catch {
    return null;
  }
}

export function saveGuestProfileSummary(uid: string, summary: ProfileSummary) {
  try {
    if (isDemoSummary(summary)) return;
    localStorage.setItem(`reflect_guest_summary_${uid}`, JSON.stringify(summary));
  } catch (err) {
    console.warn('Failed to persist guest summary locally:', err);
  }
}

export function getGuestInsights(uid: string): InsightReport[] {
  try {
    const raw = localStorage.getItem(`reflect_guest_insights_${uid}`);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function saveGuestInsights(uid: string, list: InsightReport[]) {
  try {
    localStorage.setItem(`reflect_guest_insights_${uid}`, JSON.stringify(list));
  } catch (err) {
    console.warn('Failed to persist guest insights locally:', err);
  }
}

export function getGuestNudges(uid: string): ProactiveNudge[] {
  try {
    const raw = localStorage.getItem(`reflect_guest_nudges_${uid}`);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function saveGuestNudges(uid: string, list: ProactiveNudge[]) {
  try {
    localStorage.setItem(`reflect_guest_nudges_${uid}`, JSON.stringify(list));
  } catch (err) {
    console.warn('Failed to persist guest nudges locally:', err);
  }
}

export function getGuestWeeklySummary(uid: string): WeeklyReflectionReport | null {
  try {
    const raw = localStorage.getItem(`reflect_guest_weekly_${uid}`);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function saveGuestWeeklySummary(uid: string, rep: WeeklyReflectionReport) {
  try {
    localStorage.setItem(`reflect_guest_weekly_${uid}`, JSON.stringify(rep));
  } catch (err) {
    console.warn('Failed to persist guest weekly summary locally:', err);
  }
}

export function getGuestNotifications(uid: string): AppNotification[] {
  try {
    const raw = localStorage.getItem(`reflect_guest_notifs_${uid}`);
    if (!raw) return [];
    const list: AppNotification[] = JSON.parse(raw);
    return list.filter(n => !isDemoNotification(n));
  } catch {
    return [];
  }
}

export function saveGuestNotifications(uid: string, list: AppNotification[]) {
  try {
    const cleaned = list.filter(n => !isDemoNotification(n));
    localStorage.setItem(`reflect_guest_notifs_${uid}`, JSON.stringify(cleaned));
  } catch (err) {
    console.warn('Failed to persist guest notifications locally:', err);
  }
}

export function getGuestMilestones(uid: string): UserMilestones {
  try {
    const raw = localStorage.getItem(`reflect_guest_milestones_${uid}`);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

export function saveGuestMilestones(uid: string, milestones: UserMilestones) {
  try {
    localStorage.setItem(`reflect_guest_milestones_${uid}`, JSON.stringify(milestones));
  } catch (err) {
    console.warn('Failed to persist guest milestones locally:', err);
  }
}

export function initializeGuestDataIfEmpty(uid: string) {
  // Purge any legacy demo data from guest local storage so Guest Mode starts completely clean
  purgeAllGuestDemoData(uid);
}

export async function signInAsGuest(): Promise<AppUser> {
  localStorage.setItem('reflect_is_guest_mode', 'true');
  const guestUid = getGuestUid();
  sessionStorage.removeItem('reflect_session_timeout');
  localStorage.removeItem('reflect_force_select_account');

  // Purge any legacy demo data immediately so Guest Mode is completely clean
  purgeAllGuestDemoData(guestUid);
  dispatchGuestDataChanged('all', guestUid);

  return {
    uid: guestUid,
    email: null,
    displayName: 'Guest Explorer',
    photoURL: null,
    isAnonymous: true,
  };
}

export async function migrateGuestDataToUser(targetUid: string, guestUid?: string): Promise<{ migratedEntriesCount: number; migratedGratitudeCount: number }> {
  const gUid = guestUid || localStorage.getItem('reflect_guest_uid');
  if (!gUid || !targetUid || gUid === targetUid) return { migratedEntriesCount: 0, migratedGratitudeCount: 0 };

  const entries = getGuestEntries(gUid);
  const gratitude = getGuestGratitude(gUid);
  let migratedEntriesCount = 0;
  let migratedGratitudeCount = 0;

  for (const entry of entries) {
    try {
      const entryRef = doc(db, 'users', targetUid, 'entries', entry.id);
      await setDoc(entryRef, cleanForFirestore({ ...entry, userId: targetUid }), { merge: true });
      migratedEntriesCount++;
    } catch (err) {
      console.warn('Failed to migrate guest entry:', err);
    }
  }

  for (const item of gratitude) {
    try {
      const gRef = doc(db, 'users', targetUid, 'gratitudeEntries', item.id);
      await setDoc(gRef, cleanForFirestore({ ...item, userId: targetUid }), { merge: true });
      migratedGratitudeCount++;
    } catch (err) {
      console.warn('Failed to migrate guest gratitude:', err);
    }
  }

  localStorage.removeItem('reflect_is_guest_mode');
  localStorage.removeItem('reflect_guest_uid');
  localStorage.removeItem(`reflect_guest_entries_${gUid}`);
  localStorage.removeItem(`reflect_guest_gratitude_${gUid}`);
  localStorage.removeItem(`reflect_guest_summary_${gUid}`);
  localStorage.removeItem(`reflect_guest_insights_${gUid}`);
  localStorage.removeItem(`reflect_guest_nudges_${gUid}`);
  localStorage.removeItem(`reflect_guest_notifs_${gUid}`);

  return { migratedEntriesCount, migratedGratitudeCount };
}

// --- Firestore Helpers strictly scoped to users/{uid} ---

/**
 * Deep cleans objects to remove 'undefined' fields which Firestore setDoc rejects.
 */
export function cleanForFirestore<T>(data: T): T {
  if (data === undefined) return null as any;
  if (data === null || typeof data !== 'object') return data;
  if (Array.isArray(data)) {
    return data.map(item => cleanForFirestore(item)) as any;
  }
  const cleanObj: Record<string, any> = {};
  for (const [key, value] of Object.entries(data as Record<string, any>)) {
    if (value !== undefined) {
      cleanObj[key] = cleanForFirestore(value);
    }
  }
  return cleanObj as T;
}

/**
 * Save or update a journal entry under users/{uid}/entries/{entryId}
 */
export async function saveJournalEntry(uid: string, entry: JournalEntry): Promise<void> {
  if (!uid) throw new Error('Unauthenticated write rejected');
  if (isGuestUid(uid)) {
    const list = getGuestEntries(uid);
    const existingIndex = list.findIndex(e => e.id === entry.id);
    if (existingIndex >= 0) {
      list[existingIndex] = { ...list[existingIndex], ...entry };
    } else {
      list.unshift(entry);
    }
    saveGuestEntries(uid, list);
    dispatchGuestDataChanged('entries', uid);
    return;
  }
  const entryRef = doc(db, 'users', uid, 'entries', entry.id);
  const cleanData = cleanForFirestore(entry);
  await setDoc(entryRef, cleanData, { merge: true });
}

/**
 * Update the user's narrative content for an existing journal entry.
 * Note: Gemini conversation, reflections, and sentiment are preserved as-is.
 */
export async function updateJournalEntryContent(
  uid: string,
  entryId: string,
  updates: {
    title: string;
    content: string;
    mood?: MoodType;
    tags?: string[];
  }
): Promise<void> {
  if (!uid) throw new Error('Unauthenticated write rejected');
  const now = new Date().toISOString();
  const wordCount = updates.content.trim().split(/\s+/).filter(Boolean).length;

  if (isGuestUid(uid)) {
    const list = getGuestEntries(uid);
    const idx = list.findIndex(e => e.id === entryId);
    if (idx >= 0) {
      list[idx] = {
        ...list[idx],
        title: updates.title.trim(),
        content: updates.content.trim(),
        wordCount,
        updatedAt: now,
        editedAt: now,
        isEdited: true,
        ...(updates.mood ? { mood: updates.mood } : {}),
        ...(updates.tags ? { tags: updates.tags } : {}),
      };
      saveGuestEntries(uid, list);
      dispatchGuestDataChanged('entries', uid);
    }
    return;
  }

  const entryRef = doc(db, 'users', uid, 'entries', entryId);
  const updatePayload: Record<string, any> = {
    title: updates.title.trim(),
    content: updates.content.trim(),
    wordCount,
    updatedAt: now,
    editedAt: now,
    isEdited: true,
  };

  if (updates.mood) {
    updatePayload.mood = updates.mood;
  }
  if (updates.tags) {
    updatePayload.tags = updates.tags;
  }

  const cleanData = cleanForFirestore(updatePayload);
  await setDoc(entryRef, cleanData, { merge: true });
}

/**
 * Delete a journal entry from users/{uid}/entries/{entryId}
 */
export async function deleteJournalEntry(uid: string, entryId: string): Promise<void> {
  if (!uid) throw new Error('Unauthenticated delete rejected');
  if (isGuestUid(uid)) {
    const list = getGuestEntries(uid).filter(e => e.id !== entryId);
    saveGuestEntries(uid, list);
    dispatchGuestDataChanged('entries', uid);
    return;
  }
  const entryRef = doc(db, 'users', uid, 'entries', entryId);
  await deleteDoc(entryRef);
}

/**
 * Fetch or listen to user entries (sorted by createdAt descending)
 */
export function subscribeToEntries(uid: string, callback: (entries: JournalEntry[]) => void) {
  if (!uid) return () => {};
  if (isGuestUid(uid)) {
    callback(getGuestEntries(uid));
    const handler = (e: Event) => {
      const customEvent = e as CustomEvent;
      if (!customEvent.detail || customEvent.detail.type === 'entries' || customEvent.detail.type === 'all') {
        callback(getGuestEntries(uid));
      }
    };
    window.addEventListener('reflect_guest_data_changed', handler);
    return () => window.removeEventListener('reflect_guest_data_changed', handler);
  }
  const entriesCol = collection(db, 'users', uid, 'entries');
  const q = query(entriesCol, orderBy('createdAt', 'desc'), limit(100));
  
  return onSnapshot(q, (snapshot) => {
    const entries: JournalEntry[] = [];
    snapshot.forEach((docSnap) => {
      entries.push(docSnap.data() as JournalEntry);
    });
    callback(entries);
  }, (error) => {
    console.error('Firestore entries subscription error:', error);
  });
}

export interface PaginatedEntriesResult {
  entries: JournalEntry[];
  lastDoc: QueryDocumentSnapshot<DocumentData> | null;
  hasMore: boolean;
}

/**
 * Fetch journal entries using cursor-based pagination (orderBy createdAt desc + startAfter)
 */
export async function fetchEntriesPaginated(
  uid: string,
  pageSize: number = 20,
  startAfterDoc?: QueryDocumentSnapshot<DocumentData> | null
): Promise<PaginatedEntriesResult> {
  if (!uid) return { entries: [], lastDoc: null, hasMore: false };
  if (isGuestUid(uid)) {
    const all = getGuestEntries(uid);
    return { entries: all.slice(0, pageSize), lastDoc: null, hasMore: all.length > pageSize };
  }
  const entriesCol = collection(db, 'users', uid, 'entries');
  let q = query(entriesCol, orderBy('createdAt', 'desc'), limit(pageSize + 1));
  if (startAfterDoc) {
    q = query(entriesCol, orderBy('createdAt', 'desc'), startAfter(startAfterDoc), limit(pageSize + 1));
  }
  const snap = await getDocs(q);
  const docs = snap.docs;
  const hasMore = docs.length > pageSize;
  const pageDocs = hasMore ? docs.slice(0, pageSize) : docs;
  const entries = pageDocs.map((d) => ({ id: d.id, ...d.data() } as JournalEntry));
  const lastDoc = pageDocs.length > 0 ? pageDocs[pageDocs.length - 1] : null;

  return { entries, lastDoc, hasMore };
}

/**
 * Get profile summary (users/{uid}/profile/summary)
 */
export async function getProfileSummary(uid: string): Promise<ProfileSummary | null> {
  if (!uid) return null;
  if (isGuestUid(uid)) {
    return getGuestProfileSummary(uid);
  }
  const summaryRef = doc(db, 'users', uid, 'profile', 'summary');
  const snap = await getDoc(summaryRef);
  if (snap.exists()) {
    return snap.data() as ProfileSummary;
  }
  return null;
}

/**
 * Save profile summary (users/{uid}/profile/summary)
 */
export async function saveProfileSummary(uid: string, summary: ProfileSummary): Promise<void> {
  if (!uid) throw new Error('Unauthenticated summary save rejected');
  if (isGuestUid(uid)) {
    saveGuestProfileSummary(uid, summary);
    dispatchGuestDataChanged('profile', uid);
    return;
  }
  const summaryRef = doc(db, 'users', uid, 'profile', 'summary');
  const cleanData = cleanForFirestore(summary);
  await setDoc(summaryRef, cleanData, { merge: true });
}

/**
 * Subscribe to profile summary
 */
export function subscribeToProfileSummary(uid: string, callback: (summary: ProfileSummary | null) => void) {
  if (!uid) return () => {};
  if (isGuestUid(uid)) {
    callback(getGuestProfileSummary(uid));
    const handler = (e: Event) => {
      const customEvent = e as CustomEvent;
      if (!customEvent.detail || customEvent.detail.type === 'profile' || customEvent.detail.type === 'all') {
        callback(getGuestProfileSummary(uid));
      }
    };
    window.addEventListener('reflect_guest_data_changed', handler);
    return () => window.removeEventListener('reflect_guest_data_changed', handler);
  }
  const summaryRef = doc(db, 'users', uid, 'profile', 'summary');
  return onSnapshot(summaryRef, (snap) => {
    if (snap.exists()) {
      callback(snap.data() as ProfileSummary);
    } else {
      callback(null);
    }
  }, (err) => {
    console.error('Profile summary listener error:', err);
  });
}

/**
 * Save insight report (users/{uid}/insights/{insightId})
 */
export async function saveInsightReport(uid: string, insight: InsightReport): Promise<void> {
  if (!uid) throw new Error('Unauthenticated insight save rejected');
  if (isGuestUid(uid)) {
    const list = getGuestInsights(uid);
    list.unshift(insight);
    saveGuestInsights(uid, list);
    dispatchGuestDataChanged('insights', uid);
    return;
  }
  const insightRef = doc(db, 'users', uid, 'insights', insight.id);
  const cleanData = cleanForFirestore(insight);
  await setDoc(insightRef, cleanData, { merge: true });
}

/**
 * Subscribe to insights
 */
export function subscribeToInsights(uid: string, callback: (insights: InsightReport[]) => void) {
  if (!uid) return () => {};
  if (isGuestUid(uid)) {
    callback(getGuestInsights(uid));
    const handler = (e: Event) => {
      const customEvent = e as CustomEvent;
      if (!customEvent.detail || customEvent.detail.type === 'insights' || customEvent.detail.type === 'all') {
        callback(getGuestInsights(uid));
      }
    };
    window.addEventListener('reflect_guest_data_changed', handler);
    return () => window.removeEventListener('reflect_guest_data_changed', handler);
  }
  const insightsCol = collection(db, 'users', uid, 'insights');
  const q = query(insightsCol, orderBy('generatedAt', 'desc'), limit(10));
  return onSnapshot(q, (snap) => {
    const list: InsightReport[] = [];
    snap.forEach((d) => {
      if (d.id !== 'weeklySummary') {
        list.push({ id: d.id, ...d.data() } as InsightReport);
      }
    });
    callback(list);
  }, (err) => {
    console.error('Insights subscription error:', err);
  });
}

/**
 * Save proactive nudge (users/{uid}/nudges/{nudgeId})
 */
export async function saveNudge(uid: string, nudge: ProactiveNudge): Promise<void> {
  if (!uid) throw new Error('Unauthenticated nudge save rejected');
  if (isGuestUid(uid)) {
    const list = getGuestNudges(uid);
    list.unshift(nudge);
    saveGuestNudges(uid, list);
    dispatchGuestDataChanged('nudges', uid);
    return;
  }
  const nudgeRef = doc(db, 'users', uid, 'nudges', nudge.id);
  const cleanData = cleanForFirestore(nudge);
  await setDoc(nudgeRef, cleanData, { merge: true });
}

/**
 * Subscribe to active nudges
 */
export function subscribeToNudges(uid: string, callback: (nudges: ProactiveNudge[]) => void) {
  if (!uid) return () => {};
  if (isGuestUid(uid)) {
    callback(getGuestNudges(uid).filter(n => !n.isDismissed && !n.dismissed));
    const handler = (e: Event) => {
      const customEvent = e as CustomEvent;
      if (!customEvent.detail || customEvent.detail.type === 'nudges' || customEvent.detail.type === 'all') {
        callback(getGuestNudges(uid).filter(n => !n.isDismissed && !n.dismissed));
      }
    };
    window.addEventListener('reflect_guest_data_changed', handler);
    return () => window.removeEventListener('reflect_guest_data_changed', handler);
  }
  const nudgesCol = collection(db, 'users', uid, 'nudges');
  const q = query(nudgesCol, orderBy('createdAt', 'desc'), limit(5));
  return onSnapshot(q, (snap) => {
    const list: ProactiveNudge[] = [];
    snap.forEach((d) => {
      const data = { id: d.id, ...d.data() } as ProactiveNudge;
      if (!data.isDismissed && !data.dismissed) {
        list.push(data);
      }
    });
    callback(list);
  }, (err) => {
    console.error('Nudges subscription error:', err);
  });
}

/**
 * Dismiss a nudge
 */
export async function dismissNudge(uid: string, nudgeId: string): Promise<void> {
  if (!uid) return;
  if (isGuestUid(uid)) {
    const list = getGuestNudges(uid).map(n => n.id === nudgeId ? { ...n, isDismissed: true, dismissed: true, dismissedAt: new Date().toISOString() } : n);
    saveGuestNudges(uid, list);
    dispatchGuestDataChanged('nudges', uid);
    return;
  }
  const nudgeRef = doc(db, 'users', uid, 'nudges', nudgeId);
  await updateDoc(nudgeRef, {
    isDismissed: true,
    dismissed: true,
    dismissedAt: new Date().toISOString()
  });
}

/**
 * Save weekly reflection summary (users/{uid}/insights/weeklySummary)
 */
export async function saveWeeklySummary(uid: string, report: WeeklyReflectionReport): Promise<void> {
  if (!uid) throw new Error('Unauthenticated weekly summary save rejected');
  if (isGuestUid(uid)) {
    saveGuestWeeklySummary(uid, report);
    dispatchGuestDataChanged('weekly', uid);
    return;
  }
  const summaryRef = doc(db, 'users', uid, 'insights', 'weeklySummary');
  const cleanData = cleanForFirestore(report);
  await setDoc(summaryRef, cleanData, { merge: true });
}

/**
 * Get cached weekly reflection summary (users/{uid}/insights/weeklySummary)
 */
export async function getWeeklySummary(uid: string): Promise<WeeklyReflectionReport | null> {
  if (!uid) return null;
  if (isGuestUid(uid)) {
    return getGuestWeeklySummary(uid);
  }
  const summaryRef = doc(db, 'users', uid, 'insights', 'weeklySummary');
  const snap = await getDoc(summaryRef);
  if (snap.exists()) {
    return { id: snap.id, ...snap.data() } as WeeklyReflectionReport;
  }
  return null;
}

/**
 * Subscribe to weekly reflection summary (users/{uid}/insights/weeklySummary)
 */
export function subscribeToWeeklySummary(uid: string, callback: (report: WeeklyReflectionReport | null) => void) {
  if (!uid) return () => {};
  if (isGuestUid(uid)) {
    callback(getGuestWeeklySummary(uid));
    const handler = (e: Event) => {
      const customEvent = e as CustomEvent;
      if (!customEvent.detail || customEvent.detail.type === 'weekly' || customEvent.detail.type === 'all') {
        callback(getGuestWeeklySummary(uid));
      }
    };
    window.addEventListener('reflect_guest_data_changed', handler);
    return () => window.removeEventListener('reflect_guest_data_changed', handler);
  }
  const summaryRef = doc(db, 'users', uid, 'insights', 'weeklySummary');
  return onSnapshot(summaryRef, (snap) => {
    if (snap.exists()) {
      callback({ id: snap.id, ...snap.data() } as WeeklyReflectionReport);
    } else {
      callback(null);
    }
  }, (err) => {
    console.error('Weekly summary subscription error:', err);
  });
}

/**
 * Save a notification (users/{uid}/notifications/{notificationId})
 */
export async function saveNotification(uid: string, notification: AppNotification): Promise<void> {
  if (!uid) throw new Error('Unauthenticated notification save rejected');
  if (isGuestUid(uid)) {
    const list = getGuestNotifications(uid);
    list.unshift(notification);
    saveGuestNotifications(uid, list);
    dispatchGuestDataChanged('notifications', uid);
    return;
  }
  const notifRef = doc(db, 'users', uid, 'notifications', notification.id);
  const cleanData = cleanForFirestore(notification);
  await setDoc(notifRef, cleanData, { merge: true });
}

/**
 * Subscribe to notifications (users/{uid}/notifications collection)
 */
export function subscribeToNotifications(uid: string, callback: (notifications: AppNotification[]) => void) {
  if (!uid) return () => {};
  if (isGuestUid(uid)) {
    callback(getGuestNotifications(uid));
    const handler = (e: Event) => {
      const customEvent = e as CustomEvent;
      if (!customEvent.detail || customEvent.detail.type === 'notifications' || customEvent.detail.type === 'all') {
        callback(getGuestNotifications(uid));
      }
    };
    window.addEventListener('reflect_guest_data_changed', handler);
    return () => window.removeEventListener('reflect_guest_data_changed', handler);
  }
  const notifsCol = collection(db, 'users', uid, 'notifications');
  const q = query(notifsCol, orderBy('createdAt', 'desc'), limit(50));
  
  return onSnapshot(q, (snapshot) => {
    const list: AppNotification[] = [];
    snapshot.forEach((docSnap) => {
      const notif = { id: docSnap.id, ...docSnap.data() } as AppNotification;
      if (!isDemoNotification(notif)) {
        list.push(notif);
      } else {
        // Silently purge any legacy sample notification doc from Firestore
        deleteDoc(doc(db, 'users', uid, 'notifications', docSnap.id)).catch(() => {});
      }
    });

    callback(list);
  }, (err) => {
    console.error('Notifications subscription error:', err);
  });
}

/**
 * Mark a notification as read
 */
export async function markNotificationAsRead(uid: string, notificationId: string): Promise<void> {
  if (!uid) return;
  if (isGuestUid(uid)) {
    const list = getGuestNotifications(uid).map(n => n.id === notificationId ? { ...n, isRead: true, readAt: new Date().toISOString() } : n);
    saveGuestNotifications(uid, list);
    dispatchGuestDataChanged('notifications', uid);
    return;
  }
  const notifRef = doc(db, 'users', uid, 'notifications', notificationId);
  await updateDoc(notifRef, {
    isRead: true,
    readAt: new Date().toISOString()
  });
}

/**
 * Mark all notifications as read
 */
export async function markAllNotificationsAsRead(uid: string, notifications: AppNotification[]): Promise<void> {
  if (!uid) return;
  if (isGuestUid(uid)) {
    const list = getGuestNotifications(uid).map(n => ({ ...n, isRead: true, readAt: new Date().toISOString() }));
    saveGuestNotifications(uid, list);
    dispatchGuestDataChanged('notifications', uid);
    return;
  }
  for (const notif of notifications) {
    if (!notif.isRead) {
      await markNotificationAsRead(uid, notif.id);
    }
  }
}

/**
 * Delete a notification
 */
export async function deleteNotification(uid: string, notificationId: string): Promise<void> {
  if (!uid) return;
  if (isGuestUid(uid)) {
    const list = getGuestNotifications(uid).filter(n => n.id !== notificationId);
    saveGuestNotifications(uid, list);
    dispatchGuestDataChanged('notifications', uid);
    return;
  }
  const notifRef = doc(db, 'users', uid, 'notifications', notificationId);
  await deleteDoc(notifRef);
}

/**
 * Save a gratitude entry (users/{uid}/gratitudeEntries/{entryId})
 */
export async function saveGratitudeEntry(uid: string, entry: GratitudeEntry): Promise<void> {
  if (!uid) throw new Error('Unauthenticated gratitude save rejected');
  if (isGuestUid(uid)) {
    const list = getGuestGratitude(uid);
    const idx = list.findIndex(g => g.id === entry.id);
    if (idx >= 0) {
      list[idx] = { ...list[idx], ...entry };
    } else {
      list.unshift(entry);
    }
    saveGuestGratitude(uid, list);
    dispatchGuestDataChanged('gratitude', uid);
    return;
  }
  const entryRef = doc(db, 'users', uid, 'gratitudeEntries', entry.id);
  const cleanData = cleanForFirestore(entry);
  await setDoc(entryRef, cleanData, { merge: true });
}

/**
 * Subscribe to gratitude entries (users/{uid}/gratitudeEntries collection)
 */
export function subscribeToGratitudeEntries(uid: string, callback: (entries: GratitudeEntry[]) => void) {
  if (!uid) return () => {};
  if (isGuestUid(uid)) {
    callback(getGuestGratitude(uid));
    const handler = (e: Event) => {
      const customEvent = e as CustomEvent;
      if (!customEvent.detail || customEvent.detail.type === 'gratitude' || customEvent.detail.type === 'all') {
        callback(getGuestGratitude(uid));
      }
    };
    window.addEventListener('reflect_guest_data_changed', handler);
    return () => window.removeEventListener('reflect_guest_data_changed', handler);
  }
  const colRef = collection(db, 'users', uid, 'gratitudeEntries');
  const q = query(colRef, orderBy('date', 'desc'), limit(100));

  return onSnapshot(q, (snapshot) => {
    const list: GratitudeEntry[] = [];
    snapshot.forEach((docSnap) => {
      list.push({ id: docSnap.id, ...docSnap.data() } as GratitudeEntry);
    });
    callback(list);
  }, (err) => {
    console.error('Gratitude entries subscription error:', err);
  });
}

/**
 * Delete a gratitude entry
 */
export async function deleteGratitudeEntry(uid: string, entryId: string): Promise<void> {
  if (!uid) return;
  if (isGuestUid(uid)) {
    const list = getGuestGratitude(uid).filter(g => g.id !== entryId);
    saveGuestGratitude(uid, list);
    dispatchGuestDataChanged('gratitude', uid);
    return;
  }
  const entryRef = doc(db, 'users', uid, 'gratitudeEntries', entryId);
  await deleteDoc(entryRef);
}

/**
 * Record a milestone achievement (users/{uid}/profile/milestones)
 * Uses merge: true so each milestone is recorded with its achievement timestamp.
 */
export async function saveMilestone(uid: string, milestoneKey: MilestoneKey): Promise<void> {
  if (!uid) throw new Error('Unauthenticated milestone save rejected');
  if (isGuestUid(uid)) {
    const m = getGuestMilestones(uid);
    m[milestoneKey] = new Date().toISOString();
    saveGuestMilestones(uid, m);
    dispatchGuestDataChanged('milestones', uid);
    return;
  }
  const milestonesRef = doc(db, 'users', uid, 'profile', 'milestones');
  await setDoc(milestonesRef, {
    [milestoneKey]: new Date().toISOString()
  }, { merge: true });
}

/**
 * Fetch milestones snapshot (users/{uid}/profile/milestones)
 */
export async function getMilestones(uid: string): Promise<UserMilestones | null> {
  if (!uid) return null;
  if (isGuestUid(uid)) {
    return getGuestMilestones(uid);
  }
  const milestonesRef = doc(db, 'users', uid, 'profile', 'milestones');
  const snap = await getDoc(milestonesRef);
  if (snap.exists()) {
    return snap.data() as UserMilestones;
  }
  return null;
}

/**
 * Subscribe to milestones in real-time (users/{uid}/profile/milestones)
 */
export function subscribeToMilestones(uid: string, callback: (milestones: UserMilestones) => void) {
  if (!uid) return () => {};
  if (isGuestUid(uid)) {
    callback(getGuestMilestones(uid));
    const handler = (e: Event) => {
      const customEvent = e as CustomEvent;
      if (!customEvent.detail || customEvent.detail.type === 'milestones' || customEvent.detail.type === 'all') {
        callback(getGuestMilestones(uid));
      }
    };
    window.addEventListener('reflect_guest_data_changed', handler);
    return () => window.removeEventListener('reflect_guest_data_changed', handler);
  }
  const milestonesRef = doc(db, 'users', uid, 'profile', 'milestones');
  return onSnapshot(milestonesRef, (snap) => {
    if (snap.exists()) {
      callback(snap.data() as UserMilestones);
    } else {
      callback({});
    }
  }, (err) => {
    console.warn('Milestones subscription error:', err);
  });
}

/**
 * Deactivates user account directly in Firestore under users/{uid}/profile/summary.
 * Sets deactivated: true and deactivatedAt timestamp while preserving all journal data.
 */
export async function deactivateAccountDirect(uid: string): Promise<void> {
  if (!uid) throw new Error('Unauthenticated user cannot be deactivated.');
  if (isGuestUid(uid)) {
    const summary = getGuestProfileSummary(uid) || {
      userId: uid,
      summary: '',
      lastUpdated: new Date().toISOString(),
      keyThemes: [],
      totalEntriesAnalyzed: 0,
    };
    summary.deactivated = true;
    summary.deactivatedAt = new Date().toISOString();
    saveGuestProfileSummary(uid, summary);
    dispatchGuestDataChanged('profile', uid);
    return;
  }
  const summaryRef = doc(db, 'users', uid, 'profile', 'summary');
  const now = new Date().toISOString();
  await setDoc(summaryRef, {
    deactivated: true,
    deactivatedAt: now,
  }, { merge: true });
}

/**
 * Permanently deletes all user collections and documents under users/{uid}/*
 */
export async function purgeUserAccountData(uid: string): Promise<void> {
  if (!uid) throw new Error('Unauthenticated user cannot purge account.');
  if (isGuestUid(uid)) {
    localStorage.removeItem(`reflect_guest_entries_${uid}`);
    localStorage.removeItem(`reflect_guest_gratitude_${uid}`);
    localStorage.removeItem(`reflect_guest_summary_${uid}`);
    localStorage.removeItem(`reflect_guest_insights_${uid}`);
    localStorage.removeItem(`reflect_guest_nudges_${uid}`);
    localStorage.removeItem(`reflect_guest_notifs_${uid}`);
    localStorage.removeItem(`reflect_guest_milestones_${uid}`);
    localStorage.removeItem(`reflect_is_guest_mode`);
    localStorage.removeItem(`reflect_guest_uid`);
    dispatchGuestDataChanged('all', uid);
    return;
  }
  const subcollectionNames = ['entries', 'gratitude', 'insights', 'nudges', 'notifications'];
  for (const name of subcollectionNames) {
    try {
      const colRef = collection(db, 'users', uid, name);
      const snap = await getDocs(colRef);
      for (const docSnap of snap.docs) {
        await deleteDoc(docSnap.ref);
      }
    } catch (colErr) {
      console.warn(`Error purging collection ${name}:`, colErr);
    }
  }

  // Delete profile documents
  try {
    const summaryRef = doc(db, 'users', uid, 'profile', 'summary');
    await deleteDoc(summaryRef);
  } catch {}
  try {
    const milestonesRef = doc(db, 'users', uid, 'profile', 'milestones');
    await deleteDoc(milestonesRef);
  } catch {}
  try {
    const settingsRef = doc(db, 'users', uid, 'profile', 'settings');
    await deleteDoc(settingsRef);
  } catch {}
}

