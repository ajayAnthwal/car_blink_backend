import { z } from 'zod';

export const paginationQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(10),
});

export const createServiceSchema = z.object({
  name: z.string().min(1, 'Service name is required'),
  icon: z.string().min(1, 'Icon key or URL is required'),
  category: z.string().optional(),
});

export const updateServiceSchema = createServiceSchema.partial();

export const createCitySchema = z.object({
  name: z.string().min(1, 'City name is required'),
  state: z.string().min(1, 'State name is required'),
});

export const updateCitySchema = createCitySchema.partial();

export const createVehicleBrandSchema = z.object({
  name: z.string().min(1, 'Brand name is required'),
  logo: z.string().optional(),
});

export const createVehicleModelSchema = z.object({
  brandId: z.string().regex(/^[0-9a-fA-F]{24}$/, 'Invalid Brand ID format'),
  name: z.string().min(1, 'Model name is required'),
});
