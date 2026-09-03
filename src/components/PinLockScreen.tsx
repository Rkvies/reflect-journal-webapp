import React, { useState, useEffect, useCallback } from 'react';
import { Lock, LogOut, ShieldAlert, KeyRound, Check, RefreshCw, X, AlertTriangle, ArrowRight, ShieldCheck } from 'lucide-react';
import { motion } from 'motion/react';
import { AppUser } from '../types';
import { verifyPin, savePinSettings, getLocalPinSettings, calculateRotationStatus, hashPin } from '../lib/pinSecurity';
import { signOut } from 'firebase/auth';
import { auth, googleProvider } from '../lib/firebase';
import { signInWithPopup } from 'firebase/auth';
import { BackgroundPattern } from './BackgroundPattern';

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

  // 90-Day Rotation State
  const pinSettings = getLocalPinSettings(user.uid);
  const rotationStatus = calculateRotationStatus(pinSettings);
  
  const [showMandatoryRotationModal, setShowMandatoryRotationModal] = useState(false);
  const [rotationStep, setRotationStep] = useState<'enter_new' | 'confirm_new'>('enter_new');
  const [newRotatedPin, setNewRotatedPin] = useState('');
  const [confirmRotatedPin, setConfirmRotatedPin] = useState('');
  const [rotationError, setRotationError] = useState<string | null>(null);
  const [isRotating, setIsRotating] = useState(false);

  const handleKeyPress = useCallback(
    async (digit: string) => {
      if (showMandatoryRotationModal || showForgotModal) return;

      if (pin.length < 6) {
        const newPin = pin + digit;
        setPin(newPin);
        setErrorMessage(null);

        if (newPin.length === 6) {
          setIsVerifying(true);
          const isValid = await verifyPin(newPin, storedPinHash);
          setIsVerifying(false);

          if (isValid) {
            // Check if 90-day rotation is enforced and expired
            if (pinSettings.enforceRotation && rotationStatus.isExpired) {
              setShowMandatoryRotationModal(true);
              setPin('');
            } else {
              onUnlockSuccess();
            }
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
    [pin, storedPinHash, onUnlockSuccess, pinSettings, rotationStatus, showMandatoryRotationModal, showForgotModal]
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
      if (showForgotModal || showMandatoryRotationModal) return;

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
  }, [handleKeyPress, handleBackspace, handleClear, showForgotModal, showMandatoryRotationModal]);

  const handleSignOut = async () => {
    try {
      localStorage.setItem('reflect_force_select_account', 'true');
      sessionStorage.removeItem('reflect_session_timeout');
      await signOut(auth);
    } catch (err) {
      console.error('Failed to sign out:', err);
    }
  };

  const handleGoogleResetPin = async () => {
    setIsResettingWithGoogle(true);
    setResetError(null);
    try {
      await signInWithPopup(auth, googleProvider);
      await savePinSettings(user.uid, {
        pinEnabled: false,
        pinHash: '',
        hasPromptedSetup: false,
      }, 'reset_recovery');

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

  // Complete 90-day PIN rotation
  const handleCompleteRotation = async () => {
    if (newRotatedPin.length !== 6) {
      setRotationError('PIN must be exactly 6 digits');
      return;
    }
    if (newRotatedPin !== confirmRotatedPin) {
      setRotationError('PINs do not match. Please re-enter.');
      setConfirmRotatedPin('');
      return;
    }

    setIsRotating(true);
    setRotationError(null);
    try {
      const hash = await hashPin(newRotatedPin);
      await savePinSettings(user.uid, {
        pinHash: hash,
        lastRotatedAt: new Date().toISOString(),
      }, 'routine_90_day_rotation');

      setShowMandatoryRotationModal(false);
      onUnlockSuccess();
    } catch (err: any) {
      console.error('Failed to rotate PIN:', err);
      setRotationError('Failed to save rotated PIN. Please try again.');
    } finally {
      setIsRotating(false);
    }
  };

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.25 }}
      className="fixed inset-0 z-50 flex items-center justify-center p-4 text-slate-100 bg-slate-950"
    >
      <BackgroundPattern intensity="vibrant" />
      <div className="w-full max-w-sm flex flex-col items-center space-y-5 text-center bg-slate-900/80 backdrop-blur-2xl p-7 rounded-3xl border border-white/10 shadow-2xl relative z-10">
        
        {/* App Logo & Header */}
        <div className="flex flex-col items-center space-y-2.5">
          <div className="w-14 h-14 rounded-3xl bg-indigo-600/20 border border-indigo-500/30 flex items-center justify-center text-indigo-600 shadow-lg shadow-indigo-950/50">
            <Lock className="w-7 h-7" />
          </div>
          <div>
            <h1 className="text-xl font-serif font-bold text-white tracking-wide">
              Reflect Journal
            </h1>
            <p className="text-xs text-slate-500 mt-0.5">
              Welcome back, <span className="text-slate-200 font-medium">{user.displayName || 'Author'}</span>
            </p>
          </div>
        </div>

        {/* 90-Day Rotation Policy Status Notice */}
        {rotationStatus.isExpired ? (
          <div className="w-full px-3.5 py-2 rounded-2xl bg-rose-950/60 border border-rose-800/80 text-rose-600 text-[11px] flex items-center justify-center gap-1.5 animate-pulse">
            <AlertTriangle className="w-3.5 h-3.5 flex-shrink-0 text-rose-600" />
            <span>90-Day Secret Rotation Required upon unlocking</span>
          </div>
        ) : rotationStatus.isExpiringSoon ? (
          <div className="w-full px-3.5 py-1.5 rounded-2xl bg-amber-950/50 border border-amber-800/60 text-amber-600 text-[11px] flex items-center justify-center gap-1.5">
            <AlertTriangle className="w-3.5 h-3.5 flex-shrink-0 text-amber-600" />
            <span>PIN expires in {rotationStatus.daysRemaining} days (90-day policy)</span>
          </div>
        ) : null}

        {/* Status / Instruction */}
        <div className="space-y-1">
          <h2 className="text-sm font-semibold text-slate-200">
            Enter 6-Digit Security PIN
          </h2>
          <p className="text-xs text-slate-500">
            Your journal is protected with encrypted PIN lock security
          </p>
        </div>

        {/* 6 Digit Indicators */}
        <div
          className={`flex justify-center gap-3 my-1 transition-transform ${
            isShaking ? 'animate-shake' : ''
          }`}
        >
          {Array.from({ length: 6 }).map((_, idx) => {
            const isFilled = idx < pin.length;
            return (
              <div
                key={idx}
                className={`w-10 h-11 rounded-2xl border flex items-center justify-center transition-all ${
                  isFilled
                    ? 'border-indigo-500 bg-indigo-600/30 text-white shadow-md shadow-indigo-950/50'
                    : 'border-slate-700 bg-slate-800/60 text-slate-700'
                }`}
              >
                {isFilled ? (
                  <div className="w-3 h-3 rounded-full bg-indigo-400 animate-scale-up" />
                ) : (
                  <div className="w-2 h-2 rounded-full bg-slate-700" />
                )}
              </div>
            );
          })}
        </div>

        {/* Error message */}
        {errorMessage && (
          <div className="text-xs text-rose-600 font-medium flex items-center gap-1.5 animate-fade-in">
            <ShieldAlert className="w-3.5 h-3.5 flex-shrink-0" />
            <span>{errorMessage}</span>
          </div>
        )}

        {/* Numpad */}
        <div className="grid grid-cols-3 gap-2.5 w-full max-w-xs pt-1">
          {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map((digit) => (
            <button
              key={digit}
              type="button"
              onClick={() => handleKeyPress(digit)}
              disabled={isVerifying || pin.length >= 6}
              className="h-12 rounded-2xl bg-slate-800/80 hover:bg-slate-700/80 active:bg-indigo-600/40 border border-slate-700/60 text-white text-lg font-semibold transition-all cursor-pointer shadow-xs disabled:opacity-50 flex items-center justify-center"
            >
              {digit}
            </button>
          ))}
          <button
            type="button"
            onClick={handleClear}
            disabled={pin.length === 0}
            className="h-12 rounded-2xl bg-slate-800/40 hover:bg-slate-800 border border-slate-800 text-slate-500 text-xs font-semibold transition-colors cursor-pointer disabled:opacity-30 flex items-center justify-center"
          >
            Clear
          </button>
          <button
            type="button"
            onClick={() => handleKeyPress('0')}
            disabled={isVerifying || pin.length >= 6}
            className="h-12 rounded-2xl bg-slate-800/80 hover:bg-slate-700/80 active:bg-indigo-600/40 border border-slate-700/60 text-white text-lg font-semibold transition-all cursor-pointer shadow-xs disabled:opacity-50 flex items-center justify-center"
          >
            0
          </button>
          <button
            type="button"
            onClick={handleBackspace}
            disabled={pin.length === 0}
            className="h-12 rounded-2xl bg-slate-800/40 hover:bg-slate-800 border border-slate-800 text-slate-300 text-xs font-semibold transition-colors cursor-pointer disabled:opacity-30 flex items-center justify-center"
          >
            ⌫
          </button>
        </div>

        {/* Actions Footer */}
        <div className="flex items-center justify-between w-full max-w-xs pt-3 border-t border-slate-800 text-xs">
          <button
            type="button"
            onClick={() => setShowForgotModal(true)}
            className="text-slate-500 hover:text-indigo-600 transition-colors cursor-pointer flex items-center gap-1.5"
          >
            <KeyRound className="w-3.5 h-3.5" />
            <span>Forgot PIN?</span>
          </button>
          <button
            type="button"
            onClick={handleSignOut}
            className="text-slate-500 hover:text-rose-600 transition-colors cursor-pointer flex items-center gap-1.5"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>Sign Out</span>
          </button>
        </div>

      </div>

      {/* Mandatory 90-Day Secret Rotation Modal */}
      {showMandatoryRotationModal && (
        <div 
          className="fixed inset-0 z-60 bg-black/85 backdrop-blur-md flex items-center justify-center p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="mandatory-rotation-title"
          aria-describedby="mandatory-rotation-desc"
        >
          <div className="bg-slate-900 border border-slate-700 rounded-3xl p-6 max-w-sm w-full space-y-4 relative shadow-2xl text-left">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-amber-950 border border-amber-800 flex items-center justify-center text-amber-600 flex-shrink-0">
                <RefreshCw className="w-5 h-5" />
              </div>
              <div>
                <h3 id="mandatory-rotation-title" className="text-base font-bold text-white">90-Day PIN Rotation Required</h3>
                <p id="mandatory-rotation-desc" className="text-xs text-slate-500">Policy: Rotate secret every 90 days</p>
              </div>
            </div>

            <p className="text-xs text-slate-300 leading-relaxed">
              Your 6-digit access PIN has exceeded the 90-day security lifecycle. To safeguard your reflections, please create a new 6-digit PIN.
            </p>

            {rotationError && (
              <p className="text-xs text-rose-600 font-medium">
                {rotationError}
              </p>
            )}

            <div className="space-y-3 pt-1">
              <div>
                <label className="block text-[11px] font-medium text-slate-300 mb-1">
                  New 6-Digit PIN
                </label>
                <input
                  type="password"
                  maxLength={6}
                  value={newRotatedPin}
                  onChange={(e) => {
                    const val = e.target.value.replace(/\D/g, '');
                    setNewRotatedPin(val);
                  }}
                  placeholder="••••••"
                  className="w-full px-3.5 py-2.5 bg-slate-800 border border-slate-700 rounded-xl text-center text-lg tracking-widest text-white focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="block text-[11px] font-medium text-slate-300 mb-1">
                  Confirm New PIN
                </label>
                <input
                  type="password"
                  maxLength={6}
                  value={confirmRotatedPin}
                  onChange={(e) => {
                    const val = e.target.value.replace(/\D/g, '');
                    setConfirmRotatedPin(val);
                  }}
                  placeholder="••••••"
                  className="w-full px-3.5 py-2.5 bg-slate-800 border border-slate-700 rounded-xl text-center text-lg tracking-widest text-white focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div className="space-y-2 pt-2">
                <button
                  type="button"
                  onClick={handleCompleteRotation}
                  disabled={isRotating || newRotatedPin.length !== 6 || confirmRotatedPin.length !== 6}
                  className="w-full py-2.5 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs transition-colors flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 shadow-md"
                >
                  {isRotating ? (
                    <RefreshCw className="w-4 h-4 animate-spin" />
                  ) : (
                    <ShieldCheck className="w-4 h-4" />
                  )}
                  <span>Rotate PIN & Unlock</span>
                </button>

                <button
                  type="button"
                  onClick={handleSignOut}
                  className="w-full py-2 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold text-xs transition-colors flex items-center justify-center gap-2 cursor-pointer"
                >
                  <LogOut className="w-4 h-4" />
                  <span>Sign Out</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Forgot PIN / Google Verification Reset Modal */}
      {showForgotModal && (
        <div 
          className="fixed inset-0 z-60 bg-black/80 backdrop-blur-md flex items-center justify-center p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="forgot-pin-title"
          aria-describedby="forgot-pin-desc"
        >
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 max-w-sm w-full space-y-5 relative shadow-2xl text-left">
            <button
              type="button"
              onClick={() => setShowForgotModal(false)}
              aria-label="Close forgot PIN modal"
              className="absolute top-4 right-4 text-slate-500 hover:text-white"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-indigo-950 border border-indigo-800 flex items-center justify-center text-indigo-600">
                <KeyRound className="w-5 h-5" />
              </div>
              <div>
                <h3 id="forgot-pin-title" className="text-base font-bold text-white">Reset App PIN Lock</h3>
                <p id="forgot-pin-desc" className="text-xs text-slate-500">Verify your Google account to reset PIN</p>
              </div>
            </div>

            <p className="text-xs text-slate-300 leading-relaxed">
              If you forgot your 6-digit PIN, you can securely reset it by authenticating with your Google Account ({user.email}).
            </p>

            {resetError && (
              <p className="text-xs text-rose-600 font-medium">
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
    </motion.div>
  );
};

