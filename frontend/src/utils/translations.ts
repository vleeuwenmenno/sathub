// Translation utilities

export const detectBrowserLanguage = (): string => {
  if (typeof window === "undefined") return "en";

  const browserLanguage = navigator.language.split("-")[0];
  const supportedLanguages = getSupportedLanguages().map((lang) => lang.code);

  return supportedLanguages.includes(browserLanguage) ? browserLanguage : "en";
};

export const getSupportedLanguages = () => [
  { code: "en", name: "English", flag: "🌍" },
  { code: "de", name: "Deutsch", flag: "🇩🇪" },
  { code: "nl", name: "Nederlands", flag: "🇳🇱" },
];

export const getLanguageFlag = (languageCode: string): string => {
  const language = getSupportedLanguages().find(
    (lang) => lang.code === languageCode
  );
  return language?.flag || "🌍";
};
