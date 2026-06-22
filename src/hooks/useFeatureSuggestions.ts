import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getFeatureSuggestions, syncFeatures } from '../services/featuresService';

export function useFeatureSuggestions() {
  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ['property-features'],
    queryFn: getFeatureSuggestions,
    staleTime: 5 * 60 * 1000,
  });

  const syncMutation = useMutation({
    mutationFn: syncFeatures,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['property-features'] });
    },
  });

  return {
    suggestions: (data ?? []).map((f) => f.name),
    isLoading,
    syncUsage: syncMutation.mutate,
  };
}
