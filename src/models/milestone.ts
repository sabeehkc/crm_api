import { Schema, model, Types } from 'mongoose';

export type MilestoneStatus = 'pending' | 'in_progress' | 'done';

export interface IMilestone {
  projectId: Types.ObjectId;
  title: string;
  dueDate: Date;
  status: MilestoneStatus;
  tenantId: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const milestoneSchema = new Schema<IMilestone>(
  {
    projectId: { type: Schema.Types.ObjectId, ref: 'Project', required: true },
    title:     { type: String, required: true, trim: true },
    dueDate:   { type: Date, required: true },
    status: {
      type: String,
      enum: ['pending', 'in_progress', 'done'],
      default: 'pending',
    },
    tenantId:  { type: Schema.Types.ObjectId, ref: 'Tenant', required: true, index: true },
  },
  { timestamps: true },
);

milestoneSchema.index({ projectId: 1, dueDate: 1 });

export default model<IMilestone>('Milestone', milestoneSchema);
