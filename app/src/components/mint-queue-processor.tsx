"use client";

import { useEffect, useRef, useCallback } from 'react';
import { useBlockchain } from '@/hooks/blockchain';
import { useCurrentAccount } from '@mysten/dapp-kit';
import { useSocket } from '@/hooks/use-socket';
import { PlayerEntity } from '@/domain/entities';

interface MintTask {
  taskId: string;
  rewardType: string;
  playerId: string;
  playerSuiAddress: string;
}

/**
 * Component that processes mint queue via Socket.IO
 * Uses a queue to process mint-now events sequentially
 */
export function MintQueueProcessor() {
  const { mintNft } = useBlockchain();
  const currentAccount = useCurrentAccount();
  const socket = useSocket();
  const queueRef = useRef<MintTask[]>([]);
  const isProcessingRef = useRef(false);

  // Process the queue sequentially
  const processQueue = useCallback(async () => {
    if (isProcessingRef.current || queueRef.current.length === 0 || !mintNft) {
      return;
    }

    isProcessingRef.current = true;

    while (queueRef.current.length > 0) {
      const task = queueRef.current.shift();
      if (!task) break;

      // Only process if it's for the current user
      if (task.playerSuiAddress !== currentAccount?.address) {
        continue;
      }

      try {
        const player: PlayerEntity = {
          id: task.playerId,
          suiAddress: task.playerSuiAddress,
        } as PlayerEntity;

        console.log(`[MintQueueProcessor] Attempting to mint ${task.rewardType} for player ${task.playerId}`);
        
        // Call mintNft directly (this will show notifications automatically)
        const objectId = await mintNft(task.rewardType, player);

        console.log(`[MintQueueProcessor] Successfully minted ${task.rewardType}, objectId: ${objectId}`);

        // Emit Socket.IO event to notify server that mint is completed
        if (socket) {
          socket.emit('mint-completed', {
            taskId: task.taskId,
            objectId: objectId || '',
            success: true,
          });
        }

        // Small delay before processing next task
        if (queueRef.current.length > 0) {
          await new Promise(resolve => setTimeout(resolve, 1000));
        }
      } catch (error: any) {
        const errorMessage = error?.message || error?.toString() || 'Unknown error';
        console.error(`[MintQueueProcessor] Failed to mint ${task.rewardType} for player ${task.playerId}:`, errorMessage);
        console.error('[MintQueueProcessor] Full error:', error);
        
        // Emit Socket.IO event to notify server that mint failed
        if (socket) {
          socket.emit('mint-completed', {
            taskId: task.taskId,
            objectId: '',
            success: false,
            errorMessage: errorMessage,
          });
        }

        // Continue with next task even if this one failed
        if (queueRef.current.length > 0) {
          await new Promise(resolve => setTimeout(resolve, 1000));
        }
      }
    }

    isProcessingRef.current = false;
  }, [mintNft, currentAccount?.address, socket]);

  // Handle mint-now events from server - add to queue
  const handleMintNow = useCallback((data: MintTask) => {
    // Only queue if it's for the current user
    if (data.playerSuiAddress !== currentAccount?.address) {
      return;
    }

    queueRef.current.push(data);
    
    // Start processing if not already processing
    processQueue();
  }, [currentAccount?.address, processQueue]);

  // Listen for mint-now events from Socket.IO server
  useEffect(() => {
    if (!socket || !currentAccount?.address) {
      return;
    }

    socket.on('mint-now', handleMintNow);

    return () => {
      socket.off('mint-now', handleMintNow);
    };
  }, [socket, currentAccount?.address, handleMintNow]);

  return null;
}

