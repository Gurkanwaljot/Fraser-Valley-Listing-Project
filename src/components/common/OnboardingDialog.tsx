import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Dialog from '@mui/material/Dialog';
import DialogContent from '@mui/material/DialogContent';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Button from '@mui/material/Button';
import Stack from '@mui/material/Stack';
import Stepper from '@mui/material/Stepper';
import Step from '@mui/material/Step';
import StepLabel from '@mui/material/StepLabel';
import CameraAltIcon from '@mui/icons-material/CameraAlt';
import PeopleIcon from '@mui/icons-material/People';
import ShareIcon from '@mui/icons-material/Share';
import { supabase } from '../../lib/supabase';

interface OnboardingDialogProps {
  open: boolean;
  onClose: () => void;
  userId: string;
}

const STEPS = [
  {
    label: 'Create a Listing',
    description: 'Add your first property with address, photos, and details. Your listings become beautiful public pages.',
    icon: CameraAltIcon,
    route: '/dashboard/listings/new',
  },
  {
    label: 'Add a Realtor',
    description: 'Add the realtors you work with. They can be assigned to listings and receive their own access links.',
    icon: PeopleIcon,
    route: '/dashboard/realtors/new',
  },
  {
    label: 'Share with Clients',
    description: 'Share listing links with realtors so they can view media, download assets, and track engagement.',
    icon: ShareIcon,
    route: null,
  },
];

export default function OnboardingDialog({ open, onClose, userId }: OnboardingDialogProps) {
  const [activeStep, setActiveStep] = useState(0);
  const navigate = useNavigate();

  const handleDismiss = async () => {
    await supabase
      .from('profiles')
      .update({ onboarding_completed_at: new Date().toISOString() } as never)
      .eq('id', userId);
    onClose();
  };

  const handleAction = () => {
    const route = STEPS[activeStep].route;
    handleDismiss();
    if (route) navigate(route);
  };

  const StepIcon = STEPS[activeStep].icon;

  return (
    <Dialog open={open} onClose={handleDismiss} maxWidth="sm" fullWidth>
      <DialogContent sx={{ p: { xs: 3, sm: 4 } }}>
        <Box sx={{ textAlign: 'center', mb: 3 }}>
          <Typography variant="h5" sx={{ fontWeight: 400, mb: 0.5 }}>
            Welcome to your dashboard
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Here is a quick overview to get you started.
          </Typography>
        </Box>

        <Stepper activeStep={activeStep} alternativeLabel sx={{ mb: 4 }}>
          {STEPS.map((step) => (
            <Step key={step.label}>
              <StepLabel>{step.label}</StepLabel>
            </Step>
          ))}
        </Stepper>

        <Box sx={{ textAlign: 'center', py: 2 }}>
          <StepIcon sx={{ fontSize: 48, color: 'primary.main', mb: 2 }} />
          <Typography variant="h6" sx={{ fontWeight: 400, mb: 1 }}>
            {STEPS[activeStep].label}
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ maxWidth: 360, mx: 'auto' }}>
            {STEPS[activeStep].description}
          </Typography>
        </Box>

        <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mt: 4 }}>
          <Button onClick={handleDismiss} color="inherit" size="small" sx={{ color: 'text.secondary' }}>
            Skip
          </Button>
          <Stack direction="row" spacing={1}>
            {activeStep > 0 && (
              <Button onClick={() => setActiveStep((s) => s - 1)} variant="outlined" size="small">
                Back
              </Button>
            )}
            {activeStep < STEPS.length - 1 ? (
              <Button onClick={() => setActiveStep((s) => s + 1)} variant="contained" size="small">
                Next
              </Button>
            ) : (
              <Button onClick={handleAction} variant="contained" size="small">
                Get Started
              </Button>
            )}
          </Stack>
        </Stack>
      </DialogContent>
    </Dialog>
  );
}
