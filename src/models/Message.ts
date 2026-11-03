import { Schema, model, Model, Types } from 'mongoose';

export interface IEntityLog {
  name: string;
  value: any;
  raw: string;
}

export interface INluLog {
  intent: string;
  confidence: number;
  entities: IEntityLog[];
}

export interface IMessage {
  sessionId: string;
  sender: 'user' | 'bot';
  text: string;
  timestamp: Date;
  nluAnalysis?: INluLog;
  stateSnapshot?: Record<string, any>;
  latencyMs?: number;
  tenantId: Types.ObjectId;
}

export interface IMessageModel extends Model<IMessage> {
  findBySessionId(sessionId: string, tenantId: Types.ObjectId): Promise<IMessage[]>;
}

const entityLogSchema = new Schema<IEntityLog>({
  name: { type: String, required: true },
  value: { type: Schema.Types.Mixed, required: true },
  raw: { type: String, required: true },
}, { _id: false });

const nluLogSchema = new Schema<INluLog>({
  intent: { type: String, required: true },
  confidence: { type: Number, required: true },
  entities: { type: [entityLogSchema], default: [] },
}, { _id: false });

const messageSchema = new Schema<IMessage>(
  {
    sessionId: {
      type: String,
      required: true,
      index: true,
    },
    sender: {
      type: String,
      enum: ['user', 'bot'],
      required: true,
    },
    text: {
      type: String,
      required: true,
    },
    timestamp: {
      type: Date,
      default: Date.now,
      index: true,
    },
    nluAnalysis: {
      type: nluLogSchema,
      required: false,
    },
    stateSnapshot: {
      type: Schema.Types.Mixed,
      required: false,
    },
    latencyMs: {
      type: Number,
      required: false,
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

messageSchema.statics.findBySessionId = function (sessionId: string, tenantId: Types.ObjectId) {
  return this.find({ sessionId, tenantId }).sort({ timestamp: 1 });
};

export default model<IMessage, IMessageModel>('Message', messageSchema);
