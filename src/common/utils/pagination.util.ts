export interface IPaginatedResult<T> {
  data: T[];
  pagination: {
    total: number;
    page: number;
    limit: number;
    pages: number;
  };
}

export const getPaginationOptions = (query: { page?: number; limit?: number }) => {
  const page = Math.max(1, Number(query.page) || 1);
  const limit = Math.max(1, Math.min(100, Number(query.limit) || 10));
  const skip = (page - 1) * limit;

  return { page, limit, skip };
};

export const formatPaginatedResponse = <T>(
  data: T[],
  total: number,
  page: number,
  limit: number
): IPaginatedResult<T> => {
  const pages = Math.ceil(total / limit);
  return {
    data,
    pagination: {
      total,
      page,
      limit,
      pages,
    },
  };
};
