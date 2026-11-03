# 04 — RBAC & Zod Validation

Two sections:
- **Part A** — Role-based access control: middleware + role matrix
- **Part B** — Zod validation schemas for every module

---

## Part A — Role-Based Access Control

### Roles

| Role | Who |
|------|-----|
| `admin` | Full access — all pages, all operations |
| `sales` | Enquiries, Quotations, Payments, Dashboard, Chat |
| `designer` | Projects (read), UI Manager, Dashboard |
| `developer` | Projects (CRUD except delete), Bugs, Dashboard |
| `qa` | Projects (read + bugs), Dashboard |
| `viewer` | Dashboard (read), assigned projects only (read) |

### API Access Matrix

| Module | admin | sales | designer | developer | qa | viewer |
|--------|:-----:|:-----:|:--------:|:---------:|:--:|:------:|
| Auth | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| Users (CRUD) | ✓ | — | — | — | — | — |
| Users (own profile) | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| Dashboard | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| Enquiries (CRUD) | ✓ | ✓ | — | — | — | — |
| Enquiries (delete) | ✓ | — | — | — | — | — |
| Projects (list/read) | ✓ | ✓ | ✓ | ✓ | ✓ | assigned |
| Projects (create/update) | ✓ | — | — | — | — | — |
| Projects (progress) | ✓ | — | — | ✓ | — | — |
| Projects (delete) | ✓ | — | — | — | — | — |
| Milestones (read) | ✓ | — | ✓ | ✓ | ✓ | assigned |
| Milestones (write) | ✓ | — | — | ✓ | — | — |
| Tasks (read/write) | ✓ | — | — | ✓ | ✓ | assigned |
| Bugs (read/report) | ✓ | — | — | ✓ | ✓ | — |
| Bugs (delete) | ✓ | — | — | — | — | — |
| Payments (CRUD) | ✓ | ✓ | — | — | — | — |
| Payments (delete) | ✓ | — | — | — | — | — |
| Expenses (all) | ✓ | — | — | — | — | — |
| Quotations (CRUD) | ✓ | ✓ | — | — | — | — |
| Quotations (delete) | ✓ | — | — | — | — | — |
| Chat | ✓ | ✓ | — | — | — | — |
| Website Content (read) | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| Website Content (write) | ✓ | — | ✓ | — | — | — |
| Website Content (delete) | ✓ | — | — | — | — | — |
| Uploads | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |

### Page Access Reference (frontend navigation)

| Page | admin | sales | designer | developer | qa | viewer |
|------|:-----:|:-----:|:--------:|:---------:|:--:|:------:|
| Dashboard | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| Admin CRM | ✓ | ✓ | — | — | — | — |
| Projects | ✓ | ✓ | ✓ | ✓ | ✓ | assigned |
| Payments | ✓ | ✓ | — | — | — | — |
| Expenses | ✓ | — | — | — | — | — |
| UI Manager | ✓ | — | ✓ | — | — | — |
| Users | ✓ | — | — | — | — | — |

The `pages` array on the User document stores page IDs so the frontend can conditionally render navigation items. The API enforces roles — not the `pages` field.

---

### `src/middlewares/authorize.ts` — Create This File

```ts
import { Request, Response, NextFunction } from 'express';
import { sendForbidden } from '@/utils';

export const authorize = (...roles: string[]) => {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) return sendForbidden(res, 'Not authenticated');
    if (!roles.includes(req.user.role)) {
      return sendForbidden(res, 'Access denied: insufficient role');
    }
    next();
  };
};
```

**Usage in routes:**
```ts
import { authenticate }  from '@/middlewares/authenticate';
import { authorize }     from '@/middlewares/authorize';

// Admin only
router.post('/', authenticate, authorize('admin'), handler);

// Admin + sales
router.get('/', authenticate, authorize('admin', 'sales'), listHandler);
```

> If `sendForbidden` does not exist in `src/utils/response.ts`, add it:
> ```ts
> export const sendForbidden = (res: Response, message = 'Forbidden') => {
>   return res.status(403).json({ success: false, code: 'FORBIDDEN', message });
> };
> ```

---

### `src/middlewares/projectAccess.ts` — Create This File

For non-admin users, restrict project endpoints to only the projects in `req.user.projects`.  
An empty `projects` array means the user has access to all projects.

```ts
import { Request, Response, NextFunction } from 'express';
import { sendForbidden } from '@/utils';
import mongoose from 'mongoose';

export const projectAccess = (req: Request, res: Response, next: NextFunction) => {
  const user = req.user;
  if (!user) return sendForbidden(res);

  // Admin always passes
  if (user.role === 'admin') return next();

  // Empty array = access to all projects
  if (!user.projects || user.projects.length === 0) return next();

  const projectId = req.params.id;
  if (!projectId) return next();

  const hasAccess = user.projects.some(
    (pid: any) => pid.toString() === projectId,
  );

  if (!hasAccess) return sendForbidden(res, 'Access denied: project not in your allowed list');
  next();
};
```

**Usage in project routes:**
```ts
router.get('/:id', authenticate, projectAccess, getProjectById);
router.get('/:id/milestones', authenticate, projectAccess, getMilestones);
```

---

### `src/@types/express/index.d.ts` — Extend Request Type

The existing file already adds `user` to `Request`. Ensure the `user` type includes the new CRM fields:

```ts
import { IUser } from '@/models/user';

declare global {
  namespace Express {
    interface Request {
      user?: IUser & { _id: any };
    }
  }
}
```

If `IUser` now includes `role`, `pages`, `projects` (after Step 5 in `01-template-migration.md`), the type is already correct.

---

## Part B — Zod Validation Schemas

All schemas wrap their fields in `body` (or `params`/`query` as needed) to match the `validateRequest` middleware which calls `schema.parse({ body: req.body, query: req.query, params: req.params })`.

**Pattern:**
```ts
export const createSomethingSchema = z.object({
  body: z.object({ /* fields */ }),
});
```

---

### `src/zod/user.ts`

```ts
import { z } from 'zod';

const userRoles = ['admin', 'designer', 'developer', 'qa', 'sales', 'viewer'] as const;

export const createUserSchema = z.object({
  body: z.object({
    name:     z.string().min(2, 'Name must be at least 2 characters'),
    email:    z.string().email('Invalid email'),
    password: z.string().min(6, 'Password must be at least 6 characters'),
    role:     z.enum(userRoles).default('viewer'),
    phone:    z.string().optional(),
    pages:    z.array(z.string()).optional(),
    projects: z.array(z.string()).optional(),
  }),
});

export const updateUserSchema = z.object({
  body: z.object({
    name:    z.string().min(2).optional(),
    phone:   z.string().optional(),
    role:    z.enum(userRoles).optional(),
    pages:   z.array(z.string()).optional(),
    projects: z.array(z.string()).optional(),
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
```

---

### `src/zod/enquiry.ts`

```ts
import { z } from 'zod';

const enquiryStatuses = [
  'New', 'Followup', 'Quotation Sent', 'Converted', 'Rejected', 'Revised Quotation',
] as const;

export const createEnquirySchema = z.object({
  body: z.object({
    name:    z.string().min(2, 'Name required'),
    email:   z.string().email('Invalid email'),
    phone:   z.string().min(7, 'Phone required'),
    service: z.string().min(2, 'Service required'),
    date:    z.coerce.date().optional(),
    status:  z.enum(enquiryStatuses).optional(),
    notes:   z.string().max(1000).optional(),
  }),
});

export const updateEnquirySchema = z.object({
  body: createEnquirySchema.shape.body.partial(),
});

export const updateEnquiryStatusSchema = z.object({
  body: z.object({
    status: z.enum(enquiryStatuses),
  }),
});
```

---

### `src/zod/project.ts`

```ts
import { z } from 'zod';

const projectStatuses = [
  'Just Started', 'In Progress', 'Nearly Done', 'Completed', 'On Hold',
] as const;

export const createProjectSchema = z.object({
  body: z.object({
    name:        z.string().min(2),
    tags:        z.array(z.string()).optional(),
    client:      z.string().min(2),
    team:        z.array(z.string()).optional(),
    budget:      z.number().positive(),
    startDate:   z.coerce.date(),
    dueDate:     z.coerce.date(),
    description: z.string().optional(),
  }),
});

export const updateProjectSchema = z.object({
  body: createProjectSchema.shape.body.partial(),
});

export const updateProgressSchema = z.object({
  body: z.object({
    progress: z.number().min(0).max(100),
  }),
});
```

---

### `src/zod/milestone.ts`

```ts
import { z } from 'zod';

const milestoneStatuses = ['pending', 'in_progress', 'done'] as const;

export const createMilestoneSchema = z.object({
  body: z.object({
    title:   z.string().min(2),
    dueDate: z.coerce.date(),
    status:  z.enum(milestoneStatuses).optional(),
  }),
});

export const updateMilestoneSchema = z.object({
  body: createMilestoneSchema.shape.body.partial(),
});
```

---

### `src/zod/task.ts`

```ts
import { z } from 'zod';

const taskStatuses = ['Pending', 'In Progress', 'Done'] as const;

export const createTaskSchema = z.object({
  body: z.object({
    title:      z.string().min(2),
    dueDate:    z.coerce.date(),
    assigneeId: z.string().min(24, 'Invalid user ID'),
    status:     z.enum(taskStatuses).optional(),
  }),
});

export const updateTaskSchema = z.object({
  body: createTaskSchema.shape.body.partial(),
});
```

---

### `src/zod/bug.ts`

```ts
import { z } from 'zod';

const bugSeverities = ['Critical', 'High', 'Low'] as const;
const bugStatuses   = ['Open', 'In Progress', 'Resolved'] as const;

export const createBugSchema = z.object({
  body: z.object({
    title:            z.string().min(2),
    reporter:         z.string().min(2),
    severity:         z.enum(bugSeverities),
    stepsToReproduce: z.string().optional(),
    resolution:       z.string().optional(),
  }),
});

export const updateBugSchema = z.object({
  body: z.object({
    status:         z.enum(bugStatuses).optional(),
    resolution:     z.string().optional(),
    resolvedAt:     z.coerce.date().optional(),
    resolutionTime: z.string().optional(),
  }),
});
```

---

### `src/zod/payment.ts`

```ts
import { z } from 'zod';

const paymentModes = ['bank', 'upi', 'cheque', 'neft', 'credit_card', 'auto_debit', 'cash'] as const;

export const createPaymentSchema = z.object({
  body: z.object({
    projectId: z.string().min(24, 'Invalid project ID'),
    client:    z.string().min(2),
    amount:    z.coerce.number().positive(),
    date:      z.coerce.date(),
    mode:      z.enum(paymentModes),
    notes:     z.string().max(500).optional(),
  }),
});

export const updatePaymentSchema = z.object({
  body: createPaymentSchema.shape.body.partial(),
});

export const createInvoiceSchema = z.object({
  body: z.object({
    projectId:   z.string().min(24),
    client:      z.string().min(2),
    totalAmount: z.coerce.number().positive(),
    dueDate:     z.coerce.date().optional(),
  }),
});

export const updateReceivedSchema = z.object({
  body: z.object({
    receivedAmount: z.coerce.number().min(0),
  }),
});
```

---

### `src/zod/expense.ts`

```ts
import { z } from 'zod';

const expenseCategories = [
  'Infrastructure', 'Tools', 'Operations', 'HR & Culture', 'Marketing', 'Payroll', 'Other',
] as const;

const expenseModes = ['Bank Transfer', 'UPI', 'Credit Card', 'Cash', 'Auto Debit'] as const;

export const createExpenseSchema = z.object({
  body: z.object({
    description: z.string().min(2).max(200),
    category:    z.enum(expenseCategories),
    amount:      z.coerce.number().positive(),
    date:        z.coerce.date(),
    mode:        z.enum(expenseModes),
    notes:       z.string().optional(),
  }),
});

export const updateExpenseSchema = z.object({
  body: createExpenseSchema.shape.body.partial(),
});
```

---

### `src/zod/quotation.ts`

```ts
import { z } from 'zod';

const lineItemSchema = z.object({
  desc: z.string().min(1),
  qty:  z.number().int().positive(),
  rate: z.number().positive(),
});

const timelineItemSchema = z.object({
  title:  z.string(),
  date:   z.string(),
  amount: z.number().min(0),
});

const companyDetailsSchema = z.object({
  name:    z.string(),
  address: z.string(),
  phone:   z.string(),
  email:   z.string().email(),
});

const clientDetailsSchema = z.object({
  name:    z.string(),
  company: z.string(),
  email:   z.string().email(),
});

const quoteMetaSchema = z.object({
  date:     z.string(),
  validFor: z.string(),
  ref:      z.string(),
});

export const createQuotationSchema = z.object({
  body: z.object({
    enquiryId:      z.string().optional(),
    lineItems:      z.array(lineItemSchema).min(1, 'At least one line item required'),
    welcomeTitle:   z.string().optional(),
    terms:          z.string().optional(),
    timelineItems:  z.array(timelineItemSchema).optional(),
    companyDetails: companyDetailsSchema.optional(),
    clientDetails:  clientDetailsSchema.optional(),
    quoteMeta:      quoteMetaSchema.optional(),
    gstPercent:     z.number().min(0).max(100).optional(),
  }),
});

export const updateQuotationSchema = z.object({
  body: createQuotationSchema.shape.body.partial(),
});
```

---

### `src/zod/chat.ts`

```ts
import { z } from 'zod';

export const sendMessageSchema = z.object({
  body: z.object({
    content: z.string().min(1, 'Message cannot be empty'),
  }),
});

export const sendVoiceSchema = z.object({
  body: z.object({
    duration: z.coerce.number().positive('Duration must be positive'),
  }),
});
```

---

### Notes

- `z.coerce.date()` converts string inputs (from JSON body) to `Date` objects automatically.
- `z.coerce.number()` converts string inputs (from multipart form fields, which come in as strings) to numbers.
- For multipart endpoints (payment, expense, website content), body fields come in as strings — always use `z.coerce.*` for numeric and date fields.
- All schemas pass `{ body, query, params }` through the `validateRequest` middleware. If an endpoint needs to validate URL params (e.g., check `projectId` is a valid ObjectId), add a `params` key:
  ```ts
  params: z.object({ id: z.string().min(24) })
  ```
