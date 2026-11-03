# 02 — MongoDB Models

Create one file per model in `src/models/`. All models use `timestamps: true` (adds `createdAt` / `updatedAt` automatically). Import paths use the `@/` alias configured in `tsconfig.json`.

---

## Model List

| # | File | Collection | Notes |
|---|------|-----------|-------|
| 1 | `user.ts` | `users` | Update existing — see `01-template-migration.md` Step 5 |
| 2 | `enquiry.ts` | `enquiries` | Core CRM lead/enquiry |
| 3 | `project.ts` | `projects` | Client project |
| 4 | `milestone.ts` | `milestones` | Milestone within a project |
| 5 | `task.ts` | `tasks` | Task within a milestone |
| 6 | `bug.ts` | `bugs` | Bug report on a project |
| 7 | `payment.ts` | `payments` | Payment received |
| 8 | `invoice.ts` | `invoices` | Invoice / bill for a project |
| 9 | `expense.ts` | `expenses` | Company expense |
| 10 | `quotation.ts` | `quotations` | Sales quotation linked to enquiry |
| 11 | `chat-message.ts` | `chat_messages` | Chat messages per enquiry |
| 12 | `website-content.ts` | `website_contents` | Singleton — one document |

---

## 2. `src/models/enquiry.ts`

```ts
import { Schema, model, Model, Types } from 'mongoose';

export type EnquiryStatus =
  | 'New'
  | 'Followup'
  | 'Quotation Sent'
  | 'Converted'
  | 'Rejected'
  | 'Revised Quotation';

export interface IEnquiry {
  name: string;
  email: string;
  phone: string;
  service: string;
  date: Date;
  status: EnquiryStatus;
  notes?: string;
  createdBy: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

export interface IEnquiryModel extends Model<IEnquiry> {
  findByStatus(status: EnquiryStatus): Promise<IEnquiry[]>;
}

const enquirySchema = new Schema<IEnquiry>(
  {
    name:      { type: String, required: true, trim: true },
    email:     { type: String, required: true, lowercase: true, trim: true },
    phone:     { type: String, required: true, trim: true },
    service:   { type: String, required: true, trim: true },
    date:      { type: Date,   required: true, default: Date.now },
    status: {
      type: String,
      enum: ['New', 'Followup', 'Quotation Sent', 'Converted', 'Rejected', 'Revised Quotation'],
      default: 'New',
    },
    notes:     { type: String, trim: true },
    createdBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  },
  { timestamps: true },
);

enquirySchema.index({ status: 1 });
enquirySchema.index({ date: -1 });
enquirySchema.index({ email: 1 });

enquirySchema.statics.findByStatus = function (status: EnquiryStatus) {
  return this.find({ status });
};

export default model<IEnquiry, IEnquiryModel>('Enquiry', enquirySchema);
```

---

## 3. `src/models/project.ts`

```ts
import { Schema, model, Model, Types } from 'mongoose';

export type ProjectStatus =
  | 'Just Started'
  | 'In Progress'
  | 'Nearly Done'
  | 'Completed'
  | 'On Hold';

export interface IProject {
  name: string;
  tags: string[];
  client: string;
  team: Types.ObjectId[];
  budget: number;
  progress: number;       // 0–100
  startDate: Date;
  dueDate: Date;
  status: ProjectStatus;
  description?: string;
  createdBy: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const projectSchema = new Schema<IProject>(
  {
    name:      { type: String, required: true, trim: true },
    tags:      { type: [String], default: [] },
    client:    { type: String, required: true, trim: true },
    team:      { type: [{ type: Schema.Types.ObjectId, ref: 'User' }], default: [] },
    budget:    { type: Number, required: true, min: 0 },
    progress:  { type: Number, default: 0, min: 0, max: 100 },
    startDate: { type: Date, required: true },
    dueDate:   { type: Date, required: true },
    status: {
      type: String,
      enum: ['Just Started', 'In Progress', 'Nearly Done', 'Completed', 'On Hold'],
      default: 'Just Started',
    },
    description: { type: String, trim: true },
    createdBy:   { type: Schema.Types.ObjectId, ref: 'User', required: true },
  },
  { timestamps: true },
);

projectSchema.index({ status: 1 });
projectSchema.index({ client: 1 });
projectSchema.index({ dueDate: 1 });

export default model<IProject>('Project', projectSchema);
```

---

## 4. `src/models/milestone.ts`

```ts
import { Schema, model, Types } from 'mongoose';

export type MilestoneStatus = 'pending' | 'in_progress' | 'done';

export interface IMilestone {
  projectId: Types.ObjectId;
  title: string;
  dueDate: Date;
  status: MilestoneStatus;
  createdAt: Date;
  updatedAt: Date;
}

const milestoneSchema = new Schema<IMilestone>(
  {
    projectId: { type: Schema.Types.ObjectId, ref: 'Project', required: true },
    title:     { type: String, required: true, trim: true },
    dueDate:   { type: Date, required: true },
    status: {
      type: String,
      enum: ['pending', 'in_progress', 'done'],
      default: 'pending',
    },
  },
  { timestamps: true },
);

milestoneSchema.index({ projectId: 1, dueDate: 1 });

export default model<IMilestone>('Milestone', milestoneSchema);
```

---

## 5. `src/models/task.ts`

```ts
import { Schema, model, Types } from 'mongoose';

export type TaskStatus = 'Pending' | 'In Progress' | 'Done';

export interface ITask {
  milestoneId: Types.ObjectId;
  projectId: Types.ObjectId;
  title: string;
  dueDate: Date;
  assigneeId: Types.ObjectId;
  status: TaskStatus;
  createdAt: Date;
  updatedAt: Date;
}

const taskSchema = new Schema<ITask>(
  {
    milestoneId: { type: Schema.Types.ObjectId, ref: 'Milestone', required: true },
    projectId:   { type: Schema.Types.ObjectId, ref: 'Project',   required: true },
    title:       { type: String, required: true, trim: true },
    dueDate:     { type: Date, required: true },
    assigneeId:  { type: Schema.Types.ObjectId, ref: 'User', required: true },
    status: {
      type: String,
      enum: ['Pending', 'In Progress', 'Done'],
      default: 'Pending',
    },
  },
  { timestamps: true },
);

taskSchema.index({ milestoneId: 1 });
taskSchema.index({ projectId: 1 });
taskSchema.index({ assigneeId: 1 });

export default model<ITask>('Task', taskSchema);
```

---

## 6. `src/models/bug.ts`

```ts
import { Schema, model, Types } from 'mongoose';

export type BugSeverity = 'Critical' | 'High' | 'Low';
export type BugStatus   = 'Open' | 'In Progress' | 'Resolved';

export interface IBug {
  projectId: Types.ObjectId;
  bugId: string;          // e.g. BUG-001 (project-scoped)
  title: string;
  reporter: string;
  severity: BugSeverity;
  status: BugStatus;
  stepsToReproduce?: string;
  resolution?: string;
  reportedAt: Date;
  resolvedAt?: Date;
  resolutionTime?: string; // human-readable e.g. "2h 30m"
  createdAt: Date;
  updatedAt: Date;
}

const bugSchema = new Schema<IBug>(
  {
    projectId:        { type: Schema.Types.ObjectId, ref: 'Project', required: true },
    bugId:            { type: String },               // set in pre-save
    title:            { type: String, required: true, trim: true },
    reporter:         { type: String, required: true, trim: true },
    severity: {
      type: String,
      enum: ['Critical', 'High', 'Low'],
      required: true,
    },
    status: {
      type: String,
      enum: ['Open', 'In Progress', 'Resolved'],
      default: 'Open',
    },
    stepsToReproduce: { type: String },
    resolution:       { type: String },
    reportedAt:       { type: Date, default: Date.now },
    resolvedAt:       { type: Date },
    resolutionTime:   { type: String },
  },
  { timestamps: true },
);

// Auto-generate project-scoped bugId: BUG-001, BUG-002, ...
bugSchema.pre('save', async function (next) {
  if (!this.isNew) return next();
  try {
    const Bug = this.constructor as any;
    const count = await Bug.countDocuments({ projectId: this.projectId });
    this.bugId = `BUG-${String(count + 1).padStart(3, '0')}`;
    next();
  } catch (err: any) {
    next(err);
  }
});

bugSchema.index({ projectId: 1, status: 1 });
bugSchema.index({ severity: 1 });

export default model<IBug>('Bug', bugSchema);
```

---

## 7. `src/models/payment.ts`

```ts
import { Schema, model, Types } from 'mongoose';

export type PaymentMode = 'bank' | 'upi' | 'cheque' | 'neft' | 'credit_card' | 'auto_debit' | 'cash';

export interface IPayment {
  projectId: Types.ObjectId;
  client: string;
  amount: number;
  date: Date;
  mode: PaymentMode;
  proofDocument?: string;  // relative path under /uploads
  notes?: string;
  createdBy: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const paymentSchema = new Schema<IPayment>(
  {
    projectId:     { type: Schema.Types.ObjectId, ref: 'Project', required: true },
    client:        { type: String, required: true, trim: true },
    amount:        { type: Number, required: true, min: 0 },
    date:          { type: Date, required: true },
    mode: {
      type: String,
      enum: ['bank', 'upi', 'cheque', 'neft', 'credit_card', 'auto_debit', 'cash'],
      required: true,
    },
    proofDocument: { type: String },
    notes:         { type: String, trim: true },
    createdBy:     { type: Schema.Types.ObjectId, ref: 'User', required: true },
  },
  { timestamps: true },
);

paymentSchema.index({ projectId: 1, date: -1 });

export default model<IPayment>('Payment', paymentSchema);
```

---

## 8. `src/models/invoice.ts`

```ts
import { Schema, model, Types } from 'mongoose';

export type InvoiceStatus = 'Pending' | 'Partial' | 'Paid';

export interface IInvoice {
  invoiceNumber: string;    // auto: INV-2025-001
  projectId: Types.ObjectId;
  client: string;
  totalAmount: number;
  receivedAmount: number;
  outstandingAmount: number; // virtual: totalAmount - receivedAmount
  status: InvoiceStatus;
  issuedDate: Date;
  dueDate?: Date;
  createdBy: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const invoiceSchema = new Schema<IInvoice>(
  {
    invoiceNumber:  { type: String },                     // set in pre-save
    projectId:      { type: Schema.Types.ObjectId, ref: 'Project', required: true },
    client:         { type: String, required: true, trim: true },
    totalAmount:    { type: Number, required: true, min: 0 },
    receivedAmount: { type: Number, default: 0, min: 0 },
    status: {
      type: String,
      enum: ['Pending', 'Partial', 'Paid'],
      default: 'Pending',
    },
    issuedDate: { type: Date, default: Date.now },
    dueDate:    { type: Date },
    createdBy:  { type: Schema.Types.ObjectId, ref: 'User', required: true },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  },
);

// Virtual: outstandingAmount
invoiceSchema.virtual('outstandingAmount').get(function () {
  return Math.max(0, this.totalAmount - this.receivedAmount);
});

// Auto-generate invoiceNumber: INV-YYYY-NNN
invoiceSchema.pre('save', async function (next) {
  if (!this.isNew) return next();
  try {
    const Invoice = this.constructor as any;
    const year  = new Date().getFullYear();
    const start = new Date(`${year}-01-01`);
    const count = await Invoice.countDocuments({ issuedDate: { $gte: start } });
    this.invoiceNumber = `INV-${year}-${String(count + 1).padStart(3, '0')}`;
    next();
  } catch (err: any) {
    next(err);
  }
});

// Auto-update status based on received amount
invoiceSchema.pre('save', function (next) {
  if (this.receivedAmount >= this.totalAmount) {
    this.status = 'Paid';
  } else if (this.receivedAmount > 0) {
    this.status = 'Partial';
  } else {
    this.status = 'Pending';
  }
  next();
});

invoiceSchema.index({ projectId: 1 });
invoiceSchema.index({ status: 1 });

export default model<IInvoice>('Invoice', invoiceSchema);
```

---

## 9. `src/models/expense.ts`

```ts
import { Schema, model, Types } from 'mongoose';

export type ExpenseCategory =
  | 'Infrastructure'
  | 'Tools'
  | 'Operations'
  | 'HR & Culture'
  | 'Marketing'
  | 'Payroll'
  | 'Other';

export type ExpenseMode =
  | 'Bank Transfer'
  | 'UPI'
  | 'Credit Card'
  | 'Cash'
  | 'Auto Debit';

export interface IExpense {
  description: string;
  category: ExpenseCategory;
  amount: number;
  date: Date;
  mode: ExpenseMode;
  proofDocument?: string;  // relative path under /uploads
  proofVerified: boolean;
  notes?: string;
  createdBy: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const expenseSchema = new Schema<IExpense>(
  {
    description:   { type: String, required: true, trim: true, maxlength: 200 },
    category: {
      type: String,
      enum: ['Infrastructure', 'Tools', 'Operations', 'HR & Culture', 'Marketing', 'Payroll', 'Other'],
      required: true,
    },
    amount:        { type: Number, required: true, min: 0 },
    date:          { type: Date, required: true },
    mode: {
      type: String,
      enum: ['Bank Transfer', 'UPI', 'Credit Card', 'Cash', 'Auto Debit'],
      required: true,
    },
    proofDocument: { type: String },
    proofVerified: { type: Boolean, default: false },
    notes:         { type: String, trim: true },
    createdBy:     { type: Schema.Types.ObjectId, ref: 'User', required: true },
  },
  { timestamps: true },
);

expenseSchema.index({ category: 1, date: -1 });

export default model<IExpense>('Expense', expenseSchema);
```

---

## 10. `src/models/quotation.ts`

```ts
import { Schema, model, Types } from 'mongoose';

export interface ILineItem {
  desc: string;
  qty: number;
  rate: number;
}

export interface ITimelineItem {
  title: string;
  date: string;
  amount: number;
}

export interface IQuotation {
  enquiryId?: Types.ObjectId;
  referenceNumber: string;    // auto: QT-0001
  lineItems: ILineItem[];
  welcomeTitle: string;
  terms: string;
  timelineItems: ITimelineItem[];
  companyDetails: { name: string; address: string; phone: string; email: string };
  clientDetails:  { name: string; company: string; email: string };
  quoteMeta:      { date: string; validFor: string; ref: string };
  gstPercent: number;
  subtotal: number;           // virtual
  gstAmount: number;          // virtual
  totalAmount: number;        // virtual
  createdBy: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const lineItemSchema = new Schema<ILineItem>(
  {
    desc: { type: String, required: true },
    qty:  { type: Number, required: true, min: 1 },
    rate: { type: Number, required: true, min: 0 },
  },
  {
    _id: false,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  },
);

lineItemSchema.virtual('amount').get(function () {
  return this.qty * this.rate;
});

const quotationSchema = new Schema<IQuotation>(
  {
    enquiryId: { type: Schema.Types.ObjectId, ref: 'Enquiry' },
    referenceNumber: { type: String },    // set in pre-save
    lineItems:     { type: [lineItemSchema], default: [] },
    welcomeTitle:  { type: String, trim: true },
    terms:         { type: String, trim: true },
    timelineItems: {
      type: [
        {
          title:  { type: String },
          date:   { type: String },
          amount: { type: Number, min: 0 },
          _id: false,
        },
      ],
      default: [],
    },
    companyDetails: {
      name:    { type: String },
      address: { type: String },
      phone:   { type: String },
      email:   { type: String },
      _id:     false,
    },
    clientDetails: {
      name:    { type: String },
      company: { type: String },
      email:   { type: String },
      _id:     false,
    },
    quoteMeta: {
      date:     { type: String },
      validFor: { type: String },
      ref:      { type: String },
      _id:      false,
    },
    gstPercent: { type: Number, default: 18, min: 0, max: 100 },
    createdBy:  { type: Schema.Types.ObjectId, ref: 'User', required: true },
  },
  {
    timestamps: true,
    toJSON:   { virtuals: true },
    toObject: { virtuals: true },
  },
);

// Virtual: subtotal (sum of qty × rate)
quotationSchema.virtual('subtotal').get(function () {
  return this.lineItems.reduce((sum, item) => sum + item.qty * item.rate, 0);
});

// Virtual: gstAmount
quotationSchema.virtual('gstAmount').get(function () {
  const sub = this.lineItems.reduce((sum, item) => sum + item.qty * item.rate, 0);
  return +(sub * (this.gstPercent / 100)).toFixed(2);
});

// Virtual: totalAmount
quotationSchema.virtual('totalAmount').get(function () {
  const sub = this.lineItems.reduce((sum, item) => sum + item.qty * item.rate, 0);
  const gst = sub * (this.gstPercent / 100);
  return +(sub + gst).toFixed(2);
});

// Auto-generate referenceNumber: QT-0001
quotationSchema.pre('save', async function (next) {
  if (!this.isNew) return next();
  try {
    const Quotation = this.constructor as any;
    const count = await Quotation.countDocuments();
    this.referenceNumber = `QT-${String(count + 1).padStart(4, '0')}`;
    next();
  } catch (err: any) {
    next(err);
  }
});

quotationSchema.index({ enquiryId: 1 });

export default model<IQuotation>('Quotation', quotationSchema);
```

---

## 11. `src/models/chat-message.ts`

```ts
import { Schema, model, Types } from 'mongoose';

export type MessageType = 'text' | 'voice';

export interface IChatMessage {
  enquiryId: Types.ObjectId;
  senderId: Types.ObjectId;
  senderName: string;
  content: string;
  messageType: MessageType;
  voiceDuration?: number;   // seconds
  voiceUrl?: string;        // relative path for voice notes
  timestamp: Date;
  createdAt: Date;
  updatedAt: Date;
}

const chatMessageSchema = new Schema<IChatMessage>(
  {
    enquiryId:     { type: Schema.Types.ObjectId, ref: 'Enquiry', required: true },
    senderId:      { type: Schema.Types.ObjectId, ref: 'User', required: true },
    senderName:    { type: String, required: true },
    content:       { type: String, required: true },
    messageType: {
      type: String,
      enum: ['text', 'voice'],
      default: 'text',
    },
    voiceDuration: { type: Number },
    voiceUrl:      { type: String },
    timestamp:     { type: Date, default: Date.now },
  },
  { timestamps: true },
);

chatMessageSchema.index({ enquiryId: 1, timestamp: 1 });

export default model<IChatMessage>('ChatMessage', chatMessageSchema);
```

---

## 12. `src/models/website-content.ts`

This is a **singleton** — only one document should ever exist. All website sections are sub-documents.

```ts
import { Schema, model, Model, Types } from 'mongoose';

export type NewsType = 'Press Release' | 'Blog' | 'Case Study' | 'Announcement';

export interface IWebsiteContent {
  hero: {
    slides: Array<{
      title: string;
      order: number;
      type: 'image' | 'video';
      mediaUrl: string;
    }>;
  };
  products: Array<{
    _id?: Types.ObjectId;
    title: string;
    description: string;
    mediaType: 'image' | 'video';
    mediaUrl: string;
    isLive: boolean;
    displayOrder: number;
  }>;
  clients: Array<{
    _id?: Types.ObjectId;
    name: string;
    contactPerson?: string;
    testimony?: string;
    logoUrl?: string;
    isShown: boolean;
  }>;
  aboutUs: {
    mission: string;
    vision: string;
    directors: Array<{
      _id?: Types.ObjectId;
      name: string;
      title?: string;
      email?: string;
      photoUrl?: string;
    }>;
    social: {
      linkedin?: string;
      twitter?: string;
      instagram?: string;
      facebook?: string;
      youtube?: string;
    };
    registration: {
      companyName: string;
      cin: string;
      gst: string;
      pan: string;
    };
  };
  news: Array<{
    _id?: Types.ObjectId;
    type: NewsType;
    date: Date;
    title: string;
    subtitle?: string;
    content: string;
    featuredImageUrl?: string;
    views: number;
    likes: number;
    isPublished: boolean;
    isDraft: boolean;
  }>;
  tools: Array<{
    _id?: Types.ObjectId;
    name: string;
    description?: string;
    link: string;
    logoUrl?: string;
  }>;
  updatedBy?: Types.ObjectId;
  updatedAt: Date;
  createdAt: Date;
}

export interface IWebsiteContentModel extends Model<IWebsiteContent> {
  getInstance(): Promise<IWebsiteContent>;
}

const websiteContentSchema = new Schema<IWebsiteContent>(
  {
    hero: {
      slides: {
        type: [
          {
            title:    { type: String },
            order:    { type: Number, default: 0 },
            type:     { type: String, enum: ['image', 'video'], default: 'image' },
            mediaUrl: { type: String },
          },
        ],
        default: [],
      },
    },
    products: {
      type: [
        {
          title:        { type: String, required: true },
          description:  { type: String },
          mediaType:    { type: String, enum: ['image', 'video'], default: 'image' },
          mediaUrl:     { type: String },
          isLive:       { type: Boolean, default: true },
          displayOrder: { type: Number, default: 0 },
        },
      ],
      default: [],
    },
    clients: {
      type: [
        {
          name:          { type: String, required: true },
          contactPerson: { type: String },
          testimony:     { type: String },
          logoUrl:       { type: String },
          isShown:       { type: Boolean, default: true },
        },
      ],
      default: [],
    },
    aboutUs: {
      mission:   { type: String, default: '' },
      vision:    { type: String, default: '' },
      directors: {
        type: [
          {
            name:     { type: String, required: true },
            title:    { type: String },
            email:    { type: String },
            photoUrl: { type: String },
          },
        ],
        default: [],
      },
      social: {
        linkedin:  { type: String },
        twitter:   { type: String },
        instagram: { type: String },
        facebook:  { type: String },
        youtube:   { type: String },
      },
      registration: {
        companyName: { type: String, default: '' },
        cin:         { type: String, default: '' },
        gst:         { type: String, default: '' },
        pan:         { type: String, default: '' },
      },
    },
    news: {
      type: [
        {
          type:             { type: String, enum: ['Press Release', 'Blog', 'Case Study', 'Announcement'] },
          date:             { type: Date },
          title:            { type: String, required: true },
          subtitle:         { type: String },
          content:          { type: String, required: true },
          featuredImageUrl: { type: String },
          views:            { type: Number, default: 0 },
          likes:            { type: Number, default: 0 },
          isPublished:      { type: Boolean, default: false },
          isDraft:          { type: Boolean, default: true },
        },
      ],
      default: [],
    },
    tools: {
      type: [
        {
          name:        { type: String, required: true },
          description: { type: String },
          link:        { type: String, required: true },
          logoUrl:     { type: String },
        },
      ],
      default: [],
    },
    updatedBy: { type: Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true },
);

// Singleton getter — finds the one document or creates it
websiteContentSchema.statics.getInstance = async function () {
  let doc = await this.findOne();
  if (!doc) {
    doc = await this.create({
      hero:     { slides: [] },
      products: [],
      clients:  [],
      aboutUs: {
        mission: '',
        vision:  '',
        directors: [],
        social: {},
        registration: { companyName: '', cin: '', gst: '', pan: '' },
      },
      news:  [],
      tools: [],
    });
  }
  return doc;
};

export default model<IWebsiteContent, IWebsiteContentModel>('WebsiteContent', websiteContentSchema);
```

---

## Notes

- **Tasks are in their own collection** (not embedded in Milestone) so you can query "all tasks assigned to user X" or "all incomplete tasks across project Y" without loading every milestone.
- **BugId is project-scoped.** The pre-save hook counts bugs within the same `projectId`, so each project has its own BUG-001, BUG-002 sequence.
- **Invoice status auto-updates** in a pre-save hook based on `receivedAmount` vs `totalAmount` — no manual status management needed.
- **Quotation totals are virtuals.** They are not stored in the DB; they recalculate every time the document is serialised. Enable `toJSON: { virtuals: true }` in queries where you need them: `Quotation.findById(id).lean()` will NOT include virtuals — use `.exec()` instead.
- **WebsiteContent singleton** — always access via `WebsiteContent.getInstance()` or `WebsiteContent.findOne()`. Never `.create()` more than once.
