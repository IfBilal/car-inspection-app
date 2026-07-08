import { createContext, useCallback, useContext, useRef, useState, type ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, { FadeInUp, FadeOutUp } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { CheckCircle2, AlertCircle, Info } from 'lucide-react-native';
import { useTheme } from '@/theme/ThemeProvider';
import { AppText } from './AppText';

type ToastKind = 'success' | 'error' | 'info';
type ToastMsg = { id: number; kind: ToastKind; message: string; actionLabel?: string; onAction?: () => void };

const ToastContext = createContext<{
  show: (kind: ToastKind, message: string, opts?: { actionLabel?: string; onAction?: () => void }) => void;
} | null>(null);

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be used inside ToastProvider');
  return ctx;
}

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toast, setToast] = useState<ToastMsg | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const counter = useRef(0);

  const show = useCallback(
    (kind: ToastKind, message: string, opts?: { actionLabel?: string; onAction?: () => void }) => {
      if (timer.current) clearTimeout(timer.current);
      setToast({ id: ++counter.current, kind, message, ...opts });
      timer.current = setTimeout(() => setToast(null), opts?.actionLabel ? 5000 : 3000);
    },
    [],
  );

  return (
    <ToastContext.Provider value={{ show }}>
      {children}
      {toast ? <ToastView toast={toast} onAction={() => setToast(null)} /> : null}
    </ToastContext.Provider>
  );
}

function ToastView({ toast, onAction }: { toast: ToastMsg; onAction: () => void }) {
  const { colors, radii, shadows } = useTheme();
  const insets = useSafeAreaInsets();
  const iconColor = { success: colors.pass, error: colors.fail, info: colors.info }[toast.kind];
  const Icon = { success: CheckCircle2, error: AlertCircle, info: Info }[toast.kind];
  return (
    <Animated.View
      entering={FadeInUp.duration(250)}
      exiting={FadeOutUp}
      pointerEvents="box-none"
      style={[styles.host, { top: insets.top + 8 }]}
    >
      <View
        style={[
          styles.pill,
          { backgroundColor: colors.surfaceRaised, borderRadius: radii.full, borderColor: colors.border },
          shadows.sheet,
        ]}
      >
        <Icon size={18} color={iconColor} strokeWidth={2} />
        <AppText variant="caption" style={{ flexShrink: 1 }}>
          {toast.message}
        </AppText>
        {toast.actionLabel ? (
          <AppText
            variant="caption"
            color="brand"
            onPress={() => {
              toast.onAction?.();
              onAction();
            }}
          >
            {toast.actionLabel}
          </AppText>
        ) : null}
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  host: { position: 'absolute', left: 0, right: 0, alignItems: 'center', zIndex: 1000 },
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 10,
    maxWidth: '90%',
    borderWidth: 1,
  },
});
