import { z } from 'zod';

const exerciseSchema = z.object({
  name: z.string().min(2),
  classId: z.string().min(1),
  muscleGroup: z.string().min(2).optional(),
});

export { exerciseSchema };
