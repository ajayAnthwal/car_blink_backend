import { Response } from 'express';
import { KycService } from './kyc.service';
import { successResponse } from '../../../../common/utils/apiResponse.util';
import { asyncHandler } from '../../../../common/utils/asyncHandler.util';
import { IRequest } from '../../../../common/interfaces/IRequest';

export class KycController {
  public static submitBusinessKyc = asyncHandler(async (req: IRequest, res: Response) => {
    const userId = req.user?.userId;
    const partner = await KycService.submitBusinessKyc(String(userId), req.body);
    return successResponse(
      res,
      partner,
      'Business KYC & Owner verification submitted successfully',
      200
    );
  });

  public static getBusinessKycStatus = asyncHandler(async (req: IRequest, res: Response) => {
    const userId = req.user?.userId;
    const status = await KycService.getBusinessKycStatus(String(userId));
    return successResponse(res, status, 'Business KYC status retrieved successfully');
  });

  public static submitWorkshopProof = asyncHandler(async (req: IRequest, res: Response) => {
    const userId = req.user?.userId;
    const result = await KycService.submitWorkshopProof(String(userId), req.body);
    return successResponse(res, result, 'Workshop physical proof submitted successfully', 200);
  });

  public static submitBankDetails = asyncHandler(async (req: IRequest, res: Response) => {
    const userId = req.user?.userId;
    const result = await KycService.submitBankDetails(String(userId), req.body);
    return successResponse(res, result, 'Bank details submitted successfully', 200);
  });

  public static submitCapabilities = asyncHandler(async (req: IRequest, res: Response) => {
    const userId = req.user?.userId;
    const result = await KycService.submitCapabilities(String(userId), req.body);
    return successResponse(res, result, 'Workshop capabilities submitted successfully', 200);
  });

  public static getKycChecklist = asyncHandler(async (req: IRequest, res: Response) => {
    const userId = req.user?.userId;
    const checklist = await KycService.getKycChecklist(String(userId));
    return successResponse(res, checklist, 'KYC checklist retrieved successfully');
  });

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


