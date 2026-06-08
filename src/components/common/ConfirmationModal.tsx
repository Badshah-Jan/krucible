import React from 'react';
import { View, StyleSheet, TouchableOpacity, Modal } from 'react-native';
import { BlurView } from 'expo-blur';
import { Ionicons } from '@expo/vector-icons';
import Text from './Text';
import { useUIStore, ModalType } from '@/store/uiStore';

const getModalConfig = (type: ModalType) => {
  switch (type) {
    case 'danger':
      return { icon: 'alert-circle', color: '#EF4444', bg: '#FEF2F2' };
    case 'warning':
      return { icon: 'warning', color: '#F59E0B', bg: '#FFFBEB' };
    case 'success':
      return { icon: 'checkmark-circle', color: '#10B981', bg: '#ECFDF5' };
    case 'info':
    default:
      return { icon: 'information-circle', color: '#3B82F6', bg: '#EFF6FF' };
  }
};

export default function ConfirmationModal() {
  const { modalVisible, modalConfig, hideModal } = useUIStore();

  if (!modalVisible || !modalConfig) return null;

  const config = getModalConfig(modalConfig.type || 'info');

  const handleConfirm = () => {
    hideModal();
    if (modalConfig.onConfirm) modalConfig.onConfirm();
  };

  const handleCancel = () => {
    hideModal();
    if (modalConfig.onCancel) modalConfig.onCancel();
  };

  return (
    <Modal visible={modalVisible} transparent animationType="fade">
      <BlurView intensity={20} tint="dark" style={styles.overlay}>
        <View style={styles.modalContent}>
          <View style={[styles.iconContainer, { backgroundColor: config.bg }]}>
            <Ionicons name={config.icon as any} size={32} color={config.color} />
          </View>
          
          <Text style={styles.title}>{modalConfig.title}</Text>
          <Text style={styles.message}>{modalConfig.message}</Text>
          
          <View style={styles.actionContainer}>
            {modalConfig.showCancel && (
              <TouchableOpacity 
                style={styles.cancelBtn} 
                onPress={handleCancel}
                activeOpacity={0.7}
              >
                <Text style={styles.cancelText}>{modalConfig.cancelText || 'Cancel'}</Text>
              </TouchableOpacity>
            )}
            
            <TouchableOpacity 
              style={[
                styles.confirmBtn, 
                modalConfig.type === 'danger' ? { backgroundColor: '#EF4444' } : { backgroundColor: '#2563EB' }
              ]} 
              onPress={handleConfirm}
              activeOpacity={0.7}
            >
              <Text style={styles.confirmText}>{modalConfig.confirmText || 'OK'}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </BlurView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.4)',
    padding: 20,
  },
  modalContent: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 24,
    width: '100%',
    maxWidth: 340,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.1,
    shadowRadius: 20,
    elevation: 10,
  },
  iconContainer: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  title: {
    fontSize: 18,
    fontWeight: '800',
    color: '#111827',
    textAlign: 'center',
    marginBottom: 8,
  },
  message: {
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 20,
  },
  actionContainer: {
    flexDirection: 'row',
    gap: 12,
    width: '100%',
  },
  cancelBtn: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: '#F3F4F6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelText: {
    color: '#4B5563',
    fontWeight: '700',
    fontSize: 14,
  },
  confirmBtn: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  confirmText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 14,
  }
});
