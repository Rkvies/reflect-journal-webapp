import { doc, getDoc, setDoc } from 'firebase/firestore';
import { db } from './firebase';

export interface PinRotationRecord {
  id: string;
  rotatedAt: string;
  reason: 'initial_setup' | 'routine_90_day_rotation' | 'manual_rotation' | 'reset_recovery' | 'policy_enforcement';
  status: 'active' | 'superseded';
}

export interface PinSettings {
  pinEnabled: boolean;
  pinHash: string;
  hasPromptedSetup: boolean;
  autoLockMinutes?: number;
  lastRotatedAt?: string; // ISO string timestamp when PIN was set or last rotated
  rotationPolicyDays?: number; // Policy duration in days (standard: 90)
  enforceRotation?: boolean; // Whether 90-day rotation is enforced
  rotationHistory?: PinRotationRecord[];
  updatedAt?: string;
}

export interface SecretRotationStatus {
  isConfigured: boolean;
  lastRotatedAt: string;
  daysElapsed: number;
  daysRemaining: number;
  maxPolicyDays: number;
  isExpired: boolean;
  isExpiringSoon: boolean;
  nextRotationDeadline: string;
  progressPercent: number;
  statusLabel: 'compliant' | 'warning' | 'expired' | 'disabled';
}

const PIN_STORAGE_PREFIX = 'reflect_pin_';
export const DEFAULT_ROTATION_POLICY_DAYS = 90;

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
 * Calculate the 90-day secret rotation status for a user PIN
 */
export function calculateRotationStatus(settings: PinSettings): SecretRotationStatus {
  if (!settings.pinEnabled || !settings.pinHash) {
    return {
      isConfigured: false,
      lastRotatedAt: '',
      daysElapsed: 0,
      daysRemaining: DEFAULT_ROTATION_POLICY_DAYS,
      maxPolicyDays: DEFAULT_ROTATION_POLICY_DAYS,
      isExpired: false,
      isExpiringSoon: false,
      nextRotationDeadline: '',
      progressPercent: 0,
      statusLabel: 'disabled',
    };
  }

  const maxDays = settings.rotationPolicyDays || DEFAULT_ROTATION_POLICY_DAYS;
  const lastRotated = settings.lastRotatedAt || settings.updatedAt || new Date().toISOString();
  const lastRotatedTime = new Date(lastRotated).getTime();
  const now = Date.now();
  
  const diffMs = Math.max(0, now - lastRotatedTime);
  const daysElapsed = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  const daysRemaining = Math.max(0, maxDays - daysElapsed);
  const isExpired = daysElapsed >= maxDays;
  const isExpiringSoon = !isExpired && daysRemaining <= 14;
  
  const nextDeadlineMs = lastRotatedTime + maxDays * 24 * 60 * 60 * 1000;
  const nextRotationDeadline = new Date(nextDeadlineMs).toISOString();
  const progressPercent = Math.min(100, Math.round((daysElapsed / maxDays) * 100));

  let statusLabel: 'compliant' | 'warning' | 'expired' | 'disabled' = 'compliant';
  if (isExpired) statusLabel = 'expired';
  else if (isExpiringSoon) statusLabel = 'warning';

  return {
    isConfigured: true,
    lastRotatedAt: lastRotated,
    daysElapsed,
    daysRemaining,
    maxPolicyDays: maxDays,
    isExpired,
    isExpiringSoon,
    nextRotationDeadline,
    progressPercent,
    statusLabel,
  };
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
    const lastRotatedAt = localStorage.getItem(`${PIN_STORAGE_PREFIX}last_rotated_${uid}`) || (enabled ? new Date().toISOString() : undefined);
    const rotationPolicyDays = parseInt(localStorage.getItem(`${PIN_STORAGE_PREFIX}policy_days_${uid}`) || '90', 10);
    const enforceRotation = localStorage.getItem(`${PIN_STORAGE_PREFIX}enforce_rotation_${uid}`) !== 'false';
    
    let rotationHistory: PinRotationRecord[] = [];
    try {
      const historyStr = localStorage.getItem(`${PIN_STORAGE_PREFIX}history_${uid}`);
      if (historyStr) rotationHistory = JSON.parse(historyStr);
    } catch {
      rotationHistory = [];
    }

    return {
      pinEnabled: enabled,
      pinHash: hash,
      hasPromptedSetup: prompted,
      autoLockMinutes,
      lastRotatedAt,
      rotationPolicyDays,
      enforceRotation,
      rotationHistory,
    };
  } catch {
    return {
      pinEnabled: false,
      pinHash: '',
      hasPromptedSetup: false,
      autoLockMinutes: 0,
      lastRotatedAt: undefined,
      rotationPolicyDays: 90,
      enforceRotation: true,
      rotationHistory: [],
    };
  }
}

/**
 * Save PIN settings locally and to Firestore with rotation history support
 */
export async function savePinSettings(
  uid: string,
  settings: Partial<PinSettings>,
  rotationReason?: 'initial_setup' | 'routine_90_day_rotation' | 'manual_rotation' | 'reset_recovery' | 'policy_enforcement'
): Promise<PinSettings> {
  const current = getLocalPinSettings(uid);
  const nowIso = new Date().toISOString();

  // If a new pinHash is provided and differs from existing, or if explicitly requested, record a rotation event
  let updatedHistory = current.rotationHistory ? [...current.rotationHistory] : [];
  let updatedLastRotatedAt = current.lastRotatedAt || nowIso;

  if (settings.pinHash && settings.pinHash !== current.pinHash) {
    updatedLastRotatedAt = nowIso;
    // Mark previous records as superseded
    updatedHistory = updatedHistory.map((h) => ({ ...h, status: 'superseded' as const }));
    // Append new active record
    updatedHistory.unshift({
      id: `rot_${Date.now()}`,
      rotatedAt: nowIso,
      reason: rotationReason || (current.pinEnabled ? 'routine_90_day_rotation' : 'initial_setup'),
      status: 'active',
    });
  }

  // If lastRotatedAt is explicitly passed (e.g. from simulation or reset)
  if (settings.lastRotatedAt !== undefined) {
    updatedLastRotatedAt = settings.lastRotatedAt;
  }

  const updated: PinSettings = {
    ...current,
    ...settings,
    lastRotatedAt: updatedLastRotatedAt,
    rotationPolicyDays: settings.rotationPolicyDays ?? current.rotationPolicyDays ?? DEFAULT_ROTATION_POLICY_DAYS,
    enforceRotation: settings.enforceRotation ?? current.enforceRotation ?? true,
    rotationHistory: updatedHistory.slice(0, 20), // Retain last 20 rotation audits
    updatedAt: nowIso,
  };

  // 1. Update localStorage
  try {
    localStorage.setItem(`${PIN_STORAGE_PREFIX}enabled_${uid}`, String(updated.pinEnabled));
    localStorage.setItem(`${PIN_STORAGE_PREFIX}hash_${uid}`, updated.pinHash || '');
    localStorage.setItem(`${PIN_STORAGE_PREFIX}prompted_${uid}`, String(updated.hasPromptedSetup));
    localStorage.setItem(`${PIN_STORAGE_PREFIX}autolock_${uid}`, String(updated.autoLockMinutes || 0));
    if (updated.lastRotatedAt) {
      localStorage.setItem(`${PIN_STORAGE_PREFIX}last_rotated_${uid}`, updated.lastRotatedAt);
    }
    localStorage.setItem(`${PIN_STORAGE_PREFIX}policy_days_${uid}`, String(updated.rotationPolicyDays || 90));
    localStorage.setItem(`${PIN_STORAGE_PREFIX}enforce_rotation_${uid}`, String(updated.enforceRotation));
    localStorage.setItem(`${PIN_STORAGE_PREFIX}history_${uid}`, JSON.stringify(updated.rotationHistory || []));
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
 * Simulate setting the last rotation date to N days in the past (Testing helper)
 */
export async function simulatePinExpiry(uid: string, daysAgo: number): Promise<PinSettings> {
  const simulatedDate = new Date(Date.now() - daysAgo * 24 * 60 * 60 * 1000).toISOString();
  return savePinSettings(uid, {
    lastRotatedAt: simulatedDate,
  });
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
      const nowIso = new Date().toISOString();
      
      const hydratedData: PinSettings = {
        ...data,
        lastRotatedAt: data.lastRotatedAt || data.updatedAt || (data.pinEnabled ? nowIso : undefined),
        rotationPolicyDays: data.rotationPolicyDays || DEFAULT_ROTATION_POLICY_DAYS,
        enforceRotation: data.enforceRotation !== false,
        rotationHistory: data.rotationHistory || [],
      };

      // Sync to localStorage
      localStorage.setItem(`${PIN_STORAGE_PREFIX}enabled_${uid}`, String(hydratedData.pinEnabled));
      localStorage.setItem(`${PIN_STORAGE_PREFIX}hash_${uid}`, hydratedData.pinHash || '');
      localStorage.setItem(`${PIN_STORAGE_PREFIX}prompted_${uid}`, String(hydratedData.hasPromptedSetup));
      localStorage.setItem(`${PIN_STORAGE_PREFIX}autolock_${uid}`, String(hydratedData.autoLockMinutes || 0));
      if (hydratedData.lastRotatedAt) {
        localStorage.setItem(`${PIN_STORAGE_PREFIX}last_rotated_${uid}`, hydratedData.lastRotatedAt);
      }
      localStorage.setItem(`${PIN_STORAGE_PREFIX}policy_days_${uid}`, String(hydratedData.rotationPolicyDays));
      localStorage.setItem(`${PIN_STORAGE_PREFIX}enforce_rotation_${uid}`, String(hydratedData.enforceRotation));
      localStorage.setItem(`${PIN_STORAGE_PREFIX}history_${uid}`, JSON.stringify(hydratedData.rotationHistory));
      
      return hydratedData;
    }
  } catch (err) {
    console.warn('Error loading PIN settings from Firestore:', err);
  }
  return getLocalPinSettings(uid);
}

