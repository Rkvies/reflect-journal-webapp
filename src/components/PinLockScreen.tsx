import React, { useState, useEffect, useCallback } from 'react';
import { Lock, LogOut, ShieldAlert, KeyRound, Check, RefreshCw, X } from 'lucide-react';
import { AppUser } from '../types';
import { verifyPin, savePinSettings } from '../lib/pinSecurity';
import { signOut } from 'firebase/auth';
import { auth, googleProvider } from '../lib/firebase';
import { signInWithPopup } from 'firebase/auth';

interface PinLockScreenProps {
  user: AppUser;
  storedPinHash: string;
  onUnlockSuccess: () => void;
  onResetPinSuccess: () => void;
}

export const PinLockScreen: React.FC<PinLockScreenProps> = ({
  user,
  storedPinHash,
  onUnlockSuccess,
  onResetPinSuccess,
}) => {
  const [pin, setPin] = useState<string>('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isShaking, setIsShaking] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);
  const [showForgotModal, setShowForgotModal] = useState(false);
  const [isResettingWithGoogle, setIsResettingWithGoogle] = useState(false);
  const [resetError, setResetError] = useState<string | null>(null);

  const handleKeyPress = useCallback(
    async (digit: string) => {
      if (pin.length < 6) {
        const newPin = pin + digit;
        setPin(newPin);
        setErrorMessage(null);

        if (newPin.length === 6) {
          setIsVerifying(true);
          const isValid = await verifyPin(newPin, storedPinHash);
          setIsVerifying(false);

          if (isValid) {
            onUnlockSuccess();
          } else {
            setIsShaking(true);
            setErrorMessage('Incorrect PIN. Please try again.');
            setTimeout(() => {
              setPin('');
              setIsShaking(false);
            }, 500);
          }
        }
      }
    },
    [pin, storedPinHash, onUnlockSuccess]
  );

  const handleBackspace = useCallback(() => {
    setPin((prev) => prev.slice(0, -1));
    setErrorMessage(null);
  }, []);

  const handleClear = useCallback(() => {
    setPin('');
    setErrorMessage(null);
  }, []);

  // Keyboard listener
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (showForgotModal) return;

      if (e.key >= '0' && e.key <= '9') {
        handleKeyPress(e.key);
      } else if (e.key === 'Backspace') {
        handleBackspace();
      } else if (e.key === 'Escape') {
        handleClear();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyPress, handleBackspace, handleClear, showForgotModal]);

  const handleSignOut = async () => {
    try {
      await signOut(auth);
    } catch (err) {
      console.error('Failed to sign out:', err);
    }
  };

  const handleGoogleResetPin = async () => {
    setIsResettingWithGoogle(true);
    setResetError(null);
    try {
      // Re-authenticate with Google Popup to confirm user identity
      await signInWithPopup(auth, googleProvider);
      
      // User identity verified via Google auth! Clear PIN requirement
      await savePinSettings(user.uid, {
        pinEnabled: false,
        pinHash: '',
        hasPromptedSetup: false,
      });

      setShowForgotModal(false);
      onResetPinSuccess();
    } catch (err: any) {
      console.error('Reset PIN with Google failed:', err);
      if (err.code === 'auth/popup-closed-by-user') {
        setResetError('Google sign-in was cancelled.');
      } else {
        setResetError('Failed to verify identity with Google. Please try again or sign out.');
      }
    } finally {
      setIsResettingWithGoogle(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/95 backdrop-blur-2xl flex items-center justify-center p-4 animate-fade-in text-slate-100">
      <div className="w-full max-w-sm flex flex-col items-center space-y-6 text-center">
        
        {/* App Logo & Header */}
        <div className="flex flex-col items-center space-y-3">
          <div className="w-16 h-16 rounded-3xl bg-indigo-600/20 border border-indigo-500/30 flex items-center justify-center text-indigo-400 shadow-lg shadow-indigo-950/50">
            <Lock className="w-8 h-8" />
          </div>
          <div>
            <h1 className="text-2xl font-serif font-bold text-white tracking-wide">
              Reflect Journal
            </h1>
            <p className="text-xs text-slate-400 mt-1">
              Welcome back, <span className="text-slate-200 font-medium">{user.displayName || 'Author'}</span>
            </p>
          </div>
        </div>

        {/* Status / Instruction */}
        <div className="space-y-1">
          <h2 className="text-sm font-semibold text-slate-200">
            Enter 6-Digit Security PIN
          </h2>
          <p className="text-xs text-slate-400">
            Your journal is protected with PIN lock security
          </p>
        </div>

        {/* 6 Digit Indicators */}
        <div
          className={`flex justify-center gap-3 my-2 transition-transform ${
            isShaking ? 'animate-shake' : ''
          }`}
        >
          {Array.from({ length: 6 }).map((_, idx) => {
            const isFilled = idx < pin.length;
            return (
              <div
                key={idx}
                className={`w-11 h-12 rounded-2xl border flex items-center justify-center transition-all ${
                  isFilled
                    ? 'border-indigo-500 bg-indigo-600/30 text-white shadow-md shadow-indigo-950/50'
                    : 'border-slate-700 bg-slate-800/60 text-slate-600'
                }`}
              >
                {isFilled ? (
                  <div className="w-3.5 h-3.5 rounded-full bg-indigo-400 animate-scale-up" />
                ) : (
                  <div className="w-2 h-2 rounded-full bg-slate-700" />
                )}
              </div>
            );
          })}
        </div>

        {/* Error message */}
        {errorMessage && (
          <div className="text-xs text-rose-400 font-medium flex items-center gap-1.5 animate-fade-in">
            <ShieldAlert className="w-3.5 h-3.5 flex-shrink-0" />
            <span>{errorMessage}</span>
          </div>
        )}

        {/* Numpad */}
        <div className="grid grid-cols-3 gap-3 w-full max-w-xs pt-2">
          {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map((digit) => (
            <button
              key={digit}
              type="button"
              onClick={() => handleKeyPress(digit)}
              disabled={isVerifying || pin.length >= 6}
              className="h-14 rounded-2xl bg-slate-800/80 hover:bg-slate-700/80 active:bg-indigo-600/40 border border-slate-700/60 text-white text-xl font-semibold transition-all cursor-pointer shadow-xs disabled:opacity-50 flex items-center justify-center"
            >
              {digit}
            </button>
          ))}
          <button
            type="button"
            onClick={handleClear}
            disabled={pin.length === 0}
            className="h-14 rounded-2xl bg-slate-800/40 hover:bg-slate-800 border border-slate-800 text-slate-400 text-xs font-semibold transition-colors cursor-pointer disabled:opacity-30 flex items-center justify-center"
          >
            Clear
          </button>
          <button
            type="button"
            onClick={() => handleKeyPress('0')}
            disabled={isVerifying || pin.length >= 6}
            className="h-14 rounded-2xl bg-slate-800/80 hover:bg-slate-700/80 active:bg-indigo-600/40 border border-slate-700/60 text-white text-xl font-semibold transition-all cursor-pointer shadow-xs disabled:opacity-50 flex items-center justify-center"
          >
            0
          </button>
          <button
            type="button"
            onClick={handleBackspace}
            disabled={pin.length === 0}
            className="h-14 rounded-2xl bg-slate-800/40 hover:bg-slate-800 border border-slate-800 text-slate-300 text-xs font-semibold transition-colors cursor-pointer disabled:opacity-30 flex items-center justify-center"
          >
            ⌫
          </button>
        </div>

        {/* Actions Footer */}
        <div className="flex items-center justify-between w-full max-w-xs pt-4 border-t border-slate-800 text-xs">
          <button
            type="button"
            onClick={() => setShowForgotModal(true)}
            className="text-slate-400 hover:text-indigo-400 transition-colors cursor-pointer flex items-center gap-1.5"
          >
            <KeyRound className="w-3.5 h-3.5" />
            <span>Forgot PIN?</span>
          </button>
          <button
            type="button"
            onClick={handleSignOut}
            className="text-slate-400 hover:text-rose-400 transition-colors cursor-pointer flex items-center gap-1.5"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>Sign Out</span>
          </button>
        </div>

      </div>

      {/* Forgot PIN / Google Verification Reset Modal */}
      {showForgotModal && (
        <div className="fixed inset-0 z-60 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 max-w-sm w-full space-y-5 relative shadow-2xl text-left">
            <button
              onClick={() => setShowForgotModal(false)}
              className="absolute top-4 right-4 text-slate-400 hover:text-white"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-indigo-950 border border-indigo-800 flex items-center justify-center text-indigo-400">
                <KeyRound className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-white">Reset App PIN Lock</h3>
                <p className="text-xs text-slate-400">Verify your Google account to reset PIN</p>
              </div>
            </div>

            <p className="text-xs text-slate-300 leading-relaxed">
              If you forgot your 6-digit PIN, you can securely reset it by authenticating with your Google Account ({user.email}).
            </p>

            {resetError && (
              <p className="text-xs text-rose-400 font-medium">
                {resetError}
              </p>
            )}

            <div className="space-y-2 pt-2">
              <button
                type="button"
                onClick={handleGoogleResetPin}
                disabled={isResettingWithGoogle}
                className="w-full py-2.5 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs transition-colors flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 shadow-md"
              >
                {isResettingWithGoogle ? (
                  <RefreshCw className="w-4 h-4 animate-spin" />
                ) : (
                  <Check className="w-4 h-4" />
                )}
                <span>Verify with Google & Unlock</span>
              </button>

              <button
                type="button"
                onClick={handleSignOut}
                className="w-full py-2 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold text-xs transition-colors flex items-center justify-center gap-2 cursor-pointer"
              >
                <LogOut className="w-4 h-4" />
                <span>Sign Out Account</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
