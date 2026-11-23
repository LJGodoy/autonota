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
import {
  InicioEmprendimiento,
  LayoutEmprendimiento,
  SoloTipo,
} from '../features/emprendimientos/LayoutEmprendimiento';
import { PantallaMovimientos } from '../features/movimientos/PantallaMovimientos';
import { PantallaClientes, PantallaHorarios } from '../features/turnero/PantallasTurnero';
import { PantallaPerfilAlumno } from '../features/clases/PantallaAlumnos';
import { PantallaAnotaciones } from '../features/ventas/PantallaAnotaciones';
import { PantallaNoEncontrada } from './PantallaNoEncontrada';

// FullCalendar y Recharts se descargan solo al abrir esas pantallas, para no agrandar la carga inicial
const agenda = async () => {
  const { PantallaAgenda } = await import('../features/turnero/PantallaAgenda');
  return {
    Component: () => (
      <SoloTipo tipo="TURNERO">
        <PantallaAgenda />
      </SoloTipo>
    ),
  };
};
const calendario = async () => {
  const { PantallaCalendarioClases } = await import('../features/clases/PantallaCalendarioClases');
  return {
    Component: () => (
      <SoloTipo tipo="CLASES">
        <PantallaCalendarioClases />
      </SoloTipo>
    ),
  };
};
const estadisticas = async () => ({
  Component: (await import('../features/estadisticas/PantallaEstadisticas')).PantallaEstadisticas,
});

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
          { index: true, element: <InicioEmprendimiento /> },
          // Turnero (fase 5)
          { path: 'agenda', lazy: agenda },
          {
            path: 'clientes',
            element: (
              <SoloTipo tipo="TURNERO">
                <PantallaClientes />
              </SoloTipo>
            ),
          },
          {
            path: 'horarios',
            element: (
              <SoloTipo tipo="TURNERO">
                <PantallaHorarios />
              </SoloTipo>
            ),
          },
          // Calendario de clases (fase 6)
          { path: 'calendario', lazy: calendario },
          {
            path: 'calendario/alumnos/:aid',
            element: (
              <SoloTipo tipo="CLASES">
                <PantallaPerfilAlumno />
              </SoloTipo>
            ),
          },
          // Los alumnos ahora están junto al calendario; la ruta queda para links viejos
          { path: 'alumnos', element: <Navigate to="../calendario" replace /> },
          // Ventas (fase 7)
          {
            path: 'anotaciones',
            element: (
              <SoloTipo tipo="VENTAS">
                <PantallaAnotaciones />
              </SoloTipo>
            ),
          },
          // Comunes a los tres tipos (fase 4)
          { path: 'movimientos', element: <PantallaMovimientos /> },
          { path: 'estadisticas', lazy: estadisticas },
        ],
      },
      { path: '/cuenta', element: <PantallaCuenta /> },
    ],
  },
]);
