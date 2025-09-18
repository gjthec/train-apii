import { z } from 'zod';

const exerciseClassSchema = z.object({
  name: z.string().min(2),
  description: z.string().optional(),
});

export { exerciseClassSchema };
