import { useEffect, useRef, useState, useCallback } from 'react';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Stack from '@mui/material/Stack';
import Button from '@mui/material/Button';
import IconButton from '@mui/material/IconButton';
import Tooltip from '@mui/material/Tooltip';
import CircularProgress from '@mui/material/CircularProgress';
import AddIcon from '@mui/icons-material/Add';
import RemoveIcon from '@mui/icons-material/Remove';
import FullscreenIcon from '@mui/icons-material/Fullscreen';
import StreetviewIcon from '@mui/icons-material/Streetview';
import SchoolIcon from '@mui/icons-material/School';
import LocalGroceryStoreIcon from '@mui/icons-material/LocalGroceryStore';
import RestaurantIcon from '@mui/icons-material/Restaurant';
import ParkIcon from '@mui/icons-material/Park';
import DirectionsBusIcon from '@mui/icons-material/DirectionsBus';
import LocalHospitalIcon from '@mui/icons-material/LocalHospital';
import ShoppingBagIcon from '@mui/icons-material/ShoppingBag';
import FitnessCenterIcon from '@mui/icons-material/FitnessCenter';
import LocalGasStationIcon from '@mui/icons-material/LocalGasStation';
import AccountBalanceIcon from '@mui/icons-material/AccountBalance';
import ChildCareIcon from '@mui/icons-material/ChildCare';
import { useGoogleMaps } from '../../hooks/useGoogleMaps';
import SectionReveal from './SectionReveal';
import { formatStreetAddress } from '../../services/marketingService';
import type { Listing } from '../../types/database';

interface Props {
  listing: Listing;
}

interface AmenityCategory {
  id: string;
  label: string;
  icon: React.ReactNode;
  type: string;
}

const AMENITY_CATEGORIES: AmenityCategory[] = [
  { id: 'school', label: 'Schools', icon: <SchoolIcon fontSize="small" />, type: 'school' },
  { id: 'grocery', label: 'Grocery', icon: <LocalGroceryStoreIcon fontSize="small" />, type: 'supermarket' },
  { id: 'restaurant', label: 'Dining', icon: <RestaurantIcon fontSize="small" />, type: 'restaurant' },
  { id: 'park', label: 'Parks', icon: <ParkIcon fontSize="small" />, type: 'park' },
  { id: 'transit', label: 'Transit', icon: <DirectionsBusIcon fontSize="small" />, type: 'transit_station' },
  { id: 'hospital', label: 'Medical', icon: <LocalHospitalIcon fontSize="small" />, type: 'hospital' },
  { id: 'shopping', label: 'Shopping', icon: <ShoppingBagIcon fontSize="small" />, type: 'shopping_mall' },
  { id: 'gym', label: 'Gyms', icon: <FitnessCenterIcon fontSize="small" />, type: 'gym' },
  { id: 'gas', label: 'Gas', icon: <LocalGasStationIcon fontSize="small" />, type: 'gas_station' },
  { id: 'bank', label: 'Banks', icon: <AccountBalanceIcon fontSize="small" />, type: 'bank' },
  { id: 'daycare', label: 'Daycare', icon: <ChildCareIcon fontSize="small" />, type: 'child_care' },
];

const DARK_MAP_STYLES: google.maps.MapTypeStyle[] = [
  { elementType: 'geometry', stylers: [{ color: '#1a1a1a' }] },
  { elementType: 'labels.text.stroke', stylers: [{ color: '#0a0a0a' }] },
  { elementType: 'labels.text.fill', stylers: [{ color: '#6b6b6b' }] },
  { featureType: 'administrative', elementType: 'geometry.stroke', stylers: [{ color: '#2a2a2a' }] },
  { featureType: 'administrative.land_parcel', elementType: 'labels.text.fill', stylers: [{ color: '#5a5a5a' }] },
  { featureType: 'landscape', elementType: 'geometry.fill', stylers: [{ color: '#1a1a1a' }] },
  { featureType: 'poi', elementType: 'geometry', stylers: [{ color: '#222222' }] },
  { featureType: 'poi', elementType: 'labels.text.fill', stylers: [{ color: '#6b6b6b' }] },
  { featureType: 'poi.park', elementType: 'geometry.fill', stylers: [{ color: '#1c2e1c' }] },
  { featureType: 'poi.park', elementType: 'labels.text.fill', stylers: [{ color: '#4a7c4a' }] },
  { featureType: 'road', elementType: 'geometry', stylers: [{ color: '#2a2a2a' }] },
  { featureType: 'road', elementType: 'geometry.stroke', stylers: [{ color: '#1a1a1a' }] },
  { featureType: 'road.highway', elementType: 'geometry', stylers: [{ color: '#333333' }] },
  { featureType: 'road.highway', elementType: 'geometry.stroke', stylers: [{ color: '#222222' }] },
  { featureType: 'road.highway', elementType: 'labels.text.fill', stylers: [{ color: '#8a8a8a' }] },
  { featureType: 'road.arterial', elementType: 'labels.text.fill', stylers: [{ color: '#6b6b6b' }] },
  { featureType: 'road.local', elementType: 'labels.text.fill', stylers: [{ color: '#5a5a5a' }] },
  { featureType: 'transit', elementType: 'geometry', stylers: [{ color: '#222222' }] },
  { featureType: 'transit.station', elementType: 'labels.text.fill', stylers: [{ color: '#8a8a8a' }] },
  { featureType: 'water', elementType: 'geometry', stylers: [{ color: '#0e1a2e' }] },
  { featureType: 'water', elementType: 'labels.text.fill', stylers: [{ color: '#3a5a8a' }] },
];

function getPropertyMarkerSvg(propertyType: string | null): string {
  const type = (propertyType || '').toLowerCase();

  let iconPath: string;
  if (type.includes('condo') || type.includes('apartment')) {
    iconPath = 'M3,3 L3,21 L10,21 L10,15 L14,15 L14,21 L21,21 L21,3 Z M7,7 L9,7 L9,9 L7,9 Z M11,7 L13,7 L13,9 L11,9 Z M15,7 L17,7 L17,9 L15,9 Z M7,11 L9,11 L9,13 L7,13 Z M11,11 L13,11 L13,13 L11,13 Z M15,11 L17,11 L17,13 L15,13 Z';
  } else if (type.includes('townhouse') || type.includes('semi')) {
    iconPath = 'M2,20 L2,10 L7,6 L12,10 L12,6 L17,2 L22,6 L22,20 Z M5,14 L5,17 L9,17 L9,14 Z M15,10 L15,13 L19,13 L19,10 Z M15,15 L15,18 L19,18 L19,15 Z';
  } else if (type.includes('commercial') || type.includes('business')) {
    iconPath = 'M2,21 L2,10 L4,4 L20,4 L22,10 L22,21 Z M4,10 L6,10 C6,11.1 5.1,12 4,12 C2.9,12 2,11.1 2,10 Z M8,10 L10,10 C10,11.1 9.1,12 8,12 C6.9,12 6,11.1 6,10 Z M9,15 L15,15 L15,21 L9,21 Z';
  } else if (type.includes('land') || type.includes('vacant')) {
    iconPath = 'M2,20 L8,10 L12,14 L18,6 L22,20 Z';
  } else {
    iconPath = 'M12,3 L2,12 L5,12 L5,21 L10,21 L10,15 L14,15 L14,21 L19,21 L19,12 L22,12 Z';
  }

  return `data:image/svg+xml,${encodeURIComponent(`
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 44 44" width="44" height="44">
      <defs>
        <filter id="shadow" x="-20%" y="-20%" width="140%" height="140%">
          <feDropShadow dx="0" dy="2" stdDeviation="2" flood-color="#000" flood-opacity="0.5"/>
        </filter>
      </defs>
      <rect x="2" y="2" width="40" height="40" rx="10" ry="10" fill="#C8A45D" filter="url(#shadow)"/>
      <g transform="translate(11, 11) scale(0.917)" fill="#0B0B0B">
        <path d="${iconPath}"/>
      </g>
    </svg>
  `)}`;
}

function getAmenityMarkerSvg(categoryId: string): string {
  const config: Record<string, { color: string; path: string }> = {
    school: {
      color: '#4CAF50',
      // Graduation cap
      path: 'M12 3L1 9l4 2.18v6L12 21l7-3.82v-6l2-1.09V17h2V9L12 3zm6.82 6L12 12.72 5.18 9 12 5.28 18.82 9zM17 15.99l-5 2.73-5-2.73v-3.72L12 15l5-2.73v3.72z',
    },
    grocery: {
      color: '#FF9800',
      // Shopping cart
      path: 'M7 18c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2zM1 2v2h2l3.6 7.59-1.35 2.45c-.16.28-.25.61-.25.96 0 1.1.9 2 2 2h12v-2H7.42c-.14 0-.25-.11-.25-.25l.03-.12.9-1.63h7.45c.75 0 1.41-.41 1.75-1.03l3.58-6.49A1 1 0 0020.01 4H5.21l-.94-2H1zm16 16c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2z',
    },
    restaurant: {
      color: '#E91E63',
      // Fork and knife
      path: 'M11 9H9V2H7v7H5V2H3v7c0 2.12 1.66 3.84 3.75 3.97V22h2.5v-9.03C11.34 12.84 13 11.12 13 9V2h-2v7zm5-3v8h2.5v8H21V2c-2.76 0-5 2.24-5 4z',
    },
    park: {
      color: '#66BB6A',
      // Tree
      path: 'M15.5 12.5L18 8h-4l2-4h-3V2h-2v2H8l2 4H6l2.5 4.5H6l3.5 5H11v4.5h2V16h1.5l3.5-5h-2.5z',
    },
    transit: {
      color: '#2196F3',
      // Bus
      path: 'M4 16c0 .88.39 1.67 1 2.22V20c0 .55.45 1 1 1h1c.55 0 1-.45 1-1v-1h8v1c0 .55.45 1 1 1h1c.55 0 1-.45 1-1v-1.78c.61-.55 1-1.34 1-2.22V6c0-3.5-3.58-4-8-4s-8 .5-8 4v10zm3.5 1c-.83 0-1.5-.67-1.5-1.5S6.67 14 7.5 14s1.5.67 1.5 1.5S8.33 17 7.5 17zm9 0c-.83 0-1.5-.67-1.5-1.5s.67-1.5 1.5-1.5 1.5.67 1.5 1.5-.67 1.5-1.5 1.5zm1.5-6H6V6h12v5z',
    },
    hospital: {
      color: '#F44336',
      // Medical cross
      path: 'M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm-2 10h-4v4h-2v-4H7v-2h4V7h2v4h4v2z',
    },
    shopping: {
      color: '#9C27B0',
      // Shopping bag
      path: 'M18 6h-2c0-2.21-1.79-4-4-4S8 3.79 8 6H6c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V8c0-1.1-.9-2-2-2zm-6-2c1.1 0 2 .9 2 2h-4c0-1.1.9-2 2-2zm6 16H6V8h2v2c0 .55.45 1 1 1s1-.45 1-1V8h4v2c0 .55.45 1 1 1s1-.45 1-1V8h2v12z',
    },
    gym: {
      color: '#FF5722',
      // Dumbbell
      path: 'M20.57 14.86L22 13.43 20.57 12 17 15.57 8.43 7 12 3.43 10.57 2 9.14 3.43 7.71 2 5.57 4.14 4.14 2.71 2.71 4.14l1.43 1.43L2 7.71l1.43 1.43L2 10.57 3.43 12 7 8.43 15.57 17 12 20.57 13.43 22l1.43-1.43L16.29 22l2.14-2.14 1.43 1.43 1.43-1.43-1.43-1.43L22 16.29z',
    },
    gas: {
      color: '#FFA726',
      // Fuel pump
      path: 'M19.77 7.23l.01-.01-3.72-3.72L15 4.56l2.11 2.11c-.94.36-1.61 1.26-1.61 2.33 0 1.38 1.12 2.5 2.5 2.5.36 0 .69-.08 1-.21v7.21c0 .55-.45 1-1 1s-1-.45-1-1V14c0-1.1-.9-2-2-2h-1V5c0-1.1-.9-2-2-2H6c-1.1 0-2 .9-2 2v16h10v-7.5h1.5v5c0 1.38 1.12 2.5 2.5 2.5s2.5-1.12 2.5-2.5V9c0-.69-.28-1.32-.73-1.77zM12 10H6V5h6v5z',
    },
    bank: {
      color: '#607D8B',
      // Bank building
      path: 'M4 10v7h3v-7H4zm6 0v7h3v-7h-3zM2 22h19v-3H2v3zm14-12v7h3v-7h-3zm-4.5-9L2 6v2h19V6l-9.5-5z',
    },
    daycare: {
      color: '#EC407A',
      // Child face
      path: 'M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8 0-1.12.23-2.18.65-3.15C5.56 9.9 6.71 10.5 8 10.5c1.93 0 3.5-1.57 3.5-3.5 0-.54-.13-1.05-.35-1.51C11.39 5.17 11.68 5 12 5c2.76 0 5 2.24 5 5 0 2.05-1.24 3.81-3 4.58V16h-4v-1.42c-1.76-.77-3-2.53-3-4.58 0-.14.01-.27.02-.4C5.77 10.5 4.87 11.69 4.41 13.09 5.6 17 8.48 20 12 20c4.41 0 8-3.59 8-8s-3.59-8-8-8z',
    },
  };

  const { color, path } = config[categoryId] || { color: '#666', path: 'M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2z' };

  return `data:image/svg+xml,${encodeURIComponent(`
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 36 36" width="36" height="36">
      <defs>
        <filter id="shadow" x="-20%" y="-20%" width="140%" height="140%">
          <feDropShadow dx="0" dy="1" stdDeviation="1.5" flood-color="#000" flood-opacity="0.4"/>
        </filter>
      </defs>
      <rect x="2" y="2" width="32" height="32" rx="8" ry="8" fill="${color}" filter="url(#shadow)"/>
      <g transform="translate(8, 8) scale(0.833)" fill="#fff">
        <path d="${path}"/>
      </g>
    </svg>
  `)}`;
}

export default function PublicListingMap({ listing }: Props) {
  const mapsReady = useGoogleMaps();
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<google.maps.Map | null>(null);
  const amenityMarkersRef = useRef<(google.maps.Marker & { _category?: string })[]>([]);
  const [activeAmenities, setActiveAmenities] = useState<Set<string>>(new Set());
  const [loadingAmenity, setLoadingAmenity] = useState<string | null>(null);
  const [inStreetView, setInStreetView] = useState(false);
  const [mapInitialized, setMapInitialized] = useState(false);

  const hasCoordinates = listing.latitude !== null && listing.longitude !== null;

  const fullAddress = [
    formatStreetAddress(listing),
    listing.city,
    listing.province_state,
    listing.postal_code,
    listing.country,
  ]
    .filter(Boolean)
    .join(', ');

  useEffect(() => {
    if (!mapsReady || !mapContainerRef.current || mapRef.current) return;

    const center = hasCoordinates
      ? { lat: listing.latitude!, lng: listing.longitude! }
      : { lat: 49.2, lng: -122.9 };

    const map = new google.maps.Map(mapContainerRef.current, {
      center,
      zoom: 14,
      styles: DARK_MAP_STYLES,
      disableDefaultUI: true,
      zoomControl: false,
      mapTypeControl: false,
      streetViewControl: false,
      fullscreenControl: false,
      gestureHandling: 'cooperative',
    });

    mapRef.current = map;

    const style = document.createElement('style');
    style.textContent = `
      .gm-style-iw-c { background: #1a1a1a !important; border-radius: 8px !important; padding: 0 !important; box-shadow: 0 4px 24px rgba(0,0,0,0.6) !important; border: 1px solid rgba(200,164,93,0.15) !important; }
      .gm-style-iw-d { overflow: hidden !important; background: #1a1a1a !important; }
      .gm-style-iw-tc::after { background: #1a1a1a !important; border: none !important; }
      .gm-style-iw-tc { filter: none !important; }
      .gm-style-iw { background: #1a1a1a !important; }
      .gm-style-iw-t::after { background: #1a1a1a !important; box-shadow: none !important; }
      .gm-ui-hover-effect { top: 2px !important; right: 2px !important; }
      .gm-ui-hover-effect > span { background-color: #A8A29E !important; }
    `;
    mapContainerRef.current.appendChild(style);

    new google.maps.Marker({
      position: center,
      map,
      title: listing.title || listing.address_line_1 || 'Property',
      icon: {
        url: getPropertyMarkerSvg(listing.property_type),
        scaledSize: new google.maps.Size(44, 44),
        anchor: new google.maps.Point(22, 22),
      },
      zIndex: 1000,
    });

    if (!hasCoordinates && fullAddress) {
      const geocoder = new google.maps.Geocoder();
      geocoder.geocode({ address: fullAddress }, (results, status) => {
        if (status === 'OK' && results?.[0]?.geometry.location) {
          map.setCenter(results[0].geometry.location);
          new google.maps.Marker({
            position: results[0].geometry.location,
            map,
            title: listing.title || listing.address_line_1 || 'Property',
            icon: {
              url: getPropertyMarkerSvg(listing.property_type),
              scaledSize: new google.maps.Size(48, 56),
              anchor: new google.maps.Point(24, 56),
            },
            zIndex: 1000,
          });
        }
      });
    }

    setMapInitialized(true);
  }, [mapsReady, hasCoordinates, listing, fullAddress]);

  const handleZoomIn = () => {
    if (mapRef.current) mapRef.current.setZoom((mapRef.current.getZoom() || 14) + 1);
  };

  const handleZoomOut = () => {
    if (mapRef.current) mapRef.current.setZoom((mapRef.current.getZoom() || 14) - 1);
  };

  const handleFullscreen = () => {
    const el = mapContainerRef.current;
    if (!el) return;
    if (document.fullscreenElement) {
      document.exitFullscreen();
    } else {
      el.requestFullscreen();
    }
  };

  const handleStreetView = () => {
    if (!mapRef.current) return;
    const center = mapRef.current.getCenter();
    if (!center) return;

    if (inStreetView) {
      mapRef.current.getStreetView().setVisible(false);
      setInStreetView(false);
      return;
    }

    const sv = new google.maps.StreetViewService();
    sv.getPanorama({ location: center, radius: 200 }, (data, status) => {
      if (status === 'OK' && data?.location?.latLng) {
        const panorama = mapRef.current!.getStreetView();
        panorama.setPosition(data.location.latLng);
        panorama.setPov({ heading: 0, pitch: 0 });
        panorama.setVisible(true);
        setInStreetView(true);

        google.maps.event.addListenerOnce(panorama, 'visible_changed', () => {
          if (!panorama.getVisible()) setInStreetView(false);
        });
      }
    });
  };

  const clearAmenityMarkers = useCallback(() => {
    amenityMarkersRef.current.forEach((m) => m.setMap(null));
    amenityMarkersRef.current = [];
  }, []);

  const handleAmenityToggle = useCallback((category: AmenityCategory) => {
    setActiveAmenities((prev) => {
      const newActive = new Set(prev);

      if (newActive.has(category.id)) {
        newActive.delete(category.id);
        amenityMarkersRef.current = amenityMarkersRef.current.filter((m) => {
          if (m._category === category.id) {
            m.setMap(null);
            return false;
          }
          return true;
        });
        return newActive;
      }

      newActive.add(category.id);

      if (!mapRef.current) return newActive;
      const center = mapRef.current.getCenter();
      if (!center) return newActive;

      setLoadingAmenity(category.id);

      const service = new google.maps.places.PlacesService(mapRef.current);
      service.nearbySearch(
        { location: center, radius: 10000, type: category.type },
        (results, status) => {
          setLoadingAmenity(null);
          if (status !== google.maps.places.PlacesServiceStatus.OK || !results) return;

          const markers = results.slice(0, 20).map((place) => {
            const marker = new google.maps.Marker({
              position: place.geometry!.location!,
              map: mapRef.current!,
              title: place.name,
              icon: {
                url: getAmenityMarkerSvg(category.id),
                scaledSize: new google.maps.Size(32, 32),
                anchor: new google.maps.Point(16, 16),
              },
              zIndex: 500,
            }) as google.maps.Marker & { _category?: string };
            marker._category = category.id;

            const placeLocation = place.geometry!.location!;
            const directionsUrl = `https://www.google.com/maps/dir/?api=1&destination=${placeLocation.lat()},${placeLocation.lng()}`;
            const starsHtml = place.rating
              ? `<div style="margin-top:8px;display:flex;align-items:center;gap:6px;">
                  <span style="font-size:13px;font-weight:500;color:#C8A45D;">${place.rating}</span>
                  <span style="color:#C8A45D;font-size:12px;letter-spacing:-1px;">${'★'.repeat(Math.round(place.rating))}${'☆'.repeat(5 - Math.round(place.rating))}</span>
                  ${place.user_ratings_total ? `<span style="font-size:11px;color:#A8A29E;">${place.user_ratings_total.toLocaleString()} reviews</span>` : ''}
                </div>`
              : '';

            const infoWindow = new google.maps.InfoWindow({
              content: `
                <div style="background:#1a1a1a;color:#F7F3EA;padding:14px 16px;border-radius:8px;font-family:'Hanken Grotesk',sans-serif;min-width:200px;max-width:280px;">
                  <div style="display:flex;justify-content:space-between;align-items:flex-start;gap:12px;">
                    <div style="flex:1;min-width:0;">
                      <div style="font-size:14px;font-weight:600;line-height:1.3;margin-bottom:4px;">${place.name}</div>
                      ${place.vicinity ? `<div style="font-size:12px;color:#A8A29E;line-height:1.4;">${place.vicinity}</div>` : ''}
                    </div>
                    <a href="${directionsUrl}" target="_blank" rel="noopener" style="display:flex;flex-direction:column;align-items:center;gap:2px;text-decoration:none;flex-shrink:0;padding:4px;">
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#C8A45D" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                        <path d="M3 11l19-9-9 19-2-8-8-2z"/>
                      </svg>
                      <span style="font-size:10px;color:#C8A45D;font-weight:500;">Directions</span>
                    </a>
                  </div>
                  ${starsHtml}
                </div>
              `,
            });
            marker.addListener('click', () => {
              infoWindow.open(mapRef.current!, marker);
            });

            return marker;
          });

          amenityMarkersRef.current.push(...markers);
        }
      );

      return newActive;
    });
  }, []);

  useEffect(() => {
    return () => {
      clearAmenityMarkers();
    };
  }, [clearAmenityMarkers]);

  if (!mapsReady) {
    return (
      <SectionReveal>
        <Typography
          variant="overline"
          sx={{ color: 'primary.main', mb: 1, display: 'block', letterSpacing: '0.15em' }}
        >
          Location
        </Typography>
        <Typography variant="h3" sx={{ color: 'text.primary', mb: 4, fontWeight: 400 }}>
          Map
        </Typography>
        <Box
          sx={{
            height: 450,
            borderRadius: 1,
            bgcolor: 'background.paper',
            border: '1px solid',
            borderColor: 'divider',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <CircularProgress size={32} sx={{ color: 'primary.main' }} />
        </Box>
      </SectionReveal>
    );
  }

  return (
    <SectionReveal>
      <Typography
        variant="overline"
        sx={{ color: 'primary.main', mb: 1, display: 'block', letterSpacing: '0.15em' }}
      >
        Location
      </Typography>
      <Typography variant="h3" sx={{ color: 'text.primary', mb: 3, fontWeight: 400 }}>
        Map
      </Typography>

      <Box sx={{ mb: 2 }}>
        <Typography variant="body1" sx={{ color: 'text.primary', fontWeight: 400 }}>
          {formatStreetAddress(listing)}
        </Typography>
        <Typography variant="body2" sx={{ color: 'text.secondary', fontWeight: 400 }}>
          {listing.city}, {listing.province_state} {listing.postal_code}
        </Typography>
      </Box>

      <Box
        sx={{
          position: 'relative',
          borderRadius: 1,
          overflow: 'hidden',
          border: '1px solid',
          borderColor: 'divider',
        }}
      >
        <Box
          ref={mapContainerRef}
          sx={{ width: '100%', height: { xs: 400, sm: 500, md: 600 } }}
        />

        {mapInitialized && (
          <Stack
            spacing={0.5}
            sx={{ position: 'absolute', top: 12, right: 12, zIndex: 10 }}
          >
            <MapControlButton tooltip="Zoom in" onClick={handleZoomIn}>
              <AddIcon fontSize="small" />
            </MapControlButton>
            <MapControlButton tooltip="Zoom out" onClick={handleZoomOut}>
              <RemoveIcon fontSize="small" />
            </MapControlButton>
            <MapControlButton
              tooltip={inStreetView ? 'Exit Street View' : 'Street View'}
              onClick={handleStreetView}
              active={inStreetView}
            >
              <StreetviewIcon fontSize="small" />
            </MapControlButton>
            <MapControlButton tooltip="Fullscreen" onClick={handleFullscreen}>
              <FullscreenIcon fontSize="small" />
            </MapControlButton>
          </Stack>
        )}
      </Box>

      <Box sx={{ mt: 2.5 }}>
        <Typography
          variant="caption"
          sx={{ color: 'text.secondary', mb: 1.5, display: 'block', fontWeight: 500, letterSpacing: '0.04em' }}
        >
          Nearby amenities within 10 km
        </Typography>
        <Stack direction="row" sx={{ flexWrap: 'wrap', gap: 1 }}>
          {AMENITY_CATEGORIES.map((cat) => {
            const isActive = activeAmenities.has(cat.id);
            const isLoading = loadingAmenity === cat.id;
            return (
              <Button
                key={cat.id}
                size="small"
                variant={isActive ? 'contained' : 'outlined'}
                startIcon={isLoading ? <CircularProgress size={14} sx={{ color: 'inherit' }} /> : cat.icon}
                onClick={() => handleAmenityToggle(cat)}
                sx={{
                  textTransform: 'none',
                  fontWeight: 600,
                  fontSize: '0.8125rem',
                  borderRadius: 2,
                  px: 2,
                  py: 0.875,
                  transition: (theme) => theme.transitions.create(['background-color', 'border-color', 'color', 'box-shadow'], {
                    duration: theme.transitions.duration.shorter,
                  }),
                  ...(isActive && {
                    bgcolor: 'rgba(200, 164, 93, 0.2)',
                    borderColor: 'primary.main',
                    color: 'primary.main',
                    boxShadow: '0 0 0 1.5px rgba(200, 164, 93, 0.4), 0 2px 8px rgba(200, 164, 93, 0.15)',
                    '&:hover': {
                      bgcolor: 'rgba(200, 164, 93, 0.28)',
                      boxShadow: '0 0 0 1.5px rgba(200, 164, 93, 0.6), 0 2px 12px rgba(200, 164, 93, 0.2)',
                    },
                  }),
                  ...(!isActive && {
                    bgcolor: 'rgba(255, 255, 255, 0.04)',
                    borderColor: 'rgba(255, 255, 255, 0.15)',
                    color: 'text.primary',
                    '&:hover': {
                      borderColor: 'primary.main',
                      color: 'primary.main',
                      bgcolor: 'rgba(200, 164, 93, 0.08)',
                    },
                  }),
                }}
              >
                {cat.label}
              </Button>
            );
          })}
        </Stack>
      </Box>
    </SectionReveal>
  );
}

function MapControlButton({
  tooltip,
  onClick,
  active,
  children,
}: {
  tooltip: string;
  onClick: () => void;
  active?: boolean;
  children: React.ReactNode;
}) {
  return (
    <Tooltip title={tooltip} placement="left" arrow>
      <IconButton
        onClick={onClick}
        size="small"
        sx={{
          bgcolor: active ? 'primary.main' : 'rgba(11, 11, 11, 0.85)',
          color: active ? 'primary.contrastText' : 'text.primary',
          border: '1px solid',
          borderColor: active ? 'primary.main' : 'rgba(255, 255, 255, 0.12)',
          backdropFilter: 'blur(8px)',
          width: 36,
          height: 36,
          '&:hover': {
            bgcolor: active ? 'primary.dark' : 'rgba(11, 11, 11, 0.95)',
            borderColor: 'primary.main',
          },
        }}
      >
        {children}
      </IconButton>
    </Tooltip>
  );
}
