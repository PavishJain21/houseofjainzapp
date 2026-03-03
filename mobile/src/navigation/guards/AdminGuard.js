import React, { useEffect, useContext } from 'react';
import { View, ActivityIndicator } from 'react-native';
import { AuthContext } from '../../context/AuthContext';
import { useFeatures } from '../../context/FeatureContext';

/**
 * Protects admin routes. If user is not admin/superadmin or admin feature is disabled,
 * calls onNotAdmin() so parent can show MainTabs instead (e.g. setForceMainTabs(true)).
 */
export function AdminGuard({ children, onNotAdmin }) {
  const { user, token } = useContext(AuthContext);
  const { isEnabled } = useFeatures();
  const adminEnabled = isEnabled('admin');
  const isAdmin = user?.role === 'superadmin' || user?.role === 'admin';

  useEffect(() => {
    if (token == null) return;
    if (!adminEnabled || !isAdmin) {
      onNotAdmin?.();
    }
  }, [token, adminEnabled, isAdmin, onNotAdmin]);

  if (!token) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" />
      </View>
    );
  }
  if (!adminEnabled || !isAdmin) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  return children;
}

export default AdminGuard;
