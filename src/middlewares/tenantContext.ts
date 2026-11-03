import { Request, Response, NextFunction } from 'express';
import { sendForbidden } from '@/utils';

export const tenantContext = (req: Request, res: Response, next: NextFunction) => {
  if (!req.user) {
    return sendForbidden(res, 'Not authenticated');
  }

  if (!req.user.tenantId) {
    return res.status(403).json({
      success: false,
      message: 'Access denied: User does not belong to a valid tenant',
    });
  }

  req.tenantId = req.user.tenantId;
  next();
};

export default tenantContext;
