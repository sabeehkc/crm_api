import { Router } from 'express';
import { getMetrics, getRecentEnquiries } from '@/controllers/v1/dashboard';
import { authenticate } from '@/middlewares/authenticate';
import { tenantContext } from '@/middlewares/tenantContext';

const router = Router();

router.get('/', authenticate, tenantContext, getMetrics);
router.get('/enquiries', authenticate, tenantContext, getRecentEnquiries);

export default router;
