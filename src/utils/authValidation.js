/**
 * Auth form validators – mirrored from stravex_mlm_web AuthPage.jsx
 * so mobile shows the same messages and rules as the website.
 * Always validate here first; never call the API while these return errors.
 */

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

export const passwordRules = [
  { test: v => v.length >= 8, label: '8+ characters' },
  { test: v => /[A-Za-z]/.test(v), label: 'A letter' },
  { test: v => /\d/.test(v), label: 'A number' },
];

/** Same rules + copy as web `validateLogin`. */
export function validateLogin(v) {
  const errors = {};
  if (!v.userId.trim()) errors.userId = 'User id is required.';
  if (!v.password) errors.password = 'Enter your password.';
  return errors;
}

/** Same rules + copy as web `validateSignup`. */
export function validateSignup(v) {
  const errors = {};
  if (v.name.trim().length < 2 || v.name.trim().length > 60) {
    errors.name = 'Enter a name of 2 to 60 characters.';
  }
  if (!EMAIL.test(v.email.trim())) errors.email = 'Enter a valid email address.';
  const digits = String(v.mobile || '').replace(/\D/g, '');
  if (digits.length < 8 || digits.length > 15) errors.mobile = 'Enter 8 to 15 digits.';
  if (passwordRules.some(rule => !rule.test(v.password))) {
    errors.password = 'Use at least 8 characters, with a letter and a number.';
  }
  if (!v.confirm || v.confirm !== v.password) errors.confirm = 'Passwords do not match.';
  if (!v.referral.trim()) errors.referral = 'Sponsor code is required.';
  if (!v.terms) errors.terms = 'Accept the Terms to continue.';
  if (!v.risk) errors.risk = 'Confirm you have read the Risk Disclosure.';
  return errors;
}

/**
 * Web ForgotForm uses <input type="email" required />.
 * That blocks submit (no API) until a real email is entered.
 */
export function validateForgot(v) {
  const errors = {};
  if (!EMAIL.test(String(v.email || '').trim())) {
    errors.email = 'Enter a valid email address.';
  }
  return errors;
}

/**
 * Web ResetForm: token is HTML `required`.
 * New password uses the same passwordRules + confirm match as signup.
 * Block the API while any of these fail (same pattern as Login).
 */
export function validateReset(v) {
  const errors = {};
  if (!String(v.token || '').trim()) errors.token = 'Reset token is required.';
  if (passwordRules.some(rule => !rule.test(v.password || ''))) {
    errors.password = 'Use at least 8 characters, with a letter and a number.';
  }
  if (!v.confirmPassword || v.confirmPassword !== v.password) {
    errors.confirmPassword = 'Passwords do not match.';
  }
  return errors;
}
