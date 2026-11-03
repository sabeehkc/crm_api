import { Router } from 'express';
import { uploadImage, uploadImages } from '@/controllers/v1/upload';
import { authenticate } from '@/middlewares/authenticate';
import { uploadSingleImage, uploadMultipleImages } from '@/middlewares/upload';

const router = Router();

/**
 * @swagger
 * /api/v1/uploads/image:
 *   post:
 *     summary: Upload a single image
 *     tags: [Uploads]
 *     security:
 *       - bearerAuth: []
 */
router.post('/image', authenticate, uploadSingleImage, uploadImage);

/**
 * @swagger
 * /api/v1/uploads/multiple:
 *   post:
 *     summary: Upload multiple images
 *     tags: [Uploads]
 *     security:
 *       - bearerAuth: []
 */
router.post('/multiple', authenticate, uploadMultipleImages, uploadImages);

export default router;
