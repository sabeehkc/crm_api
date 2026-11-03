import { Schema, model, Model, Types } from 'mongoose';

export interface IIntent {
  name: string;
  examples: string[];
  tenantId?: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

export interface IIntentModel extends Model<IIntent> {
  getTrainingData(tenantId: Types.ObjectId): Promise<IIntent[]>;
}

const intentSchema = new Schema<IIntent>(
  {
    name: {
      type: String,
      required: true,
      trim: true,
      index: true,
    },
    examples: {
      type: [String],
      default: [],
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

intentSchema.statics.getTrainingData = function (tenantId: Types.ObjectId) {
  return this.find({ tenantId });
};

// Scope uniqueness of intent names to tenant
intentSchema.index({ tenantId: 1, name: 1 }, { unique: true });

export default model<IIntent, IIntentModel>('Intent', intentSchema);
