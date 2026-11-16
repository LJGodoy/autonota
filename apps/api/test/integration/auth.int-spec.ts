import type { NestExpressApplication } from '@nestjs/platform-express';
import request from 'supertest';
import { MailService } from '../../src/common/mail/mail.service';
import { LogMailService } from '../../src/common/mail/log-mail.service';
import { PrismaService } from '../../src/common/prisma/prisma.service';
import { DemoLimpiezaService } from '../../src/modules/auth/services/demo-limpieza.service';
import { API, cookieRefresh, crearApp, emailNuevo, ipNueva, registrar } from './ayudantes';

let app: NestExpressApplication;
let prisma: PrismaService;

beforeAll(async () => {
  app = await crearApp();
  prisma = app.get(PrismaService);
});

afterAll(async () => {
  await app.close();
});

const http = () => request(app.getHttpServer());

describe('GET /health', () => {
  it('debería responder ok sin autenticación', async () => {
    await http().get(`${API}/health`).expect(200, { estado: 'ok' });
  });
});

describe('POST /auth/registro', () => {
  it('debería crear la cuenta, iniciar sesión y enviar la cookie de refresh', async () => {
    const email = emailNuevo();
    const res = await http()
      .post(`${API}/auth/registro`)
      .set('X-Forwarded-For', ipNueva())
      .send({ nombre: 'Laura Pérez', email, password: 'Tintura2026', aceptaPolitica: true })
      .expect(201);
    expect(res.body.usuario).toEqual(
      expect.objectContaining({ nombre: 'Laura Pérez', email, esDemo: false, expiraEn: null }),
    );
    expect(res.body.usuario).not.toHaveProperty('passwordHash');
    const setCookie = ([] as string[]).concat(res.headers['set-cookie'] ?? []).join(';');
    expect(setCookie).toMatch(/refresh_token=.+; Path=\/api\/v1\/auth;.*HttpOnly;.*SameSite=Lax/);
    const guardado = await prisma.usuario.findUniqueOrThrow({ where: { email } });
    expect(guardado.passwordHash).toMatch(/^\$argon2id\$/);
    expect(guardado.politicaAceptadaEn).toBeInstanceOf(Date);
  });

  it('debería responder EMAIL_EN_USO sin distinguir mayúsculas', async () => {
    const { email } = await registrar(app);
    const res = await http()
      .post(`${API}/auth/registro`)
      .set('X-Forwarded-For', ipNueva())
      .send({
        nombre: 'Otra',
        email: email.toUpperCase(),
        password: 'Tintura2026',
        aceptaPolitica: true,
      })
      .expect(409);
    expect(res.body.error.code).toBe('EMAIL_EN_USO');
  });

  it('debería responder VALIDACION con el detalle por campo y rechazar campos no declarados', async () => {
    const res = await http()
      .post(`${API}/auth/registro`)
      .set('X-Forwarded-For', ipNueva())
      .send({
        nombre: '',
        email: 'no-es-email',
        password: 'corta',
        aceptaPolitica: false,
        rol: 'admin',
      })
      .expect(400);
    expect(res.body.error.code).toBe('VALIDACION');
    const campos = res.body.error.details.map((d: { field: string }) => d.field);
    expect(campos).toEqual(
      expect.arrayContaining(['nombre', 'email', 'password', 'aceptaPolitica']),
    );
  });
});

describe('POST /auth/login', () => {
  it('debería iniciar sesión sin distinguir mayúsculas en el email', async () => {
    const s = await registrar(app);
    const res = await http()
      .post(`${API}/auth/login`)
      .set('X-Forwarded-For', ipNueva())
      .send({ email: s.email.toUpperCase(), password: s.password })
      .expect(200);
    expect(res.body.accessToken).toEqual(expect.any(String));
  });

  it('debería responder CREDENCIALES_INVALIDAS con contraseña incorrecta', async () => {
    const s = await registrar(app);
    const res = await http()
      .post(`${API}/auth/login`)
      .set('X-Forwarded-For', ipNueva())
      .send({ email: s.email, password: 'Incorrecta1' })
      .expect(401);
    expect(res.body.error.code).toBe('CREDENCIALES_INVALIDAS');
  });

  it('debería limitar a 5 intentos por minuto por IP, tomando la IP de X-Forwarded-For', async () => {
    const ip = ipNueva();
    for (let i = 0; i < 5; i++) {
      await http()
        .post(`${API}/auth/login`)
        .set('X-Forwarded-For', ip)
        .send({ email: 'a@b.com', password: 'x' })
        .expect(401);
    }
    const res = await http()
      .post(`${API}/auth/login`)
      .set('X-Forwarded-For', ip)
      .send({ email: 'a@b.com', password: 'x' })
      .expect(429);
    expect(res.body.error.code).toBe('DEMASIADAS_PETICIONES');
    // Otra IP no queda bloqueada
    await http()
      .post(`${API}/auth/login`)
      .set('X-Forwarded-For', ipNueva())
      .send({ email: 'a@b.com', password: 'x' })
      .expect(401);
  });
});

describe('GET /auth/me', () => {
  it('debería devolver el usuario autenticado', async () => {
    const s = await registrar(app);
    const res = await http()
      .get(`${API}/auth/me`)
      .set('Authorization', `Bearer ${s.accessToken}`)
      .expect(200);
    expect(res.body.id).toBe(s.usuarioId);
  });

  it('debería responder NO_AUTENTICADO sin token o con un token inválido', async () => {
    expect((await http().get(`${API}/auth/me`).expect(401)).body.error.code).toBe('NO_AUTENTICADO');
    await http().get(`${API}/auth/me`).set('Authorization', 'Bearer basura').expect(401);
  });
});

describe('POST /auth/refresh y /auth/logout', () => {
  it('debería rotar el refresh token y entregar un access token válido', async () => {
    const s = await registrar(app);
    const res = await http().post(`${API}/auth/refresh`).set('Cookie', s.cookie).expect(200);
    const nueva = cookieRefresh(res);
    expect(nueva).toBeDefined();
    expect(nueva).not.toBe(s.cookie);
    await http()
      .get(`${API}/auth/me`)
      .set('Authorization', `Bearer ${res.body.accessToken}`)
      .expect(200);
  });

  it('debería revocar todas las sesiones si se reutiliza un refresh token ya rotado', async () => {
    const s = await registrar(app);
    const rotado = await http().post(`${API}/auth/refresh`).set('Cookie', s.cookie).expect(200);
    await http().post(`${API}/auth/refresh`).set('Cookie', s.cookie).expect(401);
    // El token nuevo también quedó revocado
    await http()
      .post(`${API}/auth/refresh`)
      .set('Cookie', cookieRefresh(rotado) ?? '')
      .expect(401);
  });

  it('debería responder 401 sin cookie', async () => {
    await http().post(`${API}/auth/refresh`).expect(401);
  });

  it('debería revocar el refresh token al cerrar sesión', async () => {
    const s = await registrar(app);
    await http().post(`${API}/auth/logout`).set('Cookie', s.cookie).expect(204);
    await http().post(`${API}/auth/refresh`).set('Cookie', s.cookie).expect(401);
  });
});

describe('POST /auth/recuperar y /auth/restablecer', () => {
  const mail = () => app.get(MailService) as LogMailService;
  const tokenDelUltimoMail = () => {
    const texto = mail().enviados.at(-1)?.texto ?? '';
    return decodeURIComponent(/token=([^\s]+)/.exec(texto)?.[1] ?? '');
  };

  it('debería responder 202 aunque el email no exista, sin enviar nada', async () => {
    const antes = mail().enviados.length;
    await http()
      .post(`${API}/auth/recuperar`)
      .set('X-Forwarded-For', ipNueva())
      .send({ email: emailNuevo() })
      .expect(202);
    expect(mail().enviados.length).toBe(antes);
  });

  it('debería cambiar la contraseña, cerrar las sesiones y no aceptar el token dos veces', async () => {
    const s = await registrar(app);
    await http()
      .post(`${API}/auth/recuperar`)
      .set('X-Forwarded-For', ipNueva())
      .send({ email: s.email })
      .expect(202);
    await new Promise((r) => setTimeout(r, 50));
    const token = tokenDelUltimoMail();
    expect(token).not.toBe('');

    await http()
      .post(`${API}/auth/restablecer`)
      .send({ token, password: 'NuevaClave99' })
      .expect(204);
    await http().post(`${API}/auth/refresh`).set('Cookie', s.cookie).expect(401);
    await http()
      .post(`${API}/auth/login`)
      .set('X-Forwarded-For', ipNueva())
      .send({ email: s.email, password: 'NuevaClave99' })
      .expect(200);
    const res = await http()
      .post(`${API}/auth/restablecer`)
      .send({ token, password: 'OtraClave99' })
      .expect(410);
    expect(res.body.error.code).toBe('TOKEN_VENCIDO');
  });
});

describe('POST /auth/demo', () => {
  it('debería crear una cuenta de demostración con un emprendimiento de cada tipo y datos de ejemplo', async () => {
    const res = await http()
      .post(`${API}/auth/demo`)
      .set('X-Forwarded-For', ipNueva())
      .send({ aceptaPolitica: true })
      .expect(201);
    expect(res.body.usuario.esDemo).toBe(true);
    const vence = new Date(res.body.usuario.expiraEn).getTime() - Date.now();
    expect(vence).toBeGreaterThan(47 * 3600_000);
    expect(vence).toBeLessThanOrEqual(48 * 3600_000);

    const emps = await http()
      .get(`${API}/emprendimientos`)
      .set('Authorization', `Bearer ${res.body.accessToken}`)
      .expect(200);
    expect(emps.body.map((e: { tipo: string }) => e.tipo).sort()).toEqual([
      'CLASES',
      'TURNERO',
      'VENTAS',
    ]);
    const id = res.body.usuario.id as string;
    const where = { emprendimiento: { usuarioId: id } };
    expect(await prisma.turno.count({ where })).toBeGreaterThan(10);
    expect(await prisma.clase.count({ where })).toBeGreaterThan(5);
    expect(await prisma.tarea.count({ where })).toBeGreaterThan(3);
    expect(await prisma.movimiento.count({ where })).toBeGreaterThan(30);
  });

  it('debería exigir que se acepte la política', async () => {
    await http().post(`${API}/auth/demo`).set('X-Forwarded-For', ipNueva()).send({}).expect(400);
  });

  it('debería limitar a 3 cuentas de demostración por hora por IP', async () => {
    const ip = ipNueva();
    for (let i = 0; i < 3; i++) {
      await http()
        .post(`${API}/auth/demo`)
        .set('X-Forwarded-For', ip)
        .send({ aceptaPolitica: true })
        .expect(201);
    }
    await http()
      .post(`${API}/auth/demo`)
      .set('X-Forwarded-For', ip)
      .send({ aceptaPolitica: true })
      .expect(429);
  });

  it('debería eliminar las cuentas de demostración vencidas con todos sus datos', async () => {
    const res = await http()
      .post(`${API}/auth/demo`)
      .set('X-Forwarded-For', ipNueva())
      .send({ aceptaPolitica: true })
      .expect(201);
    const id = res.body.usuario.id as string;
    const limpieza = app.get(DemoLimpiezaService);
    await limpieza.limpiar(new Date(Date.now() + 47 * 3600_000));
    expect(await prisma.usuario.count({ where: { id } })).toBe(1);
    await limpieza.limpiar(new Date(Date.now() + 49 * 3600_000));
    expect(await prisma.usuario.count({ where: { id } })).toBe(0);
    expect(await prisma.emprendimiento.count({ where: { usuarioId: id } })).toBe(0);
  });
});

describe('DELETE /auth/cuenta', () => {
  it('no debería borrar nada con una contraseña incorrecta', async () => {
    const s = await registrar(app);
    const res = await http()
      .delete(`${API}/auth/cuenta`)
      .set('Authorization', `Bearer ${s.accessToken}`)
      .send({ password: 'Incorrecta1' })
      .expect(401);
    expect(res.body.error.code).toBe('CREDENCIALES_INVALIDAS');
    expect(await prisma.usuario.count({ where: { id: s.usuarioId } })).toBe(1);
  });

  it('debería borrar el usuario con sus emprendimientos y sesiones', async () => {
    const s = await registrar(app);
    const auth = { Authorization: `Bearer ${s.accessToken}` };
    await http()
      .post(`${API}/emprendimientos`)
      .set(auth)
      .send({ nombre: 'Mío', tipo: 'VENTAS' })
      .expect(201);
    await http().delete(`${API}/auth/cuenta`).set(auth).send({ password: s.password }).expect(204);
    expect(await prisma.usuario.count({ where: { id: s.usuarioId } })).toBe(0);
    expect(await prisma.emprendimiento.count({ where: { usuarioId: s.usuarioId } })).toBe(0);
    await http().post(`${API}/auth/refresh`).set('Cookie', s.cookie).expect(401);
  });
});
