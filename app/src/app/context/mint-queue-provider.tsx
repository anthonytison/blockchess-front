"use client";

// Mint Queue Provider
// Initializes the mint queue service with the mint function from useBlockchain
// Makes the queue available throughout the app via context

import { createContext, useContext, useEffect, ReactNode, useState } from 'react';
import { useBlockchain } from '@/hooks/blockchain';
import { mintQueue } from '@/lib/mint-queue';

interface MintQueueContextType {
  enqueueMint: (type: string, player: any) => Promise<void>;
  getQueueLength: () => number;
  isProcessing: () => boolean;
  getDebugInfo: () => {
    isInitialized: boolean;
    hasMintFunction: boolean;
    queueLength: number;
    isProcessing: boolean;
    hasInterval: boolean;
    localStorageContent: string | null;
  };
  processNow: () => Promise<void>;
}

const MintQueueContext = createContext<MintQueueContextType | undefined>(undefined);

// Inner component that uses the blockchain hooks
function MintQueueProviderInner({ children }: { children: ReactNode }) {
  const { mintNft } = useBlockchain();

  useEffect(() => {
    // Initialize the queue with the mint function once it's available
    if (mintNft) {
      console.log('[MintQueueProvider] Initializing queue with mint function');
      mintQueue.initialize(mintNft);
      
      // Log debug info after initialization
      const debugInfo = mintQueue.getDebugInfo();
      console.log('[MintQueueProvider] Queue initialized:', debugInfo);
      
      // Process any existing queue items after initialization
      // Don't call processNow() here - let the interval handle it
      // This prevents multiple simultaneous processing attempts
    } else {
      console.warn('[MintQueueProvider] mintNft is not available yet');
    }

    // Cleanup on unmount
    return () => {
      mintQueue.stop();
    };
  }, [mintNft]);

  const enqueueMint = async (type: string, player: any) => {
    await mintQueue.enqueue(type, player);
  };

  const getQueueLength = () => {
    return mintQueue.getQueueLength();
  };

  const isProcessing = () => {
    return mintQueue.isProcessing();
  };

  const getDebugInfo = () => {
    return mintQueue.getDebugInfo();
  };

  const processNow = () => {
    return mintQueue.processNow();
  };

  return (
    <MintQueueContext.Provider value={{ enqueueMint, getQueueLength, isProcessing, getDebugInfo, processNow }}>
      {children}
    </MintQueueContext.Provider>
  );
}

// Outer wrapper that ensures we're on the client before using blockchain hooks
export function MintQueueProvider({ children }: { children: ReactNode }) {
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
  }, []);

  // Only render the inner provider when we're on the client
  // The inner provider will handle the WalletProvider requirement
  if (!isClient) {
    // Return a fallback provider that doesn't require blockchain hooks during SSR
    const enqueueMint = async (type: string, player: any) => {
      await mintQueue.enqueue(type, player);
    };

    const getQueueLength = () => mintQueue.getQueueLength();
    const isProcessing = () => mintQueue.isProcessing();
    const getDebugInfo = () => mintQueue.getDebugInfo();
    const processNow = () => mintQueue.processNow();

    return (
      <MintQueueContext.Provider value={{ enqueueMint, getQueueLength, isProcessing, getDebugInfo, processNow }}>
        {children}
      </MintQueueContext.Provider>
    );
  }

  // On client side, try to render the inner provider
  // If WalletProvider is not available, it will throw, but since we're inside SuiProviders,
  // it should be available. If it's not, the error will be caught by error boundaries.
  return <MintQueueProviderInner>{children}</MintQueueProviderInner>;
}

export function useMintQueue() {
  const context = useContext(MintQueueContext);
  if (context === undefined) {
    throw new Error('useMintQueue must be used within a MintQueueProvider');
  }
  return context;
}

