import { Schema, model, Types } from 'mongoose';

export interface IWebsiteTool {
  name: string;
  description?: string;
  link: string;
  logoUrl?: string;
  tenantId: Types.ObjectId;
  websiteId?: Types.ObjectId;
}

const websiteToolSchema = new Schema<IWebsiteTool>(
  {
    name:        { type: String, required: true },
    description: { type: String },
    link:        { type: String, required: true },
    logoUrl:     { type: String },
    tenantId:    { type: Schema.Types.ObjectId, ref: 'Tenant', required: true, index: true },
    websiteId:   { type: Schema.Types.ObjectId, ref: 'Website', index: true },
  },
  { timestamps: true }
);

export default model<IWebsiteTool>('WebsiteTool', websiteToolSchema);
