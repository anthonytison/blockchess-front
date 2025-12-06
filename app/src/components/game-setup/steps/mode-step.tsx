"use client";

import { UseFormReturn } from 'react-hook-form';
import { useTranslations } from 'next-intl';
import { GameSetupFormData } from '@/lib/validations/game-setup';
import { FormField, FormItem, FormLabel, FormControl, FormMessage } from '@/components/ui/form';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { User, Bot } from 'lucide-react';

interface ModeStepProps {
  form: UseFormReturn<GameSetupFormData>;
}

export function ModeStep({ form }: ModeStepProps) {
  const t = useTranslations();

  return (
    <FormField
      control={form.control}
      name="mode"
      render={({ field }) => (
        <FormItem className="space-y-4">
          <FormControl>
            <RadioGroup
              onValueChange={field.onChange}
              value={field.value}
              className="grid grid-cols-1 gap-4"
            >

              <div className="flex items-center space-x-2 sm:space-x-3 border rounded-lg p-3 sm:p-4 hover:bg-muted/50 cursor-pointer">
                <RadioGroupItem value="solo" id="solo" className="flex-shrink-0" />
                <div className="flex items-center space-x-2 sm:space-x-3 flex-1 min-w-0">
                  <Bot className="w-5 h-5 sm:w-6 sm:h-6 text-primary flex-shrink-0" />
                  <div className="min-w-0 flex-1">
                    <FormLabel htmlFor="solo" className="text-sm sm:text-base font-medium cursor-pointer">
                      {t('game.setup.mode.solo')}
                    </FormLabel>
                    <p className="text-xs sm:text-sm text-muted-foreground">
                      {t('game.setup.mode.soloDescription')}
                    </p>
                  </div>
                </div>
              </div>
              <div className="flex items-center space-x-2 sm:space-x-3 border rounded-lg p-3 sm:p-4 hover:bg-muted/50 cursor-pointer">
                {/* TODO: Add VS mode */ }
                <RadioGroupItem value="vs" id="vs" disabled className="flex-shrink-0" />
                <div className="flex items-center space-x-2 sm:space-x-3 flex-1 min-w-0">
                  <User className="w-5 h-5 sm:w-6 sm:h-6 text-primary flex-shrink-0" />
                  <div className="min-w-0 flex-1">
                    <FormLabel htmlFor="vs" className="text-sm sm:text-base font-medium cursor-pointer">
                      {t('game.setup.mode.vs')} ({t('common.soon')})
                    </FormLabel>
                    <p className="text-xs sm:text-sm text-muted-foreground">
                      {t('game.setup.mode.vsDescription')}
                    </p>
                  </div>
                </div>
              </div>
            </RadioGroup>
          </FormControl>
          <FormMessage />
        </FormItem>
      )}
    />
  );
}