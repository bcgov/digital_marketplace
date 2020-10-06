import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
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
  // for all options read: https://www.i18next.com/overview/configuration-options
  .init({
    debug: true,
    resources,
    lng: 'en',
    fallbackLng: 'en',
    whitelist: ['en', 'fr'],
 
    interpolation: {
      escapeValue: false, // not needed for react as it escapes by default
    },
 
    backend: {
      loadPath: '/locales/{{lng}}/{{ns}}.json',
      addPath: '/locales/add/{{lng}}/{{ns}}',
    },
  });
 
export default i18n;