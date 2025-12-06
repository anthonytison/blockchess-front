import { generatePageMetadata } from "@/lib/generate-metadata";
import type { Metadata } from "next";
import { HomeContent } from "@/components/pages/home-content";

export async function generateMetadata(): Promise<Metadata> {
  return generatePageMetadata("home");
}

export default function HomePage() {
  return <HomeContent />;
}