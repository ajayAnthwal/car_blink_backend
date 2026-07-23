import { Request, Response } from 'express';
import AuditLog from './audit-log.model';
import { successResponse } from '../../../../common/utils/apiResponse.util';
import { asyncHandler } from '../../../../common/utils/asyncHandler.util';

export class AuditLogController {
  public static getAuditLogs = asyncHandler(async (req: Request, res: Response) => {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    const skip = (page - 1) * limit;

    const filter: any = {};
    if (req.query.userId) filter.userId = req.query.userId;
    if (req.query.userRole) filter.userRole = req.query.userRole;
    if (req.query.action) filter.action = { $regex: req.query.action, $options: 'i' };
    if (req.query.status) filter.status = req.query.status;

    const logs = await AuditLog.find(filter)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .populate('userId', 'fullName email phone');

    const total = await AuditLog.countDocuments(filter);

    return successResponse(res, { logs, total, page, limit }, 'Audit logs retrieved successfully');
  });
}
