import { CorsOptions } from 'cors';
import { env } from './env.config';

export const corsOptions: CorsOptions = {
  origin: (origin, callback) => {
    const allowedOrigins = env.CORS_ORIGIN === '*' ? [] : env.CORS_ORIGIN.split(',');
    if (env.CORS_ORIGIN === '*' || !origin || allowedOrigins.indexOf(origin) !== -1) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
};
