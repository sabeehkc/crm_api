import { Router } from 'express';
import { getMessages, sendMessage, sendVoiceMessage } from '@/controllers/v1/chat';
import { authenticate } from '@/middlewares/authenticate';
import { validateRequest } from '@/middlewares/validationError';
import { uploadVoiceNote } from '@/middlewares/upload';
import { tenantContext } from '@/middlewares/tenantContext';
import { sendMessageSchema } from '@/zod/chat';

const router = Router();

router.use(authenticate);
router.use(tenantContext);

router.get('/:enquiryId/messages',        getMessages);
router.post('/:enquiryId/messages',       validateRequest(sendMessageSchema), sendMessage);
router.post('/:enquiryId/messages/voice', uploadVoiceNote, sendVoiceMessage);

export default router;
