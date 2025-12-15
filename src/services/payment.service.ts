import { MercadoPagoConfig, Preference } from 'mercadopago';
import { Payment, IPayment } from '../models/Payment.model';
import { Booking } from '../models/Booking.model';
import { Caddie } from '../models/Caddie.model';
import { config } from '../config/environment';
import { NotFoundError, BadRequestError } from '../utils/errors';
import { BookingStatus, PaymentStatus } from '../types/enums';

// Inicializar cliente de MercadoPago
const client = new MercadoPagoConfig({
  accessToken: config.mercadopago.accessToken,
});

export const createPayment = async (bookingId: string, lang: string): Promise<any> => {
  // Verificar que la reserva existe
  const booking = await Booking.findById(bookingId)
    .populate('caddieId')
    .populate('golferId')
    .populate('clubId');

  if (!booking) {
    throw new NotFoundError('booking.notFound', lang);
  }

  // Verificar que la reserva está aceptada
  if (booking.status !== BookingStatus.ACCEPTED) {
    throw new BadRequestError('payment.bookingNotAccepted', lang);
  }

  // Verificar si ya existe un pago para esta reserva
  const existingPayment = await Payment.findOne({ bookingId });
  if (existingPayment && existingPayment.status === PaymentStatus.COMPLETED) {
    throw new BadRequestError('payment.alreadyPaid', lang);
  }

  // Obtener el caddie para la tarifa
  const caddie = await Caddie.findById(booking.caddieId);
  if (!caddie) {
    throw new NotFoundError('caddie.notFound', lang);
  }

  const amount = caddie.suggestedRate;
  const commission = Math.round(amount * (config.payment.commissionPercentage / 100));
  const caddieAmount = amount - commission;

  // Si ya existe un pago pendiente, lo actualizamos
  let payment: IPayment;
  if (existingPayment) {
    payment = existingPayment;
    payment.amount = amount;
    payment.commission = commission;
    payment.caddieAmount = caddieAmount;
  } else {
    // Crear registro de pago
    payment = await Payment.create({
      bookingId,
      golferId: booking.golferId,
      caddieId: booking.caddieId,
      amount,
      commission,
      caddieAmount,
      status: PaymentStatus.PENDING,
    });
  }

  // Crear preferencia de pago en MercadoPago
  const preference = new Preference(client);
  
  try {
    const preferenceData = await preference.create({
      body: {
        items: [
          {
            id: booking._id.toString(),
            title: `Servicio de Caddie - ${(booking.clubId as any).name}`,
            description: `Fecha: ${booking.date.toLocaleDateString()} - ${booking.timeSlot}`,
            quantity: 1,
            unit_price: amount,
            currency_id: 'ARS',
          },
        ],
        back_urls: {
          success: `${process.env.FRONTEND_URL || 'http://localhost:3000'}/payment/success`,
          failure: `${process.env.FRONTEND_URL || 'http://localhost:3000'}/payment/failure`,
          pending: `${process.env.FRONTEND_URL || 'http://localhost:3000'}/payment/pending`,
        },
        auto_return: 'approved',
        external_reference: payment._id.toString(),
        notification_url: `${process.env.BACKEND_URL || 'http://localhost:4000'}/api/payments/webhook`,
        statement_descriptor: 'CADIAPP',
        payment_methods: {
          installments: 1,
        },
      },
    });

    // Guardar el ID de MercadoPago
    payment.mercadopagoId = preferenceData.id;
    await payment.save();

    return {
      payment,
      preferenceId: preferenceData.id,
      initPoint: preferenceData.init_point,
    };
  } catch (error: any) {
    throw new BadRequestError(error.message || 'payment.creationFailed', lang);
  }
};

export const processWebhook = async (data: any): Promise<void> => {
  // MercadoPago envía diferentes tipos de notificaciones
  if (data.type === 'payment') {
    const paymentId = data.data?.id;
    
    if (!paymentId) {
      return;
    }

    // Aquí normalmente consultarías el estado del pago en MercadoPago
    // Por ahora, simulamos la actualización basada en el external_reference
    const externalReference = data.external_reference;
    
    if (externalReference) {
      const payment = await Payment.findById(externalReference);
      
      if (payment) {
        // Actualizar estado según la notificación
        if (data.action === 'payment.created' || data.action === 'payment.updated') {
          payment.mercadopagoStatus = data.data?.status || 'pending';
          
          if (data.data?.status === 'approved') {
            payment.status = PaymentStatus.COMPLETED;
            payment.paidAt = new Date();
            
            // Actualizar el estado de la reserva a completada
            await Booking.findByIdAndUpdate(payment.bookingId, {
              status: BookingStatus.COMPLETED,
            });
          }
          
          await payment.save();
        }
      }
    }
  }
};

export const getPaymentByBookingId = async (
  bookingId: string,
  lang: string
): Promise<IPayment> => {
  const payment = await Payment.findOne({ bookingId })
    .populate('golferId', 'userId')
    .populate('caddieId', 'userId')
    .populate('bookingId');

  if (!payment) {
    throw new NotFoundError('payment.notFound', lang);
  }

  return payment;
};

export const markAsLiquidated = async (paymentId: string, lang: string): Promise<IPayment> => {
  const payment = await Payment.findById(paymentId);

  if (!payment) {
    throw new NotFoundError('payment.notFound', lang);
  }

  if (payment.status !== PaymentStatus.COMPLETED) {
    throw new BadRequestError('payment.notCompleted', lang);
  }

  if (payment.liquidatedAt) {
    throw new BadRequestError('payment.alreadyLiquidated', lang);
  }

  payment.liquidatedAt = new Date();
  await payment.save();

  return payment;
};

export const getPendingLiquidations = async () => {
  const payments = await Payment.find({
    status: PaymentStatus.COMPLETED,
    liquidatedAt: null,
  })
    .populate('caddieId', 'userId dni')
    .populate('bookingId')
    .sort({ paidAt: -1 });

  return payments;
};
