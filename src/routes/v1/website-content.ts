import { Router } from 'express';
import {
  getWebsiteContent,
  updateHero,
  addAboutUs, updateAboutUs, deleteAboutUs, toggleAboutUs,
  addProduct, updateProduct, deleteProduct, toggleProduct,
  addClient, updateClient, deleteClient,
  addDirector, updateDirector, deleteDirector,
  addNews, updateNews, deleteNews, togglePublishNews,
  addTool, updateTool, deleteTool,
  addFaq, updateFaq, deleteFaq, toggleFaq,
  getWebsites, createWebsite, updateWebsite, deleteWebsite,
} from '@/controllers/v1/website-content';
import { authenticate } from '@/middlewares/authenticate';
import { tenantContext } from '@/middlewares/tenantContext';
import { authorize } from '@/middlewares/authorize';
import { uploadWebsiteImage, uploadWebsiteMedia } from '@/middlewares/upload';

const router = Router();

// Read
router.get('/websites', authenticate, tenantContext, getWebsites);

router.get('/', authenticate, tenantContext, getWebsiteContent);
router.get('/:tenantId', getWebsiteContent);

// Websites
router.post('/websites', authenticate, tenantContext, authorize('admin'), createWebsite);
router.put('/websites/:websiteId', authenticate, tenantContext, authorize('admin'), updateWebsite);
router.delete('/websites/:websiteId', authenticate, tenantContext, authorize('admin'), deleteWebsite);


// Hero
router.put('/hero', authenticate, tenantContext, authorize('admin'), uploadWebsiteImage, updateHero);

// About Us
router.post('/about-us', authenticate, tenantContext, authorize('admin'), uploadWebsiteMedia, addAboutUs);
router.put('/about-us/:aboutId', authenticate, tenantContext, authorize('admin'), uploadWebsiteMedia, updateAboutUs);
router.delete('/about-us/:aboutId', authenticate, tenantContext, authorize('admin'), deleteAboutUs);
router.patch('/about-us/:aboutId/toggle', authenticate, tenantContext, authorize('admin'), toggleAboutUs);

// Products
router.post('/products', authenticate, tenantContext, authorize('admin'), uploadWebsiteMedia, addProduct);
router.put('/products/:productId', authenticate, tenantContext, authorize('admin'), uploadWebsiteMedia, updateProduct);
router.delete('/products/:productId', authenticate, tenantContext, authorize('admin'), deleteProduct);
router.patch('/products/:productId/toggle', authenticate, tenantContext, authorize('admin'), toggleProduct);

// Clients
router.post('/clients', authenticate, tenantContext, authorize('admin'), uploadWebsiteImage, addClient);
router.put('/clients/:clientId', authenticate, tenantContext, authorize('admin'), uploadWebsiteImage, updateClient);
router.delete('/clients/:clientId', authenticate, tenantContext, authorize('admin'), deleteClient);

// Directors
router.post('/directors', authenticate, tenantContext, authorize('admin'), uploadWebsiteImage, addDirector);
router.put('/directors/:directorId', authenticate, tenantContext, authorize('admin'), uploadWebsiteImage, updateDirector);
router.delete('/directors/:directorId', authenticate, tenantContext, authorize('admin'), deleteDirector);

// News
router.post('/news', authenticate, tenantContext, authorize('admin'), uploadWebsiteImage, addNews);
router.put('/news/:articleId', authenticate, tenantContext, authorize('admin'), uploadWebsiteImage, updateNews);
router.delete('/news/:articleId', authenticate, tenantContext, authorize('admin'), deleteNews);
router.patch('/news/:articleId/toggle-publish', authenticate, tenantContext, authorize('admin'), togglePublishNews);

// Tools
router.post('/tools', authenticate, tenantContext, authorize('admin'), uploadWebsiteImage, addTool);
router.put('/tools/:toolId', authenticate, tenantContext, authorize('admin'), uploadWebsiteImage, updateTool);
router.delete('/tools/:toolId', authenticate, tenantContext, authorize('admin'), deleteTool);

// FAQ
router.post('/faq', authenticate, tenantContext, authorize('admin'), addFaq);
router.put('/faq/:faqId', authenticate, tenantContext, authorize('admin'), updateFaq);
router.delete('/faq/:faqId', authenticate, tenantContext, authorize('admin'), deleteFaq);
router.patch('/faq/:faqId/toggle', authenticate, tenantContext, authorize('admin'), toggleFaq);

export default router;

