"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { GameProvider, useGame } from "@/contexts/game-context";
import { GameHeader } from "@/components/game/game-header";
import { GameLayout } from "@/components/game/game-layout";
import { GameLoading } from "@/components/game/game-loading";
import { GameError } from "@/components/game/game-error";
import WalletWarning from "@/components/ui/warning/wallet";
import { LeaveGameConfirmation } from "@/components/game/leave-game-confirmation";
import { usePageLeaveDetection } from "@/hooks/use-page-leave-detection";

function GameContent() {
  const router = useRouter();
  const { gameState, forfeitGame, isReplayMode, isLoading } = useGame();
  const [showLeaveModal, setShowLeaveModal] = useState(false);
  const [shouldForfeit, setShouldForfeit] = useState(false);
  const [isForfeiting, setIsForfeiting] = useState(false);
  const shouldReloadRef = useRef(false);

  const isGameFinished = gameState?.game.winner !== null;
  const hasTimer = (gameState?.game.timerLimit || 0) > 0;
  // Only enable when game is loaded, has timer, not finished, and not in replay mode
  const shouldShowWarning = !isLoading && !!gameState && !isGameFinished && !isReplayMode && hasTimer;

  const handleAttemptLeave = useCallback((isRefresh = false) => {
    if (shouldShowWarning && !showLeaveModal) {
      shouldReloadRef.current = isRefresh;
      setShowLeaveModal(true);
    }
  }, [shouldShowWarning, showLeaveModal]);

  usePageLeaveDetection({
    enabled: shouldShowWarning,
    onAttemptLeave: handleAttemptLeave,
  });

  const handleConfirmLeave = async () => {
    setShowLeaveModal(false);
    sessionStorage.removeItem('pendingLeave');
    setShouldForfeit(true);
    setIsForfeiting(true);
    
    try {
      // Call forfeit - it will update the game state asynchronously
      await forfeitGame();
    } catch (error) {
      console.error('Error forfeiting game:', error);
      // Even if forfeit fails, we should still navigate away
      // The game state might still update from the error handler
      // Wait a bit for any state updates, then navigate
      setTimeout(() => {
        if (shouldReloadRef.current) {
          window.location.reload();
        } else {
          router.push('/');
        }
      }, 2000);
    }
  };

  const handleCancelLeave = () => {
    setShowLeaveModal(false);
    // Remove pending leave flag if user cancels
    sessionStorage.removeItem('pendingLeave');
    // For back button: State was already pushed back in popstate handler
    // For refresh: Since we don't preventDefault, page reload was allowed but user canceled
    // For link: Navigation was prevented in click handler
  };

  // Check on mount if there was a pending leave (page was refreshed)
  useEffect(() => {
    const pendingLeave = sessionStorage.getItem('pendingLeave');
    if (pendingLeave === 'true' && shouldShowWarning && !showLeaveModal) {
      // User refreshed the page - forfeit the game
      sessionStorage.removeItem('pendingLeave');
      setShouldForfeit(true);
      setIsForfeiting(true);
      forfeitGame();
    }
  }, [shouldShowWarning, showLeaveModal, forfeitGame]);

  // Navigate away after forfeit completes and game state updates
  useEffect(() => {
    if (isForfeiting && isGameFinished) {
      setIsForfeiting(false);
      setShouldForfeit(false);
      
      // Small delay to ensure database update is complete
      setTimeout(() => {
        if (shouldReloadRef.current) {
          window.location.reload();
        } else {
          router.push('/');
        }
      }, 500);
    }
  }, [isForfeiting, isGameFinished, router]);

  return (
    <>
      <div className="min-h-screen flex flex-col">
        <div className={showLeaveModal ? 'blur-sm pointer-events-none' : ''}>
          <GameHeader onNavigateAway={handleAttemptLeave} />
          <div className="flex-1">
            <GameLoading />
            <GameError />
            <GameLayout timerPaused={showLeaveModal} />
          </div>
        </div>
      </div>
      <LeaveGameConfirmation
        open={showLeaveModal}
        onConfirm={handleConfirmLeave}
        onCancel={handleCancelLeave}
      />
    </>
  );
}

export function GamePlayContent() {
  const params = useParams();
  const gameId = params.id as string;

  return (
    <GameProvider gameId={gameId}>
      <GameContent />
    </GameProvider>
  );
}

