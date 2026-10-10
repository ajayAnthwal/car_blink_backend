import { Router } from 'express';
import { authMiddleware } from '../../middlewares/auth.middleware';
import { roleMiddleware } from '../../middlewares/role.middleware';
import inventoryRouter from "./sub-modules/inventory/inventory.routes";
import staffRouter from "./sub-modules/staff/staff.routes";
import posRouter from "./sub-modules/pos/pos.routes";
import warrantyRouter from "./sub-modules/warranty/warranty.routes";
import { validate } from '../../middlewares/validate.middleware';
import { ROLES } from '../../common/constants/roles.constant';

import { PartnerController } from './partner.controller';
import { KycController } from './sub-modules/kyc/kyc.controller';
import { BidController } from './sub-modules/bidding/bid.controller';
import { JobController } from './sub-modules/jobs/job.controller';
import { EarningsController } from './sub-modules/earnings/earnings.controller';

import { placeBidSchema } from './sub-modules/bidding/bid.validation';
import {
  submitBusinessKycSchema,
  submitWorkshopProofSchema,
  submitBankDetailsSchema,
  submitWorkshopCapabilitiesSchema,
} from './sub-modules/kyc/kyc.validation';
import {
  requireApprovedPartner,
  checkPartnerSuspension,
} from './middlewares/partner-access.middleware';

const router = Router();

// Public Routes
router.get('/public/top-workshops', PartnerController.getTopWorkshops);

// Secure all partner routes with auth + role restriction
router.use(authMiddleware as any);
router.use(roleMiddleware([ROLES.PARTNER]) as any);

// 1. Partner Profile & Capacity
router.post('/profile', checkPartnerSuspension, PartnerController.createProfile);
router.get('/profile', checkPartnerSuspension, PartnerController.getProfile);
router.patch('/profile', checkPartnerSuspension, PartnerController.updateProfile);
router.patch('/capacity', requireApprovedPartner, PartnerController.updateCapacity);

// 2. KYC & Onboarding Steps (Accessible before approval, blocked if suspended)
router.post('/kyc', checkPartnerSuspension, KycController.uploadKycDocument);
router.get('/kyc', checkPartnerSuspension, KycController.getMyKycDocuments);
router.post('/kyc/business', checkPartnerSuspension, validate({ body: submitBusinessKycSchema }), KycController.submitBusinessKyc);
router.get('/kyc/business/status', KycController.getBusinessKycStatus);
router.post('/kyc/workshop-proof', checkPartnerSuspension, validate({ body: submitWorkshopProofSchema }), KycController.submitWorkshopProof);
router.post('/kyc/bank-details', checkPartnerSuspension, validate({ body: submitBankDetailsSchema }), KycController.submitBankDetails);
router.post('/kyc/capabilities', checkPartnerSuspension, validate({ body: submitWorkshopCapabilitiesSchema }), KycController.submitCapabilities);
router.get('/kyc/checklist', KycController.getKycChecklist);

// 3. Operational Bidding / Leads (GATED: APPROVED_VERIFIED + isActive required)
router.get('/leads', requireApprovedPartner, BidController.getAvailableLeads);
router.post('/bids', requireApprovedPartner, validate({ body: placeBidSchema }), BidController.placeBid);
router.get('/bids', requireApprovedPartner, BidController.getMyBids);
router.patch('/bids/:id/withdraw', requireApprovedPartner, BidController.withdrawBid);

// 4. Operational Jobs & Customer Data (GATED: APPROVED_VERIFIED + isActive required)
router.get('/jobs', requireApprovedPartner, JobController.getMyJobs);
router.post('/verify-customer', requireApprovedPartner, JobController.verifyCustomerCode);
router.patch('/jobs/:id/start', requireApprovedPartner, JobController.startJob);
router.patch('/jobs/:id/complete', requireApprovedPartner, JobController.completeJob);
router.post('/jobs/:id/invoice', requireApprovedPartner, JobController.uploadInvoice);
router.post('/jobs/:id/photos', requireApprovedPartner, JobController.uploadPhotos);
router.delete('/jobs/:id/photos', requireApprovedPartner, JobController.deletePhoto);
router.post('/jobs/:id/warranty', requireApprovedPartner, JobController.uploadWarranty);
router.post('/jobs/:id/extensions', requireApprovedPartner, JobController.requestExtension);
router.patch('/jobs/:id/assign-staff', requireApprovedPartner, JobController.assignStaff);

// 5. Earnings & Settlements (GATED: APPROVED_VERIFIED + isActive required)
router.get('/earnings', requireApprovedPartner, EarningsController.getMyEarnings);
router.get('/earnings/summary', requireApprovedPartner, EarningsController.getEarningsSummary);
router.get('/earnings/settlements', requireApprovedPartner, EarningsController.getMySettlements);

// 6. Sub-modules (GATED: APPROVED_VERIFIED + isActive required)
router.use('/inventory', requireApprovedPartner, inventoryRouter);
router.use('/staff', requireApprovedPartner, staffRouter);
router.use('/pos', requireApprovedPartner, posRouter);
router.use('/warranties', requireApprovedPartner, warrantyRouter);

export default router;
