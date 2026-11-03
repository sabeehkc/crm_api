# AI Build Prompt — CRM Backend

> Copy everything below this line and paste it to the AI.

---

You are building a **CRM backend API** from an existing company template. The template already exists at `crm-api/` — do not create it from scratch. Your job is to modify it and add new code on top of it.

---

## EXISTING TEMPLATE — What's already there (DO NOT recreate these)

**Stack:** Node.js + Express 5 + TypeScript + MongoDB/Mongoose  
**Already working:**
- `src/app.ts` — Express app with Helmet, CORS, compression, rate-limit, cookie-parser
- `src/server.ts` — DB connection + graceful shutdown
- `src/config/index.ts` — env config loader
- `src/lib/jwt.ts` — `generateAccessToken`, `generateRefreshToken`, `verifyAccessToken`, `verifyRefreshToken`
- `src/lib/mongoose.ts` — connect/disconnect
- `src/lib/logger.ts` — `logger.info/error/warn/debug`
- `src/lib/swagger.ts` — Swagger UI at `/api-docs`
- `src/middlewares/authenticate.ts` — JWT bearer token middleware, attaches user to `req.user`
- `src/middlewares/errorHandler.ts` — global error handler (Mongoose, JWT, Multer errors)
- `src/middlewares/validationError.ts` — `validateRequest(schema)` — calls `schema.parse({ body: req.body, query: req.query, params: req.params })`
- `src/middlewares/upload.ts` — Multer disk storage (needs to be replaced — see below)
- `src/utils/response.ts` — `sendSuccess`, `sendError`, `sendValidationError`, `sendUnauthorized`, `sendForbidden`, `sendNotFound`
- `src/@types/express/index.d.ts` — extends `Request` with `user`
- Auth routes + controllers: register, login, logout, refresh-token
- User routes + controllers: getMe, updateMe, getUsers
- Upload routes + controllers: single image, multiple images

---

## STEP 1 — TEMPLATE CHANGES (do these first)

### 1a. `package.json`
- `name`: `"backend-template-api"` → `"crm-api"`
- `start:prod` script: rename pm2 app from `backend-template-api` to `crm-api`

### 1b. `src/config/index.ts`
- Default `MONGO_URI` fallback: `mongodb://localhost:27017/backend-template-api` → `mongodb://localhost:27017/crm`

### 1c. `src/lib/mongoose.ts`
- `appName`: `'backend-template-api'` → `'crm-api'`

### 1d. DELETE `src/lib/config.ts`
This file has XP levels and referral reward logic irrelevant to a CRM. Delete it entirely.

### 1e. `src/models/user.ts` — Update the User model
Replace the `IUser` interface and schema. Keep all methods (`comparePassword`, `findByEmail`, `toJSON`) exactly as-is. Only change the interface and schema fields:

**New `IUser` interface:**
```ts
export interface IUser {
  name?: string;
  email: string;
  password?: string;
  phone?: string;
  role: 'admin' | 'designer' | 'developer' | 'qa' | 'sales' | 'viewer';
  isActive: boolean;
  profile: { firstName?: string; lastName?: string; profilePicture?: string; };
  pages: string[];            // page IDs user can access; [] = all pages
  projects: Types.ObjectId[]; // project IDs; [] = all projects
  lastLogin?: Date;
  refreshTokens: string[];
  createdAt: Date;
  updatedAt: Date;
  comparePassword(password: string): Promise<boolean>;
}
```

**New schema fields to add/change:**
```ts
phone: { type: String, trim: true },
role: {
  type: String,
  enum: { values: ['admin','designer','developer','qa','sales','viewer'], message: '{VALUE} is not supported' },
  default: 'viewer',
},
pages:    { type: [String], default: [] },
projects: { type: [{ type: Schema.Types.ObjectId, ref: 'Project' }], default: [] },
```

### 1f. `src/middlewares/upload.ts` — Replace entirely
New directory structure:
```ts
const profilesDir      = path.join(uploadsDir, 'profiles');
const paymentProofsDir = path.join(uploadsDir, 'payment-proofs');
const expenseProofsDir = path.join(uploadsDir, 'expense-proofs');
const websiteDir       = path.join(uploadsDir, 'website');
const voiceNotesDir    = path.join(uploadsDir, 'voice-notes');
```

Destination routing by `file.fieldname`:
- `profilePicture` → `profilesDir`
- `paymentProof` → `paymentProofsDir`
- `expenseProof` → `expenseProofsDir`
- `websiteImage` or `websiteVideo` → `websiteDir`
- `voiceNote` → `voiceNotesDir`

File filter (per fieldname):
- `paymentProof`, `expenseProof` → allow images + `application/pdf`
- `websiteVideo` → allow `video/mp4`, `video/webm`
- `voiceNote` → allow `audio/mpeg`, `audio/ogg`, `audio/webm`
- all others → images only (`jpeg/jpg/png/webp/gif`)

Three multer instances:
- `proofUpload` — 10 MB limit
- `imageUpload` — 5 MB limit
- `mediaUpload` — 50 MB limit
- `audioUpload` — 5 MB limit

Named exports:
```ts
export const uploadProfilePicture        = imageUpload.single('profilePicture');
export const uploadPaymentProof          = proofUpload.single('paymentProof');
export const uploadExpenseProof          = proofUpload.single('expenseProof');
export const uploadWebsiteImage          = mediaUpload.single('websiteImage');
export const uploadWebsiteVideo          = mediaUpload.single('websiteVideo');
export const uploadWebsiteMedia          = mediaUpload.fields([{ name: 'websiteImage', maxCount: 1 }, { name: 'websiteVideo', maxCount: 1 }]);
export const uploadMultipleWebsiteImages = mediaUpload.array('websiteImage', 10);
export const uploadVoiceNote             = audioUpload.single('voiceNote');
export const uploadSingleImage           = imageUpload.single('image');      // keep for /uploads endpoint
export const uploadMultipleImages        = imageUpload.array('images', 5);   // keep for /uploads endpoint
```
Keep `getRelativePath` and `getImageUrl` helpers unchanged.

### 1g. `src/routes/v1/index.ts` — Register all new routes
```ts
import { Router } from 'express';
import authRoutes         from '@/routes/v1/auth';
import userRoutes         from '@/routes/v1/user';
import uploadRoutes       from '@/routes/v1/upload';
import dashboardRoutes    from '@/routes/v1/dashboard';
import enquiryRoutes      from '@/routes/v1/enquiry';
import projectRoutes      from '@/routes/v1/project';
import paymentRoutes      from '@/routes/v1/payment';
import expenseRoutes      from '@/routes/v1/expense';
import quotationRoutes    from '@/routes/v1/quotation';
import chatRoutes         from '@/routes/v1/chat';
import websiteRoutes      from '@/routes/v1/website-content';

const router = Router();
router.get('/', (_req, res) => res.json({ message: 'CRM API is live', status: 'ok', version: '1.0.0', timestamp: new Date().toISOString() }));
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

### 1h. `src/lib/seed.ts` — Replace entirely
```ts
import User           from '@/models/user';
import Enquiry        from '@/models/enquiry';
import WebsiteContent from '@/models/website-content';
import logger         from '@/lib/logger';

export const seedDatabase = async () => {
  await seedAdmin();
  await seedWebsiteContent();
  if (process.env.NODE_ENV === 'development') {
    await seedDemoUsers();
    await seedDemoEnquiries();
  }
};

async function seedAdmin() {
  try {
    const email    = process.env.SEED_ADMIN_EMAIL    || 'admin@crm.local';
    const password = process.env.SEED_ADMIN_PASSWORD || 'Admin@123';
    const exists   = await User.findOne({ email });
    if (exists) return logger.info('Admin user already exists');
    await User.create({ name: 'System Admin', email, password, role: 'admin' });
    logger.info(`Admin user seeded: ${email}`);
  } catch (err) { logger.error('seedAdmin error:', err); }
}

async function seedWebsiteContent() {
  try {
    const existing = await WebsiteContent.findOne();
    if (existing) return logger.info('WebsiteContent already exists');
    await WebsiteContent.create({
      hero: { slides: [] }, products: [], clients: [],
      aboutUs: { mission: '', vision: '', directors: [], social: {}, registration: { companyName: '', cin: '', gst: '', pan: '' } },
      news: [], tools: [],
    });
    logger.info('WebsiteContent singleton seeded');
  } catch (err) { logger.error('seedWebsiteContent error:', err); }
}

async function seedDemoUsers() {
  const demos = [
    { name: 'Priya Designer', email: 'priya@crm.local', password: 'Demo@123', role: 'designer', pages: ['dashboard','projects','ui-manager'] },
    { name: 'Rahul Dev',      email: 'rahul@crm.local', password: 'Demo@123', role: 'developer', pages: ['dashboard','projects'] },
    { name: 'Sales User',     email: 'sales@crm.local', password: 'Demo@123', role: 'sales',     pages: ['dashboard','crm','payments'] },
  ];
  for (const demo of demos) {
    try {
      if (await User.findOne({ email: demo.email })) continue;
      await User.create(demo);
      logger.info(`Demo user seeded: ${demo.email}`);
    } catch (err) { logger.error(`seedDemoUsers error (${demo.email}):`, err); }
  }
}

async function seedDemoEnquiries() {
  try {
    if (await Enquiry.countDocuments() > 0) return logger.info('Enquiries already seeded');
    const admin = await User.findOne({ role: 'admin' });
    if (!admin) return;
    await Enquiry.insertMany([
      { name: 'John Doe',  email: 'john@example.com',  phone: '9876543210', service: 'Web Development', status: 'New',       date: new Date(), createdBy: admin._id },
      { name: 'Sarah Lee', email: 'sarah@example.com', phone: '9123456789', service: 'UI/UX Design',    status: 'Followup',  date: new Date(), createdBy: admin._id },
      { name: 'Raj Kumar', email: 'raj@example.com',   phone: '9988776655', service: 'Mobile App',      status: 'Converted', date: new Date(), createdBy: admin._id },
    ]);
    logger.info('Demo enquiries seeded');
  } catch (err) { logger.error('seedDemoEnquiries error:', err); }
}
```

---

## STEP 2 — NEW MIDDLEWARES

### `src/middlewares/authorize.ts`
```ts
import { Request, Response, NextFunction } from 'express';
import { sendForbidden } from '@/utils';

export const authorize = (...roles: string[]) => {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) return sendForbidden(res, 'Not authenticated');
    if (!roles.includes(req.user.role)) return sendForbidden(res, 'Access denied: insufficient role');
    next();
  };
};
```

### `src/middlewares/projectAccess.ts`
```ts
import { Request, Response, NextFunction } from 'express';
import { sendForbidden } from '@/utils';

export const projectAccess = (req: Request, res: Response, next: NextFunction) => {
  const user = req.user;
  if (!user) return sendForbidden(res);
  if (user.role === 'admin') return next();
  if (!user.projects || user.projects.length === 0) return next();
  const projectId = req.params.id;
  if (!projectId) return next();
  const hasAccess = user.projects.some((pid: any) => pid.toString() === projectId);
  if (!hasAccess) return sendForbidden(res, 'Access denied: project not in your allowed list');
  next();
};
```

> If `sendForbidden` does not exist in `src/utils/response.ts`, add it:
> `export const sendForbidden = (res: Response, message = 'Forbidden') => res.status(403).json({ success: false, code: 'FORBIDDEN', message });`

---

## STEP 3 — NEW MONGODB MODELS (create in `src/models/`)

### `src/models/enquiry.ts`
```ts
import { Schema, model, Model, Types } from 'mongoose';
export type EnquiryStatus = 'New'|'Followup'|'Quotation Sent'|'Converted'|'Rejected'|'Revised Quotation';
export interface IEnquiry {
  name: string; email: string; phone: string; service: string; date: Date;
  status: EnquiryStatus; notes?: string; createdBy: Types.ObjectId;
  createdAt: Date; updatedAt: Date;
}
export interface IEnquiryModel extends Model<IEnquiry> { findByStatus(s: EnquiryStatus): Promise<IEnquiry[]>; }
const enquirySchema = new Schema<IEnquiry>({
  name:    { type: String, required: true, trim: true },
  email:   { type: String, required: true, lowercase: true, trim: true },
  phone:   { type: String, required: true, trim: true },
  service: { type: String, required: true, trim: true },
  date:    { type: Date, default: Date.now },
  status:  { type: String, enum: ['New','Followup','Quotation Sent','Converted','Rejected','Revised Quotation'], default: 'New' },
  notes:   { type: String },
  createdBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
}, { timestamps: true });
enquirySchema.index({ status: 1 }); enquirySchema.index({ date: -1 }); enquirySchema.index({ email: 1 });
enquirySchema.statics.findByStatus = function(s) { return this.find({ status: s }); };
export default model<IEnquiry, IEnquiryModel>('Enquiry', enquirySchema);
```

### `src/models/project.ts`
```ts
import { Schema, model, Types } from 'mongoose';
export type ProjectStatus = 'Just Started'|'In Progress'|'Nearly Done'|'Completed'|'On Hold';
export interface IProject {
  name: string; tags: string[]; client: string; team: Types.ObjectId[];
  budget: number; progress: number; startDate: Date; dueDate: Date;
  status: ProjectStatus; description?: string; createdBy: Types.ObjectId;
  createdAt: Date; updatedAt: Date;
}
const projectSchema = new Schema<IProject>({
  name:     { type: String, required: true, trim: true },
  tags:     { type: [String], default: [] },
  client:   { type: String, required: true, trim: true },
  team:     { type: [{ type: Schema.Types.ObjectId, ref: 'User' }], default: [] },
  budget:   { type: Number, required: true, min: 0 },
  progress: { type: Number, default: 0, min: 0, max: 100 },
  startDate: { type: Date, required: true },
  dueDate:  { type: Date, required: true },
  status:   { type: String, enum: ['Just Started','In Progress','Nearly Done','Completed','On Hold'], default: 'Just Started' },
  description: { type: String },
  createdBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
}, { timestamps: true });
projectSchema.index({ status: 1 }); projectSchema.index({ dueDate: 1 });
export default model<IProject>('Project', projectSchema);
```

### `src/models/milestone.ts`
```ts
import { Schema, model, Types } from 'mongoose';
export type MilestoneStatus = 'pending'|'in_progress'|'done';
export interface IMilestone { projectId: Types.ObjectId; title: string; dueDate: Date; status: MilestoneStatus; createdAt: Date; updatedAt: Date; }
const milestoneSchema = new Schema<IMilestone>({
  projectId: { type: Schema.Types.ObjectId, ref: 'Project', required: true },
  title:     { type: String, required: true, trim: true },
  dueDate:   { type: Date, required: true },
  status:    { type: String, enum: ['pending','in_progress','done'], default: 'pending' },
}, { timestamps: true });
milestoneSchema.index({ projectId: 1, dueDate: 1 });
export default model<IMilestone>('Milestone', milestoneSchema);
```

### `src/models/task.ts`
```ts
import { Schema, model, Types } from 'mongoose';
export type TaskStatus = 'Pending'|'In Progress'|'Done';
export interface ITask { milestoneId: Types.ObjectId; projectId: Types.ObjectId; title: string; dueDate: Date; assigneeId: Types.ObjectId; status: TaskStatus; createdAt: Date; updatedAt: Date; }
const taskSchema = new Schema<ITask>({
  milestoneId: { type: Schema.Types.ObjectId, ref: 'Milestone', required: true },
  projectId:   { type: Schema.Types.ObjectId, ref: 'Project', required: true },
  title:       { type: String, required: true, trim: true },
  dueDate:     { type: Date, required: true },
  assigneeId:  { type: Schema.Types.ObjectId, ref: 'User', required: true },
  status:      { type: String, enum: ['Pending','In Progress','Done'], default: 'Pending' },
}, { timestamps: true });
taskSchema.index({ milestoneId: 1 }); taskSchema.index({ projectId: 1 }); taskSchema.index({ assigneeId: 1 });
export default model<ITask>('Task', taskSchema);
```

### `src/models/bug.ts`
```ts
import { Schema, model, Types } from 'mongoose';
export type BugSeverity = 'Critical'|'High'|'Low';
export type BugStatus   = 'Open'|'In Progress'|'Resolved';
export interface IBug {
  projectId: Types.ObjectId; bugId: string; title: string; reporter: string;
  severity: BugSeverity; status: BugStatus; stepsToReproduce?: string;
  resolution?: string; reportedAt: Date; resolvedAt?: Date; resolutionTime?: string;
  createdAt: Date; updatedAt: Date;
}
const bugSchema = new Schema<IBug>({
  projectId:        { type: Schema.Types.ObjectId, ref: 'Project', required: true },
  bugId:            { type: String },
  title:            { type: String, required: true, trim: true },
  reporter:         { type: String, required: true, trim: true },
  severity:         { type: String, enum: ['Critical','High','Low'], required: true },
  status:           { type: String, enum: ['Open','In Progress','Resolved'], default: 'Open' },
  stepsToReproduce: { type: String },
  resolution:       { type: String },
  reportedAt:       { type: Date, default: Date.now },
  resolvedAt:       { type: Date },
  resolutionTime:   { type: String },
}, { timestamps: true });
// Auto bugId: BUG-001 scoped per project
bugSchema.pre('save', async function(next) {
  if (!this.isNew) return next();
  try {
    const count = await (this.constructor as any).countDocuments({ projectId: this.projectId });
    this.bugId = `BUG-${String(count + 1).padStart(3,'0')}`;
    next();
  } catch(err: any) { next(err); }
});
bugSchema.index({ projectId: 1, status: 1 }); bugSchema.index({ severity: 1 });
export default model<IBug>('Bug', bugSchema);
```

### `src/models/payment.ts`
```ts
import { Schema, model, Types } from 'mongoose';
export type PaymentMode = 'bank'|'upi'|'cheque'|'neft'|'credit_card'|'auto_debit'|'cash';
export interface IPayment { projectId: Types.ObjectId; client: string; amount: number; date: Date; mode: PaymentMode; proofDocument?: string; notes?: string; createdBy: Types.ObjectId; createdAt: Date; updatedAt: Date; }
const paymentSchema = new Schema<IPayment>({
  projectId:     { type: Schema.Types.ObjectId, ref: 'Project', required: true },
  client:        { type: String, required: true, trim: true },
  amount:        { type: Number, required: true, min: 0 },
  date:          { type: Date, required: true },
  mode:          { type: String, enum: ['bank','upi','cheque','neft','credit_card','auto_debit','cash'], required: true },
  proofDocument: { type: String },
  notes:         { type: String },
  createdBy:     { type: Schema.Types.ObjectId, ref: 'User', required: true },
}, { timestamps: true });
paymentSchema.index({ projectId: 1, date: -1 });
export default model<IPayment>('Payment', paymentSchema);
```

### `src/models/invoice.ts`
```ts
import { Schema, model, Types } from 'mongoose';
export type InvoiceStatus = 'Pending'|'Partial'|'Paid';
export interface IInvoice { invoiceNumber: string; projectId: Types.ObjectId; client: string; totalAmount: number; receivedAmount: number; outstandingAmount: number; status: InvoiceStatus; issuedDate: Date; dueDate?: Date; createdBy: Types.ObjectId; createdAt: Date; updatedAt: Date; }
const invoiceSchema = new Schema<IInvoice>({
  invoiceNumber:  { type: String },
  projectId:      { type: Schema.Types.ObjectId, ref: 'Project', required: true },
  client:         { type: String, required: true },
  totalAmount:    { type: Number, required: true, min: 0 },
  receivedAmount: { type: Number, default: 0, min: 0 },
  status:         { type: String, enum: ['Pending','Partial','Paid'], default: 'Pending' },
  issuedDate:     { type: Date, default: Date.now },
  dueDate:        { type: Date },
  createdBy:      { type: Schema.Types.ObjectId, ref: 'User', required: true },
}, { timestamps: true, toJSON: { virtuals: true }, toObject: { virtuals: true } });
invoiceSchema.virtual('outstandingAmount').get(function() { return Math.max(0, this.totalAmount - this.receivedAmount); });
// Auto invoiceNumber: INV-2025-001
invoiceSchema.pre('save', async function(next) {
  if (!this.isNew) return next();
  try {
    const year = new Date().getFullYear();
    const count = await (this.constructor as any).countDocuments({ issuedDate: { $gte: new Date(`${year}-01-01`) } });
    this.invoiceNumber = `INV-${year}-${String(count + 1).padStart(3,'0')}`;
    next();
  } catch(err: any) { next(err); }
});
// Auto-update status
invoiceSchema.pre('save', function(next) {
  if (this.receivedAmount >= this.totalAmount) this.status = 'Paid';
  else if (this.receivedAmount > 0) this.status = 'Partial';
  else this.status = 'Pending';
  next();
});
invoiceSchema.index({ projectId: 1 }); invoiceSchema.index({ status: 1 });
export default model<IInvoice>('Invoice', invoiceSchema);
```

### `src/models/expense.ts`
```ts
import { Schema, model, Types } from 'mongoose';
export type ExpenseCategory = 'Infrastructure'|'Tools'|'Operations'|'HR & Culture'|'Marketing'|'Payroll'|'Other';
export type ExpenseMode = 'Bank Transfer'|'UPI'|'Credit Card'|'Cash'|'Auto Debit';
export interface IExpense { description: string; category: ExpenseCategory; amount: number; date: Date; mode: ExpenseMode; proofDocument?: string; proofVerified: boolean; notes?: string; createdBy: Types.ObjectId; createdAt: Date; updatedAt: Date; }
const expenseSchema = new Schema<IExpense>({
  description:   { type: String, required: true, trim: true, maxlength: 200 },
  category:      { type: String, enum: ['Infrastructure','Tools','Operations','HR & Culture','Marketing','Payroll','Other'], required: true },
  amount:        { type: Number, required: true, min: 0 },
  date:          { type: Date, required: true },
  mode:          { type: String, enum: ['Bank Transfer','UPI','Credit Card','Cash','Auto Debit'], required: true },
  proofDocument: { type: String },
  proofVerified: { type: Boolean, default: false },
  notes:         { type: String },
  createdBy:     { type: Schema.Types.ObjectId, ref: 'User', required: true },
}, { timestamps: true });
expenseSchema.index({ category: 1, date: -1 });
export default model<IExpense>('Expense', expenseSchema);
```

### `src/models/quotation.ts`
```ts
import { Schema, model, Types } from 'mongoose';
const lineItemSchema = new Schema({ desc: String, qty: Number, rate: Number }, { _id: false, toJSON: { virtuals: true }, toObject: { virtuals: true } });
lineItemSchema.virtual('amount').get(function() { return (this.qty || 0) * (this.rate || 0); });
export interface IQuotation {
  enquiryId?: Types.ObjectId; referenceNumber: string;
  lineItems: Array<{ desc: string; qty: number; rate: number }>;
  welcomeTitle?: string; terms?: string;
  timelineItems: Array<{ title: string; date: string; amount: number }>;
  companyDetails: { name: string; address: string; phone: string; email: string };
  clientDetails:  { name: string; company: string; email: string };
  quoteMeta:      { date: string; validFor: string; ref: string };
  gstPercent: number; subtotal: number; gstAmount: number; totalAmount: number;
  createdBy: Types.ObjectId; createdAt: Date; updatedAt: Date;
}
const quotationSchema = new Schema<IQuotation>({
  enquiryId:     { type: Schema.Types.ObjectId, ref: 'Enquiry' },
  referenceNumber: { type: String },
  lineItems:     { type: [lineItemSchema], default: [] },
  welcomeTitle:  { type: String },
  terms:         { type: String },
  timelineItems: { type: [{ title: String, date: String, amount: Number, _id: false }], default: [] },
  companyDetails: { name: String, address: String, phone: String, email: String, _id: false },
  clientDetails:  { name: String, company: String, email: String, _id: false },
  quoteMeta:      { date: String, validFor: String, ref: String, _id: false },
  gstPercent:    { type: Number, default: 18 },
  createdBy:     { type: Schema.Types.ObjectId, ref: 'User', required: true },
}, { timestamps: true, toJSON: { virtuals: true }, toObject: { virtuals: true } });
quotationSchema.virtual('subtotal').get(function() { return this.lineItems.reduce((s,i) => s + i.qty*i.rate, 0); });
quotationSchema.virtual('gstAmount').get(function() { const s = this.lineItems.reduce((a,i) => a+i.qty*i.rate,0); return +(s*(this.gstPercent/100)).toFixed(2); });
quotationSchema.virtual('totalAmount').get(function() { const s = this.lineItems.reduce((a,i) => a+i.qty*i.rate,0); return +(s + s*(this.gstPercent/100)).toFixed(2); });
quotationSchema.pre('save', async function(next) {
  if (!this.isNew) return next();
  try {
    const count = await (this.constructor as any).countDocuments();
    this.referenceNumber = `QT-${String(count+1).padStart(4,'0')}`;
    next();
  } catch(err: any) { next(err); }
});
quotationSchema.index({ enquiryId: 1 });
export default model<IQuotation>('Quotation', quotationSchema);
```

### `src/models/chat-message.ts`
```ts
import { Schema, model, Types } from 'mongoose';
export interface IChatMessage { enquiryId: Types.ObjectId; senderId: Types.ObjectId; senderName: string; content: string; messageType: 'text'|'voice'; voiceDuration?: number; voiceUrl?: string; timestamp: Date; createdAt: Date; updatedAt: Date; }
const chatMessageSchema = new Schema<IChatMessage>({
  enquiryId:     { type: Schema.Types.ObjectId, ref: 'Enquiry', required: true },
  senderId:      { type: Schema.Types.ObjectId, ref: 'User', required: true },
  senderName:    { type: String, required: true },
  content:       { type: String, required: true },
  messageType:   { type: String, enum: ['text','voice'], default: 'text' },
  voiceDuration: { type: Number },
  voiceUrl:      { type: String },
  timestamp:     { type: Date, default: Date.now },
}, { timestamps: true });
chatMessageSchema.index({ enquiryId: 1, timestamp: 1 });
export default model<IChatMessage>('ChatMessage', chatMessageSchema);
```

### `src/models/website-content.ts`
Singleton model. One document only. Always access via `WebsiteContent.findOne()` or `WebsiteContent.getInstance()`.
```ts
import { Schema, model, Model, Types } from 'mongoose';
export interface IWebsiteContent {
  hero: { slides: Array<{ title: string; order: number; type: 'image'|'video'; mediaUrl: string }> };
  products: Array<{ _id?: Types.ObjectId; title: string; description?: string; mediaType: 'image'|'video'; mediaUrl?: string; isLive: boolean; displayOrder: number }>;
  clients: Array<{ _id?: Types.ObjectId; name: string; contactPerson?: string; testimony?: string; logoUrl?: string; isShown: boolean }>;
  aboutUs: { mission: string; vision: string; directors: Array<{ _id?: Types.ObjectId; name: string; title?: string; email?: string; photoUrl?: string }>; social: { linkedin?: string; twitter?: string; instagram?: string; facebook?: string; youtube?: string }; registration: { companyName: string; cin: string; gst: string; pan: string } };
  news: Array<{ _id?: Types.ObjectId; type: string; date?: Date; title: string; subtitle?: string; content: string; featuredImageUrl?: string; views: number; likes: number; isPublished: boolean; isDraft: boolean }>;
  tools: Array<{ _id?: Types.ObjectId; name: string; description?: string; link: string; logoUrl?: string }>;
  updatedBy?: Types.ObjectId; updatedAt: Date; createdAt: Date;
}
export interface IWebsiteContentModel extends Model<IWebsiteContent> { getInstance(): Promise<any>; }
const websiteContentSchema = new Schema<IWebsiteContent>({
  hero:     { slides: { type: [{ title: String, order: { type: Number, default: 0 }, type: { type: String, enum: ['image','video'], default: 'image' }, mediaUrl: String }], default: [] } },
  products: { type: [{ title: { type: String, required: true }, description: String, mediaType: { type: String, enum: ['image','video'], default: 'image' }, mediaUrl: String, isLive: { type: Boolean, default: true }, displayOrder: { type: Number, default: 0 } }], default: [] },
  clients:  { type: [{ name: { type: String, required: true }, contactPerson: String, testimony: String, logoUrl: String, isShown: { type: Boolean, default: true } }], default: [] },
  aboutUs:  {
    mission:   { type: String, default: '' }, vision: { type: String, default: '' },
    directors: { type: [{ name: { type: String, required: true }, title: String, email: String, photoUrl: String }], default: [] },
    social:    { linkedin: String, twitter: String, instagram: String, facebook: String, youtube: String },
    registration: { companyName: { type: String, default: '' }, cin: { type: String, default: '' }, gst: { type: String, default: '' }, pan: { type: String, default: '' } },
  },
  news:  { type: [{ type: { type: String, enum: ['Press Release','Blog','Case Study','Announcement'] }, date: Date, title: { type: String, required: true }, subtitle: String, content: { type: String, required: true }, featuredImageUrl: String, views: { type: Number, default: 0 }, likes: { type: Number, default: 0 }, isPublished: { type: Boolean, default: false }, isDraft: { type: Boolean, default: true } }], default: [] },
  tools: { type: [{ name: { type: String, required: true }, description: String, link: { type: String, required: true }, logoUrl: String }], default: [] },
  updatedBy: { type: Schema.Types.ObjectId, ref: 'User' },
}, { timestamps: true });
websiteContentSchema.statics.getInstance = async function() {
  let doc = await this.findOne();
  if (!doc) doc = await this.create({ hero: { slides: [] }, products: [], clients: [], aboutUs: { mission: '', vision: '', directors: [], social: {}, registration: { companyName: '', cin: '', gst: '', pan: '' } }, news: [], tools: [] });
  return doc;
};
export default model<IWebsiteContent, IWebsiteContentModel>('WebsiteContent', websiteContentSchema);
```

---

## STEP 4 — ZOD VALIDATION SCHEMAS (create in `src/zod/`)

All schemas use the pattern `z.object({ body: z.object({...}) })` to match the `validateRequest` middleware which calls `schema.parse({ body, query, params })`. Use `z.coerce.date()` for dates and `z.coerce.number()` for numbers in multipart forms (fields come as strings).

### `src/zod/user.ts`
```ts
import { z } from 'zod';
const userRoles = ['admin','designer','developer','qa','sales','viewer'] as const;
export const createUserSchema = z.object({ body: z.object({ name: z.string().min(2), email: z.string().email(), password: z.string().min(6), role: z.enum(userRoles).default('viewer'), phone: z.string().optional(), pages: z.array(z.string()).optional(), projects: z.array(z.string()).optional() }) });
export const updateUserSchema = z.object({ body: z.object({ name: z.string().min(2).optional(), phone: z.string().optional(), role: z.enum(userRoles).optional(), pages: z.array(z.string()).optional(), projects: z.array(z.string()).optional(), profile: z.object({ firstName: z.string().optional(), lastName: z.string().optional() }).optional() }) });
export const updateStatusSchema = z.object({ body: z.object({ isActive: z.boolean() }) });
```

### `src/zod/enquiry.ts`
```ts
import { z } from 'zod';
const statuses = ['New','Followup','Quotation Sent','Converted','Rejected','Revised Quotation'] as const;
export const createEnquirySchema = z.object({ body: z.object({ name: z.string().min(2), email: z.string().email(), phone: z.string().min(7), service: z.string().min(2), date: z.coerce.date().optional(), status: z.enum(statuses).optional(), notes: z.string().max(1000).optional() }) });
export const updateEnquirySchema = z.object({ body: createEnquirySchema.shape.body.partial() });
export const updateEnquiryStatusSchema = z.object({ body: z.object({ status: z.enum(statuses) }) });
```

### `src/zod/project.ts`
```ts
import { z } from 'zod';
const statuses = ['Just Started','In Progress','Nearly Done','Completed','On Hold'] as const;
export const createProjectSchema = z.object({ body: z.object({ name: z.string().min(2), tags: z.array(z.string()).optional(), client: z.string().min(2), team: z.array(z.string()).optional(), budget: z.number().positive(), startDate: z.coerce.date(), dueDate: z.coerce.date(), description: z.string().optional() }) });
export const updateProjectSchema = z.object({ body: createProjectSchema.shape.body.partial() });
export const updateProgressSchema = z.object({ body: z.object({ progress: z.number().min(0).max(100) }) });
```

### `src/zod/milestone.ts`
```ts
import { z } from 'zod';
export const createMilestoneSchema = z.object({ body: z.object({ title: z.string().min(2), dueDate: z.coerce.date(), status: z.enum(['pending','in_progress','done']).optional() }) });
export const updateMilestoneSchema = z.object({ body: createMilestoneSchema.shape.body.partial() });
```

### `src/zod/task.ts`
```ts
import { z } from 'zod';
export const createTaskSchema = z.object({ body: z.object({ title: z.string().min(2), dueDate: z.coerce.date(), assigneeId: z.string().min(24), status: z.enum(['Pending','In Progress','Done']).optional() }) });
export const updateTaskSchema = z.object({ body: createTaskSchema.shape.body.partial() });
```

### `src/zod/bug.ts`
```ts
import { z } from 'zod';
export const createBugSchema = z.object({ body: z.object({ title: z.string().min(2), reporter: z.string().min(2), severity: z.enum(['Critical','High','Low']), stepsToReproduce: z.string().optional(), resolution: z.string().optional() }) });
export const updateBugSchema = z.object({ body: z.object({ status: z.enum(['Open','In Progress','Resolved']).optional(), resolution: z.string().optional(), resolvedAt: z.coerce.date().optional(), resolutionTime: z.string().optional() }) });
```

### `src/zod/payment.ts`
```ts
import { z } from 'zod';
export const createPaymentSchema = z.object({ body: z.object({ projectId: z.string().min(24), client: z.string().min(2), amount: z.coerce.number().positive(), date: z.coerce.date(), mode: z.enum(['bank','upi','cheque','neft','credit_card','auto_debit','cash']), notes: z.string().max(500).optional() }) });
export const updatePaymentSchema = z.object({ body: createPaymentSchema.shape.body.partial() });
export const createInvoiceSchema = z.object({ body: z.object({ projectId: z.string().min(24), client: z.string().min(2), totalAmount: z.coerce.number().positive(), dueDate: z.coerce.date().optional() }) });
export const updateReceivedSchema = z.object({ body: z.object({ receivedAmount: z.coerce.number().min(0) }) });
```

### `src/zod/expense.ts`
```ts
import { z } from 'zod';
export const createExpenseSchema = z.object({ body: z.object({ description: z.string().min(2).max(200), category: z.enum(['Infrastructure','Tools','Operations','HR & Culture','Marketing','Payroll','Other']), amount: z.coerce.number().positive(), date: z.coerce.date(), mode: z.enum(['Bank Transfer','UPI','Credit Card','Cash','Auto Debit']), notes: z.string().optional() }) });
export const updateExpenseSchema = z.object({ body: createExpenseSchema.shape.body.partial() });
```

### `src/zod/quotation.ts`
```ts
import { z } from 'zod';
const lineItem = z.object({ desc: z.string().min(1), qty: z.number().int().positive(), rate: z.number().positive() });
const timelineItem = z.object({ title: z.string(), date: z.string(), amount: z.number().min(0) });
export const createQuotationSchema = z.object({ body: z.object({ enquiryId: z.string().optional(), lineItems: z.array(lineItem).min(1), welcomeTitle: z.string().optional(), terms: z.string().optional(), timelineItems: z.array(timelineItem).optional(), companyDetails: z.object({ name: z.string(), address: z.string(), phone: z.string(), email: z.string().email() }).optional(), clientDetails: z.object({ name: z.string(), company: z.string(), email: z.string().email() }).optional(), quoteMeta: z.object({ date: z.string(), validFor: z.string(), ref: z.string() }).optional(), gstPercent: z.number().min(0).max(100).optional() }) });
export const updateQuotationSchema = z.object({ body: createQuotationSchema.shape.body.partial() });
```

### `src/zod/chat.ts`
```ts
import { z } from 'zod';
export const sendMessageSchema = z.object({ body: z.object({ content: z.string().min(1) }) });
export const sendVoiceSchema = z.object({ body: z.object({ duration: z.coerce.number().positive() }) });
```

---

## STEP 5 — ROUTES & CONTROLLERS

Create each route file in `src/routes/v1/` and each controller in `src/controllers/v1/<module>/index.ts`. Follow the same pattern as the existing `auth` and `user` controllers.

**Controller pattern:**
```ts
import { Request, Response, NextFunction } from 'express';
import { sendSuccess, sendError, sendNotFound } from '@/utils';
import Model from '@/models/model';

export const listItems = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { page = 1, limit = 20, search, status } = req.query;
    const query: any = {};
    if (status) query.status = status;
    if (search) query.$or = [{ name: { $regex: search, $options: 'i' } }];
    const [items, total] = await Promise.all([
      Model.find(query).skip((+page-1)*+limit).limit(+limit).sort({ createdAt: -1 }),
      Model.countDocuments(query),
    ]);
    sendSuccess(res, { items, total, page: +page, limit: +limit, totalPages: Math.ceil(total/+limit) });
  } catch (err) { next(err); }
};
```

### Dashboard — `src/routes/v1/dashboard.ts`
Two endpoints, both `authenticate + authorize('admin','sales')`:
- `GET /` → metrics: `{ totalEnquiries, convertedSales, pendingFollowups, outstandingPayments }`
  - `totalEnquiries` = `Enquiry.countDocuments()`
  - `convertedSales` = `Enquiry.countDocuments({ status: 'Converted' })`
  - `pendingFollowups` = `Enquiry.countDocuments({ status: { $in: ['New','Followup'] } })`
  - `outstandingPayments` = Invoice aggregate: `{ $group: { _id: null, total: { $sum: { $subtract: ['$totalAmount','$receivedAmount'] } } } }`
- `GET /recent-enquiries` → 5 most recent enquiries (`sort: { createdAt: -1 }, limit: 5`)

### Users — extend `src/routes/v1/user.ts`
Add to existing routes:
- `POST /` → `authenticate, authorize('admin'), validateRequest(createUserSchema), createUser`
- `PUT /:id` → `authenticate, authorize('admin'), validateRequest(updateUserSchema), updateUserById`
- `PATCH /:id/status` → `authenticate, authorize('admin'), validateRequest(updateStatusSchema), toggleUserStatus`
- `DELETE /:id` → `authenticate, authorize('admin'), deleteUser` (set `isActive: false`, do not hard delete)

### Enquiries — `src/routes/v1/enquiry.ts`
- `GET /` → `authenticate, authorize('admin','sales')` → list paginated, filter by `status`, `search` (name/email/phone/service)
- `POST /` → `authenticate, authorize('admin','sales'), validateRequest(createEnquirySchema)` → create, set `createdBy: req.user._id`
- `GET /:id` → `authenticate, authorize('admin','sales')` → get by id
- `PUT /:id` → `authenticate, authorize('admin','sales'), validateRequest(updateEnquirySchema)` → update
- `PATCH /:id/status` → `authenticate, authorize('admin','sales'), validateRequest(updateEnquiryStatusSchema)` → update status only
- `DELETE /:id` → `authenticate, authorize('admin')` → delete

### Projects — `src/routes/v1/project.ts`
- `GET /` → `authenticate, authorize('admin','developer','qa','designer','sales')` → list paginated, filter by status/search
- `POST /` → `authenticate, authorize('admin'), validateRequest(createProjectSchema)` → create
- `GET /:id` → `authenticate, projectAccess` → detail
- `PUT /:id` → `authenticate, authorize('admin'), validateRequest(updateProjectSchema)` → update
- `PATCH /:id/progress` → `authenticate, authorize('admin','developer'), validateRequest(updateProgressSchema)` → update progress field only
- `DELETE /:id` → `authenticate, authorize('admin')` → delete project + cascade delete its milestones, tasks, bugs

Nested under projects (same route file or split — your choice):
- `GET /:id/milestones` → `authenticate, projectAccess` → all milestones + tasks grouped
- `POST /:id/milestones` → `authenticate, authorize('admin','developer'), validateRequest(createMilestoneSchema)` → create milestone
- `PUT /:id/milestones/:milestoneId` → `authenticate, authorize('admin','developer'), validateRequest(updateMilestoneSchema)` → update
- `DELETE /:id/milestones/:milestoneId` → `authenticate, authorize('admin')` → delete milestone + its tasks
- `POST /:id/milestones/:milestoneId/tasks` → `authenticate, projectAccess, validateRequest(createTaskSchema)` → create task
- `PUT /:id/milestones/:milestoneId/tasks/:taskId` → `authenticate, projectAccess, validateRequest(updateTaskSchema)` → update
- `DELETE /:id/milestones/:milestoneId/tasks/:taskId` → `authenticate, authorize('admin','developer')` → delete
- `GET /:id/bugs` → `authenticate, projectAccess` → list bugs, filter by status/severity
- `POST /:id/bugs` → `authenticate, projectAccess, validateRequest(createBugSchema)` → report bug
- `PUT /:id/bugs/:bugId` → `authenticate, projectAccess, validateRequest(updateBugSchema)` → update bug
- `DELETE /:id/bugs/:bugId` → `authenticate, authorize('admin')` → delete

### Payments — `src/routes/v1/payment.ts`
- `GET /` → `authenticate, authorize('admin','sales')` → paginated, filter by projectId/date range
- `GET /overview` → `authenticate, authorize('admin','sales')` → per-project summary (aggregate: total paid, outstanding)
- `POST /` → `authenticate, authorize('admin','sales'), uploadPaymentProof` → multipart: fields + optional file. Store `getRelativePath(req.file.path)` in `proofDocument`. Set `createdBy`.
- `PUT /:id` → `authenticate, authorize('admin','sales'), uploadPaymentProof` → update
- `DELETE /:id` → `authenticate, authorize('admin')` → delete
- `GET /invoices` → `authenticate, authorize('admin','sales')` → list invoices
- `POST /invoices` → `authenticate, authorize('admin','sales'), validateRequest(createInvoiceSchema)` → create invoice
- `GET /invoices/:id` → `authenticate, authorize('admin','sales')` → invoice detail (use `.exec()` for virtuals)
- `PATCH /invoices/:id/received` → `authenticate, authorize('admin','sales'), validateRequest(updateReceivedSchema)` → update receivedAmount (status auto-updates in pre-save)

### Expenses — `src/routes/v1/expense.ts`
- `GET /` → `authenticate, authorize('admin')` → paginated, filter by category/date/search
- `GET /summary` → `authenticate, authorize('admin')` → `{ total, byCategory }` via aggregate
- `POST /` → `authenticate, authorize('admin'), uploadExpenseProof` → multipart. Set `createdBy`.
- `PUT /:id` → `authenticate, authorize('admin'), uploadExpenseProof` → update
- `DELETE /:id` → `authenticate, authorize('admin')` → delete

### Quotations — `src/routes/v1/quotation.ts`
- `GET /` → `authenticate, authorize('admin','sales')` → paginated, filter by enquiryId
- `POST /` → `authenticate, authorize('admin','sales'), validateRequest(createQuotationSchema)` → create. Set `createdBy`.
- `GET /:id` → `authenticate, authorize('admin','sales')` → use `.exec()` not `.lean()` for virtuals
- `PUT /:id` → `authenticate, authorize('admin','sales'), validateRequest(updateQuotationSchema)` → update
- `DELETE /:id` → `authenticate, authorize('admin')` → delete
- `GET /:id/pdf` → `authenticate, authorize('admin','sales')` → stream PDF. Install: `npm install pdfkit @types/pdfkit`. Set headers `Content-Type: application/pdf`, `Content-Disposition: attachment; filename="QT-XXXX.pdf"`. Pipe PDFDocument to res.

### Chat — `src/routes/v1/chat.ts`
- `GET /:enquiryId/messages` → `authenticate, authorize('admin','sales')` → paginated (default limit 50), sort `timestamp: -1`
- `POST /:enquiryId/messages` → `authenticate, authorize('admin','sales'), validateRequest(sendMessageSchema)` → create text message. Set `senderId: req.user._id`, `senderName: req.user.name`, `messageType: 'text'`
- `POST /:enquiryId/messages/voice` → `authenticate, authorize('admin','sales'), uploadVoiceNote` → create voice message. Set `voiceUrl: getImageUrl(getRelativePath(req.file.path))`, `content: '[Voice Note]'`, `messageType: 'voice'`, `voiceDuration: req.body.duration`

### Website Content — `src/routes/v1/website-content.ts`
All reads: `authenticate`. All writes: `authenticate, authorize('admin','designer')`. Deletes: `authenticate, authorize('admin')`.

Use MongoDB operators on the singleton: `$push` to add, `$set` with positional `$` to update embedded docs, `$pull` to remove.

- `GET /` → get full singleton (`WebsiteContent.findOne()`)
- `PUT /hero` → replace `hero.slides` array
- `PUT /about-us` → update `aboutUs` fields (merge, not replace)
- `POST /products` → `uploadWebsiteImage` → `$push` to products array
- `PUT /products/:productId` → `$set: { 'products.$': ... }` using positional operator
- `DELETE /products/:productId` → `$pull: { products: { _id: productId } }`
- `PATCH /products/:productId/toggle` → toggle `isLive`
- `POST /clients` → `uploadWebsiteImage` (optional logo) → `$push` to clients
- `PUT /clients/:clientId` → update embedded client
- `DELETE /clients/:clientId` → `$pull`
- `POST /about-us/directors` → `$push` to `aboutUs.directors`
- `PUT /about-us/directors/:directorId` → update embedded director
- `DELETE /about-us/directors/:directorId` → `$pull`
- `POST /news` → `uploadWebsiteImage` (optional featured image) → `$push` to news
- `PUT /news/:articleId` → update embedded news article
- `DELETE /news/:articleId` → `$pull`
- `PATCH /news/:articleId/publish` → toggle `isPublished`
- `POST /tools` → `uploadWebsiteImage` (optional logo) → `$push` to tools
- `PUT /tools/:toolId` → update embedded tool
- `DELETE /tools/:toolId` → `$pull`

---

## STEP 6 — `.env.example` (create at project root)

```env
NODE_ENV=development
PORT=5000
MONGO_URI=mongodb://localhost:27017/crm
JWT_SECRET=replace_with_strong_secret_min_32_chars
REFRESH_TOKEN_SECRET=replace_with_strong_refresh_secret_min_32_chars
ACCESS_TOKEN_EXPIRY=1d
REFRESH_TOKEN_EXPIRY=7d
FRONTEND_URL=http://localhost:3000
LOG_LEVEL=info
SEED_ADMIN_EMAIL=admin@crm.local
SEED_ADMIN_PASSWORD=Admin@123
```

---

## KEY ARCHITECTURAL RULES — follow these exactly

1. **Always call `next(err)` in catch blocks** — the global `errorHandler` middleware handles all error responses
2. **Tasks are their own collection** — never embed tasks inside milestones in MongoDB
3. **WebsiteContent is singleton** — never create more than one document; always use `findOne()`
4. **BugId is project-scoped** — BUG-001 restarts for each project (count bugs by projectId in pre-save)
5. **Invoice status auto-updates** in the pre-save hook — never set it manually
6. **Quotation virtuals require `.exec()`** — `.lean()` strips virtuals; use `.exec()` when you need `subtotal`, `gstAmount`, `totalAmount`
7. **Store relative file paths in DB** — use `getRelativePath(req.file.path)` before saving; use `getImageUrl(relativePath)` only in responses
8. **PDF for proofs** — `paymentProof` and `expenseProof` fields allow `application/pdf`; profile pictures do not
9. **`pages` field is frontend metadata only** — API enforces roles via `authorize()` middleware; `pages` is just returned in the user object for the frontend to render nav
10. **Cascade deletes** — deleting a project must delete its milestones, tasks, and bugs; deleting a milestone must delete its tasks
11. **`createdBy` field** — always set from `req.user._id` in the controller, never from the request body

---

## DEMO CREDENTIALS (after seed runs)

| Email | Password | Role |
|-------|----------|------|
| `admin@crm.local` | `Admin@123` | `admin` |
| `priya@crm.local` | `Demo@123` | `designer` |
| `rahul@crm.local` | `Demo@123` | `developer` |
| `sales@crm.local` | `Demo@123` | `sales` |

---

Build each module completely (model → zod schema → controller → route) before moving to the next. Start with: Users → Dashboard → Enquiries → Projects → Payments → Expenses → Quotations → Chat → Website Content.
