import { useRef } from 'react';
import { Modal, StyleSheet, View } from 'react-native';
import SignatureScreen, { type SignatureViewRef } from 'react-native-signature-canvas';
import { useTheme } from '@/theme/ThemeProvider';
import { AppText } from '@/components/ui/AppText';
import { Button } from '@/components/ui/Button';

type Props = {
  visible: boolean;
  onDone: (pngBase64: string) => void;
  onCancel: () => void;
};

export function SignaturePad({ visible, onDone, onCancel }: Props) {
  const { colors } = useTheme();
  const ref = useRef<SignatureViewRef>(null);
  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onCancel}>
      <View style={[styles.container, { backgroundColor: colors.canvas }]}>
        <View style={styles.header}>
          <AppText variant="title2">Buyer signature</AppText>
          <AppText variant="caption" color="secondary">
            Ask the buyer to draw their signature with a finger
          </AppText>
        </View>
        <View style={[styles.padWrap, { borderColor: colors.border }]}>
          <SignatureScreen
            ref={ref}
            onOK={(sig: string) => {
              // sig is a data URL: data:image/png;base64,...
              const base64 = sig.split(',')[1] ?? '';
              if (base64) onDone(base64);
            }}
            onEmpty={() => {}}
            descriptionText=""
            webStyle={`.m-signature-pad { box-shadow: none; border: none; height: 100%; margin: 0; }
                       .m-signature-pad--body { border: none; }
                       .m-signature-pad--footer { display: none; }
                       body, html { background: #FFFFFF; height: 100%; }`}
            backgroundColor="#FFFFFF"
            penColor="#171D19"
            autoClear={false}
          />
        </View>
        <View style={styles.actions}>
          <Button variant="ghost" label="Cancel" onPress={onCancel} fullWidth={false} size="md" />
          <Button
            variant="secondary"
            label="Clear"
            onPress={() => ref.current?.clearSignature()}
            fullWidth={false}
            size="md"
          />
          <Button label="Done" onPress={() => ref.current?.readSignature()} fullWidth={false} size="md" />
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 20, gap: 16 },
  header: { marginTop: 24, gap: 4 },
  padWrap: { flex: 1, borderWidth: 1.5, borderRadius: 20, overflow: 'hidden' },
  actions: { flexDirection: 'row', justifyContent: 'space-between', gap: 8, paddingBottom: 24 },
});
