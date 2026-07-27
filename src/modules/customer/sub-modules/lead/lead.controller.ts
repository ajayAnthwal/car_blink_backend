import { Request, Response } from 'express';
import { LeadService } from './lead.service';
import { successResponse } from '../../../../common/utils/apiResponse.util';
import { asyncHandler } from '../../../../common/utils/asyncHandler.util';
import { IRequest } from '../../../../common/interfaces/IRequest';

export class LeadController {
  public static createLead = asyncHandler(async (req: IRequest, res: Response) => {
    const data = {
      ...req.body,
      customerId: req.user?.userId || undefined, // Attach logged-in user if available
    };
    const result = await LeadService.createLead(data);
    return successResponse(res, result, 'Lead created successfully', 201);
  });

  public static getLeads = asyncHandler(async (req: Request, res: Response) => {
    const result = await LeadService.getLeads(req.query);
    return successResponse(res, result, 'Leads retrieved successfully');
  });

  public static updateLeadStatus = asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;
    const { status } = req.body;
    const result = await LeadService.updateLeadStatus(id, status);
    return successResponse(res, result, 'Lead status updated successfully');
  });
}
