import { Router } from 'express';
import {
  createClub,
  getClubById,
  listClubs,
  updateClub,
  deleteClub,
} from '../controllers/club.controller';
import { authenticate, authorize } from '../middlewares/auth.middleware';
import { UserRole } from '../types/enums';

const router = Router();

// Rutas públicas/autenticadas para consulta
router.get('/', authenticate, listClubs);
router.get('/:id', authenticate, getClubById);

// Rutas de administrador
router.post('/', authenticate, authorize(UserRole.ADMIN), createClub);
router.put('/:id', authenticate, authorize(UserRole.ADMIN), updateClub);
router.delete('/:id', authenticate, authorize(UserRole.ADMIN), deleteClub);

export default router;
