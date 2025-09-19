import React, {useState} from 'react';
import {View, StyleSheet, ScrollView} from 'react-native';
import {
  Button,
  Text,
  TextInput,
  useTheme,
  Snackbar,
} from 'react-native-paper';
import {SafeAreaView} from 'react-native-safe-area-context';
import {StackNavigationProp} from '@react-navigation/stack';
import {useForm, Controller} from 'react-hook-form';
import {AuthStackParamList} from '../../navigation/AuthNavigator';
import {useAuth} from '../../store/AuthContext';

type LoginScreenNavigationProp = StackNavigationProp<
  AuthStackParamList,
  'Login'
>;

interface Props {
  navigation: LoginScreenNavigationProp;
}

interface LoginForm {
  email: string;
  password: string;
}

export const LoginScreen: React.FC<Props> = ({navigation}) => {
  const theme = useTheme();
  const {login} = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const {
    control,
    handleSubmit,
    formState: {errors},
  } = useForm<LoginForm>();

  const onSubmit = async (data: LoginForm) => {
    try {
      setLoading(true);
      setError('');
      await login(data.email, data.password);
    } catch (err: any) {
      setError(err.message || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={[styles.container, {backgroundColor: theme.colors.background}]}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.header}>
          <Text style={[styles.title, {color: theme.colors.text}]}>
            Welcome Back
          </Text>
          <Text style={[styles.subtitle, {color: theme.colors.text}]}>
            Sign in to your account
          </Text>
        </View>

        <View style={styles.form}>
          <Controller
            control={control}
            name="email"
            rules={{
              required: 'Email is required',
              pattern: {
                value: /^\S+@\S+$/i,
                message: 'Invalid email address',
              },
            }}
            render={({field: {onChange, onBlur, value}}) => (
              <TextInput
                label="Email"
                mode="outlined"
                onBlur={onBlur}
                onChangeText={onChange}
                value={value}
                error={!!errors.email}
                keyboardType="email-address"
                autoCapitalize="none"
                style={styles.input}
              />
            )}
          />
          {errors.email && (
            <Text style={[styles.errorText, {color: theme.colors.error}]}>
              {errors.email.message}
            </Text>
          )}

          <Controller
            control={control}
            name="password"
            rules={{
              required: 'Password is required',
              minLength: {
                value: 6,
                message: 'Password must be at least 6 characters',
              },
            }}
            render={({field: {onChange, onBlur, value}}) => (
              <TextInput
                label="Password"
                mode="outlined"
                onBlur={onBlur}
                onChangeText={onChange}
                value={value}
                error={!!errors.password}
                secureTextEntry
                style={styles.input}
              />
            )}
          />
          {errors.password && (
            <Text style={[styles.errorText, {color: theme.colors.error}]}>
              {errors.password.message}
            </Text>
          )}

          <Button
            mode="text"
            onPress={() => navigation.navigate('ForgotPassword')}
            style={styles.forgotButton}>
            Forgot Password?
          </Button>

          <Button
            mode="contained"
            onPress={handleSubmit(onSubmit)}
            loading={loading}
            disabled={loading}
            style={styles.loginButton}
            contentStyle={styles.buttonContent}>
            Sign In
          </Button>

          <View style={styles.signupContainer}>
            <Text style={[styles.signupText, {color: theme.colors.text}]}>
              Don't have an account?{' '}
            </Text>
            <Button
              mode="text"
              onPress={() => navigation.navigate('Register')}
              compact>
              Sign Up
            </Button>
          </View>
        </View>
      </ScrollView>

      <Snackbar
        visible={!!error}
        onDismiss={() => setError('')}
        duration={4000}>
        {error}
      </Snackbar>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    flexGrow: 1,
    padding: 24,
  },
  header: {
    marginTop: 40,
    marginBottom: 40,
    alignItems: 'center',
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    opacity: 0.7,
  },
  form: {
    flex: 1,
  },
  input: {
    marginBottom: 8,
  },
  errorText: {
    fontSize: 12,
    marginBottom: 16,
    marginLeft: 12,
  },
  forgotButton: {
    alignSelf: 'flex-end',
    marginBottom: 24,
  },
  loginButton: {
    marginBottom: 24,
  },
  buttonContent: {
    height: 48,
  },
  signupContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  signupText: {
    fontSize: 14,
  },
});
