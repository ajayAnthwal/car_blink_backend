import { Response } from 'express';
import { superAdminPartnersService } from './partners.service';
import { successResponse } from '../../../../common/utils/apiResponse.util';
import { asyncHandler } from '../../../../common/utils/asyncHandler.util';
import { IRequest } from '../../../../common/interfaces/IRequest';

export class SuperAdminPartnersController {
  public static getAllPartners = asyncHandler(async (req: IRequest, res: Response) => {
    const query = req.query;
    const result = await superAdminPartnersService.getAllPartners(query);
    return successResponse(res, result, 'Partners retrieved successfully');
  });

  public static getPartnerDetails = asyncHandler(async (req: IRequest, res: Response) => {
    const { id } = req.params;
    const partner = await superAdminPartnersService.getPartnerDetails(id);
    return successResponse(res, partner, 'Partner details retrieved successfully');
  });

  public static updateKycStatus = asyncHandler(async (req: IRequest, res: Response) => {
    const { id } = req.params;
    const { status, reason } = req.body;
    const partner = await superAdminPartnersService.updateKycStatus(id, status, reason, req.user?.userId);
    return successResponse(res, partner, `Partner KYC ${status.toLowerCase()} successfully`);
  });

  public static getPartnerReviewDetails = asyncHandler(async (req: IRequest, res: Response) => {
    const { id } = req.params;
    const { PartnerReviewService } = require('../../../partner/partner-review.service');
    const result = await PartnerReviewService.getPartnerReviewDetails(id);
    return successResponse(res, result, 'Partner review details retrieved successfully');
  });

  public static submitReviewAction = asyncHandler(async (req: IRequest, res: Response) => {
    const { id } = req.params;
    const { action, notes } = req.body;
    const { PartnerReviewService } = require('../../../partner/partner-review.service');
    const verifier = {
      userId: String(req.user?.userId),
      role: String(req.user?.role),
      fullName: (req.user as any)?.fullName,
    };
    const result = await PartnerReviewService.submitReviewAction(id, { action, notes }, verifier);
    return successResponse(res, result, result.message);
  });
}

export default SuperAdminPartnersController;
