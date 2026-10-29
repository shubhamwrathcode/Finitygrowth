/**
 * Mirrors web schedule.js / backend payout rules:
 * one credit per night at 12:00 AM IST, fixed daily amount,
 * last night absorbs rounding.
 */

const IST_OFFSET = 5.5 * 60 * 60 * 1000;
const DAY = 24 * 60 * 60 * 1000;

const round = value => Math.round(value * 100) / 100;

export function istDayIndex(date) {
  const time = new Date(date).getTime();
  return Number.isNaN(time) ? 0 : Math.floor((time + IST_OFFSET) / DAY);
}

export function istDateString(dayIndex) {
  return new Date(dayIndex * DAY).toISOString().slice(0, 10);
}

export function istMidnight(dayIndex) {
  return new Date(dayIndex * DAY - IST_OFFSET);
}

export function planTotal(item) {
  const multiplier = Number(item.multiplier) || 0;
  if (multiplier > 0) return round(Number(item.amount) * multiplier);
  return round(Number(item.durationDays) * Number(item.dailyEarning));
}

export function dayCredit(item, dayNumber) {
  const regular = round(Number(item.dailyEarning) || 0);
  if (dayNumber < item.durationDays) return regular;
  return round(planTotal(item) - round(regular * (item.durationDays - 1)));
}

/** Daily payout totals across purchases — credited vs still-scheduled. */
export function portfolioSeries(purchases) {
  const days = new Map();
  purchases.forEach(item => {
    if (!item.durationDays) return;
    const start = istDayIndex(item.startDate);
    const counted = item.status === 'active' || item.status === 'completed';
    if (!counted) return;
    for (let n = 1; n <= item.durationDays; n += 1) {
      const key = start + n;
      const entry = days.get(key) || { paid: 0, upcoming: 0 };
      if (n <= item.creditedDays) entry.paid += dayCredit(item, n);
      else if (item.status === 'active') entry.upcoming += dayCredit(item, n);
      days.set(key, entry);
    }
  });

  const keys = [...days.keys()].sort((a, b) => a - b);
  if (!keys.length) return { paid: [], total: [], bars: [], lastPaidIndex: -1 };

  const paid = [];
  const total = [];
  const bars = [];
  let paidSum = 0;
  let totalSum = 0;
  let lastPaidIndex = -1;
  for (let key = keys[0]; key <= keys[keys.length - 1]; key += 1) {
    const entry = days.get(key) || { paid: 0, upcoming: 0 };
    const time = istDateString(key);
    paidSum += entry.paid;
    totalSum += entry.paid + entry.upcoming;
    total.push({ time, value: round(totalSum) });
    bars.push({
      time,
      value: round(entry.paid + entry.upcoming),
      paid: entry.paid > 0 && entry.upcoming === 0,
    });
    if (entry.paid > 0) lastPaidIndex = total.length - 1;
    paid.push({ time, value: round(paidSum) });
  }
  return { paid: paid.slice(0, lastPaidIndex + 1), total, bars, lastPaidIndex };
}
