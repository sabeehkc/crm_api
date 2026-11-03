import { Request, Response, NextFunction } from 'express';
import { sendSuccess, sendNotFound, sendError } from '@/utils';
import FormEndpoint, { generateAccessKey } from '@/models/form-endpoint';
import FormSubmission from '@/models/form-submission';
import slugify from 'slugify';
import crypto from 'crypto';

// ─── Helpers ─────────────────────────────────────────────────────────────────

function computeSuccessRate(total: number, spam: number): number {
  if (total === 0) return 100;
  return Math.round(((total - spam) / total) * 1000) / 10;
}

function toFormResponse(doc: any) {
  const obj = doc.toObject ? doc.toObject() : doc;
  return {
    ...obj,
    id: obj._id,
    accessEmail: Array.isArray(obj.notificationEmails) ? obj.notificationEmails[0] : '',
    apiKey: obj.accessKey,
    successRate: computeSuccessRate(obj.totalSubmissions, obj.spamBlocked),
    createdDate: obj.createdAt,
    lastSubmission: obj.lastSubmission ?? obj.updatedAt,
  };
}

// ─── Form Endpoint CRUD ───────────────────────────────────────────────────────

export const listForms = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { page = 1, limit = 20, search, status, isShareForm } = req.query;
    const query: any = { createdBy: (req.user as any)._id };
    if (status) query.status = status;
    if (isShareForm !== undefined) query.isShareForm = isShareForm === 'true';
    if (search) {
      query.$or = [
        { name:   { $regex: search, $options: 'i' } },
        { domain: { $regex: search, $options: 'i' } },
      ];
    }
    const [items, total] = await Promise.all([
      FormEndpoint.find(query)
        .sort({ createdAt: -1 })
        .skip((+page - 1) * +limit)
        .limit(+limit),
      FormEndpoint.countDocuments(query),
    ]);
    sendSuccess(res, {
      items: items.map(toFormResponse),
      total,
      page: +page,
      limit: +limit,
      totalPages: Math.ceil(total / +limit),
    });
  } catch (err) {
    next(err);
  }
};

export const createForm = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { name, domain, notificationEmails, fields, slug, description, isShareForm } = req.body;
    
    // Generate unique slug if not provided
    let finalSlug = slug;
    if (!finalSlug) {
      const baseSlug = slugify(name, { lower: true, strict: true }) || 'form';
      const randomSuffix = crypto.randomBytes(3).toString('hex');
      finalSlug = `${baseSlug}-${randomSuffix}`;
    }

    const form = await FormEndpoint.create({
      name,
      description,
      domain,
      notificationEmails,
      slug: finalSlug,
      fields: fields || [],
      isShareForm: isShareForm || false,
      accessKey: generateAccessKey(),
      createdBy: (req.user as any)._id,
      tenantId: (req as any).tenantId,
    });
    sendSuccess(res, toFormResponse(form), 'Form created', 201);
  } catch (err) {
    next(err);
  }
};

export const getForm = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const form = await FormEndpoint.findOne({
      _id: req.params.id,
      createdBy: (req.user as any)._id,
    });
    if (!form) return sendNotFound(res, 'Form not found');
    sendSuccess(res, toFormResponse(form));
  } catch (err) {
    next(err);
  }
};

export const updateForm = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const form = await FormEndpoint.findOneAndUpdate(
      { _id: req.params.id, createdBy: (req.user as any)._id },
      req.body,
      { new: true, runValidators: true },
    );
    if (!form) return sendNotFound(res, 'Form not found');
    sendSuccess(res, toFormResponse(form), 'Form updated');
  } catch (err) {
    next(err);
  }
};

export const updateFormStatus = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const form = await FormEndpoint.findOneAndUpdate(
      { _id: req.params.id, createdBy: (req.user as any)._id },
      { status: req.body.status },
      { new: true },
    );
    if (!form) return sendNotFound(res, 'Form not found');
    sendSuccess(res, toFormResponse(form), 'Status updated');
  } catch (err) {
    next(err);
  }
};

export const regenerateKey = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const form = await FormEndpoint.findOneAndUpdate(
      { _id: req.params.id, createdBy: (req.user as any)._id },
      { accessKey: generateAccessKey() },
      { new: true },
    );
    if (!form) return sendNotFound(res, 'Form not found');
    sendSuccess(res, toFormResponse(form), 'Access key regenerated');
  } catch (err) {
    next(err);
  }
};

export const getPublicFormBySlug = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { slug } = req.params;
    const form = await FormEndpoint.findOne({ slug, status: 'Active' });
    if (!form) return sendNotFound(res, 'Form not found or inactive');
    
    // Only return safe public data needed to render the form
    sendSuccess(res, {
      name: form.name,
      description: form.description,
      slug: form.slug,
      fields: form.fields,
      recaptchaEnabled: form.recaptchaEnabled,
      successMessage: form.successMessage,
      redirectUrl: form.redirectUrl,
      accessKey: form.accessKey // Provided for public frontend to submit via the API
    });
  } catch (err) {
    next(err);
  }
};

export const deleteForm = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const form = await FormEndpoint.findOneAndDelete({
      _id: req.params.id,
      createdBy: (req.user as any)._id,
    });
    if (!form) return sendNotFound(res, 'Form not found');
    // Clean up submissions
    await FormSubmission.deleteMany({ formId: req.params.id });
    sendSuccess(res, null, 'Form deleted');
  } catch (err) {
    next(err);
  }
};

function toSubmissionResponse(doc: any) {
  const obj = doc.toObject ? doc.toObject() : doc;
  return {
    ...obj,
    id: obj._id,
    submittedAt: obj.createdAt,
  };
}

// ─── Form Endpoint CRUD ───────────────────────────────────────────────────────
// ... existing code ...

// ─── Submissions ──────────────────────────────────────────────────────────────

export const listSubmissions = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const form = await FormEndpoint.findOne({
      _id: req.params.id,
      createdBy: (req.user as any)._id,
    });
    if (!form) return sendNotFound(res, 'Form not found');

    const { page = 1, limit = 20, search, status } = req.query;
    const query: any = { formId: form._id };
    if (status) query.status = status;
    if (search) {
      query.$or = [
        { name:    { $regex: search, $options: 'i' } },
        { email:   { $regex: search, $options: 'i' } },
        { message: { $regex: search, $options: 'i' } },
      ];
    }
    const [items, total] = await Promise.all([
      FormSubmission.find(query)
        .sort({ createdAt: -1 })
        .skip((+page - 1) * +limit)
        .limit(+limit),
      FormSubmission.countDocuments(query),
    ]);
    sendSuccess(res, {
      items: items.map(toSubmissionResponse),
      total,
      page: +page,
      limit: +limit,
      totalPages: Math.ceil(total / +limit),
    });
  } catch (err) {
    next(err);
  }
};

export const getSubmission = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const form = await FormEndpoint.findOne({
      _id: req.params.id,
      createdBy: (req.user as any)._id,
    });
    if (!form) return sendNotFound(res, 'Form not found');
    const submission = await FormSubmission.findOne({ _id: req.params.subId, formId: form._id });
    if (!submission) return sendNotFound(res, 'Submission not found');
    sendSuccess(res, toSubmissionResponse(submission));
  } catch (err) {
    next(err);
  }
};

export const updateSubmissionStatus = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const form = await FormEndpoint.findOne({
      _id: req.params.id,
      createdBy: (req.user as any)._id,
    });
    if (!form) return sendNotFound(res, 'Form not found');

    const submission = await FormSubmission.findOne({ _id: req.params.subId, formId: form._id });
    if (!submission) return sendNotFound(res, 'Submission not found');

    const oldStatus = submission.status;
    const newStatus = req.body.status;
    submission.status = newStatus;
    await submission.save();

    // Keep spamBlocked count in sync
    if (oldStatus !== 'Spam' && newStatus === 'Spam') {
      await FormEndpoint.findByIdAndUpdate(form._id, { $inc: { spamBlocked: 1 } });
    } else if (oldStatus === 'Spam' && newStatus !== 'Spam') {
      await FormEndpoint.findByIdAndUpdate(form._id, { $inc: { spamBlocked: -1 } });
    }

    sendSuccess(res, submission, 'Status updated');
  } catch (err) {
    next(err);
  }
};

export const deleteSubmission = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const form = await FormEndpoint.findOne({
      _id: req.params.id,
      createdBy: (req.user as any)._id,
    });
    if (!form) return sendNotFound(res, 'Form not found');

    const submission = await FormSubmission.findOneAndDelete({
      _id: req.params.subId,
      formId: form._id,
    });
    if (!submission) return sendNotFound(res, 'Submission not found');

    // Update cached stats
    const dec: any = { totalSubmissions: -1 };
    if (submission.status === 'Spam') dec.spamBlocked = -1;
    await FormEndpoint.findByIdAndUpdate(form._id, { $inc: dec });

    sendSuccess(res, null, 'Submission deleted');
  } catch (err) {
    next(err);
  }
};

export const exportSubmissions = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const form = await FormEndpoint.findOne({
      _id: req.params.id,
      createdBy: (req.user as any)._id,
    });
    if (!form) return sendNotFound(res, 'Form not found');

    const submissions = await FormSubmission.find({ formId: form._id }).sort({ createdAt: -1 });

    if (submissions.length === 0) {
      return res.status(200).send('No submissions found');
    }

    // Generate CSV — data keys vary per submission, collect all unique keys first
    const allKeys = Array.from(
      new Set(submissions.flatMap(s => Object.keys(s.data as Record<string, unknown>)))
    );
    const headers = ['ID', ...allKeys, 'Status', 'IP Address', 'Submitted At'];
    const rows = submissions.map(s => {
      const d = s.data as Record<string, unknown>;
      return [
        s._id,
        ...allKeys.map(k => String(d[k] ?? '').replace(/"/g, '""')),
        s.status,
        s.ipAddress || '',
        s.createdAt.toISOString(),
      ];
    });

    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${cell}"`).join(',')),
    ].join('\n');

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename=submissions-${form.name.replace(/\s+/g, '-')}.csv`);
    res.status(200).send(csvContent);
  } catch (err) {
    next(err);
  }
};
