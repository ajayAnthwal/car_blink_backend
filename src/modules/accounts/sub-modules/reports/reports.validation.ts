import { z } from 'zod';

export const gstReportQuerySchema = z.object({
  fromDate: z.string().min(1, 'fromDate is required'),
  toDate: z.string().min(1, 'toDate is required'),
});

export const invoiceReportQuerySchema = z.object({
  fromDate: z.string().min(1, 'fromDate is required'),
  toDate: z.string().min(1, 'toDate is required'),
  cityId: z.string().optional(),
  serviceId: z.string().optional(),
});
