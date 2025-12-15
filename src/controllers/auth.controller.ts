import { Request, Response, NextFunction } from 'express';
import { authService } from '../services/auth.service';
import { t } from '../utils/i18n';
import { BadRequestError } from '../utils/errors';
import { UserRole } from '../types/enums';

export const register = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { email, password, firstName, lastName, phone, role, preferredLanguage } = req.body;
    const lang = req.language || 'es';

    // Validaciones básicas
    if (!email || !password || !firstName || !lastName || !role) {
      throw new BadRequestError('Missing required fields', 'errors.validation');
    }

    if (!Object.values(UserRole).includes(role)) {
      throw new BadRequestError('Invalid role', 'errors.validation');
    }

    const result = await authService.register({
      email,
      password,
      firstName,
      lastName,
      phone,
      role,
      preferredLanguage: preferredLanguage || lang,
    });

    res.status(201).json({
      status: t('common.success', lang),
      message: t('auth.registerSuccess', lang),
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

export const login = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { email, password } = req.body;
    const lang = req.language || 'es';

    // Validaciones básicas
    if (!email) {
      throw new BadRequestError('Email required', 'auth.emailRequired');
    }

    if (!password) {
      throw new BadRequestError('Password required', 'auth.passwordRequired');
    }

    const result = await authService.login({ email, password });

    res.json({
      status: t('common.success', lang),
      message: t('auth.loginSuccess', lang),
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

export const getMe = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.user?.userId;
    const lang = req.language || 'es';

    if (!userId) {
      throw new BadRequestError('User ID not found', 'errors.unauthorized');
    }

    const user = await authService.getUserById(userId);

    if (!user) {
      throw new BadRequestError('User not found', 'user.notFound');
    }

    res.json({
      status: t('common.success', lang),
      data: {
        id: user._id.toString(),
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role,
        preferredLanguage: user.preferredLanguage,
      },
    });
  } catch (error) {
    next(error);
  }
};
