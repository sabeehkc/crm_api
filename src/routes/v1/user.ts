import { Router } from 'express';
import {
  getMe, updateMe, getUsers, getUserById,
  createUser, updateUserById, toggleUserStatus, deleteUser, forceLogout
} from '@/controllers/v1/user';
import { authenticate } from '@/middlewares/authenticate';
import { authorize } from '@/middlewares/authorize';
import { tenantContext } from '@/middlewares/tenantContext';
import { validateRequest } from '@/middlewares/validationError';
import { uploadProfilePicture } from '@/middlewares/upload';
import { createUserSchema, updateUserSchema } from '@/zod/user';

const router = Router();

router.get('/me',  authenticate, getMe);
router.put('/me',  authenticate, uploadProfilePicture, updateMe);

// Admin-only endpoints scoped to tenant context
router.get('/',    authenticate, tenantContext, authorize('admin'), getUsers);
router.post('/',   authenticate, tenantContext, authorize('admin'), uploadProfilePicture, validateRequest(createUserSchema), createUser);
router.get('/:id', authenticate, tenantContext, authorize('admin'), getUserById);
router.put('/:id', authenticate, tenantContext, authorize('admin'), uploadProfilePicture, validateRequest(updateUserSchema), updateUserById);
router.patch('/:id/status', authenticate, tenantContext, authorize('admin'), toggleUserStatus);
router.post('/:id/force-logout', authenticate, tenantContext, authorize('admin'), forceLogout);
router.delete('/:id',       authenticate, tenantContext, authorize('admin'), deleteUser);

export default router;
