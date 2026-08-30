import { doc, getDoc, setDoc } from 'firebase/firestore';
import { db } from './firebase';

export interface PinSettings {
  pinEnabled: boolean;
  pinHash: string;
  hasPromptedSetup: boolean;
  autoLockMinutes?: number;
  updatedAt?: string;
}

const PIN_STORAGE_PREFIX = 'reflect_pin_';

/**
 * Hash a 6-digit PIN securely using browser SHA-256 crypto API
 */
export async function hashPin(pin: string): Promise<string> {
  const msgUint8 = new TextEncoder().encode(`reflect_salt_v1_${pin}`);
  const hashBuffer = await crypto.subtle.digest('SHA-256', msgUint8);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
}

/**
 * Verify a 6-digit PIN against a stored hash
 */
export async function verifyPin(pin: string, storedHash: string): Promise<boolean> {
  if (!pin || pin.length !== 6 || !storedHash) return false;
  const hash = await hashPin(pin);
  return hash === storedHash;
}

/**
 * Get local fallback PIN settings for immediate synchronous UI render
 */
export function getLocalPinSettings(uid: string): PinSettings {
  try {
    const enabled = localStorage.getItem(`${PIN_STORAGE_PREFIX}enabled_${uid}`) === 'true';
    const hash = localStorage.getItem(`${PIN_STORAGE_PREFIX}hash_${uid}`) || '';
    const prompted = localStorage.getItem(`${PIN_STORAGE_PREFIX}prompted_${uid}`) === 'true';
    const autoLockStr = localStorage.getItem(`${PIN_STORAGE_PREFIX}autolock_${uid}`);
    const autoLockMinutes = autoLockStr ? parseInt(autoLockStr, 10) : 0;
    return {
      pinEnabled: enabled,
      pinHash: hash,
      hasPromptedSetup: prompted,
      autoLockMinutes,
    };
  } catch {
    return { pinEnabled: false, pinHash: '', hasPromptedSetup: false, autoLockMinutes: 0 };
  }
}

/**
 * Save PIN settings locally and to Firestore
 */
export async function savePinSettings(uid: string, settings: Partial<PinSettings>): Promise<PinSettings> {
  const current = getLocalPinSettings(uid);
  const updated: PinSettings = {
    ...current,
    ...settings,
    updatedAt: new Date().toISOString(),
  };

  // 1. Update localStorage
  try {
    localStorage.setItem(`${PIN_STORAGE_PREFIX}enabled_${uid}`, String(updated.pinEnabled));
    localStorage.setItem(`${PIN_STORAGE_PREFIX}hash_${uid}`, updated.pinHash || '');
    localStorage.setItem(`${PIN_STORAGE_PREFIX}prompted_${uid}`, String(updated.hasPromptedSetup));
    localStorage.setItem(`${PIN_STORAGE_PREFIX}autolock_${uid}`, String(updated.autoLockMinutes || 0));
  } catch (err) {
    console.warn('Failed saving PIN to localStorage:', err);
  }

  // 2. Update Firestore document users/{uid}/settings/pin
  try {
    const pinDocRef = doc(db, 'users', uid, 'settings', 'pin');
    await setDoc(pinDocRef, updated, { merge: true });
  } catch (err) {
    console.warn('Failed saving PIN settings to Firestore:', err);
  }

  return updated;
}

/**
 * Load PIN settings from Firestore document
 */
export async function loadPinSettingsFromFirestore(uid: string): Promise<PinSettings> {
  try {
    const pinDocRef = doc(db, 'users', uid, 'settings', 'pin');
    const snap = await getDoc(pinDocRef);
    if (snap.exists()) {
      const data = snap.data() as PinSettings;
      // Sync to localStorage
      localStorage.setItem(`${PIN_STORAGE_PREFIX}enabled_${uid}`, String(data.pinEnabled));
      localStorage.setItem(`${PIN_STORAGE_PREFIX}hash_${uid}`, data.pinHash || '');
      localStorage.setItem(`${PIN_STORAGE_PREFIX}prompted_${uid}`, String(data.hasPromptedSetup));
      localStorage.setItem(`${PIN_STORAGE_PREFIX}autolock_${uid}`, String(data.autoLockMinutes || 0));
      return data;
    }
  } catch (err) {
    console.warn('Error loading PIN settings from Firestore:', err);
  }
  return getLocalPinSettings(uid);
}
