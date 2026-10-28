/**
 * Route names in one place. Use these instead of typing strings:
 *   navigation.navigate(ROUTES.DEPOSIT)
 */
export const ROUTES = {
  // Signed-out stack
  WELCOME: 'Welcome',
  EXPLORE: 'Explore',
  REWARD: 'Reward',
  LOGIN: 'Login',
  REGISTER: 'Register',
  FORGOT_PASSWORD: 'ForgotPassword',
  RESET_PASSWORD: 'ResetPassword',

  // Bottom tabs (signed in)
  TABS: 'MainTabs',
  HOME: 'Home',
  WALLET: 'Wallet',
  BUY_TAB: 'BuyTab', // centre "+" button – opens BUY_PACKAGE
  TEAM: 'Team',
  PROFILE: 'Profile',

  // Inner screens pushed on top of the tabs
  BUY_PACKAGE: 'BuyPackage',
  MY_PACKAGES: 'MyPackages',
  EARNINGS: 'Earnings',
  NOTIFICATIONS: 'Notifications',
  DEPOSIT: 'Deposit',
  TRANSFER: 'Transfer',
  WITHDRAW: 'Withdraw',
  LEVELS: 'Levels',
  REFERRAL: 'Referral',
  SUPPORT: 'Support',
  CHANGE_PASSWORD: 'ChangePassword',
  KYC: 'Kyc',
};
