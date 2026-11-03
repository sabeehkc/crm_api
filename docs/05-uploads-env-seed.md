# 05 — Uploads, Environment Variables & Seed

Three reference sections:
- **Part A** — File upload directory layout and MIME rules
- **Part B** — Complete `.env.example`
- **Part C** — Seed script specification (already in `01-template-migration.md` Step 8)

---

## Part A — File Upload Specifications

### Directory Layout

```
uploads/
  profiles/           ← profile pictures
    2025/
      01/             ← year/month auto-created by upload middleware
  payment-proofs/     ← payment receipts (images + PDFs)
    2025/01/
  expense-proofs/     ← expense receipts (images + PDFs)
    2025/01/
  website/            ← all website content media (images + videos)
    2025/01/
  voice-notes/        ← chat audio messages
    2025/01/
```

Year/month sub-directories are created automatically by the Multer `destination` function (this logic already exists in the template and is preserved).

### MIME Rules per Field Name

| `fieldname` | Directory | Allowed MIME types | Max size |
|-------------|-----------|-------------------|---------|
| `profilePicture` | `profiles/` | `image/jpeg`, `image/jpg`, `image/png`, `image/webp` | 5 MB |
| `paymentProof` | `payment-proofs/` | `image/jpeg`, `image/jpg`, `image/png`, `image/webp`, `application/pdf` | 10 MB |
| `expenseProof` | `expense-proofs/` | `image/jpeg`, `image/jpg`, `image/png`, `image/webp`, `application/pdf` | 10 MB |
| `websiteImage` | `website/` | `image/jpeg`, `image/jpg`, `image/png`, `image/webp`, `image/gif` | 50 MB |
| `websiteVideo` | `website/` | `video/mp4`, `video/webm` | 50 MB |
| `voiceNote` | `voice-notes/` | `audio/mpeg`, `audio/ogg`, `audio/webm` | 5 MB |
| `image` (general) | `uploads/` root | `image/jpeg`, `image/jpg`, `image/png`, `image/webp`, `image/gif` | 5 MB |
| `images` (general) | `uploads/` root | same as `image` | 5 MB |

### File URL Format

Uploaded files are served by the existing static middleware in `app.ts` at `/uploads/<path>`.

Use the existing `getRelativePath` and `getImageUrl` helpers when storing and returning file paths:

```ts
// In controller, after file upload:
const relativePath = getRelativePath(req.file.path);
const fileUrl      = getImageUrl(relativePath);

// Store in DB:
await Model.create({ proofDocument: relativePath }); // store relative path, not full URL

// Return in response:
sendSuccess(res, { url: fileUrl, filename: req.file.filename, mimetype: req.file.mimetype, size: req.file.size });
```

Always store the **relative path** in the database. Construct the full URL at response time with `getImageUrl()`. This keeps the DB portable if the domain changes.

### PDF Generation for Quotations

Quotation PDF (`GET /quotations/:id/pdf`) requires `pdfkit`:

```bash
npm install pdfkit
npm install --save-dev @types/pdfkit
```

**Controller skeleton:**

```ts
import PDFDocument from 'pdfkit';
import { Response } from 'express';
import Quotation from '@/models/quotation';

export const downloadQuotationPdf = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const quotation = await Quotation.findById(req.params.id).exec();
    if (!quotation) return sendNotFound(res, 'Quotation not found');

    const doc = new PDFDocument({ margin: 50 });

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${quotation.referenceNumber}.pdf"`);

    doc.pipe(res);

    // Header
    doc.fontSize(20).text(quotation.companyDetails.name || 'Company Name', { align: 'left' });
    doc.fontSize(10).text(quotation.companyDetails.address || '');
    doc.moveDown();

    // Reference
    doc.fontSize(14).text(`Quotation: ${quotation.referenceNumber}`, { align: 'right' });
    doc.fontSize(10).text(`Date: ${quotation.quoteMeta.date}`, { align: 'right' });
    doc.text(`Valid for: ${quotation.quoteMeta.validFor}`, { align: 'right' });
    doc.moveDown();

    // Client
    doc.fontSize(12).text('To:');
    doc.fontSize(10).text(quotation.clientDetails.name);
    doc.text(quotation.clientDetails.company);
    doc.text(quotation.clientDetails.email);
    doc.moveDown();

    // Line items table (basic)
    doc.fontSize(12).text('Items:');
    quotation.lineItems.forEach((item) => {
      const amount = item.qty * item.rate;
      doc.fontSize(10).text(`${item.desc}  ×${item.qty}  @₹${item.rate}  = ₹${amount}`);
    });
    doc.moveDown();

    // Totals
    doc.text(`Subtotal: ₹${quotation.subtotal}`);
    doc.text(`GST (${quotation.gstPercent}%): ₹${quotation.gstAmount}`);
    doc.fontSize(12).text(`Total: ₹${quotation.totalAmount}`);
    doc.moveDown();

    // Terms
    if (quotation.terms) {
      doc.fontSize(10).text('Terms & Conditions:');
      doc.text(quotation.terms);
    }

    doc.end();
  } catch (err) {
    next(err);
  }
};
```

---

## Part B — `.env.example`

Create this file at the project root (`crm-api/.env.example`). Copy to `.env` and fill in real values before running.

```env
# ══════════════════════════════════════════════
# CRM API — Environment Variables
# Copy to .env and fill in your values
# ══════════════════════════════════════════════

# ── Server ─────────────────────────────────────
NODE_ENV=development
PORT=5000

# ── Database ───────────────────────────────────
MONGO_URI=mongodb://localhost:27017/crm

# ── JWT ────────────────────────────────────────
# Use a long random string — minimum 32 characters
JWT_SECRET=replace_with_strong_jwt_secret_min_32_chars
REFRESH_TOKEN_SECRET=replace_with_strong_refresh_secret_min_32_chars
ACCESS_TOKEN_EXPIRY=1d
REFRESH_TOKEN_EXPIRY=7d

# ── CORS / Frontend ────────────────────────────
FRONTEND_URL=http://localhost:3000

# ── Logging ────────────────────────────────────
# Options: error | warn | info | debug
LOG_LEVEL=info

# ── Seed Admin Credentials ─────────────────────
# Used by src/lib/seed.ts — change password before deploying
SEED_ADMIN_EMAIL=admin@crm.local
SEED_ADMIN_PASSWORD=Admin@123

# ── Upload Limits (optional overrides) ─────────
# Values are in bytes. Defaults are set in upload middleware.
# MAX_IMAGE_SIZE=5242880        # 5 MB
# MAX_DOCUMENT_SIZE=10485760    # 10 MB  (payment/expense proofs)
# MAX_MEDIA_SIZE=52428800       # 50 MB  (website images/video)
# MAX_AUDIO_SIZE=5242880        # 5 MB   (voice notes)
```

**Production additions** (add to `.env` on server, never commit):
```env
NODE_ENV=production
MONGO_URI=mongodb+srv://user:pass@cluster.mongodb.net/crm
FRONTEND_URL=https://crm.yourdomain.com
LOG_LEVEL=warn
```

---

## Part C — Seed Script Summary

The full seed implementation is in `01-template-migration.md` Step 8. Key points:

**Idempotency** — every seeder checks for existing data before inserting. Re-running `npm run seed` is always safe.

**Order of execution:**
1. `seedAdmin()` — creates admin user from `SEED_ADMIN_EMAIL` + `SEED_ADMIN_PASSWORD`
2. `seedWebsiteContent()` — creates the singleton WebsiteContent document
3. `seedDemoUsers()` — only in `NODE_ENV=development`
4. `seedDemoEnquiries()` — only in `NODE_ENV=development`

**Running the seed:**
```bash
npm run seed          # runs ts-node src/lib/seed.ts directly
# OR it runs automatically on every server start via src/server.ts
```

**Seed script in `package.json`** (verify this exists):
```json
"seed": "ts-node -r tsconfig-paths/register src/lib/seed.ts"
```

**Demo credentials (development only):**

| Email | Password | Role |
|-------|----------|------|
| `admin@crm.local` | `Admin@123` | `admin` |
| `priya@crm.local` | `Demo@123` | `designer` |
| `rahul@crm.local` | `Demo@123` | `developer` |
| `sales@crm.local` | `Demo@123` | `sales` |

---

## Part D — Production Checklist

Before deploying to production:

- [ ] `NODE_ENV=production` in `.env`
- [ ] Strong random values for `JWT_SECRET` and `REFRESH_TOKEN_SECRET` (use `openssl rand -base64 64`)
- [ ] `MONGO_URI` points to production MongoDB (Atlas or self-hosted with auth)
- [ ] `FRONTEND_URL` set to the real domain (no trailing slash)
- [ ] `SEED_ADMIN_PASSWORD` changed from default
- [ ] `.env` is in `.gitignore` — never commit secrets
- [ ] `uploads/` directory exists on server and is writable by the Node process
- [ ] Rate limit (`60 req/min`) reviewed — increase if needed for load
- [ ] HTTPS configured (Nginx reverse proxy recommended)
- [ ] PM2 configured: `npm run start:prod`

---

## Part E — Swagger Documentation

The template already has Swagger configured at `/api-docs`. When adding new routes, add JSDoc `@swagger` annotations above each route definition, following the existing pattern in `src/routes/v1/auth.ts`.

**Minimum annotation per endpoint:**
```ts
/**
 * @swagger
 * /api/v1/enquiries:
 *   get:
 *     summary: List all enquiries
 *     tags: [Enquiries]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *         description: Filter by status
 *     responses:
 *       200:
 *         description: List of enquiries
 */
router.get('/', authenticate, authorize('admin', 'sales'), listEnquiries);
```

Run the Swagger validation script after adding annotations:
```bash
node scripts/check-swagger.js
```
