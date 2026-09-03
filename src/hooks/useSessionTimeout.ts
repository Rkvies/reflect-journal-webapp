import { useEffect, useRef, useCallback } from 'react';
import { signOut } from 'firebase/auth';
import { auth } from '../lib/firebase';

const SESSION_TIMEOUT_MS = 5 * 60 * 1000; // 5 minutes

export function useSessionTimeout(isAuthenticated: boolean) {
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleLogout = useCallback(async () => {
    try {
      if (auth.currentUser?.email) {
        localStorage.setItem('reflect_last_user_email', auth.currentUser.email);
      }
      localStorage.setItem('reflect_force_select_account', 'false');
      sessionStorage.setItem('reflect_session_timeout', 'true');
      await signOut(auth);
    } catch (error) {
      console.error('Error during session timeout logout:', error);
    }
  }, []);

  const resetTimer = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    
    if (isAuthenticated) {
      timeoutRef.current = setTimeout(handleLogout, SESSION_TIMEOUT_MS);
    }
  }, [isAuthenticated, handleLogout]);

  useEffect(() => {
    if (!isAuthenticated) {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
      return;
    }

    const events = ['mousemove', 'mousedown', 'keydown', 'touchstart', 'scroll'];
    
    // Initial setup
    resetTimer();
    
    // We throttle the resetTimer so it doesn't trigger excessively on every mouse move
    let isThrottled = false;
    const handleActivity = () => {
      if (!isThrottled) {
        resetTimer();
        isThrottled = true;
        setTimeout(() => {
          isThrottled = false;
        }, 1000); // 1 second throttle
      }
    };

    events.forEach((evt) => window.addEventListener(evt, handleActivity, { passive: true }));

    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
      events.forEach((evt) => window.removeEventListener(evt, handleActivity));
    };
  }, [isAuthenticated, resetTimer]);
}
