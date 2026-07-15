import mongoose from 'mongoose';
import { env } from './env.config';
import { logger } from './logger.config';

export const connectDatabase = async (): Promise<void> => {
  const dbUri = env.MONGODB_URI;

  mongoose.connection.on('connected', () => {
    logger.info('Successfully connected to MongoDB.');
  });

  mongoose.connection.on('error', (err) => {
    logger.error(`MongoDB connection error: ${err}`);
  });

  mongoose.connection.on('disconnected', () => {
    logger.warn('MongoDB connection disconnected.');
  });

  try {
    await mongoose.connect(dbUri);
  } catch (error) {
    logger.error('Failed to connect to MongoDB:', error);
    throw error;
  }
};
