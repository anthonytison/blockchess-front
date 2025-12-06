"use client";

import { useGame } from "@/contexts/game-context";
import { ErrorState } from "@/components/ui/error-state";

export function GameError() {
  const { error } = useGame();

  if (!error) return null;

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <ErrorState error={error} />
    </div>
  );
}