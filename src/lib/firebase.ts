import { initializeApp, getApps, getApp } from 'firebase/app';
import { 
  getAuth, 
  GoogleAuthProvider, 
  signInWithPopup, 
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
import { JournalEntry, ProfileSummary, InsightReport, ProactiveNudge, WeeklyReflectionReport, AppNotification, GratitudeEntry } from '../types';

// Initialize Firebase App
const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();

// Use specific Firestore database ID if provided, otherwise default
export const db = firebaseConfig.firestoreDatabaseId 
  ? getFirestore(app, firebaseConfig.firestoreDatabaseId)
  : getFirestore(app);

export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();
googleProvider.setCustomParameters({
  prompt: 'select_account'
});

export async function signInWithGoogle() {
  try {
    const result = await signInWithPopup(auth, googleProvider);
    return result.user;
  } catch (error: any) {
    console.error('Google Sign In Error:', error);
    // If popup is blocked by iframe security sandbox, inform user
    if (error.code === 'auth/popup-blocked' || error.code === 'auth/cancelled-popup-request') {
      throw new Error('Sign-in popup was blocked by the browser. Please allow popups for this site and try again.');
    }
    throw error;
  }
}

export async function logOut() {
  return fbSignOut(auth);
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
    mood?: string;
    tags?: string[];
  }
): Promise<void> {
  if (!uid) throw new Error('Unauthenticated write rejected');
  const entryRef = doc(db, 'users', uid, 'entries', entryId);
  const now = new Date().toISOString();
  const wordCount = updates.content.trim().split(/\s+/).filter(Boolean).length;
  
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
  const entryRef = doc(db, 'users', uid, 'entries', entryId);
  await deleteDoc(entryRef);
}

/**
 * Fetch or listen to user entries (sorted by createdAt descending)
 */
export function subscribeToEntries(uid: string, callback: (entries: JournalEntry[]) => void) {
  if (!uid) return () => {};
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
  const summaryRef = doc(db, 'users', uid, 'profile', 'summary');
  const cleanData = cleanForFirestore(summary);
  await setDoc(summaryRef, cleanData, { merge: true });
}

/**
 * Subscribe to profile summary
 */
export function subscribeToProfileSummary(uid: string, callback: (summary: ProfileSummary | null) => void) {
  if (!uid) return () => {};
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
  const insightRef = doc(db, 'users', uid, 'insights', insight.id);
  const cleanData = cleanForFirestore(insight);
  await setDoc(insightRef, cleanData, { merge: true });
}

/**
 * Subscribe to insights
 */
export function subscribeToInsights(uid: string, callback: (insights: InsightReport[]) => void) {
  if (!uid) return () => {};
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
  const nudgeRef = doc(db, 'users', uid, 'nudges', nudge.id);
  const cleanData = cleanForFirestore(nudge);
  await setDoc(nudgeRef, cleanData, { merge: true });
}

/**
 * Subscribe to active nudges
 */
export function subscribeToNudges(uid: string, callback: (nudges: ProactiveNudge[]) => void) {
  if (!uid) return () => {};
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
  const summaryRef = doc(db, 'users', uid, 'insights', 'weeklySummary');
  const cleanData = cleanForFirestore(report);
  await setDoc(summaryRef, cleanData, { merge: true });
}

/**
 * Get cached weekly reflection summary (users/{uid}/insights/weeklySummary)
 */
export async function getWeeklySummary(uid: string): Promise<WeeklyReflectionReport | null> {
  if (!uid) return null;
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
  const notifRef = doc(db, 'users', uid, 'notifications', notification.id);
  const cleanData = cleanForFirestore(notification);
  await setDoc(notifRef, cleanData, { merge: true });
}

/**
 * Subscribe to notifications (users/{uid}/notifications collection)
 */
export function subscribeToNotifications(uid: string, callback: (notifications: AppNotification[]) => void) {
  if (!uid) return () => {};
  const notifsCol = collection(db, 'users', uid, 'notifications');
  const q = query(notifsCol, orderBy('createdAt', 'desc'), limit(50));
  
  return onSnapshot(q, (snapshot) => {
    const list: AppNotification[] = [];
    snapshot.forEach((docSnap) => {
      list.push({ id: docSnap.id, ...docSnap.data() } as AppNotification);
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
  const notifRef = doc(db, 'users', uid, 'notifications', notificationId);
  await deleteDoc(notifRef);
}

/**
 * Save a gratitude entry (users/{uid}/gratitudeEntries/{entryId})
 */
export async function saveGratitudeEntry(uid: string, entry: GratitudeEntry): Promise<void> {
  if (!uid) throw new Error('Unauthenticated gratitude save rejected');
  const entryRef = doc(db, 'users', uid, 'gratitudeEntries', entry.id);
  const cleanData = cleanForFirestore(entry);
  await setDoc(entryRef, cleanData, { merge: true });
}

/**
 * Subscribe to gratitude entries (users/{uid}/gratitudeEntries collection)
 */
export function subscribeToGratitudeEntries(uid: string, callback: (entries: GratitudeEntry[]) => void) {
  if (!uid) return () => {};
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
  const entryRef = doc(db, 'users', uid, 'gratitudeEntries', entryId);
  await deleteDoc(entryRef);
}

