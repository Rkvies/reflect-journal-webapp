import React, { useState, useEffect } from 'react';
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
  WeeklyReflectionReport 
} from './types';
import { Navbar } from './components/Navbar';
import { NudgeBanner } from './components/NudgeBanner';
import { JournalChat } from './components/JournalChat';
import { EntryHistory } from './components/EntryHistory';
import { InsightsPanel } from './components/InsightsPanel';
import { WeeklyReflectionCard } from './components/WeeklyReflectionCard';
import { ProfileSummaryModal } from './components/ProfileSummaryModal';
import { SecurityReviewModal } from './components/SecurityReviewModal';
import { DailyQuoteModal } from './components/DailyQuoteModal';
import { AuthLanding } from './components/AuthLanding';
import { requestAgenticNudge, deactivateAccount, deleteAccount } from './lib/api';
import { saveNudge, dismissNudge } from './lib/firebase';
import { UserX, Trash2 } from 'lucide-react';

export default function App() {
  const [currentUser, setCurrentUser] = useState<AppUser | null>(null);
  const [isAuthLoading, setIsAuthLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'journal' | 'history' | 'insights'>('journal');
  
  // Data State
  const [entries, setEntries] = useState<JournalEntry[]>([]);
  const [profileSummary, setProfileSummary] = useState<ProfileSummary | null>(null);
  const [insights, setInsights] = useState<InsightReport[]>([]);
  const [nudges, setNudges] = useState<ProactiveNudge[]>([]);
  const [weeklySummary, setWeeklySummary] = useState<WeeklyReflectionReport | null>(null);

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

  // Theme Management
  const [theme, setTheme] = useState<'light' | 'dark'>(() => {
    const saved = localStorage.getItem('reflect_theme');
    if (saved === 'dark' || saved === 'light') return saved;
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  });

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
      } else {
        setCurrentUser(null);
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

    return () => {
      unsubEntries();
      unsubSummary();
      unsubInsights();
      unsubNudges();
      unsubWeekly();
    };
  }, [currentUser?.uid]);

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

  if (isAuthLoading) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex items-center justify-center text-slate-500 font-sans text-xs">
        <div className="flex flex-col items-center gap-3">
          <div className="w-9 h-9 rounded-2xl bg-indigo-600/10 border border-indigo-500/20 animate-pulse flex items-center justify-center text-indigo-600 font-serif text-base font-bold">
            R
          </div>
          <span className="text-slate-500 dark:text-slate-400 font-medium">Loading Reflect...</span>
        </div>
      </div>
    );
  }

  if (!currentUser) {
    return <AuthLanding onSignedIn={() => {}} />;
  }

  const activeNudge = nudges.length > 0 ? nudges[0] : null;

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-800 dark:text-slate-100 flex flex-col selection:bg-indigo-500/20 selection:text-indigo-900 dark:selection:text-indigo-200 transition-colors duration-200">
      
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
      />

      {/* Proactive Check-in Nudge Banner */}
      <NudgeBanner
        nudge={activeNudge}
        onDismiss={handleDismissNudge}
        onReflectOnNudge={handleReflectOnPrompt}
        onTriggerNewNudge={handleTriggerProactiveNudge}
      />

      {/* Main Content Area */}
      <main className="flex-1 max-w-5xl w-full mx-auto px-4 sm:px-6 py-8 sm:py-10 space-y-10">
        
        {activeTab === 'journal' && (
          <JournalChat
            userId={currentUser.uid}
            profileSummary={profileSummary}
            recentEntries={entries}
            onEntrySaved={(_savedEntry) => {
              // Real-time listener automatically updates list
            }}
            prefillPrompt={prefillPrompt}
            onClearPrefill={() => setPrefillPrompt(null)}
            activeNudge={activeNudge}
          />
        )}

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
            />
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-200/60 dark:border-slate-800/80 bg-white/50 dark:bg-slate-900/50 px-4 sm:px-6 py-4 text-xs text-slate-500 dark:text-slate-400 mt-auto transition-colors">
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
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in">
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xl max-w-md w-full p-6 space-y-5 text-slate-800 dark:text-slate-100">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-amber-100 dark:bg-amber-950/60 flex items-center justify-center text-amber-600 dark:text-amber-400">
                <UserX className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-serif text-lg font-bold">Deactivate Account</h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">Preserve all data with temporary sign-out</p>
              </div>
            </div>

            <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
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
                className="px-4 py-2 rounded-xl text-xs font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDeactivateAccount}
                disabled={accountActionLoading}
                className="px-4 py-2 rounded-xl text-xs font-semibold bg-amber-600 hover:bg-amber-700 text-white transition-colors flex items-center gap-2 cursor-pointer disabled:opacity-50"
              >
                {accountActionLoading ? 'Deactivating...' : 'Deactivate Account'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Account Permanently Modal */}
      {isDeleteModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in">
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-rose-200 dark:border-rose-900/50 shadow-2xl max-w-md w-full p-6 space-y-5 text-slate-800 dark:text-slate-100">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-rose-100 dark:bg-rose-950/60 flex items-center justify-center text-rose-600 dark:text-rose-400">
                <Trash2 className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-serif text-lg font-bold text-rose-600 dark:text-rose-400">Delete Account Permanently</h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">This action is irreversible</p>
              </div>
            </div>

            <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
              Warning: All your journal entries, AI memory summaries, insights, nudges, and account authentication records will be <strong>permanently purged</strong> from the database immediately. You will not be able to recover this data.
            </p>

            <div className="space-y-1.5">
              <label className="block text-xs font-medium text-slate-700 dark:text-slate-300">
                To confirm, please type <span className="font-mono font-bold text-rose-600 dark:text-rose-400">DELETE</span> below:
              </label>
              <input
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
                className="px-4 py-2 rounded-xl text-xs font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDeleteAccount}
                disabled={accountActionLoading || deleteConfirmText !== 'DELETE'}
                className="px-4 py-2 rounded-xl text-xs font-semibold bg-rose-600 hover:bg-rose-700 text-white transition-colors flex items-center gap-2 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
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

    </div>
  );
}
