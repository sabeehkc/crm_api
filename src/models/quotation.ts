import { Schema, model, Types } from 'mongoose';

export interface ILineItem {
  desc: string;
  qty: number;
  rate: number;
}

export interface ITimelineItem {
  title: string;
  description: string;
  duration: string;
  amount: number;
}

export interface IFeatureItem {
  module: string;
  user: string;
  feature: string;
}

export interface IQuotation {
  enquiryId?: Types.ObjectId;
  referenceNumber: string;
  lineItems: ILineItem[];
  welcomeTitle?: string;
  salutation?: string;
  projectOverview?: string;
  coreObjective?: string;
  features?: IFeatureItem[];
  thanksNote?: string;
  closingNote?: string;
  signatureName?: string;
  signatureRole?: string;
  termsPoints?: string[];
  terms?: string;
  timelineItems: ITimelineItem[];
  companyDetails: { name: string; address: string; phone: string; email: string };
  clientDetails:  { name: string; company: string; email: string };
  quoteMeta:      { date: string; validFor: string; ref: string };
  gstPercent: number;
  subtotal: number;
  gstAmount: number;
  totalAmount: number;
  status: 'Draft' | 'Sent' | 'Approved' | 'Rejected' | 'Revised';
  revisionNumber: number;
  parentQuotationId?: Types.ObjectId;
  revisionNotes?: string;
  createdBy: Types.ObjectId;
  tenantId: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const lineItemSchema = new Schema<ILineItem>(
  { desc: String, qty: Number, rate: Number },
  { _id: false, toJSON: { virtuals: true }, toObject: { virtuals: true } },
);
lineItemSchema.virtual('amount').get(function () {
  return (this.qty || 0) * (this.rate || 0);
});

const quotationSchema = new Schema<IQuotation>(
  {
    enquiryId:      { type: Schema.Types.ObjectId, ref: 'Enquiry' },
    referenceNumber: { type: String },
    lineItems:      { type: [lineItemSchema], default: [] },
    welcomeTitle:   { type: String, trim: true },
    salutation:     { type: String, trim: true },
    projectOverview: { type: String, trim: true },
    coreObjective:  { type: String, trim: true },
    features:       { 
      type: [{ module: String, user: String, feature: String, _id: false }], 
      default: [] 
    },
    thanksNote:     { type: String, trim: true },
    closingNote:    { type: String, trim: true },
    signatureName:  { type: String, trim: true },
    signatureRole:  { type: String, trim: true },
    termsPoints:    { type: [String], default: [] },
    terms:          { type: String, trim: true },
    timelineItems: {
      type: [{ title: String, description: String, duration: String, amount: Number, _id: false }],
      default: [],
    },
    companyDetails: { name: String, address: String, phone: String, email: String, _id: false },
    clientDetails:  { name: String, company: String, email: String, _id: false },
    quoteMeta:      { date: String, validFor: String, ref: String, _id: false },
    gstPercent:     { type: Number, default: 18, min: 0, max: 100 },
    status:         { type: String, enum: ['Draft', 'Sent', 'Approved', 'Rejected', 'Revised'], default: 'Draft' },
    revisionNumber: { type: Number, default: 1 },
    parentQuotationId: { type: Schema.Types.ObjectId, ref: 'Quotation' },
    revisionNotes:  { type: String },
    createdBy:      { type: Schema.Types.ObjectId, ref: 'User', required: true },
    tenantId:       { type: Schema.Types.ObjectId, ref: 'Tenant', required: true, index: true },
  },
  {
    timestamps: true,
    toJSON:   { virtuals: true },
    toObject: { virtuals: true },
  },
);

quotationSchema.virtual('subtotal').get(function () {
  const lineItemsSub = this.lineItems.reduce((s, i) => s + (i.qty || 0) * (i.rate || 0), 0);
  const timelineSub = this.timelineItems.reduce((s, i) => s + (i.amount || 0), 0);
  return lineItemsSub + timelineSub;
});
quotationSchema.virtual('gstAmount').get(function () {
  const lineItemsSub = this.lineItems.reduce((s, i) => s + (i.qty || 0) * (i.rate || 0), 0);
  const timelineSub = this.timelineItems.reduce((s, i) => s + (i.amount || 0), 0);
  const sub = lineItemsSub + timelineSub;
  return +(sub * (this.gstPercent / 100)).toFixed(2);
});
quotationSchema.virtual('totalAmount').get(function () {
  const lineItemsSub = this.lineItems.reduce((s, i) => s + (i.qty || 0) * (i.rate || 0), 0);
  const timelineSub = this.timelineItems.reduce((s, i) => s + (i.amount || 0), 0);
  const sub = lineItemsSub + timelineSub;
  return +(sub + sub * (this.gstPercent / 100)).toFixed(2);
});

quotationSchema.pre('save', async function (next) {
  if (!this.isNew) return next();
  try {
    const count = await (this.constructor as any).countDocuments({ tenantId: this.tenantId });
    this.referenceNumber = `QT-${String(count + 1).padStart(4, '0')}`;
    next();
  } catch (err: any) {
    next(err);
  }
});

quotationSchema.index({ enquiryId: 1 });

export default model<IQuotation>('Quotation', quotationSchema);
