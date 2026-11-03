import { Schema, model, Types } from 'mongoose';

export interface IWebsiteClient {
  name: string;
  contactPerson?: string;
  testimony?: string;
  logoUrl?: string;
  isShown: boolean;
  customFields?: Record<string, any>;
  tenantId: Types.ObjectId;
  websiteId?: Types.ObjectId;
}

const websiteClientSchema = new Schema<IWebsiteClient>(
  {
    name:          { type: String, required: true },
    contactPerson: { type: String },
    testimony:     { type: String },
    logoUrl:       { type: String },
    isShown:       { type: Boolean, default: true },
    customFields:  { type: Schema.Types.Mixed, default: {} },
    tenantId:      { type: Schema.Types.ObjectId, ref: 'Tenant', required: true, index: true },
    websiteId:     { type: Schema.Types.ObjectId, ref: 'Website', index: true },
  },
  { timestamps: true }
);

export default model<IWebsiteClient>('WebsiteClient', websiteClientSchema);
