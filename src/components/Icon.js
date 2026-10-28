import React from 'react';
import Svg, { Path, Circle, Rect } from 'react-native-svg';
import { colors } from '../theme';

/**
 * Icon – small set of line icons drawn with react-native-svg (24×24 grid).
 * Usage: <Icon name="wallet" size={22} color={colors.gold} />
 * To add an icon, add a new key to `paths` returning SVG elements.
 */
const paths = {
  home: () => <Path d="M3 10.5 12 3l9 7.5V21h-6v-6H9v6H3z" />,
  // Paths match web Dashboard.jsx icons (stroke line icons, 24×24).
  wallet: () => (
    <Path d="M3 7a2 2 0 012-2h13v4M3 7v10a2 2 0 002 2h15V9H5a2 2 0 01-2-2zm14 7h.01" />
  ),
  coins: () => (
    <Path d="M12 3c4.4 0 8 1.3 8 3s-3.6 3-8 3-8-1.3-8-3 3.6-3 8-3zm8 3v6c0 1.7-3.6 3-8 3s-8-1.3-8-3V6m16 6v6c0 1.7-3.6 3-8 3s-8-1.3-8-3v-6" />
  ),
  trend: () => <Path d="M3 17l6-6 4 4 8-8M15 7h6v6" />,
  plus: () => <Path d="M12 5v14M5 12h14" />,
  up: () => <Path d="M12 19V5m-6 6l6-6 6 6" />,
  team: () => (
    <Path d="M16 19v-1a4 4 0 00-4-4H7a4 4 0 00-4 4v1m18 0v-1a4 4 0 00-3-3.9M14 4.1a4 4 0 010 7.8M9.5 10a3 3 0 100-6 3 3 0 000 6z" />
  ),
  user: () => (
    <>
      <Circle cx="12" cy="8" r="4" />
      <Path d="M4 21c1.5-4 4.5-6 8-6s6.5 2 8 6" />
    </>
  ),
  userPlus: () => (
    <>
      <Circle cx="9" cy="8" r="3.5" />
      <Path d="M2.5 20c1-3.5 3.5-5.5 6.5-5.5s5.5 2 6.5 5.5M19 8v6M16 11h6" />
    </>
  ),
  bell: () => <Path d="M6 8a6 6 0 1 1 12 0c0 7 3 9 3 9H3s3-2 3-9M10 21h4" />,
  back: () => <Path d="M15 5l-7 7 7 7" />,
  chevronRight: () => <Path d="M9 6l6 6-6 6" />,
  chevronDown: () => <Path d="M6 9l6 6 6-6" />,
  close: () => <Path d="M6 6l12 12M18 6 6 18" />,
  arrowDown: () => <Path d="M12 4v14M6 12l6 6 6-6" />,
  arrowUp: () => <Path d="M12 19V5m-6 6l6-6 6 6" />,
  arrowRight: () => <Path d="M5 12h14M13 6l6 6-6 6" />,
  arrowUpRight: () => <Path d="M3 17l6-6 4 4 8-8M15 7h6v6" />,
  arrowDownLeft: () => <Path d="M17 7 7 17M15 17H7V9" />,
  send: () => <Path d="M4 12l16-8-6 16-3-7-7-1z" />,
  box: () => (
    <Path d="M4 8l8-4 8 4-8 4-8-4zm0 0v8l8 4m-8-12l8 4m0 8l8-4V8m-8 12v-8" />
  ),
  lock: () => (
    <>
      <Rect x="4" y="11" width="16" height="10" rx="2" />
      <Path d="M8 11V7a4 4 0 0 1 8 0v4" />
    </>
  ),
  calendar: () => (
    <>
      <Rect x="3" y="5" width="18" height="16" rx="2" />
      <Path d="M3 10h18M8 3v4M16 3v4" />
    </>
  ),
  layers: () => <Path d="M12 3 2 8l10 5 10-5zM2 13l10 5 10-5" />,
  gift: () => (
    <>
      <Rect x="3" y="8" width="18" height="13" rx="2" />
      <Path d="M12 8v13M3 12h18M12 8C10 4 6 4 6 6.5S12 8 12 8zm0 0c2-4 6-4 6-1.5S12 8 12 8z" />
    </>
  ),
  plane: () => (
    <Path d="M17.8 19.2 16 11l3.5-3.5C21 6 21.5 4 21 3c-1-.5-3 0-4.5 1.5L13 8 4.8 6.2c-.5-.1-.9.1-1.1.5l-.3.5c-.2.5-.1 1 .3 1.3L9 12l-2 3H4l-1 1 3 2 2 3 1-1v-3l3-2 3.5 5.3c.3.4.8.5 1.3.3l.5-.2c.4-.3.6-.7.5-1.2z" />
  ),
  chat: () => <Path d="M21 12a8 8 0 0 1-11.6 7.1L4 20l1-4.6A8 8 0 1 1 21 12z" />,
  mail: () => (
    <>
      <Rect x="3" y="5" width="18" height="14" rx="2" />
      <Path d="M3 7l9 6 9-6" />
    </>
  ),
  copy: () => <Path d="M8 8h11v11H8zM5 16V5h11" />,
  share: () => (
    <>
      <Circle cx="18" cy="5" r="3" />
      <Circle cx="6" cy="12" r="3" />
      <Circle cx="18" cy="19" r="3" />
      <Path d="M8.6 10.5l6.8-4M8.6 13.5l6.8 4" />
    </>
  ),
  qr: () => (
    <>
      <Rect x="3" y="3" width="7" height="7" />
      <Rect x="14" y="3" width="7" height="7" />
      <Rect x="3" y="14" width="7" height="7" />
      <Path d="M14 14h3v3M21 14v7h-7" />
    </>
  ),
  shield: () => <Path d="M12 3l8 3v6c0 5-3.5 8-8 9-4.5-1-8-4-8-9V6z" />,
  eye: () => (
    <>
      <Path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12z" />
      <Circle cx="12" cy="12" r="3" />
    </>
  ),
  eyeOff: () => <Path d="M3 3l18 18M10.6 5.1A10 10 0 0 1 12 5c6.5 0 10 7 10 7a17 17 0 0 1-3.2 4.1M6.6 6.6C3.8 8.4 2 12 2 12s3.5 7 10 7a9.7 9.7 0 0 0 5.4-1.6M9.9 9.9a3 3 0 0 0 4.2 4.2" />,
  clock: () => (
    <>
      <Circle cx="12" cy="12" r="9" />
      <Path d="M12 7v5l3 2" />
    </>
  ),
  info: () => (
    <>
      <Circle cx="12" cy="12" r="9" />
      <Path d="M12 8v5M12 16.5v.5" />
    </>
  ),
  check: () => <Path d="M5 12l5 5 9-10" />,
  camera: () => (
    <>
      <Path d="M4 8h3l2-3h6l2 3h3v11H4z" />
      <Circle cx="12" cy="14" r="3.5" />
    </>
  ),
  image: () => (
    <>
      <Rect x="3" y="3" width="18" height="18" rx="2" />
      <Circle cx="9" cy="9" r="2" />
      <Path d="M21 15l-5-5L5 21" />
    </>
  ),
  edit: () => <Path d="M4 20h4L19 9l-4-4L4 16z" />,
  logout: () => <Path d="M15 4h4a1 1 0 0 1 1 1v14a1 1 0 0 1-1 1h-4M10 17l-5-5 5-5M5 12h11" />,
  file: () => <Path d="M6 3h9l4 4v14H6zM14 3v5h5M9 13h7M9 17h5" />,
  backspace: () => <Path d="M21 5H9l-6 7 6 7h12a1 1 0 0 0 1-1V6a1 1 0 0 0-1-1zM12 9l6 6M18 9l-6 6" />,
  diamond: () => <Path d="M12 2l9 10-9 10-9-10zM9 12h6M12 9v6" />,
  more: () => (
    <>
      <Circle cx="5" cy="12" r="1" />
      <Circle cx="12" cy="12" r="1" />
      <Circle cx="19" cy="12" r="1" />
    </>
  ),
};

export default function Icon({ name, size = 22, color = colors.text, strokeWidth = 1.8 }) {
  const draw = paths[name];
  if (!draw) {
    return null;
  }
  return (
    <Svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke={color}
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round">
      {draw()}
    </Svg>
  );
}
