import React, { useState, useContext, useEffect } from 'react';
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
import { AuthContext } from '../../context/AuthContext';
import api from '../../config/api';
import Logo from '../../components/Logo';
import { supabase } from '../../config/supabase';

WebBrowser.maybeCompleteAuthSession();

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MIN_PASSWORD_LENGTH = 6;

export default function LoginScreen({ navigation }) {
  const { t } = useContext(LanguageContext);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errors, setErrors] = useState({ email: '', password: '' });
  const [loading, setLoading] = useState(false);
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

  const createSessionFromUrl = async (url) => {
    if (!supabase) return null;
    const { params, errorCode } = QueryParams.getQueryParams(url);
    if (errorCode) throw new Error(errorCode);
    const { access_token, refresh_token } = params;
    if (!access_token) return null;
    const { data, error } = await supabase.auth.setSession({ access_token, refresh_token });
    if (error) throw error;
    return data.session;
  };

  const handleGoogleLogin = async () => {
    if (!supabase) {
      Alert.alert(t('common.error'), 'Google login is not configured. Add EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_ANON_KEY to your .env or app.config.js.');
      return;
    }
    setLoading(true);
    try {
      const redirectTo = makeRedirectUri({ scheme: 'houseofjainz', path: 'auth/callback' });
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: { redirectTo, skipBrowserRedirect: true },
      });
      if (error) throw error;
      const res = await WebBrowser.openAuthSessionAsync(data?.url ?? '', redirectTo);
      if (res.type === 'success' && res.url) {
        const session = await createSessionFromUrl(res.url);
        if (session?.access_token) {
          const response = await api.post('/auth/google', { access_token: session.access_token });
          if (response.data.token) {
            const userData = { ...response.data.user, role: response.data.user?.role || 'user' };
            signIn(response.data.token, userData);
          }
        }
      }
    } catch (err) {
      Alert.alert(t('common.error'), err.message || t('auth.invalidCredentials'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const handleDeepLink = (event) => {
      const url = event?.url;
      if (url && (url.includes('access_token') || url.includes('#'))) {
        createSessionFromUrl(url).then(async (session) => {
          if (session?.access_token) {
            try {
              const response = await api.post('/auth/google', { access_token: session.access_token });
              if (response.data.token) {
                const userData = { ...response.data.user, role: response.data.user?.role || 'user' };
                signIn(response.data.token, userData);
              }
            } catch (e) {
              Alert.alert(t('common.error'), e.message || t('auth.invalidCredentials'));
            }
          }
        }).catch(console.error);
      }
    };
    const sub = Linking.addEventListener('url', handleDeepLink);
    return () => sub?.remove?.();
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

          {supabase ? (
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
          ) : null}

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

