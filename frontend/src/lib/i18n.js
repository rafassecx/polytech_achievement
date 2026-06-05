import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

// Барлық мәтін тікелей компоненттерде қазақша жазылған,
// i18n тек ескі компоненттердің үзілмеуі үшін сақталған
i18n
  .use(initReactI18next)
  .init({
    resources: { kk: { translation: {} } },
    lng: 'kk',
    fallbackLng: 'kk',
    interpolation: { escapeValue: false },
  });

export default i18n;
