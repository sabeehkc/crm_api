import { Schema, model, Types } from 'mongoose';

export type TaskStatus = 'Pending' | 'In Progress' | 'Done';

export interface ITask {
  milestoneId?: Types.ObjectId;
  projectId?: Types.ObjectId;
  title: string;
  description?: string;

  // Section 1
  clientName?: string;
  date?: string;
  activity?: string;

  // Section 2
  division?: string;
  workDetail?: string;

  // Section 3
  allottedBy?: Types.ObjectId;
  allottedTo?: Types.ObjectId;
  allottedDate?: string;
  targetDate?: string;
  completedDate?: string;

  // Section 4
  status: TaskStatus;
  clientStatus?: string;
  billing?: string;
  remarks?: string;

  dueDate?: Date;
  time?: string;
  tenantId: Types.ObjectId;
  createdBy?: Types.ObjectId;
  assignedTo?: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const taskSchema = new Schema<ITask>(
  {
    milestoneId: { type: Schema.Types.ObjectId, ref: 'Milestone', required: false },
    projectId:   { type: Schema.Types.ObjectId, ref: 'Project', required: false },
    title:       { type: String, required: false, trim: true, default: '' },
    description: { type: String, trim: true, default: '' },

    // Section 1
    clientName:  { type: String, trim: true, default: '' },
    date:        { type: String, trim: true, default: '' },
    activity:    { type: String, trim: true, default: '' },

    // Section 2
    division:    { type: String, trim: true, default: '' },
    workDetail:  { type: String, trim: true, default: '' },

    // Section 3
    allottedBy:    { type: Schema.Types.ObjectId, ref: 'User', required: false },
    allottedTo:    { type: Schema.Types.ObjectId, ref: 'User', required: false },
    allottedDate:  { type: String, trim: true, default: '' },
    targetDate:    { type: String, trim: true, default: '' },
    completedDate: { type: String, trim: true, default: '' },

    // Section 4
    status: {
      type: String,
      default: 'Pending',
    },
    clientStatus: { type: String, trim: true, default: 'Pending' },
    billing:      { type: String, trim: true, default: 'Billable' },
    remarks:      { type: String, trim: true, default: '' },

    dueDate:     { type: Date, required: false },
    time:        { type: String, trim: true, default: '' },
    createdBy:   { type: Schema.Types.ObjectId, ref: 'User', required: false },
    assignedTo:  { type: Schema.Types.ObjectId, ref: 'User', required: false },
    tenantId:    { type: Schema.Types.ObjectId, ref: 'Tenant', required: true, index: true },
  },
  { timestamps: true },
);

taskSchema.index({ milestoneId: 1 });
taskSchema.index({ projectId: 1 });

export default model<ITask>('Task', taskSchema);
