import { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { Link } from 'expo-router';
import { Controller, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { ShieldCheck } from 'lucide-react-native';
import { Screen } from '@/components/ui/Screen';
import { AppText } from '@/components/ui/AppText';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { useToast } from '@/components/ui/Toast';
import { useTheme } from '@/theme/ThemeProvider';
import { supabase } from '@/lib/supabase';
import { loginSchema, type LoginForm } from '@/lib/validation';

export default function LoginScreen() {
  const { colors } = useTheme();
  const toast = useToast();
  const [submitting, setSubmitting] = useState(false);
  const { control, handleSubmit } = useForm<LoginForm>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: '', password: '' },
  });

  const onSubmit = handleSubmit(async ({ email, password }) => {
    setSubmitting(true);
    const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
    setSubmitting(false);
    if (error) toast.show('error', 'Wrong email or password');
    // On success the AuthGate swaps to the (app) group automatically.
  });

  return (
    <Screen>
      <View style={styles.brand}>
        <View style={[styles.logo, { backgroundColor: colors.primary }]}>
          <ShieldCheck size={28} color="#FFFFFF" strokeWidth={2} />
        </View>
        <AppText variant="display">Welcome back</AppText>
        <AppText variant="body" color="secondary">
          Vehicle inspections, done properly.
        </AppText>
      </View>

      <View style={styles.form}>
        <Controller
          control={control}
          name="email"
          render={({ field, fieldState }) => (
            <Input
              label="Email"
              autoCapitalize="none"
              autoComplete="email"
              keyboardType="email-address"
              value={field.value}
              onChangeText={field.onChange}
              onBlur={field.onBlur}
              error={fieldState.error?.message}
            />
          )}
        />
        <Controller
          control={control}
          name="password"
          render={({ field, fieldState }) => (
            <Input
              label="Password"
              secureTextEntry
              autoComplete="password"
              value={field.value}
              onChangeText={field.onChange}
              onBlur={field.onBlur}
              error={fieldState.error?.message}
            />
          )}
        />
        <Button label="Log in" onPress={onSubmit} loading={submitting} />
        <Link href="/(auth)/forgot" asChild>
          <AppText variant="caption" color="brand" style={styles.forgot}>
            Forgot password?
          </AppText>
        </Link>
      </View>

      <View style={styles.footer}>
        <AppText variant="body" color="secondary">
          New here?{' '}
          <Link href="/(auth)/register">
            <AppText variant="bodyStrong" color="brand">
              Create an account
            </AppText>
          </Link>
        </AppText>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  brand: { alignItems: 'flex-start', gap: 6, marginTop: 48, marginBottom: 32 },
  logo: {
    width: 56,
    height: 56,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  form: { gap: 16 },
  forgot: { alignSelf: 'flex-end' },
  footer: { alignItems: 'center', marginTop: 32 },
});
