// Códigos de error de la API (Parte 4, sección 3)

export const CODIGOS_ERROR = [
  'VALIDACION',
  'NO_AUTENTICADO',
  'CREDENCIALES_INVALIDAS',
  'NO_ENCONTRADO',
  'EMAIL_EN_USO',
  'LIMITE_EMPRENDIMIENTOS',
  'TIPO_INCOMPATIBLE',
  'FUERA_DE_HORARIO',
  'EN_BLOQUEO',
  'TURNO_MISMO_INICIO',
  'ESTADO_INVALIDO',
  'SEMANA_DESTINO_OCUPADA',
  'TURNOS_AFECTADOS',
  'TOKEN_VENCIDO',
  'DEMASIADAS_PETICIONES',
  'ERROR_INTERNO',
] as const;

export type CodigoError = (typeof CODIGOS_ERROR)[number];

export const ESTADO_HTTP_ERROR: Record<CodigoError, number> = {
  VALIDACION: 400,
  NO_AUTENTICADO: 401,
  CREDENCIALES_INVALIDAS: 401,
  NO_ENCONTRADO: 404,
  EMAIL_EN_USO: 409,
  LIMITE_EMPRENDIMIENTOS: 409,
  TIPO_INCOMPATIBLE: 409,
  FUERA_DE_HORARIO: 409,
  EN_BLOQUEO: 409,
  TURNO_MISMO_INICIO: 409,
  ESTADO_INVALIDO: 409,
  SEMANA_DESTINO_OCUPADA: 409,
  TURNOS_AFECTADOS: 409,
  TOKEN_VENCIDO: 410,
  DEMASIADAS_PETICIONES: 429,
  ERROR_INTERNO: 500,
};

/** Mensajes en español que muestran la API y la SPA */
export const MENSAJE_ERROR: Record<CodigoError, string> = {
  VALIDACION: 'Revisá los datos ingresados.',
  NO_AUTENTICADO: 'Tu sesión terminó. Volvé a iniciar sesión.',
  CREDENCIALES_INVALIDAS: 'El email o la contraseña no son correctos.',
  NO_ENCONTRADO: 'No encontramos lo que buscabas.',
  EMAIL_EN_USO: 'Ya hay una cuenta con ese email.',
  LIMITE_EMPRENDIMIENTOS: 'Ya tenés 3 emprendimientos, que es el máximo.',
  TIPO_INCOMPATIBLE: 'Esta función no corresponde a este tipo de negocio.',
  FUERA_DE_HORARIO: 'El turno queda fuera del horario de atención.',
  EN_BLOQUEO: 'El turno cae en un período bloqueado.',
  TURNO_MISMO_INICIO: 'Ya hay un turno que empieza a esa hora.',
  ESTADO_INVALIDO: 'No se puede hacer eso en el estado actual.',
  SEMANA_DESTINO_OCUPADA: 'La semana siguiente ya tiene registros.',
  TURNOS_AFECTADOS: 'El cambio deja afuera turnos programados.',
  TOKEN_VENCIDO: 'El link venció o ya se usó. Pedí uno nuevo.',
  DEMASIADAS_PETICIONES: 'Hiciste demasiados intentos. Esperá un momento y probá de nuevo.',
  ERROR_INTERNO: 'Algo salió mal. Probá de nuevo en un rato.',
};

export interface DetalleError {
  field: string;
  message: string;
}

export interface CuerpoError {
  error: {
    code: CodigoError;
    message: string;
    details: DetalleError[];
  };
}
