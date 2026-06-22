import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import Box from '@mui/material/Box';
import Grid from '@mui/material/Grid';
import Typography from '@mui/material/Typography';
import Button from '@mui/material/Button';
import Stack from '@mui/material/Stack';
import Paper from '@mui/material/Paper';
import Chip from '@mui/material/Chip';
import CircularProgress from '@mui/material/CircularProgress';
import Alert from '@mui/material/Alert';
import Badge from '@mui/material/Badge';
import CardActionArea from '@mui/material/CardActionArea';
import DownloadIcon from '@mui/icons-material/Download';
import CheckIcon from '@mui/icons-material/Check';
import { motion, AnimatePresence } from 'framer-motion';
import type { MarketingListingData } from '../../services/marketingService';
import { trackMarketingEvent } from '../../services/marketingAnalyticsService';
import {
  STATUS_OPTIONS,
  getStatusOption,
  type PostStatus,
  type PostTemplateProps,
} from './socialPosts/templateTypes';
import { TEMPLATES, getTemplateById } from './socialPosts/templates';
import { LUXE_THEMES, getThemeById } from './socialPosts/theme';
import StepCard from './socialPosts/StepCard';
import TemplatePreview from './socialPosts/components/TemplatePreview';
import { SocialPostPreview, SocialPostExportNode } from './socialPosts/SocialPostFrame';
import { exportNodeToPng, preloadImagesAsDataUrls } from './socialPosts/exportNodeToPng';

interface SocialPostsTabProps {
  data: MarketingListingData;
}

type Step = 1 | 2 | 3;

const PREVIEW_DISPLAY_WIDTH = 480;
const PICKER_THUMB_WIDTH = 220;

export default function SocialPostsTab({ data }: SocialPostsTabProps) {
  const [currentStep, setCurrentStep] = useState<Step>(1);
  const [templateId, setTemplateId] = useState<string | null>(null);
  const [selectedPalette, setSelectedPalette] = useState<string>('ivory');
  const [status, setStatus] = useState<PostStatus | null>(null);
  const [selectedPhotoIndices, setSelectedPhotoIndices] = useState<number[]>([]);
  const [imageMap, setImageMap] = useState<Map<string, string>>(() => new Map());
  const [downloading, setDownloading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const exportRef = useRef<HTMLDivElement | null>(null);

  const primaryRealtor = data.realtors[0];
  const template = getTemplateById(templateId);
  const statusOption = getStatusOption(status);

  const minPhotos = template?.minPhotos ?? 1;
  const maxPhotos = template?.maxPhotos ?? 1;

  const previewProps: PostTemplateProps | null = useMemo(() => {
    if (!template || !primaryRealtor || !status) return null;
    const photos = selectedPhotoIndices.length > 0
      ? selectedPhotoIndices.map((i) => data.photos[i]).filter(Boolean)
      : data.photos.slice(0, Math.min(template.maxPhotos, data.photos.length));
    return {
      listing: data.listing,
      photos,
      realtor: primaryRealtor,
      status,
      imageMap,
      theme: getThemeById(selectedPalette),
    };
  }, [template, primaryRealtor, status, selectedPhotoIndices, data, imageMap, selectedPalette]);

  const samplePreviewProps = useCallback(
    (tpl: typeof TEMPLATES[number]): PostTemplateProps | null => {
      if (!primaryRealtor) return null;
      return {
        listing: data.listing,
        photos: data.photos.slice(0, Math.min(tpl.maxPhotos, data.photos.length)),
        realtor: primaryRealtor,
        status: status ?? 'for-sale',
        imageMap,
        theme: getThemeById(tpl.defaultPalette),
      };
    },
    [primaryRealtor, data, status, imageMap],
  );

  useEffect(() => {
    let cancelled = false;
    const urls = new Set<string>();
    data.photos.forEach((p) => {
      const u = p.public_url || p.large_url || p.thumbnail_url;
      if (u) urls.add(u);
    });
    if (primaryRealtor?.headshot_url) urls.add(primaryRealtor.headshot_url);
    if (primaryRealtor?.brokerage_logo_url) urls.add(primaryRealtor.brokerage_logo_url);
    if (urls.size === 0) return;

    preloadImagesAsDataUrls(Array.from(urls))
      .then((map) => {
        if (!cancelled) setImageMap(map);
      })
      .catch(() => {});

    return () => {
      cancelled = true;
    };
  }, [data, primaryRealtor]);

  const handleSelectTemplate = useCallback(
    (id: string) => {
      const tpl = getTemplateById(id);
      if (!tpl) return;
      setTemplateId(id);
      setSelectedPalette(tpl.defaultPalette);
      setSelectedPhotoIndices([]);
      setCurrentStep(status ? 3 : 2);
    },
    [status],
  );

  const handleSelectStatus = useCallback((value: PostStatus) => {
    setStatus(value);
    setCurrentStep(3);
  }, []);

  const handleTogglePhoto = useCallback(
    (idx: number) => {
      if (!template) return;
      setSelectedPhotoIndices((prev) => {
        if (prev.includes(idx)) return prev.filter((i) => i !== idx);
        if (prev.length >= template.maxPhotos) return [...prev.slice(1), idx];
        return [...prev, idx];
      });
    },
    [template],
  );

  const editStep = useCallback((step: Step) => {
    setCurrentStep(step);
    if (step === 1) {
      setTemplateId(null);
      setStatus(null);
      setSelectedPhotoIndices([]);
    } else if (step === 2) {
      setStatus(null);
    }
  }, []);

  const step1Done = !!template;
  const step2Done = !!status;
  const step3Done = !!template && selectedPhotoIndices.length >= minPhotos;
  const allDone = step1Done && step2Done && step3Done;

  const handleDownload = async () => {
    if (!exportRef.current || !template || !statusOption) return;
    setDownloading(true);
    setError(null);
    try {
      const slugBase = data.listing.slug || 'listing';
      const filename = `${slugBase}-${template.id}-${statusOption.value}.png`;
      await exportNodeToPng(exportRef.current, { filename, scale: 2 });
      trackMarketingEvent(data.listing.id, 'social_post_export', {
        template: template.id,
        status: statusOption.value,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Export failed');
    }
    setDownloading(false);
  };

  if (!primaryRealtor) {
    return (
      <Box sx={{ textAlign: 'center', py: 8 }}>
        <Typography variant="body1" sx={{ color: 'text.secondary' }}>
          No realtor assigned to this listing.
        </Typography>
      </Box>
    );
  }

  if (data.photos.length === 0) {
    return (
      <Box sx={{ textAlign: 'center', py: 8 }}>
        <Typography variant="body1" sx={{ color: 'text.secondary' }}>
          No photos available for this listing.
        </Typography>
      </Box>
    );
  }

  return (
    <Box>
      <Typography variant="body1" sx={{ color: 'text.secondary', mb: 3 }}>
        Build a branded social post in three steps. Each selection unlocks the next.
      </Typography>

      <Stack spacing={2.5}>
        <StepCard
          stepNumber={1}
          title="Choose a Template"
          expanded={currentStep === 1}
          completed={step1Done}
          summary={template ? <Chip size="small" label={template.name} color="primary" variant="outlined" /> : null}
          onEdit={step1Done ? () => editStep(1) : undefined}
        >
          <Grid container spacing={2.5}>
            {TEMPLATES.map((tpl) => {
              const selected = templateId === tpl.id;
              const sample = samplePreviewProps(tpl);
              return (
                <Grid key={tpl.id} size={{ xs: 12, sm: 6, md: 3 }}>
                  <CardActionArea
                    onClick={() => handleSelectTemplate(tpl.id)}
                    sx={{
                      borderRadius: 2,
                      p: 1.25,
                      border: 2,
                      borderColor: selected ? 'primary.main' : 'transparent',
                      bgcolor: selected ? 'action.selected' : 'transparent',
                      transition: (t) => t.transitions.create(['border-color', 'background-color']),
                      '&:hover': { borderColor: selected ? 'primary.main' : 'divider' },
                    }}
                  >
                    <Stack spacing={1.25} alignItems="center">
                      <Box
                        sx={{
                          width: PICKER_THUMB_WIDTH,
                          aspectRatio: '1080 / 1350',
                          backgroundColor: 'grey.900',
                          borderRadius: 1,
                          overflow: 'hidden',
                          position: 'relative',
                        }}
                      >
                        {sample ? (
                          <TemplatePreview
                            template={tpl}
                            templateProps={sample}
                            width={PICKER_THUMB_WIDTH}
                          />
                        ) : (
                          <Box
                            sx={{
                              position: 'absolute',
                              inset: 0,
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                            }}
                          >
                            <CircularProgress size={20} />
                          </Box>
                        )}
                      </Box>
                      <Box sx={{ textAlign: 'center', width: '100%' }}>
                        <Typography
                          variant="subtitle2"
                          sx={{
                            fontWeight: selected ? 700 : 600,
                            color: selected ? 'primary.main' : 'text.primary',
                            lineHeight: 1.3,
                          }}
                        >
                          {tpl.name}
                        </Typography>
                        <Typography
                          variant="caption"
                          sx={{ color: 'text.secondary', display: 'block', mt: 0.25 }}
                        >
                          Up to {tpl.maxPhotos} photo{tpl.maxPhotos > 1 ? 's' : ''}
                        </Typography>
                      </Box>
                    </Stack>
                  </CardActionArea>
                </Grid>
              );
            })}
          </Grid>
        </StepCard>

        <StepCard
          stepNumber={2}
          title="Choose a Status"
          expanded={currentStep === 2}
          completed={step2Done}
          summary={statusOption ? <Chip size="small" label={statusOption.label} color="primary" variant="outlined" /> : null}
          onEdit={step2Done ? () => editStep(2) : undefined}
        >
          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1.25 }}>
            {STATUS_OPTIONS.map((opt) => {
              const selected = status === opt.value;
              return (
                <Chip
                  key={opt.value}
                  label={opt.label}
                  clickable
                  onClick={() => handleSelectStatus(opt.value)}
                  color={selected ? 'primary' : 'default'}
                  variant={selected ? 'filled' : 'outlined'}
                  icon={selected ? <CheckIcon /> : undefined}
                  sx={{ fontWeight: 500, py: 2.25, fontSize: '0.875rem' }}
                />
              );
            })}
          </Box>
        </StepCard>

        <StepCard
          stepNumber={3}
          title="Select Your Images"
          expanded={currentStep === 3}
          completed={step3Done}
          summary={
            template ? (
              <Chip
                size="small"
                label={`${selectedPhotoIndices.length} of up to ${maxPhotos} photo${maxPhotos > 1 ? 's' : ''} selected`}
                color="primary"
                variant="outlined"
              />
            ) : null
          }
          onEdit={step3Done ? () => editStep(3) : undefined}
        >
          {template && (
            <Stack spacing={2}>
              <Alert severity={step3Done ? 'success' : 'info'} variant="outlined">
                {step3Done
                  ? `${selectedPhotoIndices.length} photo${selectedPhotoIndices.length > 1 ? 's' : ''} selected. You can adjust before exporting.`
                  : `Select ${minPhotos === maxPhotos ? minPhotos : `${minPhotos}–${maxPhotos}`} photo${maxPhotos > 1 ? 's' : ''} for this layout (${selectedPhotoIndices.length} of up to ${maxPhotos}).`}
              </Alert>

              <Grid container spacing={1.5}>
                {data.photos.map((photo, idx) => {
                  const order = selectedPhotoIndices.indexOf(idx);
                  const isSelected = order >= 0;
                  return (
                    <Grid key={photo.id} size={{ xs: 4, sm: 3, md: 2 }}>
                      <Badge
                        badgeContent={isSelected ? order + 1 : 0}
                        color="primary"
                        sx={{
                          width: '100%',
                          '& .MuiBadge-badge': {
                            top: 10,
                            right: 10,
                            minWidth: 22,
                            height: 22,
                            borderRadius: '50%',
                            fontWeight: 700,
                          },
                        }}
                      >
                        <CardActionArea
                          onClick={() => handleTogglePhoto(idx)}
                          sx={{
                            borderRadius: 2,
                            overflow: 'hidden',
                            border: 2,
                            borderColor: isSelected ? 'primary.main' : 'transparent',
                            transition: (t) => t.transitions.create('border-color'),
                            '&:hover': { borderColor: isSelected ? 'primary.main' : 'divider' },
                          }}
                        >
                          <Box
                            sx={{
                              position: 'relative',
                              width: '100%',
                              aspectRatio: '1 / 1',
                              backgroundImage: `url(${photo.thumbnail_url || photo.public_url || ''})`,
                              backgroundSize: 'cover',
                              backgroundPosition: 'center',
                              bgcolor: 'grey.900',
                            }}
                          >
                            {isSelected && (
                              <Box
                                sx={{
                                  position: 'absolute',
                                  inset: 0,
                                  bgcolor: 'primary.main',
                                  opacity: 0.18,
                                }}
                              />
                            )}
                          </Box>
                        </CardActionArea>
                      </Badge>
                    </Grid>
                  );
                })}
              </Grid>
            </Stack>
          )}
        </StepCard>

        <AnimatePresence>
          {allDone && previewProps && template && (
            <motion.div
              key="preview"
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.35, ease: 'easeOut' }}
            >
              <Paper
                variant="outlined"
                sx={{ p: { xs: 2, sm: 3 }, borderRadius: 2, borderColor: 'divider' }}
              >
                <Stack spacing={2.5}>
                  <Stack
                    direction={{ xs: 'column', sm: 'row' }}
                    spacing={2}
                    alignItems={{ sm: 'center' }}
                    justifyContent="space-between"
                  >
                    <Box>
                      <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
                        Live Preview
                      </Typography>
                      <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                        {template.name} &middot; {statusOption?.label} &middot; 1080 &times; 1350 (4:5)
                      </Typography>
                    </Box>
                    <Button
                      variant="contained"
                      size="large"
                      startIcon={
                        downloading ? <CircularProgress size={16} color="inherit" /> : <DownloadIcon />
                      }
                      onClick={handleDownload}
                      disabled={downloading}
                    >
                      {downloading ? 'Exporting...' : 'Export Hi-Res PNG'}
                    </Button>
                  </Stack>

                  {error && (
                    <Alert severity="error" onClose={() => setError(null)}>
                      {error}
                    </Alert>
                  )}

                  <Box>
                    <Typography
                      variant="caption"
                      sx={{
                        color: 'text.secondary',
                        fontWeight: 600,
                        letterSpacing: '0.08em',
                        textTransform: 'uppercase',
                        display: 'block',
                        mb: 1,
                      }}
                    >
                      Palette
                    </Typography>
                    <Stack direction="row" spacing={1.25} flexWrap="wrap" useFlexGap>
                      {LUXE_THEMES.map((palette) => {
                        const active = selectedPalette === palette.id;
                        return (
                          <CardActionArea
                            key={palette.id}
                            onClick={() => setSelectedPalette(palette.id)}
                            sx={{
                              width: 'auto',
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: 1,
                              px: 1.25,
                              py: 0.75,
                              borderRadius: 1.5,
                              border: 2,
                              borderColor: active ? 'primary.main' : 'divider',
                              bgcolor: active ? 'action.selected' : 'transparent',
                              transition: (t) => t.transitions.create(['border-color', 'background-color']),
                            }}
                          >
                            <Box
                              sx={{
                                width: 36,
                                height: 24,
                                borderRadius: 0.75,
                                overflow: 'hidden',
                                display: 'flex',
                                flex: 'none',
                                border: '1px solid rgba(0,0,0,0.12)',
                              }}
                            >
                              <Box sx={{ flex: 1, bgcolor: palette.bg }} />
                              <Box sx={{ width: 10, bgcolor: palette.accent }} />
                            </Box>
                            <Typography
                              variant="body2"
                              sx={{
                                fontWeight: active ? 700 : 500,
                                color: active ? 'primary.main' : 'text.primary',
                              }}
                            >
                              {palette.name}
                            </Typography>
                          </CardActionArea>
                        );
                      })}
                    </Stack>
                  </Box>

                  <Box
                    sx={{
                      display: 'flex',
                      justifyContent: 'center',
                      alignItems: 'center',
                      bgcolor: 'background.default',
                      borderRadius: 2,
                      p: 3,
                    }}
                  >
                    <SocialPostPreview
                      scale={PREVIEW_DISPLAY_WIDTH / 1080}
                      style={{ boxShadow: '0 20px 60px rgba(0,0,0,0.5)' }}
                    >
                      <template.Component {...previewProps} />
                    </SocialPostPreview>
                  </Box>

                  <SocialPostExportNode ref={exportRef}>
                    <template.Component {...previewProps} />
                  </SocialPostExportNode>
                </Stack>
              </Paper>
            </motion.div>
          )}
        </AnimatePresence>
      </Stack>
    </Box>
  );
}
