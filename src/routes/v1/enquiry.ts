import { Router } from 'express';
import {
  listEnquiries, createEnquiry, getEnquiry,
  updateEnquiry, updateEnquiryStatus, deleteEnquiry,
} from '@/controllers/v1/enquiry';
import { authenticate } from '@/middlewares/authenticate';
import { tenantContext } from '@/middlewares/tenantContext';
import { checkPermission } from '@/middlewares/checkPermission';
import { validateRequest } from '@/middlewares/validationError';
import { createEnquirySchema, updateEnquirySchema, updateEnquiryStatusSchema } from '@/zod/enquiry';

const router = Router();

// Apply authentication and tenant context
router.use(authenticate);
router.use(tenantContext);

router.get('/',               checkPermission('enquiries', 'view'), listEnquiries);
router.post('/',              checkPermission('enquiries', 'create'), validateRequest(createEnquirySchema), createEnquiry);
router.get('/:id',            checkPermission('enquiries', 'view'), getEnquiry);
router.put('/:id',            checkPermission('enquiries', 'edit'), validateRequest(updateEnquirySchema), updateEnquiry);
router.patch('/:id/status',   checkPermission('enquiries', 'edit'), validateRequest(updateEnquiryStatusSchema), updateEnquiryStatus);
router.delete('/:id',         checkPermission('enquiries', 'delete'), deleteEnquiry);

export default router;
