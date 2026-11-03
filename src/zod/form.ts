import { z } from 'zod';

export const createFormSchema = z.object({
  body: z.object({
    name:               z.string().min(2, 'Form name required'),
    description:        z.string().optional(),
    domain:             z.string().optional().or(z.literal('')),
    notificationEmails: z.array(z.string().email('Invalid email')).min(1, 'At least one email required'),
    slug:               z.string().min(2).optional(),
    fields:             z.array(z.object({
      id:       z.string(),
      name:     z.string(),
      label:    z.string(),
      type:     z.enum(['text', 'email', 'textarea', 'number', 'checkbox', 'radio', 'select', 'rating', 'date', 'time', 'page_break', 'file']),
      required: z.boolean(),
      options:  z.array(z.string()).optional(),
    })).optional(),
    isShareForm: z.boolean().optional(),
  }),
});

export const updateFormSchema = z.object({
  body: z.object({
    name:               z.string().min(2).optional(),
    domain:             z.string().min(3).optional(),
    notificationEmails: z.array(z.string().email()).min(1).optional(),
    redirectUrl:        z.string().url().optional().or(z.literal('')),
    successMessage:     z.string().optional(),
    senderName:         z.string().optional(),
    replyToHeader:      z.string().optional(),
    subjectTemplate:    z.string().optional(),
    recaptchaEnabled:   z.boolean().optional(),
    honeypotEnabled:    z.boolean().optional(),
    domainLocking:      z.boolean().optional(),
    rateLimit:          z.number().int().min(1).max(100).optional(),
    integrations: z.object({
      slack: z.object({
        enabled:    z.boolean().optional(),
        webhookUrl: z.string().url().optional().or(z.literal('')),
      }).optional(),
      discord: z.object({
        enabled:    z.boolean().optional(),
        webhookUrl: z.string().url().optional().or(z.literal('')),
      }).optional(),
      telegram: z.object({
        enabled:  z.boolean().optional(),
        botToken: z.string().optional().or(z.literal('')),
        chatId:   z.string().optional().or(z.literal('')),
      }).optional(),
      webhooks: z.object({
        enabled: z.boolean().optional(),
        urls:    z.array(z.string().url()).optional(),
      }).optional(),
    }).optional(),
    slug:               z.string().min(2).optional(),
    fields:             z.array(z.object({
      id:       z.string(),
      name:     z.string(),
      label:    z.string(),
      type:     z.enum(['text', 'email', 'textarea', 'number', 'checkbox', 'radio', 'select', 'rating', 'date', 'time', 'page_break', 'file']),
      required: z.boolean(),
      options:  z.array(z.string()).optional(),
    })).optional(),
    isShareForm:        z.boolean().optional(),
  }),
});

export const updateFormStatusSchema = z.object({
  body: z.object({
    status: z.enum(['Active', 'Inactive']),
  }),
});

export const updateSubmissionStatusSchema = z.object({
  body: z.object({
    status: z.enum(['Read', 'Unread', 'Spam']),
  }),
});

export const publicSubmitSchema = z.object({
  body: z.object({
    access_key: z.string().min(1, 'access_key is required'),
  }).passthrough(),
});
