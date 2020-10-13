import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';

import fr from './fr.json';
import en from './en.json';
const resources = {
  en: {
    translation: en
  }, 
  fr: {
    translation: fr
  },
};

i18n
  // connect with React
  .use(initReactI18next)
  .use(LanguageDetector)
  // for all options read: https://www.i18next.com/overview/configuration-options
  .init({
    debug: true,
    resources,
    nonExplicitSupportedLngs: false,
    fallbackLng: 'en',
    supportedLngs: ['en', 'fr'],
 
    interpolation: {
      escapeValue: false, // not needed for react as it escapes by default
    },

    detection: {
      // order and from where user language should be detected
      order: ['querystring', 'cookie', 'localStorage', 'sessionStorage', 'navigator', 'htmlTag', 'path', 'subdomain'],

      // keys or params to lookup language from
      lookupQuerystring: 'lng',
      lookupCookie: 'i18next',
      lookupLocalStorage: 'i18nextLng',
      lookupSessionStorage: 'i18nextLng',
      lookupFromPathIndex: 0,
      lookupFromSubdomainIndex: 0,

      // cache user language on
      useCookie: true,
      caches: ['localStorage', 'cookie'],
      excludeCacheFor: ['cimode'], // languages to not persist (cookie, localStorage)
    }
  });
 
export default i18n;