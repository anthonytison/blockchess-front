import { GameWithPlayers } from "@/ports/repositories";

export function formatGameDate(timestamp: number): string {
  return new Date(Number(timestamp)).toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function getGameWinnerDisplay(
  game: GameWithPlayers,
  t: (key: string) => string
): string {
  let prefix: string = t("history.status");
  if (!game.winner) return `${prefix}: ${t("game.status.inProgress")}`;

  prefix = t("history.columns.winner");
  if (game.winner === "draw") return `${prefix}: ${t("game.status.draw")}`;
  if (game.winner === "player1") return `${prefix}: ${game.player1.name}`;
  if (game.winner === "computer") return `${prefix}: ${t("game.player.computer")}`;

  return `${prefix}: ${game.player2.name}`;
}

export function getGameResultColor(game: GameWithPlayers): string {
  if (!game.winner) return "text-blue-600";
  if (game.winner === "draw") return "text-yellow-600";
  return "text-green-600";
}

