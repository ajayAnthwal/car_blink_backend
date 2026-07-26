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
    const partner = await superAdminPartnersService.updateKycStatus(id, status, reason);
    return successResponse(res, partner, `Partner KYC ${status.toLowerCase()} successfully`);
  });
}

export default SuperAdminPartnersController;
