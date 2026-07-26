import { Request, Response, NextFunction } from 'express';
import { superAdminTaxReportsService } from './tax-reports.service';

export class SuperAdminTaxReportsController {
  async exportTaxReport(req: Request, res: Response, next: NextFunction) {
    try {
      const { startDate, endDate } = req.query;
      const csvData = await superAdminTaxReportsService.generateTaxReport(startDate as string, endDate as string);
      
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename=tax-report-${startDate}-to-${endDate}.csv`);
      res.status(200).send(csvData);
    } catch (error) {
      next(error);
    }
  }
}

export const superAdminTaxReportsController = new SuperAdminTaxReportsController();
