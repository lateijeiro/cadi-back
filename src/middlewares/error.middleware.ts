import { Request, Response, NextFunction } from 'express';
import { t } from '../utils/i18n';

export const errorHandler = (
  err: any,
  req: Request,
  res: Response,
  next: NextFunction
) => {
  console.error('Error:', err);
  
  const statusCode = err.statusCode || 500;
  const lang = req.language || 'es';
  
  // Si el error tiene una key de traducción, usarla
  const message = err.translationKey 
    ? t(err.translationKey, lang, err.translationParams)
    : err.message || t('errors.internal', lang);
  
  res.status(statusCode).json({
    status: 'error',
    message,
  });
};
