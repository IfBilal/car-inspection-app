import { useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet } from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, { FadeInDown, ZoomIn } from 'react-native-reanimated';
import { ArrowLeft, MailCheck } from 'lucide-react-native';
import { AuthBackdrop } from '@/components/auth/AuthBackdrop';
import { AppText } from '@/components/ui/AppText';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { ScalePressable } from '@/components/ui/Pressable';
import { useToast } from '@/components/ui/Toast';
import { supabase } from '@/lib/supabase';

export default function ForgotScreen() {
  const insets = useSafeAreaInsets();
  const toast = useToast();
  const [email, setEmail] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [sent, setSent] = useState(false);

  const submit = async () => {
    if (!email.includes('@')) {
      toast.show('error', 'Enter a valid email');
      return;
    }
    setSubmitting(true);
    const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
      redirectTo: 'carinspect://reset',
    });
    setSubmitting(false);
    if (error) toast.show('error', error.message);
    else setSent(true);
  };

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
          <Animated.View entering={FadeInDown.springify().damping(16)}>
            <ScalePressable onPress={() => router.back()} style={styles.back} hitSlop={12}>
              <ArrowLeft size={22} color="#FFFFFF" />
            </ScalePressable>
          </Animated.View>

          {sent ? (
            <Animated.View entering={ZoomIn.springify().damping(14)} style={styles.sentWrap}>
              <Animated.View style={styles.sentIcon}>
                <MailCheck size={30} color="#4ADE80" strokeWidth={1.75} />
              </Animated.View>
              <AppText variant="title1" style={styles.title}>
                Check your inbox
              </AppText>
              <AppText variant="body" style={styles.subtitle}>
                We&apos;ve sent you a password reset link.
              </AppText>
              <Button label="Back to login" variant="secondary" onPress={() => router.back()} />
            </Animated.View>
          ) : (
            <>
              <Animated.View entering={FadeInDown.springify().damping(16).delay(80)}>
                <AppText variant="micro" style={styles.eyebrow}>
                  CarInspect Pro
                </AppText>
                <AppText variant="display" style={styles.title}>
                  Reset your{'\n'}password
                </AppText>
              </Animated.View>
              <Animated.View entering={FadeInDown.springify().damping(16).delay(200)} style={styles.card}>
                <Input
                  tone="glass"
                  label="Email"
                  autoCapitalize="none"
                  keyboardType="email-address"
                  value={email}
                  onChangeText={setEmail}
                />
                <Button label="Send reset link" onPress={submit} loading={submitting} />
              </Animated.View>
            </>
          )}
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
  eyebrow: { color: '#4ADE80', marginBottom: 6, letterSpacing: 2 },
  title: { color: '#FFFFFF', letterSpacing: -0.8 },
  subtitle: { color: 'rgba(255,255,255,0.60)', textAlign: 'center' },
  card: {
    marginTop: 28,
    gap: 16,
    padding: 20,
    borderRadius: 24,
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.10)',
  },
  sentWrap: { alignItems: 'center', gap: 12, marginTop: 80 },
  sentIcon: {
    width: 72,
    height: 72,
    borderRadius: 36,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(34,197,94,0.12)',
    borderWidth: 1,
    borderColor: 'rgba(34,197,94,0.30)',
    marginBottom: 8,
  },
});
