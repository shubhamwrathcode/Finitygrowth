/**
 * Dashboard loaders + ledger → chart series.
 * Port of stravex_mlm_web/src/member/dashboardData.js
 * There is no history endpoint, so balance history is rebuilt backwards
 * from today's balance using the transactions themselves.
 */
import { request } from './http';

const PAGE = 50;
const MAX_PAGES = 6;
const DAY = 24 * 60 * 60 * 1000;
export const INCOME_TYPES = ['daily_earning', 'direct_commission', 'level_commission'];

export const activityLabel = {
  deposit: 'Deposit',
  purchase: 'Package purchase',
  daily_earning: 'Daily earning',
  direct_commission: 'Direct commission',
  level_commission: 'Level commission',
  transfer_in: 'Transfer in',
  transfer_out: 'Transfer out',
  withdrawal: 'Withdrawal',
  withdrawal_refund: 'Withdrawal refund',
};

function dayKey(date) {
  const d = new Date(date);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

const signed = row => (row.direction === 'debit' ? -1 : 1) * Number(row.amount || 0);
const round = value => Math.round(value * 100) / 100;

export async function loadLedger() {
  const first = await request(`/api/v1/me/transactions?page=1&limit=${PAGE}`);
  const pages = Math.min(MAX_PAGES, Math.ceil((first.total || 0) / PAGE));
  const rest = await Promise.all(
    Array.from({ length: Math.max(0, pages - 1) }, (_, i) =>
      request(`/api/v1/me/transactions?page=${i + 2}&limit=${PAGE}`),
    ),
  );
  return [first, ...rest].flatMap(page => page.data || []);
}

export async function loadTeamLevels() {
  const results = await Promise.all(
    [1, 2, 3, 4, 5].map(level =>
      request(`/api/v1/me/team/levels?level=${level}`)
        .then(body => body.total ?? body.data?.length ?? 0)
        .catch(() => 0),
    ),
  );
  return results;
}

// Same default as web dashboardData (30). Longer only when ledger is older.
export function buildSeries(ledger, currentBalance, minDays = 30) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const oldest = ledger.reduce(
    (min, row) => Math.min(min, new Date(row.createdAt).getTime()),
    today.getTime(),
  );
  const span = Math.max(minDays, Math.ceil((today.getTime() - oldest) / DAY) + 1);

  const net = new Map();
  const income = new Map();
  ledger.forEach(row => {
    const key = dayKey(row.createdAt);
    net.set(key, (net.get(key) || 0) + signed(row));
    if (INCOME_TYPES.includes(row.type) && row.direction !== 'debit') {
      income.set(key, (income.get(key) || 0) + Number(row.amount || 0));
    }
  });

  const balance = [];
  const incomeBars = [];
  let running = currentBalance;
  for (let i = 0; i < span; i += 1) {
    const key = dayKey(today.getTime() - i * DAY);
    balance.push({ time: key, value: round(Math.max(0, running)) });
    incomeBars.push({ time: key, value: round(income.get(key) || 0) });
    running -= net.get(key) || 0;
  }
  balance.reverse();
  incomeBars.reverse();
  return { balance, income: incomeBars };
}

export function weeklyFlow(ledger, weeks = 8) {
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  const start = now.getTime() - (weeks * 7 - 1) * DAY;
  const buckets = Array.from({ length: weeks }, (_, i) => {
    const from = new Date(start + i * 7 * DAY);
    return {
      label: from.toLocaleDateString(undefined, { day: 'numeric', month: 'short' }),
      deposits: 0,
      income: 0,
      out: 0,
    };
  });
  ledger.forEach(row => {
    const t = new Date(row.createdAt).getTime();
    if (t < start) return;
    const bucket = buckets[Math.min(weeks - 1, Math.floor((t - start) / (7 * DAY)))];
    const amount = Number(row.amount || 0);
    if (row.type === 'deposit') bucket.deposits += amount;
    else if (INCOME_TYPES.includes(row.type)) bucket.income += amount;
    else if (row.type === 'withdrawal' || row.type === 'transfer_out') bucket.out += amount;
  });
  return buckets.map(b => ({
    ...b,
    deposits: round(b.deposits),
    income: round(b.income),
    out: round(b.out),
  }));
}

export function sumSince(ledger, types, days) {
  const since = Date.now() - days * DAY;
  return round(
    ledger
      .filter(
        row =>
          types.includes(row.type) &&
          row.direction !== 'debit' &&
          new Date(row.createdAt).getTime() >= since,
      )
      .reduce((sum, row) => sum + Number(row.amount || 0), 0),
  );
}

/** Map API ledger row → TransactionRow shape used across the app. */
export function toTransactionRow(row) {
  const amount = Number(row.amount || 0);
  const signedAmount = row.direction === 'debit' ? -Math.abs(amount) : Math.abs(amount);
  return {
    id: row.id,
    type: row.type,
    title: activityLabel[row.type] || row.type,
    subtitle: row.note || '—',
    amount: signedAmount,
    date: dayKey(row.createdAt),
    status: row.status || '',
    direction: row.direction,
    createdAt: row.createdAt,
    note: row.note,
  };
}

export function sliceSeries(points, range = '30D') {
  const days = { '7D': 7, '30D': 30, '90D': 90 }[range];
  if (!days || !points?.length) return points || [];
  return points.slice(-days);
}
