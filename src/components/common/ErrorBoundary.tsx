import { Component, type ReactNode } from 'react';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Button from '@mui/material/Button';

interface Props {
  children: ReactNode;
  fallbackTitle?: string;
}

interface State {
  hasError: boolean;
}

export class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError(): State {
    return { hasError: true };
  }

  handleReset = () => {
    this.setState({ hasError: false });
  };

  render() {
    if (this.state.hasError) {
      return (
        <Box
          sx={{
            py: { xs: 8, md: 12 },
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexDirection: 'column',
            gap: 2,
            minHeight: 300,
          }}
        >
          <Box sx={{ width: 40, height: '1px', bgcolor: 'error.main', opacity: 0.5, mb: 1 }} />
          <Typography variant="h5" sx={{ color: 'text.primary', fontWeight: 400 }}>
            {this.props.fallbackTitle || 'Something went wrong'}
          </Typography>
          <Typography variant="body2" sx={{ color: 'text.secondary', fontWeight: 400 }}>
            An unexpected error occurred in this section.
          </Typography>
          <Button
            variant="outlined"
            size="small"
            onClick={this.handleReset}
            sx={{
              mt: 1,
              borderColor: 'divider',
              color: 'text.secondary',
              '&:hover': { borderColor: 'primary.main', color: 'primary.main' },
            }}
          >
            Try Again
          </Button>
        </Box>
      );
    }

    return this.props.children;
  }
}

export function PageErrorBoundary({ children }: { children: ReactNode }) {
  return (
    <ErrorBoundary fallbackTitle="Page failed to load">
      {children}
    </ErrorBoundary>
  );
}
