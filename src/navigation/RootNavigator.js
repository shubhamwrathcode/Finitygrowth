import React, { useEffect, useRef } from 'react';
import { Linking, View } from 'react-native';
import { NavigationContainer, DarkTheme } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';

import { useAuth } from '../context/AuthContext';
import { colors } from '../theme';
import { ROUTES } from './routes';
import { linking, getResetNavFromUrl } from './linking';
import FloatingTabBar from './FloatingTabBar';

// Signed-out screens
import WelcomeScreen from '../screens/auth/WelcomeScreen';
import ExploreScreen from '../screens/auth/ExploreScreen';
import RewardScreen from '../screens/auth/RewardScreen';
import LoginScreen from '../screens/auth/LoginScreen';
import RegisterScreen from '../screens/auth/RegisterScreen';
import ForgotPasswordScreen from '../screens/auth/ForgotPasswordScreen';
import ResetPasswordScreen from '../screens/auth/ResetPasswordScreen';

// Tab screens
import DashboardScreen from '../screens/home/DashboardScreen';
import WalletScreen from '../screens/wallet/WalletScreen';
import TeamScreen from '../screens/team/TeamScreen';
import ProfileScreen from '../screens/account/ProfileScreen';

// Inner screens
import BuyPackageScreen from '../screens/packages/BuyPackageScreen';
import MyPackagesScreen from '../screens/packages/MyPackagesScreen';
import EarningsScreen from '../screens/packages/EarningsScreen';
import NotificationsScreen from '../screens/home/NotificationsScreen';
import DepositScreen from '../screens/wallet/DepositScreen';
import TransferScreen from '../screens/wallet/TransferScreen';
import WithdrawScreen from '../screens/wallet/WithdrawScreen';
import AddressesScreen from '../screens/wallet/AddressesScreen';
import LevelsScreen from '../screens/team/LevelsScreen';
import ReferralScreen from '../screens/team/ReferralScreen';
import SupportScreen from '../screens/account/SupportScreen';
import ChangePasswordScreen from '../screens/account/ChangePasswordScreen';
import KycScreen from '../screens/account/KycScreen';

/**
 * NAVIGATION MAP
 *
 *  RootStack
 *   ├─ (signed out) Welcome → Explore, Reward, Login, Register,
 *   │               ForgotPassword, ResetPassword
 *   └─ (signed in)  MainTabs  [Home | Wallet | + | Team | Profile]
 *                   + inner screens pushed on top of the tabs
 *
 * Deep links (email reset button / custom scheme):
 *   finitygrowth://reset-password?token=CODE
 *   https://…/#/reset-password?token=CODE
 */
const Stack = createNativeStackNavigator();
const Tab = createBottomTabNavigator();

const navTheme = {
  ...DarkTheme,
  colors: { ...DarkTheme.colors, background: colors.bg, card: colors.bg, primary: colors.gold, text: colors.text },
};

const stackOptions = {
  headerShown: false,
  contentStyle: { backgroundColor: colors.bg },
  animation: 'slide_from_right',
};

const EmptyScreen = () => <View />;
const renderTabBar = props => <FloatingTabBar {...props} />;

function MainTabs() {
  return (
    <Tab.Navigator
      screenOptions={{ headerShown: false, sceneStyle: { backgroundColor: colors.bg } }}
      tabBar={renderTabBar}>
      <Tab.Screen name={ROUTES.HOME} component={DashboardScreen} options={{ tabBarLabel: 'Home' }} />
      <Tab.Screen name={ROUTES.WALLET} component={WalletScreen} options={{ tabBarLabel: 'Wallet' }} />
      <Tab.Screen name={ROUTES.BUY_TAB} component={EmptyScreen} />
      <Tab.Screen name={ROUTES.TEAM} component={TeamScreen} options={{ tabBarLabel: 'Team' }} />
      <Tab.Screen name={ROUTES.PROFILE} component={ProfileScreen} options={{ tabBarLabel: 'Profile' }} />
    </Tab.Navigator>
  );
}

function openAuthDeepLink(navigationRef, url, isSignedIn) {
  if (!url || isSignedIn || !navigationRef.isReady()) return;
  const target = getResetNavFromUrl(url);
  if (!target) return;
  navigationRef.navigate(target.screen, target.params);
}

export default function RootNavigator() {
  const { isSignedIn } = useAuth();
  const navigationRef = useRef(null);

  useEffect(() => {
    const handle = ({ url }) => openAuthDeepLink(navigationRef.current, url, isSignedIn);
    const sub = Linking.addEventListener('url', handle);
    Linking.getInitialURL().then(url => openAuthDeepLink(navigationRef.current, url, isSignedIn));
    return () => sub.remove();
  }, [isSignedIn]);

  return (
    <NavigationContainer
      ref={navigationRef}
      theme={navTheme}
      linking={linking}
      onReady={() => {
        Linking.getInitialURL().then(url => openAuthDeepLink(navigationRef.current, url, isSignedIn));
      }}>
      <Stack.Navigator screenOptions={stackOptions}>
        {isSignedIn ? (
          <>
            <Stack.Screen name={ROUTES.TABS} component={MainTabs} />
            <Stack.Screen name={ROUTES.BUY_PACKAGE} component={BuyPackageScreen} />
            <Stack.Screen name={ROUTES.MY_PACKAGES} component={MyPackagesScreen} />
            <Stack.Screen name={ROUTES.EARNINGS} component={EarningsScreen} />
            <Stack.Screen name={ROUTES.NOTIFICATIONS} component={NotificationsScreen} />
            <Stack.Screen name={ROUTES.DEPOSIT} component={DepositScreen} />
            <Stack.Screen name={ROUTES.TRANSFER} component={TransferScreen} />
            <Stack.Screen name={ROUTES.WITHDRAW} component={WithdrawScreen} />
            <Stack.Screen name={ROUTES.ADDRESSES} component={AddressesScreen} />
            <Stack.Screen name={ROUTES.LEVELS} component={LevelsScreen} />
            <Stack.Screen name={ROUTES.REFERRAL} component={ReferralScreen} />
            <Stack.Screen name={ROUTES.SUPPORT} component={SupportScreen} />
            <Stack.Screen name={ROUTES.CHANGE_PASSWORD} component={ChangePasswordScreen} />
            <Stack.Screen name={ROUTES.KYC} component={KycScreen} />
            <Stack.Screen name={ROUTES.EXPLORE} component={ExploreScreen} />
            <Stack.Screen name={ROUTES.REWARD} component={RewardScreen} options={{ presentation: 'modal' }} />
          </>
        ) : (
          <>
            <Stack.Screen name={ROUTES.WELCOME} component={WelcomeScreen} />
            <Stack.Screen name={ROUTES.EXPLORE} component={ExploreScreen} />
            <Stack.Screen name={ROUTES.REWARD} component={RewardScreen} options={{ presentation: 'modal' }} />
            <Stack.Screen name={ROUTES.LOGIN} component={LoginScreen} />
            <Stack.Screen name={ROUTES.REGISTER} component={RegisterScreen} />
            <Stack.Screen name={ROUTES.FORGOT_PASSWORD} component={ForgotPasswordScreen} />
            <Stack.Screen name={ROUTES.RESET_PASSWORD} component={ResetPasswordScreen} />
          </>
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
}
