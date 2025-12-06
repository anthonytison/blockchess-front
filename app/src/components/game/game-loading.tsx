"use client";

import { useGame } from "@/contexts/game-context";
import { useTranslations } from "next-intl";

export function GameLoading() {

  const t = useTranslations('game');

  const { isLoading } = useGame();

  if (!isLoading) return null;

  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
        <p>{t('loading')}...</p>
      </div>
    </div>
  );
}