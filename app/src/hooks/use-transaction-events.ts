"use client";

import { useEffect } from 'react';
import { Socket } from 'socket.io-client';
import { useToast } from '@/app/context/toast-provider';
import { useTranslations } from 'next-intl';
import { TransactionResult } from '@/types/transactions';
import { updateGameObjectId } from '@/app/actions/game';

export function useTransactionEvents(socket: Socket | null) {
  const { showSuccess, showError } = useToast();
  const t = useTranslations();

  useEffect(() => {
    if (!socket) return;

    const handleTransactionResult = async (result: TransactionResult) => {
      if (result.status === 'success') {
        // Handle success
        if (result.objectId) {
          // Extract gameId from transactionId if it's a create_game transaction
          // The transactionId format from game-setup-wizard is: `tx-${Date.now()}-${random}`
          // We need to track gameId separately - for now, we'll handle it in the components
          // that emit the transaction
        }
        
        // Show success notification
        showSuccess(t('toast.transactionSuccess'));
      } else {
        // Handle error
        showError(result.error || t('errors.transactionFailed'));
      }
    };

    const handleQueued = (data: { transactionId: string; status: string }) => {
      // Optional: Show "Processing..." notification
    };

    const handleProcessing = (data: { transactionId: string; status: string }) => {
      // Optional: Update UI state
    };

    const handleError = (error: { error: string; transactionId?: string }) => {
      showError(error.error);
    };

    socket.on('transaction:result', handleTransactionResult);
    socket.on('transaction:queued', handleQueued);
    socket.on('transaction:processing', handleProcessing);
    socket.on('error', handleError);

    return () => {
      socket.off('transaction:result', handleTransactionResult);
      socket.off('transaction:queued', handleQueued);
      socket.off('transaction:processing', handleProcessing);
      socket.off('error', handleError);
    };
  }, [socket, showSuccess, showError, t]);
}

