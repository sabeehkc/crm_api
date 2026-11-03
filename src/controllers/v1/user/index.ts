import { Request, Response, NextFunction } from 'express';
import { sendSuccess, sendNotFound, sendError } from '@/utils';
import User from '@/models/user';
import { getRelativePath, getImageUrl } from '@/middlewares/upload';

export const getMe = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const user = await User.findById((req.user as any)._id).select('-password');
    sendSuccess(res, user);
  } catch (err) {
    next(err);
  }
};

export const updateMe = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const data: any = { ...req.body };
    if (req.file) data.profilePicture = getImageUrl(getRelativePath(req.file.path));
    const user = await User.findByIdAndUpdate(
      (req.user as any)._id,
      data,
      { new: true, runValidators: true },
    ).select('-password');
    sendSuccess(res, user, 'Profile updated');
  } catch (err) {
    next(err);
  }
};

export const getUsers = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { page = 1, limit = 20, role, search } = req.query;
    const query: any = { tenantId: req.tenantId };
    
    if (role) query.role = role;
    if (search) query.$or = [
      { name: { $regex: search, $options: 'i' } },
      { email: { $regex: search, $options: 'i' } },
    ];
    
    const [items, total] = await Promise.all([
      User.find(query).select('-password').sort({ createdAt: -1 }).skip((+page - 1) * +limit).limit(+limit),
      User.countDocuments(query),
    ]);
    sendSuccess(res, { items, total, page: +page, limit: +limit, totalPages: Math.ceil(total / +limit) });
  } catch (err) {
    next(err);
  }
};

export const getUserById = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const user = await User.findOne({ _id: req.params.id, tenantId: req.tenantId }).select('-password');
    if (!user) return sendNotFound(res, 'User not found');
    sendSuccess(res, user);
  } catch (err) {
    next(err);
  }
};

export const createUser = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const existing = await User.findOne({ email: req.body.email });
    if (existing) return sendError(res, 'Email already in use', 409);
    
    const data: any = { ...req.body };
    if (req.file) data.profilePicture = getImageUrl(getRelativePath(req.file.path));
    
    // Inject admin's tenantId to the user document
    data.tenantId = req.tenantId;
    
    const user = await User.create(data);
    const { password: _pw, ...safe } = user.toObject();
    sendSuccess(res, safe, 'User created', 201);
  } catch (err) {
    next(err);
  }
};

export const updateUserById = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const data: any = { ...req.body };
    if (req.file) data.profilePicture = getImageUrl(getRelativePath(req.file.path));
    delete data.password;
    delete data.tenantId; // Ensure tenant ID is never mutated
    
    data.$inc = { tokenVersion: 1 };
    
    const user = await User.findOneAndUpdate(
      { _id: req.params.id, tenantId: req.tenantId },
      data,
      { new: true, runValidators: true }
    ).select('-password');
    
    if (!user) return sendNotFound(res, 'User not found');
    sendSuccess(res, user, 'User updated');
  } catch (err) {
    next(err);
  }
};

export const toggleUserStatus = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const user = await User.findOne({ _id: req.params.id, tenantId: req.tenantId });
    if (!user) return sendNotFound(res, 'User not found');
    user.isActive = !user.isActive;
    await user.save();
    sendSuccess(res, { isActive: user.isActive }, `User ${user.isActive ? 'activated' : 'deactivated'}`);
  } catch (err) {
    next(err);
  }
};

export const deleteUser = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const user = await User.findOneAndDelete({ _id: req.params.id, tenantId: req.tenantId });
    if (!user) return sendNotFound(res, 'User not found');
    sendSuccess(res, null, 'User deleted');
  } catch (err) {
    next(err);
  }
};

export const forceLogout = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const user = await User.findOneAndUpdate(
      { _id: req.params.id, tenantId: req.tenantId },
      { $inc: { tokenVersion: 1 } },
      { new: true }
    );
    if (!user) return sendNotFound(res, 'User not found');
    sendSuccess(res, null, 'User force logged out successfully');
  } catch (err) {
    next(err);
  }
};
