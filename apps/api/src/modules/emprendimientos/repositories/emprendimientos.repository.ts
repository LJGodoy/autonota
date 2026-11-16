import { Injectable } from '@nestjs/common';
import type { Emprendimiento, TipoEmprendimiento } from '@prisma/client';
import { PrismaService } from '../../../common/prisma/prisma.service';

@Injectable()
export class EmprendimientosRepository {
  constructor(private readonly prisma: PrismaService) {}

  listarDelUsuario(usuarioId: string): Promise<Emprendimiento[]> {
    return this.prisma.emprendimiento.findMany({
      where: { usuarioId },
      orderBy: { creadoEn: 'asc' },
    });
  }

  buscarDelUsuario(id: string, usuarioId: string): Promise<Emprendimiento | null> {
    return this.prisma.emprendimiento.findFirst({ where: { id, usuarioId } });
  }

  /**
   * CU-04, pasos 3 y 4: en una transacción bloquea la fila del usuario (SELECT ... FOR UPDATE),
   * cuenta sus emprendimientos e inserta el nuevo si no superó el máximo.
   * Devuelve null si el usuario ya tiene el máximo (la transacción se deshace).
   */
  crearConLimite(
    usuarioId: string,
    datos: { nombre: string; tipo: TipoEmprendimiento },
    maximo: number,
  ): Promise<Emprendimiento | null> {
    return this.prisma.$transaction(async (tx) => {
      await tx.$queryRaw`SELECT id FROM usuarios WHERE id = ${usuarioId}::uuid FOR UPDATE`;
      const cantidad = await tx.emprendimiento.count({ where: { usuarioId } });
      if (cantidad >= maximo) return null;
      return tx.emprendimiento.create({ data: { usuarioId, ...datos } });
    });
  }

  renombrar(id: string, nombre: string): Promise<Emprendimiento> {
    return this.prisma.emprendimiento.update({ where: { id }, data: { nombre } });
  }

  /** RF-06: la base elimina en cascada todos sus datos */
  async eliminar(id: string): Promise<void> {
    await this.prisma.emprendimiento.delete({ where: { id } });
  }
}
