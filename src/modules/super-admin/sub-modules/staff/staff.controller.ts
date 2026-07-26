import { Response } from 'express';
import { superAdminStaffService } from './staff.service';
import { successResponse } from '../../../../common/utils/apiResponse.util';
import { asyncHandler } from '../../../../common/utils/asyncHandler.util';
import { IRequest } from '../../../../common/interfaces/IRequest';

export class SuperAdminStaffController {
  public static getAllStaff = asyncHandler(async (req: IRequest, res: Response) => {
    const result = await superAdminStaffService.getAllStaff(req.query);
    return successResponse(res, result, 'Staff retrieved successfully');
  });

  public static createStaff = asyncHandler(async (req: IRequest, res: Response) => {
    const staff = await superAdminStaffService.createStaff(req.body);
    return successResponse(res, staff, 'Staff created successfully', 201);
  });

  public static getRoles = asyncHandler(async (req: IRequest, res: Response) => {
    const roles = await superAdminStaffService.getRoles();
    return successResponse(res, roles, 'Roles retrieved successfully');
  });
}

export default SuperAdminStaffController;
