import { z } from 'zod';

const lineItemSchema = z.object({
  desc: z.string().min(1),
  qty:  z.number().int().positive(),
  rate: z.number().positive(),
});

const timelineItemSchema = z.object({
  title:       z.string(),
  description: z.string().optional(),
  duration:    z.string().optional(),
  amount:      z.number().min(0),
});

const featureItemSchema = z.object({
  module:  z.string(),
  user:    z.string(),
  feature: z.string(),
});

export const createQuotationSchema = z.object({
  body: z.object({
    enquiryId:     z.string().optional(),
    lineItems:     z.array(lineItemSchema).min(1, 'At least one line item required'),
    welcomeTitle:  z.string().optional(),
    salutation:    z.string().optional(),
    projectOverview: z.string().optional(),
    coreObjective: z.string().optional(),
    features:      z.array(featureItemSchema).optional(),
    thanksNote:    z.string().optional(),
    closingNote:   z.string().optional(),
    signatureName: z.string().optional(),
    signatureRole: z.string().optional(),
    termsPoints:   z.array(z.string()).optional(),
    terms:         z.string().optional(),
    timelineItems: z.array(timelineItemSchema).optional(),
    companyDetails: z.object({
      name:    z.string(),
      address: z.string(),
      phone:   z.string(),
      email:   z.string().email(),
    }).optional(),
    clientDetails: z.object({
      name:    z.string(),
      company: z.string(),
      email:   z.string().email(),
    }).optional(),
    quoteMeta: z.object({
      date:     z.string(),
      validFor: z.string(),
      ref:      z.string(),
    }).optional(),
    gstPercent:     z.number().min(0).max(100).optional(),
    status:         z.enum(['Draft', 'Sent', 'Approved', 'Rejected', 'Revised']).optional(),
    revisionNumber: z.number().int().positive().optional(),
    parentQuotationId: z.string().optional(),
    revisionNotes:  z.string().optional(),
  }),
});

export const updateQuotationSchema = z.object({
  body: createQuotationSchema.shape.body.partial(),
});
