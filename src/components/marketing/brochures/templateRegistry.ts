import { registerBrochureTemplates, type BrochureTemplate } from './brochureTypes';
import LetterCoverPage from './pages/LetterCoverPage';
import LetterGridPage from './pages/LetterGridPage';
import BookletSpreadOutside from './pages/BookletSpreadOutside';
import BookletSpreadInside from './pages/BookletSpreadInside';
import SingleAperturePage from './pages/SingleAperturePage';
import SingleEstatePage from './pages/SingleEstatePage';
import LetterAtelierCover from './pages/LetterAtelierCover';
import LetterAtelierInside from './pages/LetterAtelierInside';
import BookletMonogramOutside from './pages/BookletMonogramOutside';
import BookletMonogramInside from './pages/BookletMonogramInside';
import BookletSkylineOutside from './pages/BookletSkylineOutside';
import BookletSkylineInside from './pages/BookletSkylineInside';
import BookletPromenadeOutside from './pages/BookletPromenadeOutside';
import BookletPromenadeInside from './pages/BookletPromenadeInside';

const templates: BrochureTemplate[] = [
  {
    id: 'letter-classic',
    name: 'Letter \u2014 Classic',
    blurb: 'Cover spec table + full photo grid.',
    family: 'letter',
    slots: { cover: 3, gallery: 9 },
    pages: [LetterCoverPage, LetterGridPage],
  },
  {
    id: 'booklet-classic',
    name: 'Booklet \u2014 Classic',
    blurb: 'Front/back cover + 12-photo interior.',
    family: 'booklet',
    slots: { cover: 4, gallery: 12 },
    pages: [BookletSpreadOutside, BookletSpreadInside],
  },
  {
    id: 'single-aperture',
    name: 'Single \u2014 Aperture',
    blurb: 'Minimalist one-page gallery card.',
    family: 'single',
    slots: { cover: 5, gallery: 0 },
    pages: [SingleAperturePage],
  },
  {
    id: 'single-estate',
    name: 'Single \u2014 Estate',
    blurb: 'Framed classic one-page sheet.',
    family: 'single',
    slots: { cover: 4, gallery: 0 },
    pages: [SingleEstatePage],
  },
  {
    id: 'letter-atelier',
    name: 'Letter \u2014 Atelier',
    blurb: 'Editorial magazine cover + photo essay.',
    family: 'letter',
    slots: { cover: 4, gallery: 8 },
    pages: [LetterAtelierCover, LetterAtelierInside],
  },
  {
    id: 'booklet-monogram',
    name: 'Booklet \u2014 Monogram',
    blurb: 'Heritage crest cover, refined gallery.',
    family: 'booklet',
    slots: { cover: 4, gallery: 12 },
    pages: [BookletMonogramOutside, BookletMonogramInside],
  },
  {
    id: 'booklet-skyline',
    name: 'Booklet \u2014 Skyline',
    blurb: 'Architectural; 16-photo 4\u00b76\u00b76 gallery.',
    family: 'booklet',
    slots: { cover: 1, gallery: 16 },
    pages: [BookletSkylineOutside, BookletSkylineInside],
  },
  {
    id: 'booklet-promenade',
    name: 'Booklet \u2014 Promenade',
    blurb: 'Resort-airy; 16-photo 4\u00b76\u00b76 gallery.',
    family: 'booklet',
    slots: { cover: 4, gallery: 16 },
    pages: [BookletPromenadeOutside, BookletPromenadeInside],
  },
];

registerBrochureTemplates(templates);

export { templates as BROCHURE_TEMPLATES_LIST };
