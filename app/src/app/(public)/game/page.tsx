import { generatePageMetadata } from "@/lib/generate-metadata";
import type { Metadata } from "next";
import { GameContent } from "@/components/pages/game-content";

export async function generateMetadata(): Promise<Metadata> {
  return generatePageMetadata("game");
}

export default function GamePage() {
  return <GameContent />;
}