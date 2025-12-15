import { Request, Response, NextFunction } from 'express';
import { caddieService } from '../services/caddie.service';
import { t } from '../utils/i18n';
import { BadRequestError } from '../utils/errors';
import { CaddieStatus } from '../types/enums';

export const createMyProfile = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.user?.userId;
    const { dni, photo, experience, category, clubs, suggestedRate } = req.body;
    const lang = req.language || 'es';

    if (!userId) {
      throw new BadRequestError('User ID not found', 'errors.unauthorized');
    }

    if (!dni || !experience || !category || !suggestedRate) {
      throw new BadRequestError('Missing required fields', 'errors.validation');
    }

    const caddie = await caddieService.createCaddieProfile(userId, {
      dni,
      photo,
      experience,
      category,
      clubs: clubs || [],
      suggestedRate,
    });

    res.status(201).json({
      status: t('common.success', lang),
      message: t('caddie.pending', lang),
      data: caddie,
    });
  } catch (error) {
    next(error);
  }
};

export const getMyProfile = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.user?.userId;
    const lang = req.language || 'es';

    if (!userId) {
      throw new BadRequestError('User ID not found', 'errors.unauthorized');
    }

    const caddie = await caddieService.getCaddieProfile(userId);

    res.json({
      status: t('common.success', lang),
      data: caddie,
    });
  } catch (error) {
    next(error);
  }
};

export const updateMyProfile = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.user?.userId;
    const { photo, experience, category, clubs, suggestedRate } = req.body;
    const lang = req.language || 'es';

    if (!userId) {
      throw new BadRequestError('User ID not found', 'errors.unauthorized');
    }

    const caddie = await caddieService.updateCaddieProfile(userId, {
      photo,
      experience,
      category,
      clubs,
      suggestedRate,
    });

    res.json({
      status: t('common.success', lang),
      message: t('user.updated', lang),
      data: caddie,
    });
  } catch (error) {
    next(error);
  }
};

export const updateMyAvailability = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.user?.userId;
    const { availability } = req.body;
    const lang = req.language || 'es';

    if (!userId) {
      throw new BadRequestError('User ID not found', 'errors.unauthorized');
    }

    if (!availability || !Array.isArray(availability)) {
      throw new BadRequestError('Invalid availability format', 'errors.validation');
    }

    const caddie = await caddieService.updateAvailability(userId, availability);

    res.json({
      status: t('common.success', lang),
      message: t('user.updated', lang),
      data: caddie,
    });
  } catch (error) {
    next(error);
  }
};

export const updateMyRecurringAvailability = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.user?.userId;
    const { recurringAvailability } = req.body;
    const lang = req.language || 'es';

    if (!userId) {
      throw new BadRequestError('User ID not found', 'errors.unauthorized');
    }

    if (!recurringAvailability || !Array.isArray(recurringAvailability)) {
      throw new BadRequestError('Invalid recurring availability format', 'errors.validation');
    }

    const caddie = await caddieService.updateRecurringAvailability(userId, recurringAvailability);

    res.json({
      status: t('common.success', lang),
      message: t('user.updated', lang),
      data: caddie,
    });
  } catch (error) {
    next(error);
  }
};

export const getCaddieById = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const lang = req.language || 'es';

    const caddie = await caddieService.getCaddieById(id);

    res.json({
      status: t('common.success', lang),
      data: caddie,
    });
  } catch (error) {
    next(error);
  }
};

export const listCaddies = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    const status = req.query.status as CaddieStatus | undefined;
    const lang = req.language || 'es';

    const result = await caddieService.listCaddies(page, limit, status);

    res.json({
      status: t('common.success', lang),
      data: {
        caddies: result.caddies,
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

export const searchCaddies = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { clubId, date, startTime, endTime } = req.query;
    const lang = req.language || 'es';

    if (!clubId || !date || !startTime || !endTime) {
      throw new BadRequestError('Missing required query parameters: clubId, date, startTime, endTime', 'errors.validation');
    }

    // Validar formato de tiempo HH:mm
    const timeRegex = /^([01]\d|2[0-3]):([0-5]\d)$/;
    if (!timeRegex.test(startTime as string) || !timeRegex.test(endTime as string)) {
      throw new BadRequestError('Invalid time format. Use HH:mm format', 'errors.validation');
    }

    const searchDate = new Date(date as string);
    const caddies = await caddieService.searchCaddies(
      clubId as string,
      searchDate,
      startTime as string,
      endTime as string
    );

    res.json({
      status: t('common.success', lang),
      data: caddies,
    });
  } catch (error) {
    next(error);
  }
};

// Admin endpoints
export const approveCaddie = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const lang = req.language || 'es';

    const caddie = await caddieService.approveCaddie(id);

    res.json({
      status: t('common.success', lang),
      message: t('caddie.approved', lang),
      data: caddie,
    });
  } catch (error) {
    next(error);
  }
};

export const rejectCaddie = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const lang = req.language || 'es';

    const caddie = await caddieService.rejectCaddie(id);

    res.json({
      status: t('common.success', lang),
      message: t('caddie.rejected', lang),
      data: caddie,
    });
  } catch (error) {
    next(error);
  }
};

export const getMonthStats = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.user?.userId;
    const lang = req.language || 'es';

    if (!userId) {
      throw new BadRequestError('User ID not found', 'errors.unauthorized');
    }

    const stats = await caddieService.getMonthStats(userId);

    res.json({
      status: t('common.success', lang),
      data: stats,
    });
  } catch (error) {
    next(error);
  }
};

export const updateMyPersonalProfile = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.user?.userId;
    const { firstName, lastName, phone, preferredLanguage, photo, experience } = req.body;
    const lang = req.language || 'es';

    if (!userId) {
      throw new BadRequestError('User ID not found', 'errors.unauthorized');
    }

    const caddie = await caddieService.updateCaddiePersonalData(userId, {
      firstName,
      lastName,
      phone,
      preferredLanguage,
      photo,
      experience,
    });

    res.json({
      status: t('common.success', lang),
      message: t('user.updated', lang),
      data: caddie,
    });
  } catch (error) {
    next(error);
  }
};

export const updateMyServices = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.user?.userId;
    const { category, clubs, suggestedRate, recurringAvailability } = req.body;
    const lang = req.language || 'es';

    if (!userId) {
      throw new BadRequestError('User ID not found', 'errors.unauthorized');
    }

    const caddie = await caddieService.updateCaddieServices(userId, {
      category,
      clubs,
      suggestedRate,
      recurringAvailability,
    });

    res.json({
      status: t('common.success', lang),
      message: t('user.updated', lang),
      data: caddie,
    });
  } catch (error) {
    next(error);
  }
};
