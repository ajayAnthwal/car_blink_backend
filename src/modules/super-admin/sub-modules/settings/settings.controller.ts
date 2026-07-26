import { Response } from 'express';
import { superAdminSettingsService } from './settings.service';
import { successResponse } from '../../../../common/utils/apiResponse.util';
import { asyncHandler } from '../../../../common/utils/asyncHandler.util';
import { IRequest } from '../../../../common/interfaces/IRequest';

export class SuperAdminSettingsController {
  public static getSettings = asyncHandler(async (req: IRequest, res: Response) => {
    const settings = await superAdminSettingsService.getSettings();
    return successResponse(res, settings, 'Settings retrieved successfully');
  });

  public static updateSettings = asyncHandler(async (req: IRequest, res: Response) => {
    const settings = await superAdminSettingsService.updateSettings(req.body);
    return successResponse(res, settings, 'Settings updated successfully');
  });
}

export default SuperAdminSettingsController;
