import { useEffect, useRef } from 'react';
import { trackListingEvent, shouldTrack } from '../services/publicListingService';

const MILESTONES = [25, 50, 75, 100];

export function useScrollDepth(
  listingId: string | null,
  photographerId: string | null,
  isPreview: boolean
): void {
  const reached = useRef<Set<number>>(new Set());

  useEffect(() => {
    if (!listingId || isPreview) return;
    if (!shouldTrack(photographerId)) return;

    reached.current = new Set();
    let ticking = false;

    const handleScroll = () => {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(() => {
        const scrollTop = window.scrollY;
        const docHeight = document.documentElement.scrollHeight - window.innerHeight;
        if (docHeight <= 0) { ticking = false; return; }
        const percent = (scrollTop / docHeight) * 100;

        for (const milestone of MILESTONES) {
          if (percent >= milestone && !reached.current.has(milestone)) {
            reached.current.add(milestone);
            trackListingEvent(listingId, 'scroll_depth', { depth: milestone }, photographerId);
          }
        }
        ticking = false;
      });
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, [listingId, photographerId, isPreview]);
}
