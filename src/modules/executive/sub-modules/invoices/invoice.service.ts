import mongoose from 'mongoose';
import { InvoiceModel, IInvoice, IInvoiceItem } from '../../../partner/sub-modules/jobs/invoice.model';
import { JobModel } from '../../../partner/sub-modules/jobs/job.model';
import { PartnerModel } from '../../../partner/partner.model';
import { BookingModel } from '../../../customer/sub-modules/booking/booking.model';
import { NotFoundError } from '../../../../common/errors/NotFoundError';
import { UnauthorizedError } from '../../../../common/errors/UnauthorizedError';
import { ApiError } from '../../../../common/errors/ApiError';
import { ERROR_CODES } from '../../../../common/constants/error-codes.constant';
import { emitToRole, emitToUser } from '../../../../sockets';

export class ExecutiveInvoiceService {
  /**
   * Partner submits an itemized invoice or PDF for executive review
   */
  public static async submitInvoiceByPartner(
    userId: string,
    jobId: string,
    data: {
      invoiceType?: 'ITEMIZED' | 'PDF';
      pdfUrl?: string;
      items?: IInvoiceItem[];
      subtotal?: number;
      taxAmount?: number;
      discount?: number;
      grandTotal?: number;
      notes?: string;
    }
  ): Promise<IInvoice> {
    const partner = await PartnerModel.findOne({ userId });
    if (!partner) {
      throw new NotFoundError('Partner profile not found');
    }

    const job = await JobModel.findById(jobId);
    if (!job) {
      throw new NotFoundError('Job not found');
    }

    if (job.partnerId.toString() !== partner._id.toString()) {
      throw new UnauthorizedError('You are not authorized to submit invoice for this job');
    }

    const booking = await BookingModel.findById(job.bookingId);
    if (!booking) {
      throw new NotFoundError('Booking not found');
    }

    // Format items and calculate grand total if itemized
    const rawItems = Array.isArray(data.items) ? data.items : [];
    const formattedItems: IInvoiceItem[] = rawItems.map((item) => {
      const qty = Math.max(1, Number(item.quantity) || 1);
      const price = Math.max(0, Number(item.unitPrice) || 0);
      return {
        description: item.description?.trim() || 'Service Item',
        quantity: qty,
        unitPrice: price,
        total: qty * price
      };
    });

    const calculatedSubtotal = formattedItems.reduce((sum, item) => sum + item.total, 0);
    const subtotal = data.subtotal !== undefined ? Number(data.subtotal) : calculatedSubtotal;
    const taxAmount = Number(data.taxAmount || 0);
    const discount = Number(data.discount || 0);
    const grandTotal = data.grandTotal !== undefined ? Number(data.grandTotal) : Math.max(0, subtotal + taxAmount - discount);

    // Upsert invoice for this job
    let invoice = await InvoiceModel.findOne({ jobId: job._id });
    if (invoice) {
      invoice.invoiceType = data.invoiceType || 'ITEMIZED';
      invoice.pdfUrl = data.pdfUrl || invoice.pdfUrl;
      invoice.items = formattedItems;
      invoice.subtotal = subtotal;
      invoice.taxAmount = taxAmount;
      invoice.discount = discount;
      invoice.grandTotal = grandTotal;
      invoice.notes = data.notes || invoice.notes;
      invoice.status = 'SUBMITTED_TO_EXECUTIVE';
      await invoice.save();
    } else {
      invoice = await InvoiceModel.create({
        bookingId: job.bookingId,
        jobId: job._id,
        partnerId: partner._id,
        customerId: booking.customerId,
        invoiceType: data.invoiceType || 'ITEMIZED',
        pdfUrl: data.pdfUrl,
        items: formattedItems,
        subtotal,
        taxAmount,
        discount,
        grandTotal,
        notes: data.notes,
        status: 'SUBMITTED_TO_EXECUTIVE'
      });
    }

    // Attach invoice to job
    if (data.pdfUrl) {
      job.invoiceUrl = data.pdfUrl;
    }
    job.finalAmount = grandTotal;
    await job.save();

    // Trigger real-time notifications to Executive Console
    try {
      const payload = {
        invoiceId: invoice._id.toString(),
        jobId: job._id.toString(),
        bookingId: booking._id.toString(),
        partnerName: partner.businessName,
        grandTotal,
        title: 'New Partner Invoice Submitted',
        message: `${partner.businessName} submitted an itemized invoice of ₹${grandTotal} for Executive Review.`
      };

      emitToRole('EXECUTIVE', 'invoice_submitted', payload);
      emitToRole('SUPER_ADMIN', 'invoice_submitted', payload);

      const { notificationService } = require('../../../notification/notification.service');
      const { NOTIFICATION_TYPE, NOTIFICATION_CATEGORY } = require('../../../notification/notification.model');

      await notificationService.sendToRole(
        'EXECUTIVE',
        NOTIFICATION_TYPE.SYSTEM,
        NOTIFICATION_CATEGORY.JOB_STATUS,
        payload.title,
        payload.message,
        payload
      );
    } catch (notifErr: any) {
      const { logger } = require('../../../../config/logger.config');
      logger.warn('Failed to send invoice submission notification:', notifErr);
    }

    return invoice;
  }

  /**
   * Executive retrieves all submitted invoices for review
   */
  public static async getAllInvoicesForExecutive(query: any = {}): Promise<{
    invoices: IInvoice[];
    total: number;
    page: number;
    limit: number;
  }> {
    const page = Math.max(1, parseInt(query.page || '1', 10));
    const limit = Math.max(1, parseInt(query.limit || '10', 10));
    const skip = (page - 1) * limit;

    const filter: any = {};
    if (query.status && query.status !== 'all') {
      filter.status = query.status;
    }

    const [invoices, total] = await Promise.all([
      InvoiceModel.find(filter)
        .populate({ path: 'partnerId', select: 'businessName businessAddress phone userId' })
        .populate({ path: 'customerId', select: 'fullName phone email' })
        .populate({
          path: 'bookingId',
          populate: [
            { path: 'vehicleId', select: 'brand model registrationNumber year' },
            { path: 'serviceId', select: 'name price' },
            { path: 'cityId', select: 'name' }
          ]
        })
        .populate('reviewedByExecutiveId', 'fullName email')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit),
      InvoiceModel.countDocuments(filter)
    ]);

    return { invoices, total, page, limit };
  }

  /**
   * Executive modifies an itemized invoice (line items, price adjustment, discount, executive notes)
   */
  public static async updateInvoiceByExecutive(
    executiveId: string,
    invoiceId: string,
    data: {
      items?: IInvoiceItem[];
      subtotal?: number;
      taxAmount?: number;
      discount?: number;
      grandTotal?: number;
      executiveNotes?: string;
    }
  ): Promise<IInvoice> {
    const invoice = await InvoiceModel.findById(invoiceId);
    if (!invoice) {
      throw new NotFoundError('Invoice not found');
    }

    if (data.items && Array.isArray(data.items)) {
      invoice.items = data.items.map((item) => {
        const qty = Math.max(1, Number(item.quantity) || 1);
        const price = Math.max(0, Number(item.unitPrice) || 0);
        return {
          description: item.description?.trim() || 'Service Item',
          quantity: qty,
          unitPrice: price,
          total: qty * price
        };
      });
    }

    const calculatedSubtotal = invoice.items.reduce((sum, item) => sum + item.total, 0);
    invoice.subtotal = data.subtotal !== undefined ? Number(data.subtotal) : calculatedSubtotal;
    invoice.taxAmount = data.taxAmount !== undefined ? Number(data.taxAmount) : invoice.taxAmount;
    invoice.discount = data.discount !== undefined ? Number(data.discount) : invoice.discount;
    invoice.grandTotal = data.grandTotal !== undefined ? Number(data.grandTotal) : Math.max(0, invoice.subtotal + invoice.taxAmount - invoice.discount);
    
    if (data.executiveNotes !== undefined) {
      invoice.executiveNotes = data.executiveNotes;
    }

    invoice.reviewedByExecutiveId = new mongoose.Types.ObjectId(executiveId);
    await invoice.save();

    // Sync with Job final amount
    await JobModel.findByIdAndUpdate(invoice.jobId, {
      $set: { finalAmount: invoice.grandTotal }
    });

    return invoice;
  }

  /**
   * Executive approves & forwards invoice to Customer
   */
  public static async approveAndForwardInvoice(
    executiveId: string,
    invoiceId: string,
    executiveNotes?: string
  ): Promise<IInvoice> {
    const invoice = await InvoiceModel.findById(invoiceId);
    if (!invoice) {
      throw new NotFoundError('Invoice not found');
    }

    invoice.status = 'FORWARDED_TO_CUSTOMER';
    invoice.reviewedByExecutiveId = new mongoose.Types.ObjectId(executiveId);
    if (executiveNotes) {
      invoice.executiveNotes = executiveNotes;
    }
    await invoice.save();

    // Mark job final amount
    await JobModel.findByIdAndUpdate(invoice.jobId, {
      $set: { finalAmount: invoice.grandTotal }
    });

    // Notify Customer & Partner
    try {
      const payload = {
        invoiceId: invoice._id.toString(),
        bookingId: invoice.bookingId.toString(),
        grandTotal: invoice.grandTotal,
        title: 'Invoice Approved & Ready for Payment',
        message: `Your verified invoice of ₹${invoice.grandTotal} is now available for review and payment.`
      };

      if (invoice.customerId) {
        emitToUser(invoice.customerId.toString(), 'invoice_forwarded', payload);
      }
      if (invoice.partnerId) {
        const partner = await PartnerModel.findById(invoice.partnerId);
        if (partner && partner.userId) {
          emitToUser(partner.userId.toString(), 'invoice_approved_by_executive', payload);
        }
      }

      const { notificationService } = require('../../../notification/notification.service');
      const { NOTIFICATION_TYPE, NOTIFICATION_CATEGORY } = require('../../../notification/notification.model');

      if (invoice.customerId) {
        await notificationService.sendNotification(
          invoice.customerId.toString(),
          NOTIFICATION_TYPE.SMS,
          NOTIFICATION_CATEGORY.JOB_STATUS,
          payload.title,
          payload.message,
          payload
        );
      }
    } catch (notifErr: any) {
      const { logger } = require('../../../../config/logger.config');
      logger.warn('Failed to send invoice approval notification:', notifErr);
    }

    return invoice;
  }

  /**
   * Customer/Executive retrieves invoice by Booking ID
   */
  public static async getInvoiceByBookingId(bookingId: string): Promise<IInvoice | null> {
    return InvoiceModel.findOne({ bookingId })
      .populate('partnerId', 'businessName businessAddress phone')
      .populate('customerId', 'fullName phone email')
      .populate({
        path: 'bookingId',
        populate: [
          { path: 'vehicleId', select: 'brand model registrationNumber' },
          { path: 'serviceId', select: 'name price' }
        ]
      });
  }
}
export default ExecutiveInvoiceService;
