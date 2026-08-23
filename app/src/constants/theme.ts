import '@/global.css';

// Cores extraidas da logo (ver spec do projeto secao 3)
export const Brand = {
  laranja: '#FA4F17',
  pessego: '#FEA78B',
  branco: '#FFFFFF',
} as const;

export const Colors = {
  light: {
    text: '#211714',
    textSecondary: '#7A6B65',
    background: '#FFFFFF',
    backgroundElement: '#FFF3EE',
    backgroundSelected: '#FFE3D6',
    border: '#F0DCD3',
    primary: Brand.laranja,
    primaryText: '#FFFFFF',
    secondary: Brand.pessego,
    secondaryText: '#4A2A1C',
    danger: '#D6392B',
    success: '#2E8B57',
  },
  dark: {
    text: '#FFF7F4',
    textSecondary: '#D8C3BA',
    background: '#1C1310',
    backgroundElement: '#2A1D18',
    backgroundSelected: '#3A2620',
    border: '#3D2B24',
    primary: Brand.laranja,
    primaryText: '#FFFFFF',
    secondary: Brand.pessego,
    secondaryText: '#2A1710',
    danger: '#FF6B5E',
    success: '#4CBE7E',
  },
} as const;

export type ThemeColor = keyof typeof Colors.light & keyof typeof Colors.dark;

// Poppins pro corpo do texto, Fraunces (serifada arredondada) nos momentos de marca
// (titulos), aproximando a tipografia da logo — ver spec secao 3. Carregadas via
// @expo-google-fonts em src/app/_layout.tsx.
export const Fonts = {
  sans: 'Poppins_400Regular',
  sansMedium: 'Poppins_500Medium',
  sansSemiBold: 'Poppins_600SemiBold',
  sansBold: 'Poppins_700Bold',
  brand: 'Fraunces_600SemiBold',
  mono: 'monospace',
} as const;

export const Spacing = {
  half: 2,
  one: 4,
  two: 8,
  three: 16,
  four: 24,
  five: 32,
  six: 64,
} as const;

export const Radius = {
  small: 8,
  medium: 14,
  large: 24,
  pill: 999,
} as const;

export const BottomTabInset = 24;
export const MaxContentWidth = 800;
