import { Schema, model, Types } from 'mongoose';

export type ProjectStatus =
  | 'Just Started'
  | 'In Progress'
  | 'Nearly Done'
  | 'Completed'
  | 'On Hold';

export interface IProject {
  name: string;
  tags: string[];
  client: string;
  budget: number;
  progress: number;
  startDate: Date;
  dueDate: Date;
  status: ProjectStatus;
  description?: string;
  createdBy: Types.ObjectId;
  tenantId: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const projectSchema = new Schema<IProject>(
  {
    name:      { type: String, required: true, trim: true },
    tags:      { type: [String], default: [] },
    client:    { type: String, required: true, trim: true },
    budget:    { type: Number, required: true, min: 0 },
    progress:  { type: Number, default: 0, min: 0, max: 100 },
    startDate: { type: Date, required: true },
    dueDate:   { type: Date, required: true },
    status: {
      type: String,
      enum: ['Just Started', 'In Progress', 'Nearly Done', 'Completed', 'On Hold'],
      default: 'Just Started',
    },
    description: { type: String, trim: true },
    createdBy:   { type: Schema.Types.ObjectId, ref: 'User', required: true },
    tenantId:    { type: Schema.Types.ObjectId, ref: 'Tenant', required: true, index: true },
  },
  { timestamps: true },
);

projectSchema.index({ status: 1 });
projectSchema.index({ client: 1 });
projectSchema.index({ dueDate: 1 });

export default model<IProject>('Project', projectSchema);
