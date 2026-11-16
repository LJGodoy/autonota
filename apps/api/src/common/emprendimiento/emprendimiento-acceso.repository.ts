import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import type { EmprendimientoDePeticion } from '../auth/peticion';

/** Consulta mínima que usa el guard de propiedad del emprendimiento */
@Injectable()
export class EmprendimientoAccesoRepository {
  constructor(private readonly prisma: PrismaService) {}

  buscarDelUsuario(id: string, usuarioId: string): Promise<EmprendimientoDePeticion | null> {
    return this.prisma.emprendimiento.findFirst({
      where: { id, usuarioId },
      select: { id: true, usuarioId: true, nombre: true, tipo: true },
    });
  }
}
