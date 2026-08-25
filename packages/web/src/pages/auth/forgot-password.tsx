import { useState } from 'react';
import { NextPage } from 'next';
import Head from 'next/head';
import NextLink from 'next/link';
import { useForm, Controller } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import * as yup from 'yup';
import {
  Box,
  Container,
  Paper,
  TextField,
  Button,
  Typography,
  Alert,
  Link as MuiLink,
  CircularProgress,
} from '@mui/material';
import { ArrowBack, CheckCircle } from '@mui/icons-material';

import { useAuthStore } from '@/store/authStore';

const schema = yup.object({
  email: yup.string().email('Please enter a valid email address').required('Email is required'),
});

const ForgotPasswordPage: NextPage = () => {
  const { forgotPassword } = useAuthStore();
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const {
    control,
    handleSubmit,
    getValues,
    formState: { errors, isSubmitting },
  } = useForm<{ email: string }>({
    resolver: yupResolver(schema) as any,
    defaultValues: { email: '' },
  });

  const onSubmit = async (data: { email: string }) => {
    try {
      setError(null);
      await forgotPassword(data.email);
      setSent(true);
    } catch (err: any) {
      setError(err.message || 'Failed to send reset email');
    }
  };

  return (
    <>
      <Head>
        <title>Forgot Password - Finora</title>
        <meta name="description" content="Reset your Finora password" />
      </Head>

      <Box
        sx={{
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          backgroundColor: 'background.default',
        }}
      >
        <Container maxWidth="sm">
          <Paper elevation={3} sx={{ p: 4, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
            <Typography variant="h3" component="h1" sx={{ mb: 1, fontWeight: 'bold', color: 'primary.main' }}>
              Finora
            </Typography>

            {sent ? (
              <Box sx={{ textAlign: 'center', width: '100%' }}>
                <CheckCircle color="success" sx={{ fontSize: 64, mb: 2, mt: 1 }} />
                <Typography variant="h5" gutterBottom>
                  Check your email
                </Typography>
                <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>
                  We've sent password reset instructions to{' '}
                  <strong>{getValues('email')}</strong>. Check your inbox and follow the link to reset your password.
                </Typography>
                <Button component={NextLink} href="/auth/login" variant="contained" startIcon={<ArrowBack />} fullWidth>
                  Back to Sign In
                </Button>
              </Box>
            ) : (
              <>
                <Typography variant="h5" component="h2" gutterBottom>
                  Forgot Password
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 3, textAlign: 'center' }}>
                  Enter your email address and we'll send you instructions to reset your password.
                </Typography>

                {error && (
                  <Alert severity="error" sx={{ width: '100%', mb: 2 }}>
                    {error}
                  </Alert>
                )}

                <Box component="form" onSubmit={handleSubmit(onSubmit)} sx={{ width: '100%' }}>
                  <Controller
                    name="email"
                    control={control}
                    render={({ field }) => (
                      <TextField
                        {...field}
                        fullWidth
                        label="Email Address"
                        type="email"
                        autoComplete="email"
                        autoFocus
                        error={!!errors.email}
                        helperText={errors.email?.message}
                        sx={{ mb: 3 }}
                      />
                    )}
                  />

                  <Button
                    type="submit"
                    fullWidth
                    variant="contained"
                    size="large"
                    disabled={isSubmitting}
                    sx={{ mb: 2 }}
                  >
                    {isSubmitting ? <CircularProgress size={24} color="inherit" /> : 'Send Reset Instructions'}
                  </Button>

                  <Box sx={{ textAlign: 'center' }}>
                    <MuiLink component={NextLink} href="/auth/login" variant="body2" color="primary" sx={{ display: 'inline-flex', alignItems: 'center', gap: 0.5 }}>
                      <ArrowBack fontSize="small" />
                      Back to Sign In
                    </MuiLink>
                  </Box>
                </Box>
              </>
            )}
          </Paper>
        </Container>
      </Box>
    </>
  );
};

export default ForgotPasswordPage;
