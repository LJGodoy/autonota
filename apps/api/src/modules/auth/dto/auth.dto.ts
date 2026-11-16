import { createZodDto } from 'nestjs-zod';
import {
  esquemaDemo,
  esquemaEliminarCuenta,
  esquemaLogin,
  esquemaRecuperar,
  esquemaRegistro,
  esquemaRestablecer,
} from '@autonota/shared';

// DTOs de entrada generados desde los esquemas Zod compartidos (ADR-012)
export class RegistroDto extends createZodDto(esquemaRegistro) {}
export class LoginDto extends createZodDto(esquemaLogin) {}
export class RecuperarDto extends createZodDto(esquemaRecuperar) {}
export class RestablecerDto extends createZodDto(esquemaRestablecer) {}
export class DemoDto extends createZodDto(esquemaDemo) {}
export class EliminarCuentaDto extends createZodDto(esquemaEliminarCuenta) {}
