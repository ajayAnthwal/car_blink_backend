import multer from 'multer';
import { Request } from 'express';
import { ApiError } from '../common/errors/ApiError';
import { ERROR_CODES } from '../common/constants/error-codes.constant';

export const createUploader = (allowedMimeTypes: string[], maxSizeMB: number) => {
  const storage = multer.memoryStorage();

  const fileFilter = (req: Request, file: Express.Multer.File, callback: multer.FileFilterCallback) => {
    if (allowedMimeTypes.includes(file.mimetype)) {
      callback(null, true);
    } else {
      callback(
        new ApiError(
          400,
          `Only the following file formats are allowed: ${allowedMimeTypes.join(', ')}`,
          ERROR_CODES.VALIDATION_ERROR
        ) as any
      );
    }
  };

  return multer({
    storage,
    limits: {
      fileSize: maxSizeMB * 1024 * 1024,
    },
    fileFilter,
  });
};

// Default preconfigured instance for images (jpeg, jpg, png, webp) max 5MB
export const uploadImage = createUploader(['image/jpeg', 'image/jpg', 'image/png', 'image/webp'], 5);

// Preconfigured instance for documents including PDFs max 50MB
export const uploadDocument = createUploader(['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'application/pdf'], 50);
