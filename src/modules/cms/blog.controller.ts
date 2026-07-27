import { Request, Response } from 'express';
import { BlogService } from './blog.service';
import { successResponse } from '../../common/utils/apiResponse.util';
import { asyncHandler } from '../../common/utils/asyncHandler.util';

export class BlogController {
  public static getBlogs = asyncHandler(async (req: Request, res: Response) => {
    const result = await BlogService.getBlogs(req.query);
    return successResponse(res, result, 'Blogs retrieved successfully');
  });

  public static getBlogBySlug = asyncHandler(async (req: Request, res: Response) => {
    const { slug } = req.params;
    const result = await BlogService.getBlogBySlug(slug);
    return successResponse(res, result, 'Blog details retrieved successfully');
  });
}
