import React, { useContext } from 'react';
import { ConsentContext } from '../../context/ConsentContext';

/**
 * Wraps consent stack routes (OnboardingConsent, Terms, Privacy, CookiePolicy).
 * The navigator only shows consent stack when contextNeedsConsent is true.
 * This guard ensures we don't render consent screens when consent is already granted.
 */
export function ConsentGuard({ children }) {
  const consentContext = useContext(ConsentContext);
  const needsConsent = consentContext?.needsConsent ?? false;
  const loading = consentContext?.loading ?? false;

  if (loading) {
    return null;
  }
  if (!needsConsent) {
    return null; // Parent will switch to main app
  }
  return children;
}

export default ConsentGuard;
