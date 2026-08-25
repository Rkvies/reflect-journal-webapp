import React, { useState, useEffect } from 'react';
import { onAuthStateChanged, User } from 'firebase/auth';
import { 
  auth, 
  logOut, 
  subscribeToEntries, 
  subscribeToProfileSummary, 
  subscribeToInsights, 
  subscribeToNudges, 
  subscribeToWeeklySummary,
  dismissNudge,
  saveNudge
} from './lib/firebase';
import { 
  JournalEntry, 
  ProfileSummary, 
  InsightReport, 
  ProactiveNudge, 
  WeeklyReflectionReport,
  AppUser 
} from './types';
import { requestAgenticNudge } from './lib/api';
import { Navbar } from './components/Navbar';
import { NudgeBanner } from './components/NudgeBanner';
import { WeeklyReflectionCard } from './components/WeeklyReflectionCard';
import { JournalChat } from './components/JournalChat';
import { EntryHistory } from './components/EntryHistory';
import { InsightsPanel } from './components/InsightsPanel';
import { ProfileSummaryModal } from './components/ProfileSummaryModal';
import { SecurityReviewModal } from './components/SecurityReviewModal';
import { AuthLanding } from './components/AuthLanding';

export default function App() {
  const [currentUser, setCurrentUser] = useState<AppUser | null>(null);
  const [isAuthLoading, setIsAuthLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'journal' | 'history' | 'insights'>('journal');
  const [theme, setTheme] = useState<'light' | 'dark'>(() => {
    const saved = localStorage.getItem('reflect_theme');
    if (saved === 'dark' || saved === 'light') return saved;
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  });

  // Apply theme to document root
  useEffect(() => {
    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
    localStorage.setItem('reflect_theme', theme);
  }, [theme]);

  const toggleTheme = () => {
    setTheme(prev => (prev === 'light' ? 'dark' : 'light'));
  };

  // Firestore real-time collections
  const [entries, setEntries] = useState<JournalEntry[]>([]);
  const [profileSummary, setProfileSummary] = useState<ProfileSummary | null>(null);
  const [insights, setInsights] = useState<InsightReport[]>([]);
  const [nudges, setNudges] = useState<ProactiveNudge[]>([]);
  const [weeklySummary, setWeeklySummary] = useState<WeeklyReflectionReport | null>(null);

  // Modals
  const [isMemoryOpen, setIsMemoryOpen] = useState(false);
  const [isSecurityOpen, setIsSecurityOpen] = useState(false);

  // Prefill state from Nudge or Insight suggestion
  const [prefillPrompt, setPrefillPrompt] = useState<{ prompt: string; tag: string } | null>(null);

  // Target entry highlight from Insights transparent reasoning link
  const [targetEntryId, setTargetEntryId] = useState<string | null>(null);

  // Monitor Firebase Auth State
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user: User | null) => {
      if (user) {
        setCurrentUser({
          uid: user.uid,
          email: user.email,
          displayName: user.displayName || (user.isAnonymous ? 'Demo Reflect User' : user.email?.split('@')[0] || 'User'),
          photoURL: user.photoURL,
          isAnonymous: user.isAnonymous,
        });
      } else {
        setCurrentUser(null);
        setEntries([]);
        setProfileSummary(null);
        setInsights([]);
        setNudges([]);
        setWeeklySummary(null);
      }
      setIsAuthLoading(false);
    });

    return () => unsubscribe();
  }, []);

  // Subscribe to user Firestore subcollections
  useEffect(() => {
    if (!currentUser?.uid) return;

    const unsubEntries = subscribeToEntries(currentUser.uid, (data) => {
      setEntries(data);
    });

    const unsubSummary = subscribeToProfileSummary(currentUser.uid, (data) => {
      setProfileSummary(data);
    });

    const unsubInsights = subscribeToInsights(currentUser.uid, (data) => {
      setInsights(data);
    });

    const unsubNudges = subscribeToNudges(currentUser.uid, (data) => {
      setNudges(data);
    });

    const unsubWeekly = subscribeToWeeklySummary(currentUser.uid, (data) => {
      setWeeklySummary(data);
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
      await logOut();
    } catch (err) {
      console.error('Sign out error:', err);
    }
  };

  const handleDismissNudge = async (nudgeId: string) => {
    if (!currentUser?.uid) return;
    try {
      await dismissNudge(currentUser.uid, nudgeId);
    } catch (err) {
      console.error('Dismiss nudge error:', err);
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
      <div className="min-h-screen bg-slate-100/80 flex items-center justify-center text-slate-500 font-mono text-xs relative overflow-hidden">
        <div className="absolute top-1/4 left-1/3 w-96 h-96 bg-indigo-200/50 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-1/4 right-1/3 w-96 h-96 bg-amber-100/60 rounded-full blur-3xl pointer-events-none" />
        <div className="relative z-10 glass-panel p-8 rounded-3xl flex flex-col items-center gap-3 shadow-xl">
          <div className="w-10 h-10 rounded-2xl bg-indigo-600/10 border border-indigo-500/20 animate-pulse flex items-center justify-center text-indigo-700 font-serif text-lg font-bold shadow-inner">
            R
          </div>
          <span className="text-slate-600 font-medium font-sans">Authenticating Reflect session...</span>
        </div>
      </div>
    );
  }

  if (!currentUser) {
    return <AuthLanding onSignedIn={() => {}} />;
  }

  const activeNudge = nudges.length > 0 ? nudges[0] : null;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-indigo-50/30 to-slate-100 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950 text-slate-800 dark:text-slate-100 flex flex-col relative selection:bg-indigo-500/20 selection:text-indigo-900 dark:selection:text-indigo-200 overflow-x-hidden transition-colors duration-200">
      
      {/* Ambient background glows for realistic frosted glass refraction */}
      <div className="fixed top-[-10%] left-[-5%] w-[45vw] h-[45vw] bg-indigo-200/40 dark:bg-indigo-950/30 rounded-full blur-3xl pointer-events-none -z-10" />
      <div className="fixed top-[30%] right-[-10%] w-[40vw] h-[40vw] bg-amber-100/50 dark:bg-amber-950/20 rounded-full blur-3xl pointer-events-none -z-10" />
      <div className="fixed bottom-[-10%] left-[20%] w-[50vw] h-[40vw] bg-sky-100/40 dark:bg-sky-950/20 rounded-full blur-3xl pointer-events-none -z-10" />

      {/* Top Navigation */}
      <Navbar
        user={currentUser}
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        theme={theme}
        onToggleTheme={toggleTheme}
        onOpenMemory={() => setIsMemoryOpen(true)}
        onOpenSecurity={() => setIsSecurityOpen(true)}
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
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8 space-y-6">
        
        {/* Your Week in Reflection Summary Card (Prominently featured on Dashboard & Insights) */}
        {(activeTab === 'journal' || activeTab === 'insights') && (
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
        )}

        {activeTab === 'journal' && (
          <JournalChat
            userId={currentUser.uid}
            profileSummary={profileSummary}
            recentEntries={entries}
            onEntrySaved={(savedEntry) => {
              // Real-time listener automatically updates list
            }}
            prefillPrompt={prefillPrompt}
            onClearPrefill={() => setPrefillPrompt(null)}
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
        )}
      </main>

      {/* Footer / Status Bar */}
      <footer className="border-t border-white/60 dark:border-slate-800 bg-white/40 dark:bg-slate-900/60 backdrop-blur-xl px-4 sm:px-6 py-3 text-xs text-slate-500 dark:text-slate-400 shadow-sm mt-auto transition-colors">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-2">
          <div className="flex items-center gap-2 font-mono text-[11px] text-slate-600 dark:text-slate-300">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span>Authenticated Tenant: {currentUser.uid.slice(0, 10)}...</span>
            <span className="text-slate-300 dark:text-slate-700">|</span>
            <span>Firestore DB: ai-studio-2f5d1cf6-b82e-4783-86fd-399dce4d2e3a</span>
          </div>

          <div className="flex items-center gap-4 text-[11px] text-slate-600 dark:text-slate-300">
            <button
              onClick={() => setIsSecurityOpen(true)}
              className="hover:text-indigo-600 dark:hover:text-indigo-400 font-medium transition-colors cursor-pointer"
            >
              Threat Model & ABAC Rules
            </button>
            <button
              onClick={() => setIsMemoryOpen(true)}
              className="hover:text-indigo-600 dark:hover:text-indigo-400 font-medium transition-colors cursor-pointer"
            >
              Memory Summary ({profileSummary ? 'Active' : 'Empty'})
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

    </div>
  );
}
