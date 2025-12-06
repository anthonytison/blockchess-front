"use client";

import { useEffect, useRef } from 'react';

interface UsePageLeaveDetectionOptions {
  enabled: boolean;
  onAttemptLeave: (isRefresh?: boolean) => void;
}

/**
 * Hook to detect page navigation attempts (refresh, back button)
 * Based on Vercel's pattern: https://vercel.com/kb/guide/leave-page-confirmation-dialog-before-unload-nextjs-react
 * 
 * Note: For refresh, we show browser's native dialog (required by browser security).
 * For back button, we show a custom modal.
 */
export function usePageLeaveDetection({ 
  enabled, 
  onAttemptLeave 
}: UsePageLeaveDetectionOptions): void {
  const onAttemptLeaveRef = useRef(onAttemptLeave);
  const enabledRef = useRef(enabled);
  const hasPushedStateRef = useRef(false);

  // Keep refs updated
  useEffect(() => {
    onAttemptLeaveRef.current = onAttemptLeave;
  }, [onAttemptLeave]);

  useEffect(() => {
    enabledRef.current = enabled;
  }, [enabled]);

  // Handle refresh/close - show modal but don't prevent (to avoid browser dialog)
  // Store intent in sessionStorage if user refreshes anyway
  useEffect(() => {
    if (!enabled) return;

    function handleBeforeUnload(e: BeforeUnloadEvent) {
      // Show our modal immediately (pass true to indicate it's a refresh)
      onAttemptLeaveRef.current(true);
      
      // Store that user attempted to leave (for handling on reload if they do)
      sessionStorage.setItem('pendingLeave', 'true');
      
      // Prevent reload to give modal time to show
      // If user confirms in modal, we'll reload manually after forfeit
      // Note: This will show browser dialog, but our modal shows first
      // Modern browsers may suppress dialog if returnValue is not set,
      // but we need preventDefault to block reload so modal can show
      e.preventDefault();
      // Set empty string - some browsers won't show dialog with empty returnValue
      e.returnValue = '';
      return '';
    }

    window.addEventListener('beforeunload', handleBeforeUnload);

    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [enabled]);

  // Handle back button - custom modal
  useEffect(() => {
    // Define handler outside so we can reference it in cleanup
    const handlePopState = (e: PopStateEvent) => {
      // Only block if we're still enabled
      if (!enabledRef.current || !hasPushedStateRef.current) {
        // If disabled, allow navigation to proceed normally
        return;
      }

      // Check if user tried to navigate away from our blocking state
      const state = e.state;
      if (!state || !state.preventBack) {
        // Immediately block the navigation by replacing state
        window.history.replaceState({ preventBack: true }, '', window.location.href);
        // Show our custom modal
        onAttemptLeaveRef.current();
      }
    };

    if (!enabled) {
      // When disabled, remove listener and clean up blocking state
      window.removeEventListener('popstate', handlePopState);
      
      // Clean up any blocking state we created
      const currentState = window.history.state;
      if (currentState && currentState.preventBack) {
        // Replace the blocking state with null to allow normal navigation
        window.history.replaceState(null, '', window.location.href);
      }
      
      hasPushedStateRef.current = false;
      return () => {
        // Ensure listener is removed on cleanup
        window.removeEventListener('popstate', handlePopState);
      };
    }

    // Use replaceState instead of pushState to avoid adding extra history entries
    // This way we can clean it up more easily when disabled
    if (!hasPushedStateRef.current) {
      // Check if current state is already our blocking state
      const currentState = window.history.state;
      if (!currentState || !currentState.preventBack) {
        window.history.replaceState({ preventBack: true }, '', window.location.href);
      }
      hasPushedStateRef.current = true;
    }

    window.addEventListener('popstate', handlePopState);

    return () => {
      window.removeEventListener('popstate', handlePopState);
      // Reset flag when effect cleans up or when disabled
      hasPushedStateRef.current = false;
    };
  }, [enabled]);
}
