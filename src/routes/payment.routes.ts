import { Router } from 'express';
import {
  createPayment,
  handleWebhook,
  getPaymentByBookingId,
  markAsLiquidated,
  getPendingLiquidations,
} from '../controllers/payment.controller';
import { authenticate, authorize } from '../middlewares/auth.middleware';
import { UserRole } from '../types/enums';

const router = Router();

// Crear preferencia de pago (golfer o caddie puede iniciar el pago)
router.post('/:bookingId', authenticate, createPayment);

// Obtener información de pago por reserva
router.get('/booking/:bookingId', authenticate, getPaymentByBookingId);

// Webhook de MercadoPago (público, no requiere autenticación)
router.post('/webhook', handleWebhook);

// Rutas de administrador
router.get('/pending-liquidations', authenticate, authorize(UserRole.ADMIN), getPendingLiquidations);
router.put('/:id/liquidate', authenticate, authorize(UserRole.ADMIN), markAsLiquidated);

export default router;
