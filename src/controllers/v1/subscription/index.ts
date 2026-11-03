import { Request, Response, NextFunction } from 'express';
import { sendSuccess, sendError, sendNotFound } from '@/utils';
import Subscription from '@/models/subscription';

export const listSubscriptions = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { page = 1, limit = 20, search, status } = req.query;
    const query: any = { tenantId: req.tenantId };
    if (status) query.status = status;
    if (search) {
      query.$or = [
        { name:  { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
      ];
    }
    const [items, total] = await Promise.all([
      Subscription.find(query)
        .sort({ createdAt: -1 })
        .skip((+page - 1) * +limit)
        .limit(+limit),
      Subscription.countDocuments(query),
    ]);
    sendSuccess(res, { items, total, page: +page, limit: +limit, totalPages: Math.ceil(total / +limit) });
  } catch (err) {
    next(err);
  }
};

export const getSubscriptionStats = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const [total, active, unsubscribed, bounced, newToday] = await Promise.all([
      Subscription.countDocuments({ tenantId: req.tenantId }),
      Subscription.countDocuments({ status: 'Active', tenantId: req.tenantId }),
      Subscription.countDocuments({ status: 'Unsubscribed', tenantId: req.tenantId }),
      Subscription.countDocuments({ status: 'Bounced', tenantId: req.tenantId }),
      Subscription.countDocuments({ createdAt: { $gte: today }, tenantId: req.tenantId }),
    ]);
    sendSuccess(res, { total, active, unsubscribed, bounced, newToday });
  } catch (err) {
    next(err);
  }
};

export const createSubscription = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const existing = await Subscription.findOne({ email: req.body.email.toLowerCase(), tenantId: req.tenantId });
    if (existing) return sendError(res, 'Email already subscribed', 409);
    const subscription = await Subscription.create({ ...req.body, tenantId: req.tenantId });
    sendSuccess(res, subscription, 'Subscribed successfully', 201);
  } catch (err) {
    next(err);
  }
};

export const getSubscription = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const subscription = await Subscription.findOne({ _id: req.params.id, tenantId: req.tenantId });
    if (!subscription) return sendNotFound(res, 'Subscriber not found');
    sendSuccess(res, subscription);
  } catch (err) {
    next(err);
  }
};

export const updateSubscriptionStatus = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const subscription = await Subscription.findOneAndUpdate(
      { _id: req.params.id, tenantId: req.tenantId },
      { status: req.body.status },
      { new: true, runValidators: true },
    );
    if (!subscription) return sendNotFound(res, 'Subscriber not found');
    sendSuccess(res, subscription, 'Status updated');
  } catch (err) {
    next(err);
  }
};

export const deleteSubscription = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const subscription = await Subscription.findOneAndDelete({ _id: req.params.id, tenantId: req.tenantId });
    if (!subscription) return sendNotFound(res, 'Subscriber not found');
    sendSuccess(res, null, 'Subscriber removed');
  } catch (err) {
    next(err);
  }
};

export const exportSubscriptions = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { status } = req.query;
    const query: any = { tenantId: req.tenantId };
    if (status) query.status = status;

    const items = await Subscription.find(query).sort({ createdAt: -1 });

    const header = 'Name,Email,Source,Tags,Status,Joined\n';
    const rows = items.map(s =>
      [
        `"${s.name}"`,
        `"${s.email}"`,
        `"${s.source}"`,
        `"${s.tags.join(';')}"`,
        `"${s.status}"`,
        `"${s.createdAt.toISOString()}"`,
      ].join(',')
    ).join('\n');

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename="subscriptions.csv"');
    res.send(header + rows);
  } catch (err) {
    next(err);
  }
};
