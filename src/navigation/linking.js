import { Linking } from 'react-native';
import { ROUTES } from './routes';

/**
 * Parse reset token from:
 * - finitygrowth://reset-password?token=CODE
 * - https://…/#/reset-password?token=CODE  (same as web email button)
 * - https://…/reset-password?token=CODE
 * - raw token / pasted URL into the form
 */
export function extractResetToken(input) {
  const raw = String(input || '').trim();
  if (!raw) return '';

  const hashMatch = raw.match(/#\/?reset-password\?([^#\s]*)/i);
  if (hashMatch) {
    try {
      return new URLSearchParams(hashMatch[1]).get('token') || '';
    } catch {
      return '';
    }
  }

  try {
    const normalized = raw.replace(/^finitygrowth:\/\//i, 'https://finitygrowth.local/');
    if (/^https?:\/\//i.test(normalized) || raw.includes('reset-password')) {
      const url = new URL(normalized);
      const token = url.searchParams.get('token');
      if (token) return token;
    }
  } catch {
    // not a URL — treat as raw token
  }

  // Bare token (no spaces / not a URL)
  if (!/\s/.test(raw) && !/^https?:\/\//i.test(raw) && !raw.includes('://')) {
    return raw;
  }
  return '';
}

function pathFromUrl(url) {
  if (!url) return null;
  const token = extractResetToken(url);
  if (token || /reset-password/i.test(url)) {
    return {
      screen: ROUTES.RESET_PASSWORD,
      params: token ? { token } : {},
    };
  }
  if (/forgot-password/i.test(url)) {
    return { screen: ROUTES.FORGOT_PASSWORD };
  }
  if (/#\/login|\/login/i.test(url)) {
    return { screen: ROUTES.LOGIN };
  }
  if (/#\/signup|#\/register|\/signup|\/register/i.test(url)) {
    return { screen: ROUTES.REGISTER };
  }
  return null;
}

/**
 * React Navigation linking — opens ResetPassword with token from email links.
 */
export const linking = {
  prefixes: [
    'finitygrowth://',
    'https://finitygrowth.com',
    'https://www.finitygrowth.com',
    'https://app.finitygrowth.com',
  ],
  config: {
    screens: {
      [ROUTES.WELCOME]: '',
      [ROUTES.LOGIN]: 'login',
      [ROUTES.REGISTER]: 'signup',
      [ROUTES.FORGOT_PASSWORD]: 'forgot-password',
      [ROUTES.RESET_PASSWORD]: {
        path: 'reset-password',
        parse: {
          token: token => token,
        },
      },
    },
  },
  async getInitialURL() {
    const url = await Linking.getInitialURL();
    return url;
  },
  subscribe(listener) {
    const onReceive = ({ url }) => listener(url);
    const sub = Linking.addEventListener('url', onReceive);
    return () => sub.remove();
  },
};

/**
 * Build navigation action from an incoming URL (hash or custom scheme).
 * Used when default path parsing cannot read `#/reset-password?token=`.
 */
export function getResetNavFromUrl(url) {
  return pathFromUrl(url);
}
