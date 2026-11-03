import { Router } from 'express';
import {
  listPosts, getPostStats, createPost, getPost,
  updatePost, updatePostStatus, incrementViews, deletePost, uploadImage,
} from '@/controllers/v1/post';
import { authenticate } from '@/middlewares/authenticate';
import { tenantContext } from '@/middlewares/tenantContext';
import { authorize }    from '@/middlewares/authorize';
import { validateRequest } from '@/middlewares/validationError';
import { uploadThumbnail } from '@/middlewares/upload';
import { createPostSchema, updatePostSchema, updatePostStatusSchema } from '@/zod/post';

const router = Router();

router.get('/stats', authenticate, tenantContext, authorize('admin', 'sales', 'viewer', 'designer', 'developer'), getPostStats);
router.get('/',  listPosts);
router.post('/',     authenticate, tenantContext, authorize('admin', 'sales', 'designer'), uploadThumbnail, validateRequest(createPostSchema), createPost);
router.post('/upload-image', authenticate, tenantContext, authorize('admin', 'sales', 'designer'), uploadThumbnail, uploadImage);

router.get('/:id',    getPost);
router.put('/:id',            authenticate, tenantContext, authorize('admin', 'sales', 'designer'), uploadThumbnail, validateRequest(updatePostSchema), updatePost);
router.patch('/:id/status',   authenticate, tenantContext, authorize('admin', 'sales', 'designer'), validateRequest(updatePostStatusSchema), updatePostStatus);
router.patch('/:id/views',    incrementViews);
router.delete('/:id',         authenticate, tenantContext, authorize('admin'), deletePost);

export default router;
