import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { Request } from 'express';

const uploadsDir       = path.join(process.cwd(), 'uploads');
const profilesDir      = path.join(uploadsDir, 'profiles');
const paymentProofsDir = path.join(uploadsDir, 'payment-proofs');
const expenseProofsDir = path.join(uploadsDir, 'expense-proofs');
const websiteDir       = path.join(uploadsDir, 'website');
const voiceNotesDir    = path.join(uploadsDir, 'voice-notes');

[uploadsDir, profilesDir, paymentProofsDir, expenseProofsDir, websiteDir, voiceNotesDir].forEach(
  (dir) => { if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true }); }
);

const storage = multer.diskStorage({
  destination: (req: Request, file: Express.Multer.File, cb) => {
    let uploadPath = uploadsDir;
    if (file.fieldname === 'profilePicture') {
      uploadPath = profilesDir;
    } else if (file.fieldname === 'paymentProof') {
      uploadPath = paymentProofsDir;
    } else if (file.fieldname === 'expenseProof') {
      uploadPath = expenseProofsDir;
    } else if (file.fieldname === 'websiteImage' || file.fieldname === 'websiteVideo' || file.fieldname === 'thumbnail') {
      uploadPath = websiteDir;
    } else if (file.fieldname === 'voiceNote') {
      uploadPath = voiceNotesDir;
    }

    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const finalPath = path.join(uploadPath, String(year), month);
    if (!fs.existsSync(finalPath)) fs.mkdirSync(finalPath, { recursive: true });
    cb(null, finalPath);
  },
  filename: (req: Request, file: Express.Multer.File, cb) => {
    const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
    const ext = path.extname(file.originalname);
    const baseName = path.basename(file.originalname, ext).replace(/[^a-zA-Z0-9]/g, '-');
    cb(null, `${baseName}-${uniqueSuffix}${ext}`);
  },
});

const imageOnly  = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif'];
const imageOrPdf = [...imageOnly, 'application/pdf'];
const videoTypes = ['video/mp4', 'video/webm'];
const audioTypes = ['audio/mpeg', 'audio/ogg', 'audio/webm'];

const fileFilter = (req: Request, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
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

const proofUpload = multer({ storage, fileFilter, limits: { fileSize: 10 * 1024 * 1024 } });
const imageUpload = multer({ storage, fileFilter, limits: { fileSize: 5  * 1024 * 1024 } });
const mediaUpload = multer({ storage, fileFilter, limits: { fileSize: 50 * 1024 * 1024 } });
const audioUpload = multer({ storage, fileFilter, limits: { fileSize: 5  * 1024 * 1024 } });

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
export const uploadThumbnail             = imageUpload.single('thumbnail');
export const uploadSingleImage           = imageUpload.single('image');
export const uploadMultipleImages        = imageUpload.array('images', 5);

export const getRelativePath = (filePath: string): string => {
  const base = path.join(process.cwd(), 'uploads');
  return path.relative(base, filePath).replace(/\\/g, '/');
};

export const getImageUrl = (relativePath: string): string => `/uploads/${relativePath}`;

export default imageUpload;
