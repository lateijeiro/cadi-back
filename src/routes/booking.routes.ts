import { Router } from 'express';
import {
  createBooking,
  getBookingById,
  getMyBookings,
  acceptBooking,
  rejectBooking,
  startBooking,
  completeBooking,
  cancelBooking,
  rateBooking,
  getCaddieAvailability,
  suggestAlternatives,
  getNextService,
  getTodaySchedule,
} from '../controllers/booking.controller';
import { authenticate, authorize } from '../middlewares/auth.middleware';
import { UserRole } from '../types/enums';


const router = Router();

// Chequear disponibilidad y sugerir slot (usado por el frontend)
import { checkAvailabilityAndSuggest } from '../controllers/booking.controller';
router.get('/check-availability', authenticate, checkAvailabilityAndSuggest);

// Crear una reserva (solo golfer)
router.post('/', authenticate, authorize(UserRole.GOLFER), createBooking);

// Obtener mis reservas (golfer o caddie)

// Obtener reservas como golfer
import { getBookingsAsGolfer, getBookingsAsCaddie } from '../controllers/booking.controller';
router.get('/golfer', authenticate, authorize(UserRole.GOLFER), getBookingsAsGolfer);
// Obtener reservas como caddie
router.get('/caddie', authenticate, authorize(UserRole.CADDIE), getBookingsAsCaddie);

// Obtener mis reservas (golfer o caddie)
router.get('/me', authenticate, getMyBookings);

// Obtener próximo servicio (golfer o caddie)
router.get('/next-service', authenticate, getNextService);

// Obtener servicios de hoy (solo caddie)
router.get('/today-schedule', authenticate, authorize(UserRole.CADDIE), getTodaySchedule);

// Obtener disponibilidad de un caddie (autenticado)
router.get('/caddie/:caddieId/availability', authenticate, getCaddieAvailability);

// Sugerir horarios alternativos (autenticado)
router.get('/caddie/:caddieId/alternatives', authenticate, suggestAlternatives);

// Obtener una reserva específica
router.get('/:id', authenticate, getBookingById);

// Aceptar una reserva (solo caddie)
router.put('/:id/accept', authenticate, authorize(UserRole.CADDIE), acceptBooking);

// Rechazar una reserva (solo caddie)
router.put('/:id/reject', authenticate, authorize(UserRole.CADDIE), rejectBooking);

// Iniciar servicio escaneando QR (solo caddie)
router.post('/:id/start', authenticate, authorize(UserRole.CADDIE), startBooking);

// Completar una reserva (solo caddie)
router.put('/:id/complete', authenticate, authorize(UserRole.CADDIE), completeBooking);

// Cancelar una reserva (golfer o caddie)
router.put('/:id/cancel', authenticate, cancelBooking);


// Calificar una reserva como caddie (al golfer)
import { rateGolfer } from '../controllers/booking.controller';
router.put('/:id/rate-golfer', authenticate, authorize(UserRole.CADDIE), rateGolfer);

// Calificar una reserva (solo golfer)
router.put('/:id/rate', authenticate, authorize(UserRole.GOLFER), rateBooking);

export default router;
