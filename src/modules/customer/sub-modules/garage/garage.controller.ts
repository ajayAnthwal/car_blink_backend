import { Response } from 'express';
import { GarageService } from './garage.service';
import { successResponse } from '../../../../common/utils/apiResponse.util';
import { asyncHandler } from '../../../../common/utils/asyncHandler.util';
import { IRequest } from '../../../../common/interfaces/IRequest';

export class GarageController {
  public static addVehicle = asyncHandler(async (req: IRequest, res: Response) => {
    const customerId = req.user?.userId;
    const vehicle = await GarageService.addVehicle(String(customerId), req.body);
    return successResponse(res, vehicle, 'Vehicle added to garage successfully', 201);
  });

  public static getMyVehicles = asyncHandler(async (req: IRequest, res: Response) => {
    const customerId = req.user?.userId;
    const vehicles = await GarageService.getMyVehicles(String(customerId));
    return successResponse(res, vehicles, 'Garage vehicles retrieved successfully');
  });

  public static updateVehicle = asyncHandler(async (req: IRequest, res: Response) => {
    const customerId = req.user?.userId;
    const { id } = req.params;
    const vehicle = await GarageService.updateVehicle(String(customerId), id, req.body);
    return successResponse(res, vehicle, 'Vehicle updated successfully');
  });

  public static deleteVehicle = asyncHandler(async (req: IRequest, res: Response) => {
    const customerId = req.user?.userId;
    const { id } = req.params;
    const result = await GarageService.deleteVehicle(String(customerId), id);
    return successResponse(res, result, 'Vehicle removed from garage successfully');
  });
}
export default GarageController;
