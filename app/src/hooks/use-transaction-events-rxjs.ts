"use client";

import { useEffect } from 'react';
import { useToast } from '@/app/context/toast-provider';
import { useTranslations } from 'next-intl';
import { useSocketRxJS } from './use-socket-rxjs';

/**
 * Hook to handle transaction events using RxJS
 * Subscribes to transaction result observables and shows notifications
 */
export function useTransactionEventsRxJS() {
  const { showSuccess, showError } = useToast();
  const t = useTranslations();
  const { transactionResult$, transactionQueued$, transactionProcessing$, error$ } = useSocketRxJS();

  useEffect(() => {
    // Subscribe to transaction results
    const resultSubscription = transactionResult$.subscribe((result) => {
      if (result.status === 'success') {
        showSuccess(t('toast.transactionSuccess'));
      } else {
        showError(result.error || t('errors.transactionFailed'));
      }
    });

    // Subscribe to transaction queued (optional - for debugging)
    const queuedSubscription = transactionQueued$.subscribe(() => {
      // Could show "Processing..." notification here if desired
    });

    // Subscribe to transaction processing (optional - for debugging)
    const processingSubscription = transactionProcessing$.subscribe(() => {
      // Could update UI state here if desired
    });

    // Subscribe to errors
    const errorSubscription = error$.subscribe((error) => {
      showError(error.error);
    });

    return () => {
      resultSubscription.unsubscribe();
      queuedSubscription.unsubscribe();
      processingSubscription.unsubscribe();
      errorSubscription.unsubscribe();
    };
  }, [transactionResult$, transactionQueued$, transactionProcessing$, error$, showSuccess, showError, t]);
}

