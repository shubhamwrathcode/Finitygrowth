/**
 * PACKAGES the member has bought (static sample).
 *
 * Only the purchase facts are stored. Everything else (days elapsed, earned,
 * still scheduled, status) is calculated from the plan rules in
 * `program.js` by `describePackage()`, so the numbers always agree.
 */
import { plans } from './program';
import { TODAY, diffDays, addDays, toKey } from '../utils/date';
import { round2 } from '../utils/format';

export const purchases = [
  { id: 'P-30418', planId: 'PKG1792826358214', amount: 1000, purchasedOn: '2026-06-29' },
  { id: 'P-31877', planId: 'PKG1792826358214', amount: 500, purchasedOn: '2026-09-12' },
  { id: 'P-27102', planId: 'PKG1792826358214', amount: 100, purchasedOn: '2025-11-10' },
];

export function getPlan(planId) {
  return plans.find(p => p.id === planId);
}

/**
 * Adds calculated fields to a purchase:
 *  dailyAmount, totalPayout, daysElapsed, earned, remaining, status, progress, endsOn
 * Credits start the night after purchase (day 0 = purchase day).
 */
export function describePackage(purchase, today = TODAY) {
  const plan = getPlan(purchase.planId);
  const dailyAmount = round2(purchase.amount * plan.dailyRate);
  // Total = daily credit × number of nights (e.g. 100 USDT → 0.63 × 320 = 201.60).
  const totalPayout = round2(dailyAmount * plan.durationDays);
  const daysElapsed = Math.min(Math.max(diffDays(purchase.purchasedOn, today), 0), plan.durationDays);
  const earned = round2(Math.min(dailyAmount * daysElapsed, totalPayout));
  const status = daysElapsed >= plan.durationDays ? 'Completed' : 'Active';
  return {
    ...purchase,
    planName: plan.name,
    durationDays: plan.durationDays,
    dailyAmount,
    totalPayout,
    daysElapsed,
    earned,
    remaining: round2(totalPayout - earned),
    status,
    progress: daysElapsed / plan.durationDays,
    endsOn: toKey(addDays(purchase.purchasedOn, plan.durationDays)),
  };
}
