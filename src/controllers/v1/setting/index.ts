import { Request, Response, NextFunction } from 'express';
import { sendSuccess } from '@/utils';
import Setting from '@/models/setting';
import { getRelativePath, getImageUrl } from '@/middlewares/upload';

export const getCompanySettings = async (req: Request, res: Response, next: NextFunction) => {
  try {
    let setting = await Setting.findOne({ tenantId: req.tenantId });
    if (!setting) {
      setting = await Setting.create({ tenantId: req.tenantId });
    }
    sendSuccess(res, setting);
  } catch (err) {
    next(err);
  }
};

export const updateCompanySettings = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const data: any = { ...req.body };
    if (req.file) {
      data.logo = getImageUrl(getRelativePath(req.file.path));
    }
    
    let setting = await Setting.findOne({ tenantId: req.tenantId });
    if (!setting) {
      data.tenantId = req.tenantId;
      setting = await Setting.create(data);
    } else {
      setting = await Setting.findOneAndUpdate({ tenantId: req.tenantId }, data, { new: true, runValidators: true });
    }
    
    sendSuccess(res, setting, 'Company settings updated successfully');
  } catch (err) {
    next(err);
  }
};
