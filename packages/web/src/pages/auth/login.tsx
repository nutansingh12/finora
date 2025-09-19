import { useState, useEffect } from 'react';
import { NextPage } from 'next';
import Head from 'next/head';
import Link from 'next/link';
import { useRouter } from 'next/router';
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
  Divider,
  CircularProgress,
} from '@mui/material';
import { toast } from 'react-hot-toast';

import { useAuthStore } from '@/store/authStore';
import { LoginForm } from '@/types';

const schema = yup.object({
  email: yup
    .string()
    .email('Please enter a valid email address')
    .required('Email is required'),
  password: yup
    .string()
    .min(6, 'Password must be at least 6 characters')
    .required('Password is required'),
});

const LoginPage: NextPage = () => {
  const router = useRouter();
  const { login, isAuthenticated, isLoading } = useAuthStore();
  const [error, setError] = useState<string | null>(null);

  const {
    control,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginForm>({
    resolver: yupResolver(schema) as any,
    defaultValues: {
      email: '',
      password: '',
    },
  });

  // Redirect if already authenticated
  useEffect(() => {
    if (isAuthenticated) {
      router.push('/');
    }
  }, [isAuthenticated, router]);

  const onSubmit = async (data: LoginForm) => {
    try {
      setError(null);
      await login(data);
      toast.success('Welcome back!');
      router.push('/');
    } catch (err: any) {
      setError(err.message || 'Login failed');
      toast.error(err.message || 'Login failed');
    }
  };

  // Show loading state during authentication check
  if (isLoading) {
    return (
      <Box
        sx={{
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          minHeight: '100vh',
        }}
      >
        <CircularProgress />
      </Box>
    );
  }

  // Don't render if already authenticated (will redirect)
  if (isAuthenticated) {
    return null;
  }

  return (
    <>
      <Head>
        <title>Login - Finora</title>
        <meta name="description" content="Sign in to your Finora account" />
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
          <Paper
            elevation={3}
            sx={{
              p: 4,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
            }}
          >
            {/* Logo and Title */}
            <Typography
              variant="h3"
              component="h1"
              sx={{
                mb: 1,
                fontWeight: 'bold',
                color: 'primary.main',
              }}
            >
              Finora
            </Typography>
            <Typography variant="h5" component="h2" gutterBottom>
              Welcome Back
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
              Sign in to your account to continue
            </Typography>

            {/* Error Alert */}
            {error && (
              <Alert severity="error" sx={{ width: '100%', mb: 2 }}>
                {error}
              </Alert>
            )}

            {/* Login Form */}
            <Box
              component="form"
              onSubmit={handleSubmit(onSubmit)}
              sx={{ width: '100%' }}
            >
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
                    sx={{ mb: 2 }}
                  />
                )}
              />

              <Controller
                name="password"
                control={control}
                render={({ field }) => (
                  <TextField
                    {...field}
                    fullWidth
                    label="Password"
                    type="password"
                    autoComplete="current-password"
                    error={!!errors.password}
                    helperText={errors.password?.message}
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
                {isSubmitting ? (
                  <CircularProgress size={24} color="inherit" />
                ) : (
                  'Sign In'
                )}
              </Button>

              <Box sx={{ textAlign: 'center', mb: 2 }}>
                <Link href="/auth/forgot-password" passHref>
                  <MuiLink variant="body2" color="primary">
                    Forgot your password?
                  </MuiLink>
                </Link>
              </Box>

              <Divider sx={{ my: 2 }}>
                <Typography variant="body2" color="text.secondary">
                  or
                </Typography>
              </Divider>

              <Box sx={{ textAlign: 'center' }}>
                <Typography variant="body2" color="text.secondary">
                  Don't have an account?{' '}
                  <Link href="/auth/register" passHref>
                    <MuiLink variant="body2" color="primary" sx={{ fontWeight: 'medium' }}>
                      Sign up here
                    </MuiLink>
                  </Link>
                </Typography>
              </Box>
            </Box>
          </Paper>

          {/* Demo Credentials */}
          <Paper
            elevation={1}
            sx={{
              mt: 2,
              p: 2,
              backgroundColor: 'info.light',
              color: 'info.contrastText',
            }}
          >
            <Typography variant="body2" sx={{ fontWeight: 'medium', mb: 1 }}>
              Demo Credentials:
            </Typography>
            <Typography variant="body2">
              Email: demo@finora.com
            </Typography>
            <Typography variant="body2">
              Password: demo123
            </Typography>
          </Paper>
        </Container>
      </Box>
    </>
  );
};

export default LoginPage;
