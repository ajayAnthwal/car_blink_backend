import { Response } from 'express';
import { escalationService } from './escalation.service';
import { successResponse } from '../../../../common/utils/apiResponse.util';
import { asyncHandler } from '../../../../common/utils/asyncHandler.util';
import { IRequest } from '../../../../common/interfaces/IRequest';

export class EscalationController {
  public static getAllEscalations = asyncHandler(async (req: IRequest, res: Response) => {
    const escalations = await escalationService.getAllEscalations(req.query);
    return successResponse(res, escalations, 'All platform escalations retrieved successfully');
  });

  public static getEscalationById = asyncHandler(async (req: IRequest, res: Response) => {
    const { id } = req.params;
    const escalation = await escalationService.getEscalationById(id);
    return successResponse(res, escalation, 'Escalation details retrieved successfully');
  });

  public static createEscalation = asyncHandler(async (req: IRequest, res: Response) => {
    const escalation = await escalationService.createEscalation(req.body);
    return successResponse(res, escalation, 'Escalation created successfully', 201);
  });

  public static assignEscalationToSelf = asyncHandler(async (req: IRequest, res: Response) => {
    const executiveId = req.user?.userId;
    const { id } = req.params;
    const escalation = await escalationService.assignEscalationToSelf(String(executiveId), id);
    return successResponse(res, escalation, 'Escalation assigned to executive successfully');
  });

  public static resolveEscalation = asyncHandler(async (req: IRequest, res: Response) => {
    const executiveId = req.user?.userId;
    const { id } = req.params;
    const { resolutionNotes } = req.body;
    const escalation = await escalationService.resolveEscalation(String(executiveId), id, resolutionNotes);
    return successResponse(res, escalation, 'Escalation resolved successfully');
  });
}
