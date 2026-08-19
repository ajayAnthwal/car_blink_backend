import express, { Application } from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import { corsOptions } from './config/cors.config';
import { loggerMiddleware } from './middlewares/logger.middleware';
import { errorMiddleware } from './middlewares/error.middleware';
import apiRouter from './routes/index';

import path from 'path';

const app: Application = express();

// Standard Middlewares (with 50MB body limit for image uploads/base64)
app.use(cors(corsOptions));
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));
app.use(cookieParser());

// Serve static uploads folder
app.use('/uploads', express.static(path.join(process.cwd(), 'uploads')));

// Request Logger
app.use(loggerMiddleware);

// API Routes
app.use('/api', apiRouter);

// Global Error Handler (must be mounted last)
app.use(errorMiddleware as any); // cast to avoid any signature mismatch with express typing

export default app;
