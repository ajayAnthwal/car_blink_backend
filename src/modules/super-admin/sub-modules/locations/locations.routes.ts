import { Router } from 'express';
import { MasterDataController } from '../../../master-data/master-data.controller';
import { validate } from '../../../../middlewares/validate.middleware';
import {
  createStateSchema,
  updateStateSchema,
  createCitySchema,
  updateCitySchema,
} from '../../../master-data/master-data.validation';

const router = Router();

// ==========================================
// SUPER ADMIN LOCATION HIERARCHY CRUD
// ==========================================

// Location Hierarchy overview
router.get('/hierarchy', MasterDataController.getLocationHierarchy);

// States Management
router.get('/states', MasterDataController.getStates);
router.get('/states/:id', MasterDataController.getStateById);
router.post('/states', validate({ body: createStateSchema }), MasterDataController.createState);
router.patch('/states/:id', validate({ body: updateStateSchema }), MasterDataController.updateState);
router.put('/states/:id', validate({ body: updateStateSchema }), MasterDataController.updateState);
router.delete('/states/:id', MasterDataController.deleteState);

// Cities Management (Linked to State)
router.get('/cities', MasterDataController.getCities);
router.get('/cities/:id', MasterDataController.getCityById);
router.post('/cities', validate({ body: createCitySchema }), MasterDataController.createCity);
router.patch('/cities/:id', validate({ body: updateCitySchema }), MasterDataController.updateCity);
router.put('/cities/:id', validate({ body: updateCitySchema }), MasterDataController.updateCity);
router.delete('/cities/:id', MasterDataController.deleteCity);

export default router;
