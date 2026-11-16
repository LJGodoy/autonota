import { Module } from '@nestjs/common';
import { AuthController } from './controllers/auth.controller';
import { AuthService } from './services/auth.service';
import { DemoLimpiezaService } from './services/demo-limpieza.service';
import { PasswordHasher } from './services/password-hasher';
import { UsuariosRepository } from './repositories/usuarios.repository';
import { TokensRepository } from './repositories/tokens.repository';

/** Registro, inicio de sesión, recuperación de contraseña y cuentas de demostración (ADR-005) */
@Module({
  controllers: [AuthController],
  providers: [
    AuthService,
    DemoLimpiezaService,
    PasswordHasher,
    UsuariosRepository,
    TokensRepository,
  ],
})
export class AuthModule {}
