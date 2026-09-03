import React, { useState, useEffect, useCallback } from 'react';
import { Lock, ShieldCheck, X, Check, ArrowRight, ShieldAlert, KeyRound } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { hashPin, verifyPin } from '../lib/pinSecurity';

export type PinModalMode = 'prompt' | 'create' | 'change' | 'disable' | 'rotate';

interface PinSetupModalProps {
  isOpen: boolean;
  initialMode: PinModalMode;
  storedPinHash?: string;
  onClose: () => void;
  onSavePin: (pinHash: string, reason?: 'initial_setup' | 'routine_90_day_rotation' | 'manual_rotation' | 'reset_recovery' | 'policy_enforcement') => Promise<void>;
  onDisablePin?: () => Promise<void>;
  onSkipPrompt?: () => Promise<void>;
}

export const PinSetupModal: React.FC<PinSetupModalProps> = ({
  isOpen,
  initialMode,
  storedPinHash = '',
  onClose,
  onSavePin,
  onDisablePin,
  onSkipPrompt,
}) => {
  const [mode, setMode] = useState<PinModalMode>(initialMode);
  
  // Internal step management
  // For 'create': 'enter_new' | 'confirm_new'
  // For 'change' | 'rotate': 'enter_current' | 'enter_new' | 'confirm_new'
  // For 'disable': 'enter_current'
  const [step, setStep] = useState<'prompt' | 'enter_current' | 'enter_new' | 'confirm_new'>('prompt');
  
  const [inputPin, setInputPin] = useState<string>('');
  const [newPinCandidate, setNewPinCandidate] = useState<string>('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isShaking, setIsShaking] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Synchronize state when modal opens
  useEffect(() => {
    if (isOpen) {
      setMode(initialMode);
      setInputPin('');
      setNewPinCandidate('');
      setErrorMessage(null);
      if (initialMode === 'prompt') {
        setStep('prompt');
      } else if (initialMode === 'create') {
        setStep('enter_new');
      } else if (initialMode === 'change' || initialMode === 'rotate' || initialMode === 'disable') {
        setStep('enter_current');
      }
    }
  }, [isOpen, initialMode]);

  const handleDigit = useCallback(
    async (digit: string) => {
      if (inputPin.length < 6) {
        const next = inputPin + digit;
        setInputPin(next);
        setErrorMessage(null);

        if (next.length === 6) {
          // Process 6 digit entry based on current step
          if (step === 'enter_current') {
            const isValid = await verifyPin(next, storedPinHash);
            if (!isValid) {
              setIsShaking(true);
              setErrorMessage('Incorrect current PIN');
              setTimeout(() => {
                setInputPin('');
                setIsShaking(false);
              }, 400);
            } else {
              if (mode === 'disable') {
                // Disable PIN lock
                setIsSubmitting(true);
                if (onDisablePin) await onDisablePin();
                setIsSubmitting(false);
                onClose();
              } else if (mode === 'change' || mode === 'rotate') {
                // Proceed to enter new pin
                setInputPin('');
                setStep('enter_new');
              }
            }
          } else if (step === 'enter_new') {
            setNewPinCandidate(next);
            setInputPin('');
            setStep('confirm_new');
          } else if (step === 'confirm_new') {
            if (next !== newPinCandidate) {
              setIsShaking(true);
              setErrorMessage('PINs do not match. Please try again.');
              setTimeout(() => {
                setInputPin('');
                setNewPinCandidate('');
                setStep('enter_new');
                setIsShaking(false);
              }, 500);
            } else {
              // PIN confirmed! Hash and save.
              setIsSubmitting(true);
              const hash = await hashPin(next);
              const rotationReason = mode === 'rotate' ? 'routine_90_day_rotation' : (mode === 'change' ? 'manual_rotation' : 'initial_setup');
              await onSavePin(hash, rotationReason);
              setIsSubmitting(false);
              onClose();
            }
          }
        }
      }
    },
    [inputPin, step, storedPinHash, mode, newPinCandidate, onDisablePin, onSavePin, onClose]
  );

  const handleBackspace = useCallback(() => {
    setInputPin((prev) => prev.slice(0, -1));
    setErrorMessage(null);
  }, []);

  const handleClear = useCallback(() => {
    setInputPin('');
    setErrorMessage(null);
  }, []);

  // Keyboard listener
  useEffect(() => {
    if (!isOpen || step === 'prompt') return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key >= '0' && e.key <= '9') {
        handleDigit(e.key);
      } else if (e.key === 'Backspace') {
        handleBackspace();
      } else if (e.key === 'Escape') {
        if (mode !== 'prompt') {
          onClose();
        } else {
          handleClear();
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, step, mode, handleDigit, handleBackspace, handleClear, onClose]);

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.25 }}
          className="fixed inset-0 z-50 bg-slate-900/60 dark:bg-black/70 backdrop-blur-md flex items-center justify-center p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="pin-modal-title"
          aria-describedby="pin-modal-desc"
        >
          <motion.div 
            initial={{ opacity: 0, scale: 0.95, y: 12 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 12 }}
            transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
            className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-2xl border border-white/80 dark:border-white/10 rounded-3xl p-6 max-w-sm w-full space-y-5 relative shadow-2xl text-slate-800 dark:text-slate-100"
          >
            
            {/* Close Button (if not compulsory prompt) */}
        {mode !== 'prompt' && (
          <button
            type="button"
            onClick={onClose}
            aria-label="Close PIN setup dialog"
            className="absolute top-4 right-4 text-slate-500 hover:text-slate-700 dark:hover:text-slate-200 cursor-pointer p-1 rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
          >
            <X className="w-5 h-5" />
          </button>
        )}

        {/* Modal Content - STEP: PROMPT */}
        {step === 'prompt' ? (
          <div className="space-y-5 text-center py-2">
            <div className="w-14 h-14 rounded-2xl bg-indigo-50/80 dark:bg-indigo-950/70 border border-indigo-200/80 dark:border-indigo-800/80 flex items-center justify-center text-indigo-600 dark:text-indigo-300 mx-auto shadow-2xs" aria-hidden="true">
              <Lock className="w-7 h-7" />
            </div>

            <div className="space-y-2">
              <h3 id="pin-modal-title" className="text-xl font-serif font-bold text-slate-900 dark:text-white">
                Protect Your Journal
              </h3>
              <p id="pin-modal-desc" className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed px-2">
                Would you like to setup a 6-digit PIN lock? Whenever you sign in, your reflections will be safely protected.
              </p>
            </div>

            <div className="p-3.5 rounded-2xl bg-indigo-50/70 dark:bg-indigo-950/40 backdrop-blur-md border border-indigo-200/80 dark:border-indigo-800/80 text-left text-xs space-y-1.5">
              <div className="font-semibold text-indigo-900 dark:text-indigo-200 flex items-center gap-1.5">
                <ShieldCheck className="w-4 h-4 text-indigo-600 dark:text-indigo-300" />
                <span>Private & Local PIN Lock</span>
              </div>
              <p className="text-[11px] text-indigo-950/70 dark:text-indigo-300/70 leading-normal">
                You can change or remove your PIN lock at any time in the Settings page.
              </p>
            </div>

            <div className="space-y-2 pt-2">
              <button
                type="button"
                id="btn-pin-modal-setup"
                onClick={() => setStep('enter_new')}
                className="w-full py-3 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs transition-colors flex items-center justify-center gap-2 cursor-pointer shadow-md shadow-indigo-600/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
              >
                <span>Set Up 6-Digit PIN</span>
                <ArrowRight className="w-4 h-4" />
              </button>

              <button
                type="button"
                id="btn-pin-modal-skip"
                onClick={async () => {
                  if (onSkipPrompt) await onSkipPrompt();
                  onClose();
                }}
                className="w-full py-2.5 px-4 rounded-xl bg-white/60 dark:bg-slate-800/60 hover:bg-white/80 dark:hover:bg-slate-700 border border-white/80 dark:border-white/10 text-slate-700 dark:text-slate-200 font-semibold text-xs transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
              >
                Maybe Later (Skip)
              </button>
            </div>
          </div>
        ) : (
          /* Modal Content - STEPS: enter_current | enter_new | confirm_new */
          <div className="space-y-5 text-center">
            
            <div className="w-12 h-12 rounded-2xl bg-indigo-50/80 dark:bg-indigo-950/70 border border-indigo-200/80 dark:border-indigo-800/80 flex items-center justify-center text-indigo-600 dark:text-indigo-300 mx-auto shadow-2xs" aria-hidden="true">
              <KeyRound className="w-6 h-6" />
            </div>

            <div className="space-y-1">
              <h3 id="pin-modal-title" className="text-lg font-serif font-bold text-slate-900 dark:text-white">
                {step === 'enter_current' && (mode === 'rotate' ? 'Verify Current PIN for 90-Day Rotation' : 'Enter Current PIN')}
                {step === 'enter_new' && (mode === 'rotate' ? 'Create Rotated 6-Digit PIN' : 'Create 6-Digit PIN')}
                {step === 'confirm_new' && (mode === 'rotate' ? 'Confirm Rotated 6-Digit PIN' : 'Confirm 6-Digit PIN')}
              </h3>
              <p id="pin-modal-desc" className="text-xs text-slate-600 dark:text-slate-300">
                {step === 'enter_current' && (mode === 'rotate' ? 'Enter your current PIN to authorize 90-day secret rotation' : 'Enter your existing 6-digit PIN code')}
                {step === 'enter_new' && (mode === 'rotate' ? 'Choose a fresh 6-digit PIN to maintain 90-day security policy compliance' : 'Choose a 6-digit PIN code for app lock')}
                {step === 'confirm_new' && 'Re-enter your new 6-digit PIN to confirm'}
              </p>
            </div>

            {/* 6 Dots Indicator */}
            <div
              className={`flex justify-center gap-2.5 my-3 transition-transform ${
                isShaking ? 'animate-shake' : ''
              }`}
            >
              {Array.from({ length: 6 }).map((_, idx) => {
                const isFilled = idx < inputPin.length;
                return (
                  <div
                    key={idx}
                    className={`w-9 h-10 rounded-xl border flex items-center justify-center transition-all ${
                      isFilled
                        ? 'border-indigo-500 bg-indigo-600/20 text-indigo-600 dark:text-indigo-300 shadow-2xs'
                        : 'border-white/80 dark:border-white/10 bg-white/50 dark:bg-slate-800/60'
                    }`}
                  >
                    {isFilled ? (
                      <div className="w-3 h-3 rounded-full bg-indigo-600 dark:bg-indigo-400" />
                    ) : (
                      <div className="w-1.5 h-1.5 rounded-full bg-slate-300 dark:bg-slate-700" />
                    )}
                  </div>
                );
              })}
            </div>

            {/* Error Message */}
            {errorMessage && (
              <div className="text-xs text-rose-600 dark:text-rose-300 font-medium flex items-center justify-center gap-1.5">
                <ShieldAlert className="w-3.5 h-3.5" />
                <span>{errorMessage}</span>
              </div>
            )}

            {/* Keypad */}
            <div className="grid grid-cols-3 gap-2 w-full pt-1">
              {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map((digit) => (
                <button
                  key={digit}
                  type="button"
                  onClick={() => handleDigit(digit)}
                  disabled={isSubmitting || inputPin.length >= 6}
                  className="h-11 rounded-xl bg-white/60 dark:bg-slate-800/60 hover:bg-white/90 dark:hover:bg-slate-700 border border-white/80 dark:border-white/10 text-slate-900 dark:text-white text-lg font-semibold transition-all cursor-pointer disabled:opacity-50"
                >
                  {digit}
                </button>
              ))}
              <button
                type="button"
                onClick={handleClear}
                disabled={inputPin.length === 0}
                className="h-11 rounded-xl bg-white/40 dark:bg-slate-800/40 hover:bg-white/80 dark:hover:bg-slate-700 text-slate-500 dark:text-slate-400 text-xs font-semibold transition-colors cursor-pointer disabled:opacity-30 border border-white/60 dark:border-white/10"
              >
                Clear
              </button>
              <button
                type="button"
                onClick={() => handleDigit('0')}
                disabled={isSubmitting || inputPin.length >= 6}
                className="h-11 rounded-xl bg-white/60 dark:bg-slate-800/60 hover:bg-white/90 dark:hover:bg-slate-700 border border-white/80 dark:border-white/10 text-slate-900 dark:text-white text-lg font-semibold transition-all cursor-pointer disabled:opacity-50"
              >
                0
              </button>
              <button
                type="button"
                onClick={handleBackspace}
                disabled={inputPin.length === 0}
                className="h-11 rounded-xl bg-white/40 dark:bg-slate-800/40 hover:bg-white/80 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-xs font-semibold transition-colors cursor-pointer disabled:opacity-30 border border-white/60 dark:border-white/10"
              >
                ⌫
              </button>
            </div>

          </div>
        )}

      </motion.div>
    </motion.div>
      )}
    </AnimatePresence>
  );
};
