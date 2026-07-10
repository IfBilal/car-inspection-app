import { useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet } from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { Controller, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { ArrowLeft } from 'lucide-react-native';
import { AuthBackdrop } from '@/components/auth/AuthBackdrop';
import { AppText } from '@/components/ui/AppText';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { ScalePressable } from '@/components/ui/Pressable';
import { useToast } from '@/components/ui/Toast';
import { supabase } from '@/lib/supabase';
import { registerSchema, type RegisterForm } from '@/lib/validation';

export default function RegisterScreen() {
  const insets = useSafeAreaInsets();
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
    <AuthBackdrop>
      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView
          contentContainerStyle={[
            styles.scroll,
            { paddingTop: insets.top + 16, paddingBottom: Math.max(insets.bottom, 24) },
          ]}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <Animated.View entering={FadeInDown.duration(350)}>
            <ScalePressable onPress={() => router.back()} style={styles.back} hitSlop={12}>
              <ArrowLeft size={22} color="#FFFFFF" />
            </ScalePressable>
            <AppText variant="micro" style={styles.eyebrow}>
              CarInspect Pro
            </AppText>
            <AppText variant="display" style={styles.title}>
              Create your{'\n'}account
            </AppText>
          </Animated.View>

          <Animated.View entering={FadeInDown.duration(350).delay(80)} style={styles.card}>
            <Controller
              control={control}
              name="full_name"
              render={({ field, fieldState }) => (
                <Input
                  tone="glass"
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
                  tone="glass"
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
                  tone="glass"
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
                  tone="glass"
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
                  tone="glass"
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
          </Animated.View>
        </ScrollView>
      </KeyboardAvoidingView>
    </AuthBackdrop>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  scroll: { flexGrow: 1, paddingHorizontal: 24 },
  back: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
    marginBottom: 24,
  },
  eyebrow: { color: '#F87171', marginBottom: 6, letterSpacing: 2 },
  title: { color: '#FFFFFF', fontSize: 34, lineHeight: 40, letterSpacing: -0.8 },
  card: {
    marginTop: 28,
    gap: 16,
    padding: 20,
    borderRadius: 24,
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.10)',
  },
});
