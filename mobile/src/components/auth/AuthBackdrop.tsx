import { useEffect, type ReactNode } from 'react';
import { StyleSheet, View, useWindowDimensions } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
  Easing,
} from 'react-native-reanimated';

/**
 * Cinematic auth backdrop: deep forest-green gradient with two slowly
 * drifting glow orbs. Auth screens commit to a dark hero look in both themes.
 */
export function AuthBackdrop({ children }: { children: ReactNode }) {
  const { width, height } = useWindowDimensions();
  const drift = useSharedValue(0);

  useEffect(() => {
    drift.set(
      withRepeat(
        withSequence(
          withTiming(1, { duration: 9000, easing: Easing.inOut(Easing.sin) }),
          withTiming(0, { duration: 9000, easing: Easing.inOut(Easing.sin) }),
        ),
        -1,
      ),
    );
  }, [drift]);

  const orbA = useAnimatedStyle(() => ({
    transform: [
      { translateX: drift.get() * 40 - 20 },
      { translateY: drift.get() * 30 - 15 },
      { scale: 1 + drift.get() * 0.12 },
    ],
  }));
  const orbB = useAnimatedStyle(() => ({
    transform: [
      { translateX: -drift.get() * 50 + 25 },
      { translateY: -drift.get() * 24 + 12 },
      { scale: 1.1 - drift.get() * 0.12 },
    ],
  }));

  const orbSize = width * 1.1;

  return (
    <View style={styles.root}>
      <LinearGradient
        colors={['#03150A', '#06211199', '#0A0E0B']}
        locations={[0, 0.45, 1]}
        style={StyleSheet.absoluteFill}
      />
      {/* glow orbs */}
      <Animated.View
        style={[
          styles.orb,
          orbA,
          { width: orbSize, height: orbSize, borderRadius: orbSize / 2, top: -orbSize * 0.45, right: -orbSize * 0.35 },
        ]}
      >
        <LinearGradient
          colors={['#16A34A55', '#16A34A18', 'transparent']}
          locations={[0, 0.5, 1]}
          style={styles.orbFill}
        />
      </Animated.View>
      <Animated.View
        style={[
          styles.orb,
          orbB,
          {
            width: orbSize * 0.9,
            height: orbSize * 0.9,
            borderRadius: (orbSize * 0.9) / 2,
            bottom: -orbSize * 0.4,
            left: -orbSize * 0.4,
          },
        ]}
      >
        <LinearGradient
          colors={['#22C55E33', '#22C55E10', 'transparent']}
          locations={[0, 0.55, 1]}
          style={styles.orbFill}
        />
      </Animated.View>
      {/* faint horizon line accent */}
      <View pointerEvents="none" style={[styles.hairline, { top: height * 0.32, width }]} />
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#0A0E0B' },
  orb: { position: 'absolute', overflow: 'hidden' },
  orbFill: { flex: 1, borderRadius: 9999 },
  hairline: { position: 'absolute', height: StyleSheet.hairlineWidth, backgroundColor: '#22C55E22' },
});
