import { Request, Response, NextFunction } from 'express';
import { IUser } from '@/models/user';

/**
 * Authorization middleware to enforce role‑based access control.
 *
 * Example usage:
 *   router.get('/admin/data', authorize(['admin']), handler);
 *   router.put('/projects/:id', authorize(['admin', 'staff']), handler);
 *
 * It expects `req.user` to be set by the authentication middleware.
 * It checks that the user's role is allowed and that the resource belongs to the same tenant.
 */
export function authorize(...allowedRoles: string[]) {
  return async (req: Request, res: Response, next: NextFunction) => {
    const user = (req as any).user as IUser | undefined;
    if (!user) {
      return res.status(401).json({ success: false, message: 'Unauthenticated' });
    }

    // Role verification
    if (!allowedRoles.includes(user.role)) {
      return res.status(403).json({
        success: false,
        message: 'Forbidden: insufficient role privileges',
      });
    }

    // Tenant ownership check when a tenantId is supplied in params or body
    const tenantIdFromReq = (req.params?.tenantId ?? req.body?.tenantId) as string | undefined;
    if (tenantIdFromReq && tenantIdFromReq !== String(user.tenantId)) {
      return res.status(403).json({
        success: false,
        message: 'Forbidden: resource belongs to a different company',
      });
    }

    // Fine‑grained resource check – controllers can attach the loaded document to req.resource
    if ((req as any).resource) {
      const resource = (req as any).resource as any;
      if (resource.tenantId && String(resource.tenantId) !== String(user.tenantId)) {
        return res.status(403).json({
          success: false,
          message: 'Forbidden: you do not have access to this resource',
        });
      }
    }

    next();
  };
}
