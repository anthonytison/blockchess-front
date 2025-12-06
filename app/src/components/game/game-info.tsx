"use client";

import { useGame } from "@/contexts/game-context";
import { TimerBox } from "@/components/game-info/timer-box";
import { MoveHistory } from "@/components/game-info/move-history";
import { ReplayControls } from "@/components/game-info/replay-controls";
import { WalletNotice } from "@/components/game-info/wallet-notice";
import { useTranslations } from "next-intl";

interface GameInfoProps {
  timerPaused?: boolean;
}

export function GameInfo({ timerPaused = false }: GameInfoProps) {

  const t = useTranslations();

  const { gameState, isReplayMode, forfeitGame } = useGame();

  if (!gameState) return null;

  const isGameFinished = gameState.game.winner !== null;
  const currentTurnColor = gameState.boardState.turn === 'w' ? 'white' : 'black';
  const currentPlayer = gameState.players?.find(p => p.color === currentTurnColor) || gameState.players?.[0];

  const handleTimeUp = async () => {
    console.log('Timer expired - forfeiting game for current player');
    try {
      await forfeitGame();
    } catch (error) {
      console.error('Error in handleTimeUp:', error);
    }
  };

  return (
    <div className="game-info">
      {/* Wallet Notice - Shows when AI is making a move */}
      {/* <WalletNotice /> */}

      {/* Timer Box - This will update automatically via context */}
      <TimerBox
        initialTime={gameState.game.timerLimit || 0}
        isActive={!isGameFinished && !isReplayMode}
        paused={timerPaused}
        currentPlayer={currentPlayer?.name || t('game.player.unknown')}
        onTimeUp={handleTimeUp}
      />

      {/* Move History - This will update automatically via context */}
      <MoveHistory />

      {/* Replay Controls - This will update automatically via context */}
      {gameState.moves.length > 0 && <ReplayControls />}
    </div>
  );
}