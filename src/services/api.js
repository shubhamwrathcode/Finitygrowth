/**
 * MOCK API SERVICE
 * ---------------------------------------------------------------------------
 * This is the ONLY place screens get data from. Every function is `async` and
 * returns a Promise, exactly like a real HTTP call would. Right now they read
 * the static files in `src/data/` and wait a moment (`delay`) so loading
 * states are visible.
 *
 * To connect a real backend later, replace the body of each function with a
 * fetch call (see docs/DATA-LAYER.md). The screens do not need to change as
 * long as the returned shape stays the same.
 */
import * as program from '../data/program';
import { user } from '../data/user';
import { ledger, balanceHistory, lockedAmount, packages } from '../data/ledger';
import { teamMembers } from '../data/team';
import { TODAY, addDays, diffDays, toKey, shortDate } from '../utils/date';
import { round2 } from '../utils/format';
import {
  buildSeries,
  loadLedger,
  loadTeamLevels,
  sliceSeries,
  sumSince,
  toTransactionRow,
  weeklyFlow,
  INCOME_TYPES as API_INCOME_TYPES,
} from './dashboardData';
import { imageUrl, request } from './http';
import { getUser, setSession, getToken } from './session';

export { imageUrl };

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
const NETWORK_DELAY_MS = 350;
const delay = (ms = NETWORK_DELAY_MS) => new Promise(resolve => setTimeout(resolve, ms));

const INCOME_TYPES = ['roi', 'direct', 'level'];

function sum(entries) {
  return round2(entries.reduce((s, e) => s + e.amount, 0));
}

function since(days) {
  return toKey(addDays(TODAY, -days + 1));
}

function entriesOfType(types, fromKey) {
  return ledger.filter(e => types.includes(e.type) && (!fromKey || e.date >= fromKey));
}

function currentBalance() {
  return balanceHistory[balanceHistory.length - 1].balance;
}

// ---------------------------------------------------------------------------
// Auth – same endpoints as stravex_mlm_web AuthPage
// ---------------------------------------------------------------------------

/** POST /api/v1/auth/login → token OR OTP challenge */
export async function login(userId, password) {
  return request('/api/v1/auth/login', {
    method: 'POST',
    auth: false,
    body: { userId: String(userId || '').trim(), password },
  });
}

/** POST /api/v1/auth/login/verify */
export async function verifyLogin(challengeId, otp) {
  return request('/api/v1/auth/login/verify', {
    method: 'POST',
    auth: false,
    body: { challengeId, otp },
  });
}

/** POST /api/v1/auth/signup → token OR OTP challenge */
export async function signup(body) {
  return request('/api/v1/auth/signup', {
    method: 'POST',
    auth: false,
    body,
  });
}

/** POST /api/v1/auth/signup/verify */
export async function verifySignup(challengeId, otp) {
  return request('/api/v1/auth/signup/verify', {
    method: 'POST',
    auth: false,
    body: { challengeId, otp },
  });
}

/** POST /api/v1/auth/otp/resend */
export async function resendOtp(challengeId) {
  return request('/api/v1/auth/otp/resend', {
    method: 'POST',
    auth: false,
    body: { challengeId },
  });
}

/** GET /api/v1/auth/sponsor/:code */
export async function lookupSponsor(code) {
  return request(`/api/v1/auth/sponsor/${encodeURIComponent(code)}`, {
    auth: false,
  });
}

/** POST /api/v1/auth/password/forgot (email send can take a few seconds) */
export async function forgotPassword(email) {
  return request('/api/v1/auth/password/forgot', {
    method: 'POST',
    auth: false,
    body: { email },
    timeoutMs: 25000,
  });
}

/** POST /api/v1/auth/password/reset */
export async function resetPassword(form) {
  return request('/api/v1/auth/password/reset', {
    method: 'POST',
    auth: false,
    body: form,
  });
}

/** @deprecated use signup() – kept for older call sites */
export async function register(form) {
  const phone = String(form.phone || '').trim();
  const digits = phone.replace(/\D/g, '');
  return signup({
    name: form.fullName || form.name,
    email: form.email,
    phone: `${phone.startsWith('+') ? '+' : ''}${digits}`,
    password: form.password,
    referralCode: form.referralCode || form.referral,
    ...(form.country ? { country: form.country } : {}),
  });
}

// ---------------------------------------------------------------------------
// Public program info (Explore, Reward, Levels…)
// ---------------------------------------------------------------------------
export async function getProgram() {
  await delay(150);
  return program;
}

/** Points for the illustrative "100 USDT example" chart on Explore. */
export function getIllustrativeSchedule(amount = 100) {
  const plan = program.plans[0];
  const points = [];
  for (let day = 0; day <= plan.durationDays; day += 20) {
    points.push({ day, value: round2(amount * plan.dailyRate * day) });
  }
  return { total: round2(amount * plan.dailyRate * plan.durationDays), daily: round2(amount * plan.dailyRate), points };
}

// ---------------------------------------------------------------------------
// Profile – same as web Account.jsx Profile (/api/v1/me/profile)
// ---------------------------------------------------------------------------
export async function getProfile() {
  const res = await request('/api/v1/me/profile');
  return res.data;
}

/**
 * PATCH profile. Pass only changed fields (web FormData behaviour).
 * Optional `photo`: { uri, type?, name? } for profileImage multipart.
 */
export async function updateProfile({ name, phone, country, photo } = {}) {
  const form = new FormData();
  if (name != null) form.append('name', String(name));
  if (phone != null) form.append('phone', String(phone));
  if (country != null) form.append('country', String(country));
  if (photo?.uri) {
    form.append('profileImage', {
      uri: photo.uri,
      type: photo.type || 'image/jpeg',
      name: photo.name || 'profile.jpg',
    });
  }
  const res = await request('/api/v1/me/profile', { method: 'PATCH', form });
  const next = res.data;
  // Keep session user in sync (shell avatar / greeting)
  const token = getToken();
  const prev = getUser();
  if (token && next) {
    setSession(token, {
      ...(prev || {}),
      ...next,
      name: next.name ?? prev?.name,
      profileImage: next.profileImage ?? prev?.profileImage,
    });
  }
  return next;
}

/** POST /api/v1/me/password/change – web Password screen */
export async function changePassword(body) {
  return request('/api/v1/me/password/change', { method: 'POST', body });
}

/** GET /api/v1/me/verification – web Kyc screen */
export async function getVerification() {
  const res = await request('/api/v1/me/verification');
  return res.data;
}

/**
 * POST /api/v1/me/verification – web Kyc submit (multipart).
 * `file`: { uri, type?, name? } for documentImage.
 */
export async function submitVerification({ documentType, file }) {
  const form = new FormData();
  form.append('documentType', String(documentType || 'passport'));
  if (file?.uri) {
    form.append('documentImage', {
      uri: file.uri,
      type: file.type || 'image/jpeg',
      name: file.name || 'document.jpg',
    });
  }
  const res = await request('/api/v1/me/verification', { method: 'POST', form });
  return res.data;
}

// ---------------------------------------------------------------------------
// Wallet
// ---------------------------------------------------------------------------
/** range: '7D' | '30D' | '90D' | 'All' → [{ date, balance, label }] */
export function getBalanceSeries(range = '30D') {
  const days = { '7D': 7, '30D': 30, '90D': 90 }[range];
  let series = days ? balanceHistory.slice(-days) : balanceHistory;
  if (!days) {
    // "All" can be ~1 year of days; keep one point per week for the chart.
    series = series.filter((_, i) => i % 7 === 0 || i === series.length - 1);
  }
  return series.map(p => ({ ...p, label: shortDate(p.date) }));
}

export async function getWallet() {
  await delay();
  const from = since(30);
  const last30 = ledger.filter(e => e.date >= from);
  const moneyIn = sum(last30.filter(e => e.amount > 0));
  const moneyOut = sum(last30.filter(e => e.amount < 0));
  const balance = currentBalance();
  const first30 = balanceHistory[balanceHistory.length - 31]?.balance ?? 0;
  return {
    balance,
    locked: lockedAmount,
    total: round2(balance + lockedAmount),
    change30: round2(balance - first30),
    change30Pct: first30 ? (balance - first30) / first30 : 0,
    moneyIn,
    moneyOut,
    net: round2(moneyIn + moneyOut),
    rules: program.walletRules,
  };
}

/** filter: 'All' | 'Income' | 'Deposits' | 'Packages' | 'Transfers' | 'Withdrawals' */
export async function getStatement(filter = 'All', limit = 40) {
  await delay(200);
  const map = {
    All: null,
    Income: INCOME_TYPES,
    Deposits: ['deposit'],
    Packages: ['package'],
    Transfers: ['transfer_in', 'transfer_out'],
    Withdrawals: ['withdrawal'],
  };
  const types = map[filter];
  const list = types ? ledger.filter(e => types.includes(e.type)) : ledger;
  return list.slice(0, limit);
}

/** Weekly totals for the last `weeks` weeks (money in above 0, out below). */
export function getCashFlow(weeks = 8) {
  const out = [];
  for (let w = weeks - 1; w >= 0; w--) {
    const end = addDays(TODAY, -w * 7);
    const start = toKey(addDays(end, -6));
    const endKey = toKey(end);
    const inWeek = ledger.filter(e => e.date >= start && e.date <= endKey);
    out.push({
      label: shortDate(start),
      income: sum(inWeek.filter(e => INCOME_TYPES.includes(e.type))),
      deposits: sum(inWeek.filter(e => e.type === 'deposit' || e.type === 'transfer_in')),
      out: sum(inWeek.filter(e => e.type === 'withdrawal' || e.type === 'transfer_out')),
    });
  }
  return out;
}

// ---------------------------------------------------------------------------
// Deposit – same as web Wallet.jsx Deposit (visible BEP20 path)
// GET  /api/v1/me/wallets
// GET  /api/v1/me/wallet/deposit-address
// GET  /api/v1/me/bep20-deposits?page&limit&transactionType
// POST /api/v1/me/wallet/verify-deposit
// ---------------------------------------------------------------------------
export async function getDepositAddress() {
  const res = await request('/api/v1/me/wallet/deposit-address');
  return res.data;
}

export async function getBep20Deposits({ page = 1, limit = 10, transactionType = 'DEPOSIT' } = {}) {
  const q = new URLSearchParams({ page: String(page), limit: String(limit) });
  if (transactionType) q.set('transactionType', transactionType);
  return request(`/api/v1/me/bep20-deposits?${q}`);
}

/** POST verify – returns { message, data } like web */
export async function verifyDeposit() {
  return request('/api/v1/me/wallet/verify-deposit', { method: 'POST', body: {} });
}

// ---------------------------------------------------------------------------
// Transfer – same as web Transfer.jsx
// GET  /api/v1/me/wallets
// GET  /api/v1/me/profile
// GET  /api/v1/me/transfers?page&limit
// POST /api/v1/me/transfers
// GET  /api/v1/public/referrals/:code (live recipient check)
// ---------------------------------------------------------------------------
export async function lookupReferral(code) {
  return request(`/api/v1/public/referrals/${encodeURIComponent(code)}`, {
    auth: false,
  });
}

export async function getTransferList({ page = 1, limit = 8 } = {}) {
  return request(`/api/v1/me/transfers?page=${page}&limit=${limit}`);
}

export async function createTransfer(body) {
  return request('/api/v1/me/transfers', { method: 'POST', body });
}

// ---------------------------------------------------------------------------
// Withdraw – same as web Withdraw.jsx
// GET  /api/v1/me/wallets
// GET  /api/v1/me/destinations
// GET  /api/v1/me/withdrawals?page&limit
// POST /api/v1/me/withdrawals
// POST /api/v1/me/withdrawals/verify
// POST /api/v1/me/withdrawals/otp/resend
// POST /api/v1/me/withdrawals/:id/cancel
// ---------------------------------------------------------------------------
export async function getDestinations() {
  const res = await request('/api/v1/me/destinations');
  return res.data || [];
}

/** POST /api/v1/me/destinations – web Addresses save */
export async function createDestination(body) {
  return request('/api/v1/me/destinations', { method: 'POST', body });
}

/** DELETE /api/v1/me/destinations/:id */
export async function deleteDestination(id) {
  return request(`/api/v1/me/destinations/${encodeURIComponent(id)}`, { method: 'DELETE' });
}

export async function getWithdrawalList({ page = 1, limit = 8 } = {}) {
  return request(`/api/v1/me/withdrawals?page=${page}&limit=${limit}`);
}

/** POST create → OTP challenge in result.data */
export async function createWithdrawal(body) {
  return request('/api/v1/me/withdrawals', { method: 'POST', body });
}

export async function verifyWithdrawal(challengeId, otp) {
  return request('/api/v1/me/withdrawals/verify', {
    method: 'POST',
    body: { challengeId, otp },
  });
}

export async function resendWithdrawalOtp(challengeId) {
  return request('/api/v1/me/withdrawals/otp/resend', {
    method: 'POST',
    body: { challengeId },
  });
}

export async function cancelWithdrawal(id) {
  return request(`/api/v1/me/withdrawals/${encodeURIComponent(id)}/cancel`, { method: 'POST' });
}

// ---------------------------------------------------------------------------
// Packages
// ---------------------------------------------------------------------------
export async function getPackages() {
  await delay();
  const active = packages.filter(p => p.status === 'Active');
  return {
    list: packages,
    summary: {
      invested: round2(packages.reduce((s, p) => s + p.amount, 0)),
      activeCount: active.length,
      totalCount: packages.length,
      earned: round2(packages.reduce((s, p) => s + p.earned, 0)),
      scheduled: round2(active.reduce((s, p) => s + p.remaining, 0)),
      nextPayout: round2(active.reduce((s, p) => s + p.dailyAmount, 0)),
    },
  };
}

/** Posted vs scheduled points for one package (for the line chart). */
export function getPackageSchedule(pkg, step = 20) {
  const posted = [];
  const scheduled = [];
  for (let day = 0; day <= pkg.durationDays; day += step) {
    const value = round2(Math.min(pkg.dailyAmount * day, pkg.totalPayout));
    if (day <= pkg.daysElapsed) {
      posted.push({ day, value });
    }
    scheduled.push({ day, value });
  }
  return { posted, scheduled };
}

// ---------------------------------------------------------------------------
// My packages – same as web MyPackages.jsx
// GET /api/v1/me/purchases?page&limit&status
// ---------------------------------------------------------------------------
const PURCHASE_PAGE = 50;
const PURCHASE_MAX_PAGES = 6;

export async function getPurchases({ page = 1, limit = 9, status = '' } = {}) {
  const q = `page=${page}&limit=${limit}${status ? `&status=${encodeURIComponent(status)}` : ''}`;
  return request(`/api/v1/me/purchases?${q}`);
}

/** Load every purchase page (portfolio summary + payout chart). */
export async function loadAllPurchases() {
  const first = await request(`/api/v1/me/purchases?page=1&limit=${PURCHASE_PAGE}`);
  const pages = Math.min(PURCHASE_MAX_PAGES, Math.ceil((first.total || 0) / PURCHASE_PAGE));
  const rest = await Promise.all(
    Array.from({ length: Math.max(0, pages - 1) }, (_, i) =>
      request(`/api/v1/me/purchases?page=${i + 2}&limit=${PURCHASE_PAGE}`),
    ),
  );
  return [first, ...rest].flatMap(page => page.data || []);
}

export async function getPlans() {
  await delay(200);
  return { plans: program.plans, balance: currentBalance() };
}

export function quotePackage(planId, amount) {
  const plan = program.plans.find(p => p.id === planId);
  const n = Number(amount) || 0;
  return {
    daily: round2(n * plan.dailyRate),
    total: round2(n * plan.dailyRate * plan.durationDays),
    durationDays: plan.durationDays,
  };
}

export async function buyPackage({ planId, amount }) {
  await delay();
  const plan = program.plans.find(p => p.id === planId);
  const n = Number(amount);
  if (!n || n < plan.minAmount || n > plan.maxAmount) {
    throw new Error(`Amount must be between ${plan.minAmount} and ${plan.maxAmount} USDT.`);
  }
  if (n > currentBalance()) {
    throw new Error('Not enough balance. Add funds first.');
  }
  return { ok: true, ...quotePackage(planId, n) };
}

// ---------------------------------------------------------------------------
// Buy package – same as web BuyPackages.jsx
// GET /api/v1/me/package-options
// POST /api/v1/me/purchases  { packageId, amount? }
// ---------------------------------------------------------------------------
export async function getPackageOptions() {
  const res = await request('/api/v1/me/package-options');
  return res.data || [];
}

export async function createPurchase({ packageId, amount }) {
  const body = { packageId };
  if (amount != null && amount !== '') body.amount = Number(amount);
  const res = await request('/api/v1/me/purchases', { method: 'POST', body });
  return res.data;
}

// ---------------------------------------------------------------------------
// Earnings – same as web Earnings.jsx
// GET /api/v1/me/earnings/summary
// GET /api/v1/me/wallets
// GET /api/v1/me/earnings/:key?page&limit  (daily | direct | levels)
// ---------------------------------------------------------------------------
const EARNINGS_DAY = 24 * 60 * 60 * 1000;
const EARNINGS_WINDOW = 30;

export async function getEarningsSummary() {
  const res = await request('/api/v1/me/earnings/summary');
  return res.data;
}

export async function getWallets() {
  const res = await request('/api/v1/me/wallets');
  return res.data;
}

/** Paginated history for one source key: daily | direct | levels */
export async function getEarningsList(key, { page = 1, limit = 10 } = {}) {
  return request(`/api/v1/me/earnings/${encodeURIComponent(key)}?page=${page}&limit=${limit}`);
}

/** Pages back through one earnings type until rows are older than the 30-day chart window. */
export async function loadRecentEarnings(key) {
  const since = Date.now() - EARNINGS_WINDOW * EARNINGS_DAY;
  const rows = [];
  for (let page = 1; page <= 6; page += 1) {
    const body = await request(`/api/v1/me/earnings/${encodeURIComponent(key)}?page=${page}&limit=50`);
    const data = body.data || [];
    rows.push(...data);
    const oldest = data[data.length - 1];
    if (!oldest || new Date(oldest.createdAt).getTime() < since || page * 50 >= (body.total || 0)) break;
  }
  return rows.filter(row => new Date(row.createdAt).getTime() >= since);
}

/** Last-30-day rows for all three sources (chart). */
export async function getEarningsChartRecent() {
  const keys = ['daily', 'direct', 'levels'];
  const results = await Promise.all(keys.map(key => loadRecentEarnings(key).catch(() => [])));
  return Object.fromEntries(keys.map((key, i) => [key, results[i]]));
}

// ---------------------------------------------------------------------------
// Team, levels, referral
// ---------------------------------------------------------------------------
function teamStats() {
  const directs = teamMembers.filter(m => m.level === 1);
  const buyingDirects = directs.filter(m => m.firstPackage).length;
  const byLevel = [1, 2, 3, 4, 5].map(l => teamMembers.filter(m => m.level === l).length);
  return {
    directs: directs.length,
    buyingDirects,
    total: teamMembers.length,
    byLevel,
    unlockedLevels: Math.min(buyingDirects, 5),
    activePackages: teamMembers.filter(m => m.firstPackage).length,
  };
}

export async function getTeam() {
  await delay();
  return {
    ...teamStats(),
    members: teamMembers.map(m => ({
      ...m,
      status: m.firstPackage ? 'Active' : 'No package',
      invested: m.firstPackage?.amount ?? 0,
    })),
  };
}

export async function getLevels() {
  await delay();
  const stats = teamStats();
  return {
    unlocked: stats.unlockedLevels,
    buyingDirects: stats.buyingDirects,
    levels: program.referralRules.levels.map(l => {
      const unlocked = stats.buyingDirects >= l.directsRequired;
      return {
        ...l,
        unlocked,
        upNext: !unlocked && l.directsRequired === stats.buyingDirects + 1,
        moreNeeded: Math.max(l.directsRequired - stats.buyingDirects, 0),
        members: stats.byLevel[l.level - 1],
      };
    }),
  };
}

// ---------------------------------------------------------------------------
// Referral – same as web Referral.jsx
// GET /api/v1/me/referral
// GET /api/v1/me/team/direct
// GET /api/v1/me/earnings/summary
// GET /api/v1/me/wallets
// GET /api/v1/me/team/levels?level=1..5  (via loadTeamLevels)
// ---------------------------------------------------------------------------
export async function getReferral() {
  const res = await request('/api/v1/me/referral');
  return res.data;
}

export async function getTeamDirect() {
  const res = await request('/api/v1/me/team/direct');
  return res.data || [];
}

// ---------------------------------------------------------------------------
// Team + Commission levels – same as web Team.jsx
// GET /api/v1/me/commission-levels
// GET /api/v1/me/team/levels?level=1..5
// GET /api/v1/me/team/tree?depth=1..5
// ---------------------------------------------------------------------------
export async function getCommissionLevels() {
  const res = await request('/api/v1/me/commission-levels');
  return res.data;
}

export async function getTeamLevelMembers(level) {
  const res = await request(`/api/v1/me/team/levels?level=${level}`);
  return res.data || [];
}

export async function getTeamTree(depth = 3) {
  const res = await request(`/api/v1/me/team/tree?depth=${depth}`);
  return res.data || [];
}

// ---------------------------------------------------------------------------
// Dashboard – same endpoints + ledger rebuild as web useDashboardData
// GET /api/v1/me/dashboard
// GET /api/v1/me/earnings/summary
// GET /api/v1/me/transactions (paged)
// GET /api/v1/me/team/levels?level=1..5
// ---------------------------------------------------------------------------
export async function getDashboard() {
  const [dashboard, summary, ledgerRows, levels] = await Promise.all([
    request('/api/v1/me/dashboard'),
    request('/api/v1/me/earnings/summary').catch(() => null),
    loadLedger().catch(() => []),
    loadTeamLevels(),
  ]);

  const data = dashboard.data || {};
  const wallet = data.wallet || {};
  const total = Number(wallet.balance || 0);
  const summaryData = summary?.data || null;
  const series = buildSeries(ledgerRows, total);
  const weekly = weeklyFlow(ledgerRows);
  const income30 = sumSince(ledgerRows, API_INCOME_TYPES, 30);
  const incomePrev = sumSince(ledgerRows, API_INCOME_TYPES, 60) - income30;
  const last30 = series.balance.slice(-30);
  const base = last30[0]?.value || 0;
  const balanceDelta = base ? ((total - base) / base) * 100 : null;
  const incomeDelta = incomePrev > 0 ? ((income30 - incomePrev) / incomePrev) * 100 : null;

  const packageEarned = Number(summaryData?.packageEarned || 0);
  const directCommission = Number(summaryData?.directCommission || 0);
  const levelCommission = Number(summaryData?.levelCommission || 0);
  const incomeTotal = packageEarned + directCommission + levelCommission;

  const activePurchases = data.activePurchases || [];
  const stats = data.stats || {};
  const referral = data.referral || {};
  const sessionUser = getUser() || {};
  const apiUser = data.user || {};

  const recentSource = (ledgerRows.length ? ledgerRows : data.recentActivity || []).slice(0, 6);

  return {
    user: {
      fullName: apiUser.name || sessionUser.name || '',
      firstName: (apiUser.name || sessionUser.name || 'Member').split(' ')[0],
      loginId: apiUser.userId || sessionUser.userId || '',
      name: apiUser.name || sessionUser.name || '',
      userId: apiUser.userId || sessionUser.userId || '',
    },
    today: new Date(),
    currency: wallet.currency || 'USDT',
    wallet: {
      balance: total,
      locked: Number(wallet.lockedBalance || 0),
      change30: round2(total - base),
      change30Pct: base ? (total - base) / base : 0,
      balanceDelta,
    },
    income30,
    incomeDelta,
    incomeBreakdown: {
      roi: packageEarned,
      direct: directCommission,
      level: levelCommission,
      total: incomeTotal,
    },
    summary: summaryData,
    activePackages: activePurchases.map(p => {
      const credited = Number(p.creditedDays || 0);
      const duration = Math.max(1, Number(p.durationDays || 1));
      const daily = Number(p.dailyEarning || 0);
      return {
        id: p.id,
        planName: p.packageName || p.planName || 'Package',
        amount: Number(p.amount || p.investedAmount || 0),
        dailyAmount: daily,
        daysElapsed: credited,
        durationDays: duration,
        progress: Math.min(1, credited / duration),
        earned: Number(p.earnedAmount ?? credited * daily),
        totalPayout: Number(p.expectedAmount ?? duration * daily),
        status: p.status || 'Active',
      };
    }),
    team: {
      total: Number(stats.totalTeam || 0),
      directs: Number(stats.directTeam || 0),
      byLevel: levels,
      activePackages: Number(stats.activePackages || 0),
    },
    referral: {
      code: referral.code || sessionUser.referralCode || '',
      link: referral.link || '',
    },
    recentTransactions: recentSource.map(toTransactionRow),
    ledger: ledgerRows,
    series,
    cashFlow: weekly.map(w => ({
      label: w.label,
      income: w.income,
      deposits: w.deposits,
      // CashFlowChart draws out below the axis with negative values.
      out: -Math.abs(w.out),
    })),
    unreadCount: Number(data.unreadCount || 0),
  };
}

/** Balance series for a chart range – from ledger-built series (web logic). */
export function getBalanceSeriesFromDashboard(seriesBalance, range = '30D') {
  return sliceSeries(seriesBalance, range).map(p => ({
    date: p.time,
    label: shortDate(p.time),
    balance: p.value,
  }));
}

/** Wallet chart series: balance + posted income, sliced like web TradingChart. */
export function getWalletChartSeries(series, range = '30D') {
  const balance = sliceSeries(series?.balance, range);
  const income = sliceSeries(series?.income, range);
  return balance.map((p, i) => ({
    date: p.time,
    label: shortDate(p.time),
    balance: p.value,
    income: income[i]?.value || 0,
  }));
}

// ---------------------------------------------------------------------------
// Notifications – same as web Account.jsx Notifications
// GET /api/v1/me/notifications?page&limit
// POST /api/v1/me/notifications/:id/read
// POST /api/v1/me/notifications/read-all
// ---------------------------------------------------------------------------
export async function getNotifications({ page = 1, limit = 12 } = {}) {
  return request(`/api/v1/me/notifications?page=${page}&limit=${limit}`);
}

export async function markNotificationRead(id) {
  return request(`/api/v1/me/notifications/${encodeURIComponent(id)}/read`, { method: 'POST' });
}

export async function markAllNotificationsRead() {
  return request('/api/v1/me/notifications/read-all', { method: 'POST' });
}

/**
 * Support – same as web Account.jsx Support.
 * GET /api/v1/me/tickets?page&limit&status
 * GET /api/v1/me/tickets/:id
 * POST /api/v1/me/tickets (FormData subject/message/attachment)
 * POST /api/v1/me/tickets/:id/messages (FormData message/attachment)
 */
export async function getSupportTickets({ page = 1, limit = 10, status = '' } = {}) {
  const q = `page=${page}&limit=${limit}${status ? `&status=${encodeURIComponent(status)}` : ''}`;
  return request(`/api/v1/me/tickets?${q}`);
}

export async function getSupportTicket(id) {
  const res = await request(`/api/v1/me/tickets/${encodeURIComponent(id)}`);
  return res.data;
}

/** Create ticket. Optional `attachment`: { uri, type?, name? }. */
export async function createTicket({ subject, message, attachment } = {}) {
  const form = new FormData();
  form.append('subject', String(subject || '').trim());
  form.append('message', String(message || '').trim());
  if (attachment?.uri) {
    form.append('attachment', {
      uri: attachment.uri,
      type: attachment.type || 'image/jpeg',
      name: attachment.name || 'attachment.jpg',
    });
  }
  const res = await request('/api/v1/me/tickets', { method: 'POST', form });
  return res.data;
}

/** Reply on a ticket. Optional `attachment`: { uri, type?, name? }. */
export async function replyToTicket(id, { message, attachment } = {}) {
  const form = new FormData();
  if (message) form.append('message', String(message));
  if (attachment?.uri) {
    form.append('attachment', {
      uri: attachment.uri,
      type: attachment.type || 'image/jpeg',
      name: attachment.name || 'attachment.jpg',
    });
  }
  const res = await request(`/api/v1/me/tickets/${encodeURIComponent(id)}/messages`, {
    method: 'POST',
    form,
  });
  return res.data;
}

// Small helper some screens use for "x days ago" style labels.
export function daysAgo(dateKey) {
  return diffDays(dateKey, TODAY);
}
