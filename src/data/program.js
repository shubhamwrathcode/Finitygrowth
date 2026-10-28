/**
 * PROGRAM RULES (static)
 *
 * Everything the admin "publishes" on finitygrowth.com: the package plan,
 * referral/level rules, withdrawal rules, the travel reward, FAQs and support.
 * Screens never hard-code these numbers — they read them from here (via the
 * mock API), so one change here updates the whole app.
 */

export const plans = [
  {
    id: 'PKG1792826358214',
    name: 'TIER-1',
    minAmount: 100,
    maxAmount: 10000,
    durationDays: 320,
    dailyRate: 0.0063, // 0.63% of the amount, credited every night
    totalReturn: 2, // shown as "2×": 0.63% × 320 nights ≈ 201.6% (principal included)
    payoutTime: '12:00 AM IST',
    active: true,
  },
];

export const referralRules = {
  directRate: 0.05, // 5% of a direct referral's FIRST package, paid once
  // Level income = rate × that member's nightly ROI.
  // A level unlocks when you have `directsRequired` package-buying directs.
  levels: [
    { level: 1, rate: 0.02, directsRequired: 1 },
    { level: 2, rate: 0.01, directsRequired: 2 },
    { level: 3, rate: 0.01, directsRequired: 3 },
    { level: 4, rate: 0.005, directsRequired: 4 },
    { level: 5, rate: 0.005, directsRequired: 5 },
  ],
};

export const walletRules = {
  currency: 'USDT',
  network: 'BEP20',
  chain: 'BSC',
  withdrawal: {
    feeRate: 0.05,
    min: 20,
    max: 10000,
  },
  transferFee: 0,
  minDepositCredit: 0.1, // sends below this are not credited
  depositAutoCheckMinutes: 15,
};

export const travelReward = {
  title: 'An international trip',
  tier: 'Elite',
  threshold: 400000, // total package investment in USDT
  benefit: 'Trip, not cash',
  claimFrom: 'Rewards page',
  steps: [
    { title: 'Invest', text: 'Reach a total package investment of 400,000 USDT or more.' },
    { title: 'Qualify', text: 'Eligibility is checked against the published reward rules and confirmed by the team.' },
    { title: 'Travel', text: 'Claim your trip from the Rewards page. Dates and traveller details are arranged with you.' },
  ],
  terms:
    'Terms apply. The trip is a benefit, not wallet cash, and cannot be exchanged for money. Destination, dates and inclusions follow the published reward rules.',
};

export const howItWorks = [
  { title: 'Register', text: 'Create an account and complete the checks the admin has turned on.' },
  { title: 'Fund account', text: 'Add funds with an enabled method. A screenshot alone does not credit the wallet.' },
  { title: 'Activate package', text: 'Buy a published package with available balance. The quote is confirmed again on submit.' },
  { title: 'Track income', text: 'Follow daily, direct and level entries. Only posted income can be used.' },
  { title: 'Request withdrawal', text: 'Submit in the published window. The quote shows gross, fees and net before you confirm.' },
];

export const incomeTypes = [
  { key: 'daily', icon: 'calendar', title: 'Daily payouts', text: 'Each active package posts its own schedule. Pending, held, skipped and reversed entries stay labeled.' },
  { key: 'direct', icon: 'userPlus', title: 'Direct referral · 5%', text: 'Of a referral’s first package purchase, once. Later purchases by the same member don’t pay it again.' },
  { key: 'level', icon: 'layers', title: 'Level income', text: 'Qualified directs unlock earning depth. Rate, base and release come from the active level rule.' },
  { key: 'reward', icon: 'gift', title: 'Rewards', text: 'Rewards follow their own eligibility rule. A trip is not wallet cash unless that reward says so.' },
];

export const faqs = [
  {
    q: 'How do I deposit?',
    a: 'Open Wallet → Deposit, send USDT on BEP20 to your deposit address, then press Verify deposit. A matching transfer is added to your balance.',
  },
  {
    q: 'When is daily earning added?',
    a: 'Each active package pays one credit every night at 12:00 AM IST. The purchase day stays at 0 until that midnight.',
  },
  {
    q: 'What is the withdrawal fee?',
    a: '5% is cut from the requested amount. The minimum is 20 USDT and the maximum is 10,000 USDT per request.',
  },
];

export const support = {
  email: 'support@finitygrowth.com',
  hours: 'Monday–Friday, 10:00–18:00',
  hoursNote: 'Sample hours. Replace with the published support schedule.',
};

export const legal = {
  links: ['Terms', 'Privacy', 'Risk Disclosure', 'Refund Policy'],
  version: 'Version 1.0 · Effective 21 October 2026',
};

export const about = {
  title: 'A member site for published packages.',
  text: 'Members register, fund an account, purchase a package, then follow scheduled income, referrals, transfers and withdrawals. Company registration, licences and history appear only after an approved profile is published.',
  disclaimer:
    'Rules, prices and payouts come from the admin configuration that is currently published. No promised returns, no trading results.',
};
