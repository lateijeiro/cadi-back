import { Request, Response, NextFunction } from 'express';
import { golferService } from '../services/golfer.service';
import { t } from '../utils/i18n';
import { BadRequestError } from '../utils/errors';

export const getMyProfile = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.user?.userId;
    const lang = req.language || 'es';

    if (!userId) {
      throw new BadRequestError('User ID not found', 'errors.unauthorized');
    }

    const golfer = await golferService.getGolferProfile(userId);

    res.json({
      status: t('common.success', lang),
      data: golfer,
    });
  } catch (error) {
    next(error);
  }
};

export const updateMyProfile = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.user?.userId;
    const { firstName, lastName, phone, preferredLanguage, homeClub, homeClubId, handicap } = req.body;
    const lang = req.language || 'es';

    if (!userId) {
      throw new BadRequestError('User ID not found', 'errors.unauthorized');
    }

    const golfer = await golferService.updateFullGolferProfile(userId, {
      firstName,
      lastName,
      phone,
      preferredLanguage,
      homeClub,
      homeClubId,
      handicap,
    });

    res.json({
      status: t('common.success', lang),
      message: t('user.updated', lang),
      data: golfer,
    });
  } catch (error) {
    next(error);
  }
};

export const getGolferById = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const lang = req.language || 'es';

    const golfer = await golferService.getGolferById(id);

    res.json({
      status: t('common.success', lang),
      data: golfer,
    });
  } catch (error) {
    next(error);
  }
};

export const listGolfers = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    const lang = req.language || 'es';

    const result = await golferService.listGolfers(page, limit);

    res.json({
      status: t('common.success', lang),
      data: {
        golfers: result.golfers,
        pagination: {
          page,
          limit,
          total: result.total,
          pages: Math.ceil(result.total / limit),
        },
      },
    });
  } catch (error) {
    next(error);
  }
};

export const getRecentCaddies = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.user?.userId;
    const limit = parseInt(req.query.limit as string) || 5;
    const lang = req.language || 'es';

    if (!userId) {
      throw new BadRequestError('User ID not found', 'errors.unauthorized');
    }

    const recentCaddies = await golferService.getRecentCaddies(userId, limit);

    res.json({
      status: t('common.success', lang),
      data: recentCaddies,
    });
  } catch (error) {
    next(error);
  }
};
