"use client";

import { useGame } from "@/contexts/game-context";
import { CurrentTurnBox } from "@/components/game-info/current-turn-box";
import { CapturedPiecesBox } from "@/components/game-info/captured-pieces-box";
import { useTranslations } from "next-intl";
import { useCurrentAccount } from "@mysten/dapp-kit";
import { GameActions } from "../game-info/actions";
import WalletWarning from "../ui/warning/wallet";

export function GameSidebar() {
  const t = useTranslations('game');
  const currentAccount = useCurrentAccount();
  const { gameState, isReplayMode } = useGame();

  if (!gameState) return null;

  const isGameFinished = gameState.game.winner !== null;
  const currentTurnColor = gameState.boardState.turn === 'w' ? 'white' : 'black';
  const currentPlayer = gameState.players?.find(p => p.color === currentTurnColor) || gameState.players?.[0];

  return (
    <div className="game-sidebar">
      {/* Game Actions */}
      { (currentAccount && !isGameFinished && !isReplayMode) ?
        <GameActions />
        : !currentAccount ? <WalletWarning /> : null
      }

      {/* Current Turn Box - This will update automatically via context */}
      {!isGameFinished &&
        <CurrentTurnBox
          currentPlayer={{
            name: currentPlayer?.name || t('player.unknown'),
            color: currentPlayer?.color || t(`player.${currentTurnColor}`)
          }}
          isCheck={gameState.boardState.isCheck}
          isCheckmate={gameState.boardState.isCheckmate}
        />
      }

      {/* Captured Pieces Box - This will update automatically via context */}
      <CapturedPiecesBox />
    </div>
  );
}