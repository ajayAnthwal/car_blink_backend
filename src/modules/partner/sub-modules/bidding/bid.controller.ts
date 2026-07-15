import { Response } from 'express';
import { BidService } from './bid.service';
import { successResponse } from '../../../../common/utils/apiResponse.util';
import { asyncHandler } from '../../../../common/utils/asyncHandler.util';
import { IRequest } from '../../../../common/interfaces/IRequest';

export class BidController {
  public static getAvailableLeads = asyncHandler(async (req: IRequest, res: Response) => {
    const userId = req.user?.userId;
    const result = await BidService.getAvailableLeads(String(userId), req.query);
    return successResponse(res, result, 'Available booking leads retrieved successfully');
  });

  public static placeBid = asyncHandler(async (req: IRequest, res: Response) => {
    const userId = req.user?.userId;
    const bid = await BidService.placeBid(String(userId), req.body);
    return successResponse(res, bid, 'Bid placed successfully on booking lead', 201);
  });

  public static getMyBids = asyncHandler(async (req: IRequest, res: Response) => {
    const userId = req.user?.userId;
    const result = await BidService.getMyBids(String(userId), req.query);
    return successResponse(res, result, 'My bids retrieved successfully');
  });

  public static withdrawBid = asyncHandler(async (req: IRequest, res: Response) => {
    const userId = req.user?.userId;
    const { id } = req.params;
    const bid = await BidService.withdrawBid(String(userId), id);
    return successResponse(res, bid, 'Bid withdrawn successfully');
  });
}
export default BidController;
