import { Schema, model, Types } from 'mongoose';

export type InvoiceStatus = 'Pending' | 'Partial' | 'Paid';

export interface IInvoice {
  invoiceNumber: string;
  projectId: Types.ObjectId;
  client: string;
  totalAmount: number;
  receivedAmount: number;
  outstandingAmount: number;
  status: InvoiceStatus;
  issuedDate: Date;
  dueDate?: Date;
  createdBy: Types.ObjectId;
  tenantId: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const invoiceSchema = new Schema<IInvoice>(
  {
    invoiceNumber:  { type: String },
    projectId:      { type: Schema.Types.ObjectId, ref: 'Project', required: true },
    client:         { type: String, required: true, trim: true },
    totalAmount:    { type: Number, required: true, min: 0 },
    receivedAmount: { type: Number, default: 0, min: 0 },
    status:         { type: String, enum: ['Pending', 'Partial', 'Paid'], default: 'Pending' },
    issuedDate:     { type: Date, default: Date.now },
    dueDate:        { type: Date },
    createdBy:      { type: Schema.Types.ObjectId, ref: 'User', required: true },
    tenantId:       { type: Schema.Types.ObjectId, ref: 'Tenant', required: true, index: true },
  },
  {
    timestamps: true,
    toJSON:   { virtuals: true },
    toObject: { virtuals: true },
  },
);

invoiceSchema.virtual('outstandingAmount').get(function () {
  return Math.max(0, this.totalAmount - this.receivedAmount);
});

invoiceSchema.pre('save', async function (next) {
  if (!this.isNew) return next();
  try {
    const year  = new Date().getFullYear();
    const count = await (this.constructor as any).countDocuments({
      tenantId: this.tenantId,
      issuedDate: { $gte: new Date(`${year}-01-01`) },
    });
    this.invoiceNumber = `INV-${year}-${String(count + 1).padStart(3, '0')}`;
    next();
  } catch (err: any) {
    next(err);
  }
});

invoiceSchema.pre('save', function (next) {
  if (this.receivedAmount >= this.totalAmount) this.status = 'Paid';
  else if (this.receivedAmount > 0) this.status = 'Partial';
  else this.status = 'Pending';
  next();
});

invoiceSchema.index({ projectId: 1 });
invoiceSchema.index({ status: 1 });

export default model<IInvoice>('Invoice', invoiceSchema);
