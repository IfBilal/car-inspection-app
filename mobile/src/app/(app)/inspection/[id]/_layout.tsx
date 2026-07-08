import { useEffect } from 'react';
import { AppState } from 'react-native';
import { Stack, useLocalSearchParams } from 'expo-router';
import { useTheme } from '@/theme/ThemeProvider';
import { useInspectionFull } from '@/lib/queries';
import { useWizardStore } from '@/store/wizard';
import { getAutosaveEngine, releaseAutosaveEngine } from '@/lib/autosave';

export default function WizardLayout() {
  const { colors } = useTheme();
  const { id } = useLocalSearchParams<{ id: string }>();
  const full = useInspectionFull(id);
  const hydrate = useWizardStore((s) => s.hydrate);
  const reset = useWizardStore((s) => s.reset);
  const hydratedId = useWizardStore((s) => s.inspectionId);

  // Hydrate the wizard buffer from the server when opening/resuming a draft.
  useEffect(() => {
    if (full.data && full.data.id !== hydratedId) hydrate(full.data);
  }, [full.data, hydratedId, hydrate]);

  // Flush pending autosaves when the app is backgrounded; release on unmount.
  useEffect(() => {
    if (!id) return;
    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'background' || state === 'inactive') {
        void getAutosaveEngine(id).flush();
      }
    });
    return () => {
      sub.remove();
      releaseAutosaveEngine(id);
      reset();
    };
  }, [id, reset]);

  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: colors.canvas },
        animation: 'slide_from_right',
      }}
    />
  );
}
