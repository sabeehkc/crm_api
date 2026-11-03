import { Router } from 'express';
import multer from 'multer';
import cors from 'cors';
import {
  listForms, createForm, getForm, updateForm,
  updateFormStatus, regenerateKey, deleteForm,
  listSubmissions, getSubmission, updateSubmissionStatus, deleteSubmission, exportSubmissions,
  getPublicFormBySlug
} from '@/controllers/v1/form';
import { publicSubmit } from '@/controllers/v1/form/submit';
import { authenticate } from '@/middlewares/authenticate';
import { authorize } from '@/middlewares/authorize';
import { validateRequest } from '@/middlewares/validationError';
import {
  createFormSchema, updateFormSchema, updateFormStatusSchema,
  updateSubmissionStatusSchema, publicSubmitSchema,
} from '@/zod/form';
import tenantContext from '@/middlewares/tenantContext';

import path from 'path';
import crypto from 'crypto';

const router = Router();

// Configure Multer for File Uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, path.join(process.cwd(), 'uploads'));
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    const uniqueSuffix = crypto.randomBytes(8).toString('hex') + '-' + Date.now();
    cb(null, `${file.fieldname}-${uniqueSuffix}${ext}`);
  },
});
const upload = multer({ 
  storage, 
  limits: { fileSize: 5 * 1024 * 1024 } // 5MB limit
});

// Public submit endpoint — open CORS so external sites can POST
router.post(
  '/submit',
  cors({ origin: '*', methods: ['POST', 'OPTIONS'] }),
  upload.any(), // Parse multipart/form-data and accept files
  validateRequest(publicSubmitSchema),
  publicSubmit,
);

// Public form get endpoint
router.get(
  '/public/:slug',
  cors({ origin: '*', methods: ['GET', 'OPTIONS'] }),
  getPublicFormBySlug
);

// ─── Authenticated form management ───────────────────────────────────────────
router.get('/',     authenticate, tenantContext, authorize('admin', 'sales', 'viewer'), listForms);
router.post('/',    authenticate, tenantContext, authorize('admin', 'sales'), validateRequest(createFormSchema), createForm);
router.get('/:id',  authenticate, tenantContext, authorize('admin', 'sales', 'viewer'), getForm);
router.put('/:id',  authenticate, tenantContext, authorize('admin', 'sales'), validateRequest(updateFormSchema), updateForm);
router.patch('/:id/status',        authenticate, tenantContext, authorize('admin', 'sales'), validateRequest(updateFormStatusSchema), updateFormStatus);
router.post('/:id/regenerate-key', authenticate, tenantContext, authorize('admin', 'sales'), regenerateKey);
router.delete('/:id',              authenticate, tenantContext, authorize('admin'), deleteForm);

// ─── Submissions ──────────────────────────────────────────────────────────────
router.get('/:id/submissions',                    authenticate, tenantContext, authorize('admin', 'sales', 'viewer'), listSubmissions);
router.get('/:id/submissions/export',             authenticate, tenantContext, authorize('admin', 'sales', 'viewer'), exportSubmissions);
router.get('/:id/submissions/:subId',             authenticate, tenantContext, authorize('admin', 'sales', 'viewer'), getSubmission);
router.patch('/:id/submissions/:subId/status',    authenticate, tenantContext, authorize('admin', 'sales'), validateRequest(updateSubmissionStatusSchema), updateSubmissionStatus);
router.delete('/:id/submissions/:subId',          authenticate, tenantContext, authorize('admin'), deleteSubmission);

export default router;
