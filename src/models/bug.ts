import { Schema, model, Types } from 'mongoose';

export type BugSeverity = 'Critical' | 'High'| 'Medium' | 'Low';
export type BugStatus   = 'Open' | 'In Progress' | 'Resolved';

export interface IBug {
  projectId: Types.ObjectId;
  bugId: string;
  title: string;
  reporter: string;
  severity: BugSeverity;
  status: BugStatus;
  stepsToReproduce?: string;
  resolution?: string;
  reportedAt: Date;
  resolvedAt?: Date;
  resolutionTime?: string;
  tenantId: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const bugSchema = new Schema<IBug>(
  {
    projectId:        { type: Schema.Types.ObjectId, ref: 'Project', required: true },
    bugId:            { type: String },
    title:            { type: String, required: true, trim: true },
    reporter:         { type: String, required: true, trim: true },
    severity:         { type: String, enum: ['Critical', 'High', 'Medium','Low'], required: true },
    status:           { type: String, enum: ['Open', 'In Progress', 'Resolved'], default: 'Open' },
    stepsToReproduce: { type: String },
    resolution:       { type: String },
    reportedAt:       { type: Date, default: Date.now },
    resolvedAt:       { type: Date },
    resolutionTime:   { type: String },
    tenantId:         { type: Schema.Types.ObjectId, ref: 'Tenant', required: true, index: true },
  },
  { timestamps: true },
);

bugSchema.pre('save', async function (next) {
  if (!this.isNew) return next();
  try {
    const count = await (this.constructor as any).countDocuments({ projectId: this.projectId });
    this.bugId = `BUG-${String(count + 1).padStart(3, '0')}`;
    next();
  } catch (err: any) {
    next(err);
  }
});

bugSchema.index({ projectId: 1, status: 1 });
bugSchema.index({ severity: 1 });

export default model<IBug>('Bug', bugSchema);
