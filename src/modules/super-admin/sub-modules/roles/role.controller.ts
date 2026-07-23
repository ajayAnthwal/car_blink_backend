import { Request, Response } from 'express';
import CustomRole from './role.model';
import { successResponse } from '../../../../common/utils/apiResponse.util';
import { asyncHandler } from '../../../../common/utils/asyncHandler.util';

export class RoleController {
  public static createRole = asyncHandler(async (req: Request, res: Response) => {
    const { name, description, permissions } = req.body;
    const role = await CustomRole.create({ name, description, permissions });
    return successResponse(res, role, 'Role created successfully', 201);
  });

  public static getRoles = asyncHandler(async (req: Request, res: Response) => {
    const roles = await CustomRole.find();
    return successResponse(res, roles, 'Roles retrieved successfully');
  });

  public static updateRole = asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;
    const { name, description, permissions, isActive } = req.body;
    const role = await CustomRole.findByIdAndUpdate(
      id,
      { name, description, permissions, isActive },
      { new: true }
    );
    if (!role) throw new Error('Role not found');
    return successResponse(res, role, 'Role updated successfully');
  });
}
