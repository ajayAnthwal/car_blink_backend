import { Response } from 'express';
import { executiveService } from './executive.service';
import { successResponse } from '../../common/utils/apiResponse.util';
import { asyncHandler } from '../../common/utils/asyncHandler.util';
import { IRequest } from '../../common/interfaces/IRequest';

export class ExecutiveController {

  public static getAllWarranties = asyncHandler(async (req: IRequest, res: Response) => {
    const data = await executiveService.getAllWarranties(req.query);
    return successResponse(res, data, 'Warranties retrieved successfully');
  });

  public static getCustomerStatusOverview = asyncHandler(async (req: IRequest, res: Response) => {
    const overview = await executiveService.getCustomerStatusOverview(req.query);
    return successResponse(res, overview, 'Customer status overview retrieved successfully');
  });

  public static getPartnerStatusOverview = asyncHandler(async (req: IRequest, res: Response) => {
    const overview = await executiveService.getPartnerStatusOverview(req.query);
    return successResponse(res, overview, 'Partner status overview retrieved successfully');
  });

  public static clickToCall = asyncHandler(async (req: IRequest, res: Response) => {
    const { targetUserId, phoneNumber } = req.body;
    
    // In a real application, you would integrate with Exotel, Twilio, etc here.
    // For now, this is a dummy integration.
    
    console.log(`[TELEPHONY] Executive ${req.user?.userId} initiated a call to ${phoneNumber || targetUserId}`);
    
    return successResponse(res, {
      status: 'INITIATED',
      callId: `CALL-${Date.now()}`,
      message: 'Call has been initiated. Waiting for connection.'
    }, 'Call initiated successfully');
  });

  public static verifyCustomer = asyncHandler(async (req: IRequest, res: Response) => {
    const { id } = req.params;
    const result = await executiveService.verifyCustomer(id);
    return successResponse(res, result, 'Customer verified successfully');
  });

  public static verifyPartner = asyncHandler(async (req: IRequest, res: Response) => {
    const { id } = req.params;
    const { status = 'APPROVED', reason } = req.body;
    const result = await executiveService.verifyPartner(id, status, reason, req.user?.userId);
    return successResponse(res, result, `Partner ${status.toLowerCase()} successfully`);
  });

  public static getPartnerReviewDetails = asyncHandler(async (req: IRequest, res: Response) => {
    const { id } = req.params;
    const { PartnerReviewService } = require('../partner/partner-review.service');
    const result = await PartnerReviewService.getPartnerReviewDetails(id);
    return successResponse(res, result, 'Partner review details retrieved successfully');
  });

  public static submitReviewAction = asyncHandler(async (req: IRequest, res: Response) => {
    const { id } = req.params;
    const { action, notes } = req.body;
    const { PartnerReviewService } = require('../partner/partner-review.service');
    const verifier = {
      userId: String(req.user?.userId),
      role: String(req.user?.role),
      fullName: (req.user as any)?.fullName,
    };
    const result = await PartnerReviewService.submitReviewAction(id, { action, notes }, verifier);
    return successResponse(res, result, result.message);
  });

  public static getPendingExtraWork = asyncHandler(async (req: IRequest, res: Response) => {
    const data = await executiveService.getPendingExtraWork(
      String(req.user?.userId),
      String(req.user?.role),
      req.query
    );
    return successResponse(res, data, 'Pending extra-work requests retrieved successfully');
  });

  public static reviewExtraWork = asyncHandler(async (req: IRequest, res: Response) => {
    const { jobId, extId } = req.params;
    const { action, note } = req.body;
    const result = await executiveService.reviewExtraWork(
      String(req.user?.userId),
      String(req.user?.role),
      jobId,
      extId,
      action,
      note
    );
    return successResponse(res, result, result.message);
  });
}
