import { z } from 'zod';

export const profileSchema = z.object({
  name: z
    .string()
    .min(1, 'Player name is required')
    .max(50, 'Player name must be less than 50 characters')
    .regex(/^[a-zA-Z0-9\s\-_]+$/, 'Player name can only contain letters, numbers, spaces, hyphens, and underscores'),
});

export type ProfileFormData = z.infer<typeof profileSchema>;