import { CorsOptions } from 'cors';
import { env } from './env.config';

export const corsOptions: CorsOptions = {
  origin: (origin, callback) => {
    // Allow non-browser requests (Postman, curl, server-to-server)
    if (!origin) {
      return callback(null, true);
    }

    // If wildcard '*' is configured, dynamically echo back the requesting origin.
    // This is MANDATORY for browsers when credentials: true is enabled!
    if (env.CORS_ORIGIN === '*') {
      return callback(null, origin);
    }

    const allowedOrigins = env.CORS_ORIGIN.split(',').map((o) => o.trim().replace(/\/$/, ''));
    const normalizedOrigin = origin.replace(/\/$/, '');

    if (allowedOrigins.includes(normalizedOrigin) || allowedOrigins.includes('*')) {
      return callback(null, origin);
    }

    callback(new Error(`Origin ${origin} not allowed by CORS`));
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept'],
};
