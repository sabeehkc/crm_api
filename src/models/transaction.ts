import { Schema, model, Types } from 'mongoose';

export type TransactionMode = 'bank' | 'upi' | 'cheque' | 'neft' | 'credit_card' | 'auto_debit' | 'cash';

export interface ITransaction {
  projectId: Types.ObjectId;
  client: string;
  amount: number;
  date: Date;
  mode: TransactionMode;
  type: 'payment' | 'expense';
  category?: string;
  description?: string;
  proofDocument?: string;
  notes?: string;
  createdBy: Types.ObjectId;
  tenantId: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const transactionSchema = new Schema<ITransaction>(
  {
    projectId:     { type: Schema.Types.ObjectId, ref: 'Project', required: true },
    client:        { type: String, required: true, trim: true },
    amount:        { type: Number, required: true, min: 0 },
    date:          { type: Date, required: true },
    mode: {
      type: String,
      enum: ['bank', 'upi', 'cheque', 'neft', 'credit_card', 'auto_debit', 'cash'],
      required: true,
    },
    type: {
      type: String,
      enum: ['payment', 'expense'],
      default: 'payment',
    },
    category:      { type: String, trim: true },
    description:   { type: String, trim: true },
    proofDocument: { type: String },
    notes:         { type: String, trim: true },
    createdBy:     { type: Schema.Types.ObjectId, ref: 'User', required: true },
    tenantId:      { type: Schema.Types.ObjectId, ref: 'Tenant', required: true, index: true },
  },
  { timestamps: true },
);

transactionSchema.index({ projectId: 1, date: -1 });

export default model<ITransaction>('Transaction', transactionSchema);
