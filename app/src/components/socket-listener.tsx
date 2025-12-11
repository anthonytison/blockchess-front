"use client";

import { useEffect } from 'react';
import { useCurrentAccount } from '@mysten/dapp-kit';
import { useToast } from '@/app/context/toast-provider';
import { useTranslations } from 'next-intl';
import { useTransactionEventsRxJS } from '@/hooks/use-transaction-events-rxjs';
import { useSocketRxJS } from '@/hooks/use-socket-rxjs';
import { filter } from 'rxjs/operators';
import { rewardsList } from '@/lib/blockchain/rewards';

/**
 * Component that listens for Socket.io events and displays notifications
 * Uses RxJS for reactive event handling
 */
export function SocketListener() {
  const { showSuccess, showError } = useToast();
  const t = useTranslations();
  const currentAccount = useCurrentAccount();
  const { mintTaskQueued$, mintError$, transactionResult$ } = useSocketRxJS();

  // Use transaction events hook for centralized transaction result handling
  useTransactionEventsRxJS();

  useEffect(() => {
    // Subscribe to mint task queued events - show info toast
    const queuedSubscription = mintTaskQueued$
      .pipe(
        filter((data) => data.playerSuiAddress === currentAccount?.address)
      )
      .subscribe((data) => {
        const reward = rewardsList.find((r) => r.nft.badge_type === data.rewardType);
        if (reward) {
          // Optionally show a "Processing..." notification
          // showSuccess(t('toast.mintQueued', { type: reward.nft.name }));
        }
      });

    // Subscribe to mint errors
    const errorSubscription = mintError$.subscribe((data) => {
      showError(data.error || t('errors.mintFailed'));
    });

    // Subscribe to transaction results for mint_nft transactions
    const transactionSubscription = transactionResult$
      .pipe(
        filter((result) => {
          // Only handle mint_nft transactions
          return result.transactionId?.startsWith('mint_nft-') || false;
        }),
        filter((result) => {
          // Only handle results for current user (if we can determine from transactionId)
          return true; // We'll check in the handler
        })
      )
      .subscribe((result) => {
        if (result.status === 'success') {
          // Use rewardName from result if available, otherwise try to find by badgeType or transactionId
          let rewardName: string | undefined;
          
          if ((result as any).rewardName) {
            rewardName = (result as any).rewardName;
          } else if ((result as any).badgeType) {
            const reward = rewardsList.find((r) => r.nft.badge_type === (result as any).badgeType);
            rewardName = reward?.nft.name;
          } else {
            // Fallback: extract badge type from transactionId
            // Format: mint_nft-{playerId}-{badgeType}-{timestamp}-{random}
            const parts = result.transactionId.split('-');
            if (parts.length >= 3) {
              const badgeType = parts[2];
              const reward = rewardsList.find((r) => r.nft.badge_type === badgeType);
              rewardName = reward?.nft.name;
            }
          }
          
          if (rewardName) {
            showSuccess(t('toast.nftMinted', { type: rewardName }));
          } else {
            showSuccess(t('toast.nftMinted', { type: 'NFT' }));
          }
        } else if (result.status === 'error') {
          console.error(`[SocketListener] NFT mint failed: ${result.error}`);
          showError(result.error || t('errors.mintFailed'));
        }
      });

    return () => {
      queuedSubscription.unsubscribe();
      errorSubscription.unsubscribe();
      transactionSubscription.unsubscribe();
    };
  }, [mintTaskQueued$, mintError$, transactionResult$, currentAccount?.address, showSuccess, showError, t]);

  return null;
}

