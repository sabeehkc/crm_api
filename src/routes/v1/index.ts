import { Router } from 'express';
import authRoutes           from '@/routes/v1/auth';
import userRoutes           from '@/routes/v1/user';
import uploadRoutes         from '@/routes/v1/upload';
import dashboardRoutes      from '@/routes/v1/dashboard';
import enquiryRoutes        from '@/routes/v1/enquiry';
import projectRoutes        from '@/routes/v1/project';
import taskRoutes           from '@/routes/v1/task';
import transactionRoutes  from '@/routes/v1/transaction';
import expenseRoutes      from '@/routes/v1/expense';
import quotationRoutes    from '@/routes/v1/quotation';
import chatRoutes         from '@/routes/v1/chat';
import websiteContentRoutes from '@/routes/v1/website-content';
import formRoutes         from '@/routes/v1/form';
import postRoutes         from '@/routes/v1/post';
import subscriptionRoutes from '@/routes/v1/subscription';
import settingRoutes      from '@/routes/v1/setting';
import botRoutes            from '@/routes/v1/bot';

const router = Router();

router.get('/', (_req: any, res: any) => {
  res.status(200).json({
    message: 'CRM API is live',
    status: 'ok',
    version: '1.0.0',
    timestamp: new Date().toISOString(),
  });
});

router.use('/auth',            authRoutes);
router.use('/users',           userRoutes);
router.use('/uploads',         uploadRoutes);
router.use('/dashboard',       dashboardRoutes);
router.use('/enquiries',       enquiryRoutes);
router.use('/projects',        projectRoutes);
router.use('/tasks',           taskRoutes);
router.use('/payments',        transactionRoutes);
router.use('/expenses',        expenseRoutes);
router.use('/quotations',      quotationRoutes);
router.use('/chat',            chatRoutes);
router.use('/website-content', websiteContentRoutes);
router.use('/forms',           formRoutes);
router.use('/posts',           postRoutes);
router.use('/subscriptions',   subscriptionRoutes);
router.use('/settings',        settingRoutes);
router.use('/bot',             botRoutes);

export default router;
