import { Router } from 'express';
import { getCompanySettings, updateCompanySettings } from '@/controllers/v1/setting';
import { authenticate } from '@/middlewares/authenticate';
import { authorize } from '@/middlewares/authorize';
import { tenantContext } from '@/middlewares/tenantContext';
import { validateRequest } from '@/middlewares/validationError';
import { updateSettingSchema } from '@/zod/setting';
import imageUpload from '@/middlewares/upload';

const router = Router();

router.get('/company', authenticate, tenantContext, getCompanySettings);
router.put('/company', authenticate, tenantContext, authorize('admin'), imageUpload.single('logo'), validateRequest(updateSettingSchema), updateCompanySettings);

export default router;
