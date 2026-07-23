import { Router } from 'express';
import { RsaController } from './rsa.controller';
import { validate } from '../../../../middlewares/validate.middleware';
import { createRsaSchema } from './rsa.validation';

const router = Router();

router.post('/', validate({ body: createRsaSchema }), RsaController.requestAssistance);
router.get('/:id', RsaController.getStatus);
router.patch('/:id/cancel', RsaController.cancelRequest);

export default router;