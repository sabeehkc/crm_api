# 03 — API Endpoints Reference

**Base URL:** `/api/v1`

**Auth header:** `Authorization: Bearer <accessToken>`

**Standard response shapes** (use existing utils from `src/utils/response.ts`):

```ts
// Success
{ success: true, message: string, data: T }

// Error
{ success: false, code: string, message: string, errors?: Array<{ field: string, message: string }> }
```

**Pagination** (for list endpoints): query params `page` (default `1`), `limit` (default `20`), `search`, `status`.  
Paginated `data` shape:
```ts
{ items: T[], total: number, page: number, limit: number, totalPages: number }
```

**Route file locations:** `src/routes/v1/<module>.ts`  
**Controller locations:** `src/controllers/v1/<module>/index.ts`

---

## Auth

Existing routes — no changes needed except documentation.

| Method | Path | Auth | Roles | Body |
|--------|------|------|-------|------|
| `POST` | `/auth/register` | None | — | `{ name, email, password, phone? }` |
| `POST` | `/auth/login` | None | — | `{ email, password }` |
| `POST` | `/auth/logout` | JWT | All | — |
| `POST` | `/auth/refresh-token` | None | — | `{ refreshToken }` |

**Login response `data`:**
```ts
{
  user: IUser,
  accessToken: string,
  refreshToken: string
}
```

---

## Users

Route file: `src/routes/v1/user.ts`  
Controller: `src/controllers/v1/user/index.ts`

| Method | Path | Auth | Roles | Description |
|--------|------|------|-------|-------------|
| `GET` | `/users` | JWT | `admin` | List all users |
| `POST` | `/users` | JWT | `admin` | Create user |
| `GET` | `/users/me` | JWT | All | Get own profile |
| `PUT` | `/users/me` | JWT | All | Update own profile |
| `PUT` | `/users/:id` | JWT | `admin` | Update any user |
| `PATCH` | `/users/:id/status` | JWT | `admin` | Toggle isActive |
| `DELETE` | `/users/:id` | JWT | `admin` | Soft delete (set isActive: false) |

**`POST /users` body:**
```ts
{ name: string, email: string, password: string, role: UserRole, pages?: string[], projects?: string[] }
```

**`PUT /users/:id` body** (all optional):
```ts
{ name?, phone?, role?, pages?, projects?, profile?: { firstName?, lastName? } }
```

**`PATCH /users/:id/status` body:**
```ts
{ isActive: boolean }
```

**`GET /users` response `data`:**
```ts
{ items: IUser[], total: number, page: number, limit: number, totalPages: number }
```

**`GET /users/me` and `GET /users/:id` response `data`:** `IUser` (password and refreshTokens stripped by `toJSON`)

---

## Dashboard

Route file: `src/routes/v1/dashboard.ts`  
Controller: `src/controllers/v1/dashboard/index.ts`

| Method | Path | Auth | Roles | Description |
|--------|------|------|-------|-------------|
| `GET` | `/dashboard/metrics` | JWT | `admin`, `sales` | KPI summary |
| `GET` | `/dashboard/recent-enquiries` | JWT | `admin`, `sales` | Latest 5 enquiries |

**`GET /dashboard/metrics` response `data`:**
```ts
{
  totalEnquiries:      number,  // Enquiry.countDocuments()
  convertedSales:      number,  // Enquiry.countDocuments({ status: 'Converted' })
  pendingFollowups:    number,  // Enquiry.countDocuments({ status: { $in: ['New', 'Followup'] } })
  outstandingPayments: number   // Invoice aggregate: sum of (totalAmount - receivedAmount)
}
```

**Outstanding payments aggregate:**
```ts
const result = await Invoice.aggregate([
  { $match: { status: { $ne: 'Paid' } } },
  { $group: { _id: null, total: { $sum: { $subtract: ['$totalAmount', '$receivedAmount'] } } } },
]);
const outstandingPayments = result[0]?.total ?? 0;
```

**`GET /dashboard/recent-enquiries` response `data`:** `IEnquiry[]` (5 most recent, sorted by `createdAt: -1`)

---

## Enquiries

Route file: `src/routes/v1/enquiry.ts`  
Controller: `src/controllers/v1/enquiry/index.ts`

| Method | Path | Auth | Roles | Description |
|--------|------|------|-------|-------------|
| `GET` | `/enquiries` | JWT | `admin`, `sales` | List all (paginated) |
| `POST` | `/enquiries` | JWT | `admin`, `sales` | Create enquiry |
| `GET` | `/enquiries/:id` | JWT | `admin`, `sales` | Get by ID |
| `PUT` | `/enquiries/:id` | JWT | `admin`, `sales` | Full update |
| `PATCH` | `/enquiries/:id/status` | JWT | `admin`, `sales` | Update status only |
| `DELETE` | `/enquiries/:id` | JWT | `admin` | Delete |

**`GET /enquiries` query params:** `page`, `limit`, `search` (matches name/email/phone/service), `status`

**`POST /enquiries` body:**
```ts
{ name: string, email: string, phone: string, service: string, date?: string, status?: EnquiryStatus, notes?: string }
```
Set `createdBy` from `req.user._id` in the controller.

**`PUT /enquiries/:id` body:** All fields optional (same as POST).

**`PATCH /enquiries/:id/status` body:**
```ts
{ status: EnquiryStatus }
```

---

## Projects

Route file: `src/routes/v1/project.ts`  
Controller: `src/controllers/v1/project/index.ts`

| Method | Path | Auth | Roles | Description |
|--------|------|------|-------|-------------|
| `GET` | `/projects` | JWT | `admin`, `developer`, `qa`, `designer`, `sales` | List (paginated) |
| `POST` | `/projects` | JWT | `admin` | Create project |
| `GET` | `/projects/:id` | JWT | All + project access | Full detail |
| `PUT` | `/projects/:id` | JWT | `admin` | Full update |
| `PATCH` | `/projects/:id/progress` | JWT | `admin`, `developer` | Update progress % |
| `DELETE` | `/projects/:id` | JWT | `admin` | Delete project |

**`GET /projects` query params:** `page`, `limit`, `search` (name/client), `status`

For non-admin users, apply `projectAccess` middleware on `GET /projects/:id` — see `04-rbac-and-validation.md`.

**`POST /projects` body:**
```ts
{
  name: string,
  tags?: string[],
  client: string,
  team?: string[],  // User ObjectIds
  budget: number,
  startDate: string,
  dueDate: string,
  description?: string
}
```
Set `createdBy` from `req.user._id`. Initial `status` defaults to `'Just Started'`, `progress` to `0`.

**`PATCH /projects/:id/progress` body:**
```ts
{ progress: number }  // 0–100
```

---

## Milestones

Nested under `/projects/:id/milestones`.  
Controller: `src/controllers/v1/milestone/index.ts`

| Method | Path | Auth | Roles | Description |
|--------|------|------|-------|-------------|
| `GET` | `/projects/:id/milestones` | JWT | Project members | List milestones (with tasks) |
| `POST` | `/projects/:id/milestones` | JWT | `admin`, `developer` | Create milestone |
| `PUT` | `/projects/:id/milestones/:milestoneId` | JWT | `admin`, `developer` | Update milestone |
| `DELETE` | `/projects/:id/milestones/:milestoneId` | JWT | `admin` | Delete milestone + tasks |

**`GET /projects/:id/milestones` response `data`:**
```ts
Array<IMilestone & { tasks: ITask[] }>
```
Fetch milestones for the project, then populate tasks:
```ts
const milestones = await Milestone.find({ projectId: req.params.id }).lean();
const tasks = await Task.find({ projectId: req.params.id }).lean();
// Group tasks by milestoneId
```

**`POST /projects/:id/milestones` body:**
```ts
{ title: string, dueDate: string, status?: MilestoneStatus }
```
Set `projectId` from `req.params.id`.

**`DELETE /projects/:id/milestones/:milestoneId`:** Also delete all tasks with that `milestoneId`:
```ts
await Task.deleteMany({ milestoneId });
await Milestone.findByIdAndDelete(milestoneId);
```

---

## Tasks

Nested under `/projects/:id/milestones/:milestoneId/tasks`.  
Controller: `src/controllers/v1/task/index.ts`

| Method | Path | Auth | Roles | Description |
|--------|------|------|-------|-------------|
| `POST` | `/projects/:id/milestones/:milestoneId/tasks` | JWT | Project members | Create task |
| `PUT` | `/projects/:id/milestones/:milestoneId/tasks/:taskId` | JWT | Project members | Update task |
| `DELETE` | `/projects/:id/milestones/:milestoneId/tasks/:taskId` | JWT | `admin`, `developer` | Delete task |

**`POST` body:**
```ts
{ title: string, dueDate: string, assigneeId: string, status?: TaskStatus }
```
Set `milestoneId` and `projectId` from URL params.

**`PUT` body:** All fields optional.

---

## Bugs

Nested under `/projects/:id/bugs`.  
Controller: `src/controllers/v1/bug/index.ts`

| Method | Path | Auth | Roles | Description |
|--------|------|------|-------|-------------|
| `GET` | `/projects/:id/bugs` | JWT | Project members | List bugs (filterable) |
| `POST` | `/projects/:id/bugs` | JWT | Project members | Report bug |
| `PUT` | `/projects/:id/bugs/:bugId` | JWT | Project members | Update bug |
| `DELETE` | `/projects/:id/bugs/:bugId` | JWT | `admin` | Delete bug |

**`GET /projects/:id/bugs` query params:** `status`, `severity`, `page`, `limit`

**`POST` body:**
```ts
{ title: string, reporter: string, severity: BugSeverity, stepsToReproduce?: string, resolution?: string }
```
`bugId` is auto-generated in the pre-save hook.

**`PUT` body:**
```ts
{ status?: BugStatus, resolution?: string, resolvedAt?: string, resolutionTime?: string }
```

---

## Payments

Route file: `src/routes/v1/payment.ts`  
Controller: `src/controllers/v1/payment/index.ts`

| Method | Path | Auth | Roles | Description |
|--------|------|------|-------|-------------|
| `GET` | `/payments` | JWT | `admin`, `sales` | List payments (paginated) |
| `GET` | `/payments/overview` | JWT | `admin`, `sales` | Per-project payment summary |
| `POST` | `/payments` | JWT | `admin`, `sales` | Record payment (multipart) |
| `PUT` | `/payments/:id` | JWT | `admin`, `sales` | Update payment |
| `DELETE` | `/payments/:id` | JWT | `admin` | Delete payment |

**`GET /payments` query params:** `page`, `limit`, `projectId`, `startDate`, `endDate`

**`GET /payments/overview` response `data`:**
```ts
Array<{
  projectId: ObjectId,
  projectName: string,
  client: string,
  totalPaid: number,
  lastPaymentDate: Date,
  invoiceCount: number,
  outstandingAmount: number
}>
```
Use a MongoDB aggregation joining Payments and Invoices.

**`POST /payments`** — `multipart/form-data` via `uploadPaymentProof` middleware:
```
Fields: projectId, client, amount, date, mode, notes (optional)
File:   paymentProof (optional) — image or PDF, max 10 MB
```
If a file is uploaded, store `getRelativePath(req.file.path)` in `proofDocument`.  
Set `createdBy` from `req.user._id`.

**`PUT /payments/:id`** — same shape as POST body (all optional). If a new file is provided, update `proofDocument`.

---

## Invoices

Nested under `/payments/invoices`.  
Controller: `src/controllers/v1/invoice/index.ts`

| Method | Path | Auth | Roles | Description |
|--------|------|------|-------|-------------|
| `GET` | `/payments/invoices` | JWT | `admin`, `sales` | List all invoices |
| `POST` | `/payments/invoices` | JWT | `admin`, `sales` | Create invoice for a project |
| `GET` | `/payments/invoices/:id` | JWT | `admin`, `sales` | Invoice detail |
| `PATCH` | `/payments/invoices/:id/received` | JWT | `admin`, `sales` | Update received amount |

**`POST /payments/invoices` body:**
```ts
{ projectId: string, client: string, totalAmount: number, dueDate?: string }
```
`invoiceNumber` and `status` are auto-managed.

**`PATCH /payments/invoices/:id/received` body:**
```ts
{ receivedAmount: number }
```
On save, the pre-save hook on Invoice auto-updates `status`.

---

## Expenses

Route file: `src/routes/v1/expense.ts`  
Controller: `src/controllers/v1/expense/index.ts`

| Method | Path | Auth | Roles | Description |
|--------|------|------|-------|-------------|
| `GET` | `/expenses` | JWT | `admin` | List expenses (paginated) |
| `GET` | `/expenses/summary` | JWT | `admin` | Total + breakdown by category |
| `POST` | `/expenses` | JWT | `admin` | Add expense (multipart) |
| `PUT` | `/expenses/:id` | JWT | `admin` | Update expense |
| `DELETE` | `/expenses/:id` | JWT | `admin` | Delete expense |

**`GET /expenses` query params:** `page`, `limit`, `category`, `startDate`, `endDate`, `search`

**`GET /expenses/summary` response `data`:**
```ts
{
  total: number,
  byCategory: Array<{ category: string, amount: number, percentage: number }>
}
```
Aggregate:
```ts
const results = await Expense.aggregate([
  { $group: { _id: '$category', amount: { $sum: '$amount' } } },
  { $sort: { amount: -1 } },
]);
```

**`POST /expenses`** — `multipart/form-data` via `uploadExpenseProof` middleware:
```
Fields: description, category, amount, date, mode, notes (optional)
File:   expenseProof (optional) — image or PDF, max 10 MB
```

---

## Quotations

Route file: `src/routes/v1/quotation.ts`  
Controller: `src/controllers/v1/quotation/index.ts`

| Method | Path | Auth | Roles | Description |
|--------|------|------|-------|-------------|
| `GET` | `/quotations` | JWT | `admin`, `sales` | List quotations |
| `POST` | `/quotations` | JWT | `admin`, `sales` | Create quotation |
| `GET` | `/quotations/:id` | JWT | `admin`, `sales` | Detail (with virtuals) |
| `PUT` | `/quotations/:id` | JWT | `admin`, `sales` | Update |
| `DELETE` | `/quotations/:id` | JWT | `admin` | Delete |
| `GET` | `/quotations/:id/pdf` | JWT | `admin`, `sales` | Download as PDF |

**`GET /quotations` query params:** `page`, `limit`, `enquiryId`

**`POST /quotations` body:** Full `IQuotation` shape (see model in `02-mongodb-models.md`).

**`GET /quotations/:id` — important:** Use `.exec()` (not `.lean()`) to get virtual fields:
```ts
const quotation = await Quotation.findById(req.params.id).exec();
```

**`GET /quotations/:id/pdf`:**
- Install: `npm install pdfkit @types/pdfkit`
- Set headers: `Content-Type: application/pdf`, `Content-Disposition: attachment; filename="QT-XXXX.pdf"`
- Pipe `pdfDoc` stream directly to `res`
- Generate a PDF with: reference number, client details, company details, line items table, subtotal, GST, total, terms, timeline

---

## Chat

Route file: `src/routes/v1/chat.ts`  
Controller: `src/controllers/v1/chat/index.ts`

| Method | Path | Auth | Roles | Description |
|--------|------|------|-------|-------------|
| `GET` | `/chat/:enquiryId/messages` | JWT | `admin`, `sales` | Paginated message history |
| `POST` | `/chat/:enquiryId/messages` | JWT | `admin`, `sales` | Send text message |
| `POST` | `/chat/:enquiryId/messages/voice` | JWT | `admin`, `sales` | Send voice note (multipart) |

**`GET /chat/:enquiryId/messages` query params:** `page` (default `1`), `limit` (default `50`)  
Sort by `timestamp: -1` (newest first for pagination), but frontend should display oldest first.

**`POST /chat/:enquiryId/messages` body:**
```ts
{ content: string }
```
Set `senderId` from `req.user._id`, `senderName` from `req.user.name`, `messageType: 'text'`.

**`POST /chat/:enquiryId/messages/voice`** — `multipart/form-data` via `uploadVoiceNote` middleware:
```
Fields: duration (seconds, number)
File:   voiceNote — audio/mpeg | audio/ogg | audio/webm, max 5 MB
```
Set `voiceUrl` to `getImageUrl(getRelativePath(req.file.path))`, `content` to `'[Voice Note]'`, `messageType: 'voice'`.

---

## Website Content

Route file: `src/routes/v1/website-content.ts`  
Controller: `src/controllers/v1/website-content/index.ts`

All write endpoints use `authorize('admin', 'designer')`. Read endpoint is open to all authenticated users.

### Top Level

| Method | Path | Auth | Roles | Description |
|--------|------|------|-------|-------------|
| `GET` | `/website-content` | JWT | All | Full singleton document |
| `PUT` | `/website-content/hero` | JWT | `admin`, `designer` | Replace hero slides array |
| `PUT` | `/website-content/about-us` | JWT | `admin`, `designer` | Update about us fields |

**`PUT /website-content/hero` body:**
```ts
{ slides: Array<{ title, order, type: 'image'|'video', mediaUrl }> }
```

**`PUT /website-content/about-us` body** (all optional):
```ts
{
  mission?, vision?,
  social?: { linkedin?, twitter?, instagram?, facebook?, youtube? },
  registration?: { companyName?, cin?, gst?, pan? }
}
```

### Products

| Method | Path | Auth | Roles | Description |
|--------|------|------|-------|-------------|
| `POST` | `/website-content/products` | JWT | `admin`, `designer` | Add product (multipart) |
| `PUT` | `/website-content/products/:productId` | JWT | `admin`, `designer` | Update product |
| `DELETE` | `/website-content/products/:productId` | JWT | `admin`, `designer` | Remove product |
| `PATCH` | `/website-content/products/:productId/toggle` | JWT | `admin`, `designer` | Toggle `isLive` |

**`POST /website-content/products`** — `multipart/form-data`:
```
Fields: title, description, mediaType ('image'|'video'), isLive (boolean string), displayOrder (number)
File:   websiteImage or websiteVideo
```
Push to `products` array using `$push` operator.

### Clients

| Method | Path | Auth | Roles | Description |
|--------|------|------|-------|-------------|
| `POST` | `/website-content/clients` | JWT | `admin`, `designer` | Add client (multipart) |
| `PUT` | `/website-content/clients/:clientId` | JWT | `admin`, `designer` | Update client |
| `DELETE` | `/website-content/clients/:clientId` | JWT | `admin`, `designer` | Remove client |

**`POST /website-content/clients`** — `multipart/form-data`:
```
Fields: name, contactPerson, testimony, isShown
File:   websiteImage (optional — logo)
```

### About Us — Directors

| Method | Path | Auth | Roles | Description |
|--------|------|------|-------|-------------|
| `POST` | `/website-content/about-us/directors` | JWT | `admin`, `designer` | Add director |
| `PUT` | `/website-content/about-us/directors/:directorId` | JWT | `admin`, `designer` | Update director |
| `DELETE` | `/website-content/about-us/directors/:directorId` | JWT | `admin` | Remove director |

### News

| Method | Path | Auth | Roles | Description |
|--------|------|------|-------|-------------|
| `POST` | `/website-content/news` | JWT | `admin`, `designer` | Add article (multipart) |
| `PUT` | `/website-content/news/:articleId` | JWT | `admin`, `designer` | Update article |
| `DELETE` | `/website-content/news/:articleId` | JWT | `admin` | Remove article |
| `PATCH` | `/website-content/news/:articleId/publish` | JWT | `admin` | Toggle `isPublished` |

**`POST /website-content/news`** — `multipart/form-data`:
```
Fields: type, date, title, subtitle, content, isDraft (boolean string)
File:   websiteImage (optional — featured image)
```

### Tools

| Method | Path | Auth | Roles | Description |
|--------|------|------|-------|-------------|
| `POST` | `/website-content/tools` | JWT | `admin`, `designer` | Add tool (multipart) |
| `PUT` | `/website-content/tools/:toolId` | JWT | `admin`, `designer` | Update tool |
| `DELETE` | `/website-content/tools/:toolId` | JWT | `admin` | Remove tool |

**`POST /website-content/tools`** — `multipart/form-data`:
```
Fields: name, description, link
File:   websiteImage (optional — logo)
```

### Updating Embedded Arrays

For all website-content sub-document mutations, use MongoDB positional operators on the singleton document.

**Add to array:** `WebsiteContent.findOneAndUpdate({}, { $push: { products: newProduct } }, { new: true })`

**Update embedded doc:** `WebsiteContent.findOneAndUpdate({ 'products._id': productId }, { $set: { 'products.$': updatedFields } }, { new: true })`

**Remove from array:** `WebsiteContent.findOneAndUpdate({}, { $pull: { products: { _id: productId } } }, { new: true })`

---

## Uploads (Existing — Updated)

Route file: `src/routes/v1/upload.ts`  
Controller: `src/controllers/v1/upload/index.ts`

| Method | Path | Auth | Roles | Description |
|--------|------|------|-------|-------------|
| `POST` | `/uploads/image` | JWT | All | Upload single image |
| `POST` | `/uploads/multiple` | JWT | All | Upload up to 5 images |

**Response `data`** for single upload:
```ts
{ url: string, filename: string, mimetype: string, size: number }
```

**Response `data`** for multiple uploads:
```ts
Array<{ url: string, filename: string, mimetype: string, size: number }>
```

---

## Controller Pattern

All controllers should follow this structure (consistent with existing `auth` and `user` controllers):

```ts
import { Request, Response, NextFunction } from 'express';
import { sendSuccess, sendError, sendNotFound } from '@/utils';
import SomeModel from '@/models/some-model';

export const listItems = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { page = 1, limit = 20, search, status } = req.query;
    const query: any = {};
    if (status) query.status = status;
    if (search) query.$or = [
      { name: { $regex: search, $options: 'i' } },
    ];

    const [items, total] = await Promise.all([
      SomeModel.find(query)
        .skip((+page - 1) * +limit)
        .limit(+limit)
        .sort({ createdAt: -1 }),
      SomeModel.countDocuments(query),
    ]);

    sendSuccess(res, {
      items,
      total,
      page: +page,
      limit: +limit,
      totalPages: Math.ceil(total / +limit),
    });
  } catch (err) {
    next(err);
  }
};
```

Always wrap in `try/catch` and call `next(err)` — the global `errorHandler` middleware handles the rest.
