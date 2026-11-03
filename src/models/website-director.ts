import { Schema, model, Types } from 'mongoose';

export interface IWebsiteDirector {
  name: string;
  title?: string;
  email?: string;
  photoUrl?: string;
  tenantId: Types.ObjectId;
  websiteId?: Types.ObjectId;
}

const websiteDirectorSchema = new Schema<IWebsiteDirector>(
  {
    name:     { type: String, required: true },
    title:    { type: String },
    email:    { type: String },
    photoUrl: { type: String },
    tenantId: { type: Schema.Types.ObjectId, ref: 'Tenant', required: true, index: true },
    websiteId: { type: Schema.Types.ObjectId, ref: 'Website', index: true },
  },
  { timestamps: true }
);

export default model<IWebsiteDirector>('WebsiteDirector', websiteDirectorSchema);
