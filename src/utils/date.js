/**
 * Date helpers.
 *
 * The app runs on STATIC data, so "today" is frozen to a fixed date. That keeps
 * every chart and number identical on every device. When you connect a real
 * backend, replace TODAY with `new Date()` (or just use dates from the API).
 */
export const TODAY = new Date('2026-10-27T00:00:00');

const DAY_MS = 24 * 60 * 60 * 1000;

/** Parse 'YYYY-MM-DD' as a local date (no timezone surprises). */
export function toDate(value) {
  if (value instanceof Date) {
    return value;
  }
  const [y, m, d] = value.split('-').map(Number);
  return new Date(y, m - 1, d);
}

export function addDays(date, days) {
  return new Date(toDate(date).getTime() + days * DAY_MS);
}

/** Whole days from `a` to `b` (b - a). */
export function diffDays(a, b) {
  return Math.round((toDate(b).getTime() - toDate(a).getTime()) / DAY_MS);
}

/** Date → 'YYYY-MM-DD' */
export function toKey(date) {
  const d = toDate(date);
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${d.getFullYear()}-${mm}-${dd}`;
}

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

/** 'Oct 27' */
export function shortDate(date) {
  const d = toDate(date);
  return `${MONTHS[d.getMonth()]} ${d.getDate()}`;
}

/** 'Oct 27, 2026' */
export function longDate(date) {
  const d = toDate(date);
  return `${MONTHS[d.getMonth()]} ${d.getDate()}, ${d.getFullYear()}`;
}

/** 'Tuesday, October 27, 2026' style header used on the dashboard. */
export function fullDate(date) {
  const d = toDate(date);
  const longMonths = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
  return `${DAYS[d.getDay()]}, ${longMonths[d.getMonth()]} ${d.getDate()}, ${d.getFullYear()}`;
}

/** 'Oct 2026' */
export function monthYear(date) {
  const d = toDate(date);
  return `${MONTHS[d.getMonth()]} ${d.getFullYear()}`;
}
