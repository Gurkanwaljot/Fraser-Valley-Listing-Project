import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import Box from '@mui/material/Box';
import Grid from '@mui/material/Grid';
import Typography from '@mui/material/Typography';
import Button from '@mui/material/Button';
import Stack from '@mui/material/Stack';
import Paper from '@mui/material/Paper';
import Chip from '@mui/material/Chip';
import Switch from '@mui/material/Switch';
import FormControlLabel from '@mui/material/FormControlLabel';
import CircularProgress from '@mui/material/CircularProgress';
import Alert from '@mui/material/Alert';
import Badge from '@mui/material/Badge';
import CardActionArea from '@mui/material/CardActionArea';
import DownloadIcon from '@mui/icons-material/Download';
import { motion, AnimatePresence } from 'framer-motion';
import type { MarketingListingData } from '../../services/marketingService';
import { trackMarketingEvent } from '../../services/marketingAnalyticsService';
import { LUXE_THEMES, getThemeById } from './socialPosts/theme';
import { preloadBrochureAssets, type AssetCandidate } from './socialPosts/exportNodeToPng';
import StepCard from './socialPosts/StepCard';
import {
  FAMILY_GEOMETRY,
  BROCHURE_TEMPLATES,
  getTemplate,
  photoCapacity,
  type BrochureFamily,
  type BrochurePageProps,
  type BrochureTemplate,
} from './brochures/brochureTypes';
import './brochures/templateRegistry';
import { exportBrochurePdf } from './brochures/brochurePdf';
import { BrochurePreview, BrochureExportNode } from './brochures/components/BrochureFrame';
import PrintSheet from './brochures/components/PrintSheet';

interface BrochuresTabProps {
  data: MarketingListingData;
}

type Step = 0 | 1 | 2;

interface PageDef {
  key: string;
  w: number;
  h: number;
  sheetW: number;
  sheetH: number;
  foldX?: number;
  Component: (props: BrochurePageProps) => React.ReactElement;
}

const MAX_FLOOR_PLANS = 3;

const FAMILY_LABELS: Record<BrochureFamily, string> = {
  single: 'Single Page',
  letter: 'Letter Feature Sheet',
  booklet: 'Folded Booklet',
};

const FAMILY_ORDER: BrochureFamily[] = ['single', 'letter', 'booklet'];

function pagesForTemplate(template: BrochureTemplate): PageDef[] {
  const geom = FAMILY_GEOMETRY[template.family];
  return template.pages.map((Component, i) => ({
    key: `${template.id}-${i}`,
    w: geom.basePx.w,
    h: geom.basePx.h,
    sheetW: geom.sheetPx.w,
    sheetH: geom.sheetPx.h,
    foldX: geom.foldX,
    Component: Component as (props: BrochurePageProps) => React.ReactElement,
  }));
}

interface PhotoSlot {
  label: string;
  filled: number;
  max: number;
}

function photoSlots(template: BrochureTemplate, count: number): PhotoSlot[] {
  const clamp = (n: number, hi: number) => Math.max(0, Math.min(n, hi));
  const { cover, gallery } = template.slots;

  if (template.family === 'booklet' && gallery === 16) {
    const slots: PhotoSlot[] = [
      { label: 'Cover hero #1', filled: clamp(count, 1), max: 1 },
    ];
    if (cover > 1) {
      slots.push({ label: 'Cover row #2\u2013' + cover, filled: clamp(count - 1, cover - 1), max: cover - 1 });
    }
    slots.push({ label: 'Interior gallery (4\u00b76\u00b76)', filled: clamp(count - cover, gallery), max: gallery });
    return slots;
  }
  if (template.family === 'booklet') {
    return [
      { label: 'Cover hero #1', filled: clamp(count, 1), max: 1 },
      { label: `Cover row #2\u2013${cover}`, filled: clamp(count - 1, cover - 1), max: cover - 1 },
      { label: `Inside gallery #${cover + 1}\u2013${cover + gallery}`, filled: clamp(count - cover, gallery), max: gallery },
    ];
  }
  if (template.family === 'single') {
    return [
      { label: `Photos #1\u2013${cover}`, filled: clamp(count, cover), max: cover },
    ];
  }
  return [
    { label: 'Cover hero #1', filled: clamp(count, 1), max: 1 },
    { label: `Cover pair #2\u2013${cover}`, filled: clamp(count - 1, cover - 1), max: cover - 1 },
    { label: `Gallery grid #${cover + 1}\u2013${cover + gallery}`, filled: clamp(count - cover, gallery), max: gallery },
  ];
}

function slotSummary(template: BrochureTemplate, count: number): string {
  const slots = photoSlots(template, count);
  if (template.family === 'single') return `${slots[0].filled} photos`;
  const parts: string[] = [];
  if (slots[0].filled > 0) parts.push('hero');
  if (slots.length > 1 && slots[1].filled > 0) parts.push(template.family === 'booklet' ? 'row' : 'pair');
  if (slots.length > 2 && slots[2].filled > 0) parts.push(`${slots[2].filled} gallery`);
  return parts.join(' + ');
}

export default function BrochuresTab({ data }: BrochuresTabProps) {
  const [currentStep, setCurrentStep] = useState<Step>(1);
  const [templateId, setTemplateId] = useState<string | null>(null);
  const [palette, setPalette] = useState<string>('heritage');
  const [photoIndices, setPhotoIndices] = useState<number[]>([]);
  const [floorPlanIndices, setFloorPlanIndices] = useState<number[]>([]);
  const [showPrice, setShowPrice] = useState(true);
  const [imageMap, setImageMap] = useState<Map<string, string>>(() => new Map());
  const [downloading, setDownloading] = useState(false);
  const [progress, setProgress] = useState<{ page: number; total: number } | null>(null);
  const [error, setError] = useState<string | null>(null);

  const exportRefs = useRef<(HTMLDivElement | null)[]>([]);

  const primaryRealtor = data.realtors[0];
  const theme = getThemeById(palette);
  const template = templateId ? getTemplate(templateId) : null;
  const capacity = template ? photoCapacity(template) : 0;
  const family = template?.family ?? null;

  useEffect(() => {
    let cancelled = false;
    const assets: AssetCandidate[] = [];
    data.photos.forEach((p) => {
      assets.push({
        id: p.id,
        urls: [p.large_url, p.original_url, p.public_url, p.thumbnail_url].filter((u): u is string => !!u),
      });
    });
    data.floorPlans.forEach((p) => {
      assets.push({
        id: p.id,
        urls: [p.public_url, p.large_url, p.original_url, p.thumbnail_url].filter((u): u is string => !!u),
      });
    });
    const extraUrls: string[] = [];
    if (primaryRealtor?.headshot_url) extraUrls.push(primaryRealtor.headshot_url);
    if (primaryRealtor?.brokerage_logo_url) extraUrls.push(primaryRealtor.brokerage_logo_url);
    if (assets.length === 0 && extraUrls.length === 0) return;

    preloadBrochureAssets(assets, extraUrls)
      .then((map) => {
        if (!cancelled) setImageMap(map);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [data, primaryRealtor]);

  const buildProps = useCallback(
    (indices: number[], fpIndices: number[], cap: number): BrochurePageProps | null => {
      if (!primaryRealtor) return null;
      const photos = (indices.length > 0 ? indices.map((i) => data.photos[i]).filter(Boolean) : data.photos).slice(0, cap);
      const floorPlans = fpIndices.map((i) => data.floorPlans[i]).filter(Boolean);
      return { listing: data.listing, photos, floorPlans, realtor: primaryRealtor, imageMap, theme, showPrice };
    },
    [primaryRealtor, data, imageMap, theme, showPrice],
  );

  const pageProps = useMemo(() => buildProps(photoIndices, floorPlanIndices, capacity), [buildProps, photoIndices, floorPlanIndices, capacity]);
  const pages = useMemo(() => (template ? pagesForTemplate(template) : []), [template]);

  const handleSelectTemplate = useCallback((id: string) => {
    const t = getTemplate(id);
    const cap = photoCapacity(t);
    setTemplateId(id);
    setPhotoIndices((prev) => prev.slice(0, cap));
    setFloorPlanIndices((prev) => {
      if (t.family === 'booklet') {
        return prev.length > 0 ? prev : data.floorPlans.slice(0, MAX_FLOOR_PLANS).map((_, i) => i);
      }
      return prev;
    });
    setCurrentStep((prev) => (prev === 1 ? 2 : prev));
  }, [data.floorPlans]);

  const handleTogglePhoto = useCallback((idx: number) => {
    setPhotoIndices((prev) => {
      if (prev.includes(idx)) return prev.filter((i) => i !== idx);
      if (prev.length >= capacity) return prev;
      return [...prev, idx];
    });
  }, [capacity]);

  const handleToggleFloorPlan = useCallback((idx: number) => {
    setFloorPlanIndices((prev) => {
      if (prev.includes(idx)) return prev.filter((i) => i !== idx);
      if (prev.length >= MAX_FLOOR_PLANS) return prev;
      return [...prev, idx];
    });
  }, []);

  const editStep = useCallback((step: Step) => {
    setCurrentStep(step);
  }, []);

  const step1Done = !!template;
  const step2Done = !!template && (photoIndices.length > 0 || data.photos.length > 0);
  const previewReady = step2Done && !!pageProps;

  const selectedCount = photoIndices.length;
  const effectiveCount = (selectedCount > 0 ? selectedCount : data.photos.length);
  const photoCount = Math.min(effectiveCount, capacity);
  const capReached = selectedCount >= capacity;

  const handleDownload = async () => {
    if (!template) return;
    const nodes = exportRefs.current.filter((n): n is HTMLDivElement => !!n);
    if (nodes.length !== pages.length) {
      setError('Pages are still preparing. Please wait a moment and try again.');
      return;
    }
    setDownloading(true);
    setError(null);
    const geom = FAMILY_GEOMETRY[template.family];
    const slug = data.listing.slug || 'listing';
    try {
      await exportBrochurePdf({
        nodes,
        widthPt: geom.pt.w,
        heightPt: geom.pt.h,
        filename: `${slug}-${template.id}.pdf`,
        onProgress: (page, total) => setProgress({ page, total }),
      });
      trackMarketingEvent(data.listing.id, 'brochure_export', {
        template: template.id,
        design: template.family,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Export failed');
    }
    setDownloading(false);
    setProgress(null);
  };

  if (!primaryRealtor) {
    return (
      <Box sx={{ textAlign: 'center', py: 8 }}>
        <Typography variant="body1" sx={{ color: 'text.secondary' }}>No realtor assigned to this listing.</Typography>
      </Box>
    );
  }

  if (data.photos.length === 0) {
    return (
      <Box sx={{ textAlign: 'center', py: 8 }}>
        <Typography variant="body1" sx={{ color: 'text.secondary' }}>No photos available for this listing.</Typography>
      </Box>
    );
  }

  const previewDisplayWidth = family === 'booklet' ? 640 : 360;
  const slots = template ? photoSlots(template, photoCount) : [];

  // Group templates by family
  const templatesByFamily = FAMILY_ORDER.map((fam) => ({
    family: fam,
    label: FAMILY_LABELS[fam],
    templates: BROCHURE_TEMPLATES.filter((t) => t.family === fam),
  })).filter((g) => g.templates.length > 0);

  return (
    <Box>
      <Typography variant="body1" sx={{ color: 'text.secondary', mb: 3 }}>
        Build a print-ready feature sheet. Pick a design and photos — then fine-tune palette and options right on the preview.
      </Typography>

      <Stack spacing={2.5}>
        <StepCard
          stepNumber={1}
          title="Choose a Design"
          expanded={currentStep === 1}
          completed={step1Done}
          summary={template ? <Chip size="small" label={template.name} color="primary" variant="outlined" /> : null}
          onEdit={step1Done ? () => editStep(1) : undefined}
        >
          <Stack spacing={3}>
            {templatesByFamily.map((group) => (
              <Box key={group.family}>
                <Typography variant="overline" sx={{ color: 'text.secondary', display: 'block', mb: 1.5, letterSpacing: '0.1em' }}>
                  {group.label}
                </Typography>
                <Grid container spacing={2}>
                  {group.templates.map((t) => {
                    const selected = templateId === t.id;
                    const cap = photoCapacity(t);
                    const sample = buildProps([], data.floorPlans.slice(0, MAX_FLOOR_PLANS).map((_, i) => i), cap);
                    const pageDefs = pagesForTemplate(t);
                    const firstPage = pageDefs[0];
                    const thumbWidth = group.family === 'booklet' ? 280 : 200;
                    const scale = thumbWidth / firstPage.w;
                    return (
                      <Grid key={t.id} size={{ xs: 12, sm: 6, md: group.family === 'booklet' ? 6 : 4 }}>
                        <CardActionArea
                          onClick={() => handleSelectTemplate(t.id)}
                          sx={{
                            borderRadius: 2,
                            p: 1.5,
                            border: 2,
                            borderColor: selected ? 'primary.main' : 'transparent',
                            bgcolor: selected ? 'action.selected' : 'transparent',
                            '&:hover': { borderColor: selected ? 'primary.main' : 'divider' },
                          }}
                        >
                          <Stack spacing={1.5} alignItems="center">
                            <Box sx={{ bgcolor: 'grey.100', borderRadius: 1, overflow: 'hidden', boxShadow: 2 }}>
                              {sample ? (
                                <BrochurePreview width={firstPage.w} height={firstPage.h} scale={scale}>
                                  <firstPage.Component {...sample} />
                                </BrochurePreview>
                              ) : (
                                <Box sx={{ width: thumbWidth, height: thumbWidth * (firstPage.h / firstPage.w), display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                  <CircularProgress size={20} />
                                </Box>
                              )}
                            </Box>
                            <Box sx={{ textAlign: 'center' }}>
                              <Typography variant="subtitle2" sx={{ fontWeight: selected ? 700 : 600, color: selected ? 'primary.main' : 'text.primary' }}>
                                {t.name}
                              </Typography>
                              <Typography variant="body2" sx={{ color: 'text.secondary', mt: 0.25, fontSize: '0.8rem' }}>{t.blurb}</Typography>
                            </Box>
                          </Stack>
                        </CardActionArea>
                      </Grid>
                    );
                  })}
                </Grid>
              </Box>
            ))}
          </Stack>
        </StepCard>

        <StepCard
          stepNumber={2}
          title="Select Photos"
          expanded={currentStep === 2}
          completed={step2Done && currentStep < 2}
          summary={template ? <Chip size="small" label={`${photoCount} selected \u00b7 ${slotSummary(template, photoCount)}`} color="primary" variant="outlined" /> : null}
          onEdit={step1Done ? () => setCurrentStep(2) : undefined}
        >
          <Stack spacing={2}>
            {template && (
              <Box>
                <Stack direction="row" spacing={1} alignItems="center" justifyContent="space-between" sx={{ mb: 1 }} flexWrap="wrap" useFlexGap>
                  <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                    {slots.map((slot) => (
                      <Chip
                        key={slot.label}
                        size="small"
                        variant="outlined"
                        color={slot.filled > 0 ? 'primary' : 'default'}
                        label={`${slot.label} \u00b7 ${slot.filled} of ${slot.max}`}
                      />
                    ))}
                  </Stack>
                  <Chip
                    size="small"
                    color={capReached ? 'warning' : 'default'}
                    variant={capReached ? 'filled' : 'outlined'}
                    label={`${selectedCount} of ${capacity} selected`}
                    sx={{ fontWeight: 700 }}
                  />
                </Stack>
                <Typography variant="caption" sx={{ color: 'text.secondary', display: 'block' }}>
                  Click photos in placement order to fill the slots above. Leaving this empty uses all photos in their existing order.
                </Typography>
                {capReached && (
                  <Typography variant="caption" sx={{ color: 'warning.main', display: 'block', mt: 0.5, fontWeight: 600 }}>
                    Maximum reached for this design — deselect a photo to swap.
                  </Typography>
                )}
              </Box>
            )}

            <Grid container spacing={1.5}>
              {data.photos.map((photo, idx) => {
                const order = photoIndices.indexOf(idx);
                const isSelected = order >= 0;
                const dimmed = capReached && !isSelected;
                return (
                  <Grid key={photo.id} size={{ xs: 4, sm: 3, md: 2 }}>
                    <Badge
                      badgeContent={isSelected ? order + 1 : 0}
                      color="primary"
                      sx={{ width: '100%', '& .MuiBadge-badge': { top: 10, right: 10, minWidth: 22, height: 22, borderRadius: '50%', fontWeight: 700 } }}
                    >
                      <CardActionArea
                        onClick={() => handleTogglePhoto(idx)}
                        sx={{ borderRadius: 2, overflow: 'hidden', border: 2, borderColor: isSelected ? 'primary.main' : 'transparent', opacity: dimmed ? 0.45 : 1, transition: 'opacity 0.2s', '&:hover': { borderColor: isSelected ? 'primary.main' : 'divider' } }}
                      >
                        <Box sx={{ position: 'relative', width: '100%', aspectRatio: '1 / 1', backgroundImage: `url(${photo.thumbnail_url || photo.public_url || ''})`, backgroundSize: 'cover', backgroundPosition: 'center', bgcolor: 'grey.900' }}>
                          {isSelected && <Box sx={{ position: 'absolute', inset: 0, bgcolor: 'primary.main', opacity: 0.18 }} />}
                        </Box>
                      </CardActionArea>
                    </Badge>
                  </Grid>
                );
              })}
            </Grid>

            {family === 'booklet' && (
              <Box>
                <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 1 }}>
                  Floor plans for the back cover {data.floorPlans.length > 0 ? `(up to ${MAX_FLOOR_PLANS})` : ''}
                </Typography>
                {data.floorPlans.length === 0 ? (
                  <Alert severity="info" variant="outlined">
                    No floor plans found for this listing. The back cover will show the description, features, and a photo instead.
                  </Alert>
                ) : (
                  <Grid container spacing={1.5}>
                    {data.floorPlans.map((fp, idx) => {
                      const order = floorPlanIndices.indexOf(idx);
                      const isSelected = order >= 0;
                      return (
                        <Grid key={fp.id} size={{ xs: 4, sm: 3 }}>
                          <Badge
                            badgeContent={isSelected ? order + 1 : 0}
                            color="primary"
                            sx={{ width: '100%', '& .MuiBadge-badge': { top: 10, right: 10, minWidth: 22, height: 22, borderRadius: '50%', fontWeight: 700 } }}
                          >
                            <CardActionArea
                              onClick={() => handleToggleFloorPlan(idx)}
                              sx={{ borderRadius: 2, overflow: 'hidden', border: 2, borderColor: isSelected ? 'primary.main' : 'transparent' }}
                            >
                              <Box sx={{ position: 'relative', width: '100%', aspectRatio: '4 / 3', backgroundImage: `url(${fp.thumbnail_url || fp.public_url || fp.original_url || ''})`, backgroundSize: 'contain', backgroundRepeat: 'no-repeat', backgroundPosition: 'center', bgcolor: 'grey.100' }} />
                            </CardActionArea>
                          </Badge>
                        </Grid>
                      );
                    })}
                  </Grid>
                )}
              </Box>
            )}
          </Stack>
        </StepCard>

        <AnimatePresence>
          {previewReady && pageProps && template && (
            <motion.div key="preview" initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.35, ease: 'easeOut' }}>
              <Paper variant="outlined" sx={{ p: { xs: 2, sm: 3 }, borderRadius: 2, borderColor: 'divider' }}>
                <Stack spacing={2.5}>
                  <Stack direction={{ xs: 'column', md: 'row' }} spacing={2} alignItems={{ md: 'center' }} justifyContent="space-between">
                    <Box>
                      <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>Live Preview</Typography>
                      <Typography variant="body2" sx={{ color: 'text.secondary' }}>{template.name} \u00b7 {theme.name}</Typography>
                    </Box>
                    <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} alignItems={{ sm: 'center' }}>
                      <FormControlLabel
                        control={<Switch size="small" checked={showPrice} onChange={(e) => setShowPrice(e.target.checked)} />}
                        label={<Typography variant="body2">Show price</Typography>}
                        sx={{ mr: 0 }}
                      />
                      <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: { xs: 'flex-start', sm: 'flex-end' }, gap: 0.5 }}>
                        <Button
                          variant="contained"
                          size="large"
                          startIcon={downloading ? <CircularProgress size={16} color="inherit" /> : <DownloadIcon />}
                          onClick={handleDownload}
                          disabled={downloading}
                        >
                          {downloading
                            ? progress
                              ? `Rendering page ${progress.page} of ${progress.total}\u2026`
                              : 'Preparing\u2026'
                            : 'Export Print-Ready PDF'}
                        </Button>
                        <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                          300 DPI \u00b7 sRGB \u00b7 crop marks + bleed
                        </Typography>
                      </Box>
                    </Stack>
                  </Stack>

                  <Box>
                    <Typography variant="caption" sx={{ color: 'text.secondary', fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase', display: 'block', mb: 1 }}>
                      Palette
                    </Typography>
                    <Stack direction="row" spacing={1.25} flexWrap="wrap" useFlexGap>
                      {LUXE_THEMES.map((p) => {
                        const active = palette === p.id;
                        return (
                          <CardActionArea
                            key={p.id}
                            onClick={() => setPalette(p.id)}
                            sx={{
                              width: 'auto', display: 'inline-flex', alignItems: 'center', gap: 1,
                              px: 1.25, py: 0.75, borderRadius: 1.5, border: 2,
                              borderColor: active ? 'primary.main' : 'divider',
                              bgcolor: active ? 'action.selected' : 'transparent',
                            }}
                          >
                            <Box sx={{ width: 36, height: 24, borderRadius: 0.75, overflow: 'hidden', display: 'flex', flex: 'none', border: '1px solid rgba(0,0,0,0.12)' }}>
                              <Box sx={{ flex: 1, bgcolor: p.bg }} />
                              <Box sx={{ width: 12, bgcolor: p.panel }} />
                              <Box sx={{ width: 8, bgcolor: p.accent }} />
                            </Box>
                            <Typography variant="body2" sx={{ fontWeight: active ? 700 : 500, color: active ? 'primary.main' : 'text.primary' }}>
                              {p.name}
                            </Typography>
                          </CardActionArea>
                        );
                      })}
                    </Stack>
                  </Box>

                  {error && <Alert severity="error" onClose={() => setError(null)}>{error}</Alert>}

                  <Box sx={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'center', gap: 3, bgcolor: 'background.default', borderRadius: 2, p: 3 }}>
                    {pages.map((page) => (
                      <BrochurePreview key={page.key} width={page.sheetW} height={page.sheetH} scale={previewDisplayWidth / page.sheetW} style={{ boxShadow: '0 18px 50px rgba(0,0,0,0.28)' }}>
                        <PrintSheet innerW={page.w} innerH={page.h} foldX={page.foldX}>
                          <page.Component {...pageProps} />
                        </PrintSheet>
                      </BrochurePreview>
                    ))}
                  </Box>
                </Stack>
              </Paper>

              {pages.map((page, i) => (
                <BrochureExportNode key={page.key} width={page.sheetW} height={page.sheetH} ref={(el) => { exportRefs.current[i] = el; }}>
                  <PrintSheet innerW={page.w} innerH={page.h} foldX={page.foldX}>
                    <page.Component {...pageProps} />
                  </PrintSheet>
                </BrochureExportNode>
              ))}
            </motion.div>
          )}
        </AnimatePresence>
      </Stack>
    </Box>
  );
}
