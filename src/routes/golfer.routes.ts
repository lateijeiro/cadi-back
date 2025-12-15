import { Router } from 'express';
import {
  getMyProfile,
  updateMyProfile,
  getGolferById,
  listGolfers,
  getRecentCaddies,
} from '../controllers/golfer.controller';
import { authenticate, authorize } from '../middlewares/auth.middleware';
import { UserRole } from '../types/enums';

const router = Router();

// Rutas protegidas para golfistas
router.get('/me', authenticate, authorize(UserRole.GOLFER), getMyProfile);
router.put('/me', authenticate, authorize(UserRole.GOLFER), updateMyProfile);
router.get('/me/recent-caddies', authenticate, authorize(UserRole.GOLFER), getRecentCaddies);

// Rutas públicas (o para admin)
router.get('/:id', authenticate, getGolferById);
router.get('/', authenticate, listGolfers);

export default router;
