import { generatePageMetadata } from "@/lib/generate-metadata";
import type { Metadata } from "next";
import { HistoryContent } from "@/components/pages/history-content";

export async function generateMetadata(): Promise<Metadata> {
  return generatePageMetadata("history");
}

export default function HistoryPage() {
  return <HistoryContent />;
}