import { useEffect, useRef } from 'react';
import { useNavigation, usePreventRemove } from '@react-navigation/native';

/**
 * When `active` is true, Android back / iOS back-gesture runs `onBack`
 * instead of popping the screen. Same idea as Login/Register OTP steps.
 *
 * RESET / NAVIGATE / etc. still go through (logout, deep links).
 */
export default function useInScreenBack(active, onBack) {
  const navigation = useNavigation();
  const onBackRef = useRef(onBack);
  onBackRef.current = onBack;

  useEffect(() => {
    navigation.setOptions({ gestureEnabled: !active });
  }, [navigation, active]);

  usePreventRemove(Boolean(active), ({ data }) => {
    if (data.action.type === 'GO_BACK' || data.action.type === 'POP') {
      onBackRef.current?.();
      return;
    }
    navigation.dispatch(data.action);
  });
}
