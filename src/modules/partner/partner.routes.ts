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

const router = Router();

// Secure all partner routes with auth + role restriction
router.use(authMiddleware as any);
router.use(roleMiddleware([ROLES.PARTNER]) as any);

// 1. Partner Profile
router.post('/profile', PartnerController.createProfile);
router.get('/profile', PartnerController.getProfile);
router.patch('/profile', PartnerController.updateProfile);
router.patch('/capacity', PartnerController.updateCapacity);

// 2. KYC
router.post('/kyc', KycController.uploadKycDocument);
router.get('/kyc', KycController.getMyKycDocuments);

// 3. Bidding / Leads
router.get('/leads', BidController.getAvailableLeads);
router.post('/bids', validate({ body: placeBidSchema }), BidController.placeBid);
router.get('/bids', BidController.getMyBids);
router.patch('/bids/:id/withdraw', BidController.withdrawBid);

// 4. Jobs
router.get('/jobs', JobController.getMyJobs);
router.patch('/jobs/:id/start', JobController.startJob);
router.patch('/jobs/:id/complete', JobController.completeJob);
router.post('/jobs/:id/invoice', JobController.uploadInvoice);
router.post('/jobs/:id/photos', JobController.uploadPhotos);
router.delete('/jobs/:id/photos', JobController.deletePhoto);
router.post('/jobs/:id/warranty', JobController.uploadWarranty);
router.post('/jobs/:id/extensions', JobController.requestExtension);
router.patch('/jobs/:id/assign-staff', JobController.assignStaff);

// 5. Earnings
router.get('/earnings', EarningsController.getMyEarnings);
router.get('/earnings/summary', EarningsController.getEarningsSummary);
router.get('/earnings/settlements', EarningsController.getMySettlements);

router.use("/inventory", inventoryRouter);
router.use("/staff", staffRouter);
router.use("/pos", posRouter);
router.use("/warranties", warrantyRouter);

export default router;
