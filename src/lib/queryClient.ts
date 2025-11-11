import { QueryClient } from '@tanstack/react-query';

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 10, // Data stays fresh for 10 minutes
      gcTime: 1000 * 60 * 60, // Cache for 60 minutes
      refetchOnWindowFocus: false,
      refetchOnMount: false, // Don't refetch on component mount if data is fresh
      retry: 1,
    },
  },
});
