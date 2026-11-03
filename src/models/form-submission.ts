import { Schema, model, Types } from 'mongoose';

export type SubmissionStatus = 'Read' | 'Unread' | 'Spam';

export interface IFormSubmission {
  formId: Types.ObjectId;
  data: Record<string, unknown>;
  status: SubmissionStatus;
  ipAddress?: string;
  createdAt: Date;
  updatedAt: Date;
}

const formSubmissionSchema = new Schema<IFormSubmission>(
  {
    formId:    { type: Schema.Types.ObjectId, ref: 'FormEndpoint', required: true, index: true },
    data:      { type: Schema.Types.Mixed, default: {} },
    status:    { type: String, enum: ['Read', 'Unread', 'Spam'], default: 'Unread' },
    ipAddress: { type: String },
  },
  { timestamps: true },
);

formSubmissionSchema.index({ formId: 1, createdAt: -1 });
formSubmissionSchema.index({ status: 1 });

export default model<IFormSubmission>('FormSubmission', formSubmissionSchema);
