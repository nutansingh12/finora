import { NextPage } from 'next';
import Head from 'next/head';
import { useRouter } from 'next/router';
import { useEffect } from 'react';
import {
  Box,
  Container,
  Typography,
  Card,
  CardContent,
  List,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Avatar,
  Button,
  Divider,
} from '@mui/material';
import {
  Lock,
  Notifications,
  Download,
  ChevronRight,
  Logout,
} from '@mui/icons-material';
import { toast } from 'react-hot-toast';

import { useAuthStore } from '@/store/authStore';
import Layout from '@/components/Layout';
import { FeedbackButton } from '@/components/feedback/FeedbackButton';

const ProfilePage: NextPage = () => {
  const router = useRouter();
  const { isAuthenticated, isLoading: authLoading, user, logout } = useAuthStore();

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.push('/auth/login');
    }
  }, [isAuthenticated, authLoading, router]);

  const handleLogout = async () => {
    await logout();
    toast.success('Signed out');
    router.push('/auth/login');
  };

  if (!isAuthenticated) return null;

  const initials = user?.firstName
    ? `${user.firstName[0]}${user.lastName?.[0] || ''}`.toUpperCase()
    : 'U';

  return (
    <>
      <Head>
        <title>Profile - Finora</title>
        <meta name="description" content="Your Finora profile and settings" />
      </Head>

      <Layout>
        <Container maxWidth="sm" sx={{ py: 4 }}>
          {/* User Header */}
          <Card sx={{ mb: 3 }}>
            <CardContent sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', py: 4 }}>
              <Avatar
                sx={{
                  width: 80,
                  height: 80,
                  fontSize: 32,
                  fontWeight: 'bold',
                  bgcolor: 'primary.main',
                  mb: 2,
                }}
              >
                {initials}
              </Avatar>
              <Typography variant="h5" fontWeight="bold">
                {user?.firstName} {user?.lastName}
              </Typography>
              <Typography variant="body1" color="text.secondary">
                {user?.email}
              </Typography>
            </CardContent>
          </Card>

          {/* Account Settings */}
          <Card sx={{ mb: 2 }}>
            <List disablePadding>
              <ListItem disablePadding>
                <Typography variant="overline" color="text.secondary" sx={{ px: 2, py: 1 }}>
                  Account
                </Typography>
              </ListItem>
              <Divider />
              <ListItem disablePadding>
                <ListItemButton onClick={() => router.push('/settings?tab=password')}>
                  <ListItemIcon>
                    <Lock />
                  </ListItemIcon>
                  <ListItemText primary="Change Password" />
                  <ChevronRight color="action" />
                </ListItemButton>
              </ListItem>
              <Divider />
              <ListItem disablePadding>
                <ListItemButton onClick={() => router.push('/alerts')}>
                  <ListItemIcon>
                    <Notifications />
                  </ListItemIcon>
                  <ListItemText primary="Price Alerts" secondary="Manage your stock alerts" />
                  <ChevronRight color="action" />
                </ListItemButton>
              </ListItem>
            </List>
          </Card>

          {/* App Settings */}
          <Card sx={{ mb: 2 }}>
            <List disablePadding>
              <ListItem disablePadding>
                <Typography variant="overline" color="text.secondary" sx={{ px: 2, py: 1 }}>
                  App
                </Typography>
              </ListItem>
              <Divider />
              <ListItem disablePadding>
                <ListItemButton
                  onClick={async () => {
                    try {
                      const resp = await fetch('/api/portfolio/export');
                      const blob = await resp.blob();
                      const url = window.URL.createObjectURL(blob);
                      const a = document.createElement('a');
                      a.href = url;
                      a.download = `finora_portfolio_${new Date().toISOString().slice(0, 10)}.csv`;
                      a.click();
                      window.URL.revokeObjectURL(url);
                      toast.success('Portfolio exported');
                    } catch {
                      toast.error('Export failed');
                    }
                  }}
                >
                  <ListItemIcon>
                    <Download />
                  </ListItemIcon>
                  <ListItemText primary="Export Portfolio" secondary="Download as CSV" />
                  <ChevronRight color="action" />
                </ListItemButton>
              </ListItem>
              <Divider />
              <ListItem sx={{ py: 1.5 }}>
                <ListItemText
                  primary="Send Feedback"
                  secondary="Share your thoughts and help us improve"
                />
                <FeedbackButton variant="inline" />
              </ListItem>
            </List>
          </Card>

          {/* Sign Out */}
          <Button
            fullWidth
            variant="outlined"
            color="error"
            startIcon={<Logout />}
            onClick={handleLogout}
            sx={{ mt: 2 }}
          >
            Sign Out
          </Button>
        </Container>
      </Layout>
    </>
  );
};

export default ProfilePage;
