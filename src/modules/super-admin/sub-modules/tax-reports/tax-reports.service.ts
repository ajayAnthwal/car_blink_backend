import { SettlementModel } from '../../../accounts/sub-modules/settlements/settlement.model';
import { ApiError } from '../../../../common/errors/ApiError';

export class SuperAdminTaxReportsService {
  async generateTaxReport(startDate: string, endDate: string) {
    if (!startDate || !endDate) {
      throw new ApiError(400, 'Start date and end date are required');
    }

    const start = new Date(startDate);
    const end = new Date(endDate);
    
    // end of day for endDate
    end.setHours(23, 59, 59, 999);

    const settlements = await SettlementModel.find({
      status: 'PROCESSED',
      processedAt: { $gte: start, $lte: end }
    }).populate('partnerId', 'businessName').lean();

    // CSV Header
    let csv = 'Date,Partner Name,Transaction Reference,Gross Amount (INR),Platform Commission (INR),TDS Deducted (INR),Other Deductions (INR),Net Payout (INR)\n';

    settlements.forEach((s: any) => {
      const date = new Date(s.processedAt || s.createdAt).toISOString().split('T')[0];
      const partnerName = s.partnerId?.businessName?.replace(/,/g, '') || 'Unknown';
      const txnRef = s.transactionReference || 'N/A';
      const gross = s.grossAmount || 0;
      const comm = s.platformCommission || 0;
      const tds = s.tdsAmount || 0;
      const other = s.otherDeductions || 0;
      const net = s.netPayoutAmount || 0;

      csv += `${date},${partnerName},${txnRef},${gross},${comm},${tds},${other},${net}\n`;
    });

    return csv;
  }
}

export const superAdminTaxReportsService = new SuperAdminTaxReportsService();
