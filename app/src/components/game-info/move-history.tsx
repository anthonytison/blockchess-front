"use client";

import { useGame } from "@/contexts/game-context";
import { useTranslations } from "next-intl";

export function MoveHistory() {
  const t = useTranslations()

  const { gameState, currentMoveIndex, goToMove } = useGame();

  if (!gameState) return null;

  return (
    <div className="rounded-lg border bg-card text-card-foreground shadow-sm">
      <div className="flex flex-col space-y-1.5 p-4 sm:p-6">
        <h3 className="text-base sm:text-lg font-semibold leading-none tracking-tight">{t('game.controls.movesHistory')}</h3>
      </div>
      <div className="p-4 sm:p-6 pt-0">
        <div className="max-h-48 sm:max-h-64 overflow-y-auto space-y-1">
          {gameState.moves.length === 0 ? (
            <p className="text-muted-foreground text-sm">{t('game.status.noMoves')}</p>
          ) : (
            gameState.moves.map((move, index) => {
              const moveNumber = Math.floor(index / 2) + 1;
              const isWhiteMove = index % 2 === 0;
              const playerColor = move.playerColor || (isWhiteMove ? 'white' : 'black');
              
              // Determine player name based on game mode and color
              let playerName = '';
              if (gameState.game.mode === 'solo') {
                const player1Color = gameState.game.player1Color || t('game.player.white');
                if (playerColor === player1Color) {
                  playerName = gameState.game.player1.name || t('game.player.you');
                } else {
                  playerName = `HAL (${t(`game.setup.difficulty.${gameState.game.difficulty}.title`).toLowerCase() || t('game.setup.difficulty.easy.title')})`;
                }
              } else {
                if (playerColor === 'white') {
                  playerName = gameState.game.player1Color === 'white' 
                    ? (gameState.game.player1.name || t('game.player.player1'))
                    : (gameState.game.player2?.name || t('game.player.player2'));
                } else {
                  playerName = gameState.game.player1Color === 'black' 
                    ? (gameState.game.player1.name || t('game.player.player1'))
                    : (gameState.game.player2?.name || t('game.player.player2'));
                }
              }

              return (
                <button
                  key={index}
                  onClick={() => goToMove(index + 1)}
                  className={`w-full text-left px-2 py-1 rounded text-xs sm:text-sm hover:bg-muted transition-colors ${
                    currentMoveIndex === index + 1 ? 'bg-muted' : ''
                  }`}
                >
                  <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-1 sm:gap-0">
                    <span className="break-words">
                      {moveNumber}.{isWhiteMove ? '' : '..'} {move.san}
                    </span>
                    <span className={`text-xs px-1.5 py-0.5 rounded flex-shrink-0 ${
                      playerColor === 'white' 
                        ? 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200' 
                        : 'bg-gray-800 text-gray-100 dark:bg-gray-200 dark:text-gray-800'
                    }`}>
                      {playerName}
                    </span>
                  </div>
                </button>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}