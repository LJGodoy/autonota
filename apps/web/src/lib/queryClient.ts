import { QueryClient } from '@tanstack/react-query';
import { ErrorApi } from './api';

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      refetchOnWindowFocus: false,
      retry: (intentos, error) =>
        !(error instanceof ErrorApi && error.status >= 400 && error.status < 500) && intentos < 2,
    },
  },
});
