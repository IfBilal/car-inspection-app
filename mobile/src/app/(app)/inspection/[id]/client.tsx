import { useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { Controller, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { UserRound } from 'lucide-react-native';
import { Screen } from '@/components/ui/Screen';
import { AppText } from '@/components/ui/AppText';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { ScalePressable } from '@/components/ui/Pressable';
import { useToast } from '@/components/ui/Toast';
import { WizardHeader } from '@/components/wizard/WizardHeader';
import { useTheme } from '@/theme/ThemeProvider';
import { useClientSearch, useInspectionFull } from '@/lib/queries';
import { useSaveClient } from '@/lib/mutations';
import { getAutosaveEngine } from '@/lib/autosave';
import { clientSchema, type ClientForm } from '@/lib/validation';
import { useDebounced } from '@/lib/useDebounced';
import type { Client } from '@/lib/types';

export default function ClientStep() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { colors } = useTheme();
  const toast = useToast();
  const full = useInspectionFull(id);
  const saveClient = useSaveClient(id!);
  const [pickedClient, setPickedClient] = useState<Client | null>(null);

  const { control, handleSubmit, reset, watch, formState } = useForm<ClientForm>({
    resolver: zodResolver(clientSchema),
    defaultValues: { full_name: '', email: '', phone: '', address: '' },
  });

  // Prefill from an existing draft (resume) — only when the form is untouched.
  useEffect(() => {
    const c = full.data?.client;
    if (c && c.email !== 'pending@draft.local' && !formState.isDirty) {
      reset({ full_name: c.full_name, email: c.email, phone: c.phone ?? '', address: c.address ?? '' });
    }
  }, [full.data?.client, formState.isDirty, reset]);

  // Existing-client type-ahead on the name field
  const nameValue = watch('full_name');
  const debouncedName = useDebounced(nameValue, 300);
  const suggestions = useClientSearch(pickedClient ? '' : debouncedName);

  const pick = (c: Client) => {
    setPickedClient(c);
    reset({ full_name: c.full_name, email: c.email, phone: c.phone ?? '', address: c.address ?? '' });
  };

  const onContinue = handleSubmit(async (form) => {
    try {
      if (pickedClient) {
        await saveClient.mutateAsync({ existingClientId: pickedClient.id });
      } else {
        await saveClient.mutateAsync({ clientId: full.data!.client_id, form });
      }
      getAutosaveEngine(id!).enqueue({ kind: 'inspection', fields: { current_step: 2 } });
      router.push(`/(app)/inspection/${id}/vehicle`);
    } catch {
      toast.show('error', 'Couldn’t save the client — try again');
    }
  });

  return (
    <Screen footer={<Button label="Continue" onPress={onContinue} loading={saveClient.isPending} />}>
      <WizardHeader inspectionId={id!} step="client" title="Client details" />

      <View style={styles.form}>
        <Controller
          control={control}
          name="full_name"
          render={({ field, fieldState }) => (
            <Input
              label="Full name"
              value={field.value}
              onChangeText={(t) => {
                if (pickedClient) setPickedClient(null);
                field.onChange(t);
              }}
              onBlur={field.onBlur}
              error={fieldState.error?.message}
            />
          )}
        />

        {suggestions.data && suggestions.data.length > 0 && !pickedClient ? (
          <Card padded={false} style={{ paddingVertical: 4 }}>
            {suggestions.data.map((c) => (
              <ScalePressable key={c.id} onPress={() => pick(c)} style={styles.suggestion}>
                <View style={[styles.suggestionIcon, { backgroundColor: colors.primarySoft }]}>
                  <UserRound size={16} color={colors.primary} />
                </View>
                <View style={{ flex: 1 }}>
                  <AppText variant="bodyStrong">{c.full_name}</AppText>
                  <AppText variant="caption" color="secondary">
                    {c.email}
                  </AppText>
                </View>
              </ScalePressable>
            ))}
          </Card>
        ) : null}

        <Controller
          control={control}
          name="email"
          render={({ field, fieldState }) => (
            <Input
              label="Email"
              autoCapitalize="none"
              keyboardType="email-address"
              value={field.value}
              onChangeText={field.onChange}
              onBlur={field.onBlur}
              error={fieldState.error?.message}
              helper="The PDF report will be sent here"
            />
          )}
        />
        <Controller
          control={control}
          name="phone"
          render={({ field }) => (
            <Input
              label="Phone (optional)"
              keyboardType="phone-pad"
              value={field.value ?? ''}
              onChangeText={field.onChange}
            />
          )}
        />
        <Controller
          control={control}
          name="address"
          render={({ field }) => (
            <Input
              label="Address (optional)"
              multiline
              numberOfLines={2}
              value={field.value ?? ''}
              onChangeText={field.onChange}
            />
          )}
        />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  form: { gap: 16, marginTop: 12 },
  suggestion: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 12, paddingVertical: 10 },
  suggestionIcon: { width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
});
