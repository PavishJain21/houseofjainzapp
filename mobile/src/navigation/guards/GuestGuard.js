import React from 'react';
import { AuthContext } from '../../context/AuthContext';

/**
 * Wraps auth stack routes (Login, Register, ForgotPassword, ResetPassword).
 * The navigator already only shows these when userToken is null; this guard
 * ensures we don't render protected content if token is somehow present.
 */
export function GuestGuard({ children }) {
  const { token } = React.useContext(AuthContext);
  // If user is logged in, parent ConsentNavigator should show main app.
  // No redirect needed here; parent handles it via userToken state.
  if (token) {
    return null; // Brief moment until parent re-renders with main app
  }
  return children;
}

export default GuestGuard;
