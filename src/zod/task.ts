import { z } from 'zod';

const taskStatuses = ['Pending', 'In Progress', 'Done'] as const;

export const createTaskSchema = z.object({
  body: z.object({
    title:      z.string().min(2),
    dueDate:    z.coerce.date(),
    status:     z.enum(taskStatuses).optional(),
  }),
});

export const updateTaskSchema = z.object({
  body: createTaskSchema.shape.body.partial(),
});
