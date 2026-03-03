import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Switch,
  KeyboardAvoidingView,
  Platform,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import api from '../../config/api';
import { useTheme } from '../../context/ThemeContext';

export default function CreateSanghScreen({ navigation }) {
  const { theme } = useTheme();
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [isPublic, setIsPublic] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const handleCreate = async () => {
    const trimmed = name.trim();
    if (!trimmed) {
      setError('Group name is required');
      return;
    }
    setError('');
    setSubmitting(true);
    try {
      const res = await api.post('/sangh', {
        name: trimmed,
        description: description.trim() || null,
        is_public: isPublic,
      });
      setSubmitting(false);
      navigation.navigate('SanghLanding', { refreshSanghList: true });
    } catch (err) {
      setSubmitting(false);
      setError(err.response?.data?.error || 'Failed to create group');
    }
  };

  return (
    <KeyboardAvoidingView
      style={[styles.container, { backgroundColor: theme.colors.background }]}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
    >
      <ScrollView
        contentContainerStyle={styles.scroll}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <View style={[styles.field, { backgroundColor: theme.colors.surface }]}>
          <Text style={[styles.label, { color: theme.colors.text }]}>Group name</Text>
          <TextInput
            style={[styles.input, { color: theme.colors.text, borderColor: theme.colors.border }]}
            placeholder="e.g. Local Jain Sangh"
            placeholderTextColor={theme.colors.textMuted}
            value={name}
            onChangeText={(t) => { setName(t); setError(''); }}
            maxLength={120}
            editable={!submitting}
          />
        </View>
        <View style={[styles.field, { backgroundColor: theme.colors.surface }]}>
          <Text style={[styles.label, { color: theme.colors.text }]}>Description (optional)</Text>
          <TextInput
            style={[styles.input, styles.textArea, { color: theme.colors.text, borderColor: theme.colors.border }]}
            placeholder="What is this group about?"
            placeholderTextColor={theme.colors.textMuted}
            value={description}
            onChangeText={setDescription}
            multiline
            numberOfLines={4}
            maxLength={2000}
            editable={!submitting}
          />
        </View>
        <View style={[styles.row, { backgroundColor: theme.colors.surface }]}>
          <View style={styles.rowLeft}>
            <Ionicons name={isPublic ? 'globe-outline' : 'lock-closed-outline'} size={24} color={theme.colors.primary} />
            <View style={styles.rowText}>
              <Text style={[styles.label, { color: theme.colors.text }]}>Public group</Text>
              <Text style={[styles.hint, { color: theme.colors.textMuted }]}>
                Anyone can see and join. Turn off for invite-only.
              </Text>
            </View>
          </View>
          <Switch
            value={isPublic}
            onValueChange={setIsPublic}
            trackColor={{ false: theme.colors.border, true: 'rgba(76,175,80,0.5)' }}
            thumbColor={isPublic ? theme.colors.primary : '#f4f4f4'}
            disabled={submitting}
          />
        </View>
        {error ? <Text style={styles.errText}>{error}</Text> : null}
        <TouchableOpacity
          style={[
            styles.submit,
            { backgroundColor: theme.colors.primary },
            submitting && styles.submitDisabled,
          ]}
          onPress={handleCreate}
          disabled={submitting}
        >
          <Text style={styles.submitText}>{submitting ? 'Creating…' : 'Create Sangh'}</Text>
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scroll: { padding: 16, paddingBottom: 40 },
  field: { marginBottom: 16, padding: 16, borderRadius: 12 },
  label: { fontSize: 15, fontWeight: '600', marginBottom: 8 },
  input: {
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 16,
  },
  textArea: { minHeight: 100, textAlignVertical: 'top' },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderRadius: 12,
    marginBottom: 16,
  },
  rowLeft: { flexDirection: 'row', alignItems: 'center', flex: 1 },
  rowText: { marginLeft: 12, flex: 1 },
  hint: { fontSize: 13, marginTop: 2 },
  errText: { color: '#c62828', fontSize: 14, marginBottom: 12 },
  submit: { paddingVertical: 16, borderRadius: 12, alignItems: 'center', marginTop: 8 },
  submitDisabled: { opacity: 0.7 },
  submitText: { color: '#fff', fontSize: 17, fontWeight: '600' },
});
