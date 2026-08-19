import { Request, Response } from 'express';
import mongoose from 'mongoose';
import { InvoiceModel } from '../../../partner/sub-modules/jobs/invoice.model';
import { BookingModel } from '../../sub-modules/booking/booking.model';
import { PartnerModel } from '../../../partner/partner.model';
import { asyncHandler } from '../../../../common/utils/asyncHandler.util';
import { successResponse } from '../../../../common/utils/apiResponse.util';

export class CustomerInvoiceController {
  /**
   * Helper to populate invoice references robustly whether stored as string or ObjectId
   */
  private static async populateInvoiceData(invoicesRaw: any[]) {
    if (!invoicesRaw || invoicesRaw.length === 0) return [];

    const bookingIds = invoicesRaw.map(inv => String(inv.bookingId)).filter(Boolean);
    const partnerIds = invoicesRaw.map(inv => String(inv.partnerId)).filter(Boolean);

    const bookingObjectIds = bookingIds.map(id => new mongoose.Types.ObjectId(id));
    const partnerObjectIds = partnerIds.map(id => new mongoose.Types.ObjectId(id));

    const [bookings, partners] = await Promise.all([
      BookingModel.find({
        $or: [{ _id: { $in: bookingObjectIds } }, { _id: { $in: bookingIds } }]
      }).populate('vehicleId').populate('serviceId').lean(),
      PartnerModel.find({
        $or: [{ _id: { $in: partnerObjectIds } }, { _id: { $in: partnerIds } }]
      }).select('businessName businessAddress phone').lean()
    ]);

    const bookingsMap = new Map();
    bookings.forEach((b: any) => bookingsMap.set(String(b._id), b));

    const partnersMap = new Map();
    partners.forEach((p: any) => partnersMap.set(String(p._id), p));

    return invoicesRaw.map(inv => {
      const bKey = String(inv.bookingId);
      const pKey = String(inv.partnerId);
      return {
        ...inv,
        bookingId: bookingsMap.get(bKey) || inv.bookingId,
        partnerId: partnersMap.get(pKey) || inv.partnerId
      };
    });
  }

  /**
   * Get all invoices forwarded to customer or paid
   */
  public static getMyInvoices = asyncHandler(async (req: Request, res: Response) => {
    const customerId = (req as any).user.userId;
    const custIdStr = String(customerId);
    const custObjectId = new mongoose.Types.ObjectId(custIdStr);

    const invoicesRaw = await InvoiceModel.find({
      $or: [
        { customerId: custIdStr },
        { customerId: custObjectId }
      ],
      status: { $in: ['FORWARDED_TO_CUSTOMER', 'PAID', 'APPROVED_BY_EXECUTIVE'] }
    }).sort({ createdAt: -1 }).lean();

    const invoices = await CustomerInvoiceController.populateInvoiceData(invoicesRaw);

    return successResponse(res, { invoices, total: invoices.length }, 'Customer invoices retrieved successfully');
  });

  /**
   * Get invoice for a specific booking
   */
  public static getInvoiceByBooking = asyncHandler(async (req: Request, res: Response) => {
    const customerId = (req as any).user.userId;
    const { bookingId } = req.params;
    const custIdStr = String(customerId);
    const custObjectId = new mongoose.Types.ObjectId(custIdStr);

    const bookingIdStr = String(bookingId);
    const bookingObjectId = new mongoose.Types.ObjectId(bookingIdStr);

    const invoiceRaw = await InvoiceModel.findOne({
      $and: [
        { $or: [{ bookingId: bookingIdStr }, { bookingId: bookingObjectId }] },
        { $or: [{ customerId: custIdStr }, { customerId: custObjectId }] }
      ],
      status: { $in: ['FORWARDED_TO_CUSTOMER', 'PAID', 'APPROVED_BY_EXECUTIVE'] }
    }).lean();

    if (!invoiceRaw) {
      return successResponse(res, { invoice: null }, 'No forwarded invoice found');
    }

    const [populatedInvoice] = await CustomerInvoiceController.populateInvoiceData([invoiceRaw]);

    return successResponse(res, { invoice: populatedInvoice }, 'Invoice retrieved successfully');
  });
}
