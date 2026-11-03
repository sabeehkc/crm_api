import { Request, Response, NextFunction } from 'express';
import { sendSuccess, sendNotFound } from '@/utils';
import Quotation from '@/models/quotation';

export const listQuotations = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { page = 1, limit = 20, enquiryId } = req.query;
    const query: any = { tenantId: req.tenantId };
    if (enquiryId) query.enquiryId = enquiryId;
    
    const [items, total] = await Promise.all([
      Quotation.find(query).sort({ createdAt: -1 }).skip((+page - 1) * +limit).limit(+limit)
        .populate('enquiryId', 'name email service').exec(),
      Quotation.countDocuments(query),
    ]);
    sendSuccess(res, { items, total, page: +page, limit: +limit, totalPages: Math.ceil(total / +limit) });
  } catch (err) {
    next(err);
  }
};

export const createQuotation = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const quotation = await Quotation.create({ ...req.body, createdBy: (req.user as any)._id, tenantId: req.tenantId });
    sendSuccess(res, quotation, 'Quotation created', 201);
  } catch (err) {
    next(err);
  }
};

export const getQuotation = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const quotation = await Quotation.findOne({ _id: req.params.id, tenantId: req.tenantId })
      .populate('enquiryId', 'name email service')
      .exec();
    if (!quotation) return sendNotFound(res, 'Quotation not found');
    sendSuccess(res, quotation);
  } catch (err) {
    next(err);
  }
};

export const updateQuotation = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const quotation = await Quotation.findOneAndUpdate(
      { _id: req.params.id, tenantId: req.tenantId },
      req.body,
      { new: true, runValidators: true }
    ).exec();
    if (!quotation) return sendNotFound(res, 'Quotation not found');
    sendSuccess(res, quotation, 'Quotation updated');
  } catch (err) {
    next(err);
  }
};

export const deleteQuotation = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const quotation = await Quotation.findOneAndDelete({ _id: req.params.id, tenantId: req.tenantId });
    if (!quotation) return sendNotFound(res, 'Quotation not found');
    sendSuccess(res, null, 'Quotation deleted');
  } catch (err) {
    next(err);
  }
};

export const downloadQuotationPdf = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const quotation = await Quotation.findOne({ _id: req.params.id, tenantId: req.tenantId }).exec();
    if (!quotation) return sendNotFound(res, 'Quotation not found');

    let PDFDocument: any;
    try {
      PDFDocument = require('pdfkit');
    } catch {
      return res.status(501).json({ success: false, message: 'PDF generation requires pdfkit. Run: npm install pdfkit @types/pdfkit' });
    }

    const doc = new PDFDocument({ margin: 50 });
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${quotation.referenceNumber}.pdf"`);
    doc.pipe(res);

    // Company header
    doc.fontSize(18).text(quotation.companyDetails?.name || 'Company', { align: 'left' });
    doc.fontSize(9).text(quotation.companyDetails?.address || '');
    doc.text(`Phone: ${quotation.companyDetails?.phone || ''}  Email: ${quotation.companyDetails?.email || ''}`);
    doc.moveDown();

    // Quotation meta
    doc.fontSize(14).text(`Quotation: ${quotation.referenceNumber}`, { align: 'right' });
    doc.fontSize(9).text(`Date: ${quotation.quoteMeta?.date || ''}`, { align: 'right' });
    doc.text(`Valid for: ${quotation.quoteMeta?.validFor || ''}`, { align: 'right' });
    doc.moveDown();

    // Client
    doc.fontSize(11).text('Bill To:');
    doc.fontSize(9)
      .text(quotation.clientDetails?.name || '')
      .text(quotation.clientDetails?.company || '')
      .text(quotation.clientDetails?.email || '');
    doc.moveDown();

    if (quotation.salutation || quotation.welcomeTitle) {
      if (quotation.salutation) {
        doc.fontSize(11).font('Helvetica-Bold').text(quotation.salutation);
        doc.moveDown(0.2);
      }
      if (quotation.welcomeTitle) {
        doc.fontSize(10).font('Helvetica').text(quotation.welcomeTitle);
        doc.moveDown(0.5);
      }
    }

    if (quotation.projectOverview) {
      doc.fontSize(11).font('Helvetica-Bold').text('Project Overview');
      doc.fontSize(10).font('Helvetica').text(quotation.projectOverview);
      doc.moveDown(0.5);
    }

    if (quotation.coreObjective) {
      doc.fontSize(10).font('Helvetica-Bold').text('Core Objective: ', { continued: true });
      doc.font('Helvetica').text(quotation.coreObjective);
      doc.moveDown(0.8);
    }

    // Key Modules & Features
    if (quotation.features?.length) {
      doc.fontSize(11).font('Helvetica-Bold').text('Key Modules & Feature Details:');
      doc.moveDown(0.3);
      quotation.features.forEach((f: any) => {
        doc.fontSize(9).font('Helvetica-Bold').text(`${f.module} (${f.user}): `, { continued: true });
        doc.font('Helvetica').text(f.feature);
      });
      doc.moveDown(0.8);
    }

    // Line items
    doc.fontSize(11).font('Helvetica-Bold').text('Services / Items:');
    doc.moveDown(0.3);
    quotation.lineItems.forEach((item: any) => {
      const amt = (item.qty || 0) * (item.rate || 0);
      doc.fontSize(9).font('Helvetica').text(`• ${item.desc}  ×${item.qty}  @₹${item.rate}  = ₹${amt}`);
    });
    doc.moveDown(0.5);

    // Totals
    doc.fontSize(10).text(`Subtotal: ₹${quotation.subtotal}`);
    doc.text(`GST (${quotation.gstPercent}%): ₹${quotation.gstAmount}`);
    doc.fontSize(12).text(`Total: ₹${quotation.totalAmount}`);
    doc.moveDown();

    // Timeline
    if (quotation.timelineItems?.length) {
      doc.fontSize(11).font('Helvetica-Bold').text('Payment Timeline / Milestones:');
      quotation.timelineItems.forEach((t: any) => {
        doc.fontSize(9).font('Helvetica').text(`• ${t.title} (${t.duration || 'N/A'}) — ₹${t.amount}`);
        if (t.description) doc.fontSize(8).text(`  ${t.description}`, { indent: 10 });
      });
      doc.moveDown();
    }

    if (quotation.thanksNote) {
      doc.fontSize(10).font('Helvetica').text(quotation.thanksNote);
      doc.moveDown();
    }

    // Terms
    if (quotation.termsPoints?.length) {
      doc.fontSize(11).font('Helvetica-Bold').text('Payment & Post-Live Terms:');
      quotation.termsPoints.forEach((p: string) => {
        doc.fontSize(9).font('Helvetica').text(`• ${p}`);
      });
      doc.moveDown();
    }

    if (quotation.terms) {
      doc.fontSize(11).font('Helvetica-Bold').text('Additional Notes:');
      doc.fontSize(9).font('Helvetica').text(quotation.terms);
      doc.moveDown();
    }

    if (quotation.closingNote || quotation.signatureName) {
      doc.moveDown();
      if (quotation.closingNote) {
        doc.fontSize(10).font('Helvetica').text(quotation.closingNote);
        doc.moveDown();
      }
      
      doc.fontSize(10).font('Helvetica-Bold').text('From,', { align: 'right' });
      doc.text(`${quotation.signatureName || ''},`, { align: 'right' });
      doc.fontSize(9).font('Helvetica').text(`${quotation.signatureRole || ''},`, { align: 'right' });
      doc.text(`${quotation.companyDetails?.name || ''}`, { align: 'right' });
      doc.text(`Ph : ${quotation.companyDetails?.phone || ''}`, { align: 'right' });
      doc.fillColor('#c23329').text(`${quotation.companyDetails?.email || ''}`, { align: 'right' });
    }

    doc.end();
  } catch (err) {
    next(err);
  }
};
