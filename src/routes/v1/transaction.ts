import { Router } from 'express';
import {
  listTransactions, getTransactionOverview, createTransaction, updateTransaction, deleteTransaction,
  listInvoices, createInvoice, getInvoice, updateReceivedAmount,
} from '@/controllers/v1/transaction';
import { authenticate } from '@/middlewares/authenticate';
import { tenantContext } from '@/middlewares/tenantContext';
import { checkPermission } from '@/middlewares/checkPermission';
import { validateRequest } from '@/middlewares/validationError';
import { uploadPaymentProof } from '@/middlewares/upload';
import { createTransactionSchema, updateTransactionSchema, createInvoiceSchema, updateReceivedSchema } from '@/zod/transaction';

const router = Router();

// Apply authentication and tenant context
router.use(authenticate);
router.use(tenantContext);

// Transactions
router.get('/',          checkPermission('invoices', 'view'), listTransactions);
router.get('/overview',  checkPermission('invoices', 'view'), getTransactionOverview);
router.post('/',         checkPermission('invoices', 'create'), uploadPaymentProof, validateRequest(createTransactionSchema), createTransaction);
router.put('/:id',       checkPermission('invoices', 'edit'), uploadPaymentProof, validateRequest(updateTransactionSchema), updateTransaction);
router.delete('/:id',    checkPermission('invoices', 'delete'), deleteTransaction);

// Invoices
router.get('/invoices',              checkPermission('invoices', 'view'), listInvoices);
router.post('/invoices',             checkPermission('invoices', 'create'), validateRequest(createInvoiceSchema), createInvoice);
router.get('/invoices/:id',          checkPermission('invoices', 'view'), getInvoice);
router.patch('/invoices/:id/received', checkPermission('invoices', 'edit'), validateRequest(updateReceivedSchema), updateReceivedAmount);

export default router;
