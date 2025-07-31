import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

// Import language resources
import en from './locales/en.json';
import zh from './locales/zh.json';

// Browser language detection
const getBrowserLanguage = (): string => {
  // Default to Chinese for server-side rendering
  if (typeof window === 'undefined') return 'zh';
  
  // Check localStorage first
  const savedLanguage = localStorage.getItem('language');
  if (savedLanguage && ['zh', 'en'].includes(savedLanguage)) {
    return savedLanguage;
  }
  
  // Check browser language
  const browserLang = navigator.language.toLowerCase();
  if (browserLang.startsWith('zh')) return 'zh';
  if (browserLang.startsWith('en')) return 'en';
  
  // Default to Chinese
  return 'zh';
};

const initialLanguage = getBrowserLanguage();

i18n
  .use(initReactI18next)
  .init({
    resources: {
      en: {
        translation: en
      },
      zh: {
        translation: zh
      }
    },
    lng: initialLanguage,
    fallbackLng: 'zh', // Default to Chinese
    
    interpolation: {
      escapeValue: false // React already does escaping
    },
    
    react: {
      useSuspense: false
    },

    // Language detection configuration
    detection: {
      order: ['localStorage', 'navigator'],
      caches: ['localStorage']
    }
  });

// Save language to localStorage when it changes
i18n.on('languageChanged', (lng) => {
  if (typeof window !== 'undefined') {
    localStorage.setItem('language', lng);
    document.documentElement.lang = lng;
  }
});

export default i18n;
