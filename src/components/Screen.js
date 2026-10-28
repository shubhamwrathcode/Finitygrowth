import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  RefreshControl,
  ScrollView,
  StatusBar,
  StyleSheet,
  View,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { KeyboardScrollContext } from './KeyboardScroll';
import { colors, spacing } from '../theme';

/**
 * Screen – the wrapper every screen uses.
 *  - dark background + safe-area padding (notch / home indicator)
 *  - scrolls by default; pass scroll={false} for fixed layouts
 *  - keyboard → fields scroll above the keyboard; footer stays under it
 *  - onRefresh → enables pull-to-refresh
 *  - withTabBar → extra bottom space so content is not hidden by the floating tab bar
 *  - footer → content pinned to the bottom (e.g. a primary button)
 */
export default function Screen({
  children,
  scroll = true,
  onRefresh,
  refreshing = false,
  withTabBar = false,
  footer,
  padded = true,
  contentStyle,
  keyboard = false,
}) {
  const insets = useSafeAreaInsets();
  const scrollRef = useRef(null);
  const scrollY = useRef(0);
  const focusedRef = useRef(null);
  const [keyboardOpen, setKeyboardOpen] = useState(false);
  const [keyboardHeight, setKeyboardHeight] = useState(0);

  const scrollFocusedIntoView = useCallback(() => {
    const field = focusedRef.current;
    const scroller = scrollRef.current;
    if (!field || !scroller) return;

    field.measureInWindow((_fx, fy, _fw, fh) => {
      scroller.measureInWindow((_sx, sy, _sw, sh) => {
        const fieldBottom = fy + fh;
        const visibleBottom = sy + sh - 20;
        if (fieldBottom <= visibleBottom) return;
        scroller.scrollTo({
          y: Math.max(0, scrollY.current + (fieldBottom - visibleBottom) + 28),
          animated: true,
        });
      });
    });
  }, []);

  useEffect(() => {
    if (!keyboard) return undefined;
    const showEvent = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
    const hideEvent = Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';
    const show = Keyboard.addListener(showEvent, e => {
      setKeyboardOpen(true);
      setKeyboardHeight(e.endCoordinates?.height || 0);
      // Wait for layout to shrink, then bring the focused field into view.
      setTimeout(scrollFocusedIntoView, Platform.OS === 'ios' ? 60 : 100);
    });
    const hide = Keyboard.addListener(hideEvent, () => {
      setKeyboardOpen(false);
      setKeyboardHeight(0);
    });
    return () => {
      show.remove();
      hide.remove();
    };
  }, [keyboard, scrollFocusedIntoView]);

  const ensureVisible = useCallback(
    node => {
      focusedRef.current = node;
      if (keyboardOpen) {
        setTimeout(scrollFocusedIntoView, 50);
      }
    },
    [keyboardOpen, scrollFocusedIntoView],
  );

  const edges = keyboard
    ? ['top', 'left', 'right']
    : ['top', 'left', 'right', footer || !withTabBar ? 'bottom' : null].filter(Boolean);

  const bottomPad =
    keyboard && keyboardOpen
      ? Math.max(keyboardHeight * (Platform.OS === 'ios' ? 0.15 : 0.35), spacing.xxl)
      : 0;

  const inner = [
    padded && styles.padded,
    withTabBar && styles.tabSpace,
    contentStyle,
    bottomPad > 0 && { paddingBottom: (padded ? spacing.xxl : 0) + bottomPad },
  ];

  const body = scroll ? (
    <ScrollView
      ref={scrollRef}
      style={styles.flex}
      contentContainerStyle={inner}
      showsVerticalScrollIndicator={false}
      keyboardShouldPersistTaps="handled"
      keyboardDismissMode="on-drag"
      automaticallyAdjustKeyboardInsets={keyboard}
      nestedScrollEnabled
      onScroll={e => {
        scrollY.current = e.nativeEvent.contentOffset.y;
      }}
      scrollEventThrottle={16}
      refreshControl={
        onRefresh ? (
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={colors.gold}
            colors={[colors.gold]}
          />
        ) : undefined
      }>
      {children}
    </ScrollView>
  ) : (
    <View style={[styles.flex, ...inner]}>{children}</View>
  );

  // Footer stays under the keyboard — only the scroll area avoids it.
  const showFooter = Boolean(footer) && !(keyboard && keyboardOpen);

  const main = keyboard ? (
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 8 : 0}>
      {body}
    </KeyboardAvoidingView>
  ) : (
    body
  );

  return (
    <KeyboardScrollContext.Provider value={keyboard ? ensureVisible : null}>
      <SafeAreaView style={styles.safe} edges={edges}>
        <StatusBar barStyle="light-content" backgroundColor={colors.bg} />
        {main}
        {showFooter ? (
          <View
            style={[
              styles.footer,
              keyboard && { paddingBottom: Math.max(insets.bottom, spacing.md) },
            ]}>
            {footer}
          </View>
        ) : null}
      </SafeAreaView>
    </KeyboardScrollContext.Provider>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  flex: { flex: 1 },
  padded: { paddingHorizontal: spacing.screen, paddingBottom: spacing.xxl },
  tabSpace: { paddingBottom: 120 },
  footer: {
    paddingHorizontal: spacing.screen,
    paddingTop: spacing.md,
    paddingBottom: spacing.md,
    backgroundColor: colors.bg,
  },
});
