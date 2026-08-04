import { Request, Response } from 'express';
import { paymentService } from './payment.service';
import { successResponse } from '../../common/utils/apiResponse.util';
import { asyncHandler } from '../../common/utils/asyncHandler.util';
import { IRequest } from '../../common/interfaces/IRequest';

export class PaymentController {
  public static initiate = asyncHandler(async (req: IRequest, res: Response) => {
    const customerId = String(req.user?.userId);
    const { bookingId, amount, paymentType, couponCode, useRewardPoints } = req.body;

    const result = await paymentService.initiatePayment(customerId, bookingId, amount, paymentType, couponCode, useRewardPoints);
    return successResponse(res, result, 'Payment initiated successfully', 201);
  });

  public static verify = asyncHandler(async (req: IRequest, res: Response) => {
    const customerId = String(req.user?.userId);
    const { paymentId, orderId, signature } = req.body;

    const result = await paymentService.verifyAndCapturePayment(customerId, {
      paymentId,
      orderId,
      signature,
    });
    return successResponse(res, result, 'Payment verified and captured successfully');
  });

  public static markOffline = asyncHandler(async (req: IRequest, res: Response) => {
    try {
      const userId = String(req.user?.userId);
      const isPartner = req.user?.role === 'PARTNER'; // Check if the user is a partner
      const { bookingId, amount, paymentType, couponCode } = req.body;
  
      const result = await paymentService.markOfflinePayment(bookingId, amount, paymentType, userId, isPartner, couponCode);
      return successResponse(res, result, 'Offline payment marked successfully');
    } catch (err: any) {
      require('fs').writeFileSync('c:\\Users\\ajay anthwal\\Desktop\\car_blink_backend\\offline_error.txt', JSON.stringify({ message: err.message, stack: err.stack }));
      throw err;
    }
  });

  public static verifyOffline = asyncHandler(async (req: IRequest, res: Response) => {
    const partnerId = String(req.user?.userId);
    const { paymentId } = req.body;

    const result = await paymentService.verifyOfflinePayment(paymentId, partnerId);
    return successResponse(res, result, 'Offline payment verified successfully');
  });

  public static getHistory = asyncHandler(async (req: IRequest, res: Response) => {
    const customerId = String(req.user?.userId);
    const result = await paymentService.getMyPayments(customerId, req.query);
    return successResponse(res, result, 'Payment history retrieved successfully');
  });

  public static getById = asyncHandler(async (req: IRequest, res: Response) => {
    const customerId = String(req.user?.userId);
    const result = await paymentService.getPaymentById(customerId, req.params.id);
    return successResponse(res, result, 'Payment details retrieved successfully');
  });

  public static webhook = asyncHandler(async (req: Request, res: Response) => {
    const signature = req.headers['x-razorpay-signature'] as string | undefined;
    const result = await paymentService.handleWebhook(req.body, signature);
    return successResponse(res, result, 'Webhook processed successfully');
  });
}
