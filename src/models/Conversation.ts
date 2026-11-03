import { Schema, model, Model, Types } from 'mongoose';

export interface IContext {
  name: string;
  lifespan: number;
  parameters: Record<string, any>;
}

export interface IConversation {
  sessionId: string;
  userId?: Types.ObjectId | string;
  activeFlow?: string;
  currentIntent?: string;
  waitingFor?: string;
  slots: Record<string, any>;
  contexts: IContext[];
  metadata: Record<string, any>;
  tenantId: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

export interface IConversationModel extends Model<IConversation> {
  findBySessionId(sessionId: string, tenantId: Types.ObjectId): Promise<IConversation | null>;
}

const contextSchema = new Schema<IContext>({
  name: { type: String, required: true },
  lifespan: { type: Number, required: true, default: 5 },
  parameters: { type: Schema.Types.Mixed, default: {} },
}, { _id: false });

const conversationSchema = new Schema<IConversation>(
  {
    sessionId: {
      type: String,
      required: true,
      index: true,
    },
    userId: {
      type: Schema.Types.Mixed,
      ref: 'User',
      index: true,
      required: false,
    },
    activeFlow: {
      type: String,
      required: false,
    },
    currentIntent: {
      type: String,
      required: false,
    },
    waitingFor: {
      type: String,
      required: false,
    },
    slots: {
      type: Schema.Types.Mixed,
      default: {},
    },
    contexts: {
      type: [contextSchema],
      default: [],
    },
    metadata: {
      type: Schema.Types.Mixed,
      default: {},
    },
    tenantId: {
      type: Schema.Types.ObjectId,
      ref: 'Tenant',
      required: true,
      index: true,
    },
  },
  { timestamps: true },
);

conversationSchema.statics.findBySessionId = function (sessionId: string, tenantId: Types.ObjectId) {
  return this.findOne({ sessionId, tenantId });
};

// Scope session ID uniqueness to tenant
conversationSchema.index({ tenantId: 1, sessionId: 1 }, { unique: true });

export default model<IConversation, IConversationModel>('Conversation', conversationSchema);
