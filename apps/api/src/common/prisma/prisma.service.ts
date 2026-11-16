import { Injectable, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { Prisma, PrismaClient } from '@prisma/client';

export type ClienteDb = PrismaClient | Prisma.TransactionClient;

/** Cliente de Prisma. Solo lo usan los repositorios (Parte 6, sección 4.2). */
@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  async onModuleInit(): Promise<void> {
    await this.$connect();
  }

  async onModuleDestroy(): Promise<void> {
    await this.$disconnect();
  }
}

/** Indica si un error de Prisma es una violación de restricción única (P2002) */
export function esViolacionUnica(error: unknown, restriccion?: string): boolean {
  if (!(error instanceof Prisma.PrismaClientKnownRequestError) || error.code !== 'P2002') {
    return false;
  }
  if (!restriccion) return true;
  const destino = error.meta?.target;
  return Array.isArray(destino)
    ? destino.includes(restriccion)
    : String(destino).includes(restriccion);
}
