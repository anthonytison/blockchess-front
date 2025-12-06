"use client";

import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useTranslations } from "next-intl";

interface LeaveGameConfirmationProps {
  open: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export function LeaveGameConfirmation({ open, onConfirm, onCancel }: LeaveGameConfirmationProps) {
  const t = useTranslations('game');

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onCancel()}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>
            {t('leaveGame.title')}
          </DialogTitle>
          <DialogDescription>
            {t('leaveGame.description')}
          </DialogDescription>
        </DialogHeader>
        <div className="flex gap-3 justify-end mt-4">
          <Button
            variant="outline"
            onClick={onCancel}
          >
            {t('leaveGame.cancel')}
          </Button>
          <Button
            variant="destructive"
            onClick={onConfirm}
          >
            {t('leaveGame.confirm')}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

