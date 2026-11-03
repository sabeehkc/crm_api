import { Schema, model, Types } from 'mongoose';

export interface IWebsiteAboutUs {
  title: string;
  description?: string;
  mediaUrl?: string;
  isLive: boolean;
  displayOrder: number;
  mission?: string;
  vision?: string;
  values?: string;
  companyStatistics?: {
    clients?: string;
    projects?: string;
    teamMembers?: string;
    experience?: string;
  };
  companyLocation?: {
    name?: string;
    address?: string;
    directionLink?: string;
    image?: string;
  };
  customFields?: Record<string, any>;
  tenantId: Types.ObjectId;
  websiteId?: Types.ObjectId;
}

const websiteAboutUsSchema = new Schema<IWebsiteAboutUs>(
  {
    title:        { type: String, required: true },
    description:  { type: String },
    mediaUrl:     { type: String },
    isLive:       { type: Boolean, default: true },
    displayOrder: { type: Number, default: 0 },
    mission:      { type: String },
    vision:       { type: String },
    values:       { type: String },
    companyStatistics: {
      clients: { type: String },
      projects: { type: String },
      teamMembers: { type: String },
      experience: { type: String },
    },
    companyLocation: {
      name: { type: String },
      address: { type: String },
      directionLink: { type: String },
      image: { type: String },
    },
    customFields: { type: Schema.Types.Mixed, default: {} },
    tenantId:     { type: Schema.Types.ObjectId, ref: 'Tenant', required: true, index: true },
    websiteId:    { type: Schema.Types.ObjectId, ref: 'Website', index: true },
  },
  { timestamps: true }
);

export default model<IWebsiteAboutUs>('WebsiteAboutUs', websiteAboutUsSchema);
