import { Schema, model, Types, Document } from 'mongoose';

export interface ISetting extends Document {
  companyName: string;
  logo?: string;
  signatureName?: string;
  signatureRole?: string;
  address?: string;
  mobileNo?: string;
  email?: string;
  gstNo?: string;
  tenantId: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const settingSchema = new Schema<ISetting>(
  {
    companyName: { type: String, trim: true, default: 'My Company' },
    logo: { type: String, trim: true },
    signatureName: { type: String, trim: true },
    signatureRole: { type: String, trim: true },
    address: { type: String, trim: true },
    mobileNo: { type: String, trim: true },
    email: { type: String, trim: true, lowercase: true },
    gstNo: { type: String, trim: true },
    tenantId: { type: Schema.Types.ObjectId, ref: 'Tenant', required: true, unique: true, index: true },
  },
  { timestamps: true }
);

export default model<ISetting>('Setting', settingSchema);
