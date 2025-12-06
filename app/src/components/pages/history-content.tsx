"use client";

import { useState, useEffect, useContext } from "react";
import { GameWithPlayers } from "@/ports/repositories";
import { useCurrentAccount } from "@mysten/dapp-kit";
import { useTranslations } from "next-intl";
import { GameSearch } from "@/components/history/game-search";
import { GameListItem } from "@/components/history/game-list-item";
import { LoadingState } from "@/components/ui/loading-state";
import { ErrorState } from "@/components/ui/error-state";
import { EmptyState } from "@/components/ui/empty-state";
import { Trophy } from "lucide-react";
import {
  formatGameDate,
  getGameWinnerDisplay,
  getGameResultColor,
} from "@/components/history/history-utils";
import { getGames } from "@/app/actions/game";
import { SessionContext } from "@/app/context/SessionProvider";

export function HistoryContent() {
  const t = useTranslations();

  const currentAccount = useCurrentAccount();

  const { player } = useContext(SessionContext);

  const isConnected = !!currentAccount && !!player;

  const [games, setGames] = useState<GameWithPlayers[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [error, setError] = useState<string | null>(null);

  const loadGames = async () => {
    try {
      setIsLoading(true);
      const result = await getGames();
      setGames(result.games);
    } catch (err) {
      setError(err instanceof Error ? err.message : t("errors.loadGame"));
    } finally {
      setIsLoading(false);
    }
  };

  const filteredGames = games.filter(
    (game) =>
      game.player1.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      game.player2.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  useEffect(() => {
    loadGames();
  }, []);

  return (
    <main className="flex-1 container mx-auto px-4 sm:px-6 py-4 sm:py-6 lg:py-8">
      <GameSearch searchTerm={searchTerm} onSearchChange={setSearchTerm} />

      {isLoading && <LoadingState message={t("history.loading")} />}

      {error && <ErrorState error={error} onRetry={loadGames} />}

      {!isLoading && !error && (
        <>
          {filteredGames.length === 0 ? (
            <EmptyState
              icon={Trophy}
              title={t("history.noGames")}
              description={
                searchTerm ? t("history.search.noMatch") : t("history.startPlaying")
              }
              actionLabel={isConnected ? t("game.startGame") : t("auth.connectDisabled")}
              actionHref="/"
              isConnected={isConnected}
            />
          ) : (
            <div className="space-y-3 sm:space-y-4">
              {filteredGames.map((game) => (
                <GameListItem
                  key={game.id}
                  game={game}
                  formatDate={formatGameDate}
                  getWinnerDisplay={(g) => getGameWinnerDisplay(g, t)}
                  getResultColor={getGameResultColor}
                />
              ))}
            </div>
          )}
        </>
      )}
    </main>
  );
}

