"use client";

import { useState, useEffect, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Clock, 
  // Play, Pause 
} from "lucide-react";
// import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useTranslations } from "next-intl";
import { useGame } from "@/contexts/game-context";

interface TimerBoxProps {
  initialTime?: number; // in seconds
  isActive?: boolean;
  paused?: boolean; // When true, timer is paused even if isActive is true
  onTimeUp?: () => void;
  currentPlayer?: string;
  className?: string;
}

export function TimerBox({ 
  initialTime = 0, 
  isActive = false,
  paused = false,
  onTimeUp,
  currentPlayer = "Player",
  className 
}: TimerBoxProps) {

  const t = useTranslations('game')

  const { gameState } = useGame();

  if (!gameState) return null;

  const isGameFinished = gameState.game.winner !== null;
  

  const [timeLeft, setTimeLeft] = useState(initialTime);
  const [isRunning, setIsRunning] = useState(isActive && !paused);
  const prevCurrentPlayerRef = useRef(currentPlayer);
  const prevInitialTimeRef = useRef(initialTime);

  useEffect(() => {
    // Reset timer when player changes (turn changes) or initialTime changes
    if (
      (prevCurrentPlayerRef.current !== currentPlayer || prevInitialTimeRef.current !== initialTime) &&
      initialTime > 0
    ) {
      setTimeLeft(initialTime);
      prevCurrentPlayerRef.current = currentPlayer;
      prevInitialTimeRef.current = initialTime;
    }
  }, [currentPlayer, initialTime]);

  useEffect(() => {
    setIsRunning(isActive && !paused);
  }, [isActive, paused]);

  useEffect(() => {
    let interval: NodeJS.Timeout;

    if (isRunning && timeLeft > 0) {
      interval = setInterval(() => {
        setTimeLeft((prev) => {
          if (prev <= 1) {
            setIsRunning(false);
            onTimeUp?.();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }

    return () => {
      if (interval) {
        clearInterval(interval);
      }
    };
  }, [isRunning, timeLeft, onTimeUp]);

  const formatTime = (seconds: number) => {
    if (seconds === 0 && initialTime === 0) {
      return t('timer.noTimer');
    }

    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;

    if (hours > 0) {
      return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
    return `${minutes}:${secs.toString().padStart(2, '0')}`;
  };

  const getTimeColor = () => {
    if (initialTime === 0) return 'secondary';
    if (timeLeft <= 30) return 'destructive';
    if (timeLeft <= 60) return 'default';
    return 'secondary';
  };
  
  if (initialTime === 0) {
    return (
      <Card className={cn("w-full", className)}>
        <CardHeader className="pb-2 sm:pb-3">
          <CardTitle className="text-base sm:text-lg flex items-center">
            <Clock className="w-4 h-4 sm:w-5 sm:h-5 mr-2" />
            {t('timer.title')}
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-0">
          <div className="text-center">
            <Badge variant="secondary" className="text-xs sm:text-sm">{t('timer.noTimer')}</Badge>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={cn("w-full", className)}>
      <CardHeader className="pb-2 sm:pb-3">
        <CardTitle className="text-base sm:text-lg flex items-center justify-between">
          <div className="flex items-center">
            <Clock className="w-4 h-4 sm:w-5 sm:h-5 mr-2" />
            <span className="text-sm sm:text-base">Timer</span>
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-0">
        <div className="text-center space-y-1 sm:space-y-2">
          <Badge variant={getTimeColor()} className="text-base sm:text-lg px-2 sm:px-3 py-1">
            {formatTime(timeLeft)}
          </Badge>
          {!isGameFinished &&
            <>
            <p className="text-xs sm:text-sm text-muted-foreground">
              {t('timer.turn', {player: currentPlayer})}
            </p>
            {timeLeft <= 30 && timeLeft > 0 && (
              <p className="text-xs text-red-600 dark:text-red-400 font-medium">
              {t('timer.runningOut')}
              </p>
            )}
            </>
          }
        </div>
      </CardContent>
    </Card>
  );
}