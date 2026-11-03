import { z } from 'zod';

const milestoneStatuses = ['pending', 'in_progress', 'done'] as const;

export const createMilestoneSchema = z.object({
  body: z.object({
    title:   z.string().min(2),
    dueDate: z.coerce.date(),
    status:  z.enum(milestoneStatuses).optional(),
  }),
});

export const updateMilestoneSchema = z.object({
  body: createMilestoneSchema.shape.body.partial(),
});
