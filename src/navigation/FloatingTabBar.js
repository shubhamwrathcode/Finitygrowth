import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Icon from '../components/Icon';
import { colors, fonts } from '../theme';
import { ROUTES } from './routes';

/**
 * FloatingTabBar – custom bottom bar (pill shape, gold "+" in the middle).
 * React Navigation passes { state, descriptors, navigation } to `tabBar`.
 * The centre tab does not show a screen; it opens the Buy package flow.
 */
const ICONS = {
  [ROUTES.HOME]: 'home',
  [ROUTES.WALLET]: 'wallet',
  [ROUTES.TEAM]: 'team',
  [ROUTES.PROFILE]: 'user',
};

export default function FloatingTabBar({ state, descriptors, navigation }) {
  const insets = useSafeAreaInsets();

  return (
    <View style={[styles.wrap, { bottom: Math.max(insets.bottom, 12) + 6 }]}>
      {state.routes.map((route, index) => {
        const focused = state.index === index;
        const { options } = descriptors[route.key];
        const label = options.tabBarLabel ?? route.name;

        if (route.name === ROUTES.BUY_TAB) {
          return (
            <Pressable
              key={route.key}
              accessibilityRole="button"
              accessibilityLabel="Buy package"
              onPress={() => navigation.navigate(ROUTES.BUY_PACKAGE)}
              style={styles.center}>
              <Icon name="plus" size={24} color={colors.goldInk} strokeWidth={2.2} />
            </Pressable>
          );
        }

        const onPress = () => {
          const event = navigation.emit({ type: 'tabPress', target: route.key, canPreventDefault: true });
          if (!focused && !event.defaultPrevented) {
            navigation.navigate(route.name);
          }
        };

        const color = focused ? colors.gold : colors.subtle;
        return (
          <Pressable
            key={route.key}
            accessibilityRole="tab"
            accessibilityState={{ selected: focused }}
            onPress={onPress}
            style={styles.item}>
            <Icon name={ICONS[route.name]} size={22} color={color} />
            <Text style={[styles.label, { color }]}>{label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    position: 'absolute',
    left: 16,
    right: 16,
    height: 66,
    borderRadius: 33,
    backgroundColor: colors.elevated,
    borderWidth: 1,
    borderColor: '#22262F',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    paddingHorizontal: 8,
    shadowColor: '#000',
    shadowOpacity: 0.4,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 8 },
    elevation: 12,
  },
  item: { width: 58, height: 52, alignItems: 'center', justifyContent: 'center', gap: 3 },
  label: { fontFamily: fonts.semibold, fontSize: 10 },
  center: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: colors.gold,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
