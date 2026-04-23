import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import * as Localization from 'expo-localization';
import en from '../locales/en.json';
import es from '../locales/es.json';

const resources = {
  en: { translation: en },
  es: { translation: es },
};

const getDeviceLanguage = (): string => {
  const locale = Localization.getLocales()[0];
  const langCode = locale?.languageCode?.toLowerCase() || 'en';
  if (langCode.startsWith('es')) return 'es';
  return 'en';
};

// eslint-disable-next-line import/no-named-as-default-member
i18n.use(initReactI18next).init({
  resources,
  lng: getDeviceLanguage(),
  fallbackLng: 'en',
  interpolation: {
    escapeValue: false,
  },
  react: {
    useSuspense: false,
  },
});

export const getDeviceLang = getDeviceLanguage;
export default i18n;
