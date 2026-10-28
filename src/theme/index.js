/**
 * Design tokens for the whole app (colors, fonts, spacing, radius).
 * Every screen/component imports from here, so changing a value here
 * restyles the entire app. Values match the "Finitygrowth App v2" design.
 */

export const colors = {
  // Backgrounds (darkest → lighter)
  bg: '#07080c', // common screen background (StatusBar, Screen, navigators)
  surface: '#0F1118',
  surfaceAlt: '#12141C',
  elevated: '#151822',
  pressed: '#232733',
  line: '#1B1E28',
  lineStrong: '#2A2E3A',

  // Text
  text: '#EEF0F5',
  textSoft: '#C9CEDA',
  muted: '#9AA1B2',
  subtle: '#8A91A2',
  placeholder: '#6B7282',

  // Brand
  gold: '#E3B96E',
  goldDeep: '#B98B45',
  goldDark: '#7A5E33',
  goldInk: '#16110A', // text placed on gold
  goldSoft: 'rgba(227,185,110,0.14)',
  goldLine: 'rgba(227,185,110,0.4)',

  // Status
  success: '#7FD39C',
  successSoft: 'rgba(110,201,140,0.12)',
  warning: '#F2A65A',
  warningSoft: 'rgba(242,166,90,0.12)',
  danger: '#F28B82',
  info: '#6E8BC9', // used for "Level income" series in charts
};

/** Font family names = the PostScript names of the files in assets/fonts. */
export const fonts = {
  regular: 'Inter-Regular',
  medium: 'Inter-Medium',
  semibold: 'Inter-SemiBold',
  bold: 'Inter-Bold',
  display: 'PlusJakartaSans-Bold',
  displaySemi: 'PlusJakartaSans-SemiBold',
  serif: 'InstrumentSerif-Regular',
  serifItalic: 'InstrumentSerif-Italic',
  mono: 'Menlo',
};

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 28,
  screen: 20, // left/right padding of every screen
};

export const radius = {
  sm: 10,
  md: 14,
  lg: 18,
  xl: 24,
  pill: 999,
};

/** Text presets: spread into a style, e.g. <Text style={[type.h1, {...}]}> */
export const type = {
  hero: { fontFamily: fonts.display, fontSize: 40, color: colors.text, letterSpacing: -0.6 },
  h1: { fontFamily: fonts.display, fontSize: 24, color: colors.text, letterSpacing: -0.3 },
  h2: { fontFamily: fonts.semibold, fontSize: 15, color: colors.text },
  title: { fontFamily: fonts.display, fontSize: 18, color: colors.text },
  serif: { fontFamily: fonts.serif, fontSize: 32, color: colors.text },
  body: { fontFamily: fonts.regular, fontSize: 14, color: colors.textSoft, lineHeight: 21 },
  small: { fontFamily: fonts.regular, fontSize: 12, color: colors.muted, lineHeight: 18 },
  tiny: { fontFamily: fonts.regular, fontSize: 11, color: colors.subtle, lineHeight: 16 },
  label: { fontFamily: fonts.medium, fontSize: 12, color: colors.muted },
  number: { fontFamily: fonts.display, fontSize: 18, color: colors.text },
};

export default { colors, fonts, spacing, radius, type };
