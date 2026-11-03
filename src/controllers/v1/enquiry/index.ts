import { Request, Response, NextFunction } from 'express';
import { sendSuccess, sendNotFound } from '@/utils';
import Enquiry from '@/models/enquiry';
import { EnquiryStatus } from '@/models/enquiry';

export const listEnquiries = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { page = 1, limit = 20, search, status, type } = req.query;
    const query: any = { tenantId: req.tenantId };
    
    if (status) query.status = status;
    if (type) query.type = type;
    if (search) {
      query.$or = [
        { name:    { $regex: search, $options: 'i' } },
        { email:   { $regex: search, $options: 'i' } },
        { phone:   { $regex: search, $options: 'i' } },
        { service: { $regex: search, $options: 'i' } },
      ];
    }
    
    const [items, total] = await Promise.all([
      Enquiry.find(query)
        .sort({ createdAt: -1 })
        .skip((+page - 1) * +limit)
        .limit(+limit)
        .populate('createdBy', 'name email'),
      Enquiry.countDocuments(query),
    ]);
    sendSuccess(res, { items, total, page: +page, limit: +limit, totalPages: Math.ceil(total / +limit) });
  } catch (err) {
    next(err);
  }
};

export const createEnquiry = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const enquiry = await Enquiry.create({ ...req.body, createdBy: (req.user as any)._id, tenantId: req.tenantId });
    sendSuccess(res, enquiry, 'Enquiry created', 201);
  } catch (err) {
    next(err);
  }
};

export const getEnquiry = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const enquiry = await Enquiry.findOne({ _id: req.params.id, tenantId: req.tenantId }).populate('createdBy', 'name email');
    if (!enquiry) return sendNotFound(res, 'Enquiry not found');
    sendSuccess(res, enquiry);
  } catch (err) {
    next(err);
  }
};

export const updateEnquiry = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const enquiry = await Enquiry.findOneAndUpdate(
      { _id: req.params.id, tenantId: req.tenantId },
      req.body,
      { new: true, runValidators: true }
    );
    if (!enquiry) return sendNotFound(res, 'Enquiry not found');
    sendSuccess(res, enquiry, 'Enquiry updated');
  } catch (err) {
    next(err);
  }
};

const buildStatusDateUpdate = (status: EnquiryStatus, body: Record<string, any>) => {
  const now = new Date();
  switch (status) {
    case 'Followup':
      return {
        followupDate: body.followupDate ?? now,
        ...(body.followupTime && { followupTime: body.followupTime }),
      };
    case 'Quotation Sent':
      return { quotationSentDate: body.quotationSentDate ?? now };
    case 'Converted':
      return { convertedDate: body.convertedDate ?? now };
    case 'Rejected':
      return {
        rejectedDate: body.rejectedDate ?? now,
        ...(body.rejectReason && { rejectReason: body.rejectReason }),
      };
    case 'Revised Quotation':
      return { revisedQuotationDate: body.revisedQuotationDate ?? now };
    default:
      return {};
  }
};

export const updateEnquiryStatus = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { status, ...rest } = req.body;
    const dateUpdate = buildStatusDateUpdate(status as EnquiryStatus, rest);

    const enquiry = await Enquiry.findOneAndUpdate(
      { _id: req.params.id, tenantId: req.tenantId },
      { status, ...dateUpdate },
      { new: true, runValidators: true },
    );
    if (!enquiry) return sendNotFound(res, 'Enquiry not found');
    sendSuccess(res, enquiry, 'Status updated');
  } catch (err) {
    next(err);
  }
};

export const deleteEnquiry = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const enquiry = await Enquiry.findOneAndDelete({ _id: req.params.id, tenantId: req.tenantId });
    if (!enquiry) return sendNotFound(res, 'Enquiry not found');
    sendSuccess(res, null, 'Enquiry deleted');
  } catch (err) {
    next(err);
  }
};
