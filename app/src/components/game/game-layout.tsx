"use client";

import { useGame } from "@/contexts/game-context";
import { GameSidebar } from "./game-sidebar";
import { GameBoard } from "./game-board";
import { GameInfo } from "./game-info";
import GameBlockchain from "./game-blockchain";

interface GameLayoutProps {
  timerPaused?: boolean;
}

export function GameLayout({ timerPaused = false }: GameLayoutProps) {
  const { gameState, isLoading, error } = useGame();

  if (isLoading || error || !gameState) return null;

  return (
    <div className="container mx-auto px-2 sm:px-4 py-4 sm:py-6 lg:py-8">
      <div className="game-layout">
        <GameSidebar />
        <GameBoard />
        <GameInfo timerPaused={timerPaused} />
      </div>
      <div className="mt-4 sm:mt-6">
        <GameBlockchain />
      </div>
    </div>
  );
}