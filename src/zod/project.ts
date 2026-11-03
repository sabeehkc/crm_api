import { z } from 'zod';

const projectStatuses = [
  'Just Started', 'In Progress', 'Nearly Done', 'Completed', 'On Hold',
] as const;

export const createProjectSchema = z.object({
  body: z.object({
    name:        z.string().min(2),
    tags:        z.array(z.string()).optional(),
    client:      z.string().min(2),
    budget:      z.coerce.number().positive(),
    startDate:   z.coerce.date(),
    dueDate:     z.coerce.date(),
    description: z.string().optional(),
  }),
});

export const updateProjectSchema = z.object({
  body: createProjectSchema.shape.body.partial(),
});

export const updateProgressSchema = z.object({
  body: z.object({
    progress: z.coerce.number().min(0).max(100),
  }),
});
