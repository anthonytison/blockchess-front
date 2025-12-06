"use client";

// Toast component - displays individual toast notifications
// Simple and discrete, displays in bottom right corner

import { useEffect } from 'react';
import { CheckCircle2, XCircle, Info, X } from 'lucide-react';
import { Toast as ToastType } from '@/lib/toast/types';
import { cn } from '@/lib/utils';

interface ToastProps {
  toast: ToastType;
  onDismiss: (id: string) => void;
}

const toastIcons = {
  success: CheckCircle2,
  error: XCircle,
  info: Info,
};

const toastStyles = {
  success: 'bg-green-50 dark:bg-green-950 border-green-200 dark:border-green-800 text-green-900 dark:text-green-100',
  error: 'bg-red-50 dark:bg-red-950 border-red-200 dark:border-red-800 text-red-900 dark:text-red-100',
  info: 'bg-blue-50 dark:bg-blue-950 border-blue-200 dark:border-blue-800 text-blue-900 dark:text-blue-100',
};

const iconStyles = {
  success: 'text-green-600 dark:text-green-400',
  error: 'text-red-600 dark:text-red-400',
  info: 'text-blue-600 dark:text-blue-400',
};

export function Toast({ toast, onDismiss }: ToastProps) {
  const Icon = toastIcons[toast.type];
  const duration = toast.duration || 3000;

  useEffect(() => {
    const timer = setTimeout(() => {
      onDismiss(toast.id);
    }, duration);

    return () => clearTimeout(timer);
  }, [toast.id, duration, onDismiss]);

  return (
    <div
      className={cn(
        'flex items-center gap-3 rounded-lg border p-4 shadow-lg min-w-[320px] max-w-[420px] transition-all duration-300 ease-in-out animate-slide-in',
        toastStyles[toast.type]
      )}
      role="alert"
    >
      <Icon className={cn('w-5 h-5 flex-shrink-0', iconStyles[toast.type])} />
      <p className="text-sm font-medium flex-1">{toast.message}</p>
      <button
        onClick={() => onDismiss(toast.id)}
        className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors flex-shrink-0"
        aria-label="Dismiss notification"
      >
        <X className="w-4 h-4" />
      </button>
    </div>
  );
}

