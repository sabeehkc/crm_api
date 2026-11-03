import { Schema, model, Model, Types } from 'mongoose';

export interface IWebsiteContent {
  hero: {
    slides: Array<{ title?: string; order: number; type: 'image' | 'video'; mediaUrl?: string; customFields?: Record<string, any> }>;
  };
  updatedBy?: Types.ObjectId;
  tenantId: Types.ObjectId;
  websiteId?: Types.ObjectId;
  updatedAt: Date;
  createdAt: Date;
}

export interface IWebsiteContentModel extends Model<IWebsiteContent> {
  getInstance(tenantId: Types.ObjectId, websiteId?: string | Types.ObjectId): Promise<any>;
}

const websiteContentSchema = new Schema<IWebsiteContent>(
  {
    hero: {
      slides: {
        type: [
          {
            title:    { type: String },
            order:    { type: Number, default: 0 },
            type:     { type: String, enum: ['image', 'video'], default: 'image' },
            mediaUrl: { type: String },
            customFields: { type: Schema.Types.Mixed, default: {} },
          },
        ],
        default: [],
      },
    },
    updatedBy: { type: Schema.Types.ObjectId, ref: 'User' },
    tenantId:  { type: Schema.Types.ObjectId, ref: 'Tenant', required: true, index: true },
    websiteId: { type: Schema.Types.ObjectId, ref: 'Website', index: true },
  },
  { timestamps: true },
);

websiteContentSchema.statics.getInstance = async function (tenantId: Types.ObjectId, websiteId?: string | Types.ObjectId) {
  const query: any = { tenantId };
  if (websiteId) {
    query.websiteId = new Types.ObjectId(websiteId);
  } else {
    query.websiteId = { $exists: false }; // Legacy fallback
  }

  const update: any = {
    $setOnInsert: {
      tenantId,
      hero: { slides: [] },
    }
  };
  if (websiteId) {
    update.$setOnInsert.websiteId = new Types.ObjectId(websiteId);
  }

  const doc = await this.findOneAndUpdate(
    query,
    update,
    { new: true, upsert: true, setDefaultsOnInsert: true }
  );

  return doc;
};

export default model<IWebsiteContent, IWebsiteContentModel>('WebsiteContent', websiteContentSchema);
