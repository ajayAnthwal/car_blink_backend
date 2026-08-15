import { Request, Response, NextFunction } from 'express';
import { ExecutiveInvoiceService } from './invoice.service';

export class ExecutiveInvoiceController {
  /**
   * Submit Invoice by Partner
   */
  public static async submitInvoiceByPartner(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = (req as any).user.userId;
      const { jobId } = req.params;
      const invoice = await ExecutiveInvoiceService.submitInvoiceByPartner(userId, jobId, req.body);
      res.status(201).json({
        success: true,
        message: 'Invoice submitted successfully for Executive review',
        data: invoice
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get all invoices for Executive
   */
  public static async getAllInvoices(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const result = await ExecutiveInvoiceService.getAllInvoicesForExecutive(req.query);
      res.status(200).json({
        success: true,
        data: result
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Modify invoice by Executive
   */
  public static async updateInvoice(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const executiveId = (req as any).user.userId;
      const { id } = req.params;
      const invoice = await ExecutiveInvoiceService.updateInvoiceByExecutive(executiveId, id, req.body);
      res.status(200).json({
        success: true,
        message: 'Invoice modified successfully by Executive',
        data: invoice
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Approve & Forward Invoice to Customer
   */
  public static async approveAndForwardInvoice(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const executiveId = (req as any).user.userId;
      const { id } = req.params;
      const { executiveNotes } = req.body;
      const invoice = await ExecutiveInvoiceService.approveAndForwardInvoice(executiveId, id, executiveNotes);
      res.status(200).json({
        success: true,
        message: 'Invoice approved and forwarded to customer',
        data: invoice
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get invoice by Booking ID (For Customer / Executive)
   */
  public static async getInvoiceByBookingId(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { bookingId } = req.params;
      const invoice = await ExecutiveInvoiceService.getInvoiceByBookingId(bookingId);
      res.status(200).json({
        success: true,
        data: invoice
      });
    } catch (error) {
      next(error);
    }
  }
}
export default ExecutiveInvoiceController;
