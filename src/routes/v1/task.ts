import { Router } from 'express';
import { listTasks, getTask, createTask, updateTask, deleteTask } from '@/controllers/v1/task';
import { authenticate } from '@/middlewares/authenticate';
import { tenantContext } from '@/middlewares/tenantContext';
import { checkPermission } from '@/middlewares/checkPermission';

const router = Router();

// Apply authentication and tenant context
router.use(authenticate);
router.use(tenantContext);

router.get('/', checkPermission('tasks', 'view'), listTasks);
router.get('/:id', checkPermission('tasks', 'view'), getTask);
router.post('/', checkPermission('tasks', 'create'), createTask);
router.put('/:id', checkPermission('tasks', 'edit'), updateTask);
router.delete('/:id', checkPermission('tasks', 'delete'), deleteTask);

export default router;

