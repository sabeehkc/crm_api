import { Schema, model, Types } from 'mongoose';

export type SubscriptionStatus = 'Active' | 'Unsubscribed' | 'Bounced';
export type SubscriptionSource =
  | 'Homepage Footer'
  | 'E-book Landing'
  | 'Checkout Opt-in'
  | 'Webinar Registration'
  | 'Exit Intent Popup'
  | 'Manual';

export interface ISubscription {
  name:    string;
  email:   string;
  source:  SubscriptionSource;
  tags:    string[];
  status:  SubscriptionStatus;
  tenantId: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const subscriptionSchema = new Schema<ISubscription>(
  {
    name:   { type: String, required: true, trim: true },
    email:  { type: String, required: true, trim: true, lowercase: true },
    source: {
      type: String,
      enum: ['Homepage Footer', 'E-book Landing', 'Checkout Opt-in', 'Webinar Registration', 'Exit Intent Popup', 'Manual'],
      default: 'Manual',
    },
    tags:   [{ type: String, trim: true }],
    status: {
      type:    String,
      enum:    ['Active', 'Unsubscribed', 'Bounced'],
      default: 'Active',
    },
    tenantId: { type: Schema.Types.ObjectId, ref: 'Tenant', required: true, index: true },
  },
  { timestamps: true },
);

subscriptionSchema.index({ status: 1 });

// Ensure email is unique per company
subscriptionSchema.index({ tenantId: 1, email: 1 }, { unique: true });

export default model<ISubscription>('Subscription', subscriptionSchema);
