import { Response } from 'express';
import { superAdminTicketsService } from './tickets.service';
import { successResponse } from '../../../../common/utils/apiResponse.util';
import { asyncHandler } from '../../../../common/utils/asyncHandler.util';
import { IRequest } from '../../../../common/interfaces/IRequest';

export class SuperAdminTicketsController {
  public static getAllTickets = asyncHandler(async (req: IRequest, res: Response) => {
    const query = req.query;
    const result = await superAdminTicketsService.getAllTickets(query);
    return successResponse(res, result, 'Tickets retrieved successfully');
  });

  public static getTicketDetails = asyncHandler(async (req: IRequest, res: Response) => {
    const ticket = await superAdminTicketsService.getTicketDetails(req.params.id);
    return successResponse(res, ticket, 'Ticket details retrieved successfully');
  });

  public static updateStatus = asyncHandler(async (req: IRequest, res: Response) => {
    const { status } = req.body;
    const ticket = await superAdminTicketsService.updateStatus(req.params.id, status);
    return successResponse(res, ticket, 'Ticket status updated successfully');
  });

  public static addReply = asyncHandler(async (req: IRequest, res: Response) => {
    const { message } = req.body;
    const adminId = req.user?.userId as string;
    const ticket = await superAdminTicketsService.addReply(req.params.id, adminId, message);
    return successResponse(res, ticket, 'Reply added successfully');
  });
}

export default SuperAdminTicketsController;
