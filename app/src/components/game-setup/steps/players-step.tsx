"use client";

import { UseFormReturn } from 'react-hook-form';
import { useTranslations } from 'next-intl';
import { GameSetupFormData } from '@/lib/validations/game-setup';
import {
  FormField,
  FormItem,
  FormLabel,
  FormControl,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { PlayerEntity } from '@/domain/entities';

interface PlayersStepProps {
  form: UseFormReturn<GameSetupFormData>;
  mode: 'solo' | 'vs';
  currentPlayer: PlayerEntity | null;
}

export function PlayersStep({ form, mode, currentPlayer }: PlayersStepProps) {
  const t = useTranslations('game.setup.players');

  return (
    <div className="space-y-3 sm:space-y-4">
      <FormField
        control={form.control}
        name="player1Name"
        render={({ field }) => (
          <FormItem>
            <FormLabel className="text-sm sm:text-base">{t('player1')}</FormLabel>
            <FormControl>
              {currentPlayer ? (
                <div className="px-3 py-2 bg-muted rounded-md">
                  <p className="text-xs sm:text-sm font-medium">{currentPlayer.name}</p>
                </div>
              ) : (
                <Input 
                  type="text"
                  autoComplete="name"
                  placeholder={t('player1Placeholder')} 
                  className="text-sm sm:text-base"
                  {...field} 
                />
              )}
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />

      {mode === 'vs' && (
        <FormField
          control={form.control}
          name="player2Name"
          render={({ field }) => (
            <FormItem>
              <FormLabel className="text-sm sm:text-base">{t('player2')}</FormLabel>
              <FormControl>
                <Input
                  type="text"
                  autoComplete="name"
                  placeholder={t('player2Placeholder')}
                  className="text-sm sm:text-base"
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
      )}
    </div>
  );
}