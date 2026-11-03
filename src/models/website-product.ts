import { Schema, model, Types } from 'mongoose';

export interface IWebsiteProduct {
  title: string;
  description?: string;
  mediaType: 'image' | 'video';
  mediaUrl?: string;
  isLive: boolean;
  displayOrder: number;
  type: 'product' | 'service' | 'app';
  customFields?: Record<string, any>;
  tenantId: Types.ObjectId;
  websiteId?: Types.ObjectId;
}

const websiteProductSchema = new Schema<IWebsiteProduct>(
  {
    title:        { type: String, required: true },
    description:  { type: String },
    mediaType:    { type: String, enum: ['image', 'video'], default: 'image' },
    mediaUrl:     { type: String },
    isLive:       { type: Boolean, default: true },
    displayOrder: { type: Number, default: 0 },
    type:         { type: String, enum: ['product', 'service', 'app'], default: 'product' },
    customFields: { type: Schema.Types.Mixed, default: {} },
    tenantId:     { type: Schema.Types.ObjectId, ref: 'Tenant', required: true, index: true },
    websiteId:    { type: Schema.Types.ObjectId, ref: 'Website', index: true },
  },
  { timestamps: true }
);

export default model<IWebsiteProduct>('WebsiteProduct', websiteProductSchema);
