// Translation files are loaded dynamically from JSON files
const translationCache: Record<string, Record<string, any>> = {};

export const loadTranslations = async (language: string): Promise<Record<string, any>> => {
  // Check cache first
  if (translationCache[language]) {
    return translationCache[language];
  }

  try {
    // Dynamically import the translation file
    const translationModule = await import(`../translations/${language}.json`);
    const translations = translationModule.default || translationModule;

    // Cache the translations
    translationCache[language] = translations;

    return translations;
  } catch (error) {
    console.warn(`Failed to load translations for language "${language}":`, error);

    // Fall back to English if the requested language fails to load
    if (language !== 'en') {
      return loadTranslations('en');
    }

    // If even English fails, return empty object
    return {};
  }
};

export const detectBrowserLanguage = (): string => {
  if (typeof window === 'undefined') return 'en';

  const browserLanguage = navigator.language.split('-')[0];
  const supportedLanguages = getSupportedLanguages().map(lang => lang.code);

  return supportedLanguages.includes(browserLanguage) ? browserLanguage : 'en';
};

export const getSupportedLanguages = () => [
  { code: 'en', name: 'English' },
  { code: 'de', name: 'Deutsch' },
  { code: 'nl', name: 'Nederlands' },
];