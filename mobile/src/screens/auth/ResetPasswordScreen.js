import React, { useState, useEffect, useContext } from 'react';
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
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import api from '../../config/api';
import Logo from '../../components/Logo';

export default function ResetPasswordScreen({ navigation, route }) {
  const { t } = useContext(LanguageContext);
  const [token, setToken] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [verifying, setVerifying] = useState(true);
  const [tokenValid, setTokenValid] = useState(false);

  useEffect(() => {
    // Get token from route params or URL
    const tokenFromRoute = route?.params?.token;
    if (tokenFromRoute) {
      setToken(tokenFromRoute);
      verifyToken(tokenFromRoute);
    } else {
      setVerifying(false);
      Alert.alert('Error', 'No reset token provided');
    }
  }, [route]);

  const verifyToken = async (tokenToVerify) => {
    try {
      const response = await api.post('/auth/verify-reset-token', {
        token: tokenToVerify,
      });

      if (response.data.valid) {
        setTokenValid(true);
      } else {
        Alert.alert('Invalid Token', 'This reset link is invalid or has expired.');
        navigation.navigate('ForgotPassword');
      }
    } catch (error) {
      Alert.alert(
        'Invalid Token',
        error.response?.data?.error || 'This reset link is invalid or has expired.'
      );
      navigation.navigate('ForgotPassword');
    } finally {
      setVerifying(false);
    }
  };

  const handleResetPassword = async () => {
    if (!password || !confirmPassword) {
      Alert.alert('Error', 'Please fill in all fields');
      return;
    }

    if (password.length < 6) {
      Alert.alert('Error', 'Password must be at least 6 characters long');
      return;
    }

    if (password !== confirmPassword) {
      Alert.alert('Error', 'Passwords do not match');
      return;
    }

    setLoading(true);
    try {
      const response = await api.post('/auth/reset-password', {
        token,
        password,
      });

      Alert.alert(
        'Success',
        response.data.message || 'Password reset successfully. You can now login with your new password.',
        [
          {
            text: 'OK',
            onPress: () => navigation.navigate('Login'),
          },
        ]
      );
    } catch (error) {
      Alert.alert(
        'Error',
        error.response?.data?.error || 'Failed to reset password. Please try again.'
      );
    } finally {
      setLoading(false);
    }
  };

  if (verifying) {
    return (
      <View style={styles.loadingContainer}>
        <Logo size="large" showText={true} />
        <Text style={styles.loadingText}>Verifying reset link...</Text>
      </View>
    );
  }

  if (!tokenValid) {
    return (
      <View style={styles.container}>
        <View style={styles.errorContainer}>
          <Ionicons name="close-circle" size={64} color="#f44336" />
          <Text style={styles.errorTitle}>Invalid Reset Link</Text>
          <Text style={styles.errorText}>
            This password reset link is invalid or has expired.
          </Text>
          <TouchableOpacity
            style={styles.button}
            onPress={() => navigation.navigate('ForgotPassword')}
          >
            <Text style={styles.buttonText}>Request New Reset Link</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={styles.container}
    >
      <ScrollView contentContainerStyle={styles.scrollContainer}>
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => navigation.navigate('Login')}
          >
            <Ionicons name="arrow-back" size={24} color="#333" />
          </TouchableOpacity>
          <Logo size="large" showText={true} />
          <Text style={styles.subtitle}>Create new password</Text>
        </View>

        <View style={styles.form}>
          <TextInput
            style={styles.input}
            placeholder="New Password"
            value={password}
            onChangeText={setPassword}
            secureTextEntry
            autoCapitalize="none"
            editable={!loading}
          />

          <TextInput
            style={styles.input}
            placeholder="Confirm New Password"
            value={confirmPassword}
            onChangeText={setConfirmPassword}
            secureTextEntry
            autoCapitalize="none"
            editable={!loading}
          />

          <Text style={styles.hint}>
            Password must be at least 6 characters long
          </Text>

          <TouchableOpacity
            style={[styles.button, loading && styles.buttonDisabled]}
            onPress={handleResetPassword}
            disabled={loading}
          >
            <Text style={styles.buttonText}>
              {loading ? 'Resetting...' : 'Reset Password'}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.linkButton}
            onPress={() => navigation.navigate('Login')}
          >
            <Text style={styles.linkText}>Back to Login</Text>
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
    padding: 20,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#fff',
  },
  loadingText: {
    marginTop: 20,
    fontSize: 16,
    color: '#666',
  },
  header: {
    alignItems: 'center',
    marginBottom: 40,
    marginTop: 20,
  },
  backButton: {
    position: 'absolute',
    left: 0,
    top: 0,
    padding: 10,
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
    marginTop: 10,
  },
  form: {
    width: '100%',
  },
  input: {
    backgroundColor: '#f5f5f5',
    borderRadius: 10,
    padding: 15,
    marginBottom: 15,
    fontSize: 16,
  },
  hint: {
    fontSize: 12,
    color: '#666',
    marginBottom: 10,
    marginTop: -5,
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
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  errorTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    marginTop: 20,
    marginBottom: 10,
  },
  errorText: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    marginBottom: 30,
    lineHeight: 20,
  },
});

