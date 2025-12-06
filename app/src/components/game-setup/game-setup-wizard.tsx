"use client";

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useForm, type UseFormReturn } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useTranslations } from 'next-intl';
import { gameSetupSchema, type GameSetupFormData, Mode, Difficulty } from '@/lib/validations/game-setup';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { ModeStep } from './steps/mode-step';
import { PlayersStep } from './steps/players-step';
import { ColorStep } from './steps/color-step';
import { DifficultyStep } from './steps/difficulty-step';
import { TimerStep } from './steps/timer-step';
import { PasswordStep } from './steps/password-step';
import { ConfirmStep } from './steps/confirm-step';
import { ArrowLeft, ArrowRight } from 'lucide-react';
import { PlayerEntity } from '@/domain/entities';
import { getCookie } from '@/app/actions/auth';
import { createGameTransaction } from '@/lib/sui-transactions';
import { useSignAndExecuteTransaction } from '@mysten/dapp-kit';
import { Transaction } from '@mysten/sui/transactions';
import { useBlockchain } from '@/hooks/blockchain';
import { useMintQueue } from '@/hooks/use-mint-queue';
import { useToast } from '@/app/context/toast-provider';

export function GameSetupWizard() {

  const router = useRouter();

  const t = useTranslations();

  const [currentStep, setCurrentStep] = useState(1);

  const [isLoading, setIsLoading] = useState(false);

  const [checkingAuth, setCheckingAuth] = useState(true);

  const [currentPlayer, setCurrentPlayer] = useState<PlayerEntity | null>(null);

  const { mutate: signAndExecuteTransaction } = useSignAndExecuteTransaction();

  const { validateTransaction } = useBlockchain();
  
  const { enqueueMint } = useMintQueue();
  
  const { showSuccess, showError } = useToast();

  const form = useForm<GameSetupFormData>({
    resolver: zodResolver(gameSetupSchema) as any,
    defaultValues: {
      mode: 'solo',
      player1Name: '',
      player2Name: '',
      playerColor: 'white',
      difficulty: 'easy',
      timerOption: 'none',
      customTimer: {
        hours: 0,
        minutes: 0,
        seconds: 0,
      },
      password: '',
    },
  });

  const { watch, trigger } = form;

  const watchedMode = watch('mode');

  const getStepsForMode = () => {
    if (watchedMode === 'solo') {
      return [1, 2, 3, 4, 5, 6, 7]; // Mode, Players, Color, Difficulty, Timer, Password, Confirm
    } else {
      return [1, 2, 5, 6, 7]; // Mode, Players, Timer, Password, Confirm (skip Color & Difficulty)
    }
  };

  const getStepTitle = (step: number) => {
    switch (step) {
      case 1: return t('game.setup.mode.title');
      case 2: return t('game.setup.players.title');
      case 3: return t('game.setup.color.title');
      case 4: return t('game.setup.difficulty.title');
      case 5: return t('game.setup.timer.title');
      case 6: return t('game.setup.password.title');
      case 7: return t('game.setup.subtitle');
      default: return '';
    }
  };

  const validateCurrentStep = async () => {
    const fieldsToValidate: (keyof GameSetupFormData)[] = [];

    switch (currentStep) {
      case 1:
        fieldsToValidate.push('mode');
        break;
      case 2:
        fieldsToValidate.push('player1Name');
        if (watchedMode === 'vs') {
          fieldsToValidate.push('player2Name');
        }
        break;
      case 3:
        if (watchedMode === 'solo') {
          fieldsToValidate.push('playerColor');
        }
        break;
      case 4:
        if (watchedMode === 'solo') {
          fieldsToValidate.push('difficulty');
        }
        break;
      case 5:
        fieldsToValidate.push('timerOption');
        if (watch('timerOption') === 'custom') {
          fieldsToValidate.push('customTimer');
        }
        break;
      case 6:
        // Password is optional, no validation needed
        break;
    }

    return await trigger(fieldsToValidate);
  };

  const handleNext = async () => {
    const isValid = await validateCurrentStep();
    if (!isValid) return;

    const steps = getStepsForMode();
    const currentIndex = steps.indexOf(currentStep);
    if (currentIndex < steps.length - 1) {
      setCurrentStep(steps[currentIndex + 1]);
    }
  };

  const handlePrevious = () => {
    const steps = getStepsForMode();
    const currentIndex = steps.indexOf(currentStep);
    if (currentIndex > 0) {
      setCurrentStep(steps[currentIndex - 1]);
    }
  };

  const handleSubmit = async (data: GameSetupFormData) => {
    setIsLoading(true);
    try {
      // Calculate timer in seconds
      let timerLimit: number | null = null;
      if (data.timerOption !== 'none') {
        switch (data.timerOption) {
          case '3min':
            timerLimit = 180;
            break;
          case '10min':
            timerLimit = 600;
            break;
          case '1h':
            timerLimit = 3600;
            break;
          case 'custom':
            if (data.customTimer) {
              timerLimit = data.customTimer.hours * 3600 +
                data.customTimer.minutes * 60 +
                data.customTimer.seconds;
            }
            break;
        }
      }

      // Determine player color for solo mode
      let player1Color = 'white';
      if (data.mode === 'solo' && data.playerColor) {
        if (data.playerColor === 'random') {
          player1Color = Math.random() > 0.5 ? 'white' : 'black';
        } else {
          player1Color = data.playerColor;
        }
      }

      // Build transaction
      const transaction: Transaction = createGameTransaction({
        mode: Mode[data.mode],
        difficulty: Difficulty[data.difficulty],
      });

      // Sign and execute with wallet
      signAndExecuteTransaction({ transaction },
        {
          onSuccess: async (result) => {
            try {
              const objectId: string = await validateTransaction({
                digest: result.digest,
                objectType: '::game::Game',
                type: 'created',
                errorMessage: 'gameObjectNotFound'
              });

              const gameData = {
                mode: data.mode,
                player1Id: currentPlayer?.id as string,
                player2Id: undefined, // TODO: For vs mode, this should be set
                password: data.password || null,
                timerLimit,
                player1Color,
                difficulty: data.difficulty || 'easy',
                setupData: JSON.stringify({
                  timerOption: data.timerOption,
                  customTimer: data.customTimer,
                  playerColor: data.playerColor,
                  difficulty: data.difficulty,
                }),
                objectId
              };

              // Now create the game in our database
              const { createGame } = await import('@/app/actions/game');
              
              try {
                const { game } = await createGame(gameData);
                
                // Show success toast
                showSuccess(t('toast.gameCreated'));
                
                // Enqueue mints in background queue - non-blocking, processes sequentially
                // Queue persists across page reloads and handles retries automatically
                enqueueMint("first_game", currentPlayer);
                enqueueMint("first_game_created", currentPlayer);

                // Reset loading state before navigation
                setIsLoading(false);
                
                // Navigate immediately - mints will process in background
                // Use replace to avoid adding to history (user shouldn't go back to wizard)
                router.replace(`/game/${game.id}`);
                
                // Fallback: if navigation doesn't happen within a short time, force it
                setTimeout(() => {
                  if (window.location.pathname !== `/game/${game.id}`) {
                    window.location.href = `/game/${game.id}`;
                  }
                }, 1000);
              } catch (error) {
                const errorMessage = error instanceof Error ? error.message : t('errors.failedCreateGame');
                throw new Error(errorMessage);
              }
            } catch (error) {
              setIsLoading(false);
              showError(t('errors.failedCreateGame'));
            }
          },
          onError: (error: any) => {
            setIsLoading(false);
            // Extract error message properly - handle empty objects or missing messages
            const errorMessage = error?.message || 
                                error?.toString() || 
                                (typeof error === 'string' ? error : 'Unknown error');
            showError(t('errors.failedCreateGameBlockchain'));
          }
        }
      );
    } catch (error) {
      setIsLoading(false);
    }
  };

  const renderStep = () => {
    const formWithType = form as unknown as UseFormReturn<GameSetupFormData>;
    switch (currentStep) {
      case 1:
        return <ModeStep form={formWithType} />;
      case 2:
        return (
          <PlayersStep
            form={formWithType}
            mode={watchedMode}
            currentPlayer={currentPlayer}
          />
        );
      case 3:
        return <ColorStep form={formWithType} />;
      case 4:
        return <DifficultyStep form={formWithType} />;
      case 5:
        return <TimerStep form={formWithType} />;
      case 6:
        return <PasswordStep form={formWithType} />;
      case 7:
        return <ConfirmStep form={formWithType} onSubmit={handleSubmit} isLoading={isLoading} />;
      default:
        return null;
    }
  };

  const steps = getStepsForMode();

  const currentStepIndex = steps.indexOf(currentStep);

  const progress = ((currentStepIndex + 1) / steps.length) * 100;

  useEffect(() => {
    const checkWalletAndProfile = async () => {
      try {
        const cookieValue: string | null = await getCookie(process.env.NEXT_PUBLIC_COOKIE_NAME as string);
        setCurrentPlayer(cookieValue ? JSON.parse(cookieValue) : cookieValue);

      } catch (err) {
        console.error('Error fetching player:', err);
        router.push('/');
        return;
      } finally {
        setCheckingAuth(false);
      }
    };

    checkWalletAndProfile();
  }, [router]);

  // Set player1Name from currentPlayer when available
  useEffect(() => {
    if (currentPlayer) {
      form.setValue('player1Name', currentPlayer.name);
    }
  }, [currentPlayer, form]);

  if (checkingAuth) {
    return (
      <div className="max-w-2xl mx-auto px-4">
        <Card className="w-full min-w-[20rem] sm:min-w-[24rem] max-w-[28rem] mx-auto">
          <CardContent className="py-8 sm:py-12">
            <p className="text-center text-sm sm:text-base text-muted-foreground">
              {t('blockchain.checkingWalletConnection')}...
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto px-4">
      <Card className="w-full min-w-[20rem] sm:min-w-[24rem] max-w-[28rem] mx-auto">
        <CardHeader>
          <CardTitle className="text-center">
            {t('game.setup.title')}
          </CardTitle>
          <div className="space-y-2">
            <Progress value={progress} className="w-full" />
            <p className="text-sm text-muted-foreground text-center">
              {t('game.setup.step', { current: currentStepIndex + 1, total: steps.length })}
            </p>
          </div>
        </CardHeader>
        <CardContent className="space-y-4 sm:space-y-6">
          <div className="min-h-[250px] sm:min-h-[300px]">
            <h3 className="text-base sm:text-lg font-semibold mb-3 sm:mb-4">
              {getStepTitle(currentStep)}
            </h3>
            {renderStep()}
          </div>

          <div className="flex flex-col sm:flex-row justify-between gap-2 sm:gap-0">
            <Button
              type="button"
              variant="outline"
              onClick={handlePrevious}
              disabled={currentStepIndex === 0}
              className="w-full sm:w-auto"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              {t('game.setup.previous', { ns: 'common' })}
            </Button>

            {currentStep === 7 ? (
              <Button
                type="button"
                onClick={form.handleSubmit(handleSubmit as any)}
                disabled={isLoading}
                className="w-full sm:w-auto"
              >
                {isLoading ? t('game.setup.loading', { ns: 'common' }) : t('game.setup.finish', { ns: 'common' })}
              </Button>
            ) : (
              <Button
                type="button"
                onClick={handleNext}
                className="w-full sm:w-auto"
              >
                {t('game.setup.next', { ns: 'common' })}
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}