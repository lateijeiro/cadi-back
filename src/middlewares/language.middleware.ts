import { Request, Response, NextFunction } from 'express';
import { isValidLanguage, getDefaultLanguage } from '../utils/i18n';

declare global {
  namespace Express {
    interface Request {
      language: string;
    }
  }
}

export const languageMiddleware = (
  req: Request,
  _res: Response,
  next: NextFunction
) => {
  // 1. Intentar obtener idioma del header Accept-Language
  const acceptLanguage = req.headers['accept-language'];
  let detectedLang = getDefaultLanguage();
  
  if (acceptLanguage) {
    // Parsear Accept-Language (ej: "es-AR,es;q=0.9,en;q=0.8")
    const languages = acceptLanguage
      .split(',')
      .map(lang => {
        const [code] = lang.trim().split(';');
        return code.split('-')[0]; // Extraer solo el código de idioma (es, en)
      });
    
    // Buscar el primer idioma soportado
    const supportedLang = languages.find(lang => isValidLanguage(lang));
    if (supportedLang) {
      detectedLang = supportedLang;
    }
  }
  
  // 2. Permitir override por query param o header personalizado
  const queryLang = req.query.lang as string;
  const headerLang = req.headers['x-app-language'] as string;
  
  if (queryLang && isValidLanguage(queryLang)) {
    detectedLang = queryLang;
  } else if (headerLang && isValidLanguage(headerLang)) {
    detectedLang = headerLang;
  }
  
  // Asignar idioma al request
  req.language = detectedLang;
  
  next();
};
