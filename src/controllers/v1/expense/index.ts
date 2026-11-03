import { Request, Response, NextFunction } from 'express';
import { sendSuccess, sendNotFound } from '@/utils';
import Expense from '@/models/expense';
import { getRelativePath } from '@/middlewares/upload';

export const listExpenses = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { page = 1, limit = 20, category, startDate, endDate, search } = req.query;
    const query: any = { tenantId: req.tenantId };
    
    if (category) query.category = category;
    if (search)   query.description = { $regex: search, $options: 'i' };
    if (startDate || endDate) {
      query.date = {};
      if (startDate) query.date.$gte = new Date(startDate as string);
      if (endDate)   query.date.$lte = new Date(endDate as string);
    }
    
    const [items, total] = await Promise.all([
      Expense.find(query).sort({ date: -1 }).skip((+page - 1) * +limit).limit(+limit),
      Expense.countDocuments(query),
    ]);
    sendSuccess(res, { items, total, page: +page, limit: +limit, totalPages: Math.ceil(total / +limit) });
  } catch (err) {
    next(err);
  }
};

export const getExpenseSummary = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const tenantId = req.tenantId;
    const [results, totalResult] = await Promise.all([
      Expense.aggregate([
        { $match: { tenantId } },
        { $group: { _id: '$category', amount: { $sum: '$amount' } } },
        { $sort: { amount: -1 } },
      ]),
      Expense.aggregate([
        { $match: { tenantId } },
        { $group: { _id: null, total: { $sum: '$amount' } } }
      ]),
    ]);
    
    const total = totalResult[0]?.total ?? 0;
    const byCategory = results.map((r: any) => ({
      category:   r._id,
      amount:     r.amount,
      percentage: total > 0 ? +((r.amount / total) * 100).toFixed(1) : 0,
    }));
    sendSuccess(res, { total, byCategory });
  } catch (err) {
    next(err);
  }
};

export const createExpense = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const data: any = { ...req.body, createdBy: (req.user as any)._id, tenantId: req.tenantId };
    if (req.file) data.proofDocument = getRelativePath(req.file.path);
    const expense = await Expense.create(data);
    sendSuccess(res, expense, 'Expense added', 201);
  } catch (err) {
    next(err);
  }
};

export const updateExpense = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const data: any = { ...req.body };
    if (req.file) data.proofDocument = getRelativePath(req.file.path);
    
    const expense = await Expense.findOneAndUpdate(
      { _id: req.params.id, tenantId: req.tenantId },
      data,
      { new: true, runValidators: true }
    );
    if (!expense) return sendNotFound(res, 'Expense not found');
    sendSuccess(res, expense, 'Expense updated');
  } catch (err) {
    next(err);
  }
};

export const deleteExpense = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const expense = await Expense.findOneAndDelete({ _id: req.params.id, tenantId: req.tenantId });
    if (!expense) return sendNotFound(res, 'Expense not found');
    sendSuccess(res, null, 'Expense deleted');
  } catch (err) {
    next(err);
  }
};
