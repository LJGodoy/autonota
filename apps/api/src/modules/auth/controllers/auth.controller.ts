import { Body, Controller, Delete, Get, HttpCode, Post, Req, Res, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { SkipThrottle, ThrottlerGuard } from '@nestjs/throttler';
import type { CookieOptions, Request, Response } from 'express';
import type { CuerpoSesion, Usuario } from '@autonota/shared';
import { AppConfig } from '../../../common/config/config';
import { Publico } from '../../../common/auth/publico.decorator';
import { UsuarioActual } from '../../../common/auth/decoradores';
import type { UsuarioAutenticado } from '../../../common/auth/peticion';
import { AuthService } from '../services/auth.service';
import type { SesionEmitida } from '../dto/usuario.dto';
import {
  DemoDto,
  EliminarCuentaDto,
  LoginDto,
  RecuperarDto,
  RegistroDto,
  RestablecerDto,
} from '../dto/auth.dto';

export const COOKIE_REFRESH = 'refresh_token';
const RUTA_COOKIE = '/api/v1/auth';

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(
    private readonly auth: AuthService,
    private readonly config: AppConfig,
  ) {}

  @Post('registro')
  @Publico()
  @UseGuards(ThrottlerGuard)
  @SkipThrottle({ demo: true })
  @ApiOperation({ summary: 'Crea la cuenta e inicia sesión (RF-01)' })
  @ApiResponse({ status: 201, description: 'Cuerpo de sesión' })
  @ApiResponse({ status: 400, description: 'VALIDACION' })
  @ApiResponse({ status: 409, description: 'EMAIL_EN_USO' })
  @ApiResponse({ status: 429, description: 'DEMASIADAS_PETICIONES' })
  async registro(
    @Body() dto: RegistroDto,
    @Res({ passthrough: true }) res: Response,
  ): Promise<CuerpoSesion> {
    return this.responderSesion(res, await this.auth.registrar(dto));
  }

  @Post('login')
  @Publico()
  @HttpCode(200)
  @UseGuards(ThrottlerGuard)
  @SkipThrottle({ demo: true })
  @ApiOperation({ summary: 'Inicia sesión (CU-01)' })
  @ApiResponse({ status: 200, description: 'Cuerpo de sesión' })
  @ApiResponse({ status: 401, description: 'CREDENCIALES_INVALIDAS' })
  @ApiResponse({ status: 429, description: 'DEMASIADAS_PETICIONES' })
  async login(
    @Body() dto: LoginDto,
    @Res({ passthrough: true }) res: Response,
  ): Promise<CuerpoSesion> {
    return this.responderSesion(res, await this.auth.login(dto));
  }

  @Post('refresh')
  @Publico()
  @HttpCode(200)
  @ApiOperation({ summary: 'Entrega un access token nuevo y rota el refresh token (CU-02)' })
  @ApiResponse({ status: 200, description: '{ accessToken }' })
  @ApiResponse({ status: 401, description: 'NO_AUTENTICADO' })
  async refresh(
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ): Promise<{ accessToken: string }> {
    try {
      const r = await this.auth.refrescar(this.leerCookie(req));
      res.cookie(COOKIE_REFRESH, r.refreshToken, this.opcionesCookie(r.refreshExpiraEn));
      return { accessToken: r.accessToken };
    } catch (error) {
      res.clearCookie(COOKIE_REFRESH, this.opcionesCookie());
      throw error;
    }
  }

  @Post('logout')
  @Publico()
  @HttpCode(204)
  @ApiOperation({ summary: 'Revoca el refresh token y borra la cookie' })
  @ApiResponse({ status: 204 })
  async logout(@Req() req: Request, @Res({ passthrough: true }) res: Response): Promise<void> {
    await this.auth.logout(this.leerCookie(req));
    res.clearCookie(COOKIE_REFRESH, this.opcionesCookie());
  }

  @Post('recuperar')
  @Publico()
  @HttpCode(202)
  @UseGuards(ThrottlerGuard)
  @SkipThrottle({ demo: true })
  @ApiOperation({ summary: 'Envía el mail de recuperación (CU-03). Responde 202 siempre' })
  @ApiResponse({ status: 202 })
  @ApiResponse({ status: 429, description: 'DEMASIADAS_PETICIONES' })
  async recuperar(@Body() dto: RecuperarDto): Promise<void> {
    await this.auth.recuperar(dto);
  }

  @Post('restablecer')
  @Publico()
  @HttpCode(204)
  @ApiOperation({
    summary: 'Cambia la contraseña con el token del mail y cierra todas las sesiones',
  })
  @ApiResponse({ status: 204 })
  @ApiResponse({ status: 410, description: 'TOKEN_VENCIDO' })
  async restablecer(@Body() dto: RestablecerDto): Promise<void> {
    await this.auth.restablecer(dto);
  }

  @Get('me')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Datos del usuario autenticado' })
  @ApiResponse({ status: 200 })
  @ApiResponse({ status: 401, description: 'NO_AUTENTICADO' })
  me(@UsuarioActual() usuario: UsuarioAutenticado): Promise<Usuario> {
    return this.auth.me(usuario.id);
  }

  @Post('demo')
  @Publico()
  @UseGuards(ThrottlerGuard)
  @SkipThrottle({ auth: true })
  @ApiOperation({
    summary: 'Crea una cuenta de demostración que se elimina a las 48 horas (CU-15)',
  })
  @ApiResponse({ status: 201, description: 'Cuerpo de sesión' })
  @ApiResponse({ status: 429, description: 'DEMASIADAS_PETICIONES (más de 3 por hora por IP)' })
  async demo(
    @Body() dto: DemoDto,
    @Res({ passthrough: true }) res: Response,
  ): Promise<CuerpoSesion> {
    return this.responderSesion(res, await this.auth.crearDemo(dto));
  }

  @Delete('cuenta')
  @HttpCode(204)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Elimina la cuenta y todos sus datos (CU-17)' })
  @ApiResponse({ status: 204 })
  @ApiResponse({ status: 401, description: 'CREDENCIALES_INVALIDAS' })
  async eliminarCuenta(
    @UsuarioActual() usuario: UsuarioAutenticado,
    @Body() dto: EliminarCuentaDto,
    @Res({ passthrough: true }) res: Response,
  ): Promise<void> {
    await this.auth.eliminarCuenta(usuario.id, dto.password);
    res.clearCookie(COOKIE_REFRESH, this.opcionesCookie());
  }

  private responderSesion(res: Response, sesion: SesionEmitida): CuerpoSesion {
    res.cookie(COOKIE_REFRESH, sesion.refreshToken, this.opcionesCookie(sesion.refreshExpiraEn));
    return sesion.cuerpo;
  }

  private leerCookie(req: Request): string | undefined {
    const valor: unknown = req.cookies?.[COOKIE_REFRESH];
    return typeof valor === 'string' && valor !== '' ? valor : undefined;
  }

  /** Cookie httpOnly, Secure (en producción), SameSite=Lax, Path=/api/v1/auth (Parte 4, sección 4) */
  private opcionesCookie(expira?: Date): CookieOptions {
    return {
      httpOnly: true,
      secure: this.config.esProduccion,
      sameSite: 'lax',
      path: RUTA_COOKIE,
      ...(expira ? { expires: expira } : {}),
    };
  }
}
