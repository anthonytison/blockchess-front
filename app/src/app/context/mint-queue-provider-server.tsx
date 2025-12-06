"use client";

// Server-side Mint Queue Provider
// Uses Socket.IO for real-time mint queue processing
// Makes the queue available throughout the app via context

import { createContext, useContext, ReactNode } from 'react';
import { useSocket } from '@/hooks/use-socket';
import { PlayerEntity } from '@/domain/entities';

interface MintQueueContextType {
  enqueueMint: (type: string, player: PlayerEntity | null) => Promise<void>;
  getQueueLength: () => number;
  isProcessing: () => boolean;
  getDebugInfo: () => {
    isInitialized: boolean;
    hasMintFunction: boolean;
    queueLength: number;
    isProcessing: boolean;
    localStorageContent: string | null;
  };
  processNow: () => Promise<void>;
}

const MintQueueContext = createContext<MintQueueContextType | undefined>(undefined);

export function MintQueueProvider({ children }: { children: ReactNode }) {
  const socket = useSocket();

  const enqueueMint = async (type: string, player: PlayerEntity | null): Promise<void> => {
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
  };

  const getQueueLengthValue = () => {
    // Queue length is now managed by server, return 0 as placeholder
    // Can be enhanced later if needed
    return 0;
  };

  const isProcessingValue = () => {
    // Processing state is now handled by MintQueueProcessor component
    return false;
  };

  const getDebugInfo = () => {
    return {
      isInitialized: true,
      hasMintFunction: true,
      queueLength: 0,
      isProcessing: false,
      localStorageContent: null,
    };
  };

  const processNow = async () => {
    // Processing is now handled automatically by Socket.IO events
  };

  return (
    <MintQueueContext.Provider value={{ 
      enqueueMint, 
      getQueueLength: getQueueLengthValue, 
      isProcessing: isProcessingValue, 
      getDebugInfo, 
      processNow 
    }}>
      {children}
    </MintQueueContext.Provider>
  );
}

export function useMintQueue() {
  const context = useContext(MintQueueContext);
  if (context === undefined) {
    throw new Error('useMintQueue must be used within a MintQueueProvider');
  }
  return context;
}

