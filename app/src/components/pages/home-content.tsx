"use client";

import Link from "next/link";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { Play, History, User } from "lucide-react";
import { useTranslations } from "next-intl";
import { SessionContext } from "@/app/context/SessionProvider";
import { useContext } from "react";
import { useCurrentAccount } from "@mysten/dapp-kit";

export function HomeContent() {

  const currentAccount = useCurrentAccount();

  const { player } = useContext(SessionContext);

  const isConnected = !!currentAccount && !!player;

  const t = useTranslations();

  return (
    <div className="flex-1 flex items-center justify-center min-h-[calc(100vh-200px)] py-4 sm:py-8">
      <div className="text-center space-y-6 sm:space-y-8 max-w-md mx-auto px-4 sm:px-6 w-full">
        <div className="space-y-3 sm:space-y-4">
          <div className="flex justify-center">
            <Image
              src="/logo.png"
              alt={t("game.title")}
              width={200}
              height={200}
              className="h-24 w-auto sm:h-32 md:h-40 lg:h-48 xl:h-56 dark:invert dark:brightness-110 transition-all duration-300"
              priority
              sizes="(max-width: 640px) 96px, (max-width: 768px) 128px, (max-width: 1024px) 160px, (max-width: 1280px) 192px, 224px"
            />
          </div>
          <p className="text-base sm:text-lg md:text-xl text-muted-foreground px-2">{t("game.subtitle")}</p>
        </div>

        <div className="space-y-3 sm:space-y-4">
          <Button asChild size="lg" className="w-full text-sm sm:text-base" disabled={!isConnected}>
            { isConnected ? 
              <Link href="/game" className="flex items-center justify-center gap-2">
                <Play className="w-4 h-4 sm:w-5 sm:h-5" />{t("game.startGame")}
              </Link>
              : <div className="flex items-center justify-center gap-2"><User className="w-4 h-4 sm:w-5 sm:h-5" />{t("auth.connectDisabled")}</div>
            }
          </Button>

          <Button asChild variant="outline" size="lg" className="w-full text-sm sm:text-base">
            <Link href="/history" className="flex items-center justify-center gap-2">
              <History className="w-4 h-4 sm:w-5 sm:h-5" />
              {t("game.history")}
            </Link>
          </Button>
        </div>
      </div>
    </div>
  );
}

