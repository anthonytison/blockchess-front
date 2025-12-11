"use client";

import { useCallback } from 'react';
import { useSocketRxJS } from '@/hooks/use-socket-rxjs';
import { PlayerEntity } from '@/domain/entities';

/**
 * Hook that provides enqueueMint function using RxJS
 * Emits nftMint event to server which handles all validation and queue management
 */
export function useMintQueue() {
  const { emit } = useSocketRxJS();

  /**
   * Request an NFT mint by emitting nftMint event to ws-server
   * The server will:
   * - Check player exists
   * - Check reward exists
   * - Check reward not already minted
   * - Check reward not already in queue
   * - Add reward to queue
   * - Emit mint-task-queued event back to client
   */
  const enqueueMint = useCallback(async (type: string, player: PlayerEntity | null): Promise<void> => {
    if (!player || !player.suiAddress || !player.id) {
      return;
    }

    try {
      // Emit nftMint event to server
      // Server handles all validation and queue management
      emit('nftMint', {
        playerId: player.id,
        playerSuiAddress: player.suiAddress,
        rewardType: type,
      });
    } catch (error) {
      console.error('[useMintQueue] Failed to emit nftMint request', error);
      throw error;
    }
  }, [emit]);

  return { enqueueMint };
}
