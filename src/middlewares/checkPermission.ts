import { Request, Response, NextFunction } from 'express';
import { IStaffPermissions, IPermissionValue } from '@/models/user';

// Map resources to page identifiers used in user.pages
const resourcePageMap: Record<string, string> = {
  projects: 'projects',
  enquiries: 'enquiries',
  quotations: 'quotations',
  invoices: 'payments',
  expenses: 'expenses',
  forms: 'forms',
  tasks: 'tasks',
};

export const checkPermission = (resource: keyof IStaffPermissions, action: keyof IPermissionValue) => {
  return (req: Request, res: Response, next: NextFunction) => {
    const user = req.user as any;
    if (!user) {
      return res.status(401).json({ success: false, message: 'Unauthorized: Not authenticated' });
    }

    // Admins bypass all permission checks
    if (user.role === 'admin') {
      return next();
    }

    // 1. Page-level access check
    const requiredPage = resourcePageMap[resource as string] || (resource as string);
    if (!user.pages || !user.pages.includes(requiredPage)) {
      return res.status(403).json({
        success: false,
        message: `Access denied: You do not have access to the ${requiredPage} module.`,
      });
    }

    // 2. Action-level permission check
    const permissions = user.permissions;
    if (permissions && permissions[resource] && permissions[resource][action] === true) {
      return next();
    }

    return res.status(403).json({
      success: false,
      message: `Access denied: You do not have permission to ${action} ${String(resource)}.`,
    });
  };
};

export default checkPermission;
