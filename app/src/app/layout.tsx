import type { Metadata, Viewport } from "next";
import { Inter, Press_Start_2P } from "next/font/google";
import "./globals.css";
import { ThemeProvider } from "@/app/context/theme-provider";
import { FontProvider } from "@/app/context/font-provider";
import { NextIntlClientProvider } from "next-intl";
import { getMessages, getLocale } from "next-intl/server";
import { SuiProviders } from "@/app/context/providers";
import { MintQueueProcessor } from "@/components/mint-queue-processor";
import { SocketListener } from "@/components/socket-listener";
import { ToastProvider } from "@/app/context/toast-provider";
import Header from "@/components/ui/structure/header";
import Footer from "@/components/ui/structure/footer";
import SessionProvider from "./context/SessionProvider";
import { getCookie } from "./actions/auth";
import { PlayerEntity } from "@/domain/entities";

const inter = Inter({ 
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-regular",
});
const pressStart2P = Press_Start_2P({ 
  weight: "400",
  subsets: ["latin"],
  variable: "--font-pixel",
});

export const metadata: Metadata = {
  title: "♘ BLOCKCHESS - Blockchain Chess Game",
  description: "Play chess locally with persistent game history and future blockchain integration",
  keywords: ["chess", "blockchain", "game", "SUI", "Move"],
  authors: [{ name: "Anthony Tison", url: "https://www.linkedin.com/in/anthonytison/" }],
  creator: "Anthony Tison",
  publisher: "Anthony Tison",
  metadataBase: new URL(process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3050"),
  alternates: {
    canonical: "/",
    languages: {
      "en": "/en",
      "fr": "/fr",
    },
  },
  openGraph: {
    type: "website",
    locale: "en_US",
    alternateLocale: ["fr_FR"],
    siteName: "BLOCKCHESS",
    title: "♘ BLOCKCHESS - Blockchain Chess Game",
    description: "Play chess locally with persistent game history and future blockchain integration",
    images: [
      {
        url: "/brand.png",
        width: 1704,
        height: 315,
        alt: "BLOCKCHESS Logo",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "♘ BLOCKCHESS - Blockchain Chess Game",
    description: "Play chess locally with persistent game history and future blockchain integration",
    images: ["/brand.png"],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
  verification: {
    google: process.env.NEXT_PUBLIC_GOOGLE_VERIFICATION,
    yandex: process.env.NEXT_PUBLIC_YANDEX_VERIFICATION,
    yahoo: process.env.NEXT_PUBLIC_YAHOO_VERIFICATION,
  },
  category: "Gaming",
  classification: "Chess Game",
  other: {
    "apple-mobile-web-app-capable": "yes",
    "apple-mobile-web-app-status-bar-style": "black-translucent",
    "format-detection": "telephone=no",
  },
  icons: {
    icon: [
      { url: '/favicon.ico', sizes: 'any' },
      { url: '/favicon-32x32.png', sizes: '32x32', type: 'image/png' },
      { url: '/favicon-16x16.png', sizes: '16x16', type: 'image/png' },
    ],
    apple: [
      { url: '/apple-touch-icon.png', sizes: '180x180', type: 'image/png' },
    ],
    other: [
      { rel: 'android-chrome-192x192', url: '/android-chrome-192x192.png', sizes: '192x192', type: 'image/png' },
      { rel: 'android-chrome-512x512', url: '/android-chrome-512x512.png', sizes: '512x512', type: 'image/png' },
    ],
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
  userScalable: true,
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#ffffff" },
    { media: "(prefers-color-scheme: dark)", color: "#000000" },
  ],
};

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {

  const cookieValue: string | null = await getCookie(process.env.NEXT_PUBLIC_COOKIE_NAME as string);

  const player: PlayerEntity | null = cookieValue ? JSON.parse(cookieValue) as PlayerEntity : null;

  const messages = await getMessages();
  const locale = await getLocale();
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3050";

  // Structured data for SEO and AI SEO
  const structuredData = {
    "@context": "https://schema.org",
    "@type": "WebApplication",
    "name": "BLOCKCHESS",
    "alternateName": "Blockchain Chess Game",
    "description": "Play chess locally with persistent game history and future blockchain integration on the SUI blockchain",
    "url": baseUrl,
    "applicationCategory": "Game",
    "operatingSystem": "Web Browser",
    "offers": {
      "@type": "Offer",
      "price": "0",
      "priceCurrency": "USD"
    },
    "author": {
      "@type": "Person",
      "name": "Anthony Tison",
      "url": "https://www.linkedin.com/in/anthonytison/"
    },
    "publisher": {
      "@type": "Person",
      "name": "Anthony Tison"
    },
    "inLanguage": ["en", "fr"],
    "gamePlatform": ["Web", "SUI Blockchain"],
    "genre": ["Chess", "Board Game", "Blockchain Game"],
    "aggregateRating": {
      "@type": "AggregateRating",
      "ratingValue": "4.5",
      "ratingCount": "1"
    },
    "featureList": [
      "Play chess online",
      "Game history tracking",
      "Blockchain integration",
      "Rewards and badges",
      "Multi-language support"
    ]
  };

  const organizationData = {
    "@context": "https://schema.org",
    "@type": "Organization",
    "name": "BLOCKCHESS",
    "url": baseUrl,
    "logo": `${baseUrl}/brand.png`,
    "sameAs": [
      "https://www.linkedin.com/in/anthonytison/"
    ],
    "contactPoint": {
      "@type": "ContactPoint",
      "contactType": "Developer",
      "name": "Anthony Tison"
    }
  };

  const breadcrumbData = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    "itemListElement": [
      {
        "@type": "ListItem",
        "position": 1,
        "name": "Home",
        "item": baseUrl
      }
    ]
  };

  return (
    <html lang={locale} suppressHydrationWarning>
      <body className={`${inter.variable} ${pressStart2P.variable}`}>
        {/* Structured data for SEO and AI SEO - JSON-LD scripts */}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }}
        />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(organizationData) }}
        />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbData) }}
        />
        <SuiProviders>
          <SessionProvider player={player}>
            <NextIntlClientProvider messages={messages}>
              <ToastProvider>
                <SocketListener />
                <MintQueueProcessor />
                <ThemeProvider
                    attribute="class"
                    defaultTheme="system"
                    enableSystem
                    disableTransitionOnChange
                  >
                    <FontProvider>
                      <a 
                        href="#main-content" 
                        className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 focus:z-50 focus:px-4 focus:py-2 focus:bg-primary focus:text-primary-foreground focus:rounded-md focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
                      >
                        Skip to main content
                      </a>
                      <div className="min-h-screen bg-background">
                        <div className="min-h-screen flex flex-col">
                          <Header />
                          <main id="main-content" className="flex-1">
                            {children}
                          </main>
                          <Footer />
                        </div>
                      </div>
                    </FontProvider>
                  </ThemeProvider>
              </ToastProvider>
            </NextIntlClientProvider>
          </SessionProvider>
        </SuiProviders>
      </body>
    </html>
  );
}