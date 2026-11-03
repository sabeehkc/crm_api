import { Request, Response, NextFunction } from 'express';
import { sendSuccess, sendNotFound } from '@/utils';
import WebsiteContent from '@/models/website-content';
import Website from '@/models/website';
import WebsiteAboutUs from '@/models/website-about-us';
import WebsiteProduct from '@/models/website-product';
import WebsiteClient from '@/models/website-client';
import WebsiteDirector from '@/models/website-director';
import WebsiteNews from '@/models/website-news';
import WebsiteTool from '@/models/website-tool';
import WebsiteFaq from '@/models/website-faq';
import { getRelativePath, getImageUrl } from '@/middlewares/upload';
import { Types } from 'mongoose';

const getInstance = async (tenantId: Types.ObjectId, websiteId?: string) => WebsiteContent.getInstance(tenantId, websiteId);

export const getWebsiteContent = async (req: Request, res: Response, next: NextFunction) => {
  try {
    let tenantId = req.params.tenantId;
    
    if (!tenantId && req.tenantId) {
      tenantId = req.tenantId.toString();
    }

    if (!tenantId || !Types.ObjectId.isValid(tenantId)) {
      return sendNotFound(res, 'Invalid or missing tenantId');
    }

    const tId = new Types.ObjectId(tenantId);
    
    const { tab, websiteId } = req.query;
    const qId = websiteId ? { websiteId: new Types.ObjectId(websiteId as string) } : { websiteId: { $exists: false } };

    // Fetch base doc for hero slides
    const doc = await getInstance(tId, websiteId as string);
    
    let aggregated: any = { ...doc.toObject() };

    // Explicitly remove these keys in case the DB document still contains old nested data
    delete aggregated.aboutUs;
    delete aggregated.products;
    delete aggregated.clients;
    delete aggregated.directors;
    delete aggregated.news;
    delete aggregated.tools;
    delete aggregated.faq;

    if (!tab) {
      // Fetch all related sections from separate collections
      const [aboutUs, products, clients, directors, news, tools, faq] = await Promise.all([
        WebsiteAboutUs.find({ tenantId: tId, ...qId }).sort({ displayOrder: 1, createdAt: -1 }),
        WebsiteProduct.find({ tenantId: tId, ...qId }).sort({ displayOrder: 1, createdAt: 1 }),
        WebsiteClient.find({ tenantId: tId, ...qId }).sort({ createdAt: 1 }),
        WebsiteDirector.find({ tenantId: tId, ...qId }).sort({ createdAt: 1 }),
        WebsiteNews.find({ tenantId: tId, ...qId }).sort({ date: -1, createdAt: 1 }),
        WebsiteTool.find({ tenantId: tId, ...qId }).sort({ createdAt: 1 }),
        WebsiteFaq.find({ tenantId: tId, ...qId }).sort({ displayOrder: 1, createdAt: 1 }),
      ]);

      // Aggregate back into single object for backward compatibility with frontend
      aggregated = {
        ...aggregated,
        aboutUs,
        products,
        clients,
        directors,
        news,
        tools,
        faq,
      };
    } else {
      switch (tab) {
        case 'aboutUs':
          aggregated.aboutUs = await WebsiteAboutUs.find({ tenantId: tId, ...qId }).sort({ displayOrder: 1, createdAt: 1 });
          break;
        case 'products':
        case 'product':
          aggregated.products = await WebsiteProduct.find({ tenantId: tId, ...qId }).sort({ displayOrder: 1, createdAt: 1 });
          break;
        case 'clients':
        case 'client':
          aggregated.clients = await WebsiteClient.find({ tenantId: tId, ...qId }).sort({ createdAt: 1 });
          break;
        case 'directors':
        case 'director':
          aggregated.directors = await WebsiteDirector.find({ tenantId: tId, ...qId }).sort({ createdAt: 1 });
          break;
        case 'news':
          aggregated.news = await WebsiteNews.find({ tenantId: tId, ...qId }).sort({ date: -1, createdAt: 1 });
          break;
        case 'tools':
        case 'tool':
          aggregated.tools = await WebsiteTool.find({ tenantId: tId, ...qId }).sort({ createdAt: 1 });
          break;
        case 'faq':
        case 'faqs':
          aggregated.faq = await WebsiteFaq.find({ tenantId: tId, ...qId }).sort({ displayOrder: 1, createdAt: 1 });
          break;
      }
    }

    sendSuccess(res, aggregated);
  } catch (err) {
    next(err);
  }
};

export const updateHero = async (req: Request, res: Response, next: NextFunction) => {
  try {
    let slides = req.body.slides;
    const uploadingIndex = req.body.uploadingIndex;

    if (typeof slides === 'string') {
      try {
        slides = JSON.parse(slides);
      } catch (e) {
        slides = [];
      }
    }

    if (!Array.isArray(slides)) {
      slides = [];
    }

    if (req.file && uploadingIndex !== undefined && slides[uploadingIndex]) {
      slides[uploadingIndex].mediaUrl = getImageUrl(getRelativePath(req.file.path));
    }

    const doc = await WebsiteContent.findOneAndUpdate(
      { tenantId: req.tenantId },
      { $set: { hero: { slides } } },
      { new: true, upsert: true },
    );
    sendSuccess(res, doc?.hero, 'Hero updated');
  } catch (err) {
    next(err);
  }
};

// ─── About Us ──────────────────────────────────────────────────────────────

export const addAboutUs = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const data: any = { ...req.body, tenantId: req.tenantId };
    if (req.body.websiteId) data.websiteId = req.body.websiteId;
    if (req.file) data.mediaUrl = getImageUrl(getRelativePath(req.file.path));
    else if (req.files) {
      const files = req.files as any;
      if (files.websiteImage?.[0]) data.mediaUrl = getImageUrl(getRelativePath(files.websiteImage[0].path));
      else if (files.websiteVideo?.[0]) data.mediaUrl = getImageUrl(getRelativePath(files.websiteVideo[0].path));
    }
    
    if (typeof data.customFields === 'string') {
      try { data.customFields = JSON.parse(data.customFields); } catch (e) { data.customFields = {}; }
    }
    if (typeof data.companyStatistics === 'string') {
      try { data.companyStatistics = JSON.parse(data.companyStatistics); } catch (e) { data.companyStatistics = {}; }
    }
    if (typeof data.companyLocation === 'string') {
      try { data.companyLocation = JSON.parse(data.companyLocation); } catch (e) { data.companyLocation = {}; }
    }

    const doc = await WebsiteAboutUs.create(data);
    
    // Return all aboutUs for the frontend state update
    const all = await WebsiteAboutUs.find({ tenantId: req.tenantId, ...(req.body.websiteId || req.query.websiteId ? { websiteId: req.body.websiteId || req.query.websiteId } : { websiteId: { $exists: false } }) }).sort({ displayOrder: 1, createdAt: -1 });
    sendSuccess(res, all, 'About Us added', 201);
  } catch (err) {
    next(err);
  }
};

export const updateAboutUs = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const data: any = { ...req.body };
    if (req.file) data.mediaUrl = getImageUrl(getRelativePath(req.file.path));
    else if (req.files) {
      const files = req.files as any;
      if (files.websiteImage?.[0]) data.mediaUrl = getImageUrl(getRelativePath(files.websiteImage[0].path));
      else if (files.websiteVideo?.[0]) data.mediaUrl = getImageUrl(getRelativePath(files.websiteVideo[0].path));
    }
    
    if (typeof data.customFields === 'string') {
      try { data.customFields = JSON.parse(data.customFields); } catch (e) { data.customFields = {}; }
    }
    if (typeof data.companyStatistics === 'string') {
      try { data.companyStatistics = JSON.parse(data.companyStatistics); } catch (e) { data.companyStatistics = {}; }
    }
    if (typeof data.companyLocation === 'string') {
      try { data.companyLocation = JSON.parse(data.companyLocation); } catch (e) { data.companyLocation = {}; }
    }

    const doc = await WebsiteAboutUs.findOneAndUpdate(
      { _id: req.params.aboutId, tenantId: req.tenantId },
      { $set: data },
      { new: true },
    );
    if (!doc) return sendNotFound(res, 'About Us not found');
    
    const all = await WebsiteAboutUs.find({ tenantId: req.tenantId, ...(req.body.websiteId || req.query.websiteId ? { websiteId: req.body.websiteId || req.query.websiteId } : { websiteId: { $exists: false } }) }).sort({ displayOrder: 1, createdAt: -1 });
    sendSuccess(res, all, 'About Us updated');
  } catch (err) {
    next(err);
  }
};

export const deleteAboutUs = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const doc = await WebsiteAboutUs.findOneAndDelete({ _id: req.params.aboutId, tenantId: req.tenantId });
    if (!doc) return sendNotFound(res, 'About Us not found');
    const all = await WebsiteAboutUs.find({ tenantId: req.tenantId, ...(req.body.websiteId || req.query.websiteId ? { websiteId: req.body.websiteId || req.query.websiteId } : { websiteId: { $exists: false } }) }).sort({ displayOrder: 1, createdAt: -1 });
    sendSuccess(res, all, 'About Us removed');
  } catch (err) {
    next(err);
  }
};

export const toggleAboutUs = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const doc = await WebsiteAboutUs.findOne({ _id: req.params.aboutId, tenantId: req.tenantId });
    if (!doc) return sendNotFound(res, 'About Us not found');
    
    doc.isLive = !doc.isLive;
    await doc.save();
    
    const all = await WebsiteAboutUs.find({ tenantId: req.tenantId, ...(req.body.websiteId || req.query.websiteId ? { websiteId: req.body.websiteId || req.query.websiteId } : { websiteId: { $exists: false } }) }).sort({ displayOrder: 1, createdAt: -1 });
    sendSuccess(res, all, 'About Us toggled');
  } catch (err) {
    next(err);
  }
};

// ─── Products ──────────────────────────────────────────────────────────────

export const addProduct = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const data: any = { ...req.body, tenantId: req.tenantId };
    if (req.body.websiteId) data.websiteId = req.body.websiteId;
    if (req.file) data.mediaUrl = getImageUrl(getRelativePath(req.file.path));
    else if (req.files) {
      const files = req.files as any;
      if (files.websiteImage?.[0]) data.mediaUrl = getImageUrl(getRelativePath(files.websiteImage[0].path));
      else if (files.websiteVideo?.[0]) data.mediaUrl = getImageUrl(getRelativePath(files.websiteVideo[0].path));
    }
    if (typeof data.customFields === 'string') {
      try { data.customFields = JSON.parse(data.customFields); } catch (e) { data.customFields = {}; }
    }
    await WebsiteProduct.create(data);
    const all = await WebsiteProduct.find({ tenantId: req.tenantId, ...(req.body.websiteId || req.query.websiteId ? { websiteId: req.body.websiteId || req.query.websiteId } : { websiteId: { $exists: false } }) }).sort({ displayOrder: 1, createdAt: -1 });
    sendSuccess(res, all, 'Product added', 201);
  } catch (err) {
    next(err);
  }
};

export const updateProduct = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const data: any = { ...req.body };
    if (req.file) data.mediaUrl = getImageUrl(getRelativePath(req.file.path));
    else if (req.files) {
      const files = req.files as any;
      if (files.websiteImage?.[0]) data.mediaUrl = getImageUrl(getRelativePath(files.websiteImage[0].path));
      else if (files.websiteVideo?.[0]) data.mediaUrl = getImageUrl(getRelativePath(files.websiteVideo[0].path));
    }
    if (typeof data.customFields === 'string') {
      try { data.customFields = JSON.parse(data.customFields); } catch (e) { data.customFields = {}; }
    }
    const doc = await WebsiteProduct.findOneAndUpdate(
      { _id: req.params.productId, tenantId: req.tenantId },
      { $set: data },
      { new: true },
    );
    if (!doc) return sendNotFound(res, 'Product not found');
    const all = await WebsiteProduct.find({ tenantId: req.tenantId, ...(req.body.websiteId || req.query.websiteId ? { websiteId: req.body.websiteId || req.query.websiteId } : { websiteId: { $exists: false } }) }).sort({ displayOrder: 1, createdAt: -1 });
    sendSuccess(res, all, 'Product updated');
  } catch (err) {
    next(err);
  }
};

export const deleteProduct = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const doc = await WebsiteProduct.findOneAndDelete({ _id: req.params.productId, tenantId: req.tenantId });
    if (!doc) return sendNotFound(res, 'Product not found');
    const all = await WebsiteProduct.find({ tenantId: req.tenantId, ...(req.body.websiteId || req.query.websiteId ? { websiteId: req.body.websiteId || req.query.websiteId } : { websiteId: { $exists: false } }) }).sort({ displayOrder: 1, createdAt: -1 });
    sendSuccess(res, all, 'Product removed');
  } catch (err) {
    next(err);
  }
};

export const toggleProduct = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const doc = await WebsiteProduct.findOne({ _id: req.params.productId, tenantId: req.tenantId });
    if (!doc) return sendNotFound(res, 'Product not found');
    doc.isLive = !doc.isLive;
    await doc.save();
    const all = await WebsiteProduct.find({ tenantId: req.tenantId, ...(req.body.websiteId || req.query.websiteId ? { websiteId: req.body.websiteId || req.query.websiteId } : { websiteId: { $exists: false } }) }).sort({ displayOrder: 1, createdAt: -1 });
    sendSuccess(res, all, 'Product toggled');
  } catch (err) {
    next(err);
  }
};

// ─── Clients ───────────────────────────────────────────────────────────────

export const addClient = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const data: any = { ...req.body, tenantId: req.tenantId };
    if (req.body.websiteId) data.websiteId = req.body.websiteId;
    if (req.file) data.logoUrl = getImageUrl(getRelativePath(req.file.path));
    if (typeof data.customFields === 'string') {
      try { data.customFields = JSON.parse(data.customFields); } catch (e) { data.customFields = {}; }
    }
    await WebsiteClient.create(data);
    const all = await WebsiteClient.find({ tenantId: req.tenantId, ...(req.body.websiteId || req.query.websiteId ? { websiteId: req.body.websiteId || req.query.websiteId } : { websiteId: { $exists: false } }) }).sort({ createdAt: -1 });
    sendSuccess(res, all, 'Client added', 201);
  } catch (err) {
    next(err);
  }
};

export const updateClient = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const data: any = { ...req.body };
    if (req.file) data.logoUrl = getImageUrl(getRelativePath(req.file.path));
    if (typeof data.customFields === 'string') {
      try { data.customFields = JSON.parse(data.customFields); } catch (e) { data.customFields = {}; }
    }
    const doc = await WebsiteClient.findOneAndUpdate(
      { _id: req.params.clientId, tenantId: req.tenantId },
      { $set: data },
      { new: true },
    );
    if (!doc) return sendNotFound(res, 'Client not found');
    const all = await WebsiteClient.find({ tenantId: req.tenantId, ...(req.body.websiteId || req.query.websiteId ? { websiteId: req.body.websiteId || req.query.websiteId } : { websiteId: { $exists: false } }) }).sort({ createdAt: -1 });
    sendSuccess(res, all, 'Client updated');
  } catch (err) {
    next(err);
  }
};

export const deleteClient = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const doc = await WebsiteClient.findOneAndDelete({ _id: req.params.clientId, tenantId: req.tenantId });
    if (!doc) return sendNotFound(res, 'Client not found');
    const all = await WebsiteClient.find({ tenantId: req.tenantId, ...(req.body.websiteId || req.query.websiteId ? { websiteId: req.body.websiteId || req.query.websiteId } : { websiteId: { $exists: false } }) }).sort({ createdAt: -1 });
    sendSuccess(res, all, 'Client removed');
  } catch (err) {
    next(err);
  }
};

// ─── Directors ─────────────────────────────────────────────────────────────

export const addDirector = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const data: any = { ...req.body, tenantId: req.tenantId };
    if (req.body.websiteId) data.websiteId = req.body.websiteId;
    if (req.file) data.photoUrl = getImageUrl(getRelativePath(req.file.path));
    await WebsiteDirector.create(data);
    const all = await WebsiteDirector.find({ tenantId: req.tenantId, ...(req.body.websiteId || req.query.websiteId ? { websiteId: req.body.websiteId || req.query.websiteId } : { websiteId: { $exists: false } }) }).sort({ createdAt: -1 });
    sendSuccess(res, all, 'Director added', 201);
  } catch (err) {
    next(err);
  }
};

export const updateDirector = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const data: any = { ...req.body };
    if (req.file) data.photoUrl = getImageUrl(getRelativePath(req.file.path));
    const doc = await WebsiteDirector.findOneAndUpdate(
      { _id: req.params.directorId, tenantId: req.tenantId },
      { $set: data },
      { new: true },
    );
    if (!doc) return sendNotFound(res, 'Director not found');
    const all = await WebsiteDirector.find({ tenantId: req.tenantId, ...(req.body.websiteId || req.query.websiteId ? { websiteId: req.body.websiteId || req.query.websiteId } : { websiteId: { $exists: false } }) }).sort({ createdAt: -1 });
    sendSuccess(res, all, 'Director updated');
  } catch (err) {
    next(err);
  }
};

export const deleteDirector = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const doc = await WebsiteDirector.findOneAndDelete({ _id: req.params.directorId, tenantId: req.tenantId });
    if (!doc) return sendNotFound(res, 'Director not found');
    const all = await WebsiteDirector.find({ tenantId: req.tenantId, ...(req.body.websiteId || req.query.websiteId ? { websiteId: req.body.websiteId || req.query.websiteId } : { websiteId: { $exists: false } }) }).sort({ createdAt: -1 });
    sendSuccess(res, all, 'Director removed');
  } catch (err) {
    next(err);
  }
};

// ─── News ──────────────────────────────────────────────────────────────────

export const addNews = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const data: any = { ...req.body, tenantId: req.tenantId };
    if (req.body.websiteId) data.websiteId = req.body.websiteId;
    if (req.file) data.featuredImageUrl = getImageUrl(getRelativePath(req.file.path));
    if (typeof data.customFields === 'string') {
      try { data.customFields = JSON.parse(data.customFields); } catch (e) { data.customFields = {}; }
    }
    await WebsiteNews.create(data);
    const all = await WebsiteNews.find({ tenantId: req.tenantId, ...(req.body.websiteId || req.query.websiteId ? { websiteId: req.body.websiteId || req.query.websiteId } : { websiteId: { $exists: false } }) }).sort({ date: -1, createdAt: -1 });
    sendSuccess(res, all, 'Article added', 201);
  } catch (err) {
    next(err);
  }
};

export const updateNews = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const data: any = { ...req.body };
    if (req.file) data.featuredImageUrl = getImageUrl(getRelativePath(req.file.path));
    if (typeof data.customFields === 'string') {
      try { data.customFields = JSON.parse(data.customFields); } catch (e) { data.customFields = {}; }
    }
    const doc = await WebsiteNews.findOneAndUpdate(
      { _id: req.params.articleId, tenantId: req.tenantId },
      { $set: data },
      { new: true },
    );
    if (!doc) return sendNotFound(res, 'Article not found');
    const all = await WebsiteNews.find({ tenantId: req.tenantId, ...(req.body.websiteId || req.query.websiteId ? { websiteId: req.body.websiteId || req.query.websiteId } : { websiteId: { $exists: false } }) }).sort({ date: -1, createdAt: -1 });
    sendSuccess(res, all, 'Article updated');
  } catch (err) {
    next(err);
  }
};

export const deleteNews = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const doc = await WebsiteNews.findOneAndDelete({ _id: req.params.articleId, tenantId: req.tenantId });
    if (!doc) return sendNotFound(res, 'Article not found');
    const all = await WebsiteNews.find({ tenantId: req.tenantId, ...(req.body.websiteId || req.query.websiteId ? { websiteId: req.body.websiteId || req.query.websiteId } : { websiteId: { $exists: false } }) }).sort({ date: -1, createdAt: -1 });
    sendSuccess(res, all, 'Article removed');
  } catch (err) {
    next(err);
  }
};

export const togglePublishNews = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const doc = await WebsiteNews.findOne({ _id: req.params.articleId, tenantId: req.tenantId });
    if (!doc) return sendNotFound(res, 'Article not found');
    
    doc.isPublished = !doc.isPublished;
    doc.isDraft = !doc.isPublished;
    await doc.save();
    
    const all = await WebsiteNews.find({ tenantId: req.tenantId, ...(req.body.websiteId || req.query.websiteId ? { websiteId: req.body.websiteId || req.query.websiteId } : { websiteId: { $exists: false } }) }).sort({ date: -1, createdAt: -1 });
    sendSuccess(res, all, 'Publish status toggled');
  } catch (err) {
    next(err);
  }
};

// ─── Tools ─────────────────────────────────────────────────────────────────

export const addTool = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const data: any = { ...req.body, tenantId: req.tenantId };
    if (req.body.websiteId) data.websiteId = req.body.websiteId;
    if (req.file) data.logoUrl = getImageUrl(getRelativePath(req.file.path));
    await WebsiteTool.create(data);
    const all = await WebsiteTool.find({ tenantId: req.tenantId, ...(req.body.websiteId || req.query.websiteId ? { websiteId: req.body.websiteId || req.query.websiteId } : { websiteId: { $exists: false } }) }).sort({ createdAt: -1 });
    sendSuccess(res, all, 'Tool added', 201);
  } catch (err) {
    next(err);
  }
};

export const updateTool = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const data: any = { ...req.body };
    if (req.file) data.logoUrl = getImageUrl(getRelativePath(req.file.path));
    const doc = await WebsiteTool.findOneAndUpdate(
      { _id: req.params.toolId, tenantId: req.tenantId },
      { $set: data },
      { new: true },
    );
    if (!doc) return sendNotFound(res, 'Tool not found');
    const all = await WebsiteTool.find({ tenantId: req.tenantId, ...(req.body.websiteId || req.query.websiteId ? { websiteId: req.body.websiteId || req.query.websiteId } : { websiteId: { $exists: false } }) }).sort({ createdAt: -1 });
    sendSuccess(res, all, 'Tool updated');
  } catch (err) {
    next(err);
  }
};

export const deleteTool = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const doc = await WebsiteTool.findOneAndDelete({ _id: req.params.toolId, tenantId: req.tenantId });
    if (!doc) return sendNotFound(res, 'Tool not found');
    const all = await WebsiteTool.find({ tenantId: req.tenantId, ...(req.body.websiteId || req.query.websiteId ? { websiteId: req.body.websiteId || req.query.websiteId } : { websiteId: { $exists: false } }) }).sort({ createdAt: -1 });
    sendSuccess(res, all, 'Tool removed');
  } catch (err) {
    next(err);
  }
};

// ─── FAQ ───────────────────────────────────────────────────────────────────

export const addFaq = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const data: any = { ...req.body, tenantId: req.tenantId };
    if (req.body.websiteId) data.websiteId = req.body.websiteId;
    if (typeof data.customFields === 'string') {
      try { data.customFields = JSON.parse(data.customFields); } catch (e) { data.customFields = {}; }
    }
    await WebsiteFaq.create(data);
    const all = await WebsiteFaq.find({ tenantId: req.tenantId, ...(req.body.websiteId || req.query.websiteId ? { websiteId: req.body.websiteId || req.query.websiteId } : { websiteId: { $exists: false } }) }).sort({ displayOrder: 1, createdAt: -1 });
    sendSuccess(res, all, 'FAQ added', 201);
  } catch (err) {
    next(err);
  }
};

export const updateFaq = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const data: any = { ...req.body };
    if (typeof data.customFields === 'string') {
      try { data.customFields = JSON.parse(data.customFields); } catch (e) { data.customFields = {}; }
    }
    const doc = await WebsiteFaq.findOneAndUpdate(
      { _id: req.params.faqId, tenantId: req.tenantId },
      { $set: data },
      { new: true },
    );
    if (!doc) return sendNotFound(res, 'FAQ not found');
    const all = await WebsiteFaq.find({ tenantId: req.tenantId, ...(req.body.websiteId || req.query.websiteId ? { websiteId: req.body.websiteId || req.query.websiteId } : { websiteId: { $exists: false } }) }).sort({ displayOrder: 1, createdAt: -1 });
    sendSuccess(res, all, 'FAQ updated');
  } catch (err) {
    next(err);
  }
};

export const deleteFaq = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const doc = await WebsiteFaq.findOneAndDelete({ _id: req.params.faqId, tenantId: req.tenantId });
    if (!doc) return sendNotFound(res, 'FAQ not found');
    const all = await WebsiteFaq.find({ tenantId: req.tenantId, ...(req.body.websiteId || req.query.websiteId ? { websiteId: req.body.websiteId || req.query.websiteId } : { websiteId: { $exists: false } }) }).sort({ displayOrder: 1, createdAt: -1 });
    sendSuccess(res, all, 'FAQ removed');
  } catch (err) {
    next(err);
  }
};

export const toggleFaq = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const doc = await WebsiteFaq.findOne({ _id: req.params.faqId, tenantId: req.tenantId });
    if (!doc) return sendNotFound(res, 'FAQ not found');
    
    doc.isLive = !doc.isLive;
    await doc.save();
    
    const all = await WebsiteFaq.find({ tenantId: req.tenantId, ...(req.body.websiteId || req.query.websiteId ? { websiteId: req.body.websiteId || req.query.websiteId } : { websiteId: { $exists: false } }) }).sort({ displayOrder: 1, createdAt: -1 });
    sendSuccess(res, all, 'FAQ toggled');
  } catch (err) {
    next(err);
  }
};


// ─── Websites ──────────────────────────────────────────────────────────────

export const getWebsites = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const all = await Website.find({ tenantId: req.tenantId }).sort({ createdAt: -1 });
    sendSuccess(res, all, 'Websites fetched');
  } catch (err) {
    next(err);
  }
};

export const createWebsite = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const data = { ...req.body, tenantId: req.tenantId };
    await Website.create(data);
    const all = await Website.find({ tenantId: req.tenantId }).sort({ createdAt: -1 });
    sendSuccess(res, all, 'Website created', 201);
  } catch (err) {
    next(err);
  }
};

export const updateWebsite = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const doc = await Website.findOneAndUpdate(
      { _id: req.params.websiteId, tenantId: req.tenantId },
      { $set: req.body },
      { new: true }
    );
    if (!doc) return sendNotFound(res, 'Website not found');
    const all = await Website.find({ tenantId: req.tenantId }).sort({ createdAt: -1 });
    sendSuccess(res, all, 'Website updated');
  } catch (err) {
    next(err);
  }
};

export const deleteWebsite = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const doc = await Website.findOneAndDelete({ _id: req.params.websiteId, tenantId: req.tenantId });
    if (!doc) return sendNotFound(res, 'Website not found');
    const all = await Website.find({ tenantId: req.tenantId }).sort({ createdAt: -1 });
    sendSuccess(res, all, 'Website removed');
  } catch (err) {
    next(err);
  }
};
