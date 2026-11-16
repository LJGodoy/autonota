import { JwtService } from '@nestjs/jwt';
import { Prisma, type RefreshToken, type TokenRecuperacion, type Usuario } from '@prisma/client';
import { AuthService, DURACION_DEMO_MS } from '../services/auth.service';
import type { UsuariosRepository } from '../repositories/usuarios.repository';
import type { TokensRepository } from '../repositories/tokens.repository';
import type { PasswordHasher } from '../services/password-hasher';
import type { AppConfig } from '../../../common/config/config';
import { LogMailService } from '../../../common/mail/log-mail.service';
import { DomainException } from '../../../common/errors/domain.exception';
import { hashToken } from '../../../common/utils/tokens';

const AHORA = new Date('2026-11-15T12:00:00Z');

function usuario(extra: Partial<Usuario> = {}): Usuario {
  return {
    id: 'u1',
    nombre: 'Laura',
    email: 'laura@mail.com',
    passwordHash: 'hash:Tintura2026',
    esDemo: false,
    expiraEn: null,
    politicaAceptadaEn: AHORA,
    creadoEn: AHORA,
    actualizadoEn: AHORA,
    ...extra,
  };
}

function crear() {
  const usuarios = {
    buscarPorEmail: jest.fn(),
    buscarPorId: jest.fn(),
    crear: jest.fn(),
    crearDemo: jest.fn(),
    eliminar: jest.fn(),
    eliminarDemosVencidos: jest.fn(),
  };
  const tokens = {
    crearRefresh: jest.fn(),
    buscarRefresh: jest.fn(),
    rotarRefresh: jest.fn(),
    revocarRefresh: jest.fn(),
    revocarTodos: jest.fn(),
    crearRecuperacion: jest.fn(),
    buscarRecuperacion: jest.fn(),
    restablecerPassword: jest.fn(),
  };
  const hasher = {
    hash: jest.fn(async (p: string) => `hash:${p}`),
    verificar: jest.fn(async (h: string, p: string) => h === `hash:${p}`),
  };
  const config = {
    get: (clave: string) => (clave === 'REFRESH_TOKEN_DIAS' ? 30 : 'http://localhost:5173'),
    esProduccion: false,
  };
  const mail = new LogMailService();
  const servicio = new AuthService(
    usuarios as unknown as UsuariosRepository,
    tokens as unknown as TokensRepository,
    hasher as unknown as PasswordHasher,
    new JwtService({ secret: 'secreto-de-pruebas-unitarias-0123456789' }),
    mail,
    config as unknown as AppConfig,
  );
  return { servicio, usuarios, tokens, hasher, mail };
}

async function codigoDe(promesa: Promise<unknown>): Promise<string> {
  try {
    await promesa;
  } catch (e) {
    if (e instanceof DomainException) return e.code;
    throw e;
  }
  throw new Error('Se esperaba un error');
}

describe('AuthService', () => {
  describe('registrar', () => {
    it('debería guardar el hash de la contraseña y la fecha de aceptación de la política', async () => {
      const { servicio, usuarios, tokens } = crear();
      usuarios.crear.mockResolvedValue(usuario());
      const sesion = await servicio.registrar(
        { nombre: 'Laura', email: 'laura@mail.com', password: 'Tintura2026', aceptaPolitica: true },
        AHORA,
      );
      expect(usuarios.crear).toHaveBeenCalledWith(
        expect.objectContaining({ passwordHash: 'hash:Tintura2026', politicaAceptadaEn: AHORA }),
      );
      expect(sesion.cuerpo.accessToken).toEqual(expect.any(String));
      expect(sesion.cuerpo.usuario).not.toHaveProperty('passwordHash');
      expect(tokens.crearRefresh).toHaveBeenCalledWith(
        'u1',
        hashToken(sesion.refreshToken),
        expect.any(Date),
      );
    });

    it('debería responder EMAIL_EN_USO si el email ya está registrado', async () => {
      const { servicio, usuarios } = crear();
      usuarios.crear.mockRejectedValue(
        new Prisma.PrismaClientKnownRequestError('dup', { code: 'P2002', clientVersion: '6' }),
      );
      const codigo = await codigoDe(
        servicio.registrar({
          nombre: 'L',
          email: 'l@m.com',
          password: 'abc12345',
          aceptaPolitica: true,
        }),
      );
      expect(codigo).toBe('EMAIL_EN_USO');
    });
  });

  describe('login', () => {
    it('debería iniciar sesión con credenciales válidas', async () => {
      const { servicio, usuarios } = crear();
      usuarios.buscarPorEmail.mockResolvedValue(usuario());
      const sesion = await servicio.login({ email: 'laura@mail.com', password: 'Tintura2026' });
      expect(sesion.cuerpo.usuario.email).toBe('laura@mail.com');
    });

    it('debería responder el mismo error con email inexistente o contraseña incorrecta', async () => {
      const { servicio, usuarios, hasher } = crear();
      usuarios.buscarPorEmail.mockResolvedValueOnce(null);
      expect(await codigoDe(servicio.login({ email: 'x@m.com', password: 'a' }))).toBe(
        'CREDENCIALES_INVALIDAS',
      );
      expect(hasher.verificar).toHaveBeenCalled();
      usuarios.buscarPorEmail.mockResolvedValueOnce(usuario());
      expect(await codigoDe(servicio.login({ email: 'laura@mail.com', password: 'mala' }))).toBe(
        'CREDENCIALES_INVALIDAS',
      );
    });

    it('debería rechazar el inicio de sesión con contraseña de una cuenta de demostración', async () => {
      const { servicio, usuarios } = crear();
      usuarios.buscarPorEmail.mockResolvedValue(usuario({ esDemo: true, expiraEn: AHORA }));
      expect(
        await codigoDe(servicio.login({ email: 'laura@mail.com', password: 'Tintura2026' })),
      ).toBe('CREDENCIALES_INVALIDAS');
    });
  });

  describe('refrescar', () => {
    const guardado = (extra: Partial<RefreshToken> = {}): RefreshToken => ({
      id: 'r1',
      usuarioId: 'u1',
      tokenHash: hashToken('viejo'),
      expiraEn: new Date(AHORA.getTime() + 86400000),
      revocadoEn: null,
      creadoEn: AHORA,
      ...extra,
    });

    it('debería rotar el refresh token y entregar un access token nuevo', async () => {
      const { servicio, tokens } = crear();
      tokens.buscarRefresh.mockResolvedValue(guardado());
      tokens.rotarRefresh.mockResolvedValue(true);
      const r = await servicio.refrescar('viejo', AHORA);
      expect(r.refreshToken).not.toBe('viejo');
      expect(tokens.rotarRefresh).toHaveBeenCalledWith(
        'r1',
        expect.objectContaining({ usuarioId: 'u1', tokenHash: hashToken(r.refreshToken) }),
        AHORA,
      );
    });

    it('debería revocar todas las sesiones si se reutiliza un token revocado', async () => {
      const { servicio, tokens } = crear();
      tokens.buscarRefresh.mockResolvedValue(guardado({ revocadoEn: AHORA }));
      expect(await codigoDe(servicio.refrescar('viejo', AHORA))).toBe('NO_AUTENTICADO');
      expect(tokens.revocarTodos).toHaveBeenCalledWith('u1', AHORA);
    });

    it('debería rechazar un token vencido, inexistente o ausente', async () => {
      const { servicio, tokens } = crear();
      tokens.buscarRefresh.mockResolvedValueOnce(guardado({ expiraEn: AHORA }));
      expect(await codigoDe(servicio.refrescar('viejo', AHORA))).toBe('NO_AUTENTICADO');
      tokens.buscarRefresh.mockResolvedValueOnce(null);
      expect(await codigoDe(servicio.refrescar('otro', AHORA))).toBe('NO_AUTENTICADO');
      expect(await codigoDe(servicio.refrescar(undefined, AHORA))).toBe('NO_AUTENTICADO');
    });
  });

  describe('recuperar y restablecer', () => {
    it('debería enviar un link con un token que vence en 1 hora si el email existe', async () => {
      const { servicio, usuarios, tokens, mail } = crear();
      usuarios.buscarPorEmail.mockResolvedValue(usuario());
      await servicio.recuperar({ email: 'laura@mail.com' }, AHORA);
      await new Promise((r) => setImmediate(r));
      expect(tokens.crearRecuperacion).toHaveBeenCalledWith(
        'u1',
        expect.any(String),
        new Date(AHORA.getTime() + 3600000),
      );
      expect(mail.enviados).toHaveLength(1);
      expect(mail.enviados[0]?.texto).toContain('http://localhost:5173/restablecer?token=');
    });

    it('no debería enviar nada ni fallar si el email no existe', async () => {
      const { servicio, usuarios, tokens, mail } = crear();
      usuarios.buscarPorEmail.mockResolvedValue(null);
      await servicio.recuperar({ email: 'nadie@mail.com' }, AHORA);
      expect(tokens.crearRecuperacion).not.toHaveBeenCalled();
      expect(mail.enviados).toHaveLength(0);
    });

    it('debería responder TOKEN_VENCIDO con un token vencido o ya usado', async () => {
      const { servicio, tokens } = crear();
      const base: TokenRecuperacion = {
        id: 't1',
        usuarioId: 'u1',
        tokenHash: 'h',
        expiraEn: AHORA,
        usadoEn: null,
        creadoEn: AHORA,
      };
      tokens.buscarRecuperacion.mockResolvedValueOnce(base);
      expect(
        await codigoDe(servicio.restablecer({ token: 'x', password: 'Nueva2026' }, AHORA)),
      ).toBe('TOKEN_VENCIDO');
      tokens.buscarRecuperacion.mockResolvedValueOnce({
        ...base,
        expiraEn: new Date(AHORA.getTime() + 1000),
        usadoEn: AHORA,
      });
      expect(
        await codigoDe(servicio.restablecer({ token: 'x', password: 'Nueva2026' }, AHORA)),
      ).toBe('TOKEN_VENCIDO');
    });

    it('debería cambiar la contraseña con un token vigente', async () => {
      const { servicio, tokens } = crear();
      tokens.buscarRecuperacion.mockResolvedValue({
        id: 't1',
        usuarioId: 'u1',
        tokenHash: 'h',
        expiraEn: new Date(AHORA.getTime() + 1000),
        usadoEn: null,
        creadoEn: AHORA,
      });
      tokens.restablecerPassword.mockResolvedValue(true);
      await servicio.restablecer({ token: 'x', password: 'Nueva2026' }, AHORA);
      expect(tokens.restablecerPassword).toHaveBeenCalledWith('t1', 'u1', 'hash:Nueva2026', AHORA);
    });
  });

  describe('demo y eliminación de cuenta', () => {
    it('debería crear una cuenta de demostración que vence a las 48 horas', async () => {
      const { servicio, usuarios } = crear();
      usuarios.crearDemo.mockImplementation(async (d: { expiraEn: Date }) =>
        usuario({ esDemo: true, expiraEn: d.expiraEn }),
      );
      const sesion = await servicio.crearDemo({ aceptaPolitica: true }, AHORA);
      expect(usuarios.crearDemo).toHaveBeenCalledWith(
        expect.objectContaining({ expiraEn: new Date(AHORA.getTime() + DURACION_DEMO_MS) }),
        AHORA,
      );
      expect(sesion.cuerpo.usuario.esDemo).toBe(true);
    });

    it('no debería borrar la cuenta si la contraseña es incorrecta', async () => {
      const { servicio, usuarios } = crear();
      usuarios.buscarPorId.mockResolvedValue(usuario());
      expect(await codigoDe(servicio.eliminarCuenta('u1', 'mala'))).toBe('CREDENCIALES_INVALIDAS');
      expect(usuarios.eliminar).not.toHaveBeenCalled();
    });

    it('debería borrar la cuenta con la contraseña correcta', async () => {
      const { servicio, usuarios } = crear();
      usuarios.buscarPorId.mockResolvedValue(usuario());
      await servicio.eliminarCuenta('u1', 'Tintura2026');
      expect(usuarios.eliminar).toHaveBeenCalledWith('u1');
    });
  });
});
