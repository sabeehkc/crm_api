import { z } from 'zod';

export const updateSettingSchema = z.object({
  body: z.object({
    companyName: z.string().min(2, 'Company Name must be at least 2 characters').optional(),
    signatureName: z.string().optional(),
    signatureRole: z.string().optional(),
    address: z.string().optional(),
    mobileNo: z.string().optional(),
    email: z.string().email('Invalid email address').optional().or(z.literal('')),
    gstNo: z.string().optional(),
  }),
});
