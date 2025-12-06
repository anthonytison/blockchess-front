import { generatePageMetadata } from "@/lib/generate-metadata";
import type { Metadata } from "next";
import { GamePlayContent } from "@/components/pages/game-play-content";

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params;
  return generatePageMetadata("game", id);
}

export default function GamePlayPage() {
  return <GamePlayContent />;
}