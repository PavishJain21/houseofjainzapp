import React, { useEffect, useState, useContext } from 'react';
import { View, Text, StyleSheet, ActivityIndicator, TouchableOpacity, Platform } from 'react-native';
import { AuthContext } from '../../context/AuthContext';
import api from '../../config/api';

export default function AuthCallbackScreen({ navigation }) {
  const { signIn } = useContext(AuthContext);
  const [status, setStatus] = useState('loading'); // 'loading' | 'done' | 'error'
  const [errorMessage, setErrorMessage] = useState('');

  useEffect(() => {
    let cancelled = false;
    const run = async () => {
      if (Platform.OS !== 'web' || typeof window === 'undefined') {
        setStatus('done');
        return;
      }
      const params = new URLSearchParams(window.location.search);
      const token = params.get('token');
      const err = params.get('error');
      if (err) {
        setErrorMessage(decodeURIComponent(err));
        setStatus('error');
        return;
      }
      if (!token) {
        setErrorMessage('No token received');
        setStatus('error');
        return;
      }
      try {
        const res = await api.get('/auth/me', {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (cancelled) return;
        if (res.data?.user) {
          const userData = { ...res.data.user, role: res.data.user?.role || 'user' };
          signIn(token, userData);
          setStatus('done');
          window.location.replace('/');
        } else {
          setErrorMessage('Could not load user');
          setStatus('error');
        }
      } catch (e) {
        if (!cancelled) {
          setErrorMessage(e.response?.data?.error || e.message || 'Sign-in failed');
          setStatus('error');
        }
      }
    };
    run();
    return () => { cancelled = true; };
  }, [signIn]);

  if (status === 'loading') {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#4CAF50" />
        <Text style={styles.text}>Completing sign-in…</Text>
      </View>
    );
  }
  if (status === 'error') {
    return (
      <View style={styles.center}>
        <Text style={styles.errorTitle}>Sign-in failed</Text>
        <Text style={styles.errorText}>{errorMessage}</Text>
        <TouchableOpacity style={styles.button} onPress={() => navigation.replace('Login')}>
          <Text style={styles.buttonText}>Back to Login</Text>
        </TouchableOpacity>
      </View>
    );
  }
  return (
    <View style={styles.center}>
      <ActivityIndicator size="large" color="#4CAF50" />
      <Text style={styles.text}>Redirecting…</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
    backgroundColor: '#fff',
  },
  text: { marginTop: 12, fontSize: 16, color: '#666' },
  errorTitle: { fontSize: 18, fontWeight: '600', color: '#c62828', marginBottom: 8 },
  errorText: { fontSize: 14, color: '#666', textAlign: 'center', marginBottom: 24 },
  button: { backgroundColor: '#4CAF50', paddingVertical: 12, paddingHorizontal: 24, borderRadius: 10 },
  buttonText: { color: '#fff', fontSize: 16, fontWeight: '600' },
});
