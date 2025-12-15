import { Request, Response, NextFunction } from 'express';
import * as paymentService from '../services/payment.service';
import { t } from '../utils/i18n';

// Crear una preferencia de pago para una reserva
export const createPayment = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { bookingId } = req.params;
    const lang = req.language || 'es';

    const result = await paymentService.createPayment(bookingId, lang);

    return res.status(201).json({
      message: t('payment.created', lang),
      data: result,
    });
  } catch (error) {
    return next(error);
  }
};

// Webhook para recibir notificaciones de MercadoPago
export const handleWebhook = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const data = req.body;

    // Procesar el webhook de forma asíncrona
    paymentService.processWebhook(data).catch((error) => {
      console.error('Error processing webhook:', error);
    });

    // Responder inmediatamente a MercadoPago
    res.status(200).json({ received: true });
  } catch (error) {
    return next(error);
  }
};

// Obtener información de pago por reserva
export const getPaymentByBookingId = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { bookingId } = req.params;
    const lang = req.language || 'es';

    const payment = await paymentService.getPaymentByBookingId(bookingId, lang);

    res.json({
      data: payment,
    });
  } catch (error) {
    return next(error);
  }
};

// Marcar pago como liquidado (solo admin)
export const markAsLiquidated = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const lang = req.language || 'es';

    const payment = await paymentService.markAsLiquidated(id, lang);

    res.json({
      message: t('payment.liquidated', lang),
      data: payment,
    });
  } catch (error) {
    return next(error);
  }
};

// Obtener pagos pendientes de liquidación (solo admin)
export const getPendingLiquidations = async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const payments = await paymentService.getPendingLiquidations();

    res.json({
      data: payments,
    });
  } catch (error) {
    return next(error);
  }
};
