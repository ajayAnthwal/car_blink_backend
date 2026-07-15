import express, { Application } from 'express';
import cors from 'cors';
import { corsOptions } from './config/cors.config';
import { loggerMiddleware } from './middlewares/logger.middleware';
import { errorMiddleware } from './middlewares/error.middleware';
import apiRouter from './routes/index';

import path from 'path';

const app: Application = express();

// Standard Middlewares
app.use(cors(corsOptions));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve static uploads folder
app.use('/uploads', express.static(path.join(process.cwd(), 'uploads')));

// Request Logger
app.use(loggerMiddleware);

// API Routes
app.use('/api', apiRouter);

// Global Error Handler (must be mounted last)
app.use(errorMiddleware as any); // cast to avoid any signature mismatch with express typing

export default app;
