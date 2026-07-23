import { Response } from 'express';
import { PosService } from './pos.service';
import { successResponse } from '../../../../common/utils/apiResponse.util';
import { asyncHandler } from '../../../../common/utils/asyncHandler.util';
import { IRequest } from '../../../../common/interfaces/IRequest';

export class PosController {
  public static generateInvoice = asyncHandler(async (req: IRequest, res: Response) => {
    const userId = req.user?.userId;
    const invoice = await PosService.generateInvoice(String(userId), req.body);
    return successResponse(res, invoice, 'Offline POS invoice generated successfully', 201);
  });

  public static getInvoices = asyncHandler(async (req: IRequest, res: Response) => {
    const userId = req.user?.userId;
    const invoices = await PosService.getInvoices(String(userId));
    return successResponse(res, invoices, 'POS invoices retrieved successfully');
  });
}
export default PosController;