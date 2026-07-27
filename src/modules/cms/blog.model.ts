import mongoose, { Schema, Document } from 'mongoose';

export enum BLOG_STATUS {
  DRAFT = 'DRAFT',
  PUBLISHED = 'PUBLISHED',
  ARCHIVED = 'ARCHIVED',
}

export interface IBlog extends Document {
  title: string;
  slug: string;
  shortDescription?: string;
  content: string;
  featuredImage?: string;
  author: string;
  category?: string;
  status: BLOG_STATUS;
  publishedAt?: Date;
  seoMeta?: {
    title?: string;
    description?: string;
    keywords?: string;
  };
  createdAt: Date;
  updatedAt: Date;
}

const BlogSchema = new Schema<IBlog>(
  {
    title: { type: String, required: true, trim: true },
    slug: { type: String, required: true, unique: true, trim: true },
    shortDescription: { type: String, trim: true },
    content: { type: String, required: true },
    featuredImage: { type: String },
    author: { type: String, required: true, trim: true },
    category: { type: String, trim: true },
    status: {
      type: String,
      enum: Object.values(BLOG_STATUS),
      default: BLOG_STATUS.DRAFT,
      required: true,
    },
    publishedAt: { type: Date },
    seoMeta: {
      title: { type: String, trim: true },
      description: { type: String, trim: true },
      keywords: { type: String, trim: true },
    },
  },
  {
    timestamps: true,
  }
);

BlogSchema.index({ status: 1 });
BlogSchema.index({ category: 1 });

export const BlogModel = mongoose.model<IBlog>('Blog', BlogSchema);
export default BlogModel;
