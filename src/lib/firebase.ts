import { initializeApp, getApps, getApp } from 'firebase/app';
import { 
  getAuth, 
  GoogleAuthProvider, 
  signInWithPopup, 
  signOut as fbSignOut, 
  onAuthStateChanged, 
  signInAnonymously,
  User 
} from 'firebase/auth';
import { 
  getFirestore, 
  doc, 
  setDoc, 
  getDoc, 
  collection, 
  query, 
  orderBy, 
  limit, 
  onSnapshot, 
  deleteDoc, 
  updateDoc 
} from 'firebase/firestore';
import firebaseConfig from '../../firebase-applet-config.json';
import { JournalEntry, ProfileSummary, InsightReport, ProactiveNudge } from '../types';

// Initialize Firebase App
const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();

// Use specific Firestore database ID if provided, otherwise default
export const db = firebaseConfig.firestoreDatabaseId 
  ? getFirestore(app, firebaseConfig.firestoreDatabaseId)
  : getFirestore(app);

export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();

export async function signInWithGoogle() {
  try {
    const result = await signInWithPopup(auth, googleProvider);
    return result.user;
  } catch (error: any) {
    console.error('Google Sign In Error:', error);
    // If popup is blocked by iframe security sandbox, offer anonymous or retry
    if (error.code === 'auth/popup-blocked' || error.code === 'auth/cancelled-popup-request') {
      throw new Error('Sign-in popup was blocked by browser or iframe. Please enable popups or try Demo Access.');
    }
    throw error;
  }
}

export async function signInDemo() {
  try {
    const result = await signInAnonymously(auth);
    return result.user;
  } catch (error: any) {
    console.error('Demo Sign In Error:', error);
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
 * Delete a journal entry
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
  const q = query(entriesCol, orderBy('createdAt', 'desc'), limit(50));
  
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
    snap.forEach((d) => list.push(d.data() as InsightReport));
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
      const data = d.data() as ProactiveNudge;
      if (!data.isDismissed) {
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
  await updateDoc(nudgeRef, { isDismissed: true });
}
