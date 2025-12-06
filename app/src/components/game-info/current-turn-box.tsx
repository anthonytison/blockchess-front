"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useTranslations } from 'next-intl';
import { cn } from "@/lib/utils";

interface CurrentTurnBoxProps {
  currentPlayer: {
    name: string;
    color: 'white' | 'black';
  };
  isCheck?: boolean;
  isCheckmate?: boolean;
  className?: string;
}

export function CurrentTurnBox({ 
  currentPlayer, 
  isCheck = false, 
  isCheckmate = false,
  className 
}: CurrentTurnBoxProps) {
  const t = useTranslations('game');

  const getStatusColor = () => {
    if (isCheckmate) return 'destructive';
    if (isCheck) return 'default';
    return 'secondary';
  };

  const getStatusText = () => {
    if (isCheckmate) return t('status.checkmate');
    if (isCheck) return t('status.check');
    return '';
  };

  return (
    <Card className={cn("w-full", className)}>
      <CardHeader className="pb-2 sm:pb-3">
        <CardTitle className="text-base sm:text-lg flex items-center justify-between flex-wrap gap-2">
          <span>{t('turn.title')}</span>
          {(isCheck || isCheckmate) && (
            <Badge variant={getStatusColor()} className="ml-2 text-xs sm:text-sm">
              {getStatusText()}
            </Badge>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-0">
        <div className="flex items-center space-x-2 sm:space-x-3">
          <div className={cn(
            "w-5 h-5 sm:w-6 sm:h-6 rounded-full border-2 shrink-0",
            currentPlayer.color === 'white' 
              ? "bg-white border-gray-300" 
              : "bg-gray-800 border-gray-600"
          )} />
          <div className="min-w-0 flex-1">
            <p className="font-medium text-sm sm:text-base lg:text-lg truncate">
              {currentPlayer.name === "Andy" ? "☠️ " : ""}{currentPlayer.name}
            </p>
            <p className="text-xs sm:text-sm text-muted-foreground">
              {t('turn.playingAs', {color: t(`player.${currentPlayer.color}`).toLowerCase() })}
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}