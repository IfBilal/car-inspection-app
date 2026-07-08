import { useEffect } from 'react';
import { Alert, StyleSheet, View } from 'react-native';
import { router } from 'expo-router';
import { Controller, useForm } from 'react-hook-form';
import { ArrowLeft, LogOut } from 'lucide-react-native';
import Constants from 'expo-constants';
import { Screen } from '@/components/ui/Screen';
import { AppText } from '@/components/ui/AppText';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { ScalePressable } from '@/components/ui/Pressable';
import { useToast } from '@/components/ui/Toast';
import { useTheme } from '@/theme/ThemeProvider';
import { useProfile } from '@/lib/queries';
import { useUpdateProfile } from '@/lib/mutations';
import { supabase } from '@/lib/supabase';

type ProfileForm = { full_name: string; company_name: string; phone: string };

export default function ProfileScreen() {
  const { colors } = useTheme();
  const toast = useToast();
  const profile = useProfile();
  const update = useUpdateProfile();

  const { control, handleSubmit, reset, formState } = useForm<ProfileForm>({
    defaultValues: { full_name: '', company_name: '', phone: '' },
  });

  useEffect(() => {
    if (profile.data && !formState.isDirty) {
      reset({
        full_name: profile.data.full_name ?? '',
        company_name: profile.data.company_name ?? '',
        phone: profile.data.phone ?? '',
      });
    }
  }, [profile.data, formState.isDirty, reset]);

  const onSave = handleSubmit((form) => {
    update.mutate(
      { full_name: form.full_name, company_name: form.company_name, phone: form.phone || null },
      {
        onSuccess: () => toast.show('success', 'Profile saved'),
        onError: () => toast.show('error', 'Couldn’t save your profile'),
      },
    );
  });

  const logout = () => {
    Alert.alert('Log out?', undefined, [
      { text: 'Log out', style: 'destructive', onPress: () => void supabase.auth.signOut() },
      { text: 'Cancel', style: 'cancel' },
    ]);
  };

  return (
    <Screen>
      <View style={styles.header}>
        <ScalePressable onPress={() => router.back()} hitSlop={12} style={styles.back}>
          <ArrowLeft size={22} color={colors.textPrimary} />
        </ScalePressable>
        <AppText variant="title1">Profile</AppText>
      </View>

      <View style={styles.form}>
        <Controller
          control={control}
          name="full_name"
          rules={{ required: true }}
          render={({ field }) => (
            <Input label="Full name" value={field.value} onChangeText={field.onChange} helper="Printed on reports" />
          )}
        />
        <Controller
          control={control}
          name="company_name"
          render={({ field }) => (
            <Input label="Company name" value={field.value} onChangeText={field.onChange} />
          )}
        />
        <Controller
          control={control}
          name="phone"
          render={({ field }) => (
            <Input label="Phone" keyboardType="phone-pad" value={field.value} onChangeText={field.onChange} />
          )}
        />
        <Button label="Save" onPress={onSave} loading={update.isPending} />
        <Button variant="secondary" icon={LogOut} label="Log out" onPress={logout} />
      </View>

      <AppText variant="caption" color="tertiary" style={styles.version}>
        CarInspect Pro v{Constants.expoConfig?.version ?? '1.0.0'}
      </AppText>
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', gap: 12, marginTop: 8, marginBottom: 20 },
  back: { width: 40, height: 40, justifyContent: 'center' },
  form: { gap: 16 },
  version: { textAlign: 'center', marginTop: 32 },
});
