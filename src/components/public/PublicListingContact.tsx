import { useState, useRef } from 'react';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Grid from '@mui/material/Grid';
import Avatar from '@mui/material/Avatar';
import Stack from '@mui/material/Stack';
import Button from '@mui/material/Button';
import TextField from '@mui/material/TextField';
import IconButton from '@mui/material/IconButton';
import Alert from '@mui/material/Alert';
import PhoneIcon from '@mui/icons-material/Phone';
import EmailIcon from '@mui/icons-material/Email';
import LanguageIcon from '@mui/icons-material/Language';
import SendIcon from '@mui/icons-material/Send';
import { motion } from 'framer-motion';
import { trackListingEvent, submitLead } from '../../services/publicListingService';
import SectionReveal from './SectionReveal';
import type { Listing, Realtor } from '../../types/database';

interface Props {
  listing: Listing;
  realtors: Realtor[];
  primaryRealtor: Realtor | null;
}

export default function PublicListingContact({ listing, realtors, primaryRealtor }: Props) {
  if (realtors.length === 0) return null;

  const orderedRealtors = primaryRealtor
    ? [primaryRealtor, ...realtors.filter((r) => r.id !== primaryRealtor.id)]
    : realtors;

  const leadRealtorId = primaryRealtor?.id || realtors[0].id;

  return (
    <SectionReveal>
      <Typography
        variant="overline"
        sx={{ color: 'primary.main', mb: 1, display: 'block', letterSpacing: '0.15em' }}
      >
        Get in Touch
      </Typography>
      <Typography variant="h3" sx={{ color: 'text.primary', mb: 4, fontWeight: 400 }}>
        Contact
      </Typography>

      <Grid container spacing={{ xs: 4, md: 5 }}>
        <Grid size={{ xs: 12, md: 5 }}>
          <Stack spacing={2}>
            {orderedRealtors.map((r) => (
              <RealtorCard key={r.id} realtor={r} listingId={listing.id} />
            ))}
          </Stack>
        </Grid>
        <Grid size={{ xs: 12, md: 7 }}>
          <LeadForm listing={listing} realtors={realtors} realtorId={leadRealtorId} />
        </Grid>
      </Grid>
    </SectionReveal>
  );
}

function RealtorCard({
  realtor,
  listingId,
}: {
  realtor: Realtor;
  listingId: string;
}) {
  const handleContact = (type: 'phone' | 'email' | 'website') => {
    trackListingEvent(listingId, 'realtor_contact_click', { realtor_id: realtor.id, type });
  };

  return (
    <Box
      sx={{
        p: { xs: 2.5, md: 3 },
        bgcolor: 'rgba(255, 255, 255, 0.02)',
        borderRadius: 1,
        borderLeft: '2px solid',
        borderColor: 'primary.main',
        display: 'flex',
        flexDirection: 'row',
        alignItems: 'flex-start',
        gap: 2.5,
      }}
    >
      <Avatar
        src={realtor.headshot_url || undefined}
        sx={{
          width: { xs: 80, md: 100 },
          height: { xs: 80, md: 100 },
          bgcolor: 'primary.dark',
          fontSize: '2rem',
          fontWeight: 400,
          flexShrink: 0,
        }}
      >
        {realtor.full_name.charAt(0)}
      </Avatar>

      <Box sx={{ flex: 1, minWidth: 0 }}>
        <Typography
          variant="h5"
          sx={{ color: 'text.primary', fontWeight: 400, fontSize: { xs: '1.1rem', md: '1.3rem' } }}
        >
          {realtor.full_name}
        </Typography>
        {realtor.brokerage && (
          <Typography variant="caption" sx={{ color: 'text.secondary', display: 'block', fontWeight: 400 }}>
            {realtor.brokerage}
          </Typography>
        )}

        <Stack direction="row" spacing={1} sx={{ mt: 1.5 }}>
          {realtor.phone && (
            <IconButton
              component="a"
              href={`tel:${realtor.phone}`}
              onClick={() => handleContact('phone')}
              size="small"
              sx={{
                color: 'text.secondary',
                border: '1px solid',
                borderColor: 'divider',
                width: 32,
                height: 32,
                '&:hover': { color: 'primary.main', borderColor: 'primary.main' },
                transition: (theme) => theme.transitions.create(['color', 'border-color'], {
                  duration: theme.transitions.duration.shorter,
                }),
              }}
            >
              <PhoneIcon sx={{ fontSize: 16 }} />
            </IconButton>
          )}
          {realtor.email && (
            <IconButton
              component="a"
              href={`mailto:${realtor.email}`}
              onClick={() => handleContact('email')}
              size="small"
              sx={{
                color: 'text.secondary',
                border: '1px solid',
                borderColor: 'divider',
                width: 32,
                height: 32,
                '&:hover': { color: 'primary.main', borderColor: 'primary.main' },
                transition: (theme) => theme.transitions.create(['color', 'border-color'], {
                  duration: theme.transitions.duration.shorter,
                }),
              }}
            >
              <EmailIcon sx={{ fontSize: 16 }} />
            </IconButton>
          )}
          {realtor.website_url && (
            <IconButton
              component="a"
              href={realtor.website_url}
              target="_blank"
              rel="noopener noreferrer"
              onClick={() => handleContact('website')}
              size="small"
              sx={{
                color: 'text.secondary',
                border: '1px solid',
                borderColor: 'divider',
                width: 32,
                height: 32,
                '&:hover': { color: 'primary.main', borderColor: 'primary.main' },
                transition: (theme) => theme.transitions.create(['color', 'border-color'], {
                  duration: theme.transitions.duration.shorter,
                }),
              }}
            >
              <LanguageIcon sx={{ fontSize: 16 }} />
            </IconButton>
          )}
        </Stack>

        {realtor.bio && (
          <Typography
            variant="body2"
            sx={{
              color: 'text.secondary',
              mt: 1.5,
              lineHeight: 1.6,
              fontWeight: 400,
              fontSize: '0.8rem',
              overflow: 'hidden',
              display: '-webkit-box',
              WebkitLineClamp: 3,
              WebkitBoxOrient: 'vertical',
            }}
          >
            {realtor.bio}
          </Typography>
        )}
      </Box>
    </Box>
  );
}

function LeadForm({ listing, realtors, realtorId }: { listing: Listing; realtors: Realtor[]; realtorId: string }) {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [message, setMessage] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [honeypot, setHoneypot] = useState('');
  const renderTime = useRef(Date.now());

  const isValidEmail = (v: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);
  const isFormValid = name.trim() && email.trim() && phone.trim() && isValidEmail(email.trim());

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (honeypot) return;
    if (Date.now() - renderTime.current < 3000) {
      setError('Please wait a moment before submitting.');
      return;
    }
    if (!isFormValid) return;

    setSubmitting(true);
    setError(null);

    const result = await submitLead({
      listingId: listing.id,
      realtorId,
      name: name.trim(),
      email: email.trim(),
      phone: phone.trim(),
      message: message.trim() || null,
      listing,
      realtors,
    });

    setSubmitting(false);
    if (result.success) {
      setSubmitted(true);
    } else {
      setError(result.error || 'Failed to submit. Please try again.');
    }
  };

  if (submitted) {
    return (
      <Box
        component={motion.div}
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
        sx={{ py: 6, textAlign: 'center' }}
      >
        <Box sx={{ width: 48, height: '1px', bgcolor: 'primary.main', mx: 'auto', mb: 3 }} />
        <Typography variant="h5" sx={{ color: 'text.primary', mb: 1.5, fontWeight: 400 }}>
          Message Sent
        </Typography>
        <Typography variant="body1" sx={{ color: 'text.secondary', fontWeight: 400 }}>
          Thank you for your interest. The realtor will be in touch shortly.
        </Typography>
      </Box>
    );
  }

  return (
    <Box component="form" onSubmit={handleSubmit}>
      <Typography
        variant="overline"
        sx={{ color: 'text.secondary', mb: 3, display: 'block', letterSpacing: '0.1em' }}
      >
        Send a Message
      </Typography>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      {/* Honeypot field - hidden from real users */}
      <Box
        component="input"
        type="text"
        name="website_url"
        value={honeypot}
        onChange={(e: React.ChangeEvent<HTMLInputElement>) => setHoneypot(e.target.value)}
        tabIndex={-1}
        autoComplete="off"
        sx={{ position: 'absolute', left: '-9999px', opacity: 0, height: 0, width: 0 }}
      />

      <Stack spacing={2.5}>
        <TextField
          label="Your Name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
          fullWidth
        />
        <Grid container spacing={2}>
          <Grid size={{ xs: 12, sm: 6 }}>
            <TextField
              label="Email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              fullWidth
              error={!!email.trim() && !isValidEmail(email.trim())}
              helperText={email.trim() && !isValidEmail(email.trim()) ? 'Enter a valid email' : undefined}
            />
          </Grid>
          <Grid size={{ xs: 12, sm: 6 }}>
            <TextField
              label="Phone"
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              required
              fullWidth
            />
          </Grid>
        </Grid>
        <TextField
          label="Message"
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          multiline
          rows={4}
          fullWidth
          placeholder="I'm interested in this property..."
        />
        <Button
          type="submit"
          variant="contained"
          color="primary"
          size="large"
          disabled={submitting || !isFormValid}
          endIcon={<SendIcon />}
          sx={{
            alignSelf: { xs: 'stretch', sm: 'flex-start' },
            px: 4,
            fontWeight: 400,
            letterSpacing: '0.03em',
          }}
        >
          {submitting ? 'Sending...' : 'Send Message'}
        </Button>
      </Stack>
    </Box>
  );
}
