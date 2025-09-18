import { z } from 'zod';

const workoutItemSchema = z.object({
  exerciseId: z.string(),
  series: z.number().int().positive(),
  load: z.number().nonnegative().optional(),
  targetReps: z.number().int().positive().optional(),
});

const workoutSchema = z.object({
  name: z.string().min(2),
  notes: z.string().optional(),
  plan: z.array(workoutItemSchema).min(1),
});

export { workoutItemSchema, workoutSchema };
