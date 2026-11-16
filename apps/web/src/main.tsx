import './instrument';
import './index.css';
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { RouterProvider } from 'react-router';
import { QueryClientProvider } from '@tanstack/react-query';
import { queryClient } from './lib/queryClient';
import { ProveedorSesion } from './lib/sesion';
import { router } from './routes/router';
import { AvisoServidorLento } from './components/Estados';

const raiz = document.getElementById('root');
if (!raiz) throw new Error('Falta el elemento #root');

createRoot(raiz).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <ProveedorSesion>
        <RouterProvider router={router} />
        <AvisoServidorLento />
      </ProveedorSesion>
    </QueryClientProvider>
  </StrictMode>,
);
