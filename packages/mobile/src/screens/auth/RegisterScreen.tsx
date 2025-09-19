import React, {useState} from 'react';
import {View, StyleSheet, ScrollView, Alert} from 'react-native';
import {
  TextInput,
  Button,
  Text,
  useTheme,
  HelperText,
} from 'react-native-paper';
import {SafeAreaView} from 'react-native-safe-area-context';
import {useAuth} from '../../store/AuthContext';
import {useForm, Controller} from 'react-hook-form';

interface RegisterFormData {
  firstName: string;
  lastName: string;
  email: string;
  password: string;
  confirmPassword: string;
}

interface Props {
  navigation: any;
}

export const RegisterScreen: React.FC<Props> = ({navigation}) => {
  const theme = useTheme();
  const {register} = useAuth();
  const [loading, setLoading] = useState(false);

  const {
    control,
    handleSubmit,
    watch,
    formState: {errors},
  } = useForm<RegisterFormData>();

  const password = watch('password');

  const onSubmit = async (data: RegisterFormData) => {
    try {
      setLoading(true);
      await register({
        firstName: data.firstName,
        lastName: data.lastName,
        email: data.email,
        password: data.password,
      });
    } catch (error: any) {
      Alert.alert('Registration Failed', error.message || 'Please try again');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={[styles.container, {backgroundColor: theme.colors.background}]}>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={[styles.title, {color: theme.colors.text}]}>
          Create Account
        </Text>
        <Text style={[styles.subtitle, {color: theme.colors.text}]}>
          Join Finora to start tracking your investments
        </Text>

        <View style={styles.form}>
          <Controller
            control={control}
            name="firstName"
            rules={{required: 'First name is required'}}
            render={({field: {onChange, onBlur, value}}) => (
              <TextInput
                label="First Name"
                value={value}
                onBlur={onBlur}
                onChangeText={onChange}
                error={!!errors.firstName}
                style={styles.input}
              />
            )}
          />
          <HelperText type="error" visible={!!errors.firstName}>
            {errors.firstName?.message}
          </HelperText>

          <Controller
            control={control}
            name="lastName"
            rules={{required: 'Last name is required'}}
            render={({field: {onChange, onBlur, value}}) => (
              <TextInput
                label="Last Name"
                value={value}
                onBlur={onBlur}
                onChangeText={onChange}
                error={!!errors.lastName}
                style={styles.input}
              />
            )}
          />
          <HelperText type="error" visible={!!errors.lastName}>
            {errors.lastName?.message}
          </HelperText>

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
                value={value}
                onBlur={onBlur}
                onChangeText={onChange}
                keyboardType="email-address"
                autoCapitalize="none"
                error={!!errors.email}
                style={styles.input}
              />
            )}
          />
          <HelperText type="error" visible={!!errors.email}>
            {errors.email?.message}
          </HelperText>

          <Controller
            control={control}
            name="password"
            rules={{
              required: 'Password is required',
              minLength: {
                value: 8,
                message: 'Password must be at least 8 characters',
              },
            }}
            render={({field: {onChange, onBlur, value}}) => (
              <TextInput
                label="Password"
                value={value}
                onBlur={onBlur}
                onChangeText={onChange}
                secureTextEntry
                error={!!errors.password}
                style={styles.input}
              />
            )}
          />
          <HelperText type="error" visible={!!errors.password}>
            {errors.password?.message}
          </HelperText>

          <Controller
            control={control}
            name="confirmPassword"
            rules={{
              required: 'Please confirm your password',
              validate: (value) =>
                value === password || 'Passwords do not match',
            }}
            render={({field: {onChange, onBlur, value}}) => (
              <TextInput
                label="Confirm Password"
                value={value}
                onBlur={onBlur}
                onChangeText={onChange}
                secureTextEntry
                error={!!errors.confirmPassword}
                style={styles.input}
              />
            )}
          />
          <HelperText type="error" visible={!!errors.confirmPassword}>
            {errors.confirmPassword?.message}
          </HelperText>

          <Button
            mode="contained"
            onPress={handleSubmit(onSubmit)}
            loading={loading}
            disabled={loading}
            style={styles.button}
          >
            Create Account
          </Button>

          <Button
            mode="text"
            onPress={() => navigation.navigate('Login')}
            style={styles.linkButton}
          >
            Already have an account? Sign In
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
    flexGrow: 1,
    padding: 24,
    justifyContent: 'center',
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 32,
    opacity: 0.7,
  },
  form: {
    width: '100%',
  },
  input: {
    marginBottom: 8,
  },
  button: {
    marginTop: 16,
    marginBottom: 16,
  },
  linkButton: {
    marginTop: 8,
  },
});
