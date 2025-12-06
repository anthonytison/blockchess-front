"use client";

import { useState, useTransition } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Languages } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

const languages = [
  { code: 'en', name: 'English', flag: '🇺🇸' },
  { code: 'fr', name: 'Français', flag: '🇫🇷' },
];

export function LanguageSwitcher() {
  const router = useRouter();
  // const pathname = usePathname();
  const [isPending, startTransition] = useTransition();
  const [currentLocale, setCurrentLocale] = useState('en');

  const handleLanguageChange = (locale: string) => {
    startTransition(() => {
      // Set cookie for locale preference
      document.cookie = `locale=${locale}; path=/; max-age=31536000`; // 1 year
      setCurrentLocale(locale);
      
      // Refresh the page to apply new locale
      router.refresh();
    });
  };

  // const currentLanguage = languages.find(lang => lang.code === currentLocale) || languages[0];

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="outline"
          size="icon"
          disabled={isPending}
          className="cursor-pointer"
          aria-label="Switch language"
        >
          <Languages className="h-[1.2rem] w-[1.2rem]" />
          <span className="sr-only">Switch language</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        {languages.map((language) => (
          <DropdownMenuItem
            key={language.code}
            onClick={() => handleLanguageChange(language.code)}
            className="flex items-center gap-2 cursor-pointer"
          >
            <span>{language.flag}</span>
            <span>{language.name}</span>
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}