import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  RefreshControl,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import api from '../../config/api';

const CATEGORY_ICONS = {
  'rentals': 'home-outline',
  'realestate': 'business-outline',
  'knowledge': 'book-outline',
  'events': 'calendar-outline',
};

export default function ForumLandingScreen({ navigation }) {
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadCategories = async () => {
    try {
      const res = await api.get('/forum/categories');
      setCategories(res.data.categories || []);
    } catch (err) {
      console.error('Failed to load forum categories', err);
      setCategories([
        { slug: 'rentals', label: 'Rentals', description: 'Find or list rentals', icon: 'home-outline' },
        { slug: 'realestate', label: 'Real Estate', description: 'Buy, sell, discuss property', icon: 'business-outline' },
        { slug: 'knowledge', label: 'Knowledge', description: 'Tips, guides, and Q&A', icon: 'book-outline' },
        { slug: 'events', label: 'Events', description: 'Local events and meetups', icon: 'calendar-outline' },
      ]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadCategories();
  }, []);

  const onRefresh = () => {
    setRefreshing(true);
    loadCategories();
  };

  const openCategory = (category) => {
    navigation.navigate('ForumCategoryFeed', {
      categorySlug: category.slug,
      categoryLabel: category.label,
    });
  };

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#4CAF50" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Forum</Text>
        <Text style={styles.headerSubtitle}>Choose a category to browse or post</Text>
      </View>

      <ScrollView
        contentContainerStyle={styles.scroll}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {categories.map((cat) => (
          <TouchableOpacity
            key={cat.slug}
            style={styles.card}
            onPress={() => openCategory(cat)}
            activeOpacity={0.8}
          >
            <View style={styles.cardIconWrap}>
              <Ionicons
                name={CATEGORY_ICONS[cat.slug] || cat.icon || 'folder-outline'}
                size={32}
                color="#4CAF50"
              />
            </View>
            <View style={styles.cardContent}>
              <Text style={styles.cardTitle}>{cat.label}</Text>
              <Text style={styles.cardDescription}>{cat.description}</Text>
            </View>
            <Ionicons name="chevron-forward" size={24} color="#999" />
          </TouchableOpacity>
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f0f2f5',
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f0f2f5',
  },
  header: {
    paddingHorizontal: 20,
    paddingTop: 56,
    paddingBottom: 20,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  headerTitle: {
    fontSize: 26,
    fontWeight: '800',
    color: '#1a1a1a',
  },
  headerSubtitle: {
    fontSize: 14,
    color: '#666',
    marginTop: 4,
  },
  scroll: {
    padding: 16,
    paddingBottom: 32,
  },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 18,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 3,
  },
  cardIconWrap: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#E8F5E9',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  cardContent: {
    flex: 1,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1a1a1a',
  },
  cardDescription: {
    fontSize: 14,
    color: '#666',
    marginTop: 4,
  },
});
