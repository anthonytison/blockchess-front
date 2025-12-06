"use client";

import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ChessPiece } from "@/components/board/chess-pieces";
import { Button } from "@/components/ui/button";
import { useTranslations } from "next-intl";

interface PromotionModalProps {
  open: boolean;
  onSelect: (piece: 'q' | 'r' | 'b' | 'n') => void;
  playerColor: 'white' | 'black';
}

const promotionPieces: Array<{ type: 'q' | 'r' | 'b' | 'n'; translationKey: string }> = [
  { type: 'q', translationKey: 'queen' },
  { type: 'r', translationKey: 'rook' },
  { type: 'b', translationKey: 'bishop' },
  { type: 'n', translationKey: 'knight' },
];

export function PromotionModal({ open, onSelect, playerColor }: PromotionModalProps) {
  const t = useTranslations('game.promotion');

  return (
    <Dialog open={open} onOpenChange={() => {}}>
      <DialogContent className="w-[90vw] max-w-md mx-4">
        <DialogHeader>
          <DialogTitle className="text-base sm:text-lg">{t('title')}</DialogTitle>
        </DialogHeader>
        <div className="grid grid-cols-2 gap-3 sm:gap-4 py-3 sm:py-4" role="group" aria-label={t('title')}>
          {promotionPieces.map(({ type, translationKey }) => (
            <Button
              key={type}
              variant="outline"
              className="h-20 sm:h-24 flex flex-col items-center justify-center gap-1 sm:gap-2 hover:bg-accent"
              onClick={() => onSelect(type)}
              aria-label={`${t('title')}: ${t(`pieces.${translationKey}`)}`}
            >
              <div className="w-10 h-10 sm:w-12 sm:h-12" aria-hidden="true">
                <ChessPiece type={type} color={playerColor} />
              </div>
              <span className="text-xs sm:text-sm font-medium">{t(`pieces.${translationKey}`)}</span>
            </Button>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
}

