import { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { router } from 'expo-router';
import { ArrowLeft, MailCheck } from 'lucide-react-native';
import { Screen } from '@/components/ui/Screen';
import { AppText } from '@/components/ui/AppText';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { EmptyState } from '@/components/ui/EmptyState';
import { ScalePressable } from '@/components/ui/Pressable';
import { useToast } from '@/components/ui/Toast';
import { useTheme } from '@/theme/ThemeProvider';
import { supabase } from '@/lib/supabase';

export default function ForgotScreen() {
  const { colors } = useTheme();
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
    <Screen>
      <ScalePressable onPress={() => router.back()} style={styles.back} hitSlop={12}>
        <ArrowLeft size={22} color={colors.textPrimary} />
      </ScalePressable>
      {sent ? (
        <EmptyState
          icon={MailCheck}
          title="Check your inbox"
          message="We've sent you a password reset link."
          actionLabel="Back to login"
          onAction={() => router.back()}
        />
      ) : (
        <>
          <AppText variant="title1" style={styles.title}>
            Reset your password
          </AppText>
          <View style={styles.form}>
            <Input
              label="Email"
              autoCapitalize="none"
              keyboardType="email-address"
              value={email}
              onChangeText={setEmail}
            />
            <Button label="Send reset link" onPress={submit} loading={submitting} />
          </View>
        </>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  back: { marginTop: 8, marginBottom: 16, width: 40, height: 40, justifyContent: 'center' },
  title: { marginBottom: 24 },
  form: { gap: 16 },
});
