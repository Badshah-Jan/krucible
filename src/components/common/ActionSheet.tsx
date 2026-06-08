import { useTranslation } from 'react-i18next';
import React from 'react';
import { View, Text, TouchableOpacity, Modal, StyleSheet, Pressable } from 'react-native';

interface ActionSheetProps {
  visible: boolean;
  onClose: () => void;
  title?: string;
  options: { label: string; action: () => void; destructive?: boolean }[];
}

export default function ActionSheet({ visible, onClose, title, options }: ActionSheetProps) {
  const { t } = useTranslation();
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />
        <View style={styles.sheet}>
          <View style={styles.handle} />
          {title && <Text style={styles.title}>{title}</Text>}
          
          {options.map((opt, idx) => (
            <TouchableOpacity 
              key={idx} 
              style={styles.option} 
              onPress={() => { onClose(); opt.action(); }}
            >
              <Text style={[styles.optionText, opt.destructive && styles.destructive]}>
                {opt.label}
              </Text>
            </TouchableOpacity>
          ))}
          
          <TouchableOpacity style={styles.cancelBtn} onPress={onClose}>
            <Text style={styles.cancelText}>{t('cancel', 'Cancel')}</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  sheet: { backgroundColor: '#111827', borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24, paddingBottom: 40 },
  handle: { width: 40, height: 4, backgroundColor: 'rgba(255,255,255,0.2)', borderRadius: 2, alignSelf: 'center', marginBottom: 20 },
  title: { color: '#9CA3AF', fontSize: 13, fontWeight: '600', marginBottom: 16, textAlign: 'center' },
  option: { paddingVertical: 16, borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.05)' },
  optionText: { color: '#FFFFFF', fontSize: 16, textAlign: 'center' },
  destructive: { color: '#EF4444' },
  cancelBtn: { marginTop: 16, paddingVertical: 16, backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: 16 },
  cancelText: { color: '#FFFFFF', fontSize: 16, fontWeight: '600', textAlign: 'center' },
});
