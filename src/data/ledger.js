/**
 * WALLET LEDGER (static sample)
 *
 * The ledger is every movement of money in the member's wallet. It is built
 * from two sources:
 *
 *   1. `events`  – one-off things written by hand below (deposits, package
 *                  purchases, commissions, transfers, withdrawals).
 *   2. Nightly credits generated day-by-day from the rules:
 *        - Package ROI for every active package   (packages.js + program.js)
 *        - Level income from team members' ROI    (team.js + program.js)
 *
 * Because nightly credits are calculated (not typed), balances, charts and
 * totals across the app always add up. The result is plain static data —
 * nothing here talks to a server.
 */
import { purchases, describePackage } from './packages';
import { teamMembers } from './team';
import { plans, referralRules, walletRules } from './program';
import { TODAY, addDays, diffDays, toKey } from '../utils/date';
import { round2 } from '../utils/format';

// ---------------------------------------------------------------------------
// 1. Hand-written events
// type: deposit | package | direct | transfer_in | transfer_out | withdrawal
// ---------------------------------------------------------------------------
export const events = [
  { date: '2025-11-08', type: 'deposit', amount: 150, title: 'Deposit', subtitle: 'BEP20 · 0x91c2…7ae4', txHash: '0x91c2d0b7e4a1f3c58d2e6b9a0c4f7e1d3b5a8c27e4' },
  { date: '2025-11-10', type: 'package', amount: -100, title: 'Package purchase', subtitle: 'TIER-1 · P-27102' },
  { date: '2026-06-25', type: 'deposit', amount: 1000, title: 'Deposit', subtitle: 'BEP20 · 0x3fa8…19bd', txHash: '0x3fa8c71e20d94b6a5e83f1c07d2b9a4e6c5d19bd' },
  { date: '2026-06-29', type: 'package', amount: -1000, title: 'Package purchase', subtitle: 'TIER-1 · P-30418' },
  { date: '2026-08-10', type: 'withdrawal', amount: -200, fee: 10, title: 'Withdrawal', subtitle: 'To 0x4B21…C1D7 · Paid', status: 'Paid', address: '0x4B21e7A0c9D35f8E62b1A7C4d90E3f5B28a6C1D7' },
  { date: '2026-09-10', type: 'deposit', amount: 400, title: 'Deposit', subtitle: 'BEP20 · 0xc04e…5f62', txHash: '0xc04e2a9d81b7f36e05c4d2a1b8e97f3c6d0a5f62' },
  { date: '2026-09-12', type: 'package', amount: -500, title: 'Package purchase', subtitle: 'TIER-1 · P-31877' },
  { date: '2026-10-18', type: 'transfer_out', amount: -40, title: 'Transfer sent', subtitle: 'To Karan Mehta · STX100612', counterparty: 'Karan Mehta', note: 'For your first deposit' },
  { date: '2026-10-22', type: 'transfer_in', amount: 15, title: 'Transfer received', subtitle: 'From Neha Gupta · STX100344', counterparty: 'Neha Gupta', note: '' },
  { date: '2026-10-25', type: 'withdrawal', amount: -50, fee: 2.5, title: 'Withdrawal', subtitle: 'To 0x4B21…C1D7 · Pending review', status: 'Pending', address: '0x4B21e7A0c9D35f8E62b1A7C4d90E3f5B28a6C1D7' },
];

// Direct commission: 5% of each direct's FIRST package, paid on that day.
function directCommissionEvents() {
  return teamMembers
    .filter(m => m.level === 1 && m.firstPackage)
    .map(m => ({
      date: m.firstPackage.date,
      type: 'direct',
      amount: round2(m.firstPackage.amount * referralRules.directRate),
      title: 'Direct commission',
      subtitle: `${m.name} · first package ${m.firstPackage.amount} USDT`,
    }));
}

// How many levels are unlocked on a given day = package-buying directs so far.
function unlockedLevelsOn(dayKey) {
  const buyers = teamMembers.filter(
    m => m.level === 1 && m.firstPackage && m.firstPackage.date <= dayKey,
  ).length;
  return Math.min(buyers, referralRules.levels.length);
}

// ---------------------------------------------------------------------------
// 2. Nightly credits (ROI + level income), one aggregated entry per day each
// ---------------------------------------------------------------------------
function nightlyCredits() {
  const plan = plans[0];
  const start = purchases.reduce((min, p) => (p.purchasedOn < min ? p.purchasedOn : min), toKey(TODAY));
  const totalDays = diffDays(start, TODAY);
  const out = [];

  for (let i = 1; i <= totalDays; i++) {
    const day = toKey(addDays(start, i));

    // Package ROI: a package earns on nights 1..durationDays after purchase.
    let roi = 0;
    let count = 0;
    purchases.forEach(p => {
      const n = diffDays(p.purchasedOn, day);
      if (n >= 1 && n <= plan.durationDays) {
        roi += p.amount * plan.dailyRate;
        count += 1;
      }
    });
    if (roi > 0) {
      out.push({
        date: day,
        type: 'roi',
        amount: round2(roi),
        title: 'Package ROI',
        subtitle: `${count} package${count > 1 ? 's' : ''} · credited 12:00 AM IST`,
      });
    }

    // Level income: rate × each team member's nightly ROI, only on unlocked levels.
    const unlocked = unlockedLevelsOn(day);
    let levelIncome = 0;
    teamMembers.forEach(m => {
      if (!m.firstPackage || m.level > unlocked) {
        return;
      }
      const n = diffDays(m.firstPackage.date, day);
      if (n >= 1 && n <= plan.durationDays) {
        const rate = referralRules.levels[m.level - 1].rate;
        levelIncome += m.firstPackage.amount * plan.dailyRate * rate;
      }
    });
    if (levelIncome > 0) {
      out.push({
        date: day,
        type: 'level',
        amount: round2(levelIncome),
        title: 'Level commission',
        subtitle: `L1–L${unlocked} · team nightly ROI`,
      });
    }
  }
  return out;
}

// ---------------------------------------------------------------------------
// 3. Final ledger: newest first, each entry with an id
// ---------------------------------------------------------------------------
const typeOrder = { deposit: 0, package: 1, roi: 2, level: 3, direct: 4, transfer_in: 5, transfer_out: 6, withdrawal: 7 };

export const ledger = [...events, ...directCommissionEvents(), ...nightlyCredits()]
  .sort((a, b) => (a.date === b.date ? typeOrder[b.type] - typeOrder[a.type] : a.date < b.date ? 1 : -1))
  .map((e, i) => ({ id: `TX-${String(i + 1).padStart(5, '0')}`, ...e }));

/** Pending withdrawals hold money as "locked" (already out of balance). */
export const lockedAmount = round2(
  events.filter(e => e.type === 'withdrawal' && e.status === 'Pending').reduce((s, e) => s - e.amount, 0),
);

/** End-of-day balance for every day, oldest first: [{ date, balance }] */
export const balanceHistory = (() => {
  const byDay = {};
  ledger.forEach(e => {
    byDay[e.date] = (byDay[e.date] || 0) + e.amount;
  });
  const first = ledger[ledger.length - 1].date;
  const days = diffDays(first, TODAY);
  let running = 0;
  const out = [];
  for (let i = 0; i <= days; i++) {
    const key = toKey(addDays(first, i));
    running += byDay[key] || 0;
    out.push({ date: key, balance: round2(running) });
  }
  return out;
})();

/** Packages with calculated fields (see packages.js). */
export const packages = purchases.map(p => describePackage(p));

export { walletRules };
