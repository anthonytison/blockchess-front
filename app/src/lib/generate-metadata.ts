import type { Metadata } from "next";
import { cookies } from "next/headers";

interface PageMetadata {
  title: string;
  description: string;
  keywords?: string[];
  ogImage?: string;
  ogType?: string;
}

export async function generatePageMetadata(
  pageName: "home" | "history" | "profile" | "rewards" | "game",
  extraInfo?: string
): Promise<Metadata> {
  const cookieStore = await cookies();
  const savedLocale = cookieStore.get("locale")?.value || "en";
  const locale = savedLocale || "en";

  const messages = (await import(`@/i18n/messages/${locale}.json`)).default;
  const pageData = messages.page[pageName] as PageMetadata;

  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3050";
  const ogImageUrl = pageData.ogImage
    ? `${baseUrl}${pageData.ogImage}`
    : `${baseUrl}/brand.png`;

  return {
    title: `${pageData.title} ${extraInfo ? `| ${extraInfo}` : ""}`,
    description: pageData.description,
    keywords: pageData.keywords || [],
    openGraph: {
      title: `${pageData.title} ${extraInfo ? `| ${extraInfo}` : ""}`,
      description: pageData.description,
      images: [
        {
          url: ogImageUrl,
          width: 1200,
          height: 630,
          alt: pageData.title,
        },
      ],
      type: (pageData.ogType as "website" | "article") || "website",
    },
    twitter: {
      card: "summary_large_image",
      title: `${pageData.title} ${extraInfo ? `| ${extraInfo}` : ""}`,
      description: pageData.description,
      images: [ogImageUrl],
    },
  };
}

