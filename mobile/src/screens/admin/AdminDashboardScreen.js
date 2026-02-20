import React, { useState, useEffect, useContext } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import api from '../../config/api';
import { AuthContext } from '../../context/AuthContext';
import Logo from '../../components/Logo';

export default function AdminDashboardScreen({ navigation }) {
  const { signOut, user } = useContext(AuthContext);
  const [stats, setStats] = useState({
    totalUsers: 0,
    totalShops: 0,
    totalProducts: 0,
    totalPosts: 0,
    totalOrders: 0,
  });
  const [location, setLocation] = useState('');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const handleLogout = () => {
    Alert.alert('Logout', 'Are you sure you want to logout?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Logout',
        style: 'destructive',
        onPress: signOut,
      },
    ]);
  };

  useEffect(() => {
    loadStats();
  }, [location]);

  const loadStats = async () => {
    try {
      const params = location ? { location } : {};
      const response = await api.get('/admin/dashboard/stats', { params });
      setStats(response.data.stats || {});
    } catch (error) {
      console.error('Error loading stats:', error);
      Alert.alert('Error', error.response?.data?.error || 'Failed to load dashboard stats');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    loadStats();
  };

  const StatCard = ({ icon, label, value, color, onPress }) => (
    <TouchableOpacity style={styles.statCard} onPress={onPress}>
      <View style={[styles.statIcon, { backgroundColor: color + '20' }]}>
        <Ionicons name={icon} size={24} color={color} />
      </View>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={styles.headerTop}>
          <View style={styles.headerLeft}>
            <View style={styles.logoContainer}>
              <Logo size="small" showText={false} />
            </View>
            <Text style={styles.headerTitle}>Admin Dashboard</Text>
            {user && (
              <Text style={styles.headerSubtitle}>{user.name || user.email}</Text>
            )}
          </View>
          <TouchableOpacity
            style={styles.logoutButton}
            onPress={handleLogout}
          >
            <Ionicons name="log-out-outline" size={20} color="#f44336" />
          </TouchableOpacity>
        </View>
        <TouchableOpacity
          style={styles.locationButton}
          onPress={() => {
            Alert.prompt(
              'Filter by Location',
              'Enter location to filter (leave empty for all)',
              [
                { text: 'Cancel', style: 'cancel' },
                {
                  text: 'Apply',
                  onPress: (text) => setLocation(text || ''),
                },
                {
                  text: 'Clear',
                  onPress: () => setLocation(''),
                },
              ],
              'plain-text',
              location
            );
          }}
        >
          <Ionicons name="location" size={20} color="#4CAF50" />
          <Text style={styles.locationText}>
            {location || 'All Locations'}
          </Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.content}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        <View style={styles.statsGrid}>
          <StatCard
            icon="people"
            label="Users"
            value={stats.totalUsers}
            color="#2196F3"
            onPress={() => navigation.navigate('AdminUsers')}
          />
          <StatCard
            icon="storefront"
            label="Shops"
            value={stats.totalShops}
            color="#FF9800"
            onPress={() => navigation.navigate('AdminShops')}
          />
          <StatCard
            icon="chatbubbles"
            label="Posts"
            value={stats.totalPosts}
            color="#4CAF50"
            onPress={() => navigation.navigate('AdminPosts')}
          />
          <StatCard
            icon="receipt"
            label="Orders"
            value={stats.totalOrders}
            color="#F44336"
            onPress={() => navigation.navigate('AdminOrders')}
          />
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Quick Actions</Text>
          <TouchableOpacity
            style={styles.actionButton}
            onPress={() => navigation.navigate('AdminUsers')}
          >
            <Ionicons name="people-outline" size={24} color="#2196F3" />
            <Text style={styles.actionText}>Manage Users</Text>
            <Ionicons name="chevron-forward" size={20} color="#ccc" />
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.actionButton}
            onPress={() => navigation.navigate('AdminShops')}
          >
            <Ionicons name="storefront-outline" size={24} color="#FF9800" />
            <Text style={styles.actionText}>Manage Shops & Products</Text>
            <Ionicons name="chevron-forward" size={20} color="#ccc" />
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.actionButton}
            onPress={() => navigation.navigate('AdminPosts')}
          >
            <Ionicons name="chatbubbles-outline" size={24} color="#4CAF50" />
            <Text style={styles.actionText}>Manage Posts</Text>
            <Ionicons name="chevron-forward" size={20} color="#ccc" />
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.actionButton}
            onPress={() => navigation.navigate('AdminOrders')}
          >
            <Ionicons name="receipt-outline" size={24} color="#F44336" />
            <Text style={styles.actionText}>Manage Orders</Text>
            <Ionicons name="chevron-forward" size={20} color="#ccc" />
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.actionButton, styles.logoutActionButton]}
            onPress={handleLogout}
          >
            <Ionicons name="log-out-outline" size={24} color="#f44336" />
            <Text style={[styles.actionText, styles.logoutActionText]}>Logout</Text>
            <Ionicons name="chevron-forward" size={20} color="#ccc" />
          </TouchableOpacity>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  header: {
    backgroundColor: '#fff',
    paddingTop: 50,
    paddingBottom: 15,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 10,
  },
  headerLeft: {
    flex: 1,
  },
  logoContainer: {
    marginBottom: 8,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 4,
  },
  headerSubtitle: {
    fontSize: 14,
    color: '#666',
  },
  logoutButton: {
    padding: 8,
    borderRadius: 8,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#f44336',
  },
  locationButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f0f0f0',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    alignSelf: 'flex-start',
  },
  locationText: {
    marginLeft: 6,
    color: '#4CAF50',
    fontSize: 14,
    fontWeight: '500',
  },
  content: {
    flex: 1,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    padding: 15,
    justifyContent: 'space-between',
  },
  statCard: {
    width: '48%',
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 15,
    marginBottom: 15,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  statIcon: {
    width: 50,
    height: 50,
    borderRadius: 25,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 10,
  },
  statValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 5,
  },
  statLabel: {
    fontSize: 12,
    color: '#666',
    textAlign: 'center',
  },
  section: {
    padding: 15,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 15,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    padding: 15,
    borderRadius: 10,
    marginBottom: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  actionText: {
    flex: 1,
    marginLeft: 15,
    fontSize: 16,
    color: '#333',
  },
  logoutActionButton: {
    borderLeftWidth: 3,
    borderLeftColor: '#f44336',
  },
  logoutActionText: {
    color: '#f44336',
    fontWeight: '600',
  },
});

