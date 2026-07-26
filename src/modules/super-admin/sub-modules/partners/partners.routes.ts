import { Router } from 'express';
import { SuperAdminPartnersController } from './partners.controller';

const router = Router();

router.get('/', SuperAdminPartnersController.getAllPartners);
router.get('/:id', SuperAdminPartnersController.getPartnerDetails);
router.put('/:id/kyc', SuperAdminPartnersController.updateKycStatus);

export default router;
