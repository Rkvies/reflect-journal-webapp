import React, { useState } from 'react';
import { BookOpen, ShieldCheck, Sparkles, Brain, Lock } from 'lucide-react';
import { signInWithGoogle } from '../lib/firebase';

interface AuthLandingProps {
  onSignedIn: () => void;
}

export const AuthLanding: React.FC<AuthLandingProps> = ({ onSignedIn }) => {
  const [isLoadingGoogle, setIsLoadingGoogle] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleGoogleSignIn = async () => {
    setIsLoadingGoogle(true);
    setErrorMessage(null);
    try {
      await signInWithGoogle();
      onSignedIn();
    } catch (err: any) {
      console.error('Sign-in failed:', err);
      setErrorMessage(err.message || 'Failed to sign in with Google');
    } finally {
      setIsLoadingGoogle(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-indigo-50/40 to-slate-100 dark:from-slate-950 dark:via-indigo-950/30 dark:to-slate-900 text-slate-800 dark:text-slate-100 flex flex-col justify-between relative overflow-hidden selection:bg-indigo-500/20 selection:text-indigo-900">
      
      {/* Ambient background glows */}
      <div className="fixed top-[-10%] left-[-5%] w-[45vw] h-[45vw] bg-indigo-200/50 dark:bg-indigo-900/20 rounded-full blur-3xl pointer-events-none -z-10" />
      <div className="fixed top-[30%] right-[-10%] w-[40vw] h-[40vw] bg-amber-100/60 dark:bg-amber-900/10 rounded-full blur-3xl pointer-events-none -z-10" />
      <div className="fixed bottom-[-10%] left-[20%] w-[50vw] h-[40vw] bg-sky-100/50 dark:bg-sky-900/20 rounded-full blur-3xl pointer-events-none -z-10" />

      {/* Top Banner */}
      <header className="border-b border-white/60 dark:border-slate-800/80 bg-white/40 dark:bg-slate-900/40 backdrop-blur-xl px-6 py-4">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-indigo-600/10 dark:bg-indigo-500/20 border border-indigo-500/20 flex items-center justify-center text-indigo-700 dark:text-indigo-300 shadow-inner backdrop-blur-md">
              <BookOpen className="w-5 h-5" />
            </div>
            <span className="font-serif text-xl font-bold tracking-tight text-slate-900 dark:text-white">Reflect</span>
          </div>

          <div className="flex items-center gap-2 text-xs text-slate-600 dark:text-slate-300 font-mono bg-white/60 dark:bg-slate-800/60 px-3 py-1 rounded-full border border-white/80 dark:border-slate-700/80 backdrop-blur-md">
            <ShieldCheck className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
            <span>Encrypted Firestore ABAC Isolation</span>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <main className="max-w-4xl mx-auto px-4 sm:px-6 py-12 sm:py-16 text-center space-y-8 my-auto relative z-10">
        
        {/* Badge */}
        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white/70 dark:bg-slate-800/70 backdrop-blur-md border border-white/80 dark:border-slate-700/80 text-indigo-900 dark:text-indigo-200 text-xs font-semibold shadow-xs">
          <Sparkles className="w-3.5 h-3.5 text-amber-500" />
          <span>Agentic Personal Journaling with Gemini & Firestore</span>
        </div>

        {/* Headline */}
        <div className="space-y-4 max-w-2xl mx-auto">
          <h1 className="text-3xl sm:text-5xl font-serif font-bold text-slate-900 dark:text-white tracking-tight leading-tight">
            A private space for thoughts, memories, and personal growth.
          </h1>
          <p className="text-sm sm:text-base text-slate-600 dark:text-slate-300 leading-relaxed font-sans">
            Reflect pairs a continuous AI memory layer with empathetic Gemini dialogue. 
            All reflections are strictly isolated to your authenticated profile via Firestore Security Rules.
          </p>
        </div>

        {/* Auth Action Cards */}
        <div className="max-w-md mx-auto space-y-3 pt-2">
          
          {/* Google Sign-In */}
          <button
            id="btn-signin-google"
            onClick={handleGoogleSignIn}
            disabled={isLoadingGoogle}
            className="w-full flex items-center justify-center gap-3 px-6 py-3.5 rounded-2xl text-sm font-semibold bg-white/90 dark:bg-slate-800/90 hover:bg-white dark:hover:bg-slate-800 text-slate-800 dark:text-white border border-slate-200/80 dark:border-slate-700 hover:border-indigo-300 dark:hover:border-indigo-500 transition-all shadow-md hover:shadow-lg backdrop-blur-md disabled:opacity-50 cursor-pointer"
          >
            <svg className="w-4 h-4" viewBox="0 0 24 24">
              <path
                fill="#4285F4"
                d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.665-5.17 3.665-9.17z"
              />
              <path
                fill="#34A853"
                d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.1-6.72-4.93H1.25v3.15C3.27 21.43 7.37 24 12 24z"
              />
              <path
                fill="#FBBC05"
                d="M5.28 14.27c-.25-.72-.38-1.49-.38-2.27s.13-1.55.38-2.27V6.58H1.25C.45 8.18 0 10.04 0 12s.45 3.82 1.25 5.42l4.03-3.15z"
              />
              <path
                fill="#EA4335"
                d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.37 0 3.27 2.57 1.25 6.58l4.03 3.15c.95-2.83 3.6-4.98 6.72-4.98z"
              />
            </svg>
            <span>{isLoadingGoogle ? 'Connecting with Google...' : 'Continue with Google Account'}</span>
          </button>

          {errorMessage && (
            <div className="p-3.5 rounded-2xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800/60 text-xs text-rose-700 dark:text-rose-300 text-left">
              {errorMessage}
            </div>
          )}
        </div>

        {/* 3 Pillars */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-8 border-t border-white/60 dark:border-slate-800/80 text-left max-w-3xl mx-auto">
          
          <div className="p-5 rounded-2xl bg-white/60 dark:bg-slate-900/60 backdrop-blur-xl border border-white/70 dark:border-slate-800/70 shadow-xs space-y-2">
            <div className="flex items-center gap-2 text-xs font-bold text-indigo-700 dark:text-indigo-400 font-mono">
              <Brain className="w-4 h-4" />
              <span>Continuous Memory Layer</span>
            </div>
            <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
              Maintains an asynchronous running summary (~2000 tokens) of long-term themes and growth without context runaway.
            </p>
          </div>

          <div className="p-5 rounded-2xl bg-white/60 dark:bg-slate-900/60 backdrop-blur-xl border border-white/70 dark:border-slate-800/70 shadow-xs space-y-2">
            <div className="flex items-center gap-2 text-xs font-bold text-emerald-700 dark:text-emerald-400 font-mono">
              <Lock className="w-4 h-4" />
              <span>Strict Firestore ABAC</span>
            </div>
            <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
              Rules guarantee documents under <code>users/{'{uid}'}/**</code> are solely accessible to the authenticated owner.
            </p>
          </div>

          <div className="p-5 rounded-2xl bg-white/60 dark:bg-slate-900/60 backdrop-blur-xl border border-white/70 dark:border-slate-800/70 shadow-xs space-y-2">
            <div className="flex items-center gap-2 text-xs font-bold text-amber-700 dark:text-amber-400 font-mono">
              <Sparkles className="w-4 h-4" />
              <span>Structured Insight Reports</span>
            </div>
            <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
              On-demand psychological synthesis of emotional trajectory, thematic shifts, and personalized prompts.
            </p>
          </div>

        </div>

      </main>

      {/* Footer */}
      <footer className="border-t border-white/60 dark:border-slate-800/80 bg-white/30 dark:bg-slate-900/30 backdrop-blur-xl px-6 py-4 text-center text-xs text-slate-500 dark:text-slate-400 font-mono">
        Reflect • Powered by Gemini 2.5 Flash & Google Cloud Firestore
      </footer>

    </div>
  );
};
