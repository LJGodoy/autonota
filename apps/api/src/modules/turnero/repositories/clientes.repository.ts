import { Injectable } from '@nestjs/common';
import type { Prisma } from '@prisma/client';
import { PrismaService } from '../../../common/prisma/prisma.service';
import type {
  FiltroPersonasRepo,
  PersonaDb,
  RepositorioPersonas,
} from '../../../common/personas/personas.service';

@Injectable()
export class ClientesRepository implements RepositorioPersonas {
  constructor(private readonly prisma: PrismaService) {}

  /** RF-19: q busca por nombre o teléfono */
  listar(emprendimientoId: string, f: FiltroPersonasRepo): Promise<[PersonaDb[], number]> {
    const where: Prisma.ClienteWhereInput = { emprendimientoId, activo: f.activo };
    if (f.q) {
      where.OR = [
        { nombre: { contains: f.q, mode: 'insensitive' } },
        { telefono: { contains: f.q } },
      ];
    }
    return this.prisma.$transaction([
      this.prisma.cliente.findMany({
        where,
        orderBy: { nombre: 'asc' },
        skip: f.saltar,
        take: f.tomar,
      }),
      this.prisma.cliente.count({ where }),
    ]);
  }

  buscar(id: string, emprendimientoId: string): Promise<PersonaDb | null> {
    return this.prisma.cliente.findFirst({ where: { id, emprendimientoId } });
  }

  crear(datos: Prisma.ClienteUncheckedCreateInput): Promise<PersonaDb> {
    return this.prisma.cliente.create({ data: datos });
  }

  actualizar(id: string, datos: Prisma.ClienteUpdateInput): Promise<PersonaDb> {
    return this.prisma.cliente.update({ where: { id }, data: datos });
  }
}
