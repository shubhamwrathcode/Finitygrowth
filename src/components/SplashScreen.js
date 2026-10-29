import React, { useCallback, useEffect, useRef } from 'react';
import { StyleSheet, View } from 'react-native';
import LottieView from 'lottie-react-native';
import { colors } from '../theme';

const splashSource = require('../../assets/video/Finitygrowth-Splash.json');

/** Animation is ~4.6s @ 60fps — failsafe if native finish event is missed. */
const FAILSAFE_MS = 6000;

/**
 * Full-screen Lottie splash (Finitygrowth-Splash.json).
 * Plays once; calls onFinish when the animation completes (or fails to load).
 */
export default function SplashScreen({ onFinish }) {
  const finished = useRef(false);

  const done = useCallback(() => {
    if (finished.current) return;
    finished.current = true;
    onFinish?.();
  }, [onFinish]);

  useEffect(() => {
    const t = setTimeout(done, FAILSAFE_MS);
    return () => clearTimeout(t);
  }, [done]);

  return (
    <View style={styles.root} pointerEvents="none">
      <LottieView
        source={splashSource}
        autoPlay
        loop={false}
        resizeMode="cover"
        style={styles.lottie}
        onAnimationFinish={done}
        onAnimationFailure={done}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: colors.bg,
    zIndex: 100,
    elevation: 100,
  },
  lottie: {
    width: '100%',
    height: '100%',
  },
});
