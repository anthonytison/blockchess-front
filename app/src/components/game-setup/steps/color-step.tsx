"use client";

import { UseFormReturn } from 'react-hook-form';
import { useTranslations } from 'next-intl';
import { GameSetupFormData } from '@/lib/validations/game-setup';
import { FormField, FormItem, FormLabel, FormControl, FormMessage } from '@/components/ui/form';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Shuffle } from 'lucide-react';

interface ColorStepProps {
  form: UseFormReturn<GameSetupFormData>;
}

export function ColorStep({ form }: ColorStepProps) {
  const t = useTranslations('game.setup.color');

  return (
    <FormField
      control={form.control}
      name="playerColor"
      render={({ field }) => (
        <FormItem className="space-y-4">
          <FormControl>
            <RadioGroup
              onValueChange={field.onChange}
              value={field.value}
              className="grid grid-cols-1 gap-4"
            >
              <div className="flex items-center space-x-3 border rounded-lg p-4 hover:bg-muted/50 cursor-pointer">
                <RadioGroupItem value="white" id="white" />
                <div className="flex items-center space-x-3 flex-1">
                  <div className="w-6 h-6 bg-white border-2 border-gray-300 rounded-full"></div>
                  <FormLabel htmlFor="white" className="text-base font-medium cursor-pointer">
                    {t('white')}
                  </FormLabel>
                </div>
              </div>

              <div className="flex items-center space-x-3 border rounded-lg p-4 hover:bg-muted/50 cursor-pointer">
                <RadioGroupItem value="black" id="black" />
                <div className="flex items-center space-x-3 flex-1">
                  <div className="w-6 h-6 bg-gray-800 border-2 border-gray-300 rounded-full"></div>
                  <FormLabel htmlFor="black" className="text-base font-medium cursor-pointer">
                    {t('black')}
                  </FormLabel>
                </div>
              </div>

              <div className="flex items-center space-x-3 border rounded-lg p-4 hover:bg-muted/50 cursor-pointer">
                <RadioGroupItem value="random" id="random" />
                <div className="flex items-center space-x-3 flex-1">
                  <Shuffle className="w-6 h-6 text-primary" />
                  <FormLabel htmlFor="random" className="text-base font-medium cursor-pointer">
                    {t('random')}
                  </FormLabel>
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