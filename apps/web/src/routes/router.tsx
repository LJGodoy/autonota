import { createBrowserRouter, Navigate } from 'react-router';
import { LayoutApp, LayoutPublico, SoloSinSesion } from './Layouts';
import { PantallaInicio } from '../features/auth/PantallaInicio';
import { PantallaIngresar } from '../features/auth/PantallaIngresar';
import { PantallaRegistro } from '../features/auth/PantallaRegistro';
import { PantallaRecuperar } from '../features/auth/PantallaRecuperar';
import { PantallaRestablecer } from '../features/auth/PantallaRestablecer';
import { PantallaCuenta } from '../features/auth/PantallaCuenta';
import { PoliticaPrivacidad } from '../features/legal/PoliticaPrivacidad';
import { Terminos } from '../features/legal/Terminos';
import { PantallaEmprendimientos } from '../features/emprendimientos/PantallaEmprendimientos';
import { LayoutEmprendimiento } from '../features/emprendimientos/LayoutEmprendimiento';
import { PantallaMovimientos } from '../features/movimientos/PantallaMovimientos';
import { PantallaNoEncontrada } from './PantallaNoEncontrada';

export const router = createBrowserRouter([
  {
    element: <LayoutPublico />,
    children: [
      {
        element: <SoloSinSesion />,
        children: [
          { path: '/', element: <PantallaInicio /> },
          { path: '/ingresar', element: <PantallaIngresar /> },
          { path: '/registro', element: <PantallaRegistro /> },
        ],
      },
      { path: '/recuperar', element: <PantallaRecuperar /> },
      { path: '/restablecer', element: <PantallaRestablecer /> },
      // RNF-06 y RNF-08: se pueden leer sin iniciar sesión
      { path: '/privacidad', element: <PoliticaPrivacidad /> },
      { path: '/terminos', element: <Terminos /> },
      { path: '*', element: <PantallaNoEncontrada /> },
    ],
  },
  {
    element: <LayoutApp />,
    children: [
      { path: '/emprendimientos', element: <PantallaEmprendimientos /> },
      {
        path: '/emprendimientos/:eid',
        element: <LayoutEmprendimiento />,
        children: [
          { index: true, element: <Navigate to="movimientos" replace /> },
          { path: 'movimientos', element: <PantallaMovimientos /> },
          {
            path: 'estadisticas',
            // Recharts se descarga solo al abrir las estadísticas, para no agrandar la carga inicial
            lazy: async () => ({
              Component: (await import('../features/estadisticas/PantallaEstadisticas'))
                .PantallaEstadisticas,
            }),
          },
        ],
      },
      { path: '/cuenta', element: <PantallaCuenta /> },
    ],
  },
]);
