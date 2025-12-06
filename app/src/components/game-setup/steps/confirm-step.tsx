"use client";

import { UseFormReturn } from 'react-hook-form';
import { useTranslations } from 'next-intl';
import { GameSetupFormData } from '@/lib/validations/game-setup';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { User, Bot, Clock, Lock, Palette, SlidersHorizontal } from 'lucide-react';

interface ConfirmStepProps {
  form: UseFormReturn<GameSetupFormData>;
  onSubmit: (data: GameSetupFormData) => void;
  isLoading: boolean;
}

export function ConfirmStep({ form }: ConfirmStepProps) {
  const t = useTranslations();
  const formData = form.getValues();

  const getTimerDisplay = () => {
    switch (formData.timerOption) {
      case 'none':
        return t('game.setup.timer.none');
      case '3min':
        return t('game.setup.timer.3min');
      case '10min':
        return t('game.setup.timer.10min');
      case '1h':
        return t('game.setup.timer.1h');
      case 'custom':
        if (formData.customTimer) {
          const { hours, minutes, seconds } = formData.customTimer;
          const parts = [];
          if (hours > 0) parts.push(`${hours}h`);
          if (minutes > 0) parts.push(`${minutes}m`);
          if (seconds > 0) parts.push(`${seconds}s`);
          return parts.join(' ') || '0s';
        }
        return t('game.setup.timer.custom');
      default:
        return t('game.setup.timer.none');
    }
  };

  return (
    <div className="space-y-4">
      <p className="text-muted-foreground">
        {t('game.setup.review.title')}:
      </p>

      <Card>
        <CardContent className="p-4 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              {formData.mode === 'solo' ? (
                <Bot className="w-5 h-5 text-primary" />
              ) : (
                <User className="w-5 h-5 text-primary" />
              )}
              <span className="font-medium">{t('game.setup.review.game_mode')}</span>
            </div>
            <Badge variant="secondary">
              {formData.mode === 'solo' 
                ? t('game.setup.mode.solo')
                : t('game.setup.mode.vs')
              }
            </Badge>
          </div>
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <SlidersHorizontal className="w-5 h-5 text-primary" />
              
              <span className="font-medium">{t('game.setup.review.difficulty')}</span>
            </div>
            <Badge variant="secondary">
              {t(`game.setup.difficulty.${formData.difficulty}.title`)}
            </Badge>
          </div>

          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <User className="w-5 h-5 text-primary" />
              <span className="font-medium">{t('game.setup.review.players')}</span>
            </div>
            <div className="text-right">
              <div>{formData.player1Name}</div>
              {formData.mode === 'vs' && (
                <div className="text-sm text-muted-foreground">vs {formData.player2Name}</div>
              )}
              {formData.mode === 'solo' && (
                <div className="text-sm text-muted-foreground">{t('game.setup.review.versus_hal')}</div>
              )}
            </div>
          </div>

          {formData.mode === 'solo' && formData.playerColor && (
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Palette className="w-5 h-5 text-primary" />
                <span className="font-medium">{t('game.setup.review.color')}</span>
              </div>
              <Badge variant="outline">
                {formData.playerColor === 'random' 
                  ? t('game.setup.color.random')
                  : formData.playerColor === 'white'
                  ? t('game.setup.color.white')
                  : t('game.setup.color.black')
                }
              </Badge>
            </div>
          )}

          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Clock className="w-5 h-5 text-primary" />
              <span className="font-medium">{t('game.setup.review.timer')}</span>
            </div>
            <Badge variant="outline">
              {getTimerDisplay()}
            </Badge>
          </div>

          {formData.password && (
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Lock className="w-5 h-5 text-primary" />
                <span className="font-medium">{t('game.setup.review.password')}</span>
              </div>
              <Badge variant="outline">{t('game.setup.review.yes')}</Badge>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}