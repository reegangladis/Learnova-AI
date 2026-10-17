import { useQuery } from "@tanstack/react-query";
import { HealthService } from "@/services/healthService";

export function useSystemHealth() {
  const backendQuery = useQuery({
    queryKey: ["health", "composite"],
    queryFn: () => HealthService.getAllHealth(),
    refetchInterval: 10000, // auto poll every 10s
    retry: 1,
  });

  const aiQuery = useQuery({
    queryKey: ["health", "ai-service"],
    queryFn: () => HealthService.getAIServiceHealth(),
    refetchInterval: 10000,
    retry: 1,
  });

  const mlQuery = useQuery({
    queryKey: ["health", "ml-service"],
    queryFn: () => HealthService.getMLServiceHealth(),
    refetchInterval: 10000,
    retry: 1,
  });

  const isLoading = backendQuery.isLoading || aiQuery.isLoading || mlQuery.isLoading;
  const isRefetching = backendQuery.isRefetching || aiQuery.isRefetching || mlQuery.isRefetching;

  const refetchAll = async () => {
    await Promise.allSettled([
      backendQuery.refetch(),
      aiQuery.refetch(),
      mlQuery.refetch(),
    ]);
  };

  return {
    backendHealth: backendQuery.data ?? null,
    backendError: backendQuery.error,
    isBackendError: backendQuery.isError,

    aiHealth: aiQuery.data ?? null,
    aiError: aiQuery.error,
    isAiError: aiQuery.isError,

    mlHealth: mlQuery.data ?? null,
    mlError: mlQuery.error,
    isMlError: mlQuery.isError,

    isLoading,
    isRefetching,
    refetchAll,
  };
}
