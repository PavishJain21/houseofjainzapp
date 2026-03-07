import React, { useContext } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import LanguageContext from '../context/LanguageContext';
import { useTheme } from '../context/ThemeContext';

export default function LanguageToggle() {
  const { language, changeLanguage } = useContext(LanguageContext);
  const { theme } = useTheme();
  const primary = theme.colors?.primary || '#4CAF50';
  const textMuted = theme.colors?.textMuted || '#888';

  return (
    <View style={styles.wrap}>
      <TouchableOpacity
        style={[
          styles.pill,
          language === 'en' && { ...styles.pillActive, backgroundColor: primary },
        ]}
        onPress={() => changeLanguage('en')}
        activeOpacity={0.8}
      >
        <Text
          style={[
            styles.label,
            { color: language === 'en' ? '#fff' : textMuted },
            language === 'en' && styles.labelActive,
          ]}
        >
          EN
        </Text>
      </TouchableOpacity>
      <TouchableOpacity
        style={[
          styles.pill,
          language === 'hi' && { ...styles.pillActive, backgroundColor: primary },
        ]}
        onPress={() => changeLanguage('hi')}
        activeOpacity={0.8}
      >
        <Text
          style={[
            styles.label,
            { color: language === 'hi' ? '#fff' : textMuted },
            language === 'hi' && styles.labelActive,
          ]}
        >
          हि
        </Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.06)',
    borderRadius: 10,
    padding: 3,
  },
  pill: {
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 8,
  },
  pillActive: {
    backgroundColor: '#4CAF50',
  },
  label: {
    fontSize: 13,
    fontWeight: '600',
  },
  labelActive: {
    color: '#fff',
  },
});
