"use client";

import { SessionContext } from "@/app/context/SessionProvider";
import { GameSetupWizard } from "@/components/game-setup/game-setup-wizard";
import { useCurrentAccount } from "@mysten/dapp-kit";
import { useContext } from "react";
import { EmptyState } from "../ui/empty-state";
import { AlertCircle } from "lucide-react";
import { useTranslations } from "next-intl";

export function GameContent() {
  const t = useTranslations();

  const currentAccount = useCurrentAccount();

  const { player } = useContext(SessionContext);

  const isConnected = !!currentAccount && !!player;

  if(!isConnected) {
    return <div className="min-h-screen flex flex-col">
      <main className="flex-1 flex items-center justify-center p-4">
        <EmptyState
              icon={AlertCircle}
              title={t("blockchain.connectionRequired")}
              description={t('blockchain.pleaseConnect')}
              actionLabel={isConnected ? t("game.startGame") : t("auth.connectDisabled")}
              actionHref="/"
              isConnected={isConnected}
            />
      </main>
    </div>
  }

  return (
    <div className="min-h-screen flex flex-col">
      <main className="flex-1 flex items-center justify-center p-4">
        <GameSetupWizard />
      </main>
    </div>
  );
}

