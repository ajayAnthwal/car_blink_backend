import { Response } from 'express';
import { StaffService } from './staff.service';
import { successResponse } from '../../../../common/utils/apiResponse.util';
import { asyncHandler } from '../../../../common/utils/asyncHandler.util';
import { IRequest } from '../../../../common/interfaces/IRequest';

export class StaffController {
  public static addStaff = asyncHandler(async (req: IRequest, res: Response) => {
    const userId = req.user?.userId;
    const staff = await StaffService.addStaff(String(userId), req.body);
    return successResponse(res, staff, 'Staff member added successfully', 201);
  });

  public static getStaff = asyncHandler(async (req: IRequest, res: Response) => {
    const userId = req.user?.userId;
    const staff = await StaffService.getStaff(String(userId));
    return successResponse(res, staff, 'Staff members retrieved successfully');
  });

  public static updateStatus = asyncHandler(async (req: IRequest, res: Response) => {
    const userId = req.user?.userId;
    const { id } = req.params;
    const { status } = req.body;
    const staff = await StaffService.updateStatus(String(userId), id, status);
    return successResponse(res, staff, 'Staff status updated successfully');
  });
}
export default StaffController;