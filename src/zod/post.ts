import { z } from 'zod';

const postStatuses  = ['Draft', 'Published', 'Scheduled', 'Archived'] as const;
const postCategories = ['Blog', 'News', 'Announcement', 'Documentation'] as const;

export const createPostSchema = z.object({
  body: z.object({
    title:       z.string().min(2, 'Title required'),
    slug:        z.string().optional(),
    category:    z.enum(postCategories).optional(),
    summary:     z.string().max(500).optional(),
    thumbnail:   z.string().optional(),
    metaTags:    z.union([z.string(), z.array(z.string())]).optional(),
    status:      z.enum(postStatuses).optional(),
    publishDate: z.union([z.string(), z.date()]).optional().transform(v => v ? new Date(v) : v),
  }),
});

export const updatePostSchema = z.object({
  body: createPostSchema.shape.body.partial(),
});

export const updatePostStatusSchema = z.object({
  body: z.object({
    status: z.enum(postStatuses),
  }),
});
