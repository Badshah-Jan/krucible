import AsyncStorage from '@react-native-async-storage/async-storage';
import i18n from '@/locales/i18n';
import { I18nManager } from 'react-native';

const LANGUAGE_KEY = '@app_language';

// Define RTL languages
const RTL_LANGUAGES = ['ur', 'ar'];

class LanguageService {
  /**
   * Initializes the language settings on app startup.
   * Gets persisted language or falls back to device language.
   */
  async initLanguage(): Promise<void> {
    try {
      const persistedLanguage = await AsyncStorage.getItem(LANGUAGE_KEY);
      
      let initialLanguage = 'en'; // default fallback

      if (persistedLanguage) {
        initialLanguage = persistedLanguage;
      } else {
        // Fallback safely to English without expo-localization to avoid native module rebuild errors
        // You can restore expo-localization once you rebuild the dev client using npx expo run:android
        initialLanguage = 'en';
      }

      // Force Native cache to turn off RTL mirroring that might be stuck
      if (I18nManager.isRTL) {
        I18nManager.allowRTL(false);
        I18nManager.forceRTL(false);
      }

      await this.setLanguage(initialLanguage, false);
    } catch (error) {
      console.error('Error initializing language:', error);
    }
  }

  /**
   * Change the app language and persist the choice
   * @param lng Language code ('en', 'ur', 'ar', 'fr', 'es')
   * @param shouldPersist Whether to save to AsyncStorage (default true)
   */
  async setLanguage(lng: string, shouldPersist = true): Promise<void> {
    try {
      if (shouldPersist) {
        await AsyncStorage.setItem(LANGUAGE_KEY, lng);
      }
      
      // Update i18next
      await i18n.changeLanguage(lng);
      
      // Removed RTL mirroring logic to ensure LTR layout is strictly maintained
    } catch (error) {
      console.error('Error changing language:', error);
    }
  }

  /**
   * Get the current active language code
   */
  getCurrentLanguage(): string {
    return i18n.language || 'en';
  }
}

export default new LanguageService();
