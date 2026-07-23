import { Response } from 'express';
import { VehiclesService } from './vehicles.service';
import { successResponse } from '../../../../common/utils/apiResponse.util';
import { asyncHandler } from '../../../../common/utils/asyncHandler.util';
import { IRequest } from '../../../../common/interfaces/IRequest';

export class VehiclesController {
  public static getAllVehicles = asyncHandler(async (req: IRequest, res: Response) => {
    const result = await VehiclesService.getAllVehicles(req.query);
    return successResponse(res, result, 'All vehicles retrieved successfully');
  });
}
export default VehiclesController;
