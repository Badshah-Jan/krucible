import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

// Import all translation files
import en from './translations/en.json';
import ur from './translations/ur.json';
import ar from './translations/ar.json';
import fr from './translations/fr.json';
import es from './translations/es.json';

const resources = {
  en: { translation: en },
  ur: { translation: ur },
  ar: { translation: ar },
  fr: { translation: fr },
  es: { translation: es }
};

i18n
  .use(initReactI18next)
  .init({
    resources,
    lng: 'en', // default language
    fallbackLng: 'en',
    interpolation: {
      escapeValue: false
    }
  });

export default i18n;
