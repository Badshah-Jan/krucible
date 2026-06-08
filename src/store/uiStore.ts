import { create } from 'zustand';

export type ToastType = 'success' | 'error' | 'warning' | 'info';
export type ModalType = 'danger' | 'warning' | 'info' | 'success';

interface ToastOptions {
  title: string;
  message?: string;
  type?: ToastType;
  duration?: number;
}

interface ModalOptions {
  title: string;
  message: string;
  type?: ModalType;
  confirmText?: string;
  cancelText?: string;
  showCancel?: boolean;
  onConfirm?: () => void;
  onCancel?: () => void;
}

interface UIState {
  // Toast State
  toastVisible: boolean;
  toastConfig: ToastOptions | null;
  showToast: (config: ToastOptions) => void;
  hideToast: () => void;

  // Modal State
  modalVisible: boolean;
  modalConfig: ModalOptions | null;
  showModal: (config: ModalOptions) => void;
  hideModal: () => void;
}

export const useUIStore = create<UIState>((set) => ({
  toastVisible: false,
  toastConfig: null,
  showToast: (config) => {
    set({ toastVisible: true, toastConfig: { type: 'info', duration: 3000, ...config } });
  },
  hideToast: () => set({ toastVisible: false }),

  modalVisible: false,
  modalConfig: null,
  showModal: (config) => {
    set({ modalVisible: true, modalConfig: { type: 'info', showCancel: true, confirmText: 'Confirm', cancelText: 'Cancel', ...config } });
  },
  hideModal: () => set({ modalVisible: false }),
}));

export const UI = {
  toast: (title: string, type: ToastType = 'info', message?: string) => {
    useUIStore.getState().showToast({ title, message, type });
  },
  success: (title: string, message?: string) => {
    useUIStore.getState().showToast({ title, message, type: 'success' });
  },
  error: (title: string, message?: string) => {
    useUIStore.getState().showToast({ title, message, type: 'error' });
  },
  alert: (title: string, message: string, type: ModalType = 'info') => {
    useUIStore.getState().showModal({
      title, message, type, showCancel: false, confirmText: 'OK'
    });
  },
  confirm: (
    title: string, 
    message: string, 
    onConfirm: () => void, 
    confirmText = 'Confirm', 
    type: ModalType = 'warning',
    onCancel?: () => void
  ) => {
    useUIStore.getState().showModal({
      title, message, type, showCancel: true, confirmText, onConfirm, onCancel
    });
  }
};
