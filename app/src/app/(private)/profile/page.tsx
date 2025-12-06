import { generatePageMetadata } from "@/lib/generate-metadata";
import type { Metadata } from "next";
import { ProfileContent } from "@/components/pages/profile-content";

export async function generateMetadata(): Promise<Metadata> {
  return generatePageMetadata("profile");
}

export default function ProfilePage() {
  return <ProfileContent />;
}
