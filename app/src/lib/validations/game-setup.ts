import { z } from 'zod';

/**
 * ENUMS used for the SUI Client
 */

export enum Mode {
  solo = 0,
  vs = 1
}

export enum Difficulty {
  easy = 0,
  intermediate = 0,
  hard = 0
}

/**
 * Game setup schema object
 */
export const gameSetupSchema = z.object({
  mode: z.enum(['solo', 'vs'], {
    message: 'Please select a game mode',
  }),
  player1Name: z
    .string()
    .min(1, 'Player 1 name is required')
    .max(50, 'Player name must be less than 50 characters')
    .regex(/^[a-zA-Z0-9\s\-_]+$/, 'Player name can only contain letters, numbers, spaces, hyphens, and underscores'),
  player2Name: z
    .string()
    .max(50, 'Player name must be less than 50 characters')
    .regex(/^[a-zA-Z0-9\s\-_]*$/, 'Player name can only contain letters, numbers, spaces, hyphens, and underscores')
    .optional(),
  playerColor: z.enum(['white', 'black', 'random']).optional(),
  difficulty: z.enum(['easy', 'intermediate', 'hard']).default('easy'),
  timerOption: z.enum(['none', '3min', '10min', '1h', 'custom']).default('none'),
  customTimer: z.object({
    hours: z.number().min(0).max(24).default(0),
    minutes: z.number().min(0).max(59).default(0),
    seconds: z.number().min(0).max(59).default(0),
  }).optional(),
  password: z
    .string()
    .max(100, 'Password must be less than 100 characters')
    .optional(),
}).refine((data) => {
  // Player 2 name is required for VS mode
  if (data.mode === 'vs' && (!data.player2Name || data.player2Name.trim() === '')) {
    return false;
  }
  return true;
}, {
  message: 'Player 2 name is required for VS mode',
  path: ['player2Name'],
}).refine((data) => {
  // Custom timer validation
  if (data.timerOption === 'custom' && data.customTimer) {
    const { hours, minutes, seconds } = data.customTimer;
    const totalSeconds = hours * 3600 + minutes * 60 + seconds;
    return totalSeconds > 0;
  }
  return true;
}, {
  message: 'Custom timer must be greater than 0',
  path: ['customTimer'],
});

export type GameSetupFormData = z.infer<typeof gameSetupSchema>;

/**
 * Password resume schema object
 */
export const passwordResumeSchema = z.object({
  password: z.string().min(1, 'Password is required'),
});

export type PasswordResumeFormData = z.infer<typeof passwordResumeSchema>;