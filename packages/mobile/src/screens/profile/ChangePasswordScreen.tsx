import React, {useState} from 'react';
import {View, StyleSheet} from 'react-native';
import {TextInput, Button, useTheme, HelperText, Text} from 'react-native-paper';
import {AuthService} from '../../services/AuthService';
import {useNavigation} from '@react-navigation/native';

export const ChangePasswordScreen: React.FC = () => {
  const theme = useTheme();
  const navigation = useNavigation();

  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const passwordsMatch = newPassword === confirmPassword;
  const canSubmit = currentPassword.length > 0 && newPassword.length >= 8 && passwordsMatch && !submitting;

  const onSubmit = async () => {
    setError(null);
    setSuccess(null);
    if (!passwordsMatch) {
      setError('Passwords do not match');
      return;
    }
    setSubmitting(true);
    try {
      await AuthService.changePassword(currentPassword, newPassword);
      setSuccess('Password changed successfully');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      // Optionally go back after a short delay
      setTimeout(() => navigation.goBack(), 1000);
    } catch (e: any) {
      setError(e?.message || 'Failed to change password');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <View style={[styles.container, {backgroundColor: theme.colors.background}]}> 
      <Text style={[styles.title, {color: theme.colors.onBackground}]}>Change Password</Text>

      <TextInput
        label="Current Password"
        value={currentPassword}
        onChangeText={setCurrentPassword}
        secureTextEntry
        autoCapitalize="none"
        style={styles.input}
      />

      <TextInput
        label="New Password"
        value={newPassword}
        onChangeText={setNewPassword}
        secureTextEntry
        autoCapitalize="none"
        style={styles.input}
      />
      <HelperText type={passwordsMatch ? 'info' : 'error'} visible={newPassword.length > 0}>
        Password must be at least 8 characters
      </HelperText>

      <TextInput
        label="Confirm New Password"
        value={confirmPassword}
        onChangeText={setConfirmPassword}
        secureTextEntry
        autoCapitalize="none"
        style={styles.input}
      />
      <HelperText type={passwordsMatch ? 'info' : 'error'} visible={confirmPassword.length > 0}>
        {passwordsMatch ? 'Passwords match' : 'Passwords do not match'}
      </HelperText>

      {!!error && (
        <HelperText type="error" visible={true}>
          {error}
        </HelperText>
      )}

      {!!success && (
        <HelperText type="info" visible={true}>
          {success}
        </HelperText>
      )}

      <Button mode="contained" onPress={onSubmit} disabled={!canSubmit} loading={submitting}>
        Update Password
      </Button>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16 },
  title: { fontSize: 20, fontWeight: '600', marginBottom: 16 },
  input: { marginBottom: 8 },
});

