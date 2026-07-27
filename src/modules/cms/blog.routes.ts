import { Router } from 'express';
import { BlogController } from './blog.controller';
import { validate } from '../../middlewares/validate.middleware';
import { z } from 'zod';

const router = Router();

const paginationQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(10),
  search: z.string().optional(),
  category: z.string().optional(),
});

// Public Read Routes
router.get('/', validate({ query: paginationQuerySchema }), BlogController.getBlogs);
router.get('/:slug', BlogController.getBlogBySlug);

export default router;
