import { Response } from 'express';
import { KycService } from './kyc.service';
import { successResponse } from '../../../../common/utils/apiResponse.util';
import { asyncHandler } from '../../../../common/utils/asyncHandler.util';
import { IRequest } from '../../../../common/interfaces/IRequest';

export class KycController {
  public static uploadKycDocument = asyncHandler(async (req: IRequest, res: Response) => {
    const userId = req.user?.userId;
    const doc = await KycService.uploadKycDocument(String(userId), req.body);
    return successResponse(res, doc, 'KYC document uploaded successfully', 201);
  });

  public static getMyKycDocuments = asyncHandler(async (req: IRequest, res: Response) => {
    const userId = req.user?.userId;
    const docs = await KycService.getMyKycDocuments(String(userId));
    return successResponse(res, docs, 'KYC documents retrieved successfully');
  });
}
export default KycController;
