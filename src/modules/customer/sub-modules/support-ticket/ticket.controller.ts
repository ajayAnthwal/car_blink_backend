import { Response } from 'express';
import { TicketService } from './ticket.service';
import { successResponse } from '../../../../common/utils/apiResponse.util';
import { asyncHandler } from '../../../../common/utils/asyncHandler.util';
import { IRequest } from '../../../../common/interfaces/IRequest';

export class TicketController {
  public static createTicket = asyncHandler(async (req: IRequest, res: Response) => {
    const customerId = req.user?.userId;
    const ticket = await TicketService.createTicket(String(customerId), req.body);
    return successResponse(res, ticket, 'Support ticket created successfully', 201);
  });

  public static getMyTickets = asyncHandler(async (req: IRequest, res: Response) => {
    const customerId = req.user?.userId;
    const result = await TicketService.getMyTickets(String(customerId), req.query);
    return successResponse(res, result, 'My support tickets retrieved successfully');
  });

  public static getTicketById = asyncHandler(async (req: IRequest, res: Response) => {
    const customerId = req.user?.userId;
    const { id } = req.params;
    const ticket = await TicketService.getTicketById(String(customerId), id);
    return successResponse(res, ticket, 'Support ticket details retrieved successfully');
  });

  public static replyToTicket = asyncHandler(async (req: IRequest, res: Response) => {
    const customerId = req.user?.userId;
    const { id } = req.params;
    const { message } = req.body;
    const ticket = await TicketService.replyToTicket(String(customerId), id, message);
    return successResponse(res, ticket, 'Reply added to ticket successfully');
  });
}
export default TicketController;
