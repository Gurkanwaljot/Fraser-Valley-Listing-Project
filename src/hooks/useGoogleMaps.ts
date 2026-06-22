import { useEffect, useRef, useState } from 'react';

declare global {
  interface Window {
    google?: typeof google;
  }
}

let loadPromise: Promise<void> | null = null;

function loadGoogleMaps(): Promise<void> {
  if (loadPromise) return loadPromise;
  if (window.google?.maps?.places) {
    loadPromise = Promise.resolve();
    return loadPromise;
  }

  loadPromise = new Promise((resolve, reject) => {
    const key = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;
    if (!key) {
      reject(new Error('VITE_GOOGLE_MAPS_API_KEY is not set'));
      return;
    }
    const script = document.createElement('script');
    script.src = `https://maps.googleapis.com/maps/api/js?key=${key}&libraries=places,geometry`;
    script.async = true;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error('Failed to load Google Maps'));
    document.head.appendChild(script);
  });

  return loadPromise;
}

export function useGoogleMaps() {
  const [ready, setReady] = useState(!!window.google?.maps?.places);

  useEffect(() => {
    if (ready) return;
    loadGoogleMaps().then(() => setReady(true)).catch(() => {});
  }, [ready]);

  return ready;
}

export interface AddressComponents {
  address_line_1: string;
  address_line_2: string;
  city: string;
  province_state: string;
  postal_code: string;
  country: string;
}

export function useAddressAutocomplete(
  inputRef: React.RefObject<HTMLInputElement | null>,
  onPlaceSelected: (address: AddressComponents) => void
) {
  const autocompleteRef = useRef<google.maps.places.Autocomplete | null>(null);
  const callbackRef = useRef(onPlaceSelected);
  callbackRef.current = onPlaceSelected;
  const ready = useGoogleMaps();

  useEffect(() => {
    if (!ready || !inputRef.current || autocompleteRef.current) return;

    const autocomplete = new google.maps.places.Autocomplete(inputRef.current, {
      types: ['address'],
      componentRestrictions: { country: ['ca', 'us'] },
      fields: ['address_components', 'formatted_address'],
    });

    autocomplete.addListener('place_changed', () => {
      const place = autocomplete.getPlace();
      if (!place.address_components) return;

      const get = (type: string) =>
        place.address_components!.find((c) => c.types.includes(type))?.long_name || '';
      const getShort = (type: string) =>
        place.address_components!.find((c) => c.types.includes(type))?.short_name || '';

      const streetNumber = get('street_number');
      const route = get('route');
      const subpremise = get('subpremise');

      callbackRef.current({
        address_line_1: `${streetNumber} ${route}`.trim(),
        address_line_2: subpremise,
        city: get('locality') || get('sublocality_level_1') || get('administrative_area_level_3'),
        province_state: getShort('administrative_area_level_1'),
        postal_code: get('postal_code'),
        country: get('country') || 'Canada',
      });
    });

    autocompleteRef.current = autocomplete;

    return () => {
      google.maps.event.clearInstanceListeners(autocomplete);
      autocompleteRef.current = null;
    };
  }, [ready, inputRef]);
}
