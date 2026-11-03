import { Request, Response, NextFunction } from 'express';
import { sendSuccess, sendNotFound, sendError } from '@/utils';
import ChatMessage from '@/models/chat-message';
import Enquiry from '@/models/enquiry';
import { getRelativePath, getImageUrl } from '@/middlewares/upload';

export const getMessages = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { page = 1, limit = 50 } = req.query;
    const enquiryId = req.params.enquiryId;

    const enquiry = await Enquiry.findOne({ _id: enquiryId, tenantId: req.tenantId });
    if (!enquiry) return sendNotFound(res, 'Enquiry not found');

    const [items, total] = await Promise.all([
      ChatMessage.find({ enquiryId, tenantId: req.tenantId })
        .sort({ timestamp: -1 })
        .skip((+page - 1) * +limit)
        .limit(+limit)
        .populate('senderId', 'name email'),
      ChatMessage.countDocuments({ enquiryId, tenantId: req.tenantId }),
    ]);

    sendSuccess(res, { items: items.reverse(), total, page: +page, limit: +limit, totalPages: Math.ceil(total / +limit) });
  } catch (err) {
    next(err);
  }
};

export const sendMessage = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const user = req.user as any;
    const enquiry = await Enquiry.findOne({ _id: req.params.enquiryId, tenantId: req.tenantId });
    if (!enquiry) return sendNotFound(res, 'Enquiry not found or access denied');

    const message = await ChatMessage.create({
      enquiryId:   req.params.enquiryId,
      senderId:    user._id,
      senderName:  user.name || user.email,
      content:     req.body.content,
      messageType: 'text',
      tenantId:    req.tenantId,
    });
    sendSuccess(res, message, 'Message sent', 201);
  } catch (err) {
    next(err);
  }
};

export const sendVoiceMessage = async (req: Request, res: Response, next: NextFunction) => {
  try {
    if (!req.file) return sendError(res, 'Voice note file is required', 400);
    const user = req.user as any;
    const enquiry = await Enquiry.findOne({ _id: req.params.enquiryId, tenantId: req.tenantId });
    if (!enquiry) return sendNotFound(res, 'Enquiry not found or access denied');

    const message = await ChatMessage.create({
      enquiryId:     req.params.enquiryId,
      senderId:      user._id,
      senderName:    user.name || user.email,
      content:       '[Voice Note]',
      messageType:   'voice',
      voiceDuration: req.body.duration ? +req.body.duration : undefined,
      voiceUrl:      getImageUrl(getRelativePath(req.file.path)),
      tenantId:      req.tenantId,
    });
    sendSuccess(res, message, 'Voice note sent', 201);
  } catch (err) {
    next(err);
  }
};
