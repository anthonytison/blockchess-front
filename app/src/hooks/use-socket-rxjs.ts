"use client";

import { useEffect, useMemo } from 'react';
import { useCurrentAccount } from '@mysten/dapp-kit';
import { getSocketService } from '@/lib/socket-service';
import { Observable } from 'rxjs';
import { TransactionResult } from '@/types/transactions';

/**
 * Hook to connect to Socket.IO server using RxJS
 * Returns observables for reactive event handling
 */
export function useSocketRxJS() {
  const currentAccount = useCurrentAccount();
  const socketService = useMemo(() => getSocketService(), []);

  useEffect(() => {
    if (!currentAccount?.address) {
      return;
    }

    // Connect to server
    socketService.connect(currentAccount.address);

    return () => {
      // Disconnect on cleanup
      socketService.disconnect(currentAccount.address);
    };
  }, [currentAccount?.address, socketService]);

  return {
    socketService,
    isConnected$: socketService.connection$,
    transactionResult$: socketService.transactionResult$,
    transactionQueued$: socketService.transactionQueued$,
    transactionProcessing$: socketService.transactionProcessing$,
    mintTaskQueued$: socketService.mintTaskQueued$,
    mintError$: socketService.mintError$,
    mintNow$: socketService.mintNow$,
    error$: socketService.error$,
    emit: (eventName: string, data: any) => socketService.emit(eventName, data),
    isConnected: () => socketService.isConnected(),
  };
}

/**
 * Hook to filter transaction results by transaction ID
 */
export function useTransactionResult(transactionId: string): Observable<TransactionResult> {
  const { socketService } = useSocketRxJS();
  return useMemo(
    () => socketService.filterTransactionResult(transactionId),
    [socketService, transactionId]
  );
}

/**
 * Hook to filter transaction results by transaction ID prefix
 */
export function useTransactionResultByPrefix(prefix: string): Observable<TransactionResult> {
  const { socketService } = useSocketRxJS();
  return useMemo(
    () => socketService.filterTransactionResultByPrefix(prefix),
    [socketService, prefix]
  );
}

