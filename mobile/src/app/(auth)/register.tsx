import { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { router } from 'expo-router';
import { Controller, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { ArrowLeft } from 'lucide-react-native';
import { Screen } from '@/components/ui/Screen';
import { AppText } from '@/components/ui/AppText';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { ScalePressable } from '@/components/ui/Pressable';
import { useToast } from '@/components/ui/Toast';
import { useTheme } from '@/theme/ThemeProvider';
import { supabase } from '@/lib/supabase';
import { registerSchema, type RegisterForm } from '@/lib/validation';

export default function RegisterScreen() {
  const { colors } = useTheme();
  const toast = useToast();
  const [submitting, setSubmitting] = useState(false);
  const { control, handleSubmit } = useForm<RegisterForm>({
    resolver: zodResolver(registerSchema),
    defaultValues: { full_name: '', company_name: '', email: '', password: '', confirm: '' },
  });

  const onSubmit = handleSubmit(async ({ full_name, company_name, email, password }) => {
    setSubmitting(true);
    const { error, data } = await supabase.auth.signUp({
      email: email.trim(),
      password,
      options: { data: { full_name } },
    });
    if (!error && data.user && company_name) {
      await supabase.from('profiles').update({ company_name }).eq('id', data.user.id);
    }
    setSubmitting(false);
    if (error) toast.show('error', error.message);
    // On success the AuthGate swaps to the (app) group automatically.
  });

  return (
    <Screen>
      <ScalePressable onPress={() => router.back()} style={styles.back} hitSlop={12}>
        <ArrowLeft size={22} color={colors.textPrimary} />
      </ScalePressable>
      <AppText variant="title1" style={styles.title}>
        Create your account
      </AppText>

      <View style={styles.form}>
        <Controller
          control={control}
          name="full_name"
          render={({ field, fieldState }) => (
            <Input
              label="Full name"
              autoComplete="name"
              value={field.value}
              onChangeText={field.onChange}
              onBlur={field.onBlur}
              error={fieldState.error?.message}
            />
          )}
        />
        <Controller
          control={control}
          name="company_name"
          render={({ field, fieldState }) => (
            <Input
              label="Company name (optional)"
              value={field.value ?? ''}
              onChangeText={field.onChange}
              onBlur={field.onBlur}
              error={fieldState.error?.message}
            />
          )}
        />
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
              autoComplete="new-password"
              value={field.value}
              onChangeText={field.onChange}
              onBlur={field.onBlur}
              error={fieldState.error?.message}
              helper="At least 8 characters"
            />
          )}
        />
        <Controller
          control={control}
          name="confirm"
          render={({ field, fieldState }) => (
            <Input
              label="Confirm password"
              secureTextEntry
              value={field.value}
              onChangeText={field.onChange}
              onBlur={field.onBlur}
              error={fieldState.error?.message}
            />
          )}
        />
        <Button label="Create account" onPress={onSubmit} loading={submitting} />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  back: { marginTop: 8, marginBottom: 16, width: 40, height: 40, justifyContent: 'center' },
  title: { marginBottom: 24 },
  form: { gap: 16 },
});
