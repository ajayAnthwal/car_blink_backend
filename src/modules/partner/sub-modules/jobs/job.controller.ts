import { Response } from 'express';
import { JobService } from './job.service';
import { successResponse } from '../../../../common/utils/apiResponse.util';
import { asyncHandler } from '../../../../common/utils/asyncHandler.util';
import { IRequest } from '../../../../common/interfaces/IRequest';

export class JobController {
  public static getMyJobs = asyncHandler(async (req: IRequest, res: Response) => {
    const userId = req.user?.userId;
    const result = await JobService.getMyJobs(String(userId), req.query);
    return successResponse(res, result, 'My jobs retrieved successfully');
  });

  public static startJob = asyncHandler(async (req: IRequest, res: Response) => {
    const userId = req.user?.userId;
    const { id } = req.params;
    const job = await JobService.startJob(String(userId), id);
    return successResponse(res, job, 'Job started successfully');
  });

  public static completeJob = asyncHandler(async (req: IRequest, res: Response) => {
    const userId = req.user?.userId;
    const { id } = req.params;
    const job = await JobService.completeJob(String(userId), id, req.body);
    return successResponse(res, job, 'Job completed successfully');
  });

  public static uploadInvoice = asyncHandler(async (req: IRequest, res: Response) => {
    const userId = req.user?.userId;
    const { id } = req.params;
    const { invoiceUrl } = req.body;
    const job = await JobService.uploadJobInvoice(String(userId), id, invoiceUrl);
    return successResponse(res, job, 'Invoice uploaded successfully');
  });

  public static uploadPhotos = asyncHandler(async (req: IRequest, res: Response) => {
    const userId = req.user?.userId;
    const { id } = req.params;
    const { photos, type } = req.body; // type: 'before' | 'after'
    const job = await JobService.uploadJobPhotos(String(userId), id, photos, type);
    return successResponse(res, job, 'Job photos uploaded and synced successfully');
  });

  public static deletePhoto = asyncHandler(async (req: IRequest, res: Response) => {
    const userId = req.user?.userId;
    const { id } = req.params;
    const { photoUrl, type } = req.body; // type: 'before' | 'after'
    const job = await JobService.deleteJobPhoto(String(userId), id, photoUrl, type);
    return successResponse(res, job, 'Job photo deleted successfully');
  });

  public static uploadWarranty = asyncHandler(async (req: IRequest, res: Response) => {
    const userId = req.user?.userId;
    const { id } = req.params;
    const warranty = await JobService.uploadJobWarranty(String(userId), id, req.body);
    return successResponse(res, warranty, 'Warranty issued successfully for completed job', 201);
  });
  public static requestExtension = asyncHandler(async (req: IRequest, res: Response) => {
    const userId = req.user?.userId;
    const { id } = req.params;
    const { partName, cost } = req.body;
    const job = await JobService.requestJobExtension(String(userId), id, { partName, cost });
    return successResponse(res, job, 'Job extension requested successfully');
  });

  public static assignStaff = asyncHandler(async (req: IRequest, res: Response) => {
    const userId = req.user?.userId;
    const { id } = req.params;
    const staffId = req.body?.staffId || req.body?.mechanicId || (typeof req.body === 'string' ? req.body : null);

    if (!staffId) {
      return res.status(400).json({ success: false, message: 'staffId or mechanicId is required' });
    }

    const job = await JobService.assignStaff(String(userId), id, staffId);
    return successResponse(res, job, 'Staff assigned successfully');
  });
}
export default JobController;
