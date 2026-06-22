import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  getMediaForListing,
  uploadMediaFile,
  deleteMediaAsset,
  updateMediaAsset,
  reorderMedia,
  setHeroImage,
  getHeroMedia,
  getHeroMediaBatch,
  getMaxSortOrder,
  type MediaUploadParams,
} from '../services/mediaService';
import type { MediaAsset } from '../types/database';

export { getMaxSortOrder };

export function useMedia(listingId: string | undefined) {
  return useQuery({
    queryKey: ['media', listingId],
    queryFn: () => getMediaForListing(listingId!),
    enabled: !!listingId,
  });
}

export function useUploadMedia(listingId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (params: Omit<MediaUploadParams, 'listingId'> & { listingId?: string }) =>
      uploadMediaFile({ ...params, listingId: params.listingId ?? listingId }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['media', listingId] });
    },
  });
}

export function useDeleteMedia(listingId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, key, thumbnailKey }: { id: string; key: string; thumbnailKey?: string }) =>
      deleteMediaAsset(id, key, thumbnailKey),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['media', listingId] });
      queryClient.invalidateQueries({ queryKey: ['media', 'heroes'] });
      queryClient.invalidateQueries({ queryKey: ['listing', listingId] });
      queryClient.invalidateQueries({ queryKey: ['listings'] });
    },
  });
}

export function useUpdateMedia(listingId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, fields }: { id: string; fields: { caption?: string | null; alt_text?: string | null; is_public?: boolean; kind?: string } }) =>
      updateMediaAsset(id, fields),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['media', listingId] });
    },
  });
}

export function useReorderMedia(listingId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (orderedIds: string[]) => reorderMedia(listingId, orderedIds),
    onMutate: async (orderedIds) => {
      await queryClient.cancelQueries({ queryKey: ['media', listingId] });
      const previous = queryClient.getQueryData<MediaAsset[]>(['media', listingId]);

      if (previous) {
        const reordered = orderedIds
          .map((id, index) => {
            const item = previous.find((m) => m.id === id);
            return item ? { ...item, sort_order: index } : null;
          })
          .filter(Boolean) as MediaAsset[];
        queryClient.setQueryData(['media', listingId], reordered);
      }

      return { previous };
    },
    onError: (_err, _vars, context) => {
      if (context?.previous) {
        queryClient.setQueryData(['media', listingId], context.previous);
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['media', listingId] });
    },
  });
}

export function useSetHero(listingId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (mediaId: string) => setHeroImage(listingId, mediaId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['media', listingId] });
      queryClient.invalidateQueries({ queryKey: ['media', 'heroes'] });
      queryClient.invalidateQueries({ queryKey: ['listing', listingId] });
      queryClient.invalidateQueries({ queryKey: ['listings'] });
    },
  });
}

export function useHeroMedia(listingId: string | undefined) {
  return useQuery({
    queryKey: ['media', listingId, 'hero'],
    queryFn: () => getHeroMedia(listingId!),
    enabled: !!listingId,
  });
}

export function useHeroMediaBatch(listingIds: string[]) {
  return useQuery({
    queryKey: ['media', 'heroes', listingIds],
    queryFn: () => getHeroMediaBatch(listingIds),
    enabled: listingIds.length > 0,
  });
}
