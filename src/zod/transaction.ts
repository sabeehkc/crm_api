import { z } from 'zod';

const transactionModes = ['bank', 'upi', 'cheque', 'neft', 'credit_card', 'auto_debit', 'cash'] as const;

export const createTransactionSchema = z.object({
  body: z.object({
    projectId:   z.string().min(24, 'Invalid project ID'),
    client:      z.string().min(2),
    amount:      z.coerce.number().positive(),
    date:        z.coerce.date(),
    mode:        z.enum(transactionModes),
    type:        z.enum(['payment', 'expense']).default('payment'),
    category:    z.string().optional(),
    description: z.string().optional(),
    notes:       z.string().max(500).optional(),
  }),
});

export const updateTransactionSchema = z.object({
  body: createTransactionSchema.shape.body.partial(),
});

export const createInvoiceSchema = z.object({
  body: z.object({
    projectId:   z.string().min(24, 'Invalid project ID'),
    client:      z.string().min(2),
    totalAmount: z.coerce.number().positive(),
    dueDate:     z.coerce.date().optional(),
  }),
});

export const updateReceivedSchema = z.object({
  body: z.object({
    receivedAmount: z.coerce.number().min(0),
  }),
});
