import { z } from 'zod';

export const paginationQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(10000).default(10),
});

export const stateQuerySchema = z.object({
  page: z.coerce.number().int().min(1).optional(),
  limit: z.coerce.number().int().min(1).max(10000).optional(),
  search: z.string().optional(),
  isActive: z.enum(['true', 'false', 'all']).optional(),
});

export const cityQuerySchema = z.object({
  page: z.coerce.number().int().min(1).optional(),
  limit: z.coerce.number().int().min(1).max(10000).optional(),
  search: z.string().optional(),
  state: z.string().optional(),
  stateId: z.string().optional(),
  isActive: z.enum(['true', 'false', 'all']).optional(),
});

export const createStateSchema = z.object({
  name: z.string().min(1, 'State name is required').trim(),
  code: z.string().max(10).optional().or(z.literal('')),
  country: z.string().default('India'),
  isActive: z.boolean().default(true).optional(),
});

export const updateStateSchema = z.object({
  name: z.string().min(1, 'State name cannot be empty').trim().optional(),
  code: z.string().max(10).optional().or(z.literal('')),
  country: z.string().optional(),
  isActive: z.boolean().optional(),
});

export const createCitySchema = z.object({
  name: z.string().min(1, 'City name is required').trim(),
  state: z.string().min(1, 'State name is required').trim().optional(),
  stateId: z.string().regex(/^[0-9a-fA-F]{24}$/, 'Invalid State ID format').optional(),
  isActive: z.boolean().default(true).optional(),
}).refine(data => data.state || data.stateId, {
  message: 'Either state name or stateId must be provided',
  path: ['state'],
});

export const updateCitySchema = z.object({
  name: z.string().min(1, 'City name cannot be empty').trim().optional(),
  state: z.string().min(1, 'State name cannot be empty').trim().optional(),
  stateId: z.string().regex(/^[0-9a-fA-F]{24}$/, 'Invalid State ID format').optional(),
  isActive: z.boolean().optional(),
});

export const createServiceSchema = z.object({
  name: z.string().min(1, 'Service name is required'),
  slug: z.string().min(1, 'Slug is required'),
  icon: z.string().min(1, 'Icon key or URL is required'),
  category: z.string().optional(),
  description: z.string().optional(),
  fullDescription: z.string().optional(),
  price: z.number().optional(),
  estimatedDuration: z.string().optional(),
  includedServices: z.array(z.string()).optional(),
  benefits: z.array(z.string()).optional(),
});

export const updateServiceSchema = createServiceSchema.partial();

export const createVehicleBrandSchema = z.object({
  name: z.string().min(1, 'Brand name is required'),
  logo: z.string().optional(),
});

export const createVehicleModelSchema = z.object({
  brandId: z.string().regex(/^[0-9a-fA-F]{24}$/, 'Invalid Brand ID format'),
  name: z.string().min(1, 'Model name is required'),
});
