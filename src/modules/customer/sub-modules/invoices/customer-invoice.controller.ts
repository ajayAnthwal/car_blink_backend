import { Request, Response } from 'express';
import { InvoiceModel } from '../../../partner/sub-modules/jobs/invoice.model';
import { asyncHandler } from '../../../../common/utils/asyncHandler.util';
import { successResponse } from '../../../../common/utils/apiResponse.util';

export class CustomerInvoiceController {
  /**
   * Get all invoices forwarded to customer or paid
   */
  public static getMyInvoices = asyncHandler(async (req: Request, res: Response) => {
    const customerId = (req as any).user.userId;

    const invoices = await InvoiceModel.find({
      customerId,
      status: { $in: ['FORWARDED_TO_CUSTOMER', 'PAID', 'APPROVED_BY_EXECUTIVE'] }
    })
      .populate('partnerId', 'businessName businessAddress phone')
      .populate({
        path: 'bookingId',
        populate: [
          { path: 'vehicleId', select: 'brand model registrationNumber year' },
          { path: 'serviceId', select: 'name price' }
        ]
      })
      .sort({ createdAt: -1 });

    return successResponse(res, { invoices, total: invoices.length }, 'Customer invoices retrieved successfully');
  });

  /**
   * Get invoice for a specific booking
   */
  public static getInvoiceByBooking = asyncHandler(async (req: Request, res: Response) => {
    const customerId = (req as any).user.userId;
    const { bookingId } = req.params;

    const invoice = await InvoiceModel.findOne({
      bookingId,
      customerId,
      status: { $in: ['FORWARDED_TO_CUSTOMER', 'PAID', 'APPROVED_BY_EXECUTIVE'] }
    })
      .populate('partnerId', 'businessName businessAddress phone')
      .populate({
        path: 'bookingId',
        populate: [
          { path: 'vehicleId', select: 'brand model registrationNumber year' },
          { path: 'serviceId', select: 'name price' }
        ]
      });

    return successResponse(res, { invoice }, 'Invoice retrieved successfully');
  });
}
