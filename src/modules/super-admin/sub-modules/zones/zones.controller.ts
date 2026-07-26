import { Response } from 'express';
import { superAdminZonesService } from './zones.service';
import { successResponse } from '../../../../common/utils/apiResponse.util';
import { asyncHandler } from '../../../../common/utils/asyncHandler.util';
import { IRequest } from '../../../../common/interfaces/IRequest';

export class SuperAdminZonesController {
  public static getAllZones = asyncHandler(async (req: IRequest, res: Response) => {
    const data = await superAdminZonesService.getAllZones(req.query);
    return successResponse(res, data, 'Operational zones retrieved successfully');
  });

  public static createZone = asyncHandler(async (req: IRequest, res: Response) => {
    const data = await superAdminZonesService.createZone(req.body);
    return successResponse(res, data, 'Operational zone created successfully');
  });

  public static updateZone = asyncHandler(async (req: IRequest, res: Response) => {
    const { id } = req.params;
    const data = await superAdminZonesService.updateZone(id, req.body);
    return successResponse(res, data, 'Operational zone updated successfully');
  });

  public static deleteZone = asyncHandler(async (req: IRequest, res: Response) => {
    const { id } = req.params;
    const data = await superAdminZonesService.deleteZone(id);
    return successResponse(res, data, 'Operational zone deleted successfully');
  });
}

export default SuperAdminZonesController;
