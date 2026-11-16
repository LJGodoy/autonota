// Seed del entorno local: crea un usuario con datos de ejemplo de los tres tipos de negocio,
// con la misma función que usa POST /auth/demo (Parte 6, sección 6).
// Credenciales: ejemplo@autonota.local / Ejemplo2026
import { PrismaClient } from '@prisma/client';
import * as argon2 from 'argon2';
import { cargarDatosEjemplo } from '../src/common/demo/datos-ejemplo';

const EMAIL = 'ejemplo@autonota.local';

async function main(): Promise<void> {
  const prisma = new PrismaClient();
  try {
    await prisma.usuario.deleteMany({ where: { email: EMAIL } });
    const ahora = new Date();
    await prisma.$transaction(
      async (tx) => {
        const usuario = await tx.usuario.create({
          data: {
            nombre: 'Usuario de ejemplo',
            email: EMAIL,
            passwordHash: await argon2.hash('Ejemplo2026', { type: argon2.argon2id }),
            politicaAceptadaEn: ahora,
          },
        });
        await cargarDatosEjemplo(tx, usuario.id, ahora);
      },
      { timeout: 30000 },
    );
    process.stdout.write(`Seed listo. Usuario: ${EMAIL} / Ejemplo2026\n`);
  } finally {
    await prisma.$disconnect();
  }
}

void main();
