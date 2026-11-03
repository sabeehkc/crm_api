import { Schema, model, Types } from 'mongoose';

export type PostStatus   = 'Draft' | 'Published' | 'Scheduled' | 'Archived';
export type PostCategory = 'Blog' | 'News' | 'Announcement' | 'Documentation' | 'Tips & Tricks' | 'Case Study';

export interface IPost {
  title:       string;
  slug:        string;
  category:    PostCategory;
  summary?:    string;
  thumbnail?:  string;
  metaTags:    string[];
  status:      PostStatus;
  content:     any[];
  publishDate?: Date;
  views:       number;
  author:      Types.ObjectId;
  tenantId:    Types.ObjectId;
  createdAt:   Date;
  updatedAt:   Date;
}

const postSchema = new Schema<IPost>(
  {
    title:       { type: String, required: true, trim: true },
    slug:        { type: String, required: true, trim: true, lowercase: true },
    category: {
      type:    String,
      enum:    ['Blog', 'News', 'Announcement', 'Documentation', 'Tips & Tricks', 'Case Study'],
      default: 'Blog',
    },
    summary:     { type: String, trim: true },
    thumbnail:   { type: String },
    metaTags:    [{ type: String, trim: true }],
    status: {
      type:    String,
      enum:    ['Draft', 'Published', 'Scheduled', 'Archived'],
      default: 'Draft',
    },
    content:     [Schema.Types.Mixed],
    publishDate: { type: Date },
    views:       { type: Number, default: 0 },
    author:      { type: Schema.Types.ObjectId, ref: 'User', required: true },
    tenantId:    { type: Schema.Types.ObjectId, ref: 'Tenant', required: true, index: true },
  },
  { timestamps: true },
);

postSchema.index({ status: 1 });
postSchema.index({ category: 1 });
postSchema.index({ publishDate: -1 });

// Ensure slugs are unique per company
postSchema.index({ tenantId: 1, slug: 1 }, { unique: true });

export default model<IPost>('Post', postSchema);
