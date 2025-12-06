"use client";

import { useGame } from "@/contexts/game-context";
import { Board } from "@/components/board/board";
import { useTranslations } from "next-intl";

export function GameBoard() {

  const t = useTranslations();

  const { gameState, makeMove, currentMoveIndex, isReplayMode, isAiThinking, error } = useGame();

  if (!gameState) return null;

  // Get FEN for current position - this handles replay correctly
  const getCurrentFen = () => {
    if (currentMoveIndex === 0) {
      // Starting position
      return "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1";
    } else if (currentMoveIndex <= gameState.moves.length) {
      // Use the FEN from the specific move
      return gameState.moves[currentMoveIndex - 1]?.fen || gameState.boardState.fen;
    } else {
      // Current live position
      return gameState.boardState.fen;
    }
  };

  const currentFen = getCurrentFen();

  const isGameFinished = gameState.game.winner !== null;
  const currentTurnColor = gameState.boardState.turn === 'w' ? 'white' : 'black';
  const currentPlayer = gameState.players?.find(p => p.color === currentTurnColor) || gameState.players?.[0];

  // Get last move squares for highlighting
  const lastMove = gameState.moves.length > 0 ? gameState.moves[gameState.moves.length - 1] : null;
  const highlightedSquares = lastMove ? [lastMove.from, lastMove.to] : [];

  return (
    <div className="game-board-container">
      <Board
        fen={currentFen}
        onMove={makeMove}
        highlightedSquares={highlightedSquares}
        isFlipped={
          gameState.game.mode === 'solo' 
            ? gameState.humanPlayer?.color === 'black' // In solo mode, flip if human chose black
            : (gameState.game.mode === 'vs' && gameState.boardState.turn === 'b') // In vs mode, flip on black's turn
        }
        playerColor={
          gameState.game.mode === 'solo' 
            ? gameState.humanPlayer?.color || 'white' // Human player's chosen color
            : currentTurnColor // In vs mode, current player's color
        }
        isComputerGame={gameState.game.mode === 'solo'}
        isPlayerTurn={
          isReplayMode 
            ? false // Disable moves in replay mode
            : isAiThinking 
            ? false // Disable moves while AI is thinking
            : gameState.game.mode === 'solo' 
            ? currentPlayer?.isHuman !== false // It's human's turn if current player is human
            : true // In vs mode, always allow moves (both are human)
        }
        className="w-full max-w-full sm:max-w-md md:max-w-lg lg:max-w-2xl aspect-square"
      />
      
      {/* Error Display */}
      {error && (
        <div className="mt-2 sm:mt-4 p-2 sm:p-3 bg-red-100 dark:bg-red-900 border border-red-400 dark:border-red-700 rounded text-red-700 dark:text-red-300 text-xs sm:text-sm">
          {error}
        </div>
      )}
      
      {/* Game Status */}
      <div className="mt-2 sm:mt-4 text-center px-2">
        {isGameFinished ? (
          <div className="text-sm sm:text-base lg:text-lg font-semibold">
            {gameState.game.winner === 'draw' ? (
              <span className="text-yellow-600">{t('game.status.draw')}</span>
            ) : (
              <span className="text-green-600">
                {gameState.game.winner === 'player1' 
                  ? t('game.status.winner', { player: gameState.players?.[0]?.name || t('game.player.player1')})
                  : gameState.game.winner === 'computer'
                  ? t('game.status.winner', { player: `HAL (${gameState.game.difficulty || t('game.setup.difficulty.easy.title')})` })
                  : t('game.status.winner', { player: gameState.players?.[1]?.name || t('game.player.player2')})
                }
              </span>
            )}
          </div>
        ) : isReplayMode ? (
          <div className="text-xs sm:text-sm text-muted-foreground">
            {currentMoveIndex} {t('events.of')} {gameState.moves.length}
          </div>
        ) : isAiThinking ? (
          <div className="text-xs sm:text-sm lg:text-base text-blue-600 font-medium">
            🤖 {t('game.events.computer.thinking')}...
          </div>
        ) : gameState.game.mode === 'solo' && currentPlayer?.isComputer ? (
          <div className="text-xs sm:text-sm lg:text-base text-orange-600 font-medium">
            🤖 {t('game.events.computer.turn')}
          </div>
        ) : null}
      </div>
    </div>
  );
}