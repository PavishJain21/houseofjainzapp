import React, { useEffect, useContext } from 'react';
import { View, ActivityIndicator } from 'react-native';
import { AuthContext } from '../../context/AuthContext';

/**
 * Protects admin routes. If user is not admin/superadmin, calls onNotAdmin()
 * so parent shows MainTabs instead (e.g. setForceMainTabs(true)).
 */
export function AdminGuard({ children, onNotAdmin }) {
  const { user, token } = useContext(AuthContext);
  const isAdmin = user?.role === 'admin' || user?.role === 'superadmin';

  useEffect(() => {
    if (token == null) return;
    if (!isAdmin) onNotAdmin?.();
  }, [token, isAdmin, onNotAdmin]);

  if (!token) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" />
      </View>
    );
  }
  if (!isAdmin) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  return children;
}

export default AdminGuard;
