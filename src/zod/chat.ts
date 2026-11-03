import { z } from 'zod';

export const sendMessageSchema = z.object({
  body: z.object({
    content: z.string().min(1, 'Message cannot be empty'),
  }),
});

export const sendVoiceSchema = z.object({
  body: z.object({
    duration: z.coerce.number().positive('Duration must be positive'),
  }),
});
