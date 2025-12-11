'use client'

import dynamic from 'next/dynamic';
import { ThemeToggle } from "@/components/ui/structure/navigation/theme-toggle";
import SuiConnect from "@/components/ui/structure/navigation/sui-connect";
import { MobileMenu } from "@/components/ui/structure/navigation/mobile-menu";
import { useTranslations } from 'next-intl';
import { usePathname } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import NavAccount from "./navigation/account";

const LanguageSwitcher = dynamic(
  () => import("@/components/ui/structure/navigation/language-switcher").then(mod => ({ default: mod.LanguageSwitcher })),
  { ssr: false }
);

const Header = () => {

  const pathname = usePathname();

  const t = useTranslations();

  let subtitle: string = "";

  let paths: string[] = []
  if (!pathname.match(/\.(js|css|map|json|ico|png|jpg|sv|woff2)$/)){
    paths = pathname.split(/\//).filter((p: string) => !!p) as string[]
    subtitle = `page.${paths.length === 0 ? 'home' : paths[0]}.header`
  }

  return <header className="border-b" role="banner">
    <nav className="container mx-auto px-4 py-4 flex justify-between items-center" aria-label="Main navigation">
      <Link href="/" className="flex items-center flex-shrink-0" aria-label={`${t('game.title')} - Home`}>
        <Image 
          src="/brand.png" 
          alt={t('game.title')} 
          width={1704} 
          height={315}
          className="h-8 sm:h-9 md:h-10 w-auto dark:invert dark:brightness-110"
          sizes="(max-width: 640px) 340px, (max-width: 768px) 680px, (max-width: 1024px) 1020px, (max-width: 1280px) 1360px, 1704px"
          priority
          unoptimized={false}
        />
      </Link>
      
      {/* Page title - hidden on mobile, shown on tablet and up */}
      {!!subtitle &&
        <div className="hidden md:block flex-1 text-center mx-4">
          {pathname.startsWith('/game') ?
            <span className="text-xl font-bold" aria-label={t(subtitle)}>{t(subtitle)} {paths.length === 2 ? `| ${paths[1]}`: ''}</span>
          : <h1 className="text-xl font-bold">{t(subtitle)}</h1>
          }
        </div>
      }

      {/* Desktop menu - hidden on mobile */}
      <div className="hidden md:flex items-center gap-2" role="toolbar" aria-label="User actions">
        <SuiConnect />
        <NavAccount />
        <LanguageSwitcher />
        <ThemeToggle />
      </div>

      {/* Mobile menu - shown only on mobile */}
      <MobileMenu />
    </nav>
  </header>
}
export default Header;