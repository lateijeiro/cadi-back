import { Golfer, IGolfer } from '../models/Golfer.model';
import { User } from '../models/User.model';
import { Booking } from '../models/Booking.model';
import { NotFoundError, BadRequestError } from '../utils/errors';
import { BookingStatus } from '../types/enums';

interface UpdateGolferData {
  homeClub?: string;
  homeClubId?: string;
  handicap?: number;
}

interface UpdateGolferProfileData {
  // User fields
  firstName?: string;
  lastName?: string;
  phone?: string;
  preferredLanguage?: string;
  // Golfer fields
  homeClub?: string;
  homeClubId?: string;
  handicap?: number;
}

export class GolferService {
  
  async getGolferProfile(userId: string): Promise<IGolfer> {
    const golfer = await Golfer.findOne({ userId })
      .populate('userId', '-password')
      .populate('homeClubId');
    
    if (!golfer) {
      throw new NotFoundError('Golfer profile not found', 'user.notFound');
    }
    
    return golfer;
  }

  async updateGolferProfile(userId: string, data: UpdateGolferData): Promise<IGolfer> {
    // Validar que el usuario existe
    const user = await User.findById(userId);
    if (!user) {
      throw new NotFoundError('User not found', 'user.notFound');
    }

    // Validar handicap si se proporciona
    if (data.handicap !== undefined) {
      if (data.handicap < 0 || data.handicap > 54) {
        throw new BadRequestError('Invalid handicap value', 'validation.invalidFormat');
      }
    }

    // Buscar o crear perfil de golfista
    let golfer = await Golfer.findOne({ userId });
    
    if (!golfer) {
      // Si no existe, crear uno nuevo
      golfer = await Golfer.create({
        userId,
        ...data,
      });
    } else {
      // Si existe, actualizar
      if (data.homeClub !== undefined) {
        golfer.homeClub = data.homeClub;
      }
      if (data.homeClubId !== undefined) {
        golfer.homeClubId = data.homeClubId as any;
      }
      if (data.handicap !== undefined) {
        golfer.handicap = data.handicap;
      }
      await golfer.save();
    }

    return await (await golfer.populate('userId', '-password')).populate('homeClubId');
  }

  async updateFullGolferProfile(userId: string, data: UpdateGolferProfileData): Promise<IGolfer> {
    // Validar que el usuario existe
    const user = await User.findById(userId);
    if (!user) {
      throw new NotFoundError('User not found', 'user.notFound');
    }

    // Validar handicap si se proporciona
    if (data.handicap !== undefined) {
      if (data.handicap < 0 || data.handicap > 54) {
        throw new BadRequestError('Invalid handicap value', 'validation.invalidFormat');
      }
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

    // Buscar o crear perfil de golfista
    let golfer = await Golfer.findOne({ userId });
    
    if (!golfer) {
      golfer = await Golfer.create({
        userId,
        homeClub: data.homeClub,
        homeClubId: data.homeClubId,
        handicap: data.handicap,
      });
    } else {
      if (data.homeClub !== undefined) golfer.homeClub = data.homeClub;
      if (data.homeClubId !== undefined) golfer.homeClubId = data.homeClubId as any;
      if (data.handicap !== undefined) golfer.handicap = data.handicap;
      await golfer.save();
    }

    return await golfer.populate(['userId', 'homeClubId']);
  }

  async getGolferById(golferId: string): Promise<IGolfer> {
    const golfer = await Golfer.findById(golferId)
      .populate('userId', '-password')
      .populate('homeClubId');
    
    if (!golfer) {
      throw new NotFoundError('Golfer not found', 'user.notFound');
    }
    
    return golfer;
  }

  async listGolfers(page: number = 1, limit: number = 10): Promise<{ golfers: IGolfer[]; total: number }> {
    const skip = (page - 1) * limit;
    
    const [golfers, total] = await Promise.all([
      Golfer.find()
        .populate('userId', '-password')
        .skip(skip)
        .limit(limit)
        .sort({ createdAt: -1 }),
      Golfer.countDocuments(),
    ]);

    return { golfers, total };
  }

  async getRecentCaddies(userId: string, limit: number = 5): Promise<any[]> {
    const golfer = await Golfer.findOne({ userId });
    if (!golfer) {
      return [];
    }

    // Obtener bookings completados del golfista, agrupados por caddie
    const recentBookings = await Booking.aggregate([
      {
        $match: {
          golferId: golfer._id,
          status: BookingStatus.COMPLETED
        }
      },
      {
        $sort: { date: -1 }
      },
      {
        $group: {
          _id: '$caddieId',
          lastBookingDate: { $first: '$date' },
          totalServices: { $sum: 1 }
        }
      },
      {
        $sort: { lastBookingDate: -1 }
      },
      {
        $limit: limit
      },
      {
        $lookup: {
          from: 'caddies',
          localField: '_id',
          foreignField: '_id',
          as: 'caddie'
        }
      },
      {
        $unwind: '$caddie'
      },
      {
        $lookup: {
          from: 'users',
          localField: 'caddie.userId',
          foreignField: '_id',
          as: 'user'
        }
      },
      {
        $unwind: '$user'
      },
      {
        $project: {
          _id: '$caddie._id',
          userId: '$caddie.userId',
          firstName: '$user.firstName',
          lastName: '$user.lastName',
          photo: '$caddie.photo',
          category: '$caddie.category',
          suggestedRate: '$caddie.suggestedRate',
          lastBookingDate: 1,
          totalServices: 1,
          rating: '$caddie.rating',
          totalRatings: '$caddie.totalRatings'
        }
      }
    ]);

    return recentBookings;
  }
}

export const golferService = new GolferService();
