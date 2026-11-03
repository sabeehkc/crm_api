import { Schema, model, Model, Types } from 'mongoose';

export type EnquiryStatus =
  | 'New'
  | 'Followup'
  | 'Quotation Sent'
  | 'Converted'
  | 'Revised Quotation'
  | 'Rejected';

export interface IEnquiry {
  name: string;
  email: string;
  phone: string;
  service: string;
  date: Date;
  status: EnquiryStatus;
  type: 'Normal' | 'Sales';
  notes?: string;
  followupDate?: Date;
  followupTime?: string;
  quotationSentDate?: Date;
  convertedDate?: Date;
  rejectedDate?: Date;
  rejectReason?: string;
  revisedQuotationDate?: Date;
  createdBy: Types.ObjectId;
  tenantId: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

export interface IEnquiryModel extends Model<IEnquiry> {
  findByStatus(status: EnquiryStatus, tenantId: Types.ObjectId): Promise<IEnquiry[]>;
}

const enquirySchema = new Schema<IEnquiry>(
  {
    name:      { type: String, required: true, trim: true },
    email:     { type: String, required: true, lowercase: true, trim: true },
    phone:     { type: String, required: true, trim: true },
    service:   { type: String, required: true, trim: true },
    date:      { type: Date, default: Date.now },
    status: {
      type: String,
      enum: ['New', 'Followup', 'Quotation Sent', 'Converted', 'Revised Quotation', 'Rejected'],
      default: 'New',
    },
    type: {
      type: String,
      enum: ['Normal', 'Sales'],
      default: 'Normal',
    },
    notes:                { type: String, trim: true },
    followupDate:         { type: Date },
    followupTime:         { type: String, trim: true },
    quotationSentDate:    { type: Date },
    convertedDate:        { type: Date },
    rejectedDate:         { type: Date },
    rejectReason:         { type: String, trim: true, maxlength: 500 },
    revisedQuotationDate: { type: Date },
    createdBy:            { type: Schema.Types.ObjectId, ref: 'User', required: true },
    tenantId:             { type: Schema.Types.ObjectId, ref: 'Tenant', required: true, index: true },
  },
  { timestamps: true },
);

enquirySchema.index({ status: 1 });
enquirySchema.index({ date: -1 });
enquirySchema.index({ followupDate: 1 });

// Compound indexes for tenant-scoped uniqueness
enquirySchema.index({ tenantId: 1, email: 1 }, { unique: true });
enquirySchema.index({ tenantId: 1, phone: 1 }, { unique: true });

enquirySchema.statics.findByStatus = function (status: EnquiryStatus, tenantId: Types.ObjectId) {
  return this.find({ status, tenantId });
};

export default model<IEnquiry, IEnquiryModel>('Enquiry', enquirySchema);
