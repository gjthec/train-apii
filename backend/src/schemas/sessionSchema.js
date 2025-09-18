import { z } from 'zod';

const setSchema = z.object({
  weight: z.number().nonnegative(),
  reps: z.number().int().positive(),
});

const sessionEntrySchema = z.object({
  exerciseId: z.string(),
  name: z.string().optional(),
  sets: z.array(setSchema).min(1),
});

const sessionSchema = z.object({
  date: z.string().datetime().or(z.string()),
  workoutId: z.string().optional(),
  customName: z.string().optional(),
  entries: z.array(sessionEntrySchema).min(1),
});

export { sessionEntrySchema, sessionSchema, setSchema };
