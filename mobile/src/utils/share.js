import { Platform, Share, Alert } from 'react-native';
import { SHARE_APP_URL } from '../config/api';

/**
 * Share content with optional URL. On web uses navigator.share (with app URL) or clipboard fallback.
 * On native uses React Native Share API; message includes app URL when provided.
 */
export async function shareContent({ title, message, url = SHARE_APP_URL }) {
  const fullMessage = [message, url].filter(Boolean).join('\n\n');

  if (Platform.OS === 'web') {
    try {
      if (typeof navigator !== 'undefined' && navigator.share) {
        await navigator.share({
          title: title || 'House of Jainz',
          text: message || '',
          url: url || SHARE_APP_URL,
        });
        return;
      }
      // Fallback: copy to clipboard
      const toCopy = [message, url].filter(Boolean).join('\n\n');
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(toCopy);
        alert('Copied to clipboard!');
      } else {
        alert(toCopy);
      }
    } catch (err) {
      if (err?.name === 'AbortError') return;
      console.error('Share failed:', err);
      try {
        const toCopy = [message, url].filter(Boolean).join('\n\n');
        if (navigator.clipboard?.writeText) {
          await navigator.clipboard.writeText(toCopy);
          alert('Copied to clipboard!');
        } else {
          alert('Share not supported. Copy this:\n\n' + toCopy);
        }
      } catch (e) {
        Alert.alert('Error', 'Failed to share');
      }
    }
    return;
  }

  // Native: use Share API; include URL in message so it's shared
  try {
    await Share.share({
      title: title || 'House of Jainz',
      message: fullMessage,
      url: Platform.OS === 'ios' ? url : undefined,
    });
  } catch (error) {
    if (error?.message?.includes('cancel')) return;
    Alert.alert('Error', 'Failed to share');
  }
}
