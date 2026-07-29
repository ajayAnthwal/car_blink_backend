import { Response } from 'express';
import { PartnerService } from './partner.service';
import { successResponse } from '../../common/utils/apiResponse.util';
import { asyncHandler } from '../../common/utils/asyncHandler.util';
import { IRequest } from '../../common/interfaces/IRequest';

export class PartnerController {
  public static createProfile = asyncHandler(async (req: IRequest, res: Response) => {
    const userId = req.user?.userId;
    const partner = await PartnerService.createPartnerProfile(String(userId), req.body);
    return successResponse(res, partner, 'Partner profile completed successfully', 201);
  });

  public static getProfile = asyncHandler(async (req: IRequest, res: Response) => {
    const userId = req.user?.userId;
    const partner = await PartnerService.getMyPartnerProfile(String(userId));
    return successResponse(res, partner, 'Partner profile retrieved successfully');
  });

  public static updateProfile = asyncHandler(async (req: IRequest, res: Response) => {
    const userId = req.user?.userId;
    const partner = await PartnerService.updatePartnerProfile(String(userId), req.body);
    return successResponse(res, partner, 'Partner profile updated successfully');
  });

  public static updateCapacity = asyncHandler(async (req: IRequest, res: Response) => {
    const userId = req.user?.userId;
    const partner = await PartnerService.updateCapacity(String(userId), req.body);
    return successResponse(res, partner, 'Partner capacity updated successfully');
  });

  public static getTopWorkshops = asyncHandler(async (req: IRequest, res: Response) => {
    const workshops = await PartnerService.getTopWorkshops();
    return successResponse(res, workshops, 'Top workshops retrieved successfully');
  });
}
export default PartnerController;
