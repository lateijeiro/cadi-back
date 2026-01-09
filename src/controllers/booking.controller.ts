// Obtener reservas como golfer (solo reservas donde soy golfer)
import { Request, Response, NextFunction } from 'express';
import * as bookingService from '../services/booking.service';
import { IBooking } from '../models/Booking.model';
import { t } from '../utils/i18n';

export const getBookingsAsGolfer = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.user!.userId;
    const bookings = await bookingService.getMyBookingsAsGolfer(userId);
    res.json({ data: bookings });
  } catch (error) {
    next(error);
  }
};

// Obtener reservas como caddie (solo reservas donde soy caddie)
export const getBookingsAsCaddie = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.user!.userId;
    const bookings = await bookingService.getMyBookingsAsCaddie(userId);
    res.json({ data: bookings });
  } catch (error) {
    next(error);
  }
};
// Chequear disponibilidad y sugerir slot (endpoint único para frontend)
export const checkAvailabilityAndSuggest = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { caddieId, clubId, date, startTime, endTime } = req.query;
    const lang = req.language || 'es';

    if (!caddieId || !clubId || !date || !startTime || !endTime) {
      return res.status(400).json({
        message: t('validation.required', lang),
      });
    }

    // 1. Obtener bloques disponibles reales
    const availability = await bookingService.getCaddieAvailability(
      caddieId as string,
      date as string,
      clubId as string,
      lang,
      startTime as string,
      endTime as string
    );

    // Convertir HH:mm a minutos
    const toMinutes = (time: string) => {
      const [h, m] = time.split(':').map(Number);
      return h * 60 + m;
    };
    const reqStart = toMinutes(startTime as string);
    const reqEnd = toMinutes(endTime as string);

    // Buscar el bloque que cubre el inicio del rango buscado (el más natural para pre-cargar)
    // Buscar el bloque que empieza exactamente en el inicio buscado y termina después
    let bestBlock = availability.availableBlocks.find(b => {
      const blockStart = toMinutes(b.start);
      const blockEnd = toMinutes(b.end);
      return blockStart === reqStart && blockEnd > reqStart;
    });
    // Si no hay, buscar el primer bloque que contenga el inicio (pero no bloques que empiecen antes)
    if (!bestBlock) {
      bestBlock = availability.availableBlocks.find(b => {
        const blockStart = toMinutes(b.start);
        const blockEnd = toMinutes(b.end);
        return blockStart > reqStart && blockStart < reqEnd;
      });
    }
    // Si no hay, buscar el primer bloque que solape parcial o totalmente
    if (!bestBlock) {
      bestBlock = availability.availableBlocks.find(b => {
        const blockStart = toMinutes(b.start);
        const blockEnd = toMinutes(b.end);
        return blockStart < reqEnd && blockEnd > reqStart;
      });
    }

    if (bestBlock) {
      // Devolver el bloque real disponible
      return res.json({
        available: true,
        availableBlock: bestBlock,
      });
    }

    // 2. Sugerir siguiente slot disponible
    const suggestions = await bookingService.suggestAlternativeTimes(
      caddieId as string,
      date as string,
      clubId as string,
      startTime as string,
      endTime as string,
      lang
    );

    if (suggestions && suggestions.alternatives && suggestions.alternatives.length > 0) {
      // Tomar el primer slot sugerido
      return res.json({ available: false, nextAvailable: suggestions.alternatives[0] });
    }

    // 3. No hay disponibilidad ni sugerencias
    return res.json({ available: false });
  } catch (error) {
    return next(error);
  }
};
// Crear una nueva reserva (solo golfer)
export const createBooking = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { caddieId, clubId, date, startTime, endTime } = req.body;
    const golferId = req.user!.userId;
    const lang = req.language || 'es';

    if (!caddieId || !clubId || !date || !startTime || !endTime) {
      return res.status(400).json({
        message: t('validation.required', lang),
      });
    }

    const booking = await bookingService.createBooking(
      {
        golferId,
        caddieId,
        clubId,
        date,
        startTime,
        endTime,
      },
      lang
    );

    return res.status(201).json({
      message: t('booking.created', lang),
      data: booking,
    });
  } catch (error) {
    return next(error);
  }
};

// Obtener una reserva por ID
export const getBookingById = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const lang = req.language || 'es';

    const booking = await bookingService.getBookingById(id, lang);

    res.json({
      data: booking,
    });
  } catch (error) {
    next(error);
  }
};

// Obtener mis reservas (golfer o caddie)
export const getMyBookings = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.user!.userId;
    const userRole = req.user!.role;

    let bookings: IBooking[] = [];
    if (userRole === 'golfer') {
      bookings = await bookingService.getMyBookingsAsGolfer(userId);
    } else if (userRole === 'caddie') {
      bookings = await bookingService.getMyBookingsAsCaddie(userId);
    }

    res.json({
      data: bookings,
    });
  } catch (error) {
    next(error);
  }
};

// Aceptar una reserva (solo caddie)
export const acceptBooking = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const caddieUserId = req.user!.userId;
    const lang = req.language || 'es';

    const booking = await bookingService.acceptBooking(id, caddieUserId, lang);

    res.json({
      message: t('booking.accepted', lang),
      data: booking,
    });
  } catch (error) {
    next(error);
  }
};

// Rechazar una reserva (solo caddie)
export const rejectBooking = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const caddieUserId = req.user!.userId;
    const lang = req.language || 'es';

    const booking = await bookingService.rejectBooking(id, caddieUserId, lang);

    res.json({
      message: t('booking.rejected', lang),
      data: booking,
    });
  } catch (error) {
    next(error);
  }
};

// Iniciar servicio escaneando QR (solo caddie)
export const startBooking = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const { qrData } = req.body;
    const caddieUserId = req.user!.userId;
    const lang = req.language || 'es';

    if (!qrData) {
      return res.status(400).json({
        message: t('validation.required', lang),
      });
    }

    const booking = await bookingService.startBooking(id, caddieUserId, qrData, lang);

    return res.json({
      message: t('booking.started', lang),
      data: booking,
    });
  } catch (error) {
    return next(error);
  }
};

// Completar una reserva (solo caddie)
export const completeBooking = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const caddieUserId = req.user!.userId;
    const lang = req.language || 'es';

    const booking = await bookingService.completeBooking(id, caddieUserId, lang);

    res.json({
      message: t('booking.completed', lang),
      data: booking,
    });
  } catch (error) {
    next(error);
  }
};

// Cancelar una reserva (golfer o caddie)
export const cancelBooking = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const { reason } = req.body;
    const userId = req.user!.userId;
    const userRole = req.user!.role;
    const lang = req.language || 'es';

    const result = await bookingService.cancelBooking(id, userId, userRole, reason || '', lang);

    res.json({
      message: t('booking.cancelled', lang),
      data: result.booking,
      refundInfo: result.refundInfo,
    });
  } catch (error) {
    next(error);
  }
};

// Agregar calificación y reseña (solo golfer)
export const rateBooking = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const { rating, review } = req.body;
    const userId = req.user!.userId;
    const lang = req.language || 'es';

    if (!rating || rating < 1 || rating > 5) {
      return res.status(400).json({
        message: t('validation.invalidFormat', lang),
      });
    }

    const booking = await bookingService.addRating(id, userId, rating, review || '', lang);

    return res.json({
      message: t('common.updated', lang),
      data: booking,
    });
  } catch (error) {
    return next(error);
  }
};

// Obtener disponibilidad de un caddie
// Calificar golfer (solo caddie)
export const rateGolfer = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const { rating, review } = req.body;
    const caddieUserId = req.user!.userId;
    const lang = req.language || 'es';

    if (!rating || rating < 1 || rating > 5) {
      return res.status(400).json({
        message: t('validation.invalidFormat', lang),
      });
    }

    const booking = await bookingService.addGolferRating(id, caddieUserId, rating, review || '', lang);

    return res.json({
      message: t('common.updated', lang),
      data: booking,
    });
  } catch (error) {
    return next(error);
  }
};

// Obtener disponibilidad de un caddie
export const getCaddieAvailability = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { caddieId } = req.params;
    const { date, clubId, startTime, endTime } = req.query;
    const lang = req.language || 'es';

    if (!date || !clubId) {
      return res.status(400).json({
        message: t('validation.required', lang),
      });
    }

    const availability = await bookingService.getCaddieAvailability(
      caddieId,
      date as string,
      clubId as string,
      lang,
      startTime as string | undefined,
      endTime as string | undefined
    );

    return res.json({
      data: availability,
    });
  } catch (error) {
    return next(error);
  }
};

// Sugerir horarios alternativos
export const suggestAlternatives = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { caddieId } = req.params;
    const { date, clubId, startTime, endTime } = req.query;
    const lang = req.language || 'es';

    if (!date || !clubId || !startTime || !endTime) {
      return res.status(400).json({
        message: t('validation.required', lang),
      });
    }

    const suggestions = await bookingService.suggestAlternativeTimes(
      caddieId,
      date as string,
      clubId as string,
      startTime as string,
      endTime as string,
      lang
    );

    return res.json({
      data: suggestions,
    });
  } catch (error) {
    return next(error);
  }
};

// Obtener el próximo servicio del usuario (golfer o caddie)
export const getNextService = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.user!.userId;
    const role = req.user!.role as 'golfer' | 'caddie';
    const lang = req.language || 'es';

    const nextService = await bookingService.getNextServiceForUser(userId, role);

    res.json({
      status: t('common.success', lang),
      data: nextService,
    });
  } catch (error) {
    return next(error);
  }
};

// Obtener servicios de hoy para un caddie
export const getTodaySchedule = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.user!.userId;
    const lang = req.language || 'es';

    const todaySchedule = await bookingService.getTodayScheduleForCaddie(userId);

    res.json({
      status: t('common.success', lang),
      data: todaySchedule,
    });
  } catch (error) {
    return next(error);
  }
};
