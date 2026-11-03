import { Request, Response, NextFunction } from 'express';
import { sendSuccess } from '@/utils';
import Enquiry from '@/models/enquiry';
import Invoice from '@/models/invoice';
import Project from '@/models/project';

export const getMetrics = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const user = req.user as any;
    const tenantId = req.tenantId;

    const hasEnquiryAccess = user.role === 'admin' || (user.pages && user.pages.includes('enquiries'));
    const hasBillingAccess = user.role === 'admin' || (user.pages && user.pages.includes('payments'));
    const hasProjectAccess = user.role === 'admin' || (user.pages && user.pages.includes('projects'));

    // Build project queries
    const projectQuery: any = { tenantId, status: { $nin: ['Completed', 'On Hold'] } };
    if (user.role === 'staff' && user.projects && user.projects.length > 0) {
      projectQuery._id = { $in: user.projects };
    }

    // Build outstanding invoices matching
    const invoiceMatch: any = { tenantId, status: { $ne: 'Paid' } };
    if (user.role === 'staff' && user.projects && user.projects.length > 0) {
      invoiceMatch.projectId = { $in: user.projects };
    }

    // Run parallel queries depending on page permissions
    const [
      totalEnquiries,
      convertedSales,
      pendingFollowups,
      outstandingResult,
      funnelStats,
      activeProjects
    ] = await Promise.all([
      hasEnquiryAccess ? Enquiry.countDocuments({ tenantId }) : Promise.resolve(0),
      hasEnquiryAccess ? Enquiry.countDocuments({ tenantId, status: 'Converted' }) : Promise.resolve(0),
      hasEnquiryAccess ? Enquiry.countDocuments({ tenantId, status: { $in: ['New', 'Followup'] } }) : Promise.resolve(0),
      hasBillingAccess ? Invoice.aggregate([
        { $match: invoiceMatch },
        { $group: { _id: null, total: { $sum: { $subtract: ['$totalAmount', '$receivedAmount'] } } } },
      ]) : Promise.resolve([]),
      hasEnquiryAccess ? Enquiry.aggregate([
        { $match: { tenantId } },
        { $group: { _id: '$status', count: { $sum: 1 } } }
      ]) : Promise.resolve([]),
      hasProjectAccess ? Project.find(projectQuery).sort({ updatedAt: -1 }).limit(3) : Promise.resolve([])
    ]);

    // Format funnel stats
    const funnel = {
      new: funnelStats.find(s => s._id === 'New')?.count || 0,
      followup: funnelStats.find(s => s._id === 'Followup')?.count || 0,
      quotationSent: funnelStats.find(s => s._id === 'Quotation Sent')?.count || 0,
      converted: funnelStats.find(s => s._id === 'Converted')?.count || 0,
      rejected: funnelStats.find(s => s._id === 'Rejected')?.count || 0,
    };

    sendSuccess(res, {
      totalEnquiries,
      convertedSales,
      pendingFollowups,
      outstandingPayments: outstandingResult[0]?.total ?? 0,
      funnel,
      activeProjects
    });
  } catch (err) {
    next(err);
  }
};

export const getRecentEnquiries = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const user = req.user as any;
    const hasEnquiryAccess = user.role === 'admin' || (user.pages && user.pages.includes('enquiries'));
    if (!hasEnquiryAccess) {
      return sendSuccess(res, []);
    }

    const enquiries = await Enquiry.find({ tenantId: req.tenantId })
      .sort({ createdAt: -1 })
      .limit(5)
      .populate('createdBy', 'name email');
    sendSuccess(res, enquiries);
  } catch (err) {
    next(err);
  }
};
