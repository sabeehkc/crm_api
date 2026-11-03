import { Request, Response, NextFunction } from 'express';
import https from 'https';
import config from '@/config';
import { sendSuccess, sendError } from '@/utils';
import FormEndpoint from '@/models/form-endpoint';
import FormSubmission from '@/models/form-submission';
import { sendEmailNotification, triggerIntegrations } from '@/utils/notification';

// Simple in-memory rate limit tracker: key = `${accessKey}:${ip}` → { count, resetAt }
const rateLimitStore = new Map<string, { count: number; resetAt: number }>();

function checkRateLimit(key: string, limitPerMinute: number): boolean {
  const now = Date.now();
  const entry = rateLimitStore.get(key);
  if (!entry || now > entry.resetAt) {
    rateLimitStore.set(key, { count: 1, resetAt: now + 60_000 });
    return true;
  }
  if (entry.count >= limitPerMinute) return false;
  entry.count += 1;
  return true;
}

export const publicSubmit = async (req: Request, res: Response, next: NextFunction) => {
  try {
    // Strip system/spam fields — everything else is user data stored dynamically
    const { access_key, botcheck, 'g-recaptcha-response': captchaToken, ...formData } = req.body as any;

    // Attach uploaded file URLs to formData
    if (req.files && Array.isArray(req.files)) {
      req.files.forEach((file) => {
        formData[file.fieldname] = `/uploads/${file.filename}`;
      });
    }

    const form = await FormEndpoint.findOne({ accessKey: access_key });
    if (!form) return sendError(res, 'Invalid access key', 400);
    if (form.status !== 'Active') return sendError(res, 'This form endpoint is inactive', 403);

    // reCAPTCHA verification
    if (form.recaptchaEnabled && config.RECAPTCHA_SECRET) {
      if (!captchaToken) return sendError(res, 'reCAPTCHA token missing', 400);
      
      const isHuman = await new Promise((resolve) => {
        const verifyUrl = `https://www.google.com/recaptcha/api/siteverify?secret=${config.RECAPTCHA_SECRET}&response=${captchaToken}`;
        https.get(verifyUrl, (res) => {
          let body = '';
          res.on('data', (chunk) => body += chunk);
          res.on('end', () => {
            const result = JSON.parse(body);
            resolve(result.success && result.score >= 0.5); // Using 0.5 as threshold for v3
          });
        }).on('error', () => resolve(false));
      });

      if (!isHuman) return sendError(res, 'reCAPTCHA verification failed. Bot detected.', 400);
    }

    // Honeypot check
    if (form.honeypotEnabled && botcheck && botcheck !== 'false') {
      return sendSuccess(res, { success: true }, 'Thank you for your submission');
    }

    // Domain locking
    if (form.domainLocking && form.domain) {
      const origin = req.get('origin') || req.get('referer') || '';
      const allowed = form.domain.replace(/^https?:\/\//, '').split('/')[0];
      if (origin && !origin.includes(allowed)) {
        return sendError(res, 'Domain not allowed', 403);
      }
    }

    // Rate limiting
    const ip = (req.ip || req.socket?.remoteAddress || 'unknown').replace('::ffff:', '');
    const rateLimitKey = `${access_key}:${ip}`;
    if (!checkRateLimit(rateLimitKey, form.rateLimit)) {
      return sendError(res, 'Too many submissions. Please try again later.', 429);
    }

    const submission = await FormSubmission.create({
      formId:    form._id,
      data:      formData,
      ipAddress: ip,
    });

    // Update form stats atomically
    await FormEndpoint.findByIdAndUpdate(form._id, {
      $inc:  { totalSubmissions: 1 },
      $set:  { lastSubmission: new Date() },
    });

    // Send notifications (don't await to avoid delaying response)
    sendEmailNotification(form, submission).catch(console.error);
    triggerIntegrations(form, submission).catch(console.error);

    sendSuccess(res, {
      success:  true,
      message:  form.successMessage,
      redirect: form.redirectUrl || null,
    });
  } catch (err) {
    next(err);
  }
};
