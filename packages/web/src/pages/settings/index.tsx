import { useState, useEffect } from 'react';
import { NextPage } from 'next';
import Head from 'next/head';
import { useRouter } from 'next/router';
import {
  Box,
  Container,
  Typography,
  Card,
  CardContent,
  TextField,
  Button,
  Alert,
  Divider,
  CircularProgress,
} from '@mui/material';
import { CheckCircle } from '@mui/icons-material';
import { useForm, Controller } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import * as yup from 'yup';
import { toast } from 'react-hot-toast';

import { useAuthStore } from '@/store/authStore';
import Layout from '@/components/Layout';

const passwordSchema = yup.object({
  currentPassword: yup.string().required('Current password is required'),
  newPassword: yup
    .string()
    .min(8, 'Password must be at least 8 characters')
    .matches(/[A-Z]/, 'Must contain at least one uppercase letter')
    .matches(/[a-z]/, 'Must contain at least one lowercase letter')
    .matches(/[0-9]/, 'Must contain at least one number')
    .matches(/[^A-Za-z0-9]/, 'Must contain at least one special character')
    .required('New password is required'),
  confirmPassword: yup
    .string()
    .oneOf([yup.ref('newPassword')], 'Passwords do not match')
    .required('Please confirm your new password'),
});

interface PasswordForm {
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
}

const SettingsPage: NextPage = () => {
  const router = useRouter();
  const { isAuthenticated, isLoading: authLoading, changePassword } = useAuthStore();
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const {
    control,
    handleSubmit,
    reset,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<PasswordForm>({
    resolver: yupResolver(passwordSchema) as any,
    defaultValues: { currentPassword: '', newPassword: '', confirmPassword: '' },
  });

  const newPassword = watch('newPassword');
  const confirmPassword = watch('confirmPassword');
  const passwordsMatch = newPassword && confirmPassword && newPassword === confirmPassword;

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.push('/auth/login');
    }
  }, [isAuthenticated, authLoading, router]);

  const onSubmit = async (data: PasswordForm) => {
    setError(null);
    setSuccess(false);
    try {
      await changePassword(data.currentPassword, data.newPassword);
      setSuccess(true);
      reset();
      toast.success('Password changed successfully');
    } catch (err: any) {
      setError(err.message || 'Failed to change password');
    }
  };

  if (!isAuthenticated) return null;

  return (
    <>
      <Head>
        <title>Settings - Finora</title>
        <meta name="description" content="Account settings" />
      </Head>

      <Layout>
        <Container maxWidth="sm" sx={{ py: 4 }}>
          <Typography variant="h4" component="h1" gutterBottom>
            Settings
          </Typography>

          {/* Change Password */}
          <Card>
            <CardContent>
              <Typography variant="h6" fontWeight="bold" gutterBottom>
                Change Password
              </Typography>
              <Divider sx={{ mb: 3 }} />

              {success && (
                <Alert severity="success" icon={<CheckCircle />} sx={{ mb: 2 }}>
                  Password changed successfully
                </Alert>
              )}

              {error && (
                <Alert severity="error" sx={{ mb: 2 }}>
                  {error}
                </Alert>
              )}

              <Box component="form" onSubmit={handleSubmit(onSubmit)}>
                <Controller
                  name="currentPassword"
                  control={control}
                  render={({ field }) => (
                    <TextField
                      {...field}
                      fullWidth
                      label="Current Password"
                      type="password"
                      autoComplete="current-password"
                      error={!!errors.currentPassword}
                      helperText={errors.currentPassword?.message}
                      sx={{ mb: 2 }}
                    />
                  )}
                />

                <Controller
                  name="newPassword"
                  control={control}
                  render={({ field }) => (
                    <TextField
                      {...field}
                      fullWidth
                      label="New Password"
                      type="password"
                      autoComplete="new-password"
                      error={!!errors.newPassword}
                      helperText={errors.newPassword?.message}
                      sx={{ mb: 2 }}
                    />
                  )}
                />

                <Controller
                  name="confirmPassword"
                  control={control}
                  render={({ field }) => (
                    <TextField
                      {...field}
                      fullWidth
                      label="Confirm New Password"
                      type="password"
                      autoComplete="new-password"
                      error={!!errors.confirmPassword}
                      helperText={
                        errors.confirmPassword?.message ||
                        (confirmPassword && !passwordsMatch ? 'Passwords do not match' : undefined)
                      }
                      color={passwordsMatch ? 'success' : undefined}
                      sx={{ mb: 3 }}
                    />
                  )}
                />

                <Button
                  type="submit"
                  variant="contained"
                  fullWidth
                  size="large"
                  disabled={isSubmitting}
                >
                  {isSubmitting ? <CircularProgress size={24} color="inherit" /> : 'Change Password'}
                </Button>
              </Box>
            </CardContent>
          </Card>
        </Container>
      </Layout>
    </>
  );
};

export default SettingsPage;
