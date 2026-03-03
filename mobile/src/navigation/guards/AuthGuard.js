import React, { useEffect, useContext } from 'react';
import { View, ActivityIndicator } from 'react-native';
import { AuthContext } from '../../context/AuthContext';

/**
 * Protects routes that require an authenticated user.
 * If token is missing (e.g. expired or cleared), signs out so the app shows the auth stack.
 */
export function AuthGuard({ children }) {
  const { token, signOut } = useContext(AuthContext);

  useEffect(() => {
    if (token === null) {
      signOut();
    }
  }, [token, signOut]);

  if (!token) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  return children;
}

export default AuthGuard;
