import { Router } from 'express';
import { MasterDataController } from './master-data.controller';
import { authMiddleware } from '../../middlewares/auth.middleware';
import { roleMiddleware } from '../../middlewares/role.middleware';
import { validate } from '../../middlewares/validate.middleware';
import { ROLES } from '../../common/constants/roles.constant';
import {
  paginationQuerySchema,
  createServiceSchema,
  updateServiceSchema,
  createStateSchema,
  updateStateSchema,
  createCitySchema,
  updateCitySchema,
  createVehicleBrandSchema,
  createVehicleModelSchema,
} from './master-data.validation';
import { BannerAdController } from '../executive/sub-modules/ads/banner-ad.controller';

const router = Router();

// ==========================================
// PUBLIC READ ROUTES
// ==========================================
router.get('/services', validate({ query: paginationQuerySchema }), MasterDataController.getServices);
router.get('/services/:slug', MasterDataController.getServiceBySlug);

// States & Cities Hierarchy
router.get('/states', MasterDataController.getStates);
router.get('/states/:id', MasterDataController.getStateById);
router.get('/cities', MasterDataController.getCities);
router.get('/cities/:id', MasterDataController.getCityById);
router.get('/hierarchy', MasterDataController.getLocationHierarchy);
router.get('/locations/hierarchy', MasterDataController.getLocationHierarchy);

router.get('/vehicle-brands', MasterDataController.getVehicleBrands);
router.get('/vehicle-models', MasterDataController.getVehicleModels);
router.get('/plans', MasterDataController.getPlans);
router.get('/ads', BannerAdController.getActiveAds);
router.get('/master-data/ads', BannerAdController.getActiveAds);

// ==========================================
// PROTECTED WRITE ROUTES (SUPER_ADMIN & ADMIN)
// ==========================================

// States CRUD
router.post(
  '/states',
  authMiddleware as any,
  roleMiddleware([ROLES.SUPER_ADMIN, ROLES.ADMIN]) as any,
  validate({ body: createStateSchema }),
  MasterDataController.createState
);
router.patch(
  '/states/:id',
  authMiddleware as any,
  roleMiddleware([ROLES.SUPER_ADMIN, ROLES.ADMIN]) as any,
  validate({ body: updateStateSchema }),
  MasterDataController.updateState
);
router.put(
  '/states/:id',
  authMiddleware as any,
  roleMiddleware([ROLES.SUPER_ADMIN, ROLES.ADMIN]) as any,
  validate({ body: updateStateSchema }),
  MasterDataController.updateState
);
router.delete(
  '/states/:id',
  authMiddleware as any,
  roleMiddleware([ROLES.SUPER_ADMIN, ROLES.ADMIN]) as any,
  MasterDataController.deleteState
);

// Cities CRUD
router.post(
  '/cities',
  authMiddleware as any,
  roleMiddleware([ROLES.SUPER_ADMIN, ROLES.ADMIN]) as any,
  validate({ body: createCitySchema }),
  MasterDataController.createCity
);
router.patch(
  '/cities/:id',
  authMiddleware as any,
  roleMiddleware([ROLES.SUPER_ADMIN, ROLES.ADMIN]) as any,
  validate({ body: updateCitySchema }),
  MasterDataController.updateCity
);
router.put(
  '/cities/:id',
  authMiddleware as any,
  roleMiddleware([ROLES.SUPER_ADMIN, ROLES.ADMIN]) as any,
  validate({ body: updateCitySchema }),
  MasterDataController.updateCity
);
router.delete(
  '/cities/:id',
  authMiddleware as any,
  roleMiddleware([ROLES.SUPER_ADMIN, ROLES.ADMIN]) as any,
  MasterDataController.deleteCity
);

// Services
router.post(
  '/services',
  authMiddleware as any,
  roleMiddleware([ROLES.SUPER_ADMIN, ROLES.ADMIN]) as any,
  validate({ body: createServiceSchema }),
  MasterDataController.createService
);
router.patch(
  '/services/:id',
  authMiddleware as any,
  roleMiddleware([ROLES.SUPER_ADMIN, ROLES.ADMIN]) as any,
  validate({ body: updateServiceSchema }),
  MasterDataController.updateService
);
router.delete(
  '/services/:id',
  authMiddleware as any,
  roleMiddleware([ROLES.SUPER_ADMIN, ROLES.ADMIN]) as any,
  MasterDataController.deleteService
);

// Vehicles
router.post(
  '/vehicle-brands',
  authMiddleware as any,
  roleMiddleware([ROLES.SUPER_ADMIN, ROLES.ADMIN]) as any,
  validate({ body: createVehicleBrandSchema }),
  MasterDataController.createVehicleBrand
);
router.post(
  '/vehicle-models',
  authMiddleware as any,
  roleMiddleware([ROLES.SUPER_ADMIN, ROLES.ADMIN]) as any,
  validate({ body: createVehicleModelSchema }),
  MasterDataController.createVehicleModel
);

export default router;
