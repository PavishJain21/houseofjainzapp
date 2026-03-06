import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeContext';

/**
 * Reusable in-app banner for promos, tips, or featured content.
 * Theme-aware; use as ListHeaderComponent or anywhere in a screen.
 * Pass renderIcon to show a custom component (e.g. Logo) instead of an Ionicons icon.
 */
export default function AppBanner({
  title,
  subtitle,
  icon = 'sparkles',
  renderIcon,
  onPress,
  style,
  variant = 'primary', // 'primary' | 'secondary' | 'gradient'
}) {
  const { theme } = useTheme();
  const c = theme.colors;

  const bgColor =
    variant === 'secondary'
      ? c.surfaceElevated
      : variant === 'gradient'
      ? c.primaryDark
      : c.primary;

  const textColor = variant === 'secondary' ? c.text : '#ffffff';
  const subColor = variant === 'secondary' ? c.textSecondary : 'rgba(255,255,255,0.9)';

  return (
    <TouchableOpacity
      activeOpacity={onPress ? 0.8 : 1}
      onPress={onPress}
      disabled={!onPress}
      style={[
        styles.banner,
        {
          backgroundColor: bgColor,
          borderColor: c.border,
          marginHorizontal: 12,
          marginBottom: 16,
        },
        style,
      ]}
    >
      <View style={styles.content}>
        <View style={[styles.iconWrap, { backgroundColor: 'rgba(255,255,255,0.2)' }]}>
          {renderIcon ?? <Ionicons name={icon} size={24} color="#fff" />}
        </View>
        <View style={styles.textWrap}>
          <Text style={[styles.title, { color: textColor }]} numberOfLines={1}>
            {title}
          </Text>
          {subtitle ? (
            <Text style={[styles.subtitle, { color: subColor }]} numberOfLines={2}>
              {subtitle}
            </Text>
          ) : null}
        </View>
        {onPress && (
          <Ionicons
            name="chevron-forward"
            size={20}
            color={variant === 'secondary' ? c.primary : '#fff'}
          />
        )}
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  banner: {
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  iconWrap: {
    width: 44,
    height: 44,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
  },
  textWrap: {
    flex: 1,
  },
  title: {
    fontSize: 16,
    fontWeight: '700',
  },
  subtitle: {
    fontSize: 13,
    marginTop: 2,
  },
});
