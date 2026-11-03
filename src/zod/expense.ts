import { z } from 'zod';

const expenseCategories = [
  'Infrastructure', 'Tools', 'Operations', 'HR & Culture', 'Marketing', 'Payroll', 'Other',
] as const;

const expenseModes = ['Bank Transfer', 'UPI', 'Credit Card', 'Cash', 'Auto Debit'] as const;

export const createExpenseSchema = z.object({
  body: z.object({
    description: z.string().min(2).max(200),
    category:    z.enum(expenseCategories),
    amount:      z.coerce.number().positive(),
    date:        z.coerce.date(),
    mode:        z.enum(expenseModes),
    notes:       z.string().optional(),
  }),
});

export const updateExpenseSchema = z.object({
  body: createExpenseSchema.shape.body.partial(),
});
