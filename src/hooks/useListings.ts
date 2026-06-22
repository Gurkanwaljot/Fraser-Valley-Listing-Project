import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  getListings,
  getListingById,
  createListing,
  updateListing,
  deleteListing,
  duplicateListing,
  changeListingStatus,
  getDashboardMetrics,
  type ListingFilters,
  type CreateListingData,
} from '../services/listingsService';
import type { ListingStatus } from '../types/database';
import { useAuth } from './useAuth';

export function useListings(filters?: ListingFilters) {
  const { user } = useAuth();
  return useQuery({
    queryKey: ['listings', user?.id, filters],
    queryFn: () => getListings(user!.id, filters),
    enabled: !!user,
  });
}

export function useListing(id: string | undefined) {
  return useQuery({
    queryKey: ['listing', id],
    queryFn: () => getListingById(id!),
    enabled: !!id,
  });
}

export function useCreateListing() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: (data: CreateListingData) => createListing(user!.id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['listings'] });
      queryClient.invalidateQueries({ queryKey: ['dashboardMetrics'] });
    },
  });
}

export function useUpdateListing() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<CreateListingData> }) =>
      updateListing(id, data),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['listings'] });
      queryClient.invalidateQueries({ queryKey: ['listing', variables.id] });
    },
  });
}

export function useChangeListingStatus() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, status }: { id: string; status: ListingStatus }) =>
      changeListingStatus(id, status),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['listings'] });
      queryClient.invalidateQueries({ queryKey: ['listing', variables.id] });
      queryClient.invalidateQueries({ queryKey: ['dashboardMetrics'] });
    },
  });
}

export function useDeleteListing() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => deleteListing(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['listings'] });
      queryClient.invalidateQueries({ queryKey: ['dashboardMetrics'] });
    },
  });
}

export function useDuplicateListing() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: (id: string) => duplicateListing(id, user!.id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['listings'] });
      queryClient.invalidateQueries({ queryKey: ['dashboardMetrics'] });
    },
  });
}

export function useDashboardMetrics() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ['dashboardMetrics', user?.id],
    queryFn: () => getDashboardMetrics(user!.id),
    enabled: !!user,
  });
}
