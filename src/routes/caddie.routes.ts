import { Router } from 'express';
import {
  createMyProfile,
  getMyProfile,
  updateMyProfile,
  updateMyAvailability,
  updateMyRecurringAvailability,
  getCaddieById,
  listCaddies,
  searchCaddies,
  approveCaddie,
  rejectCaddie,
  getMonthStats,
  updateMyPersonalProfile,
  updateMyServices,
} from '../controllers/caddie.controller';
import { authenticate, authorize } from '../middlewares/auth.middleware';
import { UserRole } from '../types/enums';

const router = Router();

// Rutas protegidas para caddies
router.post('/me', authenticate, authorize(UserRole.CADDIE), createMyProfile);
router.get('/me', authenticate, authorize(UserRole.CADDIE), getMyProfile);
router.put('/me', authenticate, authorize(UserRole.CADDIE), updateMyProfile);
router.put('/me/profile', authenticate, authorize(UserRole.CADDIE), updateMyPersonalProfile);
router.put('/me/services', authenticate, authorize(UserRole.CADDIE), updateMyServices);
router.put('/me/availability', authenticate, authorize(UserRole.CADDIE), updateMyAvailability);
router.put('/me/recurring-availability', authenticate, authorize(UserRole.CADDIE), updateMyRecurringAvailability);
router.get('/me/stats', authenticate, authorize(UserRole.CADDIE), getMonthStats);

// Rutas públicas/protegidas para búsqueda
router.get('/search', authenticate, searchCaddies);
router.get('/:id', authenticate, getCaddieById);
router.get('/', authenticate, listCaddies);

// Rutas de administrador
router.put('/:id/approve', authenticate, authorize(UserRole.ADMIN), approveCaddie);
router.put('/:id/reject', authenticate, authorize(UserRole.ADMIN), rejectCaddie);

export default router;
