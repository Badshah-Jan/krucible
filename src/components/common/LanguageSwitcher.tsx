import React, { useState } from 'react';
import { View, TouchableOpacity, StyleSheet, Modal } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import LanguageService from '@/services/languageService';
import Text from './Text';

export default function LanguageSwitcher() {
  const { t, i18n } = useTranslation();
  const [modalVisible, setModalVisible] = useState(false);

  const languages = [
    { code: 'en', label: 'English (US)' },
    { code: 'ur', label: 'اردو (Urdu)' },
    { code: 'ar', label: 'العربية (Arabic)' },
    { code: 'fr', label: 'Français (French)' },
    { code: 'es', label: 'Español (Spanish)' },
  ];

  const handleSelectLanguage = async (code: string) => {
    await LanguageService.setLanguage(code);
    setModalVisible(false);
  };

  const getCurrentLanguageLabel = () => {
    const lang = languages.find(l => l.code === i18n.language);
    return lang ? lang.label : 'English (US)';
  };

  return (
    <>
      <TouchableOpacity 
        style={styles.triggerBtn} 
        onPress={() => setModalVisible(true)}
      >
        <Ionicons name="language" size={18} color="#9CA3AF" />
        <Text style={styles.triggerText}>{getCurrentLanguageLabel()}</Text>
        <Ionicons name="chevron-down" size={14} color="#9CA3AF" />
      </TouchableOpacity>

      <Modal visible={modalVisible} transparent animationType="fade">
        <TouchableOpacity style={styles.modalOverlay} onPress={() => setModalVisible(false)} activeOpacity={1}>
          <View style={styles.modalContent}>
            <Text variant="h2" style={styles.modalTitle}>{t('language', 'Select Language')}</Text>
            
            {languages.map(lang => (
              <TouchableOpacity 
                key={lang.code}
                style={[styles.langOption, i18n.language === lang.code && styles.langOptionActive]}
                onPress={() => handleSelectLanguage(lang.code)}
              >
                <Text style={[styles.langText, i18n.language === lang.code && styles.langTextActive]}>
                  {lang.label}
                </Text>
                {i18n.language === lang.code && (
                  <Ionicons name="checkmark" size={20} color="#2563EB" />
                )}
              </TouchableOpacity>
            ))}
          </View>
        </TouchableOpacity>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  triggerBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 6,
    paddingHorizontal: 10,
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: 8,
  },
  triggerText: {
    color: '#E5E7EB',
    fontSize: 14,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    width: '80%',
    backgroundColor: '#1E1E2D',
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  modalTitle: {
    color: '#FFF',
    marginBottom: 16,
    textAlign: 'center',
  },
  langOption: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 14,
    paddingHorizontal: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.05)',
  },
  langOptionActive: {
    backgroundColor: 'rgba(37,99,235,0.1)',
    borderRadius: 8,
    borderBottomWidth: 0,
  },
  langText: {
    color: '#D1D5DB',
    fontSize: 16,
  },
  langTextActive: {
    color: '#2563EB',
    fontWeight: 'bold',
  }
});
