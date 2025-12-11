"use client";

import { useEffect, useRef } from 'react';
import { io, Socket } from 'socket.io-client';
import { useCurrentAccount } from '@mysten/dapp-kit';

/**
 * Hook to connect to Socket.io server and handle player room joining
 */
export function useSocket() {
  const currentAccount = useCurrentAccount();
  const socketRef = useRef<Socket | null>(null);

  useEffect(() => {
    if (!currentAccount?.address) {
      return;
    }

    // Connect to standalone Socket.io server
    const socket = io(
      process.env.NEXT_PUBLIC_WS_SERVER_URL || 'http://localhost:3001',
      {
        path: '/socket.io',
        transports: ['websocket', 'polling'],
      }
    );

    socketRef.current = socket;

    socket.on('connect', () => {
      // Join player room
      socket.emit('join-player-room', currentAccount.address);
    });

    socket.on('disconnect', () => {
    });

    socket.on('connect_error', (error) => {
    });

    return () => {
      if (currentAccount?.address) {
        socket.emit('leave-player-room', currentAccount.address);
      }
      socket.disconnect();
      socketRef.current = null;
    };
  }, [currentAccount?.address]);

  return socketRef.current;
}

