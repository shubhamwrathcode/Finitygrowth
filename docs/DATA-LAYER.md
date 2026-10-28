# Data layer – static data & mock API

## 1. Files in `src/data/`

| File | Contains | Edit it to… |
|---|---|---|
| `program.js` | Published rules: plan (TIER-1, 100–10,000 USDT, 0.63%/day, 320 days), referral & level rates, withdrawal rules (5% fee, 20–10,000), travel reward, how-it-works, FAQs, support, legal | change rules shown everywhere |
| `user.js` | Signed-in member: name, Login ID, email, referral code, deposit address, KYC status | change the profile |
| `packages.js` | Purchases (id, amount, date) + `describePackage()` which calculates days elapsed, earned, remaining, status | add/remove packages |
| `team.js` | Team members: level, sponsor, join date, first package | grow/shrink the team |
| `ledger.js` | Hand-written wallet events (deposits, purchases, transfers, withdrawals) **plus** generated nightly ROI, level income and direct commissions → `ledger`, `balanceHistory`, `lockedAmount`, `packages` | add a deposit, transfer… |
| `inbox.js` | Notifications and support tickets | change messages |

### Sample numbers you will see

| Item | Value |
|---|---|
| Balance / Locked | ≈ 866 USDT / 50 USDT (pending withdrawal) |
| Packages | 1,000 (active, day 120) · 500 (active, day 45) · 100 (completed) |
| Next nightly payout | 9.45 USDT |
| Team | 3 directs (2 bought) → 2 levels unlocked, 9 members total |
| Income | ROI ≈ 1,099 · Direct 75 · Level ≈ 17 |

## 2. Mock API (`src/services/api.js`)

Every function is `async` (returns a Promise) and waits ~350 ms to imitate the network.

### Read functions

| Function | Returns | Used by |
|---|---|---|
| `getDashboard()` | `{ user, today, wallet, income30, incomeBreakdown, activePackages, team, referral, recentTransactions, cashFlow, unreadCount }` | Dashboard |
| `getWallet()` | `{ balance, locked, total, change30, change30Pct, moneyIn, moneyOut, net, rules }` | Wallet, Dashboard |
| `getBalanceSeries(range)` *(sync)* | `[{ date, label, balance }]` for `'7D' | '30D' | '90D' | 'All'` | Dashboard chart |
| `getStatement(filter)` | ledger entries filtered by `'All' | 'Income' | 'Deposits' | 'Packages' | 'Transfers' | 'Withdrawals'` | Wallet |
| `getCashFlow(weeks)` *(sync)* | `[{ label, income, deposits, out }]` | Dashboard chart |
| `getPackages()` | `{ list: [package…], summary: { invested, activeCount, totalCount, earned, scheduled, nextPayout } }` | My packages, Reward |
| `getPackageSchedule(pkg)` *(sync)* | `{ posted: [{day,value}], scheduled: [{day,value}] }` | My packages chart |
| `getPlans()` | `{ plans, balance }` | Buy package |
| `getEarnings()` | `{ total, last30, bySource, roiScheduledTotal, daily: [{label, roi, direct, level}], history }` | Earnings, Dashboard |
| `getTeam()` | `{ directs, buyingDirects, total, byLevel, unlockedLevels, members }` | Team |
| `getLevels()` | `{ unlocked, buyingDirects, levels: [{ level, rate, directsRequired, unlocked, upNext, moreNeeded, members }] }` | Levels |
| `getReferral()` | `{ code, link, …teamStats, directEarned, levelEarned, recentDirects }` | Referral |
| `getDepositInfo()` | `{ address, network, chain, balance, deposits }` | Deposit |
| `getTransfers()` | `{ balance, fee, sentThisMonth, receivedThisMonth, history }` | Transfer |
| `getWithdrawals()` | `{ available, locked, rules, savedAddresses, requests }` | Withdraw |
| `getNotifications()` | `[{ id, type, title, body, date, read }]` | Notifications |
| `getSupportTickets()` | `{ tickets, contact }` | Support |
| `getProfile()` | user + `balance`, `locked` | Profile |
| `getProgram()` | everything in `program.js` | Explore, Reward |
| `getIllustrativeSchedule(amount)` *(sync)* | `{ total, daily, points }` | Explore chart |

### Calculators (sync, no network)

| Function | Returns |
|---|---|
| `quotePackage(planId, amount)` | `{ daily, total, durationDays }` |
| `quoteWithdrawal(amount)` | `{ gross, fee, net }` |

### Actions (simulated)

| Function | Validates | On success |
|---|---|---|
| `login(id, password)` | both filled | `{ token, user }` |
| `register(form)` | required fields + terms | `{ token, user }` |
| `buyPackage({ planId, amount })` | plan min/max, balance | quote |
| `sendTransfer({ to, amount })` | receiver, amount, balance | `{ ok, reference }` |
| `requestWithdrawal({ amount, address })` | 20–10,000, balance, `0x` + 40 hex | quote |
| `verifyDeposit()` | — | `{ found: false, message }` |
| `createTicket(subject)` | subject | new ticket (kept in memory) |
| `markAllNotificationsRead()` | — | updated list (in memory) |
| `updateProfile(changes)` | — | updated user (in memory) |

Errors are thrown as `Error(message)`; screens show them with `Alert` or inline text.

## 3. Switching to a real backend

Only `src/services/api.js` changes. Keep each function’s **name** and **returned shape**:

```js
// src/services/api.js
const BASE_URL = 'https://api.finitygrowth.com/v1';
let authToken = null;
export const setToken = t => { authToken = t; };

async function request(path, options = {}) {
  const res = await fetch(`${BASE_URL}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(authToken ? { Authorization: `Bearer ${authToken}` } : {}),
    },
  });
  const body = await res.json();
  if (!res.ok) throw new Error(body.message || 'Request failed');
  return body;
}

export async function getWallet() {
  return request('/wallet');               // must return { balance, locked, total, … }
}

export async function login(loginId, password) {
  const result = await request('/auth/login', { method: 'POST', body: JSON.stringify({ loginId, password }) });
  setToken(result.token);
  return result;                            // { token, user }
}
```

Suggested order: `login/register` → `getProfile` → `getWallet`/`getStatement` → `getPackages` → `getEarnings`
→ team/referral → actions. If the server returns a different shape, convert it inside the API function
so screens keep working.

Also worth adding when going live:
- Persist the session token (AsyncStorage or Keychain) in `AuthContext.signIn` and restore it on start.
- Replace `TODAY` in `src/utils/date.js` with `new Date()`.
- Real clipboard (`@react-native-clipboard/clipboard`) for the Copy buttons.
