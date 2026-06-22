import type { TemplateDefinition } from './templateTypes';
import TemplateA from './templates/TemplateA';
import TemplateB from './templates/TemplateB';
import TemplateC from './templates/TemplateC';
import TemplateD from './templates/TemplateD';
import TemplateVeil from './templates/TemplateVeil';
import TemplateCascade from './templates/TemplateCascade';
import TemplatePanorama from './templates/TemplatePanorama';
import TemplateAtelier from './templates/TemplateAtelier';

export const TEMPLATES: TemplateDefinition[] = [
  {
    id: 'classic-flyer',
    name: 'Classic Flyer',
    blurb: 'Two-column hero with bold split headline. Pick 1 photo for a clean cover, 3 to add a secondary photo row.',
    brandSystem: 'classic',
    minPhotos: 1,
    maxPhotos: 3,
    defaultPalette: 'ivory',
    Component: TemplateA,
  },
  {
    id: 'modern-editorial',
    name: 'Modern Editorial',
    blurb: 'Full-bleed hero with a status ribbon. Pick 1–4 for a single hero, 5 to add a 4-photo strip below.',
    brandSystem: 'editorial',
    minPhotos: 1,
    maxPhotos: 5,
    defaultPalette: 'onyx',
    Component: TemplateB,
  },
  {
    id: 'magazine-grid',
    name: 'Magazine Grid',
    blurb: 'Hero with adaptive grid below — pick 1 for a cover or up to 7 for a full property at a glance.',
    brandSystem: 'magazine',
    minPhotos: 1,
    maxPhotos: 7,
    defaultPalette: 'sapphire',
    Component: TemplateC,
  },
  {
    id: 'luxury-dark',
    name: 'Luxury Dark',
    blurb: 'Dark navy / gold serif. Pick 1–3 for an immersive hero, or 4–7 to add a photo grid.',
    brandSystem: 'luxury',
    minPhotos: 1,
    maxPhotos: 7,
    defaultPalette: 'estate',
    Component: TemplateD,
  },
  {
    id: 'blended-veil',
    name: 'Veil Showpiece',
    blurb: 'A single full-bleed image that dissolves into the page. Pick exactly 1 photo for a gallery-grade statement piece.',
    brandSystem: 'blended',
    minPhotos: 1,
    maxPhotos: 1,
    defaultPalette: 'porcelain',
    Component: TemplateVeil,
  },
  {
    id: 'blended-cascade',
    name: 'Cascade',
    blurb: 'Engraved caps over a hero that melts into a cascading photo grid. Pick 3–7 photos.',
    brandSystem: 'blended',
    minPhotos: 3,
    maxPhotos: 7,
    defaultPalette: 'plum',
    Component: TemplateCascade,
  },
  {
    id: 'blended-panorama',
    name: 'Panorama',
    blurb: 'A centered grand-display hero with a cinematic filmstrip dissolving into the page. Pick 3–7 photos.',
    brandSystem: 'blended',
    minPhotos: 3,
    maxPhotos: 6,
    defaultPalette: 'clay',
    Component: TemplatePanorama,
  },
  {
    id: 'blended-atelier',
    name: 'Atelier',
    blurb: 'Fashion-editorial caps anchored top-left over a two-up detail grid. Pick 3–5 photos.',
    brandSystem: 'blended',
    minPhotos: 3,
    maxPhotos: 5,
    defaultPalette: 'bordeaux',
    Component: TemplateAtelier,
  },
];

export function getTemplateById(id: string | null): TemplateDefinition | null {
  if (!id) return null;
  return TEMPLATES.find((t) => t.id === id) ?? null;
}
