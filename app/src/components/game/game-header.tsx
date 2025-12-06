"use client";

import { useGame } from "@/contexts/game-context";
import { useTranslations } from "next-intl";
import Link from "next/link";

interface GameHeaderProps {
  onNavigateAway?: () => void;
}

export function GameHeader({ onNavigateAway }: GameHeaderProps) {
  const t = useTranslations();
  const { gameState } = useGame();

  if (!gameState) return null;

  const isGameFinished = gameState.game.winner !== null;

  const hasTimer: boolean = (gameState.game.timerLimit !== null && gameState.game.timerLimit !== undefined && gameState.game.timerLimit > 0)

  const handleLinkClick = (e: React.MouseEvent<HTMLAnchorElement>) => {
    if (onNavigateAway && !isGameFinished && hasTimer) {
      e.preventDefault();
      onNavigateAway();
    }
  };

  return (
    <section>
      <div className="container mx-auto px-4 py-4 flex justify-between items-center">
        <div className="flex w-full items-center gap-4 justify-between">
          <Link 
            href="/" 
            className="text-black hover:text-gray-800 dark:text-white dark:hover:text-gray-200 transition-colors"
            onClick={handleLinkClick}
          >
            ← {t('navigation.back')}
          </Link>
          <div className="">
            <h1 className="text-2xl font-bold">
            {gameState.players[0]?.name === "Andy" ? "☠️ " : ""}{gameState.players[0]?.name || t('game.player.player1')} vs {gameState.players[1]?.name === "Andy" ? "☠️ " : ""}{gameState.players[1]?.name || t('game.player.player2')}
            </h1>
            <p className="text-sm text-muted-foreground">
              {gameState.game.mode === 'solo' 
                ? `${t('game.soloGame')}${gameState.game.difficulty ? ` - ${t(`game.setup.difficulty.${gameState.game.difficulty}.title`)}` : ''}` 
                : t('game.versusGame')}
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}