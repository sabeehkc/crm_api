import { Request, Response, NextFunction } from 'express';
import { sendSuccess, sendNotFound, sendError } from '@/utils';
import Task from '@/models/task';

export const listTasks = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { page = 1, limit = 20, status, search, clientStatus, division, activity } = req.query;
    const query: any = { tenantId: req.tenantId };

    if (status && status !== 'All') {
      query.status = status;
    }

    if (clientStatus && clientStatus !== 'All') {
      query.clientStatus = clientStatus;
    }

    if (division && division !== 'All') {
      query.division = division;
    }

    if (activity && activity !== 'All') {
      query.activity = activity;
    }

    if (search && typeof search === 'string' && search.trim()) {
      const term = search.trim();
      query.$or = [
        { clientName: { $regex: term, $options: 'i' } },
        { workDetail: { $regex: term, $options: 'i' } },
        { title: { $regex: term, $options: 'i' } },
        { description: { $regex: term, $options: 'i' } },
        { activity: { $regex: term, $options: 'i' } },
        { division: { $regex: term, $options: 'i' } },
        { remarks: { $regex: term, $options: 'i' } },
      ];
    }

    const [items, total, statusCounts] = await Promise.all([
      Task.find(query)
        .populate('allottedBy', 'name email profile role')
        .populate('allottedTo', 'name email profile role')
        .populate('createdBy', 'name email profile role')
        .populate('assignedTo', 'name email profile role')
        .sort({ createdAt: -1 })
        .skip((+page - 1) * +limit)
        .limit(+limit),
      Task.countDocuments(query),
      Task.aggregate([
        { $match: { tenantId: req.tenantId } },
        { $group: { _id: '$status', count: { $sum: 1 } } },
      ]),
    ]);

    const counts = {
      total: 0,
      pending: 0,
      inProgress: 0,
      done: 0,
    };

    const allTenantTotal = await Task.countDocuments({ tenantId: req.tenantId });
    counts.total = allTenantTotal;

    statusCounts.forEach((sc: { _id: string; count: number }) => {
      if (sc._id === 'Pending') counts.pending = sc.count;
      else if (sc._id === 'In Progress') counts.inProgress = sc.count;
      else if (sc._id === 'Done') counts.done = sc.count;
    });

    sendSuccess(res, {
      items,
      total,
      page: +page,
      limit: +limit,
      totalPages: Math.ceil(total / +limit),
      counts,
    });
  } catch (err) {
    next(err);
  }
};

export const getTask = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const task = await Task.findOne({ _id: req.params.id, tenantId: req.tenantId })
      .populate('allottedBy', 'name email profile role')
      .populate('allottedTo', 'name email profile role')
      .populate('createdBy', 'name email profile role')
      .populate('assignedTo', 'name email profile role');
    if (!task) return sendNotFound(res, 'Task not found');
    sendSuccess(res, task);
  } catch (err) {
    next(err);
  }
};

export const createTask = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const clientName = (req.body.clientName || '').trim();
    const workDetail = (req.body.workDetail || req.body.taskDescription || req.body.description || '').trim();
    const title = (req.body.task || req.body.title || req.body.name || workDetail || clientName || 'New Task').trim();

    const allottedBy = req.body.allottedBy || (req.user as any)?._id;
    const allottedTo = req.body.allottedTo || req.body.assignedTo || undefined;
    const date = (req.body.date || '').trim();
    const activity = (req.body.activity || '').trim();
    const division = (req.body.division || '').trim();
    const allottedDate = (req.body.allottedDate || date || '').trim();
    const targetDate = (req.body.targetDate || '').trim();
    const completedDate = (req.body.completedDate || '').trim();
    const status = req.body.status || 'Pending';
    const clientStatus = (req.body.clientStatus || 'Pending').trim();
    const billing = (req.body.billing || 'Billable').trim();
    const remarks = (req.body.remarks || '').trim();

    const task = await Task.create({
      title,
      description: workDetail,
      clientName,
      date,
      activity,
      division,
      workDetail,
      allottedBy,
      allottedTo,
      allottedDate,
      targetDate,
      completedDate,
      status,
      clientStatus,
      billing,
      remarks,
      createdBy: (req.user as any)?._id,
      assignedTo: allottedTo,
      tenantId: req.tenantId,
    });

    const populated = await Task.findById(task._id)
      .populate('allottedBy', 'name email profile role')
      .populate('allottedTo', 'name email profile role')
      .populate('createdBy', 'name email profile role')
      .populate('assignedTo', 'name email profile role');

    sendSuccess(res, populated, 'Task created successfully', 201);
  } catch (err) {
    next(err);
  }
};

export const updateTask = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const updateData: any = {};

    if (req.body.clientName !== undefined) updateData.clientName = req.body.clientName.trim();
    if (req.body.date !== undefined) updateData.date = req.body.date.trim();
    if (req.body.activity !== undefined) updateData.activity = req.body.activity.trim();

    if (req.body.division !== undefined) updateData.division = req.body.division.trim();
    if (req.body.workDetail !== undefined) {
      updateData.workDetail = req.body.workDetail.trim();
      updateData.description = req.body.workDetail.trim();
    }

    if (req.body.task !== undefined || req.body.title !== undefined) {
      const t = req.body.task ?? req.body.title;
      updateData.title = typeof t === 'string' ? t.trim() : '';
    }

    if (req.body.allottedBy !== undefined) updateData.allottedBy = req.body.allottedBy || null;
    if (req.body.allottedTo !== undefined) {
      updateData.allottedTo = req.body.allottedTo || null;
      updateData.assignedTo = req.body.allottedTo || null;
    }

    if (req.body.allottedDate !== undefined) updateData.allottedDate = req.body.allottedDate.trim();
    if (req.body.targetDate !== undefined) updateData.targetDate = req.body.targetDate.trim();
    if (req.body.completedDate !== undefined) updateData.completedDate = req.body.completedDate.trim();

    if (req.body.status !== undefined) updateData.status = req.body.status;
    if (req.body.clientStatus !== undefined) updateData.clientStatus = req.body.clientStatus.trim();
    if (req.body.billing !== undefined) updateData.billing = req.body.billing.trim();
    if (req.body.remarks !== undefined) updateData.remarks = req.body.remarks.trim();

    const task = await Task.findOneAndUpdate(
      { _id: req.params.id, tenantId: req.tenantId },
      updateData,
      { new: true, runValidators: true }
    )
      .populate('allottedBy', 'name email profile role')
      .populate('allottedTo', 'name email profile role')
      .populate('createdBy', 'name email profile role')
      .populate('assignedTo', 'name email profile role');

    if (!task) return sendNotFound(res, 'Task not found');
    sendSuccess(res, task, 'Task updated successfully');
  } catch (err) {
    next(err);
  }
};

export const deleteTask = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const task = await Task.findOneAndDelete({ _id: req.params.id, tenantId: req.tenantId });
    if (!task) return sendNotFound(res, 'Task not found');
    sendSuccess(res, null, 'Task deleted successfully');
  } catch (err) {
    next(err);
  }
};
