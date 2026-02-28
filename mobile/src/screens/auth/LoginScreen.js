import React, { useState, useContext, useEffect, useRef } from 'react';
import LanguageContext from '../../context/LanguageContext';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Linking,
} from 'react-native';
import * as WebBrowser from 'expo-web-browser';
import * as QueryParams from 'expo-auth-session/build/QueryParams';
import { makeRedirectUri } from 'expo-auth-session';
import Constants from 'expo-constants';
import { AuthContext } from '../../context/AuthContext';
import api, { API_BASE_URL } from '../../config/api';
import Logo from '../../components/Logo';

WebBrowser.maybeCompleteAuthSession();

const GOOGLE_OAUTH_SCOPE = 'openid email profile';

// Google client ID: from app.config.js extra (mobile/.env EXPO_PUBLIC_GOOGLE_CLIENT_ID) or env
function getGoogleClientId() {
  return Constants.expoConfig?.extra?.googleClientId || process.env.EXPO_PUBLIC_GOOGLE_CLIENT_ID || '206763068103-2btqifg7h8o6thme3ijqf91rl8f9jfl8.apps.googleusercontent.com';
}

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MIN_PASSWORD_LENGTH = 6;

export default function LoginScreen({ navigation }) {
  const { t } = useContext(LanguageContext);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errors, setErrors] = useState({ email: '', password: '' });
  const [loading, setLoading] = useState(false);
  const googleCodeHandled = useRef(false);
  const { signIn } = useContext(AuthContext);

  const validateForm = () => {
    const newErrors = { email: '', password: '' };
    let isValid = true;

    const trimmedEmail = email.trim();

    if (!trimmedEmail) {
      newErrors.email = t('auth.emailRequired');
      isValid = false;
    } else if (!EMAIL_REGEX.test(trimmedEmail)) {
      newErrors.email = t('auth.emailInvalid');
      isValid = false;
    }

    if (!password) {
      newErrors.password = t('auth.passwordRequired');
      isValid = false;
    } else if (password.length < MIN_PASSWORD_LENGTH) {
      newErrors.password = t('auth.passwordMinLength');
      isValid = false;
    }

    setErrors(newErrors);
    return isValid;
  };

  const handleEmailChange = (text) => {
    setEmail(text);
    if (errors.email) setErrors((prev) => ({ ...prev, email: '' }));
  };

  const handlePasswordChange = (text) => {
    setPassword(text);
    if (errors.password) setErrors((prev) => ({ ...prev, password: '' }));
  };

  // Web: redirect back to our app URL so we can read ?code= from the URL.
  // Native: use backend callback URL so Google accepts it (Web client type does not allow custom scheme redirect_uri).
  const getGoogleRedirectUri = () => {
    if (Platform.OS === 'web') {
      return makeRedirectUri({ scheme: 'houseofjainz', path: 'auth/callback' });
    }
    if (Platform.OS === 'ios' || Platform.OS === 'android') {
      const base = (API_BASE_URL || '').replace(/\/$/, '');
      return base ? `${base}/auth/google/callback` : makeRedirectUri({ path: 'auth/callback' });
    }
    return makeRedirectUri({ scheme: 'houseofjainz', path: 'auth/callback' });
  };

  const handleGoogleLogin = async () => {
    const clientId = getGoogleClientId();
    if (!clientId) {
      Alert.alert(t('common.error'), 'Google sign-in is not configured. Set EXPO_PUBLIC_GOOGLE_CLIENT_ID in mobile/.env and restart the app.');
      return;
    }
    setLoading(true);
    try {
      const redirectUri = getGoogleRedirectUri();
      const authUrl = [
        'https://accounts.google.com/o/oauth2/v2/auth',
        `?client_id=${encodeURIComponent(clientId)}`,
        `&redirect_uri=${encodeURIComponent(redirectUri)}`,
        '&response_type=code',
        `&scope=${encodeURIComponent(GOOGLE_OAUTH_SCOPE)}`,
      ].join('');
      if (__DEV__) {
        console.log('[Google Login] Redirect URI (add in Google Cloud Console → Credentials → Authorized redirect URIs):', redirectUri);
      }
      // Use Linking so the browser actually opens (openAuthSessionAsync can fail on some iOS/Android)
      if (Platform.OS === 'web') {
        window.location.href = authUrl;
        setLoading(false);
        return;
      }
      await Linking.openURL(authUrl);
      setLoading(false);
      // User returns via deep link (houseofjainz://auth/callback?code=...); deep link handler exchanges code and signs in
    } catch (err) {
      setLoading(false);
      Alert.alert(t('common.error'), err.message || t('auth.invalidCredentials'));
    }
  };

  // Deep link (native): app opened via houseofjainz://auth/callback?token=...&user=... (from backend) or ?error=...
  useEffect(() => {
    const handleDeepLink = (event) => {
      const url = event?.url;
      if (!url || !url.includes('auth/callback')) return;
      const { params } = QueryParams.getQueryParams(url);
      const errorMsg = params?.error;
      if (errorMsg) {
        Alert.alert(t('common.error'), decodeURIComponent(errorMsg));
        return;
      }
      const token = params?.token;
      const userParam = params?.user;
      if (token && userParam) {
        try {
          const userData = JSON.parse(decodeURIComponent(userParam));
          signIn(token, { ...userData, role: userData.role || 'user' });
        } catch (e) {
          signIn(token, { role: 'user' });
        }
      }
    };
    const sub = Linking.addEventListener('url', handleDeepLink);
    return () => sub?.remove?.();
  }, [signIn, t]);

  // Web: page loaded with ?code= after redirect from Google
  useEffect(() => {
    if (Platform.OS !== 'web' || typeof window === 'undefined') return;
    if (googleCodeHandled.current) return;
    const search = window.location.search || '';
    const match = search.match(/[?&]code=([^&]+)/);
    const code = match && match[1];
    if (!code || !getGoogleClientId()) return;
    googleCodeHandled.current = true;
    const redirectUri = getGoogleRedirectUri();
    api.post('/auth/google', { code, redirect_uri: redirectUri })
      .then((response) => {
        if (response.data.token) {
          const userData = { ...response.data.user, role: response.data.user?.role || 'user' };
          signIn(response.data.token, userData);
          window.history.replaceState({}, '', window.location.pathname || '/');
        }
      })
      .catch((e) => {
        Alert.alert(t('common.error'), e.message || t('auth.invalidCredentials'));
        window.history.replaceState({}, '', window.location.pathname || '/');
      });
  }, [signIn, t]);

  const handleLogin = async () => {
    if (!validateForm()) return;

    setLoading(true);
    try {
      const response = await api.post('/auth/login', {
        email: email.trim(),
        password,
      });

      if (response.data.token) {
        // Log user data to verify role is included
        console.log('Login response user:', response.data.user);
        console.log('User role:', response.data.user?.role);
        
        // Ensure role is set (default to 'user' if not present)
        const userData = {
          ...response.data.user,
          role: response.data.user?.role || 'user'
        };
        
        console.log('Storing user data:', userData);
        signIn(response.data.token, userData);
      }
    } catch (error) {
      Alert.alert(
        t('common.error'),
        error.response?.data?.error || t('auth.invalidCredentials')
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={styles.container}
    >
      <ScrollView contentContainerStyle={styles.scrollContainer}>
        <View style={styles.header}>
          <Logo size="large" showText={false} />
          <Text style={styles.subtitle}>Welcome back!</Text>
        </View>

        <View style={styles.form}>
          <TextInput
            style={[styles.input, errors.email && styles.inputError]}
            placeholder={t('auth.email')}
            placeholderTextColor="#666"
            value={email}
            onChangeText={handleEmailChange}
            keyboardType="email-address"
            autoCapitalize="none"
            autoComplete="email"
          />
          {errors.email ? (
            <Text style={styles.errorText}>{errors.email}</Text>
          ) : null}

          <TextInput
            style={[styles.input, errors.password && styles.inputError]}
            placeholder={t('auth.password')}
            placeholderTextColor="#666"
            value={password}
            onChangeText={handlePasswordChange}
            secureTextEntry
            autoCapitalize="none"
          />
          {errors.password ? (
            <Text style={styles.errorText}>{errors.password}</Text>
          ) : null}

          <TouchableOpacity
            style={[styles.button, loading && styles.buttonDisabled]}
            onPress={handleLogin}
            disabled={loading}
          >
            <Text style={styles.buttonText}>
              {loading ? t('common.loading') : t('auth.login')}
            </Text>
          </TouchableOpacity>

          <>
              <View style={styles.divider}>
                <View style={styles.dividerLine} />
                <Text style={styles.dividerText}>or</Text>
                <View style={styles.dividerLine} />
              </View>
              <TouchableOpacity
                style={[styles.googleButton, loading && styles.buttonDisabled]}
                onPress={handleGoogleLogin}
                disabled={loading}
              >
                <Text style={styles.googleButtonText}>{t('auth.loginWithGoogle')}</Text>
              </TouchableOpacity>
            </>

          <TouchableOpacity
            style={styles.linkButton}
            onPress={() => navigation.navigate('ForgotPassword')}
          >
            <Text style={styles.forgotPasswordText}>Forgot Password?</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.linkButton}
            onPress={() => navigation.navigate('Register')}
          >
            <Text style={styles.linkText}>
              {t('auth.dontHaveAccount')} {t('auth.register')}
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  scrollContainer: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: 20,
  },
  header: {
    alignItems: 'center',
    marginBottom: 40,
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#4CAF50',
    marginBottom: 10,
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
  },
  form: {
    width: '100%',
  },
  input: {
    backgroundColor: '#f5f5f5',
    borderRadius: 10,
    padding: 15,
    marginBottom: 4,
    fontSize: 16,
  },
  inputError: {
    borderWidth: 1,
    borderColor: '#e53935',
  },
  errorText: {
    color: '#e53935',
    fontSize: 12,
    marginBottom: 12,
    marginTop: 2,
  },
  button: {
    backgroundColor: '#4CAF50',
    borderRadius: 10,
    padding: 15,
    alignItems: 'center',
    marginTop: 10,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  linkButton: {
    marginTop: 20,
    alignItems: 'center',
  },
  linkText: {
    color: '#4CAF50',
    fontSize: 14,
  },
  forgotPasswordText: {
    color: '#4CAF50',
    fontSize: 14,
    fontWeight: '600',
  },
  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 20,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: '#ddd',
  },
  dividerText: {
    marginHorizontal: 12,
    color: '#999',
    fontSize: 14,
  },
  googleButton: {
    backgroundColor: '#fff',
    borderRadius: 10,
    padding: 15,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#ddd',
  },
  googleButtonText: {
    color: '#333',
    fontSize: 16,
  },
});

