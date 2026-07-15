import { Request, Response } from 'express';
import { UploadService } from './upload.service';
import { successResponse } from '../../common/utils/apiResponse.util';
import { asyncHandler } from '../../common/utils/asyncHandler.util';
import { ApiError } from '../../common/errors/ApiError';
import { ERROR_CODES } from '../../common/constants/error-codes.constant';

export class UploadController {
  public static uploadSingleFile = asyncHandler(async (req: Request, res: Response) => {
    if (!req.file) {
      throw new ApiError(400, 'No file uploaded', ERROR_CODES.VALIDATION_ERROR);
    }

    const folder = req.body.folder || 'general';
    const fileUrl = await UploadService.uploadFileToCloud(
      req.file.buffer,
      req.file.originalname,
      folder
    );

    return successResponse(res, { fileUrl }, 'File uploaded successfully');
  });
}
export default UploadController;
