"use client";

import { useCallback } from 'react';
import { useSocket } from '@/hooks/use-socket';
import { PlayerEntity } from '@/domain/entities';

/**
 * Hook that provides enqueueMint function using Socket.IO
 * Emits request-mint event to server which handles the queue and timing
 */
export function useMintQueue() {
  const socket = useSocket();

  // Export enqueueMint function that emits Socket.IO event
  const enqueueMint = useCallback(async (type: string, player: PlayerEntity | null): Promise<void> => {
    if (!player || !player.suiAddress || !player.id) {
      return;
    }

    if (!socket) {
      return;
    }

    try {
      // Emit request-mint event to server
      // Server will save to DB, wait 10s, then emit mint-now back to client
      socket.emit('request-mint', {
        rewardType: type,
        playerId: player.id,
        playerSuiAddress: player.suiAddress,
      });
    } catch (error) {
    }
  }, [socket]);

  return { enqueueMint };
}

