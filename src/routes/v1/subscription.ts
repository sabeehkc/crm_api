import { Router } from 'express';
import {
  listSubscriptions, getSubscriptionStats, createSubscription,
  getSubscription, updateSubscriptionStatus, deleteSubscription, exportSubscriptions,
} from '@/controllers/v1/subscription';
import { authenticate }    from '@/middlewares/authenticate';
import { authorize }       from '@/middlewares/authorize';
import { validateRequest } from '@/middlewares/validationError';
import { tenantContext }   from '@/middlewares/tenantContext';
import { createSubscriptionSchema, updateSubscriptionStatusSchema } from '@/zod/subscription';

const router = Router();

router.use(authenticate);
router.use(tenantContext);

router.get('/stats',  authorize('admin', 'sales', 'viewer'), getSubscriptionStats);
router.get('/export', authorize('admin', 'sales'), exportSubscriptions);
router.get('/',       authorize('admin', 'sales', 'viewer'), listSubscriptions);
router.post('/',      authorize('admin', 'sales'), validateRequest(createSubscriptionSchema), createSubscription);

router.get('/:id',          authorize('admin', 'sales', 'viewer'), getSubscription);
router.patch('/:id/status', authorize('admin', 'sales'), validateRequest(updateSubscriptionStatusSchema), updateSubscriptionStatus);
router.delete('/:id',       authorize('admin'), deleteSubscription);

export default router;
