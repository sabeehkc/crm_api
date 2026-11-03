# 01 — Template Migration Guide

Apply every change in this file **before** writing any new CRM-specific code. Work top-to-bottom; each section is a discrete step.

---

## Implementation Order

1. Apply all changes in this file
2. Create all models → `02-mongodb-models.md`
3. Create Zod schemas and middleware → `04-rbac-and-validation.md`
4. Build controllers and routes → `03-api-endpoints.md`
5. Update upload middleware → `05-uploads-env-seed.md`
6. Set `.env` and run seed → `05-uploads-env-seed.md`

---

## Step 1 — `package.json`

| Field | Old value | New value |
|-------|-----------|-----------|
| `name` | `"backend-template-api"` | `"crm-api"` |
| pm2 app name (in `start:prod` script) | `"backend-template-api"` | `"crm-api"` |

Change the `start:prod` script from:
```
"start:prod": "pm2 start dist/server.js --name backend-template-api"
```
to:
```
"start:prod": "pm2 start dist/server.js --name crm-api"
```

---

## Step 2 — `src/config/index.ts`

Change the default fallback for `MONGO_URI`:

```ts
// Before
MONGO_URI: process.env.MONGO_URI || 'mongodb://localhost:27017/backend-template-api',

// After
MONGO_URI: process.env.MONGO_URI || 'mongodb://localhost:27017/crm',
```

---

## Step 3 — `src/lib/mongoose.ts`

Update the `appName` connection option:

```ts
// Before
appName: 'backend-template-api',

// After
appName: 'crm-api',
```

Also update any fallback database name references from `'backend-template-api'` to `'crm'`.

---

## Step 4 — Delete `src/lib/config.ts`

This file contains XP level calculations, conversion rates, and referral reward logic that is entirely irrelevant to a CRM. Delete the file:

```bash
rm src/lib/config.ts
```

Before deleting, confirm it has no imports elsewhere:

```bash
grep -r "lib/config" src/
```

If any file imports it, remove those imports too. The template's `src/lib/seed.ts` does **not** import it — safe to delete.

---

## Step 5 — `src/models/user.ts` — Update User Model

Replace the `IUser` interface and `userSchema` with the CRM-extended version below. Keep `comparePassword`, `findByEmail`, and `toJSON` methods exactly as they are — only the interface and schema definition change.

**Updated `IUser` interface:**

```ts
export interface IUser {
  name?: string;
  email: string;
  password?: string;
  phone?: string;
  role: 'admin' | 'designer' | 'developer' | 'qa' | 'sales' | 'viewer';
  isActive: boolean;
  profile: {
    firstName?: string;
    lastName?: string;
    profilePicture?: string;
  };
  pages: string[];           // page IDs this user can access; [] = all pages
  projects: Types.ObjectId[]; // project IDs; [] = all projects
  lastLogin?: Date;
  refreshTokens: string[];
  createdAt: Date;
  updatedAt: Date;
  comparePassword(password: string): Promise<boolean>;
}
```

Add `import { Schema, model, Model, Document, Types } from 'mongoose';` (add `Types`).

**Updated schema fields** (replace the `role` and add `phone`, `pages`, `projects` fields):

```ts
phone: {
  type: String,
  trim: true,
},
role: {
  type: String,
  required: [true, 'Role is required'],
  enum: {
    values: ['admin', 'designer', 'developer', 'qa', 'sales', 'viewer'],
    message: '{VALUE} is not a supported role',
  },
  default: 'viewer',
},
pages: {
  type: [String],
  default: [],
},
projects: {
  type: [{ type: Schema.Types.ObjectId, ref: 'Project' }],
  default: [],
},
```

**Page ID string constants** (document these so they're consistent across frontend and backend):

| Page | ID string |
|------|-----------|
| Dashboard | `'dashboard'` |
| Admin CRM | `'crm'` |
| Projects | `'projects'` |
| Payments | `'payments'` |
| Expenses | `'expenses'` |
| UI Manager | `'ui-manager'` |
| Users | `'users'` |

A user with `pages: []` has access to all pages (admin default). A non-empty array restricts access to only those pages. The API enforces role-based access; `pages` is metadata returned in the token payload for the **frontend** to render navigation.

---

## Step 6 — `src/middlewares/upload.ts` — Replace Upload Directories

Replace the entire file content with the CRM-specific version below. The year/month subdirectory logic and the filename generation logic are preserved. What changes:

1. Directory names (remove hubs/products/vehicles/services, add CRM dirs)
2. `fileFilter` now accepts PDFs for proof uploads (controlled per fieldname)
3. Named exports updated to match CRM field names
4. 10 MB limit for proof documents, 50 MB for website media

**New directory structure:**

```ts
const uploadsDir       = path.join(process.cwd(), 'uploads');
const profilesDir      = path.join(uploadsDir, 'profiles');
const paymentProofsDir = path.join(uploadsDir, 'payment-proofs');
const expenseProofsDir = path.join(uploadsDir, 'expense-proofs');
const websiteDir       = path.join(uploadsDir, 'website');
const voiceNotesDir    = path.join(uploadsDir, 'voice-notes');
```

**Updated `destination` routing (inside `diskStorage`):**

```ts
if (file.fieldname === 'profilePicture') {
  uploadPath = profilesDir;
} else if (file.fieldname === 'paymentProof') {
  uploadPath = paymentProofsDir;
} else if (file.fieldname === 'expenseProof') {
  uploadPath = expenseProofsDir;
} else if (file.fieldname === 'websiteImage' || file.fieldname === 'websiteVideo') {
  uploadPath = websiteDir;
} else if (file.fieldname === 'voiceNote') {
  uploadPath = voiceNotesDir;
}
```

**Updated `fileFilter` (per-fieldname MIME rules):**

```ts
const fileFilter = (req: Request, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
  const imageOnly  = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif'];
  const imageOrPdf = [...imageOnly, 'application/pdf'];
  const videoTypes = ['video/mp4', 'video/webm'];
  const audioTypes = ['audio/mpeg', 'audio/ogg', 'audio/webm'];

  let allowed: string[];

  if (file.fieldname === 'paymentProof' || file.fieldname === 'expenseProof') {
    allowed = imageOrPdf;
  } else if (file.fieldname === 'websiteVideo') {
    allowed = videoTypes;
  } else if (file.fieldname === 'voiceNote') {
    allowed = audioTypes;
  } else {
    allowed = imageOnly;
  }

  if (allowed.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error(`Invalid file type for field '${file.fieldname}'.`));
  }
};
```

**Multiple multer instances** (different size limits):

```ts
const proofUpload   = multer({ storage, fileFilter, limits: { fileSize: 10 * 1024 * 1024 } }); // 10 MB
const imageUpload   = multer({ storage, fileFilter, limits: { fileSize: 5  * 1024 * 1024 } }); // 5 MB
const mediaUpload   = multer({ storage, fileFilter, limits: { fileSize: 50 * 1024 * 1024 } }); // 50 MB
const audioUpload   = multer({ storage, fileFilter, limits: { fileSize: 5  * 1024 * 1024 } }); // 5 MB
```

**Named exports:**

```ts
export const uploadProfilePicture        = imageUpload.single('profilePicture');
export const uploadPaymentProof          = proofUpload.single('paymentProof');
export const uploadExpenseProof          = proofUpload.single('expenseProof');
export const uploadWebsiteImage          = mediaUpload.single('websiteImage');
export const uploadWebsiteVideo          = mediaUpload.single('websiteVideo');
export const uploadWebsiteMedia          = mediaUpload.fields([
  { name: 'websiteImage', maxCount: 1 },
  { name: 'websiteVideo', maxCount: 1 },
]);
export const uploadMultipleWebsiteImages = mediaUpload.array('websiteImage', 10);
export const uploadVoiceNote             = audioUpload.single('voiceNote');

// Keep these for the general-purpose /uploads endpoints
export const uploadSingleImage    = imageUpload.single('image');
export const uploadMultipleImages = imageUpload.array('images', 5);

export { getRelativePath, getImageUrl }; // keep existing helpers
```

---

## Step 7 — `src/routes/v1/index.ts` — Register All CRM Routes

Replace the file with:

```ts
import { Router } from 'express';
import authRoutes          from '@/routes/v1/auth';
import userRoutes          from '@/routes/v1/user';
import uploadRoutes        from '@/routes/v1/upload';
import dashboardRoutes     from '@/routes/v1/dashboard';
import enquiryRoutes       from '@/routes/v1/enquiry';
import projectRoutes       from '@/routes/v1/project';
import paymentRoutes       from '@/routes/v1/payment';
import expenseRoutes       from '@/routes/v1/expense';
import quotationRoutes     from '@/routes/v1/quotation';
import chatRoutes          from '@/routes/v1/chat';
import websiteRoutes       from '@/routes/v1/website-content';

const router = Router();

router.get('/', (_req: any, res: any) => {
  res.status(200).json({
    message: 'CRM API is live',
    status: 'ok',
    version: '1.0.0',
    timestamp: new Date().toISOString(),
  });
});

router.use('/auth',            authRoutes);
router.use('/users',           userRoutes);
router.use('/uploads',         uploadRoutes);
router.use('/dashboard',       dashboardRoutes);
router.use('/enquiries',       enquiryRoutes);
router.use('/projects',        projectRoutes);
router.use('/payments',        paymentRoutes);
router.use('/expenses',        expenseRoutes);
router.use('/quotations',      quotationRoutes);
router.use('/chat',            chatRoutes);
router.use('/website-content', websiteRoutes);

export default router;
```

> Create each route file as you implement the corresponding module. TypeScript will error if you import a non-existent file, so add imports one at a time as modules are built.

---

## Step 8 — `src/lib/seed.ts` — Replace Seed Data

Replace the file with:

```ts
import User            from '@/models/user';
import Enquiry         from '@/models/enquiry';
import WebsiteContent  from '@/models/website-content';
import logger          from '@/lib/logger';

export const seedDatabase = async () => {
  await seedAdmin();
  await seedWebsiteContent();

  if (process.env.NODE_ENV === 'development') {
    await seedDemoUsers();
    await seedDemoEnquiries();
  }
};

// ─── Admin ────────────────────────────────────────────────────────────────────

async function seedAdmin() {
  try {
    const email    = process.env.SEED_ADMIN_EMAIL    || 'admin@crm.local';
    const password = process.env.SEED_ADMIN_PASSWORD || 'Admin@123';

    const exists = await User.findOne({ email });
    if (exists) return logger.info('Admin user already exists');

    await User.create({ name: 'System Admin', email, password, role: 'admin' });
    logger.info(`Admin user seeded: ${email}`);
  } catch (err) {
    logger.error('seedAdmin error:', err);
  }
}

// ─── Website Content Singleton ────────────────────────────────────────────────

async function seedWebsiteContent() {
  try {
    const existing = await WebsiteContent.findOne();
    if (existing) return logger.info('WebsiteContent already exists');

    await WebsiteContent.create({
      hero:     { slides: [] },
      products: [],
      clients:  [],
      aboutUs: {
        mission:     'Our mission statement.',
        vision:      'Our vision statement.',
        directors:   [],
        social:      {},
        registration: { companyName: '', cin: '', gst: '', pan: '' },
      },
      news:  [],
      tools: [],
    });
    logger.info('WebsiteContent singleton seeded');
  } catch (err) {
    logger.error('seedWebsiteContent error:', err);
  }
}

// ─── Demo Users (dev only) ────────────────────────────────────────────────────

async function seedDemoUsers() {
  const demos = [
    { name: 'Priya Designer', email: 'priya@crm.local', password: 'Demo@123', role: 'designer', pages: ['dashboard', 'projects', 'ui-manager'] },
    { name: 'Rahul Dev',      email: 'rahul@crm.local', password: 'Demo@123', role: 'developer', pages: ['dashboard', 'projects'] },
    { name: 'Sales User',     email: 'sales@crm.local', password: 'Demo@123', role: 'sales',     pages: ['dashboard', 'crm', 'payments'] },
  ];

  for (const demo of demos) {
    try {
      const exists = await User.findOne({ email: demo.email });
      if (exists) continue;
      await User.create(demo);
      logger.info(`Demo user seeded: ${demo.email}`);
    } catch (err) {
      logger.error(`seedDemoUsers error (${demo.email}):`, err);
    }
  }
}

// ─── Demo Enquiries (dev only) ────────────────────────────────────────────────

async function seedDemoEnquiries() {
  try {
    const count = await Enquiry.countDocuments();
    if (count > 0) return logger.info('Enquiries already seeded');

    const admin = await User.findOne({ role: 'admin' });
    if (!admin) return logger.warn('No admin user found; skipping enquiry seed');

    await Enquiry.insertMany([
      { name: 'John Doe',   email: 'john@example.com',   phone: '9876543210', service: 'Web Development', status: 'New',       date: new Date(), createdBy: admin._id },
      { name: 'Sarah Lee',  email: 'sarah@example.com',  phone: '9123456789', service: 'UI/UX Design',    status: 'Followup',  date: new Date(), createdBy: admin._id },
      { name: 'Raj Kumar',  email: 'raj@example.com',    phone: '9988776655', service: 'Mobile App',      status: 'Converted', date: new Date(), createdBy: admin._id },
    ]);
    logger.info('Demo enquiries seeded');
  } catch (err) {
    logger.error('seedDemoEnquiries error:', err);
  }
}
```

---

## Step 9 — `src/routes/v1/user.ts` — Extend User Routes

The existing user route file has `GET /me`, `PUT /me`, and `GET /`. Add these new endpoints (full implementation details in `03-api-endpoints.md`):

| Method | Path | Purpose |
|--------|------|---------|
| `POST` | `/` | Create user (admin only) |
| `PUT` | `/:id` | Update any user (admin only) |
| `PATCH` | `/:id/status` | Toggle isActive (admin only) |
| `DELETE` | `/:id` | Soft delete user (admin only) |

---

## Verification Checklist

After applying all steps above:

- [ ] `npm run dev` starts without TypeScript errors
- [ ] `GET /api/v1/` returns `"CRM API is live"`
- [ ] MongoDB connects to `crm` database (check logs)
- [ ] `POST /api/v1/auth/register` still works
- [ ] `POST /api/v1/auth/login` with `admin@crm.local` / `Admin@123` returns a token (after seeding)
- [ ] `GET /api/v1/api-docs` renders Swagger UI without errors
- [ ] No imports of deleted `src/lib/config.ts` remain (grep confirms)
