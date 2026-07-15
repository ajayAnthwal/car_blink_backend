import { Response } from 'express';
import { WarrantyService } from './warranty.service';
import { successResponse } from '../../../../common/utils/apiResponse.util';
import { asyncHandler } from '../../../../common/utils/asyncHandler.util';
import { IRequest } from '../../../../common/interfaces/IRequest';

export class WarrantyController {
  public static getMyWarranties = asyncHandler(async (req: IRequest, res: Response) => {
    const customerId = req.user?.userId;
    const result = await WarrantyService.getMyWarranties(String(customerId), req.query);
    return successResponse(res, result, 'Warranties retrieved successfully');
  });

  public static getWarrantyById = asyncHandler(async (req: IRequest, res: Response) => {
    const customerId = req.user?.userId;
    const { id } = req.params;
    const warranty = await WarrantyService.getWarrantyById(String(customerId), id);
    return successResponse(res, warranty, 'Warranty details retrieved successfully');
  });
}
export default WarrantyController;
