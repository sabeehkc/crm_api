import { z } from 'zod';

const userRoles = ['admin', 'staff'] as const;

const permissionValueSchema = z.object({
  view: z.boolean().default(false),
  create: z.boolean().default(false),
  edit: z.boolean().default(false),
  delete: z.boolean().default(false),
});

const staffPermissionsSchema = z.object({
  projects: permissionValueSchema.optional(),
  enquiries: permissionValueSchema.optional(),
  quotations: permissionValueSchema.optional(),
  invoices: permissionValueSchema.optional(),
  expenses: permissionValueSchema.optional(),
  forms: permissionValueSchema.optional(),
});

export const createUserSchema = z.object({
  body: z.object({
    name:     z.string().min(2, 'Name must be at least 2 characters'),
    email:    z.string().email('Invalid email'),
    password: z.string().min(6, 'Password must be at least 6 characters'),
    role:     z.enum(userRoles).default('staff'),
    phone:    z.string().optional(),
    pages:    z.array(z.string()).optional(),
    projects: z.array(z.string()).optional(),
    permissions: staffPermissionsSchema.optional(),
  }),
});

export const updateUserSchema = z.object({
  body: z.object({
    name:     z.string().min(2).optional(),
    phone:    z.string().optional(),
    role:     z.enum(userRoles).optional(),
    pages:    z.array(z.string()).optional(),
    projects: z.array(z.string()).optional(),
    permissions: staffPermissionsSchema.optional(),
    profile: z.object({
      firstName: z.string().optional(),
      lastName:  z.string().optional(),
    }).optional(),
  }),
});

export const updateStatusSchema = z.object({
  body: z.object({
    isActive: z.boolean(),
  }),
});
