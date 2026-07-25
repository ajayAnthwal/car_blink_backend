import { Router } from 'express';
import { UploadController } from './upload.controller';
import { authMiddleware } from '../../middlewares/auth.middleware';
import { uploadDocument } from '../../config/multer.config';

const router = Router();

router.post(
  '/',
  authMiddleware as any,
  uploadDocument.single('file'),
  UploadController.uploadSingleFile
);

export default router;
