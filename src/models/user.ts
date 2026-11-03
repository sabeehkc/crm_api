import { Schema, model, Model, Types } from 'mongoose';
import bcrypt from 'bcryptjs';

export type UserRole = 'admin' | 'staff';

export interface IPermissionValue {
  view: boolean;
  create: boolean;
  edit: boolean;
  delete: boolean;
}

export interface IStaffPermissions {
  projects: IPermissionValue;
  enquiries: IPermissionValue;
  quotations: IPermissionValue;
  invoices: IPermissionValue;
  expenses: IPermissionValue;
  forms: IPermissionValue;
  tasks?: IPermissionValue;
}

export interface IUser {
  name?: string;
  email: string;
  password?: string;
  phone?: string;
  role: UserRole;
  tenantId: Types.ObjectId;
  isActive: boolean;
  profile: {
    firstName?: string;
    lastName?: string;
    profilePicture?: string;
  };
  pages: string[];
  projects: Types.ObjectId[];
  permissions?: IStaffPermissions;
  lastLogin?: Date;
  loginHistory?: Date[];
  refreshTokens: string[];
  googleId?: string;
  authProvider?: 'local' | 'google';
  createdAt: Date;
  updatedAt: Date;
  tokenVersion?: number;
  comparePassword(password: string): Promise<boolean>;
}

export interface IUserModel extends Model<IUser> {
  findByEmail(email: string): Promise<IUser | null>;
}

const permissionValueSchema = new Schema<IPermissionValue>(
  {
    view: { type: Boolean, default: false },
    create: { type: Boolean, default: false },
    edit: { type: Boolean, default: false },
    delete: { type: Boolean, default: false },
  },
  { _id: false }
);

const staffPermissionsSchema = new Schema<IStaffPermissions>(
  {
    projects: { type: permissionValueSchema, default: () => ({ view: true, create: false, edit: false, delete: false }) },
    enquiries: { type: permissionValueSchema, default: () => ({ view: true, create: false, edit: false, delete: false }) },
    quotations: { type: permissionValueSchema, default: () => ({ view: true, create: false, edit: false, delete: false }) },
    invoices: { type: permissionValueSchema, default: () => ({ view: true, create: false, edit: false, delete: false }) },
    expenses: { type: permissionValueSchema, default: () => ({ view: true, create: false, edit: false, delete: false }) },
    forms: { type: permissionValueSchema, default: () => ({ view: true, create: false, edit: false, delete: false }) },
    tasks: { type: permissionValueSchema, default: () => ({ view: true, create: false, edit: false, delete: false }) },
  },
  { _id: false }
);

const userSchema = new Schema<IUser>(
  {
    name: { type: String, trim: true },
    email: {
      type: String,
      required: [true, 'Email is required'],
      unique: true,
      lowercase: true,
      trim: true,
    },
    password: { type: String, required: false, select: false },
    phone: { type: String, trim: true },
    role: {
      type: String,
      required: [true, 'Role is required'],
      enum: {
        values: ['admin', 'staff'],
        message: '{VALUE} is not a supported role',
      },
      default: 'admin',
    },
    tenantId: { type: Schema.Types.ObjectId, ref: 'Tenant', required: true },
    isActive: { type: Boolean, default: true },
    profile: {
      firstName: String,
      lastName: String,
      profilePicture: String,
    },
    pages: { type: [String], default: [] },
    projects: { type: [{ type: Schema.Types.ObjectId, ref: 'Project' }], default: [] },
    permissions: { type: staffPermissionsSchema, default: () => ({}) },
    lastLogin: Date,
    loginHistory: { type: [Date], default: [] },
    refreshTokens: { type: [String], default: [], select: false },
    googleId: { type: String, unique: true, sparse: true },
    authProvider: { type: String, enum: ['local', 'google'], default: 'local' },
    tokenVersion: { type: Number, default: 0 },
  },
  { timestamps: true },
);

userSchema.pre('save', async function (next) {
  try {
    if (this.isModified('password') && this.password) {
      const salt = await bcrypt.genSalt(10);
      this.password = await bcrypt.hash(this.password, salt);
    }
    next();
  } catch (err: any) {
    next(err);
  }
});

userSchema.methods.comparePassword = async function (password: string): Promise<boolean> {
  if (!this.password) return false;
  return bcrypt.compare(password, this.password);
};

userSchema.methods.toJSON = function () {
  const obj = this.toObject();
  delete obj.password;
  delete obj.refreshTokens;
  delete obj.__v;
  return obj;
};

userSchema.statics.findByEmail = function (email: string) {
  return this.findOne({ email });
};

export default model<IUser, IUserModel>('User', userSchema);
