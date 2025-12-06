"use client";

import { UseFormReturn } from 'react-hook-form';
import { useTranslations } from 'next-intl';
import { GameSetupFormData } from '@/lib/validations/game-setup';
import { FormField, FormItem, FormLabel, FormControl, FormMessage } from '@/components/ui/form';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Input } from '@/components/ui/input';
import { Clock, Timer } from 'lucide-react';

interface TimerStepProps {
  form: UseFormReturn<GameSetupFormData>;
}

export function TimerStep({ form }: TimerStepProps) {
  const t = useTranslations('game.setup.timer');
  const watchedTimerOption = form.watch('timerOption');

  const timerOptions = [
    { value: 'none', label: t('none'), icon: null },
    { value: '3min', label: t('3min'), icon: Timer },
    { value: '10min', label: t('10min'), icon: Timer },
    { value: '1h', label: t('1h'), icon: Clock },
    { value: 'custom', label: t('custom'), icon: Timer },
  ];

  return (
    <div className="space-y-4">
      <FormField
        control={form.control}
        name="timerOption"
        render={({ field }) => (
          <FormItem className="space-y-4">
            <FormControl>
              <RadioGroup
                onValueChange={field.onChange}
                value={field.value}
                className="grid grid-cols-1 gap-3"
              >
                {timerOptions.map((option) => {
                  const Icon = option.icon;
                  return (
                    <div key={option.value} className="flex items-center space-x-3 border rounded-lg p-3 hover:bg-muted/50 cursor-pointer">
                      <RadioGroupItem value={option.value} id={option.value} />
                      <div className="flex items-center space-x-3 flex-1">
                        {Icon && <Icon className="w-5 h-5 text-primary" />}
                        <FormLabel htmlFor={option.value} className="text-base font-medium cursor-pointer">
                          {option.label}
                        </FormLabel>
                      </div>
                    </div>
                  );
                })}
              </RadioGroup>
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />

      {watchedTimerOption === 'custom' && (
        <div className="grid grid-cols-3 gap-4 p-4 border rounded-lg bg-muted/20">
          <FormField
            control={form.control}
            name="customTimer.hours"
            render={({ field }) => (
              <FormItem>
                <FormLabel>{t('hours')}</FormLabel>
                <FormControl>
                  <Input
                    type="number"
                    min="0"
                    max="24"
                    autoComplete="off"
                    {...field}
                    onChange={(e) => field.onChange(parseInt(e.target.value) || 0)}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="customTimer.minutes"
            render={({ field }) => (
              <FormItem>
                <FormLabel>{t('minutes')}</FormLabel>
                <FormControl>
                  <Input
                    type="number"
                    min="0"
                    max="59"
                    autoComplete="off"
                    {...field}
                    onChange={(e) => field.onChange(parseInt(e.target.value) || 0)}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="customTimer.seconds"
            render={({ field }) => (
              <FormItem>
                <FormLabel>{t('seconds')}</FormLabel>
                <FormControl>
                  <Input
                    type="number"
                    min="0"
                    max="59"
                    autoComplete="off"
                    {...field}
                    onChange={(e) => field.onChange(parseInt(e.target.value) || 0)}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>
      )}
    </div>
  );
}