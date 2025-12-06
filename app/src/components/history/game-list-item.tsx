"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Play, Clock, Users } from "lucide-react";
import { GameWithPlayers } from "@/ports/repositories";
import { useCurrentAccount } from "@mysten/dapp-kit";
import { useTranslations } from "next-intl";

interface GameListItemProps {
  game: GameWithPlayers;
  formatDate: (timestamp: number) => string;
  getWinnerDisplay: (game: GameWithPlayers) => string;
  getResultColor: (game: GameWithPlayers) => string;
}

export function GameListItem({
  game,
  formatDate,
  getWinnerDisplay,
  getResultColor,
}: GameListItemProps) {
  const t = useTranslations();
  const currentAccount = useCurrentAccount();

  const getActionLabel = () => {
    if (game.winner) return t("history.viewReplay");
    if (
      game.player1.suiAddress === currentAccount?.address ||
      game.player2.suiAddress === currentAccount?.address
    ) {
      return t("history.resume");
    }
    return t("history.viewGame");
  };

  return (
    <Card key={game.id} className="hover:shadow-md transition-shadow">
      <CardContent className="p-4 sm:p-6">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex-1 w-full sm:w-auto">
            <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4 mb-2">
              <div className="flex items-center gap-2">
                <Users className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                <span className="font-medium text-sm sm:text-base break-words">
                  {game.player1.name} vs {game.player2.name}
                </span>
              </div>
              <span className="text-xs sm:text-sm bg-muted px-2 py-1 rounded w-fit">
                {game.mode === "solo" ? t("history.modes.solo") : t("history.modes.vs")}
              </span>
            </div>

            <div className="flex flex-wrap items-center gap-3 sm:gap-6 text-xs sm:text-sm text-muted-foreground">
              <div className="flex items-center gap-1">
                <Clock className="w-3 h-3 sm:w-4 sm:h-4" />
                {formatDate(game.createdAt)}
              </div>
              <div>
                {t("history.move")}: {game.moveCount}
              </div>
              <div className={`font-medium ${getResultColor(game)}`}>
                {getWinnerDisplay(game)}
              </div>
            </div>
          </div>

          <Button asChild variant="outline" className="w-full sm:w-auto">
            <Link href={`/game/${game.id}`} className="flex items-center justify-center">
              <Play className="w-4 h-4 mr-2" />
              <span className="text-xs sm:text-sm">{getActionLabel()}</span>
            </Link>
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

