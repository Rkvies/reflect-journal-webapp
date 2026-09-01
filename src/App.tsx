import React, { useState, useEffect, useRef, useCallback } from 'react';
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
import { WeeklyReflectionCard } from './components/WeeklyReflectionCard';
import { GratitudeModule } from './components/GratitudeModule';
import { MilestoneToast, MilestoneToastData } from './components/MilestoneToast';
import { ProfileSummaryModal } from './components/ProfileSummaryModal';
import { SecurityReviewModal } from './components/SecurityReviewModal';
import { DailyQuoteModal } from './components/DailyQuoteModal';
import { SettingsPage } from './components/SettingsPage';
import { AuthLanding } from './components/AuthLanding';
import { PinLockScreen } from './components/PinLockScreen';
import { PinSetupModal, PinModalMode } from './components/PinSetupModal';
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
  subscribeToMilestones
} from './lib/firebase';
import { UserX, Trash2, Sparkles } from 'lucide-react';

export default function App() {
  const [currentUser, setCurrentUser] = useState<AppUser | null>(null);
  const [isAuthLoading, setIsAuthLoading] = useState(true);
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

  // Account Management Modals
  const [isDeactivateModalOpen, setIsDeactivateModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState('');
  const [accountActionLoading, setAccountActionLoading] = useState(false);
  const [accountActionError, setAccountActionError] = useState<string | null>(null);

  const handleDeactivateAccount = async () => {
    if (!auth.currentUser) return;
    setAccountActionLoading(true);
    setAccountActionError(null);
    try {
      const token = await auth.currentUser.getIdToken(true);
      await deactivateAccount(token);
      await signOut(auth);
      setIsDeactivateModalOpen(false);
    } catch (err: any) {
      setAccountActionError(err.message || 'Deactivation failed.');
    } finally {
      setAccountActionLoading(false);
    }
  };

  const handleDeleteAccount = async () => {
    if (!auth.currentUser) return;
    setAccountActionLoading(true);
    setAccountActionError(null);
    try {
      const token = await auth.currentUser.getIdToken(true);
      await deleteAccount(token);
      await signOut(auth);
      setIsDeleteModalOpen(false);
    } catch (err: any) {
      setAccountActionError(err.message || 'Account deletion failed.');
    } finally {
      setAccountActionLoading(false);
    }
  };

  // Cross-component triggers
  const [prefillPrompt, setPrefillPrompt] = useState<{ prompt: string; tag: string } | null>(null);
  const [targetEntryId, setTargetEntryId] = useState<string | null>(null);

  // PIN Security Lock State
  const [pinEnabled, setPinEnabled] = useState<boolean>(false);
  const [pinHash, setPinHash] = useState<string>('');
  const [hasPromptedPinSetup, setHasPromptedPinSetup] = useState<boolean>(false);
  const [autoLockMinutes, setAutoLockMinutes] = useState<number>(0);
  const [isPinUnlocked, setIsPinUnlocked] = useState<boolean>(false);
  const [isPinModalOpen, setIsPinModalOpen] = useState<boolean>(false);
  const [pinModalMode, setPinModalMode] = useState<PinModalMode>('prompt');

  // Theme Management
  const [theme, setTheme] = useState<'light' | 'dark'>(() => {
    const saved = localStorage.getItem('reflect_theme');
    if (saved === 'dark' || saved === 'light') return saved;
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  });

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
  }, [theme]);

  const toggleTheme = () => {
    setTheme(prev => (prev === 'light' ? 'dark' : 'light'));
  };

  // Firebase Auth State Listener
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user) {
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
      const todayStr = new Date().toISOString().split('T')[0];
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
        if (!data.lastQuoteShownDate || data.lastQuoteShownDate !== todayStr) {
          setIsDailyQuoteOpen(true);
          try {
            await setDoc(summaryDocRef, { lastQuoteShownDate: todayStr }, { merge: true });
          } catch (qErr) {
            console.warn('Failed to update lastQuoteShownDate:', qErr);
          }
        }
        setProfileSummary({ id: docSnap.id, ...data } as unknown as ProfileSummary);
      } else {
        setIsDailyQuoteOpen(true);
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
      <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex items-center justify-center text-slate-500 font-sans text-xs">
        <div className="flex flex-col items-center gap-3">
          <div className="w-16 h-16 animate-spark-glimmer flex items-center justify-center">
            <img src="/reflect_logo.png" alt="Loading" className="w-full h-full object-contain dark:invert opacity-80" />
          </div>
          <div className="flex items-center gap-1.5 text-slate-500 dark:text-slate-400 font-medium">
            <Sparkles className="w-3.5 h-3.5 text-indigo-500 animate-spark-glimmer" />
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

  return (
    <div className={`min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-800 dark:text-slate-100 flex flex-col selection:bg-indigo-500/20 selection:text-indigo-900 dark:selection:text-indigo-200 transition-colors duration-200 ${fontClass}`}>
      
      {/* Top Navigation */}
      <Navbar
        user={currentUser}
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        theme={theme}
        onToggleTheme={toggleTheme}
        onOpenMemory={() => setIsMemoryOpen(true)}
        onOpenSecurity={() => setIsSecurityOpen(true)}
        onOpenDeactivateModal={() => setIsDeactivateModalOpen(true)}
        onOpenDeleteModal={() => setIsDeleteModalOpen(true)}
        onSignOut={handleSignOut}
        notifications={notifications}
        onMarkAsRead={handleMarkAsRead}
        onMarkAllAsRead={handleMarkAllAsRead}
        onDeleteNotification={handleDeleteNotification}
        pinEnabled={pinEnabled}
        onLockApp={handleLockAppNow}
      />

      {/* Proactive Check-in Nudge Banner */}
      <NudgeBanner
        nudge={activeNudge}
        onDismiss={handleDismissNudge}
        onReflectOnNudge={handleReflectOnPrompt}
        onTriggerNewNudge={handleTriggerProactiveNudge}
      />

      {/* Main Content Area */}
      <main className="flex-1 max-w-5xl w-full mx-auto px-4 sm:px-6 py-6 sm:py-10 pb-24 md:pb-10 space-y-8 sm:space-y-10">
        
        <div className={activeTab === 'journal' ? 'block' : 'hidden'}>
          <JournalChat
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
            activeNudge={activeNudge}
          />
        </div>

        {activeTab === 'history' && (
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
          />
        )}

        {activeTab === 'insights' && (
          <div className="space-y-10">
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
          </div>
        )}

        {activeTab === 'gratitude' && (
          <GratitudeModule
            userId={currentUser.uid}
            gratitudeEntries={gratitudeEntries}
            onSaveGratitude={handleSaveGratitude}
            onDeleteGratitude={handleDeleteGratitude}
          />
        )}

        {activeTab === 'settings' && (
          <SettingsPage
            user={currentUser}
            entries={entries}
            gratitudeEntries={gratitudeEntries}
            profileSummary={profileSummary}
            theme={theme}
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
            onOpenDeactivateModal={() => setIsDeactivateModalOpen(true)}
            onOpenDeleteModal={() => setIsDeleteModalOpen(true)}
            onUpdateDisplayName={(newName) => {
              setCurrentUser(prev => prev ? { ...prev, displayName: newName } : null);
            }}
            onFontChange={(font) => setFontPreference(font as any)}
          />
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-200/60 dark:border-slate-800/80 bg-white/50 dark:bg-slate-900/50 px-4 sm:px-6 py-4 pb-20 md:pb-4 text-xs text-slate-500 dark:text-slate-400 mt-auto transition-colors">
        <div className="max-w-5xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <span className="font-serif font-bold text-slate-700 dark:text-slate-300">Reflect</span>
            <span>—</span>
            <span className="text-slate-500 dark:text-slate-400">Mindful journaling with persistent context memory</span>
          </div>

          <div className="flex items-center gap-4 text-slate-500 dark:text-slate-400">
            <button
              onClick={() => setIsSecurityOpen(true)}
              className="hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors cursor-pointer"
            >
              Security & Transparency
            </button>
            <span>•</span>
            <button
              onClick={() => setIsMemoryOpen(true)}
              className="hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors cursor-pointer"
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
      {isDeactivateModalOpen && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in"
          role="dialog"
          aria-modal="true"
          aria-labelledby="deactivate-modal-title"
          aria-describedby="deactivate-modal-desc"
        >
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xl max-w-md w-full p-6 space-y-5 text-slate-800 dark:text-slate-100">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-amber-100 dark:bg-amber-950/60 flex items-center justify-center text-amber-600 dark:text-amber-400" aria-hidden="true">
                <UserX className="w-5 h-5" />
              </div>
              <div>
                <h3 id="deactivate-modal-title" className="font-serif text-lg font-bold">Deactivate Account</h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">Preserve all data with temporary sign-out</p>
              </div>
            </div>

            <p id="deactivate-modal-desc" className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
              Your account will be temporarily deactivated, and you will be signed out. All your journal entries, AI memory summaries, insights, and nudges will be securely preserved. You can return and reactivate your account anytime simply by signing back in.
            </p>

            {accountActionError && (
              <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/50 text-rose-700 dark:text-rose-300 text-xs">
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
                className="px-4 py-2 rounded-xl text-xs font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDeactivateAccount}
                disabled={accountActionLoading}
                className="px-4 py-2 rounded-xl text-xs font-semibold bg-amber-600 hover:bg-amber-700 text-white transition-colors flex items-center gap-2 cursor-pointer disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500"
              >
                {accountActionLoading ? 'Deactivating...' : 'Deactivate Account'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Account Permanently Modal */}
      {isDeleteModalOpen && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in"
          role="dialog"
          aria-modal="true"
          aria-labelledby="delete-account-modal-title"
          aria-describedby="delete-account-modal-desc"
        >
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-rose-200 dark:border-rose-900/50 shadow-2xl max-w-md w-full p-6 space-y-5 text-slate-800 dark:text-slate-100">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-rose-100 dark:bg-rose-950/60 flex items-center justify-center text-rose-600 dark:text-rose-400" aria-hidden="true">
                <Trash2 className="w-5 h-5" />
              </div>
              <div>
                <h3 id="delete-account-modal-title" className="font-serif text-lg font-bold text-rose-600 dark:text-rose-400">Delete Account Permanently</h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">This action is irreversible</p>
              </div>
            </div>

            <p id="delete-account-modal-desc" className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
              Warning: All your journal entries, AI memory summaries, insights, nudges, and account authentication records will be <strong>permanently purged</strong> from the database immediately. You will not be able to recover this data.
            </p>

            <div className="space-y-1.5">
              <label htmlFor="input-delete-confirm-text" className="block text-xs font-medium text-slate-700 dark:text-slate-300">
                To confirm, please type <span className="font-mono font-bold text-rose-600 dark:text-rose-400">DELETE</span> below:
              </label>
              <input
                id="input-delete-confirm-text"
                type="text"
                value={deleteConfirmText}
                onChange={(e) => setDeleteConfirmText(e.target.value)}
                placeholder="Type DELETE"
                className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100 text-sm focus:outline-none focus:ring-2 focus:ring-rose-500"
              />
            </div>

            {accountActionError && (
              <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/50 text-rose-700 dark:text-rose-300 text-xs">
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
                className="px-4 py-2 rounded-xl text-xs font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-500"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDeleteAccount}
                disabled={accountActionLoading || deleteConfirmText !== 'DELETE'}
                className="px-4 py-2 rounded-xl text-xs font-semibold bg-rose-600 hover:bg-rose-700 text-white transition-colors flex items-center gap-2 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-500"
              >
                {accountActionLoading ? 'Deleting...' : 'Delete Permanently'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Daily Quote Modal */}
      <DailyQuoteModal
        isOpen={isDailyQuoteOpen}
        onClose={() => setIsDailyQuoteOpen(false)}
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
  );
}
