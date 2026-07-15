import { Request, Response } from 'express';
import { paymentService } from './payment.service';
import { successResponse } from '../../common/utils/apiResponse.util';
import { asyncHandler } from '../../common/utils/asyncHandler.util';
import { IRequest } from '../../common/interfaces/IRequest';

export class PaymentController {
  public static initiate = asyncHandler(async (req: IRequest, res: Response) => {
    const customerId = String(req.user?.userId);
    const { bookingId, amount, paymentType } = req.body;

    const result = await paymentService.initiatePayment(customerId, bookingId, amount, paymentType);
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
