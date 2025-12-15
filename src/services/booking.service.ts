import { Booking, IBooking } from '../models/Booking.model';
import { Caddie } from '../models/Caddie.model';
import { Golfer } from '../models/Golfer.model';
import { Club } from '../models/Club.model';
import { BookingStatus } from '../types/enums';
import { NotFoundError, BadRequestError } from '../utils/errors';
import { generateQRCode } from '../utils/qrcode';

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

  // Verificar solapamiento con otras reservas del caddie
  const bookingDate = new Date(date);
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

  // Verificar disponibilidad del caddie
  const dayOfWeek = bookingDate.getDay();

  // Convertir hora "HH:mm" a minutos desde medianoche para comparaciones
  const timeToMinutes = (time: string): number => {
    const [hours, minutes] = time.split(':').map(Number);
    return hours * 60 + minutes;
  };

  const requestStartMinutes = timeToMinutes(startTime);
  const requestEndMinutes = timeToMinutes(endTime);

  // Función para verificar si el rango solicitado está dentro de un slot de disponibilidad
  const isWithinTimeSlot = (slot: string): boolean => {
    // Slot puede ser "9-12", "09:00-12:00", etc
    const slotMatch = slot.match(/(\d{1,2}):?(\d{0,2})-(\d{1,2}):?(\d{0,2})/);
    if (!slotMatch) return false;

    const slotStartHours = parseInt(slotMatch[1]);
    const slotStartMins = slotMatch[2] ? parseInt(slotMatch[2]) : 0;
    const slotEndHours = parseInt(slotMatch[3]);
    const slotEndMins = slotMatch[4] ? parseInt(slotMatch[4]) : 0;

    const slotStartMinutes = slotStartHours * 60 + slotStartMins;
    const slotEndMinutes = slotEndHours * 60 + slotEndMins;

    // El rango solicitado debe estar completamente dentro del slot
    return requestStartMinutes >= slotStartMinutes && requestEndMinutes <= slotEndMinutes;
  };

  // Verificar disponibilidad específica para esa fecha
  const hasSpecificAvailability = caddie.availability?.some(
    (avail) =>
      avail.date.toISOString().split('T')[0] === date &&
      avail.timeSlots.some(isWithinTimeSlot)
  );

  // Verificar disponibilidad recurrente
  const hasRecurringAvailability = caddie.recurringAvailability?.some(
    (avail) =>
      avail.clubId.toString() === clubId &&
      avail.dayOfWeek === dayOfWeek &&
      avail.timeSlots.some(isWithinTimeSlot)
  );

  if (!hasSpecificAvailability && !hasRecurringAvailability) {
    throw new BadRequestError('El caddie no está disponible en ese horario', 'caddie.notAvailable');
  }

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

  return booking;
};

export const getBookingById = async (bookingId: string, lang: string): Promise<IBooking> => {
  const booking = await Booking.findById(bookingId)
    .populate('golferId', 'userId')
    .populate('caddieId', 'userId dni category experience')
    .populate('clubId', 'name address');

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
      select: 'userId',
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

  // Generar QR code con datos de la reserva
  const qrCodeData = {
    bookingId: booking._id.toString(),
    caddieId: booking.caddieId.toString(),
    golferId: booking.golferId.toString(),
    clubId: booking.clubId.toString(),
    date: booking.date.toISOString(),
    startTime: booking.startTime,
    endTime: booking.endTime,
    timestamp: Date.now(),
  };

  const qrCode = await generateQRCode(qrCodeData);

  booking.status = BookingStatus.ACCEPTED;
  booking.qrCode = qrCode;
  await booking.save();

  return booking;
};

export const rejectBooking = async (
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

  booking.status = BookingStatus.REJECTED;
  await booking.save();

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

  // Validar que el caddie sea el correcto
  if (parsedQR.caddieId !== booking.caddieId.toString()) {
    throw new BadRequestError('El código QR no corresponde a este caddie', 'booking.qrCaddieMismatch');
  }

  // Validar fecha (opcional - permitir +/- 1 día)
  const bookingDate = new Date(booking.date);
  const qrDate = new Date(parsedQR.date);
  const daysDiff = Math.abs((bookingDate.getTime() - qrDate.getTime()) / (1000 * 60 * 60 * 24));
  if (daysDiff > 1) {
    throw new BadRequestError('El código QR no corresponde a la fecha de esta reserva', 'booking.qrDateMismatch');
  }

  // Cambiar status a in-progress
  booking.status = BookingStatus.IN_PROGRESS;
  await booking.save();

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
  await booking.save();

  return booking;
};

export const cancelBooking = async (
  bookingId: string,
  userId: string,
  userRole: string,
  lang: string
): Promise<IBooking> => {
  const booking = await Booking.findById(bookingId).populate('caddieId golferId');
  if (!booking) {
    throw new NotFoundError('booking.notFound', lang);
  }

  // Verificar que el usuario es el golfer o el caddie de la reserva
  let isOwner = false;

  if (userRole === 'golfer') {
    const golfer = await Golfer.findOne({ userId });
    if (golfer && golfer._id.toString() === booking.golferId.toString()) {
      isOwner = true;
    }
  } else if (userRole === 'caddie') {
    const caddie = await Caddie.findOne({ userId });
    if (caddie && caddie._id.toString() === booking.caddieId.toString()) {
      isOwner = true;
    }
  }

  if (!isOwner) {
    throw new BadRequestError('errors.forbidden', lang);
  }

  if (booking.status === BookingStatus.COMPLETED || booking.status === BookingStatus.CANCELLED) {
    throw new BadRequestError('errors.badRequest', lang);
  }

  booking.status = BookingStatus.CANCELLED;
  await booking.save();

  return booking;
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

  booking.rating = rating;
  booking.review = review;
  await booking.save();

  return booking;
};

// Obtener disponibilidad de un caddie en una fecha específica
export const getCaddieAvailability = async (
  caddieId: string,
  date: string,
  clubId: string,
  lang: string
) => {
  const caddie = await Caddie.findById(caddieId);
  if (!caddie) {
    throw new NotFoundError('caddie.notFound', lang);
  }

  const bookingDate = new Date(date);
  const dayOfWeek = bookingDate.getDay();

  // Obtener slots de disponibilidad del caddie
  let availableSlots: string[] = [];

  // Disponibilidad específica para esa fecha
  const specificAvail = caddie.availability?.find(
    (avail) => avail.date.toISOString().split('T')[0] === date
  );
  if (specificAvail) {
    availableSlots = [...specificAvail.timeSlots];
  }

  // Disponibilidad recurrente
  const recurringAvails = caddie.recurringAvailability?.filter(
    (avail) =>
      avail.clubId.toString() === clubId &&
      avail.dayOfWeek === dayOfWeek
  );
  if (recurringAvails && recurringAvails.length > 0) {
    recurringAvails.forEach((avail) => {
      availableSlots.push(...avail.timeSlots);
    });
  }

  // Obtener reservas existentes para ese día
  const existingBookings = await Booking.find({
    caddieId,
    date: bookingDate,
    status: { $in: [BookingStatus.PENDING, BookingStatus.ACCEPTED] },
  }).select('startTime endTime');

  // Convertir slots a rangos horarios libres
  const freeRanges = availableSlots.flatMap((slot) => {
    const slotMatch = slot.match(/(\d{1,2}):?(\d{0,2})-(\d{1,2}):?(\d{0,2})/);
    if (!slotMatch) return [];

    const slotStartHours = parseInt(slotMatch[1]);
    const slotStartMins = slotMatch[2] ? parseInt(slotMatch[2]) : 0;
    const slotEndHours = parseInt(slotMatch[3]);
    const slotEndMins = slotMatch[4] ? parseInt(slotMatch[4]) : 0;

    const slotStart = `${String(slotStartHours).padStart(2, '0')}:${String(slotStartMins).padStart(2, '0')}`;
    const slotEnd = `${String(slotEndHours).padStart(2, '0')}:${String(slotEndMins).padStart(2, '0')}`;

    return [{ start: slotStart, end: slotEnd }];
  });

  // Filtrar rangos que no están ocupados por bookings existentes
  const availableRanges = freeRanges.filter((range) => {
    return !existingBookings.some((booking) => {
      // Verificar solapamiento
      return (range.start < booking.endTime) && (range.end > booking.startTime);
    });
  });

  return {
    date,
    dayOfWeek,
    availableRanges,
    existingBookings: existingBookings.map((b) => ({
      startTime: b.startTime,
      endTime: b.endTime,
    })),
  };
};

// Sugerir horarios alternativos cercanos cuando el solicitado no está disponible
export const suggestAlternativeTimes = async (
  caddieId: string,
  date: string,
  clubId: string,
  requestedStart: string,
  requestedEnd: string,
  lang: string
) => {
  const availability = await getCaddieAvailability(caddieId, date, clubId, lang);

  const timeToMinutes = (time: string): number => {
    const [hours, minutes] = time.split(':').map(Number);
    return hours * 60 + minutes;
  };

  const requestedStartMinutes = timeToMinutes(requestedStart);
  const requestedEndMinutes = timeToMinutes(requestedEnd);
  const requestedDuration = requestedEndMinutes - requestedStartMinutes;

  // Buscar slots disponibles que puedan acomodar la duración solicitada
  const alternatives = availability.availableRanges
    .map((range) => {
      const rangeStartMinutes = timeToMinutes(range.start);
      const rangeEndMinutes = timeToMinutes(range.end);
      const rangeDuration = rangeEndMinutes - rangeStartMinutes;

      if (rangeDuration < requestedDuration) {
        return null; // No cabe
      }

      // Calcular qué tan cerca está del horario solicitado
      const distanceFromRequested = Math.abs(rangeStartMinutes - requestedStartMinutes);

      return {
        startTime: range.start,
        endTime: range.end,
        suggestedStart: range.start,
        suggestedEnd: range.start.split(':').map((v, i) => {
          if (i === 0) {
            const newMinutes = rangeStartMinutes + requestedDuration;
            const hours = Math.floor(newMinutes / 60);
            const mins = newMinutes % 60;
            return `${String(hours).padStart(2, '0')}:${String(mins).padStart(2, '0')}`;
          }
          return v;
        }).join(''),
        distance: distanceFromRequested,
      };
    })
    .filter(Boolean)
    .sort((a: any, b: any) => a.distance - b.distance)
    .slice(0, 3); // Top 3 alternativas más cercanas

  return {
    requestedTime: { start: requestedStart, end: requestedEnd },
    isAvailable: alternatives.some(
      (alt: any) => alt.suggestedStart === requestedStart
    ),
    alternatives,
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
