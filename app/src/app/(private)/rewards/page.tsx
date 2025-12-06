import { generatePageMetadata } from "@/lib/generate-metadata";
import type { Metadata } from "next";
import { RewardsContent } from "@/components/pages/rewards-content";

export async function generateMetadata(): Promise<Metadata> {
  return generatePageMetadata("rewards");
}

export default function RewardsPage() {
  return <RewardsContent />;
}

