import { Schema, model, Model, Types } from 'mongoose';

export interface ISlotDefinition {
  name: string;
  type: 'string' | 'number' | 'date' | 'email';
  isRequired: boolean;
  promptTemplates: string[];
}

export interface IFlow {
  name: string;
  intentTrigger: string;
  requiredSlots: ISlotDefinition[];
  onCompleteAction?: string;
  tenantId?: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

export interface IFlowModel extends Model<IFlow> {
  findByName(name: string, tenantId: Types.ObjectId): Promise<IFlow | null>;
}

const slotDefinitionSchema = new Schema<ISlotDefinition>({
  name: { type: String, required: true },
  type: {
    type: String,
    enum: ['string', 'number', 'date', 'email'],
    required: true,
  },
  isRequired: { type: Boolean, default: true },
  promptTemplates: { type: [String], default: [] },
}, { _id: false });

const flowSchema = new Schema<IFlow>(
  {
    name: {
      type: String,
      required: true,
      trim: true,
      index: true,
    },
    intentTrigger: {
      type: String,
      required: true,
      index: true,
    },
    requiredSlots: {
      type: [slotDefinitionSchema],
      default: [],
    },
    onCompleteAction: {
      type: String,
      required: false,
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

flowSchema.statics.findByName = function (name: string, tenantId: Types.ObjectId) {
  return this.findOne({ name, tenantId });
};

// Scope flow names unique constraint to tenant
flowSchema.index({ tenantId: 1, name: 1 }, { unique: true });

export default model<IFlow, IFlowModel>('Flow', flowSchema);
