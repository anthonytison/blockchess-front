"use client";

import { useEffect } from 'react';
import { useSocket } from '@/hooks/use-socket';
import { useToast } from '@/app/context/toast-provider';
import { useTranslations } from 'next-intl';

/**
 * Component that listens for Socket.io events and displays notifications
 */
export function SocketListener() {
  const socket = useSocket();
  const { showSuccess, showError } = useToast();
  const t = useTranslations();

  useEffect(() => {
    if (!socket) {
      return;
    }

    // Listen for mint completion events
    // Note: We don't show notification here because mintNft() already shows it
    // This event is just for server-side cleanup and tracking
    socket.on('mint-completed', (data: { rewardName: string; rewardType: string; objectId: string | null }) => {
      // Notification is already shown by mintNft() function, so we don't show it again here
    });

    // Listen for mint task queued events (optional - for debugging)
    socket.on('mint-task-queued', (data: { taskId: string; rewardType: string }) => {
      // Could show a "Processing..." notification here if desired
    });

    // Listen for errors
    socket.on('mint-error', (data: { error: string; rewardType: string }) => {
      showError(data.error || t('errors.mintFailed'));
    });

    return () => {
      socket.off('mint-completed');
      socket.off('mint-task-queued');
      socket.off('mint-error');
    };
  }, [socket, showSuccess, showError, t]);

  return null;
}

