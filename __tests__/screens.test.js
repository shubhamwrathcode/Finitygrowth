/**
 * Renders every screen once with the static data to catch crashes.
 * Run with: npm test
 */
import React from 'react';
import ReactTestRenderer, { act } from 'react-test-renderer';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { AuthProvider } from '../src/context/AuthContext';

jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({ navigate: jest.fn(), goBack: jest.fn() }),
}));

const nav = { navigate: jest.fn(), goBack: jest.fn() };
const metrics = { frame: { x: 0, y: 0, width: 390, height: 844 }, insets: { top: 47, left: 0, right: 0, bottom: 34 } };

const screens = {
  Welcome: require('../src/screens/auth/WelcomeScreen').default,
  Explore: require('../src/screens/auth/ExploreScreen').default,
  Reward: require('../src/screens/auth/RewardScreen').default,
  Login: require('../src/screens/auth/LoginScreen').default,
  Register: require('../src/screens/auth/RegisterScreen').default,
  Dashboard: require('../src/screens/home/DashboardScreen').default,
  Notifications: require('../src/screens/home/NotificationsScreen').default,
  BuyPackage: require('../src/screens/packages/BuyPackageScreen').default,
  MyPackages: require('../src/screens/packages/MyPackagesScreen').default,
  Earnings: require('../src/screens/packages/EarningsScreen').default,
  Wallet: require('../src/screens/wallet/WalletScreen').default,
  Deposit: require('../src/screens/wallet/DepositScreen').default,
  Transfer: require('../src/screens/wallet/TransferScreen').default,
  Withdraw: require('../src/screens/wallet/WithdrawScreen').default,
  Team: require('../src/screens/team/TeamScreen').default,
  Levels: require('../src/screens/team/LevelsScreen').default,
  Referral: require('../src/screens/team/ReferralScreen').default,
  Support: require('../src/screens/account/SupportScreen').default,
  Profile: require('../src/screens/account/ProfileScreen').default,
};

jest.useFakeTimers();

describe.each(Object.entries(screens))('%s screen', (name, Component) => {
  it('renders with static data', async () => {
    let tree;
    await act(async () => {
      tree = ReactTestRenderer.create(
        <SafeAreaProvider initialMetrics={metrics}>
          <AuthProvider>
            <Component navigation={nav} route={{ params: {} }} />
          </AuthProvider>
        </SafeAreaProvider>,
      );
    });
    await act(async () => {
      jest.advanceTimersByTime(2000);
    });
    expect(tree.toJSON()).toBeTruthy();
    // Data finished loading: no spinner left on screen.
    expect(tree.root.findAll(n => n.type === 'ActivityIndicator').length).toBe(0);
    await act(async () => tree.unmount());
  });
});
