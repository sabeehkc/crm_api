import { Schema, model, Types } from 'mongoose';

export type NewsType = 'Press Release' | 'Blog' | 'Case Study' | 'Announcement';

export interface IWebsiteNews {
  type?: NewsType;
  date?: Date;
  title: string;
  subtitle?: string;
  content: string;
  featuredImageUrl?: string;
  views: number;
  likes: number;
  isPublished: boolean;
  isDraft: boolean;
  customFields?: Record<string, any>;
  tenantId: Types.ObjectId;
  websiteId?: Types.ObjectId;
}

const websiteNewsSchema = new Schema<IWebsiteNews>(
  {
    type:             { type: String, enum: ['Press Release', 'Blog', 'Case Study', 'Announcement'] },
    date:             { type: Date },
    title:            { type: String, required: true },
    subtitle:         { type: String },
    content:          { type: String, required: true },
    featuredImageUrl: { type: String },
    views:            { type: Number, default: 0 },
    likes:            { type: Number, default: 0 },
    isPublished:      { type: Boolean, default: false },
    isDraft:          { type: Boolean, default: true },
    customFields:     { type: Schema.Types.Mixed, default: {} },
    tenantId:         { type: Schema.Types.ObjectId, ref: 'Tenant', required: true, index: true },
    websiteId:        { type: Schema.Types.ObjectId, ref: 'Website', index: true },
  },
  { timestamps: true }
);

export default model<IWebsiteNews>('WebsiteNews', websiteNewsSchema);
