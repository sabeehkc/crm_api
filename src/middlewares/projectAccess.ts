import { Request, Response, NextFunction } from 'express';
import { sendForbidden } from '@/utils';

export const projectAccess = (req: Request, res: Response, next: NextFunction) => {
  const user = req.user as any;
  if (!user) return sendForbidden(res);
  if (user.role === 'admin') return next();
  if (!user.projects || user.projects.length === 0) return next();
  const projectId = req.params.id;
  if (!projectId) return next();
  const hasAccess = user.projects.some((pid: any) => pid.toString() === projectId);
  if (!hasAccess) return sendForbidden(res, 'Access denied: project not in your allowed list');
  next();
};
