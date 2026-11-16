import { Injectable } from '@nestjs/common';
import type { Usuario } from '@prisma/client';
import { PrismaService, type ClienteDb } from '../../../common/prisma/prisma.service';
import { cargarDatosEjemplo } from '../../../common/demo/datos-ejemplo';

export interface DatosNuevoUsuario {
  nombre: string;
  email: string;
  passwordHash: string;
  politicaAceptadaEn: Date;
  esDemo?: boolean;
  expiraEn?: Date | null;
}

@Injectable()
export class UsuariosRepository {
  constructor(private readonly prisma: PrismaService) {}

  buscarPorEmail(email: string): Promise<Usuario | null> {
    // email es CITEXT: la comparación no distingue mayúsculas (CU-01)
    return this.prisma.usuario.findUnique({ where: { email } });
  }

  buscarPorId(id: string): Promise<Usuario | null> {
    return this.prisma.usuario.findUnique({ where: { id } });
  }

  crear(datos: DatosNuevoUsuario): Promise<Usuario> {
    return this.prisma.usuario.create({ data: datos });
  }

  /** CU-15: crea el usuario de demostración y sus datos de ejemplo en una transacción */
  crearDemo(datos: DatosNuevoUsuario, ahora: Date): Promise<Usuario> {
    return this.prisma.$transaction(
      async (tx) => {
        const usuario = await tx.usuario.create({ data: { ...datos, esDemo: true } });
        await cargarDatosEjemplo(tx, usuario.id, ahora);
        return usuario;
      },
      { timeout: 20000 },
    );
  }

  /** RF-09: borra el usuario; la base elimina en cascada todos sus datos */
  async eliminar(id: string, db: ClienteDb = this.prisma): Promise<void> {
    await db.usuario.delete({ where: { id } });
  }

  /** ADR-014: elimina las cuentas de demostración vencidas con todos sus datos */
  async eliminarDemosVencidos(ahora: Date): Promise<number> {
    const { count } = await this.prisma.usuario.deleteMany({
      where: { esDemo: true, expiraEn: { lt: ahora } },
    });
    return count;
  }
}
