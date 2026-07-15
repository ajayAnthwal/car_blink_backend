import { z } from 'zod';
import { REPORT_TYPE } from '../../../accounts/sub-modules/reports/daily-report-snapshot.model';

export const reportsHistoryQuerySchema = z.object({
  reportType: z.nativeEnum(REPORT_TYPE).optional(),
  fromDate: z.string().optional(),
  toDate: z.string().optional(),
});
