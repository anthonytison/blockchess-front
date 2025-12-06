"use client";

import { useTranslations } from 'next-intl';

export function GameActions() {
  const t = useTranslations('game');

  return (
    <div className="rounded-lg border bg-card text-card-foreground shadow-sm">
          <div className="flex flex-col space-y-1.5 p-4 sm:p-6">
            <h3 className="text-base sm:text-lg font-semibold leading-none tracking-tight">{t('actions.title')}</h3>
          </div>
          <div className="p-4 sm:p-6 pt-0 space-y-2">
            <button className="inline-flex items-center justify-center rounded-md text-xs sm:text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 border border-input bg-background hover:bg-accent hover:text-accent-foreground min-h-[44px] sm:h-10 px-3 sm:px-4 py-2 w-full">
              🏁 {t('actions.resign')}
            </button>
            <button className="inline-flex items-center justify-center rounded-md text-xs sm:text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 border border-input bg-background hover:bg-accent hover:text-accent-foreground min-h-[44px] sm:h-10 px-3 sm:px-4 py-2 w-full">
              {t('actions.offerDraw')}
            </button>
          </div>
        </div>
  );
}