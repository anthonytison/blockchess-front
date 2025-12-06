"use client";

import { useTranslations } from "next-intl";

interface LoadingStateProps {
  message?: string;
  className?: string;
}

export function LoadingState({ message, className }: LoadingStateProps) {
  const t = useTranslations();
  const displayMessage = message || t("common.loading");

  return (
    <div className={`text-center py-8 ${className || ""}`}>
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
      <p>{displayMessage}</p>
    </div>
  );
}

