export type ColorTokens = {
  primary: string;
  primaryPressed: string;
  primarySoft: string;
  primaryText: string;

  canvas: string;
  surface: string;
  surfaceRaised: string;
  border: string;
  divider: string;

  textPrimary: string;
  textSecondary: string;
  textTertiary: string;
  textOnPrimary: string;

  pass: string;
  passSoft: string;
  fail: string;
  failSoft: string;
  repair: string;
  repairSoft: string;
  na: string;
  naSoft: string;
  info: string;
  gold: string;
};

export const lightColors: ColorTokens = {
  primary: '#16A34A',
  primaryPressed: '#15803D',
  primarySoft: '#DCFCE7',
  primaryText: '#14532D',

  canvas: '#F7F8F7',
  surface: '#FFFFFF',
  surfaceRaised: '#FFFFFF',
  border: '#E6E9E6',
  divider: '#EFF1EF',

  textPrimary: '#171D19',
  textSecondary: '#5C665F',
  textTertiary: '#8B948D',
  textOnPrimary: '#FFFFFF',

  pass: '#16A34A',
  passSoft: '#DCFCE7',
  fail: '#DC2626',
  failSoft: '#FEE2E2',
  repair: '#D97706',
  repairSoft: '#FEF3C7',
  na: '#8B948D',
  naSoft: '#EFF1EF',
  info: '#2563EB',
  gold: '#F59E0B',
};

export const darkColors: ColorTokens = {
  primary: '#22C55E',
  primaryPressed: '#16A34A',
  primarySoft: '#14532D33',
  primaryText: '#BBF7D0',

  canvas: '#0C0F0D',
  surface: '#161A17',
  surfaceRaised: '#1D231F',
  border: '#2A322C',
  divider: '#222824',

  textPrimary: '#F2F5F2',
  textSecondary: '#A7B0A9',
  textTertiary: '#6E776F',
  textOnPrimary: '#052E12',

  pass: '#22C55E',
  passSoft: '#14532D4D',
  fail: '#F87171',
  failSoft: '#7F1D1D4D',
  repair: '#FBBF24',
  repairSoft: '#78350F4D',
  na: '#6E776F',
  naSoft: '#222824',
  info: '#60A5FA',
  gold: '#F59E0B',
};

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
  xxxl: 32,
  huge: 40,
  /** default horizontal screen gutter */
  gutter: 20,
} as const;

export const radii = {
  input: 14,
  button: 14,
  card: 20,
  sheet: 28,
  photo: 12,
  full: 999,
} as const;

export const type = {
  display: { fontSize: 32, lineHeight: 38, fontFamily: 'Inter_700Bold', letterSpacing: -0.6 },
  title1: { fontSize: 24, lineHeight: 30, fontFamily: 'Inter_700Bold', letterSpacing: -0.4 },
  title2: { fontSize: 20, lineHeight: 26, fontFamily: 'Inter_600SemiBold' },
  body: { fontSize: 16, lineHeight: 24, fontFamily: 'Inter_400Regular' },
  bodyStrong: { fontSize: 16, lineHeight: 24, fontFamily: 'Inter_600SemiBold' },
  caption: { fontSize: 13, lineHeight: 18, fontFamily: 'Inter_500Medium' },
  micro: {
    fontSize: 11,
    lineHeight: 14,
    fontFamily: 'Inter_600SemiBold',
    letterSpacing: 0.5,
    textTransform: 'uppercase' as const,
  },
} as const;

export type TypeVariant = keyof typeof type;

export const shadows = {
  card: {
    shadowColor: '#171D19',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  sheet: {
    shadowColor: '#171D19',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.16,
    shadowRadius: 28,
    elevation: 12,
  },
} as const;
