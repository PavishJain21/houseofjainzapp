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
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import api from '../../config/api';
import Logo from '../../components/Logo';

export default function ForgotPasswordScreen({ navigation }) {
  const { t } = useContext(LanguageContext);
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [emailSent, setEmailSent] = useState(false);
  const [resetLink, setResetLink] = useState(null);

  const handleForgotPassword = async () => {
    if (!email) {
      Alert.alert('Error', 'Please enter your email address');
      return;
    }

    setLoading(true);
    try {
      const response = await api.post('/auth/forgot-password', {
        email,
      });

      setEmailSent(true);
      
      // In development, show the reset link
      if (response.data.resetLink) {
        setResetLink(response.data.resetLink);
        Alert.alert(
          'Reset Link Generated',
          'Check the console or use the link below (development mode only).\n\nIn production, this link will be sent via email.',
          [{ text: 'OK' }]
        );
      } else {
        Alert.alert(
          'Email Sent',
          'If an account with that email exists, a password reset link has been sent to your email address.',
          [{ text: 'OK' }]
        );
      }
    } catch (error) {
      Alert.alert(
        'Error',
        error.response?.data?.error || 'Failed to send reset email. Please try again.'
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
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => navigation.goBack()}
          >
            <Ionicons name="arrow-back" size={24} color="#333" />
          </TouchableOpacity>
          <Logo size="large" showText={true} />
          <Text style={styles.subtitle}>Reset your password</Text>
        </View>

        {!emailSent ? (
          <View style={styles.form}>
            <Text style={styles.description}>
              Enter your email address and we'll send you a link to reset your password.
            </Text>

            <TextInput
              style={styles.input}
              placeholder={t('auth.email')}
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
              autoComplete="email"
              editable={!loading}
            />

            <TouchableOpacity
              style={[styles.button, loading && styles.buttonDisabled]}
              onPress={handleForgotPassword}
              disabled={loading}
            >
              <Text style={styles.buttonText}>
                {loading ? 'Sending...' : 'Send Reset Link'}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.linkButton}
              onPress={() => navigation.navigate('Login')}
            >
              <Text style={styles.linkText}>
                Remember your password? {t('auth.login')}
              </Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View style={styles.successContainer}>
            <Ionicons name="checkmark-circle" size={64} color="#4CAF50" />
            <Text style={styles.successTitle}>Check Your Email</Text>
            <Text style={styles.successText}>
              If an account with that email exists, we've sent a password reset link to your email address.
            </Text>

            {resetLink && (
              <View style={styles.devLinkContainer}>
                <Text style={styles.devLinkLabel}>Development Reset Link:</Text>
                <Text style={styles.devLink} selectable>
                  {resetLink}
                </Text>
                <TouchableOpacity
                  style={styles.copyButton}
                  onPress={() => {
                    // Copy to clipboard would require expo-clipboard
                    Alert.alert('Link', resetLink);
                  }}
                >
                  <Text style={styles.copyButtonText}>View Link</Text>
                </TouchableOpacity>
              </View>
            )}

            <TouchableOpacity
              style={styles.button}
              onPress={() => navigation.navigate('Login')}
            >
              <Text style={styles.buttonText}>Back to Login</Text>
            </TouchableOpacity>
          </View>
        )}
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
  description: {
    fontSize: 14,
    color: '#666',
    marginBottom: 20,
    textAlign: 'center',
    lineHeight: 20,
  },
  input: {
    backgroundColor: '#f5f5f5',
    borderRadius: 10,
    padding: 15,
    marginBottom: 15,
    fontSize: 16,
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
  successContainer: {
    alignItems: 'center',
    width: '100%',
  },
  successTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    marginTop: 20,
    marginBottom: 10,
  },
  successText: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 30,
    paddingHorizontal: 20,
  },
  devLinkContainer: {
    backgroundColor: '#f5f5f5',
    borderRadius: 10,
    padding: 15,
    marginBottom: 20,
    width: '100%',
  },
  devLinkLabel: {
    fontSize: 12,
    color: '#666',
    marginBottom: 8,
    fontWeight: '600',
  },
  devLink: {
    fontSize: 12,
    color: '#4CAF50',
    marginBottom: 10,
    fontFamily: 'monospace',
  },
  copyButton: {
    backgroundColor: '#4CAF50',
    borderRadius: 8,
    padding: 10,
    alignItems: 'center',
  },
  copyButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
});

