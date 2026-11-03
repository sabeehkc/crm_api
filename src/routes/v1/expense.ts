import { Router } from 'express';
import { listExpenses, getExpenseSummary, createExpense, updateExpense, deleteExpense } from '@/controllers/v1/expense';
import { authenticate } from '@/middlewares/authenticate';
import { tenantContext } from '@/middlewares/tenantContext';
import { checkPermission } from '@/middlewares/checkPermission';
import { validateRequest } from '@/middlewares/validationError';
import { uploadExpenseProof } from '@/middlewares/upload';
import { createExpenseSchema, updateExpenseSchema } from '@/zod/expense';

const router = Router();

// Apply authentication and tenant context
router.use(authenticate);
router.use(tenantContext);

router.get('/',         checkPermission('expenses', 'view'), listExpenses);
router.get('/summary',  checkPermission('expenses', 'view'), getExpenseSummary);
router.post('/',        checkPermission('expenses', 'create'), uploadExpenseProof, validateRequest(createExpenseSchema), createExpense);
router.put('/:id',      checkPermission('expenses', 'edit'), uploadExpenseProof, validateRequest(updateExpenseSchema), updateExpense);
router.delete('/:id',   checkPermission('expenses', 'delete'), deleteExpense);

export default router;
