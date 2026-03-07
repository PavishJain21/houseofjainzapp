import React, { useContext } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Linking,
  Alert,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../context/ThemeContext';
import LanguageContext from '../../context/LanguageContext';
import { CONTACT_PAGE_URL } from '../../config/api';

export default function ContactUsScreen() {
  const { theme } = useTheme();
  const { t } = useContext(LanguageContext);
  const colors = theme.colors || {};

  const openContactUrl = async () => {
    try {
      const canOpen = await Linking.canOpenURL(CONTACT_PAGE_URL);
      if (canOpen) {
        await Linking.openURL(CONTACT_PAGE_URL);
      } else {
        Alert.alert(t('common.error'), t('profile.contactUrlNotSupported'));
      }
    } catch (err) {
      Alert.alert(t('common.error'), err.message || t('profile.contactOpenFailed'));
    }
  };

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: colors.background || '#f5f5f5' }]}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
    >
      <View style={[styles.card, { backgroundColor: colors.surface || '#fff', borderColor: colors.border || '#eee' }]}>
        <View style={styles.iconWrap}>
          <Ionicons name="mail-open-outline" size={48} color={colors.primary || '#4CAF50'} />
        </View>
        <Text style={[styles.title, { color: colors.text || '#1a1a1a' }]}>
          {t('profile.contactUs')}
        </Text>
        <Text style={[styles.subtitle, { color: colors.textSecondary || '#64748b' }]}>
          {t('profile.contactUsSubtitle')}
        </Text>
        <TouchableOpacity
          style={[styles.primaryButton, { backgroundColor: colors.primary || '#4CAF50' }]}
          onPress={openContactUrl}
          activeOpacity={0.85}
        >
          <Ionicons name="open-outline" size={22} color="#fff" />
          <Text style={styles.primaryButtonText}>{t('profile.openContactPage')}</Text>
        </TouchableOpacity>
        {Platform.OS === 'web' && (
          <Text style={[styles.hint, { color: colors.textMuted || '#888' }]}>
            {t('profile.contactOpensInNewTab')}
          </Text>
        )}
      </View>
      <View style={[styles.infoCard, { backgroundColor: colors.surface || '#fff', borderColor: colors.borderLight || '#f0f0f0' }]}>
        <Ionicons name="information-circle-outline" size={20} color={colors.textMuted || '#888'} />
        <Text style={[styles.infoText, { color: colors.textSecondary || '#64748b' }]}>
          {t('profile.contactUsInfo')}
        </Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    padding: 20,
    paddingBottom: 40,
  },
  card: {
    borderRadius: 16,
    padding: 24,
    marginBottom: 16,
    borderWidth: 1,
    alignItems: 'center',
  },
  iconWrap: {
    marginBottom: 16,
  },
  title: {
    fontSize: 22,
    fontWeight: '700',
    marginBottom: 8,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 15,
    lineHeight: 22,
    textAlign: 'center',
    marginBottom: 24,
  },
  primaryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: 12,
  },
  primaryButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  hint: {
    fontSize: 12,
    marginTop: 12,
  },
  infoCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
  },
  infoText: {
    flex: 1,
    fontSize: 13,
    lineHeight: 20,
  },
});
