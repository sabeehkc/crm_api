import { Request, Response, NextFunction } from 'express';
import { sendSuccess, sendNotFound } from '@/utils';
import Project from '@/models/project';
import Milestone from '@/models/milestone';
import Task from '@/models/task';
import Bug from '@/models/bug';

// Helper to verify that a project belongs to the tenant and is accessible by the user
const getAccessibleProject = async (projectId: string, user: any, tenantId: any) => {
  const query: any = { _id: projectId, tenantId };
  if (user.role === 'staff' && user.projects && user.projects.length > 0) {
    const isAssigned = user.projects.some((pid: any) => pid.toString() === projectId);
    if (!isAssigned) return null;
  }
  return Project.findOne(query);
};

// ─── Projects ──────────────────────────────────────────────────────────────

export const listProjects = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { page = 1, limit = 20, search, status } = req.query;
    const user = req.user as any;
    const query: any = { tenantId: req.tenantId };
    
    if (status) query.status = status;
    if (search) query.$or = [
      { name:   { $regex: search, $options: 'i' } },
      { client: { $regex: search, $options: 'i' } },
    ];
    
    // Project-wise scoping for staff
    if (user.role === 'staff' && user.projects && user.projects.length > 0) {
      query._id = { $in: user.projects };
    }

    const [items, total] = await Promise.all([
      Project.find(query)
        .sort({ createdAt: -1 })
        .skip((+page - 1) * +limit)
        .limit(+limit),
      Project.countDocuments(query),
    ]);
    sendSuccess(res, { items, total, page: +page, limit: +limit, totalPages: Math.ceil(total / +limit) });
  } catch (err) {
    next(err);
  }
};

export const createProject = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const project = await Project.create({ 
      ...req.body, 
      createdBy: (req.user as any)._id,
      tenantId: req.tenantId
    });
    sendSuccess(res, project, 'Project created', 201);
  } catch (err) {
    next(err);
  }
};

export const getProject = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const project = await getAccessibleProject(req.params.id, req.user, req.tenantId);
    if (!project) return sendNotFound(res, 'Project not found');
    sendSuccess(res, project);
  } catch (err) {
    next(err);
  }
};

export const updateProject = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const project = await getAccessibleProject(req.params.id, req.user, req.tenantId);
    if (!project) return sendNotFound(res, 'Project not found');
    
    const updated = await Project.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
    sendSuccess(res, updated, 'Project updated');
  } catch (err) {
    next(err);
  }
};

export const updateProgress = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const project = await getAccessibleProject(req.params.id, req.user, req.tenantId);
    if (!project) return sendNotFound(res, 'Project not found');

    const updated = await Project.findByIdAndUpdate(
      req.params.id,
      { progress: req.body.progress },
      { new: true, runValidators: true },
    );
    sendSuccess(res, updated, 'Progress updated');
  } catch (err) {
    next(err);
  }
};

export const deleteProject = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const project = await getAccessibleProject(req.params.id, req.user, req.tenantId);
    if (!project) return sendNotFound(res, 'Project not found');

    await Project.findByIdAndDelete(req.params.id);
    await Promise.all([
      Task.deleteMany({ projectId: req.params.id }),
      Bug.deleteMany({ projectId: req.params.id }),
      Milestone.deleteMany({ projectId: req.params.id }),
    ]);
    sendSuccess(res, null, 'Project deleted');
  } catch (err) {
    next(err);
  }
};

// ─── Milestones ────────────────────────────────────────────────────────────

export const getMilestone = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const project = await getAccessibleProject(req.params.id, req.user, req.tenantId);
    if (!project) return sendNotFound(res, 'Project not found');

    const milestone = await Milestone.findOne({ _id: req.params.milestoneId, projectId: req.params.id }).lean();
    if (!milestone) return sendNotFound(res, 'Milestone not found');
    
    const tasks = await Task.find({ milestoneId: req.params.milestoneId }).lean();
    sendSuccess(res, { ...(milestone as any), tasks });
  } catch (err) {
    next(err);
  }
};

export const getMilestones = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const project = await getAccessibleProject(req.params.id, req.user, req.tenantId);
    if (!project) return sendNotFound(res, 'Project not found');

    const [milestones, tasks] = await Promise.all([
      Milestone.find({ projectId: req.params.id }).sort({ dueDate: 1 }).lean(),
      Task.find({ projectId: req.params.id }).lean(),
    ]);
    
    const taskMap: Record<string, any[]> = {};
    for (const task of tasks) {
      const key = (task as any).milestoneId.toString();
      if (!taskMap[key]) taskMap[key] = [];
      taskMap[key].push(task);
    }
    
    const result = milestones.map((m: any) => ({ ...m, tasks: taskMap[m._id.toString()] || [] }));
    sendSuccess(res, result);
  } catch (err) {
    next(err);
  }
};

export const createMilestone = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const project = await getAccessibleProject(req.params.id, req.user, req.tenantId);
    if (!project) return sendNotFound(res, 'Project not found');

    const milestone = await Milestone.create({ ...req.body, projectId: req.params.id, tenantId: req.tenantId });
    sendSuccess(res, milestone, 'Milestone created', 201);
  } catch (err) {
    next(err);
  }
};

export const updateMilestone = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const project = await getAccessibleProject(req.params.id, req.user, req.tenantId);
    if (!project) return sendNotFound(res, 'Project not found');

    const milestone = await Milestone.findOneAndUpdate(
      { _id: req.params.milestoneId, projectId: req.params.id },
      req.body,
      { new: true, runValidators: true },
    );
    if (!milestone) return sendNotFound(res, 'Milestone not found');
    sendSuccess(res, milestone, 'Milestone updated');
  } catch (err) {
    next(err);
  }
};

export const deleteMilestone = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const project = await getAccessibleProject(req.params.id, req.user, req.tenantId);
    if (!project) return sendNotFound(res, 'Project not found');

    const milestone = await Milestone.findOneAndDelete({
      _id: req.params.milestoneId,
      projectId: req.params.id,
    });
    if (!milestone) return sendNotFound(res, 'Milestone not found');
    
    await Task.deleteMany({ milestoneId: req.params.milestoneId });
    sendSuccess(res, null, 'Milestone deleted');
  } catch (err) {
    next(err);
  }
};

// ─── Tasks ─────────────────────────────────────────────────────────────────

export const listTasks = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const project = await getAccessibleProject(req.params.id, req.user, req.tenantId);
    if (!project) return sendNotFound(res, 'Project not found');

    const tasks = await Task.find({ milestoneId: req.params.milestoneId, projectId: req.params.id })
      .sort({ createdAt: -1 });
    sendSuccess(res, tasks);
  } catch (err) {
    next(err);
  }
};

export const getTask = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const project = await getAccessibleProject(req.params.id, req.user, req.tenantId);
    if (!project) return sendNotFound(res, 'Project not found');

    const task = await Task.findOne({ _id: req.params.taskId, milestoneId: req.params.milestoneId, projectId: req.params.id });
    if (!task) return sendNotFound(res, 'Task not found');
    sendSuccess(res, task);
  } catch (err) {
    next(err);
  }
};

export const createTask = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const project = await getAccessibleProject(req.params.id, req.user, req.tenantId);
    if (!project) return sendNotFound(res, 'Project not found');

    const task = await Task.create({
      ...req.body,
      milestoneId: req.params.milestoneId,
      projectId:   req.params.id,
      tenantId:    req.tenantId,
    });
    sendSuccess(res, task, 'Task created', 201);
  } catch (err) {
    next(err);
  }
};

export const updateTask = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const project = await getAccessibleProject(req.params.id, req.user, req.tenantId);
    if (!project) return sendNotFound(res, 'Project not found');

    const task = await Task.findOneAndUpdate(
      { _id: req.params.taskId, milestoneId: req.params.milestoneId, projectId: req.params.id },
      req.body,
      { new: true, runValidators: true },
    );
    if (!task) return sendNotFound(res, 'Task not found');
    sendSuccess(res, task, 'Task updated');
  } catch (err) {
    next(err);
  }
};

export const deleteTask = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const project = await getAccessibleProject(req.params.id, req.user, req.tenantId);
    if (!project) return sendNotFound(res, 'Project not found');

    const task = await Task.findOneAndDelete({
      _id: req.params.taskId,
      milestoneId: req.params.milestoneId,
      projectId: req.params.id,
    });
    if (!task) return sendNotFound(res, 'Task not found');
    sendSuccess(res, null, 'Task deleted');
  } catch (err) {
    next(err);
  }
};

// ─── Bugs ──────────────────────────────────────────────────────────────────

export const listBugs = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const project = await getAccessibleProject(req.params.id, req.user, req.tenantId);
    if (!project) return sendNotFound(res, 'Project not found');

    const { page = 1, limit = 20, status, severity } = req.query;
    const query: any = { projectId: req.params.id };
    if (status) query.status = status;
    if (severity) query.severity = severity;
    
    const [items, total] = await Promise.all([
      Bug.find(query).sort({ createdAt: -1 }).skip((+page - 1) * +limit).limit(+limit),
      Bug.countDocuments(query),
    ]);
    sendSuccess(res, { items, total, page: +page, limit: +limit, totalPages: Math.ceil(total / +limit) });
  } catch (err) {
    next(err);
  }
};

export const createBug = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const project = await getAccessibleProject(req.params.id, req.user, req.tenantId);
    if (!project) return sendNotFound(res, 'Project not found');

    const bug = await Bug.create({ ...req.body, projectId: req.params.id, tenantId: req.tenantId });
    sendSuccess(res, bug, 'Bug reported', 201);
  } catch (err) {
    next(err);
  }
};

export const updateBug = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const project = await getAccessibleProject(req.params.id, req.user, req.tenantId);
    if (!project) return sendNotFound(res, 'Project not found');

    const bug = await Bug.findOneAndUpdate(
      { _id: req.params.bugId, projectId: req.params.id },
      req.body,
      { new: true, runValidators: true },
    );
    if (!bug) return sendNotFound(res, 'Bug not found');
    sendSuccess(res, bug, 'Bug updated');
  } catch (err) {
    next(err);
  }
};

export const deleteBug = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const project = await getAccessibleProject(req.params.id, req.user, req.tenantId);
    if (!project) return sendNotFound(res, 'Project not found');

    const bug = await Bug.findOneAndDelete({ _id: req.params.bugId, projectId: req.params.id });
    if (!bug) return sendNotFound(res, 'Bug not found');
    sendSuccess(res, null, 'Bug deleted');
  } catch (err) {
    next(err);
  }
};
