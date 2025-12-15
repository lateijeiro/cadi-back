import { Caddie, ICaddie } from '../models/Caddie.model';
import { User } from '../models/User.model';
import { Club } from '../models/Club.model';
import { Booking } from '../models/Booking.model';
import { NotFoundError, BadRequestError } from '../utils/errors';
import { CaddieStatus, CaddieCategory, BookingStatus } from '../types/enums';
import { Types } from 'mongoose';

interface CreateCaddieProfileData {
  dni: string;
  photo?: string;
  experience: string;
  category: CaddieCategory;
  clubs: string[];
  suggestedRate: number;
}

interface UpdateCaddieProfileData {
  photo?: string;
  experience?: string;
  category?: CaddieCategory;
  clubs?: string[];
  suggestedRate?: number;
}

interface UpdateCaddiePersonalData {
  firstName?: string;
  lastName?: string;
  phone?: string;
  preferredLanguage?: string;
  photo?: string;
  experience?: string;
}

interface UpdateCaddieServicesData {
  category?: CaddieCategory;
  clubs?: string[];
  suggestedRate?: number;
  recurringAvailability?: Array<{
    clubId: string;
    dayOfWeek: number;
    timeSlots: string[];
  }>;
}

interface AvailabilityData {
  date: Date;
  timeSlots: string[];
}

export class CaddieService {
  
  async createCaddieProfile(userId: string, data: CreateCaddieProfileData): Promise<ICaddie> {
    // Verificar que el usuario existe
    const user = await User.findById(userId);
    if (!user) {
      throw new NotFoundError('User not found', 'user.notFound');
    }

    // Verificar que no exista ya un perfil de caddie
    const existingCaddie = await Caddie.findOne({ userId });
    if (existingCaddie) {
      throw new BadRequestError('Caddie profile already exists', 'errors.validation');
    }

    // Verificar que los clubs existen
    if (data.clubs && data.clubs.length > 0) {
      const clubIds = data.clubs.map(id => new Types.ObjectId(id));
      const clubCount = await Club.countDocuments({ _id: { $in: clubIds } });
      if (clubCount !== data.clubs.length) {
        throw new BadRequestError('Some clubs do not exist', 'errors.validation');
      }
    }

    // Crear perfil de caddie (pendiente de aprobación)
    const clubIds = data.clubs.map(id => new Types.ObjectId(id));
    
    const caddie = await Caddie.create({
      userId,
      dni: data.dni,
      photo: data.photo,
      experience: data.experience,
      category: data.category,
      clubs: clubIds,
      suggestedRate: data.suggestedRate,
      status: CaddieStatus.PENDING,
      availability: [],
    });

    return await caddie.populate('userId', '-password');
  }

  async getCaddieProfile(userId: string): Promise<ICaddie> {
    const caddie = await Caddie.findOne({ userId })
      .populate('userId', '-password')
      .populate('clubs');
    
    if (!caddie) {
      throw new NotFoundError('Caddie profile not found', 'caddie.notFound');
    }
    
    return caddie;
  }

  async updateCaddieProfile(userId: string, data: UpdateCaddieProfileData): Promise<ICaddie> {
    const caddie = await Caddie.findOne({ userId });
    
    if (!caddie) {
      throw new NotFoundError('Caddie profile not found', 'caddie.notFound');
    }

    // Verificar clubs si se proporcionan
    if (data.clubs && data.clubs.length > 0) {
      const clubIds = data.clubs.map(id => new Types.ObjectId(id));
      const clubCount = await Club.countDocuments({ _id: { $in: clubIds } });
      if (clubCount !== data.clubs.length) {
        throw new BadRequestError('Some clubs do not exist', 'errors.validation');
      }
    }

    // Actualizar campos
    if (data.photo !== undefined) caddie.photo = data.photo;
    if (data.experience !== undefined) caddie.experience = data.experience;
    if (data.category !== undefined) caddie.category = data.category;
    if (data.clubs !== undefined) caddie.clubs = data.clubs.map(id => new Types.ObjectId(id));
    if (data.suggestedRate !== undefined) caddie.suggestedRate = data.suggestedRate;

    await caddie.save();

    return await caddie.populate(['userId', 'clubs']);
  }

  async updateAvailability(userId: string, availability: AvailabilityData[]): Promise<ICaddie> {
    const caddie = await Caddie.findOne({ userId });
    
    if (!caddie) {
      throw new NotFoundError('Caddie profile not found', 'caddie.notFound');
    }

    caddie.availability = availability;
    await caddie.save();

    return await caddie.populate(['userId', 'clubs']);
  }

  async updateRecurringAvailability(
    userId: string,
    recurringAvailability: Array<{
      clubId: string;
      dayOfWeek: number;
      timeSlots: string[];
    }>
  ): Promise<ICaddie> {
    const caddie = await Caddie.findOne({ userId });
    
    if (!caddie) {
      throw new NotFoundError('Caddie profile not found', 'caddie.notFound');
    }

    // Validar que los clubs existen y el caddie trabaja en ellos
    for (const avail of recurringAvailability) {
      const clubId = new Types.ObjectId(avail.clubId);
      if (!caddie.clubs.some(c => c.toString() === clubId.toString())) {
        throw new BadRequestError(
          `Caddie does not work at club ${avail.clubId}`,
          'errors.validation'
        );
      }
    }

    // Actualizar disponibilidad recurrente
    caddie.recurringAvailability = recurringAvailability.map(avail => ({
      clubId: new Types.ObjectId(avail.clubId),
      dayOfWeek: avail.dayOfWeek,
      timeSlots: avail.timeSlots,
    }));

    await caddie.save();

    return await caddie.populate(['userId', 'clubs']);
  }

  async approveCaddie(caddieId: string): Promise<ICaddie> {
    const caddie = await Caddie.findById(caddieId);
    
    if (!caddie) {
      throw new NotFoundError('Caddie not found', 'caddie.notFound');
    }

    caddie.status = CaddieStatus.APPROVED;
    await caddie.save();

    return await caddie.populate(['userId', 'clubs']);
  }

  async rejectCaddie(caddieId: string): Promise<ICaddie> {
    const caddie = await Caddie.findById(caddieId);
    
    if (!caddie) {
      throw new NotFoundError('Caddie not found', 'caddie.notFound');
    }

    caddie.status = CaddieStatus.REJECTED;
    await caddie.save();

    return await caddie.populate(['userId', 'clubs']);
  }

  async getCaddieById(caddieId: string): Promise<ICaddie> {
    const caddie = await Caddie.findById(caddieId)
      .populate('userId', '-password')
      .populate('clubs');
    
    if (!caddie) {
      throw new NotFoundError('Caddie not found', 'caddie.notFound');
    }
    
    return caddie;
  }

  async listCaddies(
    page: number = 1,
    limit: number = 10,
    status?: CaddieStatus
  ): Promise<{ caddies: ICaddie[]; total: number }> {
    const skip = (page - 1) * limit;
    const filter: any = {};
    
    if (status) {
      filter.status = status;
    }
    
    const [caddies, total] = await Promise.all([
      Caddie.find(filter)
        .populate('userId', '-password')
        .populate('clubs')
        .skip(skip)
        .limit(limit)
        .sort({ createdAt: -1 }),
      Caddie.countDocuments(filter),
    ]);

    return { caddies, total };
  }

  async searchCaddies(
    clubId: string,
    date: Date,
    startTime: string,
    endTime: string
  ): Promise<ICaddie[]> {
    const { Booking } = await import('../models/Booking.model');
    const { BookingStatus } = await import('../types/enums');
    
    // Helper: convierte HH:mm a minutos desde medianoche
    const timeToMinutes = (time: string): number => {
      const [hours, minutes] = time.split(':').map(Number);
      return hours * 60 + minutes;
    };

    // Helper: verifica si el rango solicitado cabe dentro de un slot de disponibilidad
    const isWithinTimeSlot = (slotStr: string): boolean => {
      // Parsear varios formatos: "9-12", "09:00-12:00", etc.
      const match = slotStr.match(/^(\d{1,2}):?(\d{2})?-(\d{1,2}):?(\d{2})?$/);
      if (!match) return false;

      const slotStart = `${match[1].padStart(2, '0')}:${match[2] || '00'}`;
      const slotEnd = `${match[3].padStart(2, '0')}:${match[4] || '00'}`;

      const slotStartMin = timeToMinutes(slotStart);
      const slotEndMin = timeToMinutes(slotEnd);
      const requestStartMin = timeToMinutes(startTime);
      const requestEndMin = timeToMinutes(endTime);

      // El rango solicitado debe estar completamente dentro del slot
      return requestStartMin >= slotStartMin && requestEndMin <= slotEndMin;
    };
    
    // Buscar caddies aprobados que trabajen en ese club
    const caddies = await Caddie.find({
      status: CaddieStatus.APPROVED,
      clubs: new Types.ObjectId(clubId),
    })
      .populate('userId', '-password')
      .populate('clubs');

    const clubObjectId = new Types.ObjectId(clubId);
    const dayOfWeek = date.getDay(); // 0=Domingo, 1=Lunes, etc.

    // Filtrar caddies disponibles
    const availableCaddies: ICaddie[] = [];

    for (const caddie of caddies) {
      // 1. Verificar disponibilidad específica O recurrente
      let hasAvailability = false;

      // Verificar disponibilidad específica para esta fecha
      const dateStr = date.toISOString().split('T')[0];
      const specificAvailability = caddie.availability.find(
        a => a.date.toISOString().split('T')[0] === dateStr
      );

      if (specificAvailability && specificAvailability.timeSlots.some(slot => isWithinTimeSlot(slot))) {
        hasAvailability = true;
      }

      // Si no hay disponibilidad específica, verificar disponibilidad recurrente
      if (!hasAvailability && caddie.recurringAvailability) {
        const recurringAvail = caddie.recurringAvailability.find(
          ra => ra.clubId.toString() === clubObjectId.toString() &&
                ra.dayOfWeek === dayOfWeek &&
                ra.timeSlots.some(slot => isWithinTimeSlot(slot))
        );
        
        if (recurringAvail) {
          hasAvailability = true;
        }
      }

      // Si no tiene disponibilidad, pasar al siguiente
      if (!hasAvailability) {
        continue;
      }

      // 2. Verificar que NO tenga reservas que se solapen en ese horario
      const dateStart = new Date(date);
      dateStart.setHours(0, 0, 0, 0);
      const dateEnd = new Date(date);
      dateEnd.setHours(23, 59, 59, 999);

      const existingBookings = await Booking.find({
        caddieId: caddie._id,
        clubId: clubObjectId,
        date: {
          $gte: dateStart,
          $lt: dateEnd,
        },
        status: { $in: [BookingStatus.PENDING, BookingStatus.ACCEPTED] },
      });

      // Verificar si hay solapamiento con alguna reserva existente
      const hasOverlap = existingBookings.some((booking) => {
        // Solapamiento: (start1 < end2) && (end1 > start2)
        return startTime < booking.endTime && endTime > booking.startTime;
      });

      // Si NO tiene solapamiento, está disponible
      if (!hasOverlap) {
        availableCaddies.push(caddie);
      }
    }

    return availableCaddies;
  }

  async getMonthStats(userId: string): Promise<any> {
    const caddie = await Caddie.findOne({ userId });
    if (!caddie) {
      throw new NotFoundError('Caddie not found', 'caddie.notFound');
    }

    // Primer y último día del mes actual
    const now = new Date();
    const firstDay = new Date(now.getFullYear(), now.getMonth(), 1);
    const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);

    // Obtener todas las reservas del mes
    const bookings = await Booking.find({
      caddieId: caddie._id,
      date: { $gte: firstDay, $lte: lastDay }
    });

    // Calcular estadísticas
    const totalBookings = bookings.length;
    const completedBookings = bookings.filter(b => b.status === BookingStatus.COMPLETED).length;
    const pendingBookings = bookings.filter(b => b.status === BookingStatus.PENDING).length;
    const acceptedBookings = bookings.filter(b => b.status === BookingStatus.ACCEPTED).length;

    // Calcular ingresos estimados (de servicios completados)
    const estimatedEarnings = bookings
      .filter(b => b.status === BookingStatus.COMPLETED)
      .reduce((sum, booking) => {
        return sum + (booking.totalPrice || 0);
      }, 0);

    return {
      month: now.toLocaleString('es-AR', { month: 'long', year: 'numeric' }),
      totalBookings,
      completedBookings,
      pendingBookings,
      acceptedBookings,
      estimatedEarnings: Math.round(estimatedEarnings)
    };
  }

  async updateCaddiePersonalData(userId: string, data: UpdateCaddiePersonalData): Promise<ICaddie> {
    // Validar que el usuario existe
    const user = await User.findById(userId);
    if (!user) {
      throw new NotFoundError('User not found', 'user.notFound');
    }

    const caddie = await Caddie.findOne({ userId });
    if (!caddie) {
      throw new NotFoundError('Caddie profile not found', 'caddie.notFound');
    }

    // Validar idioma si se proporciona
    if (data.preferredLanguage && !['es', 'en'].includes(data.preferredLanguage)) {
      throw new BadRequestError('Invalid language', 'validation.invalidFormat');
    }

    // Actualizar datos del User
    if (data.firstName) user.firstName = data.firstName;
    if (data.lastName) user.lastName = data.lastName;
    if (data.phone !== undefined) user.phone = data.phone;
    if (data.preferredLanguage) user.preferredLanguage = data.preferredLanguage;
    await user.save();

    // Actualizar datos del Caddie
    if (data.photo !== undefined) caddie.photo = data.photo;
    if (data.experience) caddie.experience = data.experience;
    await caddie.save();

    return await caddie.populate(['userId', 'clubs']);
  }

  async updateCaddieServices(userId: string, data: UpdateCaddieServicesData): Promise<ICaddie> {
    const caddie = await Caddie.findOne({ userId });
    if (!caddie) {
      throw new NotFoundError('Caddie profile not found', 'caddie.notFound');
    }

    // Verificar clubs si se proporcionan
    if (data.clubs && data.clubs.length > 0) {
      const clubIds = data.clubs.map(id => new Types.ObjectId(id));
      const clubCount = await Club.countDocuments({ _id: { $in: clubIds } });
      if (clubCount !== data.clubs.length) {
        throw new BadRequestError('Some clubs do not exist', 'errors.validation');
      }
      caddie.clubs = clubIds;
    }

    // Actualizar datos del servicio
    if (data.category) caddie.category = data.category;
    if (data.suggestedRate !== undefined) caddie.suggestedRate = data.suggestedRate;

    // Actualizar disponibilidad recurrente
    if (data.recurringAvailability) {
      // Validar que los clubs existen y el caddie trabaja en ellos
      for (const avail of data.recurringAvailability) {
        const clubId = new Types.ObjectId(avail.clubId);
        if (!caddie.clubs.some(c => c.toString() === clubId.toString())) {
          throw new BadRequestError(
            `Caddie does not work at club ${avail.clubId}`,
            'errors.validation'
          );
        }
      }

      caddie.recurringAvailability = data.recurringAvailability.map(avail => ({
        clubId: new Types.ObjectId(avail.clubId),
        dayOfWeek: avail.dayOfWeek,
        timeSlots: avail.timeSlots,
      }));
    }

    await caddie.save();

    return await caddie.populate(['userId', 'clubs']);
  }
}

export const caddieService = new CaddieService();
