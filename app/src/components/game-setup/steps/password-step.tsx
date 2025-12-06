"use client";

import { UseFormReturn } from 'react-hook-form';
import { useTranslations } from 'next-intl';
import { GameSetupFormData } from '@/lib/validations/game-setup';
import { FormField, FormItem, FormLabel, FormControl, FormMessage, FormDescription } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Lock } from 'lucide-react';

interface PasswordStepProps {
  form: UseFormReturn<GameSetupFormData>;
}

export function PasswordStep({ form }: PasswordStepProps) {
  const t = useTranslations('game.setup.password');

  return (
    <div className="space-y-4">
      <div className="flex items-center space-x-2 text-muted-foreground">
        <Lock className="w-5 h-5" />
        <span className="text-sm">{t('description')}</span>
      </div>

      <FormField
        control={form.control}
        name="password"
        render={({ field }) => (
          <FormItem>
            <FormLabel>
              {t('title')} <span className="text-muted-foreground">({t('optional', { ns: 'common' })})</span>
            </FormLabel>
            <FormControl>
              <Input
                type="password"
                placeholder={t('placeholder')}
                autoComplete="new-password"
                data-form-type="other"
                {...field}
              />
            </FormControl>
            <FormDescription>
              {t('warning')}
            </FormDescription>
            <FormMessage />
          </FormItem>
        )}
      />
    </div>
  );
}