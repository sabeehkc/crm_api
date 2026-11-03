import { Schema, model, Types } from 'mongoose';

export interface IWebsiteFaq {
  question: string;
  answer: string;
  isLive: boolean;
  displayOrder: number;
  customFields?: Record<string, any>;
  tenantId: Types.ObjectId;
  websiteId?: Types.ObjectId;
}

const websiteFaqSchema = new Schema<IWebsiteFaq>(
  {
    question:     { type: String, required: true },
    answer:       { type: String, required: true },
    isLive:       { type: Boolean, default: true },
    displayOrder: { type: Number, default: 0 },
    customFields: { type: Schema.Types.Mixed, default: {} },
    tenantId:     { type: Schema.Types.ObjectId, ref: 'Tenant', required: true, index: true },
    websiteId:    { type: Schema.Types.ObjectId, ref: 'Website', index: true },
  },
  { timestamps: true }
);

export default model<IWebsiteFaq>('WebsiteFaq', websiteFaqSchema);
