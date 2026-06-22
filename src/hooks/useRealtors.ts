import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  getRealtors,
  getRealtorById,
  createRealtor,
  updateRealtor,
  archiveRealtor,
  unarchiveRealtor,
  deleteRealtor,
  type RealtorFilters,
  type CreateRealtorData,
} from '../services/realtorsService';
import { useAuth } from './useAuth';

export function useRealtors(filters?: RealtorFilters) {
  const { user } = useAuth();
  return useQuery({
    queryKey: ['realtors', user?.id, filters],
    queryFn: () => getRealtors(user!.id, filters),
    enabled: !!user,
  });
}

export function useRealtor(id: string | undefined) {
  return useQuery({
    queryKey: ['realtor', id],
    queryFn: () => getRealtorById(id!),
    enabled: !!id,
  });
}

export function useCreateRealtor() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: (data: CreateRealtorData) => createRealtor(user!.id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['realtors'] });
    },
  });
}

export function useUpdateRealtor() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<CreateRealtorData> }) =>
      updateRealtor(id, data),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['realtors'] });
      queryClient.invalidateQueries({ queryKey: ['realtor', variables.id] });
    },
  });
}

export function useArchiveRealtor() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: archiveRealtor,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['realtors'] });
      queryClient.invalidateQueries({ queryKey: ['listings'] });
      queryClient.invalidateQueries({ queryKey: ['listing'] });
    },
  });
}

export function useUnarchiveRealtor() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: unarchiveRealtor,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['realtors'] });
      queryClient.invalidateQueries({ queryKey: ['listings'] });
      queryClient.invalidateQueries({ queryKey: ['listing'] });
    },
  });
}

export function useDeleteRealtor() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: deleteRealtor,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['realtors'] });
      queryClient.invalidateQueries({ queryKey: ['listings'] });
      queryClient.invalidateQueries({ queryKey: ['listing'] });
    },
  });
}
