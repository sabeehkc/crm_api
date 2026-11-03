import { Request, Response, NextFunction } from 'express';
import { sendSuccess, sendNotFound } from '@/utils';
import Transaction from '@/models/transaction';
import Invoice from '@/models/invoice';
import Project from '@/models/project';
import { getRelativePath } from '@/middlewares/upload';

// ─── Transactions ──────────────────────────────────────────────────────────

export const listTransactions = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { page = 1, limit = 20, projectId, type, startDate, endDate } = req.query;
    const user = req.user as any;
    const query: any = { tenantId: req.tenantId };
    
    if (projectId) query.projectId = projectId;
    if (type)      query.type = type;
    if (startDate || endDate) {
      query.date = {};
      if (startDate) query.date.$gte = new Date(startDate as string);
      if (endDate)   query.date.$lte = new Date(endDate as string);
    }

    // Scoping transactions by user's assigned projects for staff
    if (user.role === 'staff' && user.projects && user.projects.length > 0) {
      if (projectId) {
        const hasAccess = user.projects.some((pid: any) => pid.toString() === projectId.toString());
        if (!hasAccess) return sendSuccess(res, { items: [], total: 0, page: +page, limit: +limit, totalPages: 0 });
      } else {
        query.projectId = { $in: user.projects };
      }
    }

    const [items, total] = await Promise.all([
      Transaction.find(query).sort({ date: -1 }).skip((+page - 1) * +limit).limit(+limit)
        .populate('projectId', 'name client'),
      Transaction.countDocuments(query),
    ]);
    sendSuccess(res, { items, total, page: +page, limit: +limit, totalPages: Math.ceil(total / +limit) });
  } catch (err) {
    next(err);
  }
};

export const getTransactionOverview = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const user = req.user as any;
    const matchStage: any = { tenantId: req.tenantId };

    // Limit overview to allowed projects for staff
    if (user.role === 'staff' && user.projects && user.projects.length > 0) {
      matchStage.projectId = { $in: user.projects };
    }

    const overview = await Invoice.aggregate([
      { $match: matchStage },
      {
        $group: {
          _id:              '$projectId',
          totalAmount:      { $sum: '$totalAmount' },
          receivedAmount:   { $sum: '$receivedAmount' },
          outstanding:      { $sum: { $subtract: ['$totalAmount', '$receivedAmount'] } },
          lastInvoiceDate:  { $max: '$issuedDate' },
          invoiceCount:     { $sum: 1 },
        },
      },
      {
        $lookup: {
          from:         'projects',
          localField:   '_id',
          foreignField: '_id',
          as:           'project',
        },
      },
      { $unwind: { path: '$project', preserveNullAndEmptyArrays: true } },
      {
        $project: {
          projectId:        '$_id',
          projectName:      '$project.name',
          client:           '$project.client',
          totalAmount:      1,
          receivedAmount:   1,
          outstandingAmount: '$outstanding',
          lastInvoiceDate:  1,
          invoiceCount:     1,
        },
      },
    ]);
    sendSuccess(res, overview);
  } catch (err) {
    next(err);
  }
};

export const createTransaction = async (req: Request, res: Response, next: NextFunction) => {
  try {
    // 1. Verify project belongs to tenant
    const project = await Project.findOne({ _id: req.body.projectId, tenantId: req.tenantId });
    if (!project) return res.status(400).json({ success: false, message: 'Invalid project ID or access denied' });

    const data: any = { ...req.body, createdBy: (req.user as any)._id, tenantId: req.tenantId };
    if (req.file) data.proofDocument = getRelativePath(req.file.path);
    
    const transaction = await Transaction.create(data);
    sendSuccess(res, transaction, 'Transaction recorded', 201);
  } catch (err) {
    next(err);
  }
};

export const updateTransaction = async (req: Request, res: Response, next: NextFunction) => {
  try {
    if (req.body.projectId) {
      const project = await Project.findOne({ _id: req.body.projectId, tenantId: req.tenantId });
      if (!project) return res.status(400).json({ success: false, message: 'Invalid project ID or access denied' });
    }

    const data: any = { ...req.body };
    if (req.file) data.proofDocument = getRelativePath(req.file.path);
    
    const transaction = await Transaction.findOneAndUpdate(
      { _id: req.params.id, tenantId: req.tenantId }, 
      data, 
      { new: true, runValidators: true }
    );
    if (!transaction) return sendNotFound(res, 'Transaction not found');
    sendSuccess(res, transaction, 'Transaction updated');
  } catch (err) {
    next(err);
  }
};

export const deleteTransaction = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const transaction = await Transaction.findOneAndDelete({ _id: req.params.id, tenantId: req.tenantId });
    if (!transaction) return sendNotFound(res, 'Transaction not found');
    sendSuccess(res, null, 'Transaction deleted');
  } catch (err) {
    next(err);
  }
};

// ─── Invoices ──────────────────────────────────────────────────────────────

export const listInvoices = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { page = 1, limit = 20, projectId, status } = req.query;
    const user = req.user as any;
    const query: any = { tenantId: req.tenantId };
    
    if (projectId) query.projectId = projectId;
    if (status)    query.status = status;

    // Scope invoices by user's assigned projects for staff
    if (user.role === 'staff' && user.projects && user.projects.length > 0) {
      if (projectId) {
        const hasAccess = user.projects.some((pid: any) => pid.toString() === projectId.toString());
        if (!hasAccess) return sendSuccess(res, { items: [], total: 0, page: +page, limit: +limit, totalPages: 0 });
      } else {
        query.projectId = { $in: user.projects };
      }
    }

    const [items, total] = await Promise.all([
      Invoice.find(query).sort({ issuedDate: -1 }).skip((+page - 1) * +limit).limit(+limit)
        .populate('projectId', 'name client'),
      Invoice.countDocuments(query),
    ]);
    sendSuccess(res, { items, total, page: +page, limit: +limit, totalPages: Math.ceil(total / +limit) });
  } catch (err) {
    next(err);
  }
};

export const createInvoice = async (req: Request, res: Response, next: NextFunction) => {
  try {
    // 1. Verify project belongs to tenant
    const project = await Project.findOne({ _id: req.body.projectId, tenantId: req.tenantId });
    if (!project) return res.status(400).json({ success: false, message: 'Invalid project ID or access denied' });

    const invoice = await Invoice.create({ ...req.body, createdBy: (req.user as any)._id, tenantId: req.tenantId });
    sendSuccess(res, invoice, 'Invoice created', 201);
  } catch (err) {
    next(err);
  }
};

export const getInvoice = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const invoice = await Invoice.findOne({ _id: req.params.id, tenantId: req.tenantId })
      .populate('projectId', 'name client')
      .exec();
    if (!invoice) return sendNotFound(res, 'Invoice not found');
    sendSuccess(res, invoice);
  } catch (err) {
    next(err);
  }
};

export const updateReceivedAmount = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const invoice = await Invoice.findOne({ _id: req.params.id, tenantId: req.tenantId });
    if (!invoice) return sendNotFound(res, 'Invoice not found');
    invoice.receivedAmount = req.body.receivedAmount;
    await invoice.save();
    sendSuccess(res, invoice, 'Invoice updated');
  } catch (err) {
    next(err);
  }
};
