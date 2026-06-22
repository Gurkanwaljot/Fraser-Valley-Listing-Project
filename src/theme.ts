import { createTheme } from '@mui/material/styles';

interface BrandPalette {
  navy: string;
  navyDeep: string;
  navySoft: string;
  red: string;
  redDeep: string;
  gold: string;
  goldBright: string;
  goldSoft: string;
  offWhite: string;
  cream: string;
  darkBg: string;
  charcoal: string;
}

declare module '@mui/material/styles' {
  interface Palette {
    accent: Palette['primary'];
    surface: { main: string; light: string; dark: string };
    brand: BrandPalette;
  }
  interface PaletteOptions {
    accent?: PaletteOptions['primary'];
    surface?: { main: string; light: string; dark: string };
    brand?: BrandPalette;
  }
  interface TypographyVariants {
    fontFamilyDisplay: string;
    fontFamilySerif: string;
  }
  interface TypographyVariantsOptions {
    fontFamilyDisplay?: string;
    fontFamilySerif?: string;
  }
}

declare module '@mui/material/Button' {
  interface ButtonPropsColorOverrides {
    accent: true;
  }
}

const SANS = '"Hanken Grotesk", "Helvetica Neue", Arial, sans-serif';
const DISPLAY = '"Fraunces", "Iowan Old Style", "Times New Roman", Georgia, serif';
const SERIF = '"Playfair Display", "Fraunces", "Times New Roman", Georgia, serif';

const BRAND: BrandPalette = {
  navy: '#1F2C3D',
  navyDeep: '#0F1825',
  navySoft: '#2C3B50',
  red: '#B91C1C',
  redDeep: '#7F1418',
  gold: '#C8A45D',
  goldBright: '#E0C07A',
  goldSoft: '#9A7A30',
  offWhite: '#F5F0E6',
  cream: '#EFE7D6',
  darkBg: '#0B0F16',
  charcoal: '#1A1E26',
};

const LH_DISPLAY = 1.1;
const LH_SUBHEAD = 1.3;
const LH_BODY = 1.6;

const flatShadows = Array.from({ length: 25 }, () => 'none') as unknown as [
  'none', 'none', 'none', 'none', 'none', 'none', 'none', 'none',
  'none', 'none', 'none', 'none', 'none', 'none', 'none', 'none',
  'none', 'none', 'none', 'none', 'none', 'none', 'none', 'none', 'none',
];

const theme = createTheme({
  palette: {
    mode: 'dark',
    primary: {
      main: '#C8A45D',
      light: '#D8B97A',
      dark: '#A68840',
      contrastText: '#0B0B0B',
    },
    secondary: {
      main: '#B8B2A7',
      light: '#D6D0C5',
      dark: '#8A847A',
      contrastText: '#0B0B0B',
    },
    accent: {
      main: '#C8A45D',
      light: '#D8B97A',
      dark: '#A68840',
      contrastText: '#0B0B0B',
    },
    surface: {
      main: '#141312',
      light: '#1C1A18',
      dark: '#0B0B0B',
    },
    brand: BRAND,
    background: {
      default: '#0B0B0B',
      paper: '#141312',
    },
    text: {
      primary: '#F5F2EC',
      secondary: '#B8B2A7',
      disabled: '#8A847A',
    },
    error: {
      main: '#C46B5A',
      light: '#D88876',
      dark: '#9B5345',
      contrastText: '#0B0B0B',
    },
    success: {
      main: '#6FA287',
      light: '#8DBBA1',
      dark: '#557E69',
      contrastText: '#0B0B0B',
    },
    warning: {
      main: '#D2A24C',
      light: '#DEB770',
      dark: '#A77F38',
      contrastText: '#0B0B0B',
    },
    info: {
      main: '#8FA9C0',
      light: '#ADC0D2',
      dark: '#6E8699',
      contrastText: '#0B0B0B',
    },
    divider: 'rgba(245, 242, 236, 0.08)',
    action: {
      active: 'rgba(245, 242, 236, 0.7)',
      hover: 'rgba(245, 242, 236, 0.04)',
      selected: 'rgba(200, 164, 93, 0.12)',
      disabled: 'rgba(245, 242, 236, 0.3)',
      disabledBackground: 'rgba(245, 242, 236, 0.08)',
    },
  },
  typography: {
    fontFamily: SANS,
    fontFamilyDisplay: DISPLAY,
    fontFamilySerif: SERIF,
    fontWeightLight: 400,
    fontWeightRegular: 400,
    fontWeightMedium: 500,
    fontWeightBold: 600,
    h1: {
      fontFamily: DISPLAY,
      fontSize: 'clamp(2.5rem, 1.6rem + 4.5vw, 4.5rem)',
      fontWeight: 500,
      letterSpacing: '-0.02em',
      lineHeight: LH_DISPLAY,
    },
    h2: {
      fontFamily: DISPLAY,
      fontSize: 'clamp(2rem, 1.4rem + 3vw, 3.25rem)',
      fontWeight: 500,
      letterSpacing: '-0.015em',
      lineHeight: LH_DISPLAY,
    },
    h3: {
      fontFamily: DISPLAY,
      fontSize: 'clamp(1.5rem, 1.15rem + 1.75vw, 2.25rem)',
      fontWeight: 500,
      letterSpacing: '-0.01em',
      lineHeight: LH_SUBHEAD,
    },
    h4: {
      fontFamily: SANS,
      fontSize: 'clamp(1.25rem, 1.05rem + 1vw, 1.75rem)',
      fontWeight: 500,
      letterSpacing: '-0.005em',
      lineHeight: LH_SUBHEAD,
    },
    h5: {
      fontFamily: SANS,
      fontSize: 'clamp(1.125rem, 1rem + 0.5vw, 1.375rem)',
      fontWeight: 500,
      lineHeight: LH_SUBHEAD,
    },
    h6: {
      fontFamily: SANS,
      fontSize: '1rem',
      fontWeight: 600,
      lineHeight: LH_SUBHEAD,
      letterSpacing: '0.01em',
    },
    subtitle1: {
      fontFamily: SANS,
      fontSize: '1.0625rem',
      fontWeight: 500,
      letterSpacing: '0.005em',
      lineHeight: LH_BODY,
    },
    subtitle2: {
      fontFamily: SANS,
      fontSize: '0.875rem',
      fontWeight: 500,
      letterSpacing: '0.01em',
      lineHeight: LH_BODY,
    },
    body1: {
      fontFamily: SANS,
      fontSize: '1rem',
      fontWeight: 400,
      lineHeight: LH_BODY,
      letterSpacing: '0.005em',
    },
    body2: {
      fontFamily: SANS,
      fontSize: '0.9375rem',
      fontWeight: 400,
      lineHeight: LH_BODY,
      letterSpacing: '0.005em',
    },
    button: {
      fontFamily: SANS,
      textTransform: 'none' as const,
      fontWeight: 500,
      letterSpacing: '0.01em',
      lineHeight: LH_SUBHEAD,
    },
    caption: {
      fontFamily: SANS,
      fontSize: '0.8125rem',
      fontWeight: 400,
      letterSpacing: '0.02em',
      lineHeight: LH_BODY,
    },
    overline: {
      fontFamily: SANS,
      fontSize: '0.75rem',
      fontWeight: 600,
      letterSpacing: '0.14em',
      textTransform: 'uppercase' as const,
      lineHeight: LH_SUBHEAD,
    },
  },
  shape: {
    borderRadius: 8,
  },
  shadows: flatShadows,
  components: {
    MuiCssBaseline: {
      styleOverrides: {
        body: {
          backgroundColor: '#0B0B0B',
          scrollBehavior: 'smooth',
          fontFeatureSettings: '"ss01", "cv11"',
        },
        '::-webkit-scrollbar': {
          width: '6px',
        },
        '::-webkit-scrollbar-track': {
          background: '#141312',
        },
        '::-webkit-scrollbar-thumb': {
          background: 'rgba(245, 242, 236, 0.12)',
          borderRadius: '3px',
        },
        '::-webkit-scrollbar-thumb:hover': {
          background: 'rgba(245, 242, 236, 0.2)',
        },
      },
    },
    MuiButton: {
      defaultProps: {
        disableElevation: true,
      },
      styleOverrides: {
        root: {
          borderRadius: 6,
          padding: '10px 24px',
          fontSize: '0.9375rem',
          fontWeight: 500,
        },
        contained: {
          boxShadow: 'none',
          '&:hover': {
            boxShadow: 'none',
          },
        },
        outlined: {
          borderColor: 'rgba(245, 242, 236, 0.16)',
          '&:hover': {
            borderColor: 'rgba(245, 242, 236, 0.28)',
            backgroundColor: 'rgba(245, 242, 236, 0.04)',
          },
        },
      },
    },
    MuiPaper: {
      defaultProps: {
        elevation: 0,
      },
      styleOverrides: {
        root: {
          backgroundImage: 'none',
          border: '1px solid rgba(245, 242, 236, 0.06)',
          boxShadow: 'none',
        },
      },
    },
    MuiCard: {
      defaultProps: {
        elevation: 0,
      },
      styleOverrides: {
        root: {
          backgroundImage: 'none',
          border: '1px solid rgba(245, 242, 236, 0.06)',
          boxShadow: 'none',
        },
      },
    },
    MuiAppBar: {
      defaultProps: {
        elevation: 0,
      },
      styleOverrides: {
        root: {
          backgroundColor: 'rgba(11, 11, 11, 0.85)',
          backdropFilter: 'blur(12px)',
          borderBottom: '1px solid rgba(245, 242, 236, 0.06)',
          boxShadow: 'none',
        },
      },
    },
    MuiTextField: {
      defaultProps: {
        variant: 'outlined',
        size: 'medium',
      },
    },
    MuiOutlinedInput: {
      styleOverrides: {
        root: {
          '& .MuiOutlinedInput-notchedOutline': {
            borderColor: 'rgba(245, 242, 236, 0.16)',
          },
          '&:hover .MuiOutlinedInput-notchedOutline': {
            borderColor: 'rgba(245, 242, 236, 0.28)',
          },
        },
      },
    },
    MuiDivider: {
      styleOverrides: {
        root: {
          borderColor: 'rgba(245, 242, 236, 0.06)',
        },
      },
    },
    MuiDrawer: {
      styleOverrides: {
        paper: {
          backgroundColor: '#0B0B0B',
          borderRight: '1px solid rgba(245, 242, 236, 0.06)',
        },
      },
    },
    MuiChip: {
      styleOverrides: {
        root: {
          borderRadius: 6,
          fontWeight: 500,
        },
        outlined: {
          borderColor: 'rgba(245, 242, 236, 0.16)',
        },
      },
    },
    MuiTooltip: {
      styleOverrides: {
        tooltip: {
          backgroundColor: '#1C1A18',
          border: '1px solid rgba(245, 242, 236, 0.08)',
          fontSize: '0.8125rem',
          fontWeight: 400,
        },
      },
    },
    MuiSkeleton: {
      styleOverrides: {
        root: {
          backgroundColor: 'rgba(245, 242, 236, 0.06)',
        },
      },
    },
  },
});

export default theme;
