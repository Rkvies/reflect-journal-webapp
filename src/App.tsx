import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { onAuthStateChanged, signOut } from 'firebase/auth';
import { 
  collection, 
  query, 
  orderBy, 
  onSnapshot, 
  doc,
  updateDoc,
  setDoc 
} from 'firebase/firestore';
import { auth, db } from './lib/firebase';
import { 
  AppUser, 
  JournalEntry, 
  ProfileSummary, 
  InsightReport, 
  ProactiveNudge,
  WeeklyReflectionReport,
  AppNotification,
  GratitudeEntry,
  UserMilestones,
  MilestoneKey
} from './types';
import { Navbar } from './components/Navbar';
import { NudgeBanner } from './components/NudgeBanner';
import { JournalChat } from './components/JournalChat';
import { EntryHistory } from './components/EntryHistory';
import { InsightsPanel } from './components/InsightsPanel';
import { SentimentTrendChart } from './components/SentimentTrendChart';
import { WeeklyReflectionCard } from './components/WeeklyReflectionCard';
import { GratitudeModule } from './components/GratitudeModule';
import { MilestoneToast, MilestoneToastData } from './components/MilestoneToast';
import { ProfileSummaryModal } from './components/ProfileSummaryModal';
import { SecurityReviewModal } from './components/SecurityReviewModal';
import { DailyQuoteModal } from './components/DailyQuoteModal';
import { DailyAffirmationModal } from './components/DailyAffirmationModal';
import { SettingsPage } from './components/SettingsPage';
import { AuthLanding } from './components/AuthLanding';
import { PinLockScreen } from './components/PinLockScreen';
import { PinSetupModal, PinModalMode } from './components/PinSetupModal';
import { BackgroundPattern } from './components/BackgroundPattern';
import { getLocalPinSettings, savePinSettings, PinSettings } from './lib/pinSecurity';
import { requestAgenticNudge, deactivateAccount, deleteAccount } from './lib/api';
import { MILESTONES, calculateActiveStreak } from './lib/milestones';
import { 
  saveNudge, 
  dismissNudge, 
  subscribeToNotifications, 
  markNotificationAsRead, 
  markAllNotificationsAsRead, 
  deleteNotification,
  saveNotification,
  saveGratitudeEntry,
  subscribeToGratitudeEntries,
  deleteGratitudeEntry,
  saveMilestone,
  subscribeToMilestones,
  deactivateAccountDirect,
  purgeUserAccountData
} from './lib/firebase';
import { UserX, Trash2, Sparkles } from 'lucide-react';
import { useSessionTimeout } from './hooks/useSessionTimeout';

export default function App() {
  const [currentUser, setCurrentUser] = useState<AppUser | null>(null);
  const [isAuthLoading, setIsAuthLoading] = useState(true);
  
  useSessionTimeout(!!currentUser);

  const [activeTab, setActiveTab] = useState<'journal' | 'history' | 'insights' | 'gratitude' | 'settings'>('journal');
  
  // Data State
  const [entries, setEntries] = useState<JournalEntry[]>([]);
  const [profileSummary, setProfileSummary] = useState<ProfileSummary | null>(null);
  const [insights, setInsights] = useState<InsightReport[]>([]);
  const [nudges, setNudges] = useState<ProactiveNudge[]>([]);
  const [weeklySummary, setWeeklySummary] = useState<WeeklyReflectionReport | null>(null);
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [gratitudeEntries, setGratitudeEntries] = useState<GratitudeEntry[]>([]);
  const [milestones, setMilestones] = useState<UserMilestones>({});
  const milestonesRef = useRef<UserMilestones>({});
  const pendingMilestonesRef = useRef<Set<string>>(new Set());
  const toastQueueRef = useRef<MilestoneToastData[]>([]);
  const [activeMilestoneToast, setActiveMilestoneToast] = useState<MilestoneToastData | null>(null);

  // Inspector Modals
  const [isMemoryOpen, setIsMemoryOpen] = useState(false);
  const [isSecurityOpen, setIsSecurityOpen] = useState(false);
  const [isDailyQuoteOpen, setIsDailyQuoteOpen] = useState(false);
  const [isDailyAffirmationOpen, setIsDailyAffirmationOpen] = useState(false);

  // Account Management Modals
  const [isDeactivateModalOpen, setIsDeactivateModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState('');
  const [accountActionLoading, setAccountActionLoading] = useState(false);
  const [accountActionError, setAccountActionError] = useState<string | null>(null);
  const isTerminatingAccountRef = useRef<boolean>(false);

  const handleDeactivateAccount = async () => {
    if (!auth.currentUser) return;
    const user = auth.currentUser;
    const uid = user.uid;
    isTerminatingAccountRef.current = true;
    setIsDailyQuoteOpen(false);
    setIsDailyAffirmationOpen(false);
    setAccountActionLoading(true);
    setAccountActionError(null);
    try {
      // 1. Direct authenticated update to users/{uid}/profile/summary
      await deactivateAccountDirect(uid);

      // 2. Best-effort server notification
      try {
        const token = await user.getIdToken(true);
        await deactivateAccount(token);
      } catch (backendErr) {
        console.warn('Backend deactivation sync note:', backendErr);
      }

      // 3. Clear auth and session state
      localStorage.setItem('reflect_force_select_account', 'true');
      sessionStorage.removeItem('reflect_session_timeout');
      localStorage.removeItem('reflect_last_user_email');
      localStorage.removeItem('reflect_cached_summary');
      await signOut(auth);
      setIsDeactivateModalOpen(false);
    } catch (err: any) {
      console.error('Account deactivation error:', err);
      isTerminatingAccountRef.current = false;
      setAccountActionError(err.message || 'Deactivation failed. Please try again.');
    } finally {
      setAccountActionLoading(false);
    }
  };

  const handleDeleteAccount = async () => {
    if (!auth.currentUser) return;
    const user = auth.currentUser;
    const uid = user.uid;
    isTerminatingAccountRef.current = true;
    setIsDailyQuoteOpen(false);
    setIsDailyAffirmationOpen(false);
    setAccountActionLoading(true);
    setAccountActionError(null);
    try {
      // 1. Purge all user subcollections and documents directly with authenticated client
      await purgeUserAccountData(uid);

      // 2. Best-effort server notification
      try {
        const token = await user.getIdToken(true);
        await deleteAccount(token);
      } catch (backendErr) {
        console.warn('Backend account purge sync note:', backendErr);
      }

      // 3. Delete Firebase Auth user if supported
      try {
        await user.delete();
      } catch (authDelErr) {
        console.warn('Notice: Firebase Auth user deletion requires recent re-auth:', authDelErr);
      }

      // 4. Clear auth, quote tracking, and session state
      localStorage.removeItem(`reflect_last_quote_${uid}`);
      localStorage.setItem('reflect_force_select_account', 'true');
      sessionStorage.removeItem('reflect_session_timeout');
      localStorage.removeItem('reflect_last_user_email');
      localStorage.removeItem('reflect_cached_summary');
      await signOut(auth);
      setIsDeleteModalOpen(false);
    } catch (err: any) {
      console.error('Account deletion error:', err);
      isTerminatingAccountRef.current = false;
      setAccountActionError(err.message || 'Account deletion failed. Please try again.');
    } finally {
      setAccountActionLoading(false);
    }
  };

  const openDeactivateModal = () => {
    setIsDailyQuoteOpen(false);
    setIsDailyAffirmationOpen(false);
    setAccountActionError(null);
    setIsDeactivateModalOpen(true);
  };

  const openDeleteModal = () => {
    setIsDailyQuoteOpen(false);
    setIsDailyAffirmationOpen(false);
    setAccountActionError(null);
    setDeleteConfirmText('');
    setIsDeleteModalOpen(true);
  };

  // Cross-component triggers
  const [prefillPrompt, setPrefillPrompt] = useState<{ prompt: string; tag: string } | null>(null);
  const [existingEntry, setExistingEntry] = useState<JournalEntry | null>(null);
  const [targetEntryId, setTargetEntryId] = useState<string | null>(null);
  const [isDeepFocus, setIsDeepFocus] = useState<boolean>(false);

  // PIN Security Lock State
  const [pinEnabled, setPinEnabled] = useState<boolean>(false);
  const [pinHash, setPinHash] = useState<string>('');
  const [hasPromptedPinSetup, setHasPromptedPinSetup] = useState<boolean>(false);
  const [autoLockMinutes, setAutoLockMinutes] = useState<number>(0);
  const [isPinUnlocked, setIsPinUnlocked] = useState<boolean>(false);
  const [isPinModalOpen, setIsPinModalOpen] = useState<boolean>(false);
  const [pinModalMode, setPinModalMode] = useState<PinModalMode>('prompt');

  // Theme Management
  const [themeMode, setThemeMode] = useState<'light' | 'dark' | 'system'>(() => {
    const savedMode = localStorage.getItem('reflect_theme_mode');
    if (savedMode === 'light' || savedMode === 'dark' || savedMode === 'system') {
      return savedMode;
    }
    const legacySaved = localStorage.getItem('reflect_theme');
    if (legacySaved === 'light' || legacySaved === 'dark') {
      return legacySaved;
    }
    return 'system';
  });

  const [systemPrefersDark, setSystemPrefersDark] = useState<boolean>(() => {
    return window.matchMedia('(prefers-color-scheme: dark)').matches;
  });

  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const handleChange = (e: MediaQueryListEvent) => {
      setSystemPrefersDark(e.matches);
    };

    if (mediaQuery.addEventListener) {
      mediaQuery.addEventListener('change', handleChange);
    } else {
      mediaQuery.addListener(handleChange);
    }

    return () => {
      if (mediaQuery.removeEventListener) {
        mediaQuery.removeEventListener('change', handleChange);
      } else {
        mediaQuery.removeListener(handleChange);
      }
    };
  }, []);

  const theme: 'light' | 'dark' = themeMode === 'system'
    ? (systemPrefersDark ? 'dark' : 'light')
    : themeMode;

  const [fontPreference, setFontPreference] = useState<'sans' | 'serif' | 'mono'>('sans');

  useEffect(() => {
    const savedFont = localStorage.getItem('reflect_setting_font');
    if (savedFont && ['sans', 'serif', 'mono'].includes(savedFont)) {
      setFontPreference(savedFont as any);
    }
  }, []);

  useEffect(() => {
    const root = document.documentElement;
    if (theme === 'dark') {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
    localStorage.setItem('reflect_theme', theme);
    localStorage.setItem('reflect_theme_mode', themeMode);
  }, [theme, themeMode]);

  const toggleTheme = () => {
    setThemeMode(prev => {
      if (prev === 'system') {
        return theme === 'light' ? 'dark' : 'light';
      }
      return prev === 'light' ? 'dark' : 'light';
    });
  };

  const handleThemeModeChange = (mode: 'light' | 'dark' | 'system') => {
    setThemeMode(mode);
  };

  // Firebase Auth State Listener
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user) {
        isTerminatingAccountRef.current = false;
        if (user.email) {
          localStorage.setItem('reflect_last_user_email', user.email);
        }
        localStorage.setItem('reflect_last_user_id', user.uid);
        sessionStorage.removeItem('reflect_session_timeout');
        localStorage.removeItem('reflect_force_select_account');

        setCurrentUser({
          uid: user.uid,
          email: user.email,
          displayName: user.displayName,
          photoURL: user.photoURL,
        });

        // Initialize local PIN settings
        const localPin = getLocalPinSettings(user.uid);
        setPinEnabled(localPin.pinEnabled);
        setPinHash(localPin.pinHash);
        setHasPromptedPinSetup(localPin.hasPromptedSetup);
        setAutoLockMinutes(localPin.autoLockMinutes || 0);

        // If PIN lock is enabled, user must unlock first
        if (localPin.pinEnabled) {
          setIsPinUnlocked(false);
        } else {
          setIsPinUnlocked(true);
        }
      } else {
        isTerminatingAccountRef.current = false;
        setIsDailyQuoteOpen(false);
        setIsDailyAffirmationOpen(false);
        setCurrentUser(null);
        setPinEnabled(false);
        setPinHash('');
        setHasPromptedPinSetup(false);
        setIsPinUnlocked(false);
      }
      setIsAuthLoading(false);
    });

    return () => unsubscribe();
  }, []);

  // Real-time Firestore Subscriptions for authenticated user
  useEffect(() => {
    if (!currentUser?.uid) {
      setEntries([]);
      setProfileSummary(null);
      setInsights([]);
      setNudges([]);
      setWeeklySummary(null);
      return;
    }

    const uid = currentUser.uid;

    // 1. users/{uid}/entries listener
    const entriesQuery = query(
      collection(db, 'users', uid, 'entries'),
      orderBy('createdAt', 'desc')
    );
    const unsubEntries = onSnapshot(entriesQuery, (snapshot) => {
      const list: JournalEntry[] = [];
      snapshot.forEach((docSnap) => {
        list.push({ id: docSnap.id, ...docSnap.data() } as JournalEntry);
      });
      setEntries(list);
    }, (err) => {
      console.warn('Entries subscription notice:', err.message);
    });

    // 2. users/{uid}/profile/summary listener
    const summaryDocRef = doc(db, 'users', uid, 'profile', 'summary');
    const unsubSummary = onSnapshot(summaryDocRef, async (docSnap) => {
      // Guard: never process or open daily reflections during account deactivation/deletion
      if (isTerminatingAccountRef.current) return;
      if (!auth.currentUser || auth.currentUser.uid !== uid) return;

      const todayStr = new Date().toISOString().split('T')[0];
      const localQuoteKey = `reflect_last_quote_${uid}`;
      const hasShownTodayLocally = localStorage.getItem(localQuoteKey) === todayStr;

      if (docSnap.exists()) {
        const data = docSnap.data();
        if (data.deactivated) {
          try {
            await updateDoc(summaryDocRef, {
              deactivated: false,
              reactivatedAt: new Date().toISOString(),
            });
            console.log('[Account Auto-Reactivated] UID:', uid);
          } catch (rErr) {
            console.warn('Auto-reactivation write notice:', rErr);
          }
        }

        const remoteQuoteShown = data.lastQuoteShownDate === todayStr;
        if (!remoteQuoteShown && !hasShownTodayLocally && !isTerminatingAccountRef.current) {
          localStorage.setItem(localQuoteKey, todayStr);
          setIsDailyQuoteOpen(true);
          try {
            await setDoc(summaryDocRef, { lastQuoteShownDate: todayStr }, { merge: true });
          } catch (qErr) {
            console.warn('Failed to update lastQuoteShownDate:', qErr);
          }
        } else if (remoteQuoteShown && !hasShownTodayLocally) {
          // Sync local storage so subsequent snapshot events don't re-trigger
          localStorage.setItem(localQuoteKey, todayStr);
        }

        setProfileSummary({ id: docSnap.id, ...data } as unknown as ProfileSummary);
      } else {
        // Document does not exist (e.g. purged during account delete, or new user)
        if (isTerminatingAccountRef.current) return;

        if (!hasShownTodayLocally && !isTerminatingAccountRef.current) {
          localStorage.setItem(localQuoteKey, todayStr);
          setIsDailyQuoteOpen(true);
        }
        try {
          await setDoc(summaryDocRef, {
            userId: uid,
            summary: 'New journaling journey started.',
            lastUpdated: new Date().toISOString(),
            keyThemes: [],
            totalEntriesAnalyzed: 0,
            lastQuoteShownDate: todayStr,
          });
        } catch (cErr) {
          console.warn('Failed to initialize profile summary with quote date:', cErr);
        }
      }
    }, (err) => {
      console.warn('Profile summary subscription notice:', err.message);
    });

    // 3. users/{uid}/insights listener
    const insightsQuery = query(
      collection(db, 'users', uid, 'insights'),
      orderBy('generatedAt', 'desc')
    );
    const unsubInsights = onSnapshot(insightsQuery, (snapshot) => {
      const list: InsightReport[] = [];
      snapshot.forEach((docSnap) => {
        if (docSnap.id !== 'weeklySummary') list.push({ id: docSnap.id, ...docSnap.data() } as InsightReport);
      });
      setInsights(list);
    }, (err) => {
      console.warn('Insights subscription notice:', err.message);
    });

    // 4. users/{uid}/nudges listener
    const nudgesQuery = query(
      collection(db, 'users', uid, 'nudges'),
      orderBy('createdAt', 'desc')
    );
    const unsubNudges = onSnapshot(nudgesQuery, (snapshot) => {
      const list: ProactiveNudge[] = [];
      snapshot.forEach((docSnap) => {
        const data = docSnap.data();
        if (!data.dismissed && !data.isDismissed) {
          list.push({ id: docSnap.id, ...data } as ProactiveNudge);
        }
      });
      setNudges(list);
    }, (err) => {
      console.warn('Nudges subscription notice:', err.message);
    });

    // 5. users/{uid}/weeklySummary listener
    const weeklyDocRef = doc(db, 'users', uid, 'insights', 'weeklySummary');
    const unsubWeekly = onSnapshot(weeklyDocRef, (docSnap) => {
      if (docSnap.exists()) {
        setWeeklySummary({ id: docSnap.id, ...docSnap.data() } as WeeklyReflectionReport);
      } else {
        setWeeklySummary(null);
      }
    }, (err) => {
      console.warn('Weekly summary subscription notice:', err.message);
    });

    // 6. users/{uid}/notifications listener
    const unsubNotifications = subscribeToNotifications(uid, (notifs) => {
      setNotifications(notifs);
    });

    // 7. users/{uid}/gratitudeEntries listener
    const unsubGratitude = subscribeToGratitudeEntries(uid, (entries) => {
      setGratitudeEntries(entries);
    });

    // 8. users/{uid}/settings/pin listener
    const pinDocRef = doc(db, 'users', uid, 'settings', 'pin');
    const unsubPin = onSnapshot(pinDocRef, (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data() as PinSettings;
        setPinEnabled(data.pinEnabled);
        setPinHash(data.pinHash || '');
        setHasPromptedPinSetup(data.hasPromptedSetup);
        setAutoLockMinutes(data.autoLockMinutes || 0);

        // Sync local storage for immediate access next login
        try {
          localStorage.setItem(`reflect_pin_enabled_${uid}`, String(data.pinEnabled));
          localStorage.setItem(`reflect_pin_hash_${uid}`, data.pinHash || '');
          localStorage.setItem(`reflect_pin_prompted_${uid}`, String(data.hasPromptedSetup));
          localStorage.setItem(`reflect_pin_autolock_${uid}`, String(data.autoLockMinutes || 0));
        } catch {}

        // Prompt user for setup on first login if pin not enabled and prompt not shown yet
        if (!data.pinEnabled && !data.hasPromptedSetup) {
          setPinModalMode('prompt');
          setIsPinModalOpen(true);
        }
      } else {
        // No PIN config yet -> prompt user for optional PIN setup
        setPinModalMode('prompt');
        setIsPinModalOpen(true);
      }
    }, (err) => {
      console.warn('PIN settings subscription notice:', err.message);
    });

    // 9. users/{uid}/profile/milestones listener
    const unsubMilestones = subscribeToMilestones(uid, (data) => {
      setMilestones(data || {});
      milestonesRef.current = data || {};
    });

    return () => {
      unsubEntries();
      unsubSummary();
      unsubInsights();
      unsubNudges();
      unsubWeekly();
      unsubNotifications();
      unsubGratitude();
      unsubPin();
      unsubMilestones();
    };
  }, [currentUser?.uid]);

  // Inactivity Auto-Lock Timer
  const autoLockTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const resetAutoLockTimer = useCallback(() => {
    if (autoLockTimeoutRef.current) clearTimeout(autoLockTimeoutRef.current);
    if (pinEnabled && isPinUnlocked && autoLockMinutes > 0) {
      autoLockTimeoutRef.current = setTimeout(() => {
        setIsPinUnlocked(false);
      }, autoLockMinutes * 60 * 1000);
    }
  }, [pinEnabled, isPinUnlocked, autoLockMinutes]);

  useEffect(() => {
    const events = ['mousemove', 'mousedown', 'keydown', 'touchstart', 'scroll'];
    const handleActivity = () => resetAutoLockTimer();

    if (pinEnabled && isPinUnlocked && autoLockMinutes > 0) {
      resetAutoLockTimer(); // Initial start
      events.forEach((evt) => window.addEventListener(evt, handleActivity));
    }

    return () => {
      if (autoLockTimeoutRef.current) clearTimeout(autoLockTimeoutRef.current);
      events.forEach((evt) => window.removeEventListener(evt, handleActivity));
    };
  }, [pinEnabled, isPinUnlocked, autoLockMinutes, resetAutoLockTimer]);

  // Mindful Reminders Auto-Trigger
  useEffect(() => {
    if (!currentUser?.uid) return;
    
    const checkReminders = () => {
      const now = new Date();
      const currentHHMM = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;
      const todayDateStr = now.toISOString().split('T')[0];
      
      const evtRefEnabled = localStorage.getItem('reflect_setting_reminder_enabled') === 'true';
      const evtRefTime = localStorage.getItem('reflect_setting_reminder_time') || '20:00';
      
      const gratRefEnabled = localStorage.getItem('reflect_setting_gratitude_reminder_enabled') === 'true';
      const gratRefTime = localStorage.getItem('reflect_setting_gratitude_reminder_time') || '09:00';

      if (evtRefEnabled && currentHHMM === evtRefTime) {
        const lastTrigger = localStorage.getItem(`reflect_last_reminder_${currentUser.uid}`);
        if (lastTrigger !== todayDateStr) {
          localStorage.setItem(`reflect_last_reminder_${currentUser.uid}`, todayDateStr);
          saveNotification(currentUser.uid, {
            id: crypto.randomUUID(),
            userId: currentUser.uid,
            title: 'Evening Reflection',
            message: 'It is time for your evening reflection. Take a moment to clear your mind.',
            type: 'reminder',
            createdAt: new Date().toISOString(),
            isRead: false
          }).catch(console.error);
        }
      }

      if (gratRefEnabled && currentHHMM === gratRefTime) {
        const lastTrigger = localStorage.getItem(`reflect_last_gratitude_${currentUser.uid}`);
        if (lastTrigger !== todayDateStr) {
          localStorage.setItem(`reflect_last_gratitude_${currentUser.uid}`, todayDateStr);
          saveNotification(currentUser.uid, {
            id: crypto.randomUUID(),
            userId: currentUser.uid,
            title: 'Daily Gratitude',
            message: 'Time to log your daily gratitude. What are you thankful for today?',
            type: 'reminder',
            createdAt: new Date().toISOString(),
            isRead: false
          }).catch(console.error);
        }
      }
    };

    // Check immediately on mount/auth
    checkReminders();
    
    // Check every minute
    const interval = setInterval(checkReminders, 60000);
    return () => clearInterval(interval);
  }, [currentUser?.uid]);

  // Milestone Trigger Engine
  const triggerMilestone = useCallback(async (key: MilestoneKey) => {
    if (!currentUser?.uid) return;
    if (milestonesRef.current[key] || pendingMilestonesRef.current.has(key)) {
      return;
    }

    // Immediately mark pending locally so concurrent checks do not re-trigger
    pendingMilestonesRef.current.add(key);

    try {
      await saveMilestone(currentUser.uid, key);
    } catch (err) {
      console.warn('Failed to persist milestone:', err);
    }

    const config = MILESTONES[key];
    if (config) {
      setActiveMilestoneToast((curr) => {
        if (!curr) {
          return { key, message: config.message };
        } else {
          toastQueueRef.current.push({ key, message: config.message });
          return curr;
        }
      });
    }
  }, [currentUser?.uid]);

  const handleDismissMilestoneToast = useCallback(() => {
    setActiveMilestoneToast(null);
    if (toastQueueRef.current.length > 0) {
      const next = toastQueueRef.current.shift()!;
      setTimeout(() => {
        setActiveMilestoneToast(next);
      }, 250);
    }
  }, []);

  const checkStreakMilestones = useCallback((currentEntries: JournalEntry[], currentGratitude: GratitudeEntry[]) => {
    const streak = calculateActiveStreak(currentEntries, currentGratitude);
    if (streak >= 3) {
      triggerMilestone('streak_3');
    }
    if (streak >= 7) {
      triggerMilestone('streak_7');
    }
    if (streak >= 14) {
      triggerMilestone('streak_14');
    }
  }, [triggerMilestone]);

  const handleSaveGratitude = async (entry: GratitudeEntry) => {
    if (!currentUser?.uid) return;
    await saveGratitudeEntry(currentUser.uid, entry);
    triggerMilestone('first_gratitude');
    const updatedGratitude = [entry, ...gratitudeEntries.filter(g => g.id !== entry.id)];
    checkStreakMilestones(entries, updatedGratitude);
  };

  const handleDeleteGratitude = async (entryId: string) => {
    if (!currentUser?.uid) return;
    try {
      await deleteGratitudeEntry(currentUser.uid, entryId);
    } catch (err) {
      console.error('Failed to delete gratitude entry:', err);
    }
  };

  const handleMarkAsRead = async (notificationId: string) => {
    if (!currentUser?.uid) return;
    setNotifications(prev => prev.map(n => n.id === notificationId ? { ...n, isRead: true } : n));
    try {
      await markNotificationAsRead(currentUser.uid, notificationId);
    } catch (err) {
      console.error('Failed to mark notification as read:', err);
    }
  };

  const handleMarkAllAsRead = async () => {
    if (!currentUser?.uid) return;
    setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
    try {
      await markAllNotificationsAsRead(currentUser.uid, notifications);
    } catch (err) {
      console.error('Failed to mark all notifications as read:', err);
    }
  };

  const handleDeleteNotification = async (notificationId: string) => {
    if (!currentUser?.uid) return;
    setNotifications(prev => prev.filter(n => n.id !== notificationId));
    try {
      await deleteNotification(currentUser.uid, notificationId);
    } catch (err) {
      console.error('Failed to delete notification:', err);
    }
  };

  const handleSignOut = async () => {
    try {
      localStorage.setItem('reflect_force_select_account', 'true');
      sessionStorage.removeItem('reflect_session_timeout');
      await signOut(auth);
    } catch (error) {
      console.error('Sign out error:', error);
    }
  };

  const handleDismissNudge = async (nudgeId: string) => {
    if (!currentUser?.uid) return;
    // Optimistically update local state so banner disappears immediately
    setNudges((prev) => prev.filter((n) => n.id !== nudgeId));
    try {
      await dismissNudge(currentUser.uid, nudgeId);
    } catch (err) {
      console.error('Failed to dismiss nudge:', err);
    }
  };

  const handleReflectOnPrompt = (promptText: string, topicTag: string) => {
    setPrefillPrompt({ prompt: promptText, tag: topicTag });
    setActiveTab('journal');
  };

  const handleTriggerProactiveNudge = async () => {
    if (!currentUser?.uid) return;
    try {
      const res = await requestAgenticNudge({
        profileSummary,
        recentEntries: entries,
      });

      const newNudge: ProactiveNudge = {
        id: 'nudge_' + Date.now(),
        userId: currentUser.uid,
        ...res.nudge,
      };

      await saveNudge(currentUser.uid, newNudge);
    } catch (err) {
      console.error('Trigger nudge error:', err);
    }
  };

  // PIN Lock Handlers
  const handleSavePinFromModal = async (
    newHash: string,
    reason?: 'initial_setup' | 'routine_90_day_rotation' | 'manual_rotation' | 'reset_recovery' | 'policy_enforcement'
  ) => {
    if (!currentUser?.uid) return;
    const inferredReason = reason || (pinModalMode === 'rotate' ? 'routine_90_day_rotation' : pinModalMode === 'create' ? 'initial_setup' : 'manual_rotation');
    await savePinSettings(currentUser.uid, {
      pinEnabled: true,
      pinHash: newHash,
      hasPromptedSetup: true,
      lastRotatedAt: new Date().toISOString(),
    }, inferredReason);
    setPinEnabled(true);
    setPinHash(newHash);
    setHasPromptedPinSetup(true);
    setIsPinUnlocked(true);
    setIsPinModalOpen(false);
  };

  const handleDisablePinFromModal = async () => {
    if (!currentUser?.uid) return;
    await savePinSettings(currentUser.uid, {
      pinEnabled: false,
      pinHash: '',
      hasPromptedSetup: true,
    });
    setPinEnabled(false);
    setPinHash('');
    setHasPromptedPinSetup(true);
    setIsPinUnlocked(true);
    setIsPinModalOpen(false);
  };

  const handleSkipPinPrompt = async () => {
    if (!currentUser?.uid) return;
    await savePinSettings(currentUser.uid, {
      hasPromptedSetup: true,
    });
    setHasPromptedPinSetup(true);
    setIsPinModalOpen(false);
  };

  const handleLockAppNow = () => {
    if (pinEnabled) {
      setIsPinUnlocked(false);
    }
  };

  if (isAuthLoading) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex items-center justify-center text-slate-600 font-sans text-xs relative">
        <BackgroundPattern />
        <div className="flex flex-col items-center gap-3 relative z-10">
          <div className="w-16 h-16 animate-spark-glimmer flex items-center justify-center">
            <img src="/reflect_logo.png" alt="Loading" className="w-full h-full object-contain dark:invert opacity-80" />
          </div>
          <div className="flex items-center gap-1.5 text-slate-600 dark:text-slate-300 font-medium">
            <Sparkles className="w-3.5 h-3.5 text-indigo-600 animate-spark-glimmer" />
            <span>Loading Reflect...</span>
          </div>
        </div>
      </div>
    );
  }

  if (!currentUser) {
    return <AuthLanding onSignedIn={() => {}} />;
  }

  // Active PIN Lock Screen Gatekeeper
  if (pinEnabled && !isPinUnlocked) {
    return (
      <PinLockScreen
        user={currentUser}
        storedPinHash={pinHash}
        onUnlockSuccess={() => setIsPinUnlocked(true)}
        onResetPinSuccess={() => {
          setIsPinUnlocked(true);
          setPinEnabled(false);
          setPinHash('');
        }}
      />
    );
  }

  const activeNudge = nudges.length > 0 ? nudges[0] : null;

  const fontClass = fontPreference === 'serif' ? 'font-serif' : fontPreference === 'mono' ? 'font-mono' : 'font-sans';

  const isFocusActive = isDeepFocus && activeTab === 'journal';

  return (
    <div className={`min-h-screen text-slate-800 dark:text-slate-100 flex flex-col selection:bg-indigo-500/20 selection:text-indigo-900 dark:selection:text-indigo-200 transition-colors duration-300 ${fontClass} relative`}>
      {/* Mindful Ambient Sky & Cloud Background */}
      <BackgroundPattern isDeepFocus={isFocusActive} />
      
      <div className="relative z-10 flex flex-col min-h-screen">
        {/* Top Navigation (Subtly hidden during Deep Focus) */}
        <div className={`transition-all duration-300 ${isFocusActive ? 'opacity-0 -translate-y-4 pointer-events-none h-0 overflow-hidden' : 'opacity-100 translate-y-0'}`}>
          <Navbar
            user={currentUser}
            activeTab={activeTab}
            setActiveTab={(tab) => {
              if (tab !== 'journal') setIsDeepFocus(false);
              setActiveTab(tab);
            }}
            theme={theme}
            onToggleTheme={toggleTheme}
            onOpenMemory={() => setIsMemoryOpen(true)}
            onOpenSecurity={() => setIsSecurityOpen(true)}
            onOpenDeactivateModal={openDeactivateModal}
            onOpenDeleteModal={openDeleteModal}
            onSignOut={handleSignOut}
            pinEnabled={pinEnabled}
            onLockApp={handleLockAppNow}
          />
        </div>

      {/* Proactive Check-in Nudge Banner (Hidden in Deep Focus) */}
      {!isFocusActive && (
        <NudgeBanner
          nudge={activeNudge}
          onDismiss={handleDismissNudge}
          onReflectOnNudge={handleReflectOnPrompt}
          onTriggerNewNudge={handleTriggerProactiveNudge}
        />
      )}

      {/* Main Content Area with Framer Motion Page Transitions */}
      <main className={`flex-1 max-w-5xl w-full mx-auto px-3 sm:px-6 pb-24 md:pb-10 transition-all duration-300 ${
        isFocusActive ? 'py-3 sm:py-6 space-y-3 sm:space-y-4' : 'py-3.5 sm:py-10 space-y-4 sm:space-y-10'
      }`}>
        <AnimatePresence mode="wait" initial={false}>
          {activeTab === 'journal' && (
            <motion.div
              key="journal"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.22, ease: [0.25, 1, 0.5, 1] }}
              className="w-full"
            >
              <JournalChat
                user={currentUser}
                userId={currentUser.uid}
                profileSummary={profileSummary}
                recentEntries={entries}
                onEntrySaved={(savedEntry) => {
                  triggerMilestone('first_entry');
                  const updatedEntries = [savedEntry, ...entries.filter(e => e.id !== savedEntry.id)];
                  checkStreakMilestones(updatedEntries, gratitudeEntries);
                }}
                prefillPrompt={prefillPrompt}
                onClearPrefill={() => setPrefillPrompt(null)}
                existingEntry={existingEntry}
                onClearExistingEntry={() => setExistingEntry(null)}
                activeNudge={activeNudge}
                isDeepFocus={isFocusActive}
                onToggleDeepFocus={() => setIsDeepFocus(prev => !prev)}
              />
            </motion.div>
          )}

          {activeTab === 'history' && (
            <motion.div
              key="history"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.22, ease: [0.25, 1, 0.5, 1] }}
              className="w-full"
            >
              <EntryHistory
                userId={currentUser.uid}
                entries={entries}
                targetEntryId={targetEntryId}
                onClearTargetEntry={() => setTargetEntryId(null)}
                onStartWriting={() => setActiveTab('journal')}
                onSelectEntryForReflection={(entry) => {
                  setPrefillPrompt({
                    prompt: `Continuing reflection on "${entry.title}": `,
                    tag: entry.tags?.[0] || 'reflection',
                  });
                  setActiveTab('journal');
                }}
                onContinueEntry={(entry) => {
                  setExistingEntry(entry);
                  setActiveTab('journal');
                }}
              />
            </motion.div>
          )}

          {activeTab === 'insights' && (
            <motion.div
              key="insights"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.22, ease: [0.25, 1, 0.5, 1] }}
              className="w-full space-y-10"
            >
              {/* Weekly Reflection Summary */}
              <WeeklyReflectionCard
                userId={currentUser.uid}
                entries={entries}
                profileSummary={profileSummary}
                cachedWeeklySummary={weeklySummary}
                onStartEntry={() => setActiveTab('journal')}
                onReflectOnPrompt={(prompt, tag) => {
                  handleReflectOnPrompt(prompt, tag);
                }}
                onWeeklySummaryGenerated={() => {
                  triggerMilestone('first_weekly_recap');
                }}
              />

              {/* 30-Day Sentiment Trend Line Chart (Recharts) */}
              <SentimentTrendChart
                entries={entries}
                onNavigateToEntry={(entryId) => {
                  setTargetEntryId(entryId);
                  setActiveTab('history');
                }}
                onStartWriting={() => setActiveTab('journal')}
              />

              {/* Pattern & Themes Analysis Panel */}
              <InsightsPanel
                userId={currentUser.uid}
                entries={entries}
                profileSummary={profileSummary}
                insightsHistory={insights}
                onReflectOnSuggestion={(prompt, tag) => {
                  handleReflectOnPrompt(prompt, tag);
                }}
                onNavigateToEntry={(entryId) => {
                  setTargetEntryId(entryId);
                  setActiveTab('history');
                }}
                onInsightGenerated={() => {
                  triggerMilestone('first_insights');
                }}
              />
            </motion.div>
          )}

          {activeTab === 'gratitude' && (
            <motion.div
              key="gratitude"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.22, ease: [0.25, 1, 0.5, 1] }}
              className="w-full"
            >
              <GratitudeModule
                userId={currentUser.uid}
                gratitudeEntries={gratitudeEntries}
                onSaveGratitude={handleSaveGratitude}
                onDeleteGratitude={handleDeleteGratitude}
              />
            </motion.div>
          )}

          {activeTab === 'settings' && (
            <motion.div
              key="settings"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.22, ease: [0.25, 1, 0.5, 1] }}
              className="w-full"
            >
              <SettingsPage
                user={currentUser}
                entries={entries}
                gratitudeEntries={gratitudeEntries}
                profileSummary={profileSummary}
                theme={theme}
                themeMode={themeMode}
                onThemeModeChange={handleThemeModeChange}
                pinEnabled={pinEnabled}
                autoLockMinutes={autoLockMinutes}
                onOpenPinSetup={() => {
                  setPinModalMode('create');
                  setIsPinModalOpen(true);
                }}
                onOpenPinChange={() => {
                  setPinModalMode('change');
                  setIsPinModalOpen(true);
                }}
                onOpenPinRotate={() => {
                  setPinModalMode('rotate');
                  setIsPinModalOpen(true);
                }}
                onOpenPinDisable={() => {
                  setPinModalMode('disable');
                  setIsPinModalOpen(true);
                }}
                onChangeAutoLock={async (mins) => {
                  setAutoLockMinutes(mins);
                  await savePinSettings(currentUser.uid, { autoLockMinutes: mins });
                }}
                onToggleTheme={toggleTheme}
                onOpenMemory={() => setIsMemoryOpen(true)}
                onOpenSecurity={() => setIsSecurityOpen(true)}
                onOpenDeactivateModal={openDeactivateModal}
                onOpenDeleteModal={openDeleteModal}
                onUpdateDisplayName={(newName) => {
                  setCurrentUser(prev => prev ? { ...prev, displayName: newName } : null);
                }}
                onFontChange={(font) => setFontPreference(font as any)}
              />
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      {/* Footer */}
      <footer className={`border-t border-slate-200/60 dark:border-slate-800/80 bg-white/50 dark:bg-slate-900/50 px-4 sm:px-6 py-4 pb-20 md:pb-4 text-xs text-slate-600 dark:text-slate-300 mt-auto transition-all duration-300 ${
        isFocusActive ? 'opacity-0 pointer-events-none h-0 overflow-hidden py-0 border-transparent' : 'opacity-100'
      }`}>
        <div className="max-w-5xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <span className="font-serif font-bold text-slate-700 dark:text-slate-200">Reflect</span>
            <span>—</span>
            <span className="text-slate-600 dark:text-slate-300">Mindful journaling with persistent context memory</span>
          </div>

          <div className="flex items-center gap-4 text-slate-600 dark:text-slate-300">
            <button
              onClick={() => setIsSecurityOpen(true)}
              className="hover:text-indigo-600 dark:hover:text-indigo-600 transition-colors cursor-pointer"
            >
              Security & Transparency
            </button>
            <span>•</span>
            <button
              onClick={() => setIsMemoryOpen(true)}
              className="hover:text-indigo-600 dark:hover:text-indigo-600 transition-colors cursor-pointer"
            >
              Memory Summary
            </button>
          </div>
        </div>
      </footer>

      {/* Memory Layer Inspector Modal */}
      <ProfileSummaryModal
        isOpen={isMemoryOpen}
        onClose={() => setIsMemoryOpen(false)}
        userId={currentUser.uid}
        profileSummary={profileSummary}
      />

      {/* Security Architecture & Threat Model Modal */}
      <SecurityReviewModal
        isOpen={isSecurityOpen}
        onClose={() => setIsSecurityOpen(false)}
      />

      {/* Deactivate Account Confirmation Modal */}
      <AnimatePresence>
      {isDeactivateModalOpen && (
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.25 }}
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 dark:bg-black/70 backdrop-blur-md"
          role="dialog"
          aria-modal="true"
          aria-labelledby="deactivate-modal-title"
          aria-describedby="deactivate-modal-desc"
        >
          <motion.div 
            initial={{ opacity: 0, scale: 0.95, y: 12 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 12 }}
            transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
            className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-2xl rounded-3xl border border-white/80 dark:border-white/10 shadow-2xl max-w-md w-full p-6 space-y-5 text-slate-800 dark:text-slate-100"
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-amber-100/80 dark:bg-amber-950/60 border border-amber-200/80 dark:border-amber-800/80 flex items-center justify-center text-amber-600 dark:text-amber-300 shadow-2xs" aria-hidden="true">
                <UserX className="w-5 h-5" />
              </div>
              <div>
                <h3 id="deactivate-modal-title" className="font-serif text-lg font-bold">Deactivate Account</h3>
                <p className="text-xs text-slate-600 dark:text-slate-300">Preserve all data with temporary sign-out</p>
              </div>
            </div>

            <p id="deactivate-modal-desc" className="text-sm text-slate-700 dark:text-slate-200 leading-relaxed">
              Your account will be temporarily deactivated, and you will be signed out. All your journal entries, AI memory summaries, insights, and nudges will be securely preserved. You can return and reactivate your account anytime simply by signing back in.
            </p>

            {accountActionError && (
              <div className="p-3 rounded-xl bg-rose-50/80 dark:bg-rose-950/50 border border-rose-200/80 dark:border-rose-900/50 text-rose-700 dark:text-rose-300 text-xs">
                {accountActionError}
              </div>
            )}

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => {
                  setIsDeactivateModalOpen(false);
                  setAccountActionError(null);
                }}
                disabled={accountActionLoading}
                className="px-4 py-2 rounded-xl text-xs font-medium text-slate-700 dark:text-slate-200 hover:bg-white/60 dark:hover:bg-slate-800/60 border border-white/80 dark:border-white/10 transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDeactivateAccount}
                disabled={accountActionLoading}
                className="px-4 py-2 rounded-xl text-xs font-semibold bg-amber-600 hover:bg-amber-700 text-white shadow-md shadow-amber-600/20 transition-colors flex items-center gap-2 cursor-pointer disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500"
              >
                {accountActionLoading ? 'Deactivating...' : 'Deactivate Account'}
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
      </AnimatePresence>

      {/* Delete Account Permanently Modal */}
      <AnimatePresence>
      {isDeleteModalOpen && (
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.25 }}
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 dark:bg-black/70 backdrop-blur-md"
          role="dialog"
          aria-modal="true"
          aria-labelledby="delete-account-modal-title"
          aria-describedby="delete-account-modal-desc"
        >
          <motion.div 
            initial={{ opacity: 0, scale: 0.95, y: 12 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 12 }}
            transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
            className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-2xl rounded-3xl border border-rose-200/80 dark:border-rose-900/50 shadow-2xl max-w-md w-full p-6 space-y-5 text-slate-800 dark:text-slate-100"
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-rose-100/80 dark:bg-rose-950/60 border border-rose-200/80 dark:border-rose-900/60 flex items-center justify-center text-rose-600 dark:text-rose-300 shadow-2xs" aria-hidden="true">
                <Trash2 className="w-5 h-5" />
              </div>
              <div>
                <h3 id="delete-account-modal-title" className="font-serif text-lg font-bold text-rose-600 dark:text-rose-300">Delete Account Permanently</h3>
                <p className="text-xs text-slate-600 dark:text-slate-300">This action is irreversible</p>
              </div>
            </div>

            <p id="delete-account-modal-desc" className="text-sm text-slate-700 dark:text-slate-200 leading-relaxed">
              Warning: All your journal entries, AI memory summaries, insights, nudges, and account authentication records will be <strong>permanently purged</strong> from the database immediately. You will not be able to recover this data.
            </p>

            <div className="space-y-1.5">
              <label htmlFor="input-delete-confirm-text" className="block text-xs font-medium text-slate-700 dark:text-slate-200">
                To confirm, please type <span className="font-mono font-bold text-rose-600 dark:text-rose-300">DELETE</span> below:
              </label>
              <input
                id="input-delete-confirm-text"
                type="text"
                value={deleteConfirmText}
                onChange={(e) => setDeleteConfirmText(e.target.value)}
                placeholder="Type DELETE"
                className="w-full px-3.5 py-2.5 rounded-xl border border-white/80 dark:border-white/10 bg-white/60 dark:bg-slate-800/60 text-slate-900 dark:text-slate-100 text-sm focus:outline-none focus:ring-2 focus:ring-rose-500"
              />
            </div>

            {accountActionError && (
              <div className="p-3 rounded-xl bg-rose-50/80 dark:bg-rose-950/50 border border-rose-200/80 dark:border-rose-900/50 text-rose-700 dark:text-rose-300 text-xs">
                {accountActionError}
              </div>
            )}

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => {
                  setIsDeleteModalOpen(false);
                  setDeleteConfirmText('');
                  setAccountActionError(null);
                }}
                disabled={accountActionLoading}
                className="px-4 py-2 rounded-xl text-xs font-medium text-slate-700 dark:text-slate-200 hover:bg-white/60 dark:hover:bg-slate-800/60 border border-white/80 dark:border-white/10 transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-500"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDeleteAccount}
                disabled={accountActionLoading || deleteConfirmText !== 'DELETE'}
                className="px-4 py-2 rounded-xl text-xs font-semibold bg-rose-600 hover:bg-rose-700 text-white transition-colors flex items-center gap-2 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed shadow-md shadow-rose-600/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-500"
              >
                {accountActionLoading ? 'Deleting...' : 'Delete Permanently'}
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
      </AnimatePresence>

      {/* Daily Quote Modal */}
      <DailyQuoteModal
        isOpen={
          isDailyQuoteOpen &&
          !isDeleteModalOpen &&
          !isDeactivateModalOpen &&
          !accountActionLoading &&
          !isTerminatingAccountRef.current
        }
        onClose={() => {
          setIsDailyQuoteOpen(false);
          if (
            !isTerminatingAccountRef.current &&
            !isDeleteModalOpen &&
            !isDeactivateModalOpen &&
            !accountActionLoading
          ) {
            setIsDailyAffirmationOpen(true);
          }
        }}
      />

      {/* Daily Affirmation Modal */}
      <DailyAffirmationModal
        isOpen={
          isDailyAffirmationOpen &&
          !isDeleteModalOpen &&
          !isDeactivateModalOpen &&
          !accountActionLoading &&
          !isTerminatingAccountRef.current
        }
        onClose={() => setIsDailyAffirmationOpen(false)}
        entries={entries}
        profileSummary={profileSummary}
        onUseAsPrompt={(promptText, topicTag) => {
          handleReflectOnPrompt(promptText, topicTag);
          setIsDailyAffirmationOpen(false);
        }}
      />

      {/* PIN Security Setup / Management Modal */}
      <PinSetupModal
        isOpen={isPinModalOpen}
        initialMode={pinModalMode}
        storedPinHash={pinHash}
        onClose={() => setIsPinModalOpen(false)}
        onSavePin={handleSavePinFromModal}
        onDisablePin={handleDisablePinFromModal}
        onSkipPrompt={handleSkipPinPrompt}
      />

      {/* Milestone Achievement Toast */}
      <MilestoneToast
        toast={activeMilestoneToast}
        onDismiss={handleDismissMilestoneToast}
      />

      </div>
    </div>
  );
}
