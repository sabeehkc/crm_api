import { Schema, model, Model, Types } from 'mongoose';

export interface IAnalytics {
  sessionId: string;
  intentDetected?: string;
  confidenceScore?: number;
  isFallback: boolean;
  activeFlow?: string;
  isCompletedFlow: boolean;
  latencyMs: number;
  timestamp: Date;
  tenantId: Types.ObjectId;
}

export interface IAnalyticsModel extends Model<IAnalytics> {}

const analyticsSchema = new Schema<IAnalytics>(
  {
    sessionId: {
      type: String,
      required: true,
      index: true,
    },
    intentDetected: {
      type: String,
      required: false,
    },
    confidenceScore: {
      type: Number,
      required: false,
    },
    isFallback: {
      type: Boolean,
      required: true,
      default: false,
      index: true,
    },
    activeFlow: {
      type: String,
      required: false,
    },
    isCompletedFlow: {
      type: Boolean,
      required: true,
      default: false,
      index: true,
    },
    latencyMs: {
      type: Number,
      required: true,
    },
    timestamp: {
      type: Date,
      default: Date.now,
      index: true,
    },
    tenantId: {
      type: Schema.Types.ObjectId,
      ref: 'Tenant',
      required: true,
      index: true,
    },
  },
  { timestamps: false },
);

export default model<IAnalytics, IAnalyticsModel>('Analytics', analyticsSchema);
