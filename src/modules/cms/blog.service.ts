import { BlogModel, IBlog, BLOG_STATUS } from './blog.model';
import { getPaginationOptions, formatPaginatedResponse, IPaginatedResult } from '../../common/utils/pagination.util';
import { NotFoundError } from '../../common/errors/NotFoundError';

export class BlogService {
  public static async getBlogs(query: any): Promise<IPaginatedResult<IBlog>> {
    const { page, limit, skip } = getPaginationOptions(query);
    const filter: any = { status: BLOG_STATUS.PUBLISHED }; // Public facing only returns published
    
    if (query.category) {
      filter.category = query.category;
    }
    if (query.search) {
      filter.title = { $regex: query.search, $options: 'i' };
    }

    const [data, total] = await Promise.all([
      BlogModel.find(filter)
        .sort({ publishedAt: -1, createdAt: -1 })
        .skip(skip)
        .limit(limit),
      BlogModel.countDocuments(filter),
    ]);

    return formatPaginatedResponse(data, total, page, limit);
  }

  public static async getBlogBySlug(slug: string): Promise<IBlog> {
    const blog = await BlogModel.findOne({ slug, status: BLOG_STATUS.PUBLISHED });
    if (!blog) {
      throw new NotFoundError('Blog post not found');
    }
    return blog;
  }
}
