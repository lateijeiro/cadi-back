import { Booking, IBooking } from '../models/Booking.model';
import { Caddie } from '../models/Caddie.model';
import { Golfer } from '../models/Golfer.model';
import { Club } from '../models/Club.model';
import { BookingStatus } from '../types/enums';
import { NotFoundError, BadRequestError } from '../utils/errors';
import { emitBookingEvent } from '../utils/bookingSocketEvents';
import { DateTime } from 'luxon';

interface CreateBookingData {
  golferId: string;
  caddieId: string;
  clubId: string;
  date: string;
  startTime: string; // Formato "HH:mm"
  endTime: string;   // Formato "HH:mm"
}

export const createBooking = async (data: CreateBookingData, lang: string): Promise<IBooking> => {
  const { golferId, caddieId, clubId, date, startTime, endTime } = data;
  // LOG de depuración de entrada
  console.log('[BOOKING-DEBUG] Solicitud de reserva:', {
    date,
    startTime,
    endTime,
    clubId,
    caddieId,
    golferId
  });

  // Verificar que el golfer existe
  const golfer = await Golfer.findOne({ userId: golferId });
  if (!golfer) {
    throw new NotFoundError('user.notFound', lang);
  }

  // Verificar que el caddie existe y está aprobado
  const caddie = await Caddie.findById(caddieId);
  if (!caddie) {
    throw new NotFoundError('caddie.notFound', lang);
  }

  if (caddie.status !== 'approved') {
    throw new BadRequestError('caddie.pending', lang);
  }

  // Verificar que el club existe
  const club = await Club.findById(clubId);
  if (!club) {
    throw new NotFoundError('errors.notFound', lang);
  }

  // Validar formato de horarios
  const timeRegex = /^([01]\d|2[0-3]):([0-5]\d)$/;
  if (!timeRegex.test(startTime) || !timeRegex.test(endTime)) {
    throw new BadRequestError('Formato de hora inválido. Use HH:mm (ej: 10:00)', 'errors.validation');
  }

  // Validar que endTime sea posterior a startTime
  if (startTime >= endTime) {
    throw new BadRequestError('La hora de fin debe ser posterior a la hora de inicio', 'errors.validation');
  }

  // Usar Luxon para obtener el día de la semana correctamente
  const bookingDateLuxon = DateTime.fromISO(date, { zone: 'utc' });
  const mongoDayOfWeek = bookingDateLuxon.weekday % 7; // 0=domingo, 1=lunes, ..., 6=sábado
  const bookingDate = bookingDateLuxon.toJSDate();

  // Verificar solapamiento con otras reservas del caddie
  const existingBookings = await Booking.find({
    caddieId,
    date: bookingDate,
    status: { $in: [BookingStatus.PENDING, BookingStatus.ACCEPTED] },
  });

  // Verificar solapamiento de horarios
  const hasOverlap = existingBookings.some((booking) => {
    // Solapamiento: (start1 < end2) && (end1 > start2)
    return (startTime < booking.endTime) && (endTime > booking.startTime);
  });

  if (hasOverlap) {
    throw new BadRequestError('El caddie ya tiene una reserva en ese horario', 'booking.alreadyBooked');
  }

  // Log de depuración para dayOfWeek y bloques recurrentes
  console.log('[BOOKING-DEBUG] bookingDate:', bookingDate);
  console.log('[BOOKING-DEBUG] mongoDayOfWeek calculado:', mongoDayOfWeek);
  console.log('[BOOKING-DEBUG] recurringAvailability:', JSON.stringify(caddie.recurringAvailability, null, 2));

  // Convertir hora "HH:mm" a minutos desde medianoche para comparaciones
  const timeToMinutes = (time: string): number => {
    const [hours, minutes] = time.split(':').map(Number);
    return hours * 60 + minutes;
  };

  const requestStartMinutes = timeToMinutes(startTime);
  const requestEndMinutes = timeToMinutes(endTime);

  // (Eliminada función isOverlappingTimeSlot porque no se utiliza)

  // Permitir reservas que crucen varios bloques contiguos
  const hourToMinutes = (h: string) => {
    const [hh, mm] = h.split(':').map(Number);
    return hh * 60 + (isNaN(mm) ? 0 : mm);
  };

  const reqStart = hourToMinutes(startTime);
  const reqEnd = hourToMinutes(endTime);

  // Obtener todos los bloques disponibles para la fecha y club
  let allSlots: { start: number, end: number }[] = [];

  // Disponibilidad específica
  if (caddie.availability) {
    caddie.availability.forEach(avail => {
      if (avail.date.toISOString().split('T')[0] === date) {
        avail.timeSlots.forEach(slot => {
          const [slotStart, slotEnd] = slot.split('-').map(s => s.trim());
          allSlots.push({ start: hourToMinutes(slotStart), end: hourToMinutes(slotEnd) });
        });
      }
    });
  }
  // Disponibilidad recurrente
  if (caddie.recurringAvailability) {
    caddie.recurringAvailability.forEach(avail => {
      if (avail.clubId.toString() === clubId && avail.dayOfWeek === mongoDayOfWeek) {
        avail.timeSlots.forEach(slot => {
          const [slotStart, slotEnd] = slot.split('-').map(s => s.trim());
          allSlots.push({ start: hourToMinutes(slotStart), end: hourToMinutes(slotEnd) });
        });
      }
    });
  }

  // Unir y ordenar los bloques
  allSlots = allSlots.sort((a, b) => a.start - b.start);

  // Unir bloques contiguos o solapados
  const merged: { start: number, end: number }[] = [];
  for (const slot of allSlots) {
    if (!merged.length) {
      merged.push({ ...slot });
    } else {
      const last = merged[merged.length - 1];
      if (slot.start <= last.end) {
        last.end = Math.max(last.end, slot.end);
      } else {
        merged.push({ ...slot });
      }
    }
  }

  // Verificar si el rango solicitado está completamente cubierto por algún bloque unido
  const isCovered = merged.some(block => block.start <= reqStart && block.end >= reqEnd);

  console.log('[BOOKING-DEBUG] merged blocks:', merged, 'req:', { reqStart, reqEnd }, 'isCovered:', isCovered);
  if (!isCovered) {
    console.log('[BOOKING-DEBUG] No hay disponibilidad para el rango solicitado (cruce de bloques).');
    throw new BadRequestError('El caddie no está disponible en ese horario', 'caddie.notAvailable');
  }
  console.log('[BOOKING-DEBUG] ¡Reserva PASA validación de disponibilidad cruzando bloques! Se guardará con:', { startTime, endTime });

  // Calcular precio total
  const durationMinutes = requestEndMinutes - requestStartMinutes;
  const durationHours = durationMinutes / 60;
  const totalPrice = Math.round(caddie.suggestedRate * durationHours);

  // Crear la reserva
  const booking = await Booking.create({
    golferId: golfer._id,
    caddieId,
    clubId,
    date: bookingDate,
    startTime,
    endTime,
    totalPrice,
    status: BookingStatus.PENDING,
  });
  console.log('[BOOKING][DEBUG] Después de create (create):', booking.toObject());
  // Populamos caddieId y golferId con userId para el evento socket
  const populatedBooking = await Booking.findById(booking._id)
    .populate({
      path: 'golferId',
      select: 'userId handicap',
      populate: { path: 'userId', select: 'firstName lastName email phone' }
    })
    .populate({
      path: 'caddieId',
      select: 'userId dni category experience suggestedRate',
      populate: { path: 'userId', select: 'firstName lastName phone' }
    })
    .populate('clubId', 'name address city province');
  // Emitir evento de creación de reserva
  console.log('[BOOKING][DEBUG] Antes de emitir evento (create)');
  if (!populatedBooking) {
    throw new Error('Error interno: No se pudo poblar la reserva recién creada');
  }
  emitBookingEvent('booking:created', populatedBooking);
  return populatedBooking;
};

export const getBookingById = async (bookingId: string, lang: string): Promise<IBooking> => {
  const booking = await Booking.findById(bookingId)
    .populate('golferId', 'userId handicap')
    .populate({
      path: 'caddieId',
      select: 'userId dni category experience',
      populate: {
        path: 'userId',
        select: 'firstName lastName phone',
      },
    })
    .populate('clubId', 'name address city province');

  if (!booking) {
    throw new NotFoundError('booking.notFound', lang);
  }

  return booking;
};

export const getMyBookingsAsGolfer = async (userId: string): Promise<IBooking[]> => {
  const golfer = await Golfer.findOne({ userId });
  if (!golfer) {
    return [];
  }

  const bookings = await Booking.find({ golferId: golfer._id })
    .populate({
      path: 'caddieId',
      select: 'userId dni category experience suggestedRate',
      populate: {
        path: 'userId',
        select: 'firstName lastName phone email'
      }
    })
    .populate('clubId', 'name address city province')
    .sort({ createdAt: -1 });

  return bookings;
};

export const getMyBookingsAsCaddie = async (userId: string): Promise<IBooking[]> => {
  const caddie = await Caddie.findOne({ userId });
  if (!caddie) {
    return [];
  }

  const bookings = await Booking.find({ caddieId: caddie._id })
    .populate({
      path: 'golferId',
      select: 'userId handicap',
      populate: {
        path: 'userId',
        select: 'firstName lastName phone email'
      }
    })
    .populate('clubId', 'name address city province')
    .sort({ createdAt: -1 });

  return bookings;
};

export const acceptBooking = async (
  bookingId: string,
  caddieUserId: string,
  lang: string
): Promise<IBooking> => {
  const booking = await Booking.findById(bookingId).populate('caddieId');
  if (!booking) {
    throw new NotFoundError('booking.notFound', lang);
  }

  // Verificar que el caddie es el dueño de la reserva
  const caddie = await Caddie.findById(booking.caddieId);
  if (!caddie || caddie.userId.toString() !== caddieUserId) {
    throw new BadRequestError('errors.forbidden', lang);
  }

  if (booking.status !== BookingStatus.PENDING) {
    throw new BadRequestError('errors.badRequest', lang);
  }


  // Generar timestamp del QR con la fecha/hora de inicio del servicio
  const serviceDateTime = new Date(booking.date);
  const [hours, minutes] = booking.startTime.split(':').map(Number);
  serviceDateTime.setHours(hours, minutes, 0, 0);
  const qrCodeData = {
    bookingId: booking._id.toString(),
    timestamp: serviceDateTime.getTime(),
  };
  booking.status = BookingStatus.ACCEPTED;
  booking.qrCode = JSON.stringify(qrCodeData);
  console.log('[BOOKING][DEBUG] Antes de save (accept):', booking.toObject());
  await booking.save();
  console.log('[BOOKING][DEBUG] Después de save (accept):', booking.toObject());
  // Emitir evento de aceptación de reserva
  console.log('[BOOKING][DEBUG] Antes de emitir evento (accept)');
  // Populamos caddieId y golferId con userId para el evento socket
  const populatedBooking = await Booking.findById(booking._id)
    .populate({
      path: 'golferId',
      select: 'userId handicap',
      populate: { path: 'userId', select: 'firstName lastName email phone' }
    })
    .populate({
      path: 'caddieId',
      select: 'userId dni category experience suggestedRate',
      populate: { path: 'userId', select: 'firstName lastName phone' }
    })
    .populate('clubId', 'name address city province');
  if (!populatedBooking) {
    throw new Error('Error interno: No se pudo poblar la reserva actualizada');
  }
  emitBookingEvent('booking:updated', populatedBooking);
  return populatedBooking;
};

export const rejectBooking = async (
  bookingId: string,
  caddieUserId: string,
  lang: string
): Promise<IBooking> => {
  // Populamos tanto golferId como caddieId para el evento socket
  const booking = await Booking.findById(bookingId)
    .populate({
      path: 'golferId',
      select: 'userId handicap',
      populate: { path: 'userId', select: 'firstName lastName email phone' }
    })
    .populate({
      path: 'caddieId',
      select: 'userId dni category experience suggestedRate',
      populate: { path: 'userId', select: 'firstName lastName phone' }
    })
    .populate('clubId', 'name address city province');
  if (!booking) {
    throw new NotFoundError('booking.notFound', lang);
  }

  // Verificar que el caddie es el dueño de la reserva
  const caddie = await Caddie.findById(booking.caddieId);
  if (!caddie || caddie.userId.toString() !== caddieUserId) {
    throw new BadRequestError('errors.forbidden', lang);
  }

  if (booking.status !== BookingStatus.PENDING) {
    throw new BadRequestError('errors.badRequest', lang);
  }

  booking.status = BookingStatus.REJECTED;
  console.log('[BOOKING][DEBUG] Antes de save (reject):', booking.toObject());
  await booking.save();
  console.log('[BOOKING][DEBUG] Después de save (reject):', booking.toObject());
  // Emitir evento de rechazo de reserva
  console.log('[BOOKING][DEBUG] Antes de emitir evento (reject)');
  emitBookingEvent('booking:updated', booking);
  return booking;
};

export const startBooking = async (
  bookingId: string,
  caddieUserId: string,
  qrData: string,
  lang: string
): Promise<IBooking> => {
  // Buscar la reserva
  const booking = await Booking.findById(bookingId).populate('caddieId');
  if (!booking) {
    throw new NotFoundError('booking.notFound', lang);
  }

  // Verificar que el caddie es el dueño de la reserva
  const caddie = await Caddie.findById(booking.caddieId);
  if (!caddie || caddie.userId.toString() !== caddieUserId) {
    throw new BadRequestError('errors.forbidden', lang);
  }

  // Validar que el estado sea accepted
  if (booking.status !== BookingStatus.ACCEPTED) {
    throw new BadRequestError('El servicio no puede iniciarse en este estado', 'booking.invalidStatus');
  }


  // Parsear y validar el QR
  let parsedQR: any;
  try {
    parsedQR = JSON.parse(qrData);
  } catch (error) {
    throw new BadRequestError('Código QR inválido', 'booking.invalidQR');
  }

  // Validar que el QR corresponde a esta reserva
  if (parsedQR.bookingId !== bookingId) {
    throw new BadRequestError('El código QR no corresponde a esta reserva', 'booking.qrMismatch');
  }

  // Validar fecha usando el timestamp del QR (±1 día respecto a la fecha/hora de la reserva)
  const qrTimestamp = Number(parsedQR.timestamp);
  if (!qrTimestamp || isNaN(qrTimestamp)) {
    throw new BadRequestError('El QR no contiene un timestamp válido', 'booking.qrInvalidTimestamp');
  }
  // Fecha/hora de la reserva
  const serviceDateTime = new Date(booking.date);
  const [hours, minutes] = booking.startTime.split(':').map(Number);
  serviceDateTime.setHours(hours, minutes, 0, 0);
  // Diferencia en días
  const daysDiff = Math.abs((serviceDateTime.getTime() - qrTimestamp) / (1000 * 60 * 60 * 24));
  if (daysDiff > 1) {
    throw new BadRequestError('El código QR no corresponde a la fecha de esta reserva', 'booking.qrDateMismatch');
  }

  // Cambiar status a in-progress
  booking.status = BookingStatus.IN_PROGRESS;
  console.log('[BOOKING][DEBUG] Antes de save (start):', booking.toObject());
  await booking.save();
  console.log('[BOOKING][DEBUG] Después de save (start):', booking.toObject());
  // Emitir evento de inicio de reserva
  console.log('[BOOKING][DEBUG] Antes de emitir evento (start)');
  emitBookingEvent('booking:updated', booking);
  return booking;
};

export const completeBooking = async (
  bookingId: string,
  caddieUserId: string,
  lang: string
): Promise<IBooking> => {
  const booking = await Booking.findById(bookingId).populate('caddieId');
  if (!booking) {
    throw new NotFoundError('booking.notFound', lang);
  }

  // Verificar que el caddie es el dueño de la reserva
  const caddie = await Caddie.findById(booking.caddieId);
  if (!caddie || caddie.userId.toString() !== caddieUserId) {
    throw new BadRequestError('errors.forbidden', lang);
  }

  // Permitir completar desde accepted o in-progress
  if (![BookingStatus.ACCEPTED, BookingStatus.IN_PROGRESS].includes(booking.status)) {
    throw new BadRequestError('errors.badRequest', lang);
  }

  booking.status = BookingStatus.COMPLETED;
  console.log('[BOOKING][DEBUG] Antes de save (complete):', booking.toObject());
  await booking.save();
  console.log('[BOOKING][DEBUG] Después de save (complete):', booking.toObject());
  // Emitir evento de finalización de reserva
  console.log('[BOOKING][DEBUG] Antes de emitir evento (complete)');
  emitBookingEvent('booking:updated', booking);
  return booking;
};

export const cancelBooking = async (
  bookingId: string,
  userId: string,
  userRole: string,
  reason: string,
  lang: string
): Promise<{
  booking: IBooking;
  refundInfo: {
    refundAmount: number;
    refundPercentage: number;
    hoursUntilService: number;
  };
}> => {

  // Populamos tanto golferId como caddieId para el evento socket
  const booking = await Booking.findById(bookingId)
    .populate({
      path: 'golferId',
      select: 'userId',
      populate: { path: 'userId', select: 'firstName lastName email phone' }
    })
    .populate({
      path: 'caddieId',
      select: 'userId dni category experience suggestedRate',
      populate: { path: 'userId', select: 'firstName lastName phone' }
    })
    .populate('clubId', 'name address city province');
  if (!booking) {
    throw new NotFoundError('booking.notFound', lang);
  }

  // LOGS TEMPORALES PARA DEBUG
  console.log('--- CANCEL BOOKING DEBUG ---');
  console.log('userId:', userId);
  console.log('userRole:', userRole);
  console.log('booking.golferId:', booking.golferId?._id?.toString?.());
  console.log('booking.caddieId:', booking.caddieId?._id?.toString?.());

  let isOwner = false;
  let cancelledBy: 'golfer' | 'caddie' = 'golfer';

  if (userRole === 'golfer') {
    const golfer = await Golfer.findOne({ userId });
    console.log('golfer encontrado:', golfer ? golfer._id?.toString?.() : null);
    const bookingGolferId = booking.golferId && typeof booking.golferId === 'object' && booking.golferId._id ? booking.golferId._id.toString() : booking.golferId?.toString?.();
    console.log('Comparando golfer._id:', golfer ? golfer._id?.toString?.() : null, 'con bookingGolferId:', bookingGolferId);
    if (golfer && golfer._id.toString() === bookingGolferId) {
      isOwner = true;
      cancelledBy = 'golfer';
    } else {
      console.log('NO COINCIDEN los IDs de golfer');
    }
  } else if (userRole === 'caddie') {
    const caddie = await Caddie.findOne({ userId });
    console.log('caddie encontrado:', caddie ? caddie._id?.toString?.() : null);
    if (caddie) {
      console.log('typeof caddie._id:', typeof caddie._id, 'valor:', caddie._id);
      console.log('typeof booking.caddieId:', typeof booking.caddieId, 'valor:', booking.caddieId);
      // Comparar correctamente el _id del caddie populado
      const bookingCaddieId = booking.caddieId && typeof booking.caddieId === 'object' && booking.caddieId._id ? booking.caddieId._id.toString() : booking.caddieId?.toString?.();
      console.log('caddie._id.toString():', caddie._id.toString());
      console.log('bookingCaddieId:', bookingCaddieId);
      if (caddie._id.toString() === bookingCaddieId) {
        isOwner = true;
        cancelledBy = 'caddie';
      } else {
        console.log('NO COINCIDEN los IDs de caddie');
      }
    }
  }

  if (!isOwner) {
    console.log('NO ES OWNER, forbidden');
    throw new BadRequestError('errors.forbidden', lang);
  }

  // No se puede cancelar si ya está in-progress, completed, o ya cancelado
  if (['in-progress', 'completed', 'cancelled'].includes(booking.status)) {
    throw new BadRequestError('booking.cannotCancel', lang);
  }


  // Calcular tiempo restante hasta el servicio
  const now = new Date();
  const serviceDateTime = new Date(booking.date);
  const [hours, minutes] = booking.startTime.split(':').map(Number);
  serviceDateTime.setHours(hours, minutes, 0, 0);
  const hoursUntilService = (serviceDateTime.getTime() - now.getTime()) / (1000 * 60 * 60);

  // Política de reembolso
  const policy = {
    fullRefundHoursBefore: 24,
    partialRefundHoursBefore: 12,
    partialRefundPercentage: 50,
  };

  let refundPercentage = 0;
  if (cancelledBy === 'caddie') {
    // Si cancela el caddie, siempre 100% de reembolso
    refundPercentage = 100;
  } else {
    // Si la reserva no está confirmada por el caddie, siempre 100%
    if (booking.status === 'pending') {
      refundPercentage = 100;
    } else if (hoursUntilService >= policy.fullRefundHoursBefore) {
      refundPercentage = 100;
    } else if (hoursUntilService >= policy.partialRefundHoursBefore) {
      refundPercentage = policy.partialRefundPercentage;
    }
    // Si es menos de 12h y no es pending, refundPercentage = 0
  }

  const refundAmount = Math.round((booking.totalPrice * refundPercentage) / 100);

  // Actualizar booking con información de cancelación
  booking.status = BookingStatus.CANCELLED;
  booking.cancelledAt = now;
  booking.cancelledBy = cancelledBy;
  booking.cancellationReason = reason;
  booking.refundAmount = refundAmount;
  booking.refundPercentage = refundPercentage;
  
  // Si hay un pago asociado y corresponde reembolso, marcar como pendiente
  if (booking.paymentId && refundAmount > 0) {
    booking.refundStatus = 'pending';
    // TODO: Cuando exista integración con MercadoPago, procesar refund aquí
  }

  await booking.save();

  // TODO: Notificar a la otra parte (caddie o golfer según quién canceló)

  // Emitir evento socket con booking populado
  emitBookingEvent('booking:updated', booking);
  return {
    booking,
    refundInfo: {
      refundAmount,
      refundPercentage,
      hoursUntilService: Math.round(hoursUntilService * 10) / 10,
    },
  };
};

export const addRating = async (
  bookingId: string,
  userId: string,
  rating: number,
  review: string,
  lang: string
): Promise<IBooking> => {
  const booking = await Booking.findById(bookingId);
  if (!booking) {
    throw new NotFoundError('booking.notFound', lang);
  }

  // Verificar que el usuario es el golfer de la reserva
  const golfer = await Golfer.findOne({ userId });
  if (!golfer || golfer._id.toString() !== booking.golferId.toString()) {
    throw new BadRequestError('errors.forbidden', lang);
  }

  if (booking.status !== BookingStatus.COMPLETED) {
    throw new BadRequestError('errors.badRequest', lang);
  }

  if (booking.caddieRating) {
    throw new BadRequestError('booking.alreadyRated', lang);
  }

  booking.caddieRating = rating;
  booking.caddieReview = review;
  await booking.save();

  // Actualizar promedio y totalRatings en el modelo Caddie
  const caddie = await Caddie.findById(booking.caddieId);
  if (caddie) {
    // Contar todas las calificaciones recibidas por el caddie
    const ratings = await Booking.find({
      caddieId: caddie._id,
      caddieRating: { $exists: true, $ne: null },
    }).select('caddieRating');
    const totalRatings = ratings.length;
    const avgRating =
      totalRatings > 0
        ? ratings.reduce((sum, b) => sum + (b.caddieRating || 0), 0) / totalRatings
        : 0;
    caddie.rating = avgRating;
    caddie.totalRatings = totalRatings;
    await caddie.save();
  }

  return booking;
};

// --- FUNCIÓN ANTERIOR DE DISPONIBILIDAD DE CADDIE ---
// Calificación del caddie al golfer
export const addGolferRating = async (
  bookingId: string,
  caddieUserId: string,
  rating: number,
  review: string,
  lang: string
): Promise<IBooking> => {
  const booking = await Booking.findById(bookingId);
  if (!booking) {
    throw new NotFoundError('booking.notFound', lang);
  }

  // Verificar que el usuario es el caddie de la reserva
  const caddie = await Caddie.findOne({ userId: caddieUserId });
  if (!caddie || caddie._id.toString() !== booking.caddieId.toString()) {
    throw new BadRequestError('errors.forbidden', lang);
  }

  if (booking.status !== BookingStatus.COMPLETED) {
    throw new BadRequestError('errors.badRequest', lang);
  }

  if (booking.golferRating) {
    throw new BadRequestError('booking.alreadyRated', lang);
  }

  booking.golferRating = rating;
  booking.golferReview = review;
  await booking.save();

  // Actualizar promedio y totalRatings en el modelo Golfer
  const golfer = await Golfer.findById(booking.golferId);
  if (golfer) {
    // Contar todas las calificaciones recibidas por el golfer
    const ratings = await Booking.find({
      golferId: golfer._id,
      golferRating: { $exists: true, $ne: null },
    }).select('golferRating');
    const totalRatings = ratings.length;
    const avgRating =
      totalRatings > 0
        ? ratings.reduce((sum, b) => sum + (b.golferRating || 0), 0) / totalRatings
        : 0;
    golfer.rating = avgRating;
    golfer.totalRatings = totalRatings;
    await golfer.save();
  }

  return booking;
};

// --- FUNCIÓN ANTERIOR DE DISPONIBILIDAD DE CADDIE ---
// export const getCaddieAvailability = async (
//   caddieId: string,
//   date: string,
//   clubId: string,
//   lang: string
// ) => { ... }
// (Ver código comentado para referencia de la versión anterior)

// --- NUEVA FUNCIÓN getCaddieAvailability: bloques reales de disponibilidad para búsqueda ---
export const getCaddieAvailability = async (
  caddieId: string,
  date: string,
  clubId: string,
  lang: string,
  searchStartTime?: string,
  searchEndTime?: string
) => {
  const caddie = await Caddie.findById(caddieId);
  if (!caddie) throw new NotFoundError('caddie.notFound', lang);

  // Forzar uso de UTC para evitar desfases de zona horaria
  const bookingDate = DateTime.fromISO(date, { zone: 'utc' });
  // Luxon: weekday 1=lunes ... 7=domingo. Mongo: 0=domingo ... 6=sábado
  const dayOfWeek = bookingDate.weekday % 7;
  // Log explícito para depuración
  console.log('[AVAIL-DEBUG] date recibido:', date, '| bookingDate (UTC):', bookingDate.toISODate(), '| weekday:', bookingDate.weekday, '| dayOfWeek usado:', dayOfWeek);
  const recurring = caddie.recurringAvailability?.filter(
    (a: any) => a.clubId.toString() === clubId && a.dayOfWeek === dayOfWeek
  ) || [];

  // LOG SEGURO: recurring filtrado
  console.log('[AVAIL-DEBUG] recurring filtrado:', JSON.stringify(recurring));

  // Obtener reservas existentes para ese caddie, club y fecha
  const existingBookings = await Booking.find({
    caddieId,
    clubId,
    date: bookingDate,
    status: { $in: [BookingStatus.PENDING, BookingStatus.ACCEPTED] },
  });

  // Filtrar bloques ocupados
  let availableBlocks: { start: string; end: string }[] = [];
  for (const avail of recurring) {
    for (const slot of avail.timeSlots) {
      const [start, end] = slot.split('-');
      // Verificar si el bloque está ocupado por alguna reserva
      const isOccupied = existingBookings.some(b =>
        (start < b.endTime) && (end > b.startTime)
      );
      if (!isOccupied) {
        availableBlocks.push({ start, end });
      }
    }
  }

  // Determinar si el rango buscado coincide exactamente con algún bloque
  let matchedWithSearch = false;
  if (searchStartTime && searchEndTime) {
    // matchedWithSearch será true si hay algún bloque que solape (parcial o totalmente) con el rango buscado
    matchedWithSearch = availableBlocks.some(b => {
      // Solapamiento parcial o total
      return (
        b.start < searchEndTime && b.end > searchStartTime
      );
    });
  }

  return {
    caddieId: caddie._id.toString(),
    availableBlocks,
    matchedWithSearch,
  };
};

// Sugerir horarios alternativos cercanos cuando el solicitado no está disponible
export const suggestAlternativeTimes = async (
  caddieId: string,
  date: string,
  clubId: string,
  _requestedStart: string,
  _requestedEnd: string,
  lang: string
) => {
  const maxDaysToSearch = 14; // Buscar hasta 2 semanas adelante
  const maxDatesWithBlocks = 2; // Sugerir como máximo 2 fechas con bloques disponibles
  const alternatives: Array<{ date: string; startTime: string; endTime: string }> = [];

  // Buscar primero en la fecha solicitada
  let currentDate = date;
  let foundDates = 0;
  let daysChecked = 0;
  while (foundDates < maxDatesWithBlocks && daysChecked < maxDaysToSearch) {
    const availability = await getCaddieAvailability(caddieId, currentDate, clubId, lang);
    if (availability && Array.isArray(availability.availableBlocks) && availability.availableBlocks.length > 0) {
      for (const block of availability.availableBlocks) {
        alternatives.push({ date: currentDate, startTime: block.start, endTime: block.end });
      }
      foundDates++;
    }
    // Avanzar al siguiente día
    const nextDate = new Date(currentDate);
    nextDate.setDate(nextDate.getDate() + 1);
    currentDate = nextDate.toISOString().split('T')[0];
    daysChecked++;
  }

  return {
    alternatives: alternatives.slice(0, 6), // Limitar a 6 bloques sugeridos (3 por fecha máx)
  };
};

export const getNextServiceForUser = async (userId: string, role: 'golfer' | 'caddie'): Promise<IBooking | null> => {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  let query: any = {
    date: { $gte: today },
    status: { $in: [BookingStatus.ACCEPTED, BookingStatus.IN_PROGRESS] }
  };

  if (role === 'golfer') {
    const golfer = await Golfer.findOne({ userId });
    if (!golfer) return null;
    query.golferId = golfer._id;
  } else {
    const caddie = await Caddie.findOne({ userId });
    if (!caddie) return null;
    query.caddieId = caddie._id;
  }

  const nextBooking = await Booking.findOne(query)
    .populate({
      path: 'caddieId',
      select: 'userId photo category suggestedRate',
      populate: {
        path: 'userId',
        select: 'firstName lastName phone'
      }
    })
    .populate({
      path: 'golferId',
      select: 'userId',
      populate: {
        path: 'userId',
        select: 'firstName lastName phone'
      }
    })
    .populate('clubId', 'name address city')
    .sort({ date: 1, startTime: 1 })
    .limit(1);

  return nextBooking;
};

export const getTodayScheduleForCaddie = async (userId: string): Promise<IBooking[]> => {
  const caddie = await Caddie.findOne({ userId });
  if (!caddie) return [];

  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  const todayBookings = await Booking.find({
    caddieId: caddie._id,
    date: { $gte: today, $lt: tomorrow },
    status: { $in: [BookingStatus.ACCEPTED, BookingStatus.IN_PROGRESS] }
  })
    .populate({
      path: 'golferId',
      select: 'userId',
      populate: {
        path: 'userId',
        select: 'firstName lastName phone'
      }
    })
    .populate('clubId', 'name address')
    .sort({ startTime: 1 });

  return todayBookings;
};
