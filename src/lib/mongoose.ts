import mongoose from 'mongoose';
import config from '@/config';
import logger from '@/lib/logger';
import { ConnectOptions } from 'mongoose';

// Extract database name from URI or use default
const getDbName = (uri: string): string => {
  const match = uri.match(/\/([^/?]+)(\?|$)/);
  return match ? match[1] : 'crm';
};

const clientOptions: ConnectOptions = {
  appName: 'crm-api',
  dbName: getDbName(config.MONGO_URI || 'mongodb://localhost:27017/crm'),
  serverApi: {
    version: '1',
    strict: true,
    deprecationErrors: true,
  },
};

export const connectToDatabase = async (): Promise<void> => {
  if (!config.MONGO_URI) {
    throw new Error('MONGO_URI is not defined in the configuration');
  }
  try {
    await mongoose.connect(config.MONGO_URI, clientOptions);
    const dbName = mongoose.connection.db?.databaseName || clientOptions.dbName;
    logger.info('MongoDB connected successfully', {
      uri: config.MONGO_URI.replace(/\/\/[^@]+@/, '//***@'), // Hide credentials
      dbName,
      appName: clientOptions.appName,
    });
  } catch (err) {
    if (err instanceof Error) {
      throw err;
    }
    logger.error('Error connecting to database:', err);
  }
};

export const disconnectFromDatabase = async (): Promise<void> => {
  try {
    await mongoose.disconnect();
    logger.info('Disconnected from the database successfully');
  } catch (err) {
    if (err instanceof Error) {
      throw new Error(err.message);
    }
    logger.error('Error disconnecting from the database:', err);
  }
};


