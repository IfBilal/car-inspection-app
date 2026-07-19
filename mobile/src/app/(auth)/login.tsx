import { useState } from 'react';
import { Image, KeyboardAvoidingView, Platform, ScrollView, StyleSheet } from 'react-native';
import { Link } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, { FadeIn, FadeInDown } from 'react-native-reanimated';
import { Controller, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { AuthBackdrop } from '@/components/auth/AuthBackdrop';
import { AppText } from '@/components/ui/AppText';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { useToast } from '@/components/ui/Toast';
import { supabase } from '@/lib/supabase';
import { loginSchema, type LoginForm } from '@/lib/validation';

export default function LoginScreen() {
  const insets = useSafeAreaInsets();
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
    <AuthBackdrop>
      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView
          contentContainerStyle={[
            styles.scroll,
            { paddingTop: insets.top + 48, paddingBottom: Math.max(insets.bottom, 24) },
          ]}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* Brand */}
          <Animated.View entering={FadeIn.duration(350)} style={styles.logoWrap}>
            <Image source={require('../../../assets/images/logo.png')} style={styles.logo} resizeMode="contain" />
          </Animated.View>
          <Animated.View entering={FadeInDown.duration(350).delay(80)}>
            <AppText variant="micro" style={styles.eyebrow}>
              CarInspect Pro
            </AppText>
            <AppText variant="display" style={styles.title}>
              Welcome back
            </AppText>
            <AppText variant="body" style={styles.subtitle}>
              Vehicle inspections, done properly.
            </AppText>
          </Animated.View>

          {/* Glass form card */}
          <Animated.View entering={FadeInDown.duration(350).delay(160)} style={styles.card}>
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
                  showPasswordToggle
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
              <AppText variant="caption" style={styles.forgot}>
                Forgot password?
              </AppText>
            </Link>
          </Animated.View>

          <Animated.View entering={FadeIn.duration(350).delay(260)} style={styles.footer}>
            <AppText variant="body" style={styles.footerText}>
              New here?{' '}
              <Link href="/(auth)/register">
                <AppText variant="bodyStrong" style={styles.footerLink}>
                  Create an account
                </AppText>
              </Link>
            </AppText>
          </Animated.View>
        </ScrollView>
      </KeyboardAvoidingView>
    </AuthBackdrop>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  scroll: { flexGrow: 1, paddingHorizontal: 24 },
  logoWrap: { alignSelf: 'flex-start', marginBottom: 16 },
  logo: { width: 96, height: 96 },
  eyebrow: { color: '#F87171', marginBottom: 6, letterSpacing: 2 },
  title: { color: '#FFFFFF', fontSize: 36, lineHeight: 42, letterSpacing: -0.8 },
  subtitle: { color: 'rgba(255,255,255,0.60)', marginTop: 6 },
  card: {
    marginTop: 32,
    gap: 16,
    padding: 20,
    borderRadius: 24,
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.10)',
  },
  forgot: { alignSelf: 'flex-end', color: '#F87171' },
  footer: { alignItems: 'center', marginTop: 28 },
  footerText: { color: 'rgba(255,255,255,0.55)' },
  footerLink: { color: '#F87171' },
});
