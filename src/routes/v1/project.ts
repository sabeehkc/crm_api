import { Router } from 'express';
import {
  listProjects, createProject, getProject, updateProject, updateProgress, deleteProject,
  getMilestones, getMilestone, createMilestone, updateMilestone, deleteMilestone,
  listTasks, getTask, createTask, updateTask, deleteTask,
  listBugs, createBug, updateBug, deleteBug,
} from '@/controllers/v1/project';
import { authenticate } from '@/middlewares/authenticate';
import { tenantContext } from '@/middlewares/tenantContext';
import { checkPermission } from '@/middlewares/checkPermission';
import { projectAccess } from '@/middlewares/projectAccess';
import { validateRequest } from '@/middlewares/validationError';
import { createProjectSchema, updateProjectSchema, updateProgressSchema } from '@/zod/project';
import { createMilestoneSchema, updateMilestoneSchema } from '@/zod/milestone';
import { createTaskSchema, updateTaskSchema } from '@/zod/task';
import { createBugSchema, updateBugSchema } from '@/zod/bug';

const router = Router();

// Apply authentication and tenant context to all project routes
router.use(authenticate);
router.use(tenantContext);

// Projects
router.get('/',               checkPermission('projects', 'view'), listProjects);
router.post('/',              checkPermission('projects', 'create'), validateRequest(createProjectSchema), createProject);
router.get('/:id',            checkPermission('projects', 'view'), projectAccess, getProject);
router.put('/:id',            checkPermission('projects', 'edit'), updateProject); // validation schema can be run here too, or just in controller
router.patch('/:id/progress', checkPermission('projects', 'edit'), validateRequest(updateProgressSchema), updateProgress);
router.delete('/:id',         checkPermission('projects', 'delete'), deleteProject);

// Milestones (nested under /:id)
router.get('/:id/milestones',                checkPermission('projects', 'view'), projectAccess, getMilestones);
router.post('/:id/milestones',               checkPermission('projects', 'edit'), projectAccess, validateRequest(createMilestoneSchema), createMilestone);
router.get('/:id/milestones/:milestoneId',   checkPermission('projects', 'view'), projectAccess, getMilestone);
router.put('/:id/milestones/:milestoneId',   checkPermission('projects', 'edit'), projectAccess, validateRequest(updateMilestoneSchema), updateMilestone);
router.delete('/:id/milestones/:milestoneId', checkPermission('projects', 'edit'), projectAccess, deleteMilestone);

// Tasks (nested under /:id/milestones/:milestoneId)
router.get('/:id/milestones/:milestoneId/tasks',             checkPermission('projects', 'view'), projectAccess, listTasks);
router.post('/:id/milestones/:milestoneId/tasks',            checkPermission('projects', 'edit'), projectAccess, validateRequest(createTaskSchema), createTask);
router.get('/:id/milestones/:milestoneId/tasks/:taskId',     checkPermission('projects', 'view'), projectAccess, getTask);
router.put('/:id/milestones/:milestoneId/tasks/:taskId',     checkPermission('projects', 'edit'), projectAccess, validateRequest(updateTaskSchema), updateTask);
router.delete('/:id/milestones/:milestoneId/tasks/:taskId',  checkPermission('projects', 'edit'), projectAccess, deleteTask);

// Bugs (nested under /:id)
router.get('/:id/bugs',           checkPermission('projects', 'view'), projectAccess, listBugs);
router.post('/:id/bugs',          checkPermission('projects', 'edit'), projectAccess, validateRequest(createBugSchema), createBug);
router.put('/:id/bugs/:bugId',    checkPermission('projects', 'edit'), projectAccess, validateRequest(updateBugSchema), updateBug);
router.delete('/:id/bugs/:bugId', checkPermission('projects', 'edit'), projectAccess, deleteBug);

export default router;
