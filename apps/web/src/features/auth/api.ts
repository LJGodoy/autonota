import type {
  CuerpoSesion,
  LoginInput,
  RecuperarInput,
  RegistroInput,
  RestablecerInput,
} from '@autonota/shared';
import { api } from '../../lib/api';

export const registrar = (datos: RegistroInput) =>
  api<CuerpoSesion>('/auth/registro', { method: 'POST', body: datos });

export const ingresar = (datos: LoginInput) =>
  api<CuerpoSesion>('/auth/login', { method: 'POST', body: datos });

export const pedirRecuperacion = (datos: RecuperarInput) =>
  api<void>('/auth/recuperar', { method: 'POST', body: datos });

export const restablecerPassword = (datos: RestablecerInput) =>
  api<void>('/auth/restablecer', { method: 'POST', body: datos });

export const probarDemo = () =>
  api<CuerpoSesion>('/auth/demo', { method: 'POST', body: { aceptaPolitica: true } });

export const eliminarCuenta = (password: string) =>
  api<void>('/auth/cuenta', { method: 'DELETE', body: { password } });
