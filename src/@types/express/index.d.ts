import type { IUser } from '@/models/user';
import { Types } from 'mongoose';

declare global {
  namespace Express {
    interface Request {
      user?: IUser & { _id: any };
      tenantId?: Types.ObjectId;
    }
  }
}
