import { Response } from 'express';
import { assignmentService } from './assignment.service';
import { successResponse } from '../../../../common/utils/apiResponse.util';
import { asyncHandler } from '../../../../common/utils/asyncHandler.util';
import { IRequest } from '../../../../common/interfaces/IRequest';

export class AssignmentController {
  public static getAllLeads = asyncHandler(async (req: IRequest, res: Response) => {
    const leads = await assignmentService.getAllLeads(req.query);
    return successResponse(res, leads, 'All platform leads retrieved successfully');
  });

  public static getLeadById = asyncHandler(async (req: IRequest, res: Response) => {
    const { id } = req.params;
    const lead = await assignmentService.getLeadById(id);
    return successResponse(res, lead, 'Lead details retrieved successfully');
  });

  public static assignPartnerToLead = asyncHandler(async (req: IRequest, res: Response) => {
    const executiveId = req.user?.userId;
    const { id } = req.params;
    const { partnerIds, notes } = req.body;
    const assignment = await assignmentService.assignPartnerToLead(
      String(executiveId),
      id,
      partnerIds,
      notes
    );
    return successResponse(res, assignment, 'Partners assigned to lead successfully');
  });
  public static forwardQuoteToCustomer = asyncHandler(async (req: IRequest, res: Response) => {
    const executiveId = req.user?.userId;
    const { id } = req.params;
    const { bidIds, notes } = req.body;
    const booking = await assignmentService.forwardQuoteToCustomer(
      String(executiveId),
      id,
      bidIds,
      notes
    );
    return successResponse(res, booking, 'Quote(s) forwarded to customer successfully');
  });

  public static updateLead = asyncHandler(async (req: IRequest, res: Response) => {
    const { id } = req.params;
    const { followUpDate, remarks } = req.body;
    const booking = await assignmentService.updateLead(id, { followUpDate, remarks });
    return successResponse(res, booking, 'Lead updated successfully');
  });

  public static convertWebsiteLeadToBooking = asyncHandler(async (req: IRequest, res: Response) => {
    const { id } = req.params;
    const { serviceId, cityId, vehicleBrand, vehicleModel } = req.body;
    const booking = await assignmentService.convertWebsiteLeadToBooking(id, serviceId, cityId, vehicleBrand, vehicleModel);
    return successResponse(res, booking, 'Website lead converted to booking successfully');
  });
}
