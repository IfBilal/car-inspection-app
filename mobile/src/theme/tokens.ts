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
  primary: '#DC2626',
  primaryPressed: '#B91C1C',
  primarySoft: '#FEE2E2',
  primaryText: '#7F1D1D',

  canvas: '#F8F7F7',
  surface: '#FFFFFF',
  surfaceRaised: '#FFFFFF',
  border: '#E9E6E6',
  divider: '#F1EFEF',

  textPrimary: '#1D1717',
  textSecondary: '#665C5C',
  textTertiary: '#948B8B',
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
  primary: '#EF4444',
  primaryPressed: '#DC2626',
  primarySoft: '#7F1D1D33',
  primaryText: '#FECACA',

  canvas: '#0F0C0C',
  surface: '#1A1616',
  surfaceRaised: '#231D1D',
  border: '#322A2A',
  divider: '#282222',

  textPrimary: '#F5F2F2',
  textSecondary: '#B0A7A7',
  textTertiary: '#776E6E',
  textOnPrimary: '#2E0505',

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
    shadowColor: '#1D1717',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  sheet: {
    shadowColor: '#1D1717',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.16,
    shadowRadius: 28,
    elevation: 12,
  },
} as const;
