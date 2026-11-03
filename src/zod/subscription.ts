import { z } from 'zod';

const subscriptionSources = [
  'Homepage Footer', 'E-book Landing', 'Checkout Opt-in',
  'Webinar Registration', 'Exit Intent Popup', 'Manual',
] as const;

const subscriptionStatuses = ['Active', 'Unsubscribed', 'Bounced'] as const;

export const createSubscriptionSchema = z.object({
  body: z.object({
    name:             z.string().min(1, 'Name required'),
    email:            z.string().email('Valid email required'),
    source:           z.enum(subscriptionSources).optional(),
    tags:             z.array(z.string()).optional(),
    sendWelcomeEmail: z.boolean().optional(),
  }),
});

export const updateSubscriptionStatusSchema = z.object({
  body: z.object({
    status: z.enum(subscriptionStatuses),
  }),
});
