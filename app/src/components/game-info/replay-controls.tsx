"use client";

import { useGame } from "@/contexts/game-context";
import { useTranslations } from "next-intl";

export function ReplayControls() {
  const t = useTranslations()

  const { gameState, currentMoveIndex, isReplayMode, goToMove, goToCurrentPosition } = useGame();

  if (!gameState) return null;

  return (
    <div className="rounded-lg border bg-card text-card-foreground shadow-sm">
      <div className="flex flex-col space-y-1.5 p-4 sm:p-6">
        <h3 className="text-base sm:text-lg font-semibold leading-none tracking-tight">{t('game.controls.replayControls')}</h3>
      </div>
      <div className="p-4 sm:p-6 pt-0 space-y-3 sm:space-y-4">
        <div className="flex gap-2">
          <button
            className="inline-flex items-center justify-center rounded-md text-xs sm:text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 border border-input bg-background hover:bg-accent hover:text-accent-foreground min-h-[44px] min-w-[44px] sm:h-9 sm:px-3 flex-1 sm:flex-none"
            onClick={() => goToMove(Math.max(0, currentMoveIndex - 1))}
            disabled={currentMoveIndex === 0}
            aria-label={t('game.controls.stepBack')}
          >
            ⟲
          </button>
          <button
            className="inline-flex items-center justify-center rounded-md text-xs sm:text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 border border-input bg-background hover:bg-accent hover:text-accent-foreground min-h-[44px] min-w-[44px] sm:h-9 sm:px-3 flex-1 sm:flex-none"
            onClick={() => goToMove(Math.min(gameState.moves.length, currentMoveIndex + 1))}
            disabled={currentMoveIndex === gameState.moves.length}
            aria-label={t('game.controls.stepForward')}
          >
            ⟳
          </button>
          {isReplayMode && (
            <button
              className="inline-flex items-center justify-center rounded-md text-xs sm:text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 border border-input bg-background hover:bg-accent hover:text-accent-foreground min-h-[44px] min-w-[44px] sm:h-9 sm:px-3 flex-1 sm:flex-none"
              onClick={goToCurrentPosition}
              aria-label={t('game.controls.goToCurrent')}
            >
              ▶
            </button>
          )}
        </div>
        
        {/* Move slider */}
        <div className="space-y-2">
          <input
            type="range"
            min="0"
            max={gameState.moves.length}
            value={currentMoveIndex}
            onChange={(e) => goToMove(parseInt(e.target.value))}
            className="w-full"
          />
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>{t('game.controls.start')}</span>
            <span className="text-center">{t('game.controls.move')} {currentMoveIndex}</span>
            <span>{t('game.controls.current')}</span>
          </div>
        </div>
      </div>
    </div>
  );
}