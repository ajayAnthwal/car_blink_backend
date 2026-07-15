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
  createCitySchema,
  updateCitySchema,
  createVehicleBrandSchema,
  createVehicleModelSchema,
} from './master-data.validation';

const router = Router();

// Public Read Routes
router.get('/services', validate({ query: paginationQuerySchema }), MasterDataController.getServices);
router.get('/cities', validate({ query: paginationQuerySchema }), MasterDataController.getCities);
router.get('/vehicle-brands', MasterDataController.getVehicleBrands);
router.get('/vehicle-models', MasterDataController.getVehicleModels);

// Protected Write Routes (SUPER_ADMIN only)
router.post(
  '/services',
  authMiddleware as any,
  roleMiddleware([ROLES.SUPER_ADMIN]) as any,
  validate({ body: createServiceSchema }),
  MasterDataController.createService
);
router.patch(
  '/services/:id',
  authMiddleware as any,
  roleMiddleware([ROLES.SUPER_ADMIN]) as any,
  validate({ body: updateServiceSchema }),
  MasterDataController.updateService
);
router.delete(
  '/services/:id',
  authMiddleware as any,
  roleMiddleware([ROLES.SUPER_ADMIN]) as any,
  MasterDataController.deleteService
);

router.post(
  '/cities',
  authMiddleware as any,
  roleMiddleware([ROLES.SUPER_ADMIN]) as any,
  validate({ body: createCitySchema }),
  MasterDataController.createCity
);
router.patch(
  '/cities/:id',
  authMiddleware as any,
  roleMiddleware([ROLES.SUPER_ADMIN]) as any,
  validate({ body: updateCitySchema }),
  MasterDataController.updateCity
);
router.delete(
  '/cities/:id',
  authMiddleware as any,
  roleMiddleware([ROLES.SUPER_ADMIN]) as any,
  MasterDataController.deleteCity
);

router.post(
  '/vehicle-brands',
  authMiddleware as any,
  roleMiddleware([ROLES.SUPER_ADMIN]) as any,
  validate({ body: createVehicleBrandSchema }),
  MasterDataController.createVehicleBrand
);

router.post(
  '/vehicle-models',
  authMiddleware as any,
  roleMiddleware([ROLES.SUPER_ADMIN]) as any,
  validate({ body: createVehicleModelSchema }),
  MasterDataController.createVehicleModel
);

export default router;
