import React from 'react';
import {View, StyleSheet, ScrollView} from 'react-native';
import {
  List,
  Text,
  useTheme,
  Avatar,
  Button,
  Divider,
} from 'react-native-paper';
import {SafeAreaView} from 'react-native-safe-area-context';
import {useAuth} from '../../store/AuthContext';
import {FeedbackButton} from '../../components/feedback/FeedbackButton';

export const ProfileScreen: React.FC = () => {
  const theme = useTheme();
  const {user, logout} = useAuth();

  const handleLogout = async () => {
    try {
      await logout();
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  return (
    <SafeAreaView style={[styles.container, {backgroundColor: theme.colors.background}]}>
      <ScrollView style={styles.content}>
        <View style={styles.header}>
          <Avatar.Text
            size={80}
            label={user?.firstName?.[0] || 'U'}
            style={styles.avatar}
          />
          <Text style={[styles.name, {color: theme.colors.text}]}>
            {user?.firstName} {user?.lastName}
          </Text>
          <Text style={[styles.email, {color: theme.colors.text}]}>
            {user?.email}
          </Text>
        </View>

        <View style={styles.section}>
          <List.Section>
            <List.Subheader>Account</List.Subheader>
            <List.Item
              title="Edit Profile"
              left={() => <List.Icon icon="account-edit" />}
              right={() => <List.Icon icon="chevron-right" />}
              onPress={() => {
                // TODO: Navigate to edit profile
                console.log('Edit profile');
              }}
            />
            <List.Item
              title="Change Password"
              left={() => <List.Icon icon="lock" />}
              right={() => <List.Icon icon="chevron-right" />}
              onPress={() => {
                // TODO: Navigate to change password
                console.log('Change password');
              }}
            />
            <List.Item
              title="Notification Settings"
              left={() => <List.Icon icon="bell" />}
              right={() => <List.Icon icon="chevron-right" />}
              onPress={() => {
                // TODO: Navigate to notification settings
                console.log('Notification settings');
              }}
            />
          </List.Section>

          <Divider />

          <List.Section>
            <List.Subheader>App</List.Subheader>
            <List.Item
              title="Theme"
              left={() => <List.Icon icon="palette" />}
              right={() => <List.Icon icon="chevron-right" />}
              onPress={() => {
                // TODO: Navigate to theme settings
                console.log('Theme settings');
              }}
            />
            <List.Item
              title="Data Export"
              left={() => <List.Icon icon="download" />}
              right={() => <List.Icon icon="chevron-right" />}
              onPress={() => {
                // TODO: Navigate to data export
                console.log('Data export');
              }}
            />
            <List.Item
              title="Help & Support"
              left={() => <List.Icon icon="help-circle" />}
              right={() => <List.Icon icon="chevron-right" />}
              onPress={() => {
                // TODO: Navigate to help
                console.log('Help & support');
              }}
            />
            <List.Item
              title="Send Feedback"
              description="Share your thoughts and help us improve"
              left={() => <List.Icon icon="star" />}
              right={() => <FeedbackButton variant="inline" />}
            />
          </List.Section>

          <Divider />

          <List.Section>
            <List.Subheader>About</List.Subheader>
            <List.Item
              title="Privacy Policy"
              left={() => <List.Icon icon="shield-account" />}
              right={() => <List.Icon icon="chevron-right" />}
              onPress={() => {
                // TODO: Navigate to privacy policy
                console.log('Privacy policy');
              }}
            />
            <List.Item
              title="Terms of Service"
              left={() => <List.Icon icon="file-document" />}
              right={() => <List.Icon icon="chevron-right" />}
              onPress={() => {
                // TODO: Navigate to terms
                console.log('Terms of service');
              }}
            />
            <List.Item
              title="App Version"
              left={() => <List.Icon icon="information" />}
              right={() => <Text>1.0.0</Text>}
            />
          </List.Section>
        </View>

        <View style={styles.logoutSection}>
          <Button
            mode="outlined"
            onPress={handleLogout}
            style={styles.logoutButton}
            textColor={theme.colors.error}
          >
            Sign Out
          </Button>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    flex: 1,
  },
  header: {
    alignItems: 'center',
    padding: 24,
  },
  avatar: {
    marginBottom: 16,
  },
  name: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  email: {
    fontSize: 16,
    opacity: 0.7,
  },
  section: {
    flex: 1,
  },
  logoutSection: {
    padding: 24,
    paddingTop: 16,
  },
  logoutButton: {
    borderColor: 'red',
  },
});
