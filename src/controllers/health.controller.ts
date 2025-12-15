import { Request, Response } from 'express';
import { t } from '../utils/i18n';

export const healthCheck = (req: Request, res: Response) => {
  const lang = req.language || 'es';
  
  res.json({ 
    status: t('common.ok', lang),
    message: 'CadiApp API',
    language: lang,
    timestamp: new Date().toISOString()
  });
};
