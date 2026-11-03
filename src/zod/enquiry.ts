import { z } from 'zod';

const enquiryStatuses = [
  'New', 'Followup', 'Quotation Sent', 'Converted', 'Rejected', 'Revised Quotation',
] as const;

export const createEnquirySchema = z.object({
  body: z.object({
    name:                 z.string().min(2, 'Name required'),
    email:                z.string().email('Invalid email'),
    phone:                z.string().min(7, 'Phone required'),
    service:              z.string().min(2, 'Service required'),
    date:                 z.coerce.date().optional(),
    status:               z.enum(enquiryStatuses).optional(),
    type:                 z.enum(['Normal', 'Sales']).optional(),
    notes:                z.string().max(1000).optional(),
    // Per-status date tracking
    followupDate:         z.coerce.date().optional(),
    followupTime:         z.string().optional(),
    quotationSentDate:    z.coerce.date().optional(),
    convertedDate:        z.coerce.date().optional(),
    rejectedDate:         z.coerce.date().optional(),
    rejectReason:         z.string().max(500).optional(),
    revisedQuotationDate: z.coerce.date().optional(),
  }),
});

export const updateEnquirySchema = z.object({
  body: createEnquirySchema.shape.body.partial(),
});

export const updateEnquiryStatusSchema = z.object({
  body: z.object({
    status:               z.enum(enquiryStatuses),
    // Optional date override – controller will auto-set if omitted
    followupDate:         z.coerce.date().optional(),
    followupTime:         z.string().optional(),
    quotationSentDate:    z.coerce.date().optional(),
    convertedDate:        z.coerce.date().optional(),
    rejectedDate:         z.coerce.date().optional(),
    rejectReason:         z.string().max(500).optional(),
    revisedQuotationDate: z.coerce.date().optional(),
  }),
});
