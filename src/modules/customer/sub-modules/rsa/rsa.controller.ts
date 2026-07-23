import { Response } from 'express';
import { RsaService } from './rsa.service';
import { successResponse } from '../../../../common/utils/apiResponse.util';
import { asyncHandler } from '../../../../common/utils/asyncHandler.util';
import { IRequest } from '../../../../common/interfaces/IRequest';

export class RsaController {
  public static requestAssistance = asyncHandler(async (req: IRequest, res: Response) => {
    const customerId = req.user?.userId;
    const rsa = await RsaService.requestAssistance(String(customerId), req.body);
    return successResponse(res, rsa, 'Roadside assistance requested successfully', 201);
  });

  public static getStatus = asyncHandler(async (req: IRequest, res: Response) => {
    const customerId = req.user?.userId;
    const { id } = req.params;
    const rsa = await RsaService.getStatus(String(customerId), id);
    return successResponse(res, rsa, 'RSA request status retrieved successfully');
  });

  public static cancelRequest = asyncHandler(async (req: IRequest, res: Response) => {
    const customerId = req.user?.userId;
    const { id } = req.params;
    const rsa = await RsaService.cancelRequest(String(customerId), id);
    return successResponse(res, rsa, 'RSA request cancelled successfully');
  });
}
export default RsaController;