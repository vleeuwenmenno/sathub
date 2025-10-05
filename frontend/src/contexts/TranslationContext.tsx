import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  type ReactNode,
} from "react";
import { useAuth } from "./AuthContext";
import { detectBrowserLanguage } from "../utils/translations";
import { updateProfile, getTranslations } from "../api";

type TranslationFunction = (
  key: string,
  params?: Record<string, string | number>
) => string;

interface TranslationContextType {
  language: string;
  setLanguage: (lang: string) => void;
  t: TranslationFunction;
  isLoading: boolean;
}

const TranslationContext = createContext<TranslationContextType | undefined>(
  undefined
);

export const useTranslation = () => {
  const context = useContext(TranslationContext);
  if (!context) {
    throw new Error("useTranslation must be used within a TranslationProvider");
  }
  return context;
};

interface TranslationProviderProps {
  children: ReactNode;
}

export const TranslationProvider: React.FC<TranslationProviderProps> = ({
  children,
}) => {
  const [language, setLanguageState] = useState<string>("en");
  const [translations, setTranslations] = useState<Record<string, any>>({});
  const [isLoading, setIsLoading] = useState(true);
  const { user, refreshUser } = useAuth();

  const setLanguage = async (lang: string) => {
    setLanguageState(lang);

    // Save to localStorage immediately for persistence across sessions
    localStorage.setItem("preferred_language", lang);

    // Update user profile if authenticated
    if (user && user.language !== lang) {
      try {
        await updateProfile({ language: lang });
        // Refresh user data to get updated language preference
        await refreshUser();
      } catch (error) {
        console.error("Failed to update language preference:", error);
      }
    }

    // Load translations from API for new language
    try {
      const newTranslations = await getTranslations(lang);
      setTranslations(newTranslations);
    } catch (error) {
      console.error("Failed to load translations from API:", error);
      // Fallback to empty translations
      setTranslations({});
    }

    // Force page reload to ensure new language is applied
    window.location.reload();
  };

  const t: TranslationFunction = (key, params) => {
    const keys = key.split(".");
    let value: any = translations;

    for (const k of keys) {
      if (value && typeof value === "object" && k in value) {
        value = value[k];
      } else {
        console.warn(`Translation key not found: ${key}, missing at: ${k}`);
        return key; // Return key if translation not found
      }
    }

    if (typeof value !== "string") {
      console.warn(
        `Translation value is not a string for key: ${key}, value:`,
        value
      );
    }

    if (typeof value !== "string") {
      return key;
    }

    // Replace parameters in translation
    if (params) {
      return Object.entries(params).reduce(
        (str: string, [param, replacement]) =>
          str.replace(new RegExp(`{{${param}}}`, "g"), String(replacement)),
        value
      );
    }

    return value;
  };

  useEffect(() => {
    const initializeLanguage = async () => {
      let preferredLanguage = "en";

      // Check localStorage first for saved preference
      const savedLanguage = localStorage.getItem("preferred_language");
      if (savedLanguage) {
        preferredLanguage = savedLanguage;
      } else if (user?.language) {
        // Fall back to user's language preference
        preferredLanguage = user.language;
      } else {
        // Fall back to browser language detection
        preferredLanguage = detectBrowserLanguage();
      }

      setLanguageState(preferredLanguage);
      try {
        const loadedTranslations = await getTranslations(preferredLanguage);
        setTranslations(loadedTranslations);
      } catch (error) {
        console.error("Failed to load translations from API:", error);
        // Fallback to empty translations
        setTranslations({});
      }
      setIsLoading(false);
    };

    initializeLanguage();
  }, [user]);

  return (
    <TranslationContext.Provider
      value={{ language, setLanguage, t, isLoading }}
    >
      {children}
    </TranslationContext.Provider>
  );
};
