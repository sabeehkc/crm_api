import { schedule, ScheduledTask } from 'node-cron';
import Post from '@/models/post';
import logger from './logger';

let task: ScheduledTask | null = null;

export const startScheduler = () => {
  if (task) return;

  logger.info('⏰ Starting background cron scheduler...');

  const runPublishJob = async () => {
    try {
      const now = new Date();
      const result = await Post.updateMany(
        { status: 'Scheduled', publishDate: { $lte: now } },
        { status: 'Published' }
      );
      if (result.modifiedCount > 0) {
        logger.info(`📢 Auto-published ${result.modifiedCount} scheduled post(s)`);
      }
    } catch (err) {
      logger.error('❌ Error in auto-publish scheduler job', err);
    }
  };

  // Run once immediately on startup to publish any posts whose time passed while the server was offline
  runPublishJob();

  // Schedule the job to run every minute
  task = schedule('* * * * *', runPublishJob);
};

export const stopScheduler = () => {
  if (task) {
    task.stop();
    task = null;
    logger.warn('🛑 Scheduler cron task stopped');
  }
};
