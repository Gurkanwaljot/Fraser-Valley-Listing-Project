import { useQuery, keepPreviousData } from '@tanstack/react-query';
import { getPublicListingBySlug, type PublicListingData } from '../services/publicListingService';
import { useAuth } from './useAuth';

export function usePublicListing(slug: string | undefined) {
  const { user, isLoading: authLoading } = useAuth();
  const isAuthenticated = !!user;

  return useQuery<PublicListingData | null>({
    queryKey: ['publicListing', slug],
    queryFn: () => {
      if (!slug) return null;
      return getPublicListingBySlug(slug, isAuthenticated);
    },
    enabled: !!slug && !authLoading,
    staleTime: 1000 * 60 * 5,
    gcTime: 1000 * 60 * 30,
    refetchOnMount: true,
    refetchOnWindowFocus: false,
    placeholderData: keepPreviousData,
    retry: 1,
  });
}
