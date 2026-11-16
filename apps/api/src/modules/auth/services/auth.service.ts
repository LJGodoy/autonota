import { Injectable, Logger } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { randomUUID } from 'node:crypto';
import type { Usuario } from '@prisma/client';
import type {
  DemoInput,
  LoginInput,
  RecuperarInput,
  RegistroInput,
  RestablecerInput,
  Usuario as UsuarioDto,
} from '@autonota/shared';
import { AppConfig } from '../../../common/config/config';
import { DomainException } from '../../../common/errors/domain.exception';
import { MailService } from '../../../common/mail/mail.service';
import { esViolacionUnica } from '../../../common/prisma/prisma.service';
import { generarTokenAleatorio, hashToken } from '../../../common/utils/tokens';
import { UsuariosRepository } from '../repositories/usuarios.repository';
import { TokensRepository } from '../repositories/tokens.repository';
import { PasswordHasher } from './password-hasher';
import { aUsuarioDto, type SesionEmitida } from '../dto/usuario.dto';

const HORA_MS = 60 * 60 * 1000;
const DIA_MS = 24 * HORA_MS;
/** ADR-014: las cuentas de demostración vencen a las 48 horas */
export const DURACION_DEMO_MS = 48 * HORA_MS;
/** ADR-006: el token de recuperación vence en 1 hora */
export const DURACION_RECUPERACION_MS = HORA_MS;

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);
  private hashFicticio?: Promise<string>;

  constructor(
    private readonly usuarios: UsuariosRepository,
    private readonly tokens: TokensRepository,
    private readonly hasher: PasswordHasher,
    private readonly jwt: JwtService,
    private readonly mail: MailService,
    private readonly config: AppConfig,
  ) {}

  /** RF-01: crea la cuenta e inicia sesión */
  async registrar(input: RegistroInput, ahora = new Date()): Promise<SesionEmitida> {
    const passwordHash = await this.hasher.hash(input.password);
    try {
      const usuario = await this.usuarios.crear({
        nombre: input.nombre,
        email: input.email,
        passwordHash,
        politicaAceptadaEn: ahora, // RNF-06 y RNF-08
      });
      return this.emitirSesion(usuario, ahora);
    } catch (error) {
      if (esViolacionUnica(error)) throw new DomainException('EMAIL_EN_USO');
      throw error;
    }
  }

  /** CU-01 */
  async login(input: LoginInput, ahora = new Date()): Promise<SesionEmitida> {
    const usuario = await this.usuarios.buscarPorEmail(input.email);
    if (!usuario || usuario.esDemo) {
      // Mismo costo que una verificación real, para no revelar qué emails existen
      await this.hasher.verificar(await this.obtenerHashFicticio(), input.password);
      throw new DomainException('CREDENCIALES_INVALIDAS');
    }
    const valida = await this.hasher.verificar(usuario.passwordHash, input.password);
    if (!valida) throw new DomainException('CREDENCIALES_INVALIDAS');
    return this.emitirSesion(usuario, ahora);
  }

  /** CU-02: valida el refresh token, lo rota y entrega un access token nuevo */
  async refrescar(
    refreshToken: string | undefined,
    ahora = new Date(),
  ): Promise<{ accessToken: string; refreshToken: string; refreshExpiraEn: Date }> {
    if (!refreshToken) throw new DomainException('NO_AUTENTICADO');
    const guardado = await this.tokens.buscarRefresh(hashToken(refreshToken));
    if (!guardado) throw new DomainException('NO_AUTENTICADO');

    if (guardado.revocadoEn) {
      // Token revocado que se vuelve a usar: posible robo de la cookie
      this.logger.warn(`Reutilización de refresh token revocado del usuario ${guardado.usuarioId}`);
      await this.tokens.revocarTodos(guardado.usuarioId, ahora);
      throw new DomainException('NO_AUTENTICADO');
    }
    if (guardado.expiraEn <= ahora) throw new DomainException('NO_AUTENTICADO');

    const nuevo = this.nuevoRefresh(ahora);
    const rotado = await this.tokens.rotarRefresh(
      guardado.id,
      {
        usuarioId: guardado.usuarioId,
        tokenHash: hashToken(nuevo.token),
        expiraEn: nuevo.expiraEn,
      },
      ahora,
    );
    if (!rotado) {
      await this.tokens.revocarTodos(guardado.usuarioId, ahora);
      throw new DomainException('NO_AUTENTICADO');
    }
    return {
      accessToken: await this.firmarAccessToken(guardado.usuarioId),
      refreshToken: nuevo.token,
      refreshExpiraEn: nuevo.expiraEn,
    };
  }

  async logout(refreshToken: string | undefined, ahora = new Date()): Promise<void> {
    if (refreshToken) await this.tokens.revocarRefresh(hashToken(refreshToken), ahora);
  }

  /** CU-03, pasos 2 a 4: responde igual exista o no el email; el envío no se espera */
  async recuperar(input: RecuperarInput, ahora = new Date()): Promise<void> {
    const usuario = await this.usuarios.buscarPorEmail(input.email);
    if (!usuario || usuario.esDemo) return;

    const token = generarTokenAleatorio();
    await this.tokens.crearRecuperacion(
      usuario.id,
      hashToken(token),
      new Date(ahora.getTime() + DURACION_RECUPERACION_MS),
    );
    const link = `${this.config.get('APP_URL')}/restablecer?token=${encodeURIComponent(token)}`;
    void this.mail
      .enviar({
        para: usuario.email,
        asunto: 'Recuperá tu contraseña de AutoNota',
        texto: `Hola, ${usuario.nombre}.\n\nPara elegir una contraseña nueva, abrí este link (vence en 1 hora):\n${link}\n\nSi no lo pediste, ignorá este mail.`,
        html: `<p>Hola, ${escaparHtml(usuario.nombre)}.</p><p>Para elegir una contraseña nueva, abrí este link (vence en 1 hora):</p><p><a href="${link}">Elegir contraseña nueva</a></p><p>Si no lo pediste, ignorá este mail.</p>`,
      })
      .catch((error: unknown) => {
        // CU-03, flujo alternativo: se registra y el usuario puede volver a pedirlo
        this.logger.error(`Falló el envío del mail de recuperación: ${String(error)}`);
      });
  }

  /** CU-03, pasos 6 y 7 */
  async restablecer(input: RestablecerInput, ahora = new Date()): Promise<void> {
    const guardado = await this.tokens.buscarRecuperacion(hashToken(input.token));
    if (!guardado || guardado.usadoEn || guardado.expiraEn <= ahora) {
      throw new DomainException('TOKEN_VENCIDO');
    }
    const passwordHash = await this.hasher.hash(input.password);
    const ok = await this.tokens.restablecerPassword(
      guardado.id,
      guardado.usuarioId,
      passwordHash,
      ahora,
    );
    if (!ok) throw new DomainException('TOKEN_VENCIDO');
  }

  async me(usuarioId: string): Promise<UsuarioDto> {
    const usuario = await this.usuarios.buscarPorId(usuarioId);
    if (!usuario) throw new DomainException('NO_AUTENTICADO');
    return aUsuarioDto(usuario);
  }

  /** CU-15 (RF-08, ADR-014) */
  async crearDemo(_input: DemoInput, ahora = new Date()): Promise<SesionEmitida> {
    // La cuenta de demostración no tiene contraseña conocida: solo se usa con la sesión emitida
    const passwordHash = await this.hasher.hash(generarTokenAleatorio());
    const usuario = await this.usuarios.crearDemo(
      {
        nombre: 'Visitante',
        email: `demo-${randomUUID()}@demo.autonota.invalid`,
        passwordHash,
        politicaAceptadaEn: ahora,
        expiraEn: new Date(ahora.getTime() + DURACION_DEMO_MS),
      },
      ahora,
    );
    return this.emitirSesion(usuario, ahora);
  }

  /**
   * CU-17 (RF-09): verifica la contraseña y borra el usuario con todos sus datos.
   * Las cuentas de demostración no tienen contraseña conocida y se eliminan sin pedirla.
   */
  async eliminarCuenta(usuarioId: string, password: string): Promise<void> {
    const usuario = await this.usuarios.buscarPorId(usuarioId);
    if (!usuario) throw new DomainException('NO_AUTENTICADO');
    if (!usuario.esDemo) {
      const valida = await this.hasher.verificar(usuario.passwordHash, password);
      if (!valida) throw new DomainException('CREDENCIALES_INVALIDAS');
    }
    // Las sesiones se borran en cascada con el usuario
    await this.usuarios.eliminar(usuario.id);
  }

  private async emitirSesion(usuario: Usuario, ahora: Date): Promise<SesionEmitida> {
    const refresh = this.nuevoRefresh(ahora);
    await this.tokens.crearRefresh(usuario.id, hashToken(refresh.token), refresh.expiraEn);
    return {
      cuerpo: {
        usuario: aUsuarioDto(usuario),
        accessToken: await this.firmarAccessToken(usuario.id),
      },
      refreshToken: refresh.token,
      refreshExpiraEn: refresh.expiraEn,
    };
  }

  private nuevoRefresh(ahora: Date): { token: string; expiraEn: Date } {
    const dias = this.config.get('REFRESH_TOKEN_DIAS');
    return { token: generarTokenAleatorio(), expiraEn: new Date(ahora.getTime() + dias * DIA_MS) };
  }

  private firmarAccessToken(usuarioId: string): Promise<string> {
    return this.jwt.signAsync({ sub: usuarioId });
  }

  private obtenerHashFicticio(): Promise<string> {
    this.hashFicticio ??= this.hasher.hash(generarTokenAleatorio());
    return this.hashFicticio;
  }
}

function escaparHtml(texto: string): string {
  return texto
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}
