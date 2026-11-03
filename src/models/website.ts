import { Schema, model, Types } from 'mongoose';

export interface IWebsite {
  name: string;
  domain?: string;
  tenantId: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const websiteSchema = new Schema<IWebsite>(
  {
    name: { type: String, required: true },
    domain: { type: String },
    tenantId: { type: Schema.Types.ObjectId, ref: 'Tenant', required: true, index: true },
  },
  { timestamps: true }
);

export default model<IWebsite>('Website', websiteSchema);
