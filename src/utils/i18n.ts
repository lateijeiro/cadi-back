import esTranslations from '../locales/es.json';
import enTranslations from '../locales/en.json';

type TranslationKey = string;
type Translations = typeof esTranslations;

const translations: Record<string, Translations> = {
  es: esTranslations,
  en: enTranslations,
};

export const getSupportedLanguages = (): string[] => {
  return Object.keys(translations);
};

export const getDefaultLanguage = (): string => {
  return 'es';
};

export const isValidLanguage = (lang: string): boolean => {
  return getSupportedLanguages().includes(lang);
};

export const translate = (
  key: TranslationKey,
  lang: string = 'es',
  params?: Record<string, string | number>
): string => {
  const language = isValidLanguage(lang) ? lang : getDefaultLanguage();
  const keys = key.split('.');
  
  let value: any = translations[language];
  
  for (const k of keys) {
    if (value && typeof value === 'object' && k in value) {
      value = value[k];
    } else {
      return key; // Retorna la key si no encuentra traducción
    }
  }
  
  if (typeof value !== 'string') {
    return key;
  }
  
  // Reemplazar parámetros {{param}}
  if (params) {
    return value.replace(/\{\{(\w+)\}\}/g, (match, param) => {
      return params[param]?.toString() || match;
    });
  }
  
  return value;
};

export const t = translate; // Alias corto
