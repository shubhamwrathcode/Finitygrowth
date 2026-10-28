/**
 * Number formatting helpers used across the app.
 */

/** 1234.5 → '1,234.50' */
export function money(value, decimals = 2) {
  const n = Number(value) || 0;
  return n.toLocaleString('en-US', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
}

/** 1234.5 → '1,234.50 USDT' */
export function usdt(value, decimals = 2) {
  return `${money(value, decimals)} USDT`;
}

/** Adds an explicit sign: 12 → '+12.00', -3 → '−3.00' */
export function signed(value, decimals = 2) {
  const n = Number(value) || 0;
  const sign = n < 0 ? '−' : '+';
  return `${sign}${money(Math.abs(n), decimals)}`;
}

/** 0.0063 → '0.63%' */
export function percent(rate, decimals = 2) {
  const n = (Number(rate) || 0) * 100;
  // Drop trailing zeros: 2.00 → 2, 0.50 → 0.5
  return `${parseFloat(n.toFixed(decimals))}%`;
}

/** Shortens a long wallet address: 0x1234…abcd */
export function shortAddress(address, head = 6, tail = 4) {
  if (!address || address.length <= head + tail) {
    return address;
  }
  return `${address.slice(0, head)}…${address.slice(-tail)}`;
}

/** Round to 2 decimals as a number (avoids floating point noise). */
export function round2(value) {
  return Math.round((Number(value) || 0) * 100) / 100;
}
