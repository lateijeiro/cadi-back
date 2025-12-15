import { Router } from 'express';
import healthRoutes from './health.routes';
import authRoutes from './auth.routes';
import golferRoutes from './golfer.routes';
import caddieRoutes from './caddie.routes';
import bookingRoutes from './booking.routes';
import clubRoutes from './club.routes';
import paymentRoutes from './payment.routes';

const router = Router();

router.use('/health', healthRoutes);
router.use('/auth', authRoutes);
router.use('/golfers', golferRoutes);
router.use('/caddies', caddieRoutes);
router.use('/bookings', bookingRoutes);
router.use('/clubs', clubRoutes);
router.use('/payments', paymentRoutes);

export default router;
