import { Platform, Alert } from 'react-native';

/**
 * Web-safe confirm dialog. On web, Alert.alert is not fully supported,
 * so we use window.confirm and invoke the onConfirm callback.
 * On native, uses Alert.alert with two buttons.
 * @param {string} title - Dialog title
 * @param {string} message - Dialog message
 * @param {function} onConfirm - Called when user confirms (e.g. signOut)
 * @param {string} [confirmText='OK'] - Confirm button text
 * @param {string} [cancelText='Cancel'] - Cancel button text
 */
export function confirmAsync(title, message, onConfirm, confirmText = 'OK', cancelText = 'Cancel') {
  if (Platform.OS === 'web') {
    const confirmed = typeof window !== 'undefined' && window.confirm([title, message].filter(Boolean).join('\n\n'));
    if (confirmed && onConfirm) {
      onConfirm();
    }
    return;
  }
  Alert.alert(title, message, [
    { text: cancelText, style: 'cancel' },
    { text: confirmText, onPress: onConfirm },
  ]);
}
