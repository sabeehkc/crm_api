import { Router } from 'express';
import { listQuotations, createQuotation, getQuotation, updateQuotation, deleteQuotation, downloadQuotationPdf } from '@/controllers/v1/quotation';
import { authenticate } from '@/middlewares/authenticate';
import { tenantContext } from '@/middlewares/tenantContext';
import { checkPermission } from '@/middlewares/checkPermission';
import { validateRequest } from '@/middlewares/validationError';
import { createQuotationSchema, updateQuotationSchema } from '@/zod/quotation';

const router = Router();

// Apply authentication and tenant context
router.use(authenticate);
router.use(tenantContext);

router.get('/',          checkPermission('quotations', 'view'), listQuotations);
router.post('/',         checkPermission('quotations', 'create'), validateRequest(createQuotationSchema), createQuotation);
router.get('/:id',       checkPermission('quotations', 'view'), getQuotation);
router.get('/:id/pdf',   checkPermission('quotations', 'view'), downloadQuotationPdf);
router.put('/:id',       checkPermission('quotations', 'edit'), validateRequest(updateQuotationSchema), updateQuotation);
router.delete('/:id',    checkPermission('quotations', 'delete'), deleteQuotation);

export default router;
