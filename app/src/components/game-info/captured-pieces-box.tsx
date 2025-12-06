"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ChessPiece } from "@/components/board/chess-pieces";
import { useGame } from "@/contexts/game-context";
import { cn } from "@/lib/utils";
import { useTranslations } from "next-intl";

interface CapturedPiecesBoxProps {
  className?: string;
}

export function CapturedPiecesBox({ 
  className 
}: CapturedPiecesBoxProps) {
  const t = useTranslations('game.captured')
  const { capturedWhite, capturedBlack } = useGame();
  const renderCapturedPieces = (pieces: string[], color: 'white' | 'black') => {
    if (pieces.length === 0) {
      return (
        <div className="text-sm text-muted-foreground italic">
          {t('noPieces')}
        </div>
      );
    }

    return (
      <div className="flex flex-wrap gap-1">
        {pieces.map((piece, index) => (
          <div key={`${piece}-${index}`} className="w-5 h-5 sm:w-6 sm:h-6">
            <ChessPiece 
              type={piece} 
              color={color}
              className="opacity-75"
            />
          </div>
        ))}
      </div>
    );
  };

  return (
    <Card className={cn("w-full", className)}>
      <CardHeader className="pb-2 sm:pb-3">
        <CardTitle className="text-base sm:text-lg">{t('title')}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3 sm:space-y-4 pt-0">
        {/* White pieces captured by black */}
        <div>
          <div className="flex items-center space-x-2 mb-1 sm:mb-2">
            <div className="w-3 h-3 sm:w-4 sm:h-4 bg-white border border-gray-300 rounded-full flex-shrink-0" />
            <span className="text-xs sm:text-sm font-medium">{t('whitePieces')}</span>
          </div>
          <div className="min-h-[2rem] p-2 bg-slate-50 dark:bg-slate-800 rounded border">
            {renderCapturedPieces(capturedWhite, 'white')}
          </div>
        </div>

        {/* Black pieces captured by white */}
        <div>
          <div className="flex items-center space-x-2 mb-1 sm:mb-2">
            <div className="w-3 h-3 sm:w-4 sm:h-4 bg-gray-800 border border-gray-600 rounded-full flex-shrink-0" />
            <span className="text-xs sm:text-sm font-medium">{t('blackPieces')}</span>
          </div>
          <div className="min-h-[2rem] p-2 bg-slate-50 dark:bg-slate-800 rounded border">
            {renderCapturedPieces(capturedBlack, 'black')}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}