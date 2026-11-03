import { Schema, model, Types } from 'mongoose';

export type ExpenseCategory =
  | 'Infrastructure'
  | 'Tools'
  | 'Operations'
  | 'HR & Culture'
  | 'Marketing'
  | 'Payroll'
  | 'Other';

export type ExpenseMode = 'Bank Transfer' | 'UPI' | 'Credit Card' | 'Cash' | 'Auto Debit';

export interface IExpense {
  description: string;
  category: ExpenseCategory;
  amount: number;
  date: Date;
  mode: ExpenseMode;
  proofDocument?: string;
  proofVerified: boolean;
  notes?: string;
  createdBy: Types.ObjectId;
  tenantId: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const expenseSchema = new Schema<IExpense>(
  {
    description:   { type: String, required: true, trim: true, maxlength: 200 },
    category: {
      type: String,
      enum: ['Infrastructure', 'Tools', 'Operations', 'HR & Culture', 'Marketing', 'Payroll', 'Other'],
      required: true,
    },
    amount:        { type: Number, required: true, min: 0 },
    date:          { type: Date, required: true },
    mode: {
      type: String,
      enum: ['Bank Transfer', 'UPI', 'Credit Card', 'Cash', 'Auto Debit'],
      required: true,
    },
    proofDocument: { type: String },
    proofVerified: { type: Boolean, default: false },
    notes:         { type: String, trim: true },
    createdBy:     { type: Schema.Types.ObjectId, ref: 'User', required: true },
    tenantId:      { type: Schema.Types.ObjectId, ref: 'Tenant', required: true, index: true },
  },
  { timestamps: true },
);

expenseSchema.index({ category: 1, date: -1 });

export default model<IExpense>('Expense', expenseSchema);
