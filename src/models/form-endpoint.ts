import { Schema, model, Types } from 'mongoose';
import crypto from 'crypto';

export interface IFormEndpoint {
  name: string;
  domain: string;
  notificationEmails: string[];
  accessKey: string;
  status: 'Active' | 'Inactive';
  redirectUrl?: string;
  successMessage: string;
  senderName: string;
  replyToHeader: string;
  subjectTemplate: string;
  recaptchaEnabled: boolean;
  honeypotEnabled: boolean;
  domainLocking: boolean;
  rateLimit: number;
  integrations: {
    slack:    { enabled: boolean; webhookUrl?: string };
    discord:  { enabled: boolean; webhookUrl?: string };
    telegram: { enabled: boolean; botToken?: string; chatId?: string };
    webhooks: { enabled: boolean; urls: string[] };
  };
  slug?: string;
  description?: string;
  fields?: Array<{
    id: string;
    name: string;
    label: string;
    type: 'text' | 'email' | 'textarea' | 'number' | 'checkbox' | 'radio' | 'select' | 'rating' | 'date' | 'time' | 'page_break' | 'file';
    required: boolean;
    options?: string[]; // For select, radio, checkbox
  }>;
  totalSubmissions: number;
  spamBlocked: number;
  isShareForm?: boolean;
  lastSubmission?: Date;
  createdBy: Types.ObjectId;
  tenantId: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const formEndpointSchema = new Schema<IFormEndpoint>(
  {
    name:               { type: String, required: true, trim: true },
    description:        { type: String, trim: true },
    domain:             { type: String, trim: true, lowercase: true },
    notificationEmails: { type: [String], required: true },
    accessKey:          { type: String, required: true, unique: true },
    status:             { type: String, enum: ['Active', 'Inactive'], default: 'Active' },
    redirectUrl:        { type: String, trim: true },
    successMessage:     { type: String, default: 'Thank you! Your submission has been sent successfully.' },
    senderName:         { type: String, default: 'UTS Form Service' },
    replyToHeader:      { type: String, default: '{{email}}' },
    subjectTemplate:    { type: String, default: 'New Submission on {{form_name}}' },
    recaptchaEnabled:   { type: Boolean, default: true },
    honeypotEnabled:    { type: Boolean, default: true },
    domainLocking:      { type: Boolean, default: true },
    rateLimit:          { type: Number, default: 5, min: 1, max: 100 },
    integrations: {
      slack: {
        enabled:    { type: Boolean, default: false },
        webhookUrl: { type: String, trim: true },
      },
      discord: {
        enabled:    { type: Boolean, default: false },
        webhookUrl: { type: String, trim: true },
      },
      telegram: {
        enabled:  { type: Boolean, default: false },
        botToken: { type: String, trim: true },
        chatId:   { type: String, trim: true },
      },
      webhooks: {
        enabled: { type: Boolean, default: false },
        urls:    { type: [String], default: [] },
      },
    },
    slug: { type: String, unique: true, sparse: true, trim: true },
    fields: {
      type: [
        {
          id:       { type: String, required: true },
          name:     { type: String, required: true },
          label:    { type: String, required: true },
          type:     { type: String, enum: ['text', 'email', 'textarea', 'number', 'checkbox', 'radio', 'select', 'rating', 'date', 'time', 'page_break', 'file'], required: true },
          required: { type: Boolean, default: false },
          options:  { type: [String], default: [] },
        }
      ],
      default: []
    },
    totalSubmissions:   { type: Number, default: 0 },
    spamBlocked:        { type: Number, default: 0 },
    isShareForm:        { type: Boolean, default: false },
    lastSubmission:     { type: Date },
    createdBy:          { type: Schema.Types.ObjectId, ref: 'User', required: true },
    tenantId:           { type: Schema.Types.ObjectId, ref: 'Tenant', required: true, index: true },
  },
  { timestamps: true },
);

formEndpointSchema.index({ createdBy: 1 });
formEndpointSchema.index({ status: 1 });

export function generateAccessKey(): string {
  return `uts_sk_live_${crypto.randomBytes(16).toString('hex')}`;
}

export default model<IFormEndpoint>('FormEndpoint', formEndpointSchema);
