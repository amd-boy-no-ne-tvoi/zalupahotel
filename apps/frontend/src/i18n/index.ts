import i18n from 'i18next'
import { initReactI18next } from 'react-i18next'
import LanguageDetector from 'i18next-browser-languagedetector'
import ru from './ru'
import kk from './kk'
import en from './en'

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources: {
      ru: { translation: ru },
      kk: { translation: kk },
      en: { translation: en },
    },
    fallbackLng: 'ru',
    supportedLngs: ['ru', 'kk', 'en'],
    detection: {
      // Order: localStorage first, then browser language
      order: ['localStorage', 'navigator'],
      lookupLocalStorage: 'ph-lang',
      caches: ['localStorage'],
    },
    interpolation: { escapeValue: false },
  })

export default i18n
