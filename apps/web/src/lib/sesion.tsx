import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import type { CuerpoSesion, Usuario } from '@autonota/shared';
import { alTerminarSesion, api, establecerAccessToken, refrescarSesion } from './api';
import { queryClient } from './queryClient';

type EstadoSesion = 'cargando' | 'autenticado' | 'anonimo';

interface ContextoSesion {
  estado: EstadoSesion;
  usuario: Usuario | null;
  /**
   * true si el usuario salió por su cuenta (cerró sesión o eliminó la cuenta): las pantallas
   * privadas llevan al inicio. false si la sesión venció: llevan al ingreso (CU-02).
   */
  salidaVoluntaria: boolean;
  iniciar: (sesion: CuerpoSesion) => void;
  cerrar: () => Promise<void>;
  /** Borra la sesión local sin llamar a la API (por ejemplo, después de eliminar la cuenta) */
  olvidar: (voluntaria?: boolean) => void;
}

const Contexto = createContext<ContextoSesion | null>(null);

export function ProveedorSesion({ children }: { children: ReactNode }) {
  const [estado, setEstado] = useState<EstadoSesion>('cargando');
  const [usuario, setUsuario] = useState<Usuario | null>(null);
  const [salidaVoluntaria, setSalidaVoluntaria] = useState(false);

  const olvidar = useCallback((voluntaria = false) => {
    establecerAccessToken(null);
    setSalidaVoluntaria(voluntaria);
    setUsuario(null);
    setEstado('anonimo');
    queryClient.clear();
  }, []);

  // Al cargar la SPA se intenta recuperar la sesión con la cookie de refresh (CU-02)
  useEffect(() => {
    let activo = true;
    void (async () => {
      const token = await refrescarSesion();
      if (!activo) return;
      if (!token) {
        setEstado('anonimo');
        return;
      }
      try {
        const yo = await api<Usuario>('/auth/me');
        if (!activo) return;
        setUsuario(yo);
        setEstado('autenticado');
      } catch {
        if (activo) olvidar();
      }
    })();
    return () => {
      activo = false;
    };
  }, [olvidar]);

  useEffect(() => alTerminarSesion(() => olvidar(false)), [olvidar]);

  const iniciar = useCallback((sesion: CuerpoSesion) => {
    queryClient.clear();
    establecerAccessToken(sesion.accessToken);
    setSalidaVoluntaria(false);
    setUsuario(sesion.usuario);
    setEstado('autenticado');
  }, []);

  const cerrar = useCallback(async () => {
    try {
      await api('/auth/logout', { method: 'POST' });
    } catch {
      /* aunque falle la API, la sesión local se borra igual */
    } finally {
      olvidar(true);
    }
  }, [olvidar]);

  const valor = useMemo(
    () => ({ estado, usuario, salidaVoluntaria, iniciar, cerrar, olvidar }),
    [estado, usuario, salidaVoluntaria, iniciar, cerrar, olvidar],
  );
  return <Contexto.Provider value={valor}>{children}</Contexto.Provider>;
}

export function useSesion(): ContextoSesion {
  const ctx = useContext(Contexto);
  if (!ctx) throw new Error('useSesion debe usarse dentro de ProveedorSesion');
  return ctx;
}
