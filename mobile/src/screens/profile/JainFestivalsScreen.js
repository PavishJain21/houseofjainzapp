import React, { useContext, useLayoutEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../context/ThemeContext';
import LanguageContext from '../../context/LanguageContext';
import jainFestivals2026 from '../../data/jainFestivals2026';

function formatDisplayDate(dateStr) {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  const day = d.getDate();
  const suffix = day === 1 || day === 21 || day === 31 ? 'st' : day === 2 || day === 22 ? 'nd' : day === 3 || day === 23 ? 'rd' : 'th';
  return `${day}${suffix}`;
}

export default function JainFestivalsScreen() {
  const navigation = useNavigation();
  const { theme } = useTheme();
  const langContext = useContext(LanguageContext);
  const language = langContext?.language ?? 'en';
  const t = langContext?.t ?? ((key) => key);
  const { year, calendar, festivals } = jainFestivals2026;
  const colors = theme.colors || {};

  useLayoutEffect(() => {
    navigation.setOptions({ title: t('calendar.jainFestivalsTitle') });
  }, [navigation, t]);

  const getEventName = (event) => (language === 'hi' && event.name_hi ? event.name_hi : event.name);
  const getMonthName = (monthKey) => t(`calendar.months.${monthKey}`);
  const getDayName = (dayKey) => t(`calendar.days.${dayKey}`);

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: colors.background || '#f5f5f5' }]}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={true}
    >
      <View style={[styles.headerCard, { backgroundColor: colors.surface || '#fff', shadowColor: colors.shadow || '#000' }]}>
        <View style={styles.headerRow}>
          <Ionicons name="calendar" size={28} color={colors.primary || '#4CAF50'} />
          <View style={styles.headerText}>
            <Text style={[styles.title, { color: colors.text || '#1a1a1a' }]}>{t('calendar.jainFestivalsTitle')}</Text>
            <Text style={[styles.year, { color: colors.textSecondary || '#666' }]}>{year}</Text>
          </View>
        </View>
      </View>

      {festivals.map((section, sectionIndex) => (
        <View
          key={section.month}
          style={[styles.monthSection, { backgroundColor: colors.surface || '#fff', borderColor: colors.border || '#eee' }]}
        >
          <View style={[styles.monthHeader, { backgroundColor: colors.primary || '#4CAF50' }]}>
            <Text style={styles.monthTitle}>{getMonthName(section.month)}</Text>
          </View>
          {section.events.map((event, eventIndex) => (
            <View
              key={`${event.date}-${event.name}-${eventIndex}`}
              style={[
                styles.eventRow,
                eventIndex < section.events.length - 1 && { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.borderLight || '#f0f0f0' },
              ]}
            >
              <View style={[styles.dateBadge, { backgroundColor: (colors.primary || '#4CAF50') + '18' }]}>
                <Text style={[styles.dateNum, { color: colors.primary || '#4CAF50' }]}>{formatDisplayDate(event.date)}</Text>
              </View>
              <View style={styles.eventInfo}>
                <Text style={[styles.eventName, { color: colors.text || '#333' }]}>{getEventName(event)}</Text>
                <Text style={[styles.eventDay, { color: colors.textMuted || '#888' }]}>{getDayName(event.day)}</Text>
              </View>
            </View>
          ))}
        </View>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    padding: 16,
    paddingBottom: 32,
  },
  headerCard: {
    borderRadius: 12,
    padding: 20,
    marginBottom: 20,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 3,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  headerText: {},
  title: {
    fontSize: 20,
    fontWeight: '700',
  },
  year: {
    fontSize: 14,
    marginTop: 2,
  },
  monthSection: {
    borderRadius: 12,
    marginBottom: 16,
    overflow: 'hidden',
    borderWidth: 1,
  },
  monthHeader: {
    paddingVertical: 10,
    paddingHorizontal: 16,
  },
  monthTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#fff',
  },
  eventRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    gap: 14,
  },
  dateBadge: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
  },
  dateNum: {
    fontSize: 13,
    fontWeight: '700',
  },
  eventInfo: {
    flex: 1,
  },
  eventName: {
    fontSize: 15,
    fontWeight: '600',
  },
  eventDay: {
    fontSize: 13,
    marginTop: 2,
  },
});
