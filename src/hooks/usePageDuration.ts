import { useEffect, useRef } from 'react';
import { trackListingEvent, shouldTrack } from '../services/publicListingService';

export function usePageDuration(
  listingId: string | null,
  photographerId: string | null,
  isPreview: boolean
): void {
  const startTime = useRef(performance.now());
  const fired = useRef(false);

  useEffect(() => {
    if (!listingId || isPreview) return;
    if (!shouldTrack(photographerId)) return;

    startTime.current = performance.now();
    fired.current = false;

    const fireEvent = () => {
      if (fired.current) return;
      const durationSeconds = Math.round((performance.now() - startTime.current) / 1000);
      if (durationSeconds < 2) return;
      fired.current = true;
      trackListingEvent(listingId, 'page_leave', { duration_seconds: durationSeconds }, photographerId);
    };

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'hidden') fireEvent();
    };

    const handleBeforeUnload = () => fireEvent();

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('beforeunload', handleBeforeUnload);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('beforeunload', handleBeforeUnload);
      fireEvent();
    };
  }, [listingId, photographerId, isPreview]);
}
