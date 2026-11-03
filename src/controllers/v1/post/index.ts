import { Request, Response, NextFunction } from 'express';
import { sendSuccess, sendNotFound } from '@/utils';
import Post from '@/models/post';
import { getRelativePath, getImageUrl } from '@/middlewares/upload';

function generateSlug(title: string): string {
  return title
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-');
}

async function uniqueSlug(base: string, excludeId?: string): Promise<string> {
  let slug = base;
  let i = 1;
  while (true) {
    const query: any = { slug };
    if (excludeId) query._id = { $ne: excludeId };
    const exists = await Post.exists(query);
    if (!exists) return slug;
    slug = `${base}-${i++}`;
  }
}

export const listPosts = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { page = 1, limit = 20, search, status, category } = req.query;
    const query: any = {};
    if (req.user && (req as any).tenantId) {
      query.tenantId = (req as any).tenantId;
    } else if (req.query.tenantId) {
      query.tenantId = req.query.tenantId;
    }
    if (status)   query.status   = status;
    if (category) query.category = category;
    if (search) {
      query.$or = [
        { title:   { $regex: search, $options: 'i' } },
        { summary: { $regex: search, $options: 'i' } },
        { metaTags: { $in: [new RegExp(String(search), 'i')] } },
      ];
    }
    const [items, total] = await Promise.all([
      Post.find(query)
        .sort({ createdAt: -1 })
        .skip((+page - 1) * +limit)
        .limit(+limit)
        .populate('author', 'name email profile'),
      Post.countDocuments(query),
    ]);
    sendSuccess(res, { items, total, page: +page, limit: +limit, totalPages: Math.ceil(total / +limit) });
  } catch (err) {
    next(err);
  }
};

export const getPostStats = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const tQuery = { tenantId: req.tenantId };
    const [total, published, scheduled, drafts, archived] = await Promise.all([
      Post.countDocuments(tQuery),
      Post.countDocuments({ ...tQuery, status: 'Published' }),
      Post.countDocuments({ ...tQuery, status: 'Scheduled' }),
      Post.countDocuments({ ...tQuery, status: 'Draft' }),
      Post.countDocuments({ ...tQuery, status: 'Archived' }),
    ]);
    sendSuccess(res, { total, published, scheduled, drafts, archived });
  } catch (err) {
    next(err);
  }
};

export const createPost = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { title, metaTags, content, slug: customSlug, ...rest } = req.body;
    const slug = await uniqueSlug(generateSlug(customSlug || title));
    
    const data: any = { title, slug, content, ...rest, author: (req.user as any)._id, tenantId: (req as any).tenantId };
    
    if (req.file) {
      data.thumbnail = getImageUrl(getRelativePath(req.file.path));
    }

    if (metaTags) {
      data.metaTags = Array.isArray(metaTags) ? metaTags : String(metaTags).split(',').map(t => t.trim());
    }

    const post = await Post.create(data);
    sendSuccess(res, post, 'Post created', 201);
  } catch (err) {
    next(err);
  }
};

export const getPost = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = req.params.id;
    const query: any = {};
    
    if (/^[0-9a-fA-F]{24}$/.test(id)) {
      query.$or = [{ _id: id }, { slug: id }];
    } else {
      query.slug = id;
    }

    if (req.user && (req as any).tenantId) {
      query.tenantId = (req as any).tenantId;
    } else if (req.query.tenantId) {
      query.tenantId = req.query.tenantId;
    }
    const post = await Post.findOne(query).populate('author', 'name email profile');
    if (!post) return sendNotFound(res, 'Post not found');
    sendSuccess(res, post);
  } catch (err) {
    next(err);
  }
};

export const updatePost = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { title, metaTags, content, slug: customSlug, ...rest } = req.body;
    const update: any = { ...rest };
    
    if (content !== undefined) update.content = content;

    if (title) update.title = title;

    if (customSlug) {
      update.slug = await uniqueSlug(generateSlug(customSlug), req.params.id);
    } else if (title) {
      update.slug = await uniqueSlug(generateSlug(title), req.params.id);
    }

    if (req.file) {
      update.thumbnail = getImageUrl(getRelativePath(req.file.path));
    }

    if (metaTags) {
      update.metaTags = Array.isArray(metaTags) ? metaTags : String(metaTags).split(',').map(t => t.trim());
    }

    const post = await Post.findOneAndUpdate({ _id: req.params.id, tenantId: req.tenantId }, update, { new: true, runValidators: true });
    if (!post) return sendNotFound(res, 'Post not found');
    sendSuccess(res, post, 'Post updated');
  } catch (err) {
    next(err);
  }
};

export const updatePostStatus = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const post = await Post.findOneAndUpdate(
      { _id: req.params.id, tenantId: req.tenantId },
      { status: req.body.status },
      { new: true, runValidators: true },
    );
    if (!post) return sendNotFound(res, 'Post not found');
    sendSuccess(res, post, 'Status updated');
  } catch (err) {
    next(err);
  }
};

export const incrementViews = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const post = await Post.findOneAndUpdate({ _id: req.params.id }, { $inc: { views: 1 } }, { new: true });
    if (!post) return sendNotFound(res, 'Post not found');
    sendSuccess(res, { views: post.views });
  } catch (err) {
    next(err);
  }
};

export const deletePost = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const post = await Post.findOneAndDelete({ _id: req.params.id, tenantId: req.tenantId });
    if (!post) return sendNotFound(res, 'Post not found');
    sendSuccess(res, null, 'Post deleted');
  } catch (err) {
    next(err);
  }
};

export const uploadImage = async (req: Request, res: Response, next: NextFunction) => {
  try {
    if (!req.file) return sendNotFound(res, 'No image file provided');
    const url = getImageUrl(getRelativePath(req.file.path));
    sendSuccess(res, { url }, 'Image uploaded successfully');
  } catch (err) {
    next(err);
  }
};
