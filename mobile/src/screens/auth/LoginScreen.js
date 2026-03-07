import React, { useState, useContext } from 'react';
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
import { Ionicons } from '@expo/vector-icons';
import { AuthContext } from '../../context/AuthContext';
import api from '../../config/api';
import Logo from '../../components/Logo';
import { API_BASE_URL } from '../../config/api';

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MIN_PASSWORD_LENGTH = 6;

export default function LoginScreen({ navigation }) {
  const { t } = useContext(LanguageContext);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [otp, setOtp] = useState('');
  const [errors, setErrors] = useState({ email: '', password: '', otp: '' });
  const [loginError, setLoginError] = useState('');
  const [loading, setLoading] = useState(false);
  const [loginMode, setLoginMode] = useState('password'); // 'password' | 'otp'
  const [otpSent, setOtpSent] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const { signIn } = useContext(AuthContext);

  const getGoogleRedirectUri = () => {
    if (Platform.OS === 'web' && typeof window !== 'undefined') {
      const origin = window.location.origin || '';
      return `${origin.replace(/\/$/, '')}/auth/callback`;
    }
    return 'houseofjainz://auth/callback';
  };

  const handleGoogleSignIn = () => {
    const base = (API_BASE_URL || '').replace(/\/$/, '');
    const authBase = base.endsWith('/api') ? base : `${base}/api`;
    const redirectUri = getGoogleRedirectUri();
    const url = `${authBase}/auth/google?redirect_uri=${encodeURIComponent(redirectUri)}`;
    setGoogleLoading(true);
    if (Platform.OS === 'web') {
      window.location.href = url;
    } else {
      Linking.openURL(url).catch(() => {
        setGoogleLoading(false);
        Alert.alert(t('common.error'), 'Could not open sign-in page.');
      });
    }
  };

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
    if (loginError) setLoginError('');
  };

  const handlePasswordChange = (text) => {
    setPassword(text);
    if (errors.password) setErrors((prev) => ({ ...prev, password: '' }));
    if (loginError) setLoginError('');
  };

  const handleSendOtp = async () => {
    const trimmedEmail = email.trim();
    if (!trimmedEmail) {
      setErrors((prev) => ({ ...prev, email: t('auth.emailRequired') }));
      return;
    }
    if (!EMAIL_REGEX.test(trimmedEmail)) {
      setErrors((prev) => ({ ...prev, email: t('auth.emailInvalid') }));
      return;
    }
    setErrors((prev) => ({ ...prev, email: '', otp: '' }));
    setLoading(true);
    try {
      const res = await api.post('/auth/send-otp', { email: trimmedEmail });
      setOtpSent(true);
      setOtp('');
      if (res.data?.message) Alert.alert(t('common.success'), res.data.message);
    } catch (err) {
      const msg = err.response?.data?.error || err.message || t('auth.invalidCredentials');
      Alert.alert(t('common.error'), msg);
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOtp = async () => {
    const trimmedEmail = email.trim();
    const trimmedOtp = otp.trim();
    if (!trimmedEmail || !EMAIL_REGEX.test(trimmedEmail)) {
      setErrors((prev) => ({ ...prev, email: t('auth.emailInvalid') }));
      return;
    }
    if (trimmedOtp.length !== 6) {
      setErrors((prev) => ({ ...prev, otp: 'Enter the 6-digit code' }));
      return;
    }
    setErrors((prev) => ({ ...prev, otp: '' }));
    setLoading(true);
    try {
      const res = await api.post('/auth/verify-otp', { email: trimmedEmail, otp: trimmedOtp });
      if (res.data?.token) {
        const userData = { ...res.data.user, role: res.data.user?.role || 'user' };
        signIn(res.data.token, userData);
      }
    } catch (err) {
      const msg = err.response?.data?.error || err.message || t('auth.invalidCredentials');
      setErrors((prev) => ({ ...prev, otp: msg }));
    } finally {
      setLoading(false);
    }
  };

  const handleLogin = async () => {
    if (!validateForm()) return;

    setLoginError('');
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
      const msg = error.response?.data?.error
        || (error.response?.data?.errors && error.response.data.errors[0]?.msg)
        || t('auth.invalidCredentials');
      setLoginError(msg);
      if (Platform.OS !== 'web') {
        Alert.alert(t('common.error'), msg);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={styles.container}
    >
      <ScrollView
        contentContainerStyle={styles.scrollContainer}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.header}>
          <Logo size="large" showText={false} />
          <Text style={styles.title}>Welcome back</Text>
          <Text style={styles.subtitle}>Sign in to continue to House of Jainz</Text>
        </View>

        {/* Primary CTA: Sign in with Google — shown first to encourage use */}
        <View style={styles.googleSection}>
          <Text style={styles.googlePrompt}>Quick & secure — no password needed</Text>
          <TouchableOpacity
            style={[styles.googleButton, googleLoading && styles.buttonDisabled]}
            onPress={handleGoogleSignIn}
            disabled={googleLoading}
            activeOpacity={0.85}
          >
            <Ionicons name="logo-google" size={24} color="#fff" />
            <Text style={styles.googleButtonText}>
              {googleLoading ? 'Opening…' : 'Sign in with Google'}
            </Text>
          </TouchableOpacity>
          <Text style={styles.googleHint}>Most people use Google — one tap and you’re in</Text>
        </View>

        <View style={styles.dividerWrap}>
          <View style={styles.divider} />
          <Text style={styles.dividerText}>or use email</Text>
          <View style={styles.divider} />
        </View>

        <View style={styles.formCard}>
          <View style={styles.form}>
            <TextInput
              style={[styles.input, errors.email && styles.inputError]}
              placeholder={t('auth.email')}
              placeholderTextColor="#888"
              value={email}
              onChangeText={handleEmailChange}
              keyboardType="email-address"
              autoCapitalize="none"
              autoComplete="email"
              editable={loginMode !== 'otp' || !otpSent}
            />
            {errors.email ? (
              <Text style={styles.errorText}>{errors.email}</Text>
            ) : null}

            {loginMode === 'password' ? (
              <>
                <TextInput
                  style={[styles.input, errors.password && styles.inputError]}
                  placeholder={t('auth.password')}
                  placeholderTextColor="#888"
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
                  activeOpacity={0.85}
                >
                  <Text style={styles.buttonText}>
                    {loading ? t('common.loading') : t('auth.login')}
                  </Text>
                </TouchableOpacity>
                {loginError ? (
                  <Text style={styles.errorText}>{loginError}</Text>
                ) : null}
              </>
            ) : (
              <>
                {otpSent && (
                  <>
                    <Text style={styles.otpHint}>We sent a 6-digit code to your email.</Text>
                    <TextInput
                      style={[styles.input, styles.otpInput, errors.otp && styles.inputError]}
                      placeholder="Enter 6-digit code"
                      placeholderTextColor="#888"
                      value={otp}
                      onChangeText={(text) => {
                        setOtp(text.replace(/\D/g, '').slice(0, 6));
                        if (errors.otp) setErrors((prev) => ({ ...prev, otp: '' }));
                      }}
                      keyboardType="number-pad"
                      maxLength={6}
                      editable={!loading}
                    />
                    {errors.otp ? (
                      <Text style={styles.errorText}>{errors.otp}</Text>
                    ) : null}
                    <TouchableOpacity
                      style={[styles.button, loading && styles.buttonDisabled]}
                      onPress={handleVerifyOtp}
                      disabled={loading}
                      activeOpacity={0.85}
                    >
                      <Text style={styles.buttonText}>
                        {loading ? t('common.loading') : 'Verify & sign in'}
                      </Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={styles.linkButton}
                      onPress={() => { setOtpSent(false); setOtp(''); setErrors((prev) => ({ ...prev, otp: '' })); }}
                      disabled={loading}
                    >
                      <Text style={styles.linkText}>Use a different email</Text>
                    </TouchableOpacity>
                  </>
                )}
                {!otpSent && (
                  <TouchableOpacity
                    style={[styles.button, loading && styles.buttonDisabled]}
                    onPress={handleSendOtp}
                    disabled={loading}
                    activeOpacity={0.85}
                  >
                    <Text style={styles.buttonText}>
                      {loading ? t('common.loading') : 'Send OTP to email'}
                    </Text>
                  </TouchableOpacity>
                )}
              </>
            )}

            <TouchableOpacity
              style={styles.linkButton}
              onPress={() => {
                setLoginMode(loginMode === 'password' ? 'otp' : 'password');
                setOtpSent(false);
                setOtp('');
                setErrors({ email: '', password: '', otp: '' });
              }}
            >
              <Text style={styles.linkText}>
                {loginMode === 'password' ? 'Login with OTP instead' : 'Login with password instead'}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.linkButton}
              onPress={() => navigation.navigate('ForgotPassword')}
            >
              <Text style={styles.forgotPasswordText}>Forgot Password?</Text>
            </TouchableOpacity>
          </View>
        </View>

        <TouchableOpacity
          style={styles.registerCta}
          onPress={() => navigation.navigate('Register')}
        >
          <Text style={styles.registerCtaText}>
            {t('auth.dontHaveAccount')}{' '}
            <Text style={styles.registerCtaBold}>{t('auth.register')}</Text>
          </Text>
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8faf9',
  },
  scrollContainer: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: 24,
    paddingTop: 32,
    paddingBottom: 40,
  },
  header: {
    alignItems: 'center',
    marginBottom: 28,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: '#1a1a1a',
    marginTop: 12,
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 15,
    color: '#64748b',
  },
  googleSection: {
    marginBottom: 20,
  },
  googlePrompt: {
    fontSize: 14,
    color: '#475569',
    textAlign: 'center',
    marginBottom: 10,
  },
  googleButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    backgroundColor: '#4285F4',
    borderRadius: 12,
    paddingVertical: 16,
    paddingHorizontal: 20,
    shadowColor: '#4285F4',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 4,
  },
  googleButtonText: {
    fontSize: 17,
    fontWeight: '600',
    color: '#fff',
  },
  googleHint: {
    fontSize: 13,
    color: '#64748b',
    textAlign: 'center',
    marginTop: 10,
  },
  dividerWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  divider: {
    flex: 1,
    height: 1,
    backgroundColor: '#e2e8f0',
  },
  dividerText: {
    marginHorizontal: 14,
    fontSize: 13,
    color: '#64748b',
  },
  formCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 20,
    marginBottom: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  form: {
    width: '100%',
  },
  input: {
    backgroundColor: '#f1f5f9',
    borderRadius: 12,
    padding: 16,
    marginBottom: 4,
    fontSize: 16,
    color: '#1e293b',
  },
  inputError: {
    borderWidth: 1.5,
    borderColor: '#ef4444',
    backgroundColor: '#fef2f2',
  },
  errorText: {
    color: '#dc2626',
    fontSize: 13,
    marginBottom: 10,
    marginTop: 4,
  },
  otpHint: {
    fontSize: 14,
    color: '#64748b',
    marginBottom: 10,
  },
  otpInput: {
    letterSpacing: 8,
    fontSize: 20,
    textAlign: 'center',
  },
  button: {
    backgroundColor: '#4CAF50',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    marginTop: 12,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  linkButton: {
    marginTop: 16,
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
  registerCta: {
    alignItems: 'center',
    paddingVertical: 8,
  },
  registerCtaText: {
    fontSize: 15,
    color: '#64748b',
  },
  registerCtaBold: {
    color: '#4CAF50',
    fontWeight: '600',
  },
});

