import React, { useState } from 'react';
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
      
      let friendlyError = 'Failed to sign in with Google. Please try again.';
      
      if (err?.code === 'auth/popup-closed-by-user') {
        friendlyError = 'Sign-in was cancelled. Please try again.';
      } else if (err?.code === 'auth/popup-blocked') {
        friendlyError = 'Sign-in popup was blocked by your browser. Please allow popups for this site.';
      } else if (err?.code === 'auth/network-request-failed') {
        friendlyError = 'Network error. Please check your internet connection and try again.';
      } else if (err?.message) {
        // Fallback: strip raw Firebase boilerplate text if possible
        const cleanedMessage = err.message.replace(/Firebase:\s*/i, '').replace(/Error\s*\(auth\/[^)]+\)\.?/i, '').replace(/\(auth\/[^)]+\)\.?/i, '').trim();
        if (cleanedMessage) {
          friendlyError = cleanedMessage;
        }
      }
      
      setErrorMessage(friendlyError);
    } finally {
      setIsLoadingGoogle(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#FAFAFA] dark:bg-[#0A0A0A] text-slate-900 dark:text-white p-4 selection:bg-indigo-500/20">
      <div className="w-full max-w-[360px] flex flex-col items-center animate-in fade-in slide-in-from-bottom-4 duration-700 ease-out">
        {/* Logo */}
        <div className="mb-6 flex justify-center">
          <img 
            src="/reflect_logo.png" 
            alt="Reflect Logo" 
            className="h-36 w-auto object-contain dark:invert" 
          />
        </div>

        {/* Text */}
        <div className="text-center mb-10 space-y-3">
          <p className="text-slate-500 dark:text-slate-400 text-sm leading-relaxed">
            A private space for thoughts, memories, and personal growth.
          </p>
        </div>

        {/* Action */}
        <div className="w-full space-y-4">
          <button
            id="btn-signin-google"
            onClick={handleGoogleSignIn}
            disabled={isLoadingGoogle}
            className="w-full flex items-center justify-center gap-3 px-4 py-3 rounded-xl text-sm font-medium bg-white dark:bg-zinc-900 text-slate-800 dark:text-zinc-100 border border-slate-200 dark:border-zinc-800 hover:bg-slate-50 dark:hover:bg-zinc-800 transition-all shadow-sm hover:shadow-md disabled:opacity-50 cursor-pointer"
          >
            <svg className="w-5 h-5" viewBox="0 0 24 24">
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
            <span>{isLoadingGoogle ? 'Connecting...' : 'Continue with Google'}</span>
          </button>

          {errorMessage && (
            <div className="p-3 text-center rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-100 dark:border-rose-900/50 text-xs text-rose-600 dark:text-rose-400">
              {errorMessage}
            </div>
          )}
        </div>
        
        {/* Footer info */}
        <div className="mt-10 text-center text-xs text-slate-400 dark:text-slate-500 max-w-[280px]">
          By continuing, you agree to Reflect's strictly private data model. All entries are secured to your account.
        </div>
      </div>
    </div>
  );
};

