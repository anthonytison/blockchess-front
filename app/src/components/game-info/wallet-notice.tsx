"use client";

import { useGame } from "@/contexts/game-context";
import { useCurrentAccount } from "@mysten/dapp-kit";
import { Info, AlertCircle } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { useTranslations } from "next-intl";

export function WalletNotice() {

  const t = useTranslations()

  const { gameState, isAiThinking, error } = useGame();

  const currentAccount = useCurrentAccount();

  // Only show in solo mode
  if (!gameState || gameState.game.mode !== 'solo') return null;

  // Show wallet connection error if present
  if (error && error.includes('wallet')) {
    return (
      <Card className="mb-4 border-red-200 bg-red-50 dark:border-red-800 dark:bg-red-950">
        <CardContent className="pt-4">
          <div className="flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-red-600 dark:text-red-400 mt-0.5 flex-shrink-0" />
            <div className="text-sm text-red-900 dark:text-red-100">
              <p className="font-medium mb-1">{t('blockchain.connectionRequired')}</p>
              <p className="text-red-700 dark:text-red-300">
                {t('blockchain.pleaseConnect')}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Only show when AI is thinking
  if (!isAiThinking) return null;

  return (
    <Card className="mb-4 border-blue-200 bg-blue-50 dark:border-blue-800 dark:bg-blue-950">
      <CardContent className="pt-4">
        <div className="flex items-start gap-3">
          <Info className="w-5 h-5 text-blue-600 dark:text-blue-400 mt-0.5 flex-shrink-0" />
          <div className="text-sm text-blue-900 dark:text-blue-100">
            <p className="font-medium mb-1">{t('game.events.computer.move')}</p>
            <p className="text-blue-700 dark:text-blue-300">
              {t('blockchain.prompt')}
              {currentAccount && (
                <span className="block mt-1 text-xs opacity-75">
                  {t('blockchain.using')}: {currentAccount.address.slice(0, 6)}...{currentAccount.address.slice(-4)}
                </span>
              )}
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
