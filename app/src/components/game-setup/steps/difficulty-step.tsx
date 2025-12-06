"use client";

import { UseFormReturn } from 'react-hook-form';
import { useTranslations } from 'next-intl';
import { GameSetupFormData } from '@/lib/validations/game-setup';
import { FormField, FormItem, FormLabel, FormControl, FormMessage } from '@/components/ui/form';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Brain, Zap, Target } from 'lucide-react';
import { useEffect } from 'react';

interface DifficultyStepProps {
  form: UseFormReturn<GameSetupFormData>;
}

export function DifficultyStep({ form }: DifficultyStepProps) {
  const t = useTranslations('game.setup');

  const difficultyOptions = [
    {
      value: 'easy',
      label: t(`difficulty.easy.title`),
      description: t(`difficulty.easy.subtitle`),
      icon: Zap,
      color: 'text-green-600'
    },
    {
      value: 'intermediate',
      label: t(`difficulty.intermediate.title`),
      description: t(`difficulty.intermediate.subtitle`),
      icon: Brain,
      color: 'text-yellow-600'
    },
    {
      value: 'hard',
      label: t(`difficulty.hard.title`),
      description: t(`difficulty.hard.subtitle`),
      icon: Target,
      color: 'text-red-600'
    }
  ];

  useEffect(() => {
    console.log(`%c☠️ I'm setting Booty Traps`, 'background-color:black;color:white;font-weight:bold;padding:15px;')
  }, [])

  return (
    <FormField
      control={form.control}
      name="difficulty"
      render={({ field }) => (
        <FormItem className="space-y-4">
          <FormControl>
            <RadioGroup
              onValueChange={field.onChange}
              value={field.value}
              className="grid grid-cols-1 gap-4"
            >
              {difficultyOptions.map((option) => {
                const Icon = option.icon;
                return (
                  <div key={option.value} className="flex items-center space-x-3 border rounded-lg p-4 hover:bg-muted/50 cursor-pointer">
                    <RadioGroupItem value={option.value} id={option.value} />
                    <div className="flex items-center space-x-3 flex-1">
                      <Icon className={`w-6 h-6 ${option.color}`} />
                      <div>
                        <FormLabel htmlFor={option.value} className="text-base font-medium cursor-pointer">
                          {option.label}
                        </FormLabel>
                        <p className="text-sm text-muted-foreground">
                          {option.description}
                        </p>
                      </div>
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
  );
}