import { Response } from 'express';
import { PartnerWarrantyService } from './warranty.service';
import { successResponse } from '../../../../common/utils/apiResponse.util';
import { asyncHandler } from '../../../../common/utils/asyncHandler.util';
import { IRequest } from '../../../../common/interfaces/IRequest';

export class PartnerWarrantyController {
  public static issueWarranty = asyncHandler(async (req: IRequest, res: Response) => {
    const partnerId = req.user?.userId;
    const warrantyData = {
      ...req.body,
      startDate: req.body.startDate ? new Date(req.body.startDate) : new Date(),
    };
    const result = await PartnerWarrantyService.issueWarranty(String(partnerId), warrantyData);
    return successResponse(res, result, 'Warranty issued successfully', 201);
  });

  public static getIssuedWarranties = asyncHandler(async (req: IRequest, res: Response) => {
    const partnerId = req.user?.userId;
    const result = await PartnerWarrantyService.getIssuedWarranties(String(partnerId), req.query);
    return successResponse(res, result, 'Issued warranties retrieved successfully');
  });
}
export default PartnerWarrantyController;
