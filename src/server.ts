import app from './app';
import { env } from './config/env.config';
import { connectDatabase } from './config/database.config';
import { logger } from './config/logger.config';
import { initializeCronJobs } from './jobs';
import { initializeSocket } from './sockets';

const startServer = async (): Promise<void> => {
  try {
    // Connect to database
    await connectDatabase();

    // Start Express server
    const server = app.listen(env.PORT, () => {
      logger.info(`⚡️[server]: Server is running in ${env.NODE_ENV} mode on port ${env.PORT}`);
      initializeCronJobs();
      initializeSocket(server);
    });

    const gracefulShutdown = (signal: string) => {
      logger.warn(`Received ${signal}. Shutting down gracefully...`);
      server.close(() => {
        logger.info('HTTP server closed.');
        process.exit(0);
      });
    };

    process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
    process.on('SIGINT', () => gracefulShutdown('SIGINT'));

  } catch (error) {
    logger.error('Startup failed:', error);
    process.exit(1);
  }
};

// Process-level error handling
process.on('uncaughtException', (error: Error) => {
  logger.error('Uncaught Exception occurred:', error);
  process.exit(1);
});

process.on('unhandledRejection', (reason: any) => {
  logger.error('Unhandled Rejection occurred:', reason);
  process.exit(1);
});

startServer();
