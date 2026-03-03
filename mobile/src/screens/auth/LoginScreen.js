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
                    placeholderTextColor="#666"
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

          <TouchableOpacity
            style={styles.linkButton}
            onPress={() => navigation.navigate('Register')}
          >
            <Text style={styles.linkText}>
              {t('auth.dontHaveAccount')} {t('auth.register')}
            </Text>
          </TouchableOpacity>

          <View style={styles.dividerWrap}>
            <View style={styles.divider} />
            <Text style={styles.dividerText}>Or continue with</Text>
            <View style={styles.divider} />
          </View>
          <TouchableOpacity
            style={[styles.googleButton, googleLoading && styles.buttonDisabled]}
            onPress={handleGoogleSignIn}
            disabled={googleLoading}
          >
            <Ionicons name="logo-google" size={22} color="#333" />
            <Text style={styles.googleButtonText}>
              {googleLoading ? 'Opening…' : 'Sign in with Google'}
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
  otpHint: {
    fontSize: 14,
    color: '#666',
    marginBottom: 8,
  },
  otpInput: {
    letterSpacing: 8,
    fontSize: 20,
    textAlign: 'center',
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
  dividerWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 24,
    marginBottom: 16,
  },
  divider: {
    flex: 1,
    height: 1,
    backgroundColor: '#e0e0e0',
  },
  dividerText: {
    marginHorizontal: 12,
    fontSize: 13,
    color: '#666',
  },
  googleButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    backgroundColor: '#fff',
    borderRadius: 10,
    padding: 14,
    borderWidth: 1,
    borderColor: '#dadce0',
  },
  googleButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#3c4043',
  },
});

