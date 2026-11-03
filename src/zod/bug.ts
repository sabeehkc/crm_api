import { z } from 'zod';

const bugSeverities = ['Critical', 'High','Medium', 'Low'] as const;
const bugStatuses   = ['Open', 'In Progress', 'Resolved'] as const;

export const createBugSchema = z.object({
  body: z.object({
    title:            z.string().min(2),
    reporter:         z.string().min(2),
    severity:         z.enum(bugSeverities),
    stepsToReproduce: z.string().optional(),
    resolution:       z.string().optional(),
  }),
});

export const updateBugSchema = z.object({
  body: z.object({
    status:         z.enum(bugStatuses).optional(),
    resolution:     z.string().optional(),
    resolvedAt:     z.coerce.date().optional(),
    resolutionTime: z.string().optional(),
  }),
});
