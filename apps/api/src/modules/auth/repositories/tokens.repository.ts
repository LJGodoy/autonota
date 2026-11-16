import { Injectable } from '@nestjs/common';
import type { RefreshToken, TokenRecuperacion } from '@prisma/client';
import { PrismaService } from '../../../common/prisma/prisma.service';

@Injectable()
export class TokensRepository {
  constructor(private readonly prisma: PrismaService) {}

  async crearRefresh(usuarioId: string, tokenHash: string, expiraEn: Date): Promise<void> {
    await this.prisma.refreshToken.create({ data: { usuarioId, tokenHash, expiraEn } });
  }

  buscarRefresh(tokenHash: string): Promise<RefreshToken | null> {
    return this.prisma.refreshToken.findUnique({ where: { tokenHash } });
  }

  /**
   * CU-02: revoca el token usado y guarda el nuevo en una transacción.
   * Devuelve false si el token ya estaba revocado (dos usos simultáneos o reutilización).
   */
  rotarRefresh(
    idActual: string,
    nuevo: { usuarioId: string; tokenHash: string; expiraEn: Date },
    ahora: Date,
  ): Promise<boolean> {
    return this.prisma.$transaction(async (tx) => {
      const { count } = await tx.refreshToken.updateMany({
        where: { id: idActual, revocadoEn: null },
        data: { revocadoEn: ahora },
      });
      if (count === 0) return false;
      await tx.refreshToken.create({ data: nuevo });
      return true;
    });
  }

  async revocarRefresh(tokenHash: string, ahora: Date): Promise<void> {
    await this.prisma.refreshToken.updateMany({
      where: { tokenHash, revocadoEn: null },
      data: { revocadoEn: ahora },
    });
  }

  async revocarTodos(usuarioId: string, ahora: Date): Promise<void> {
    await this.prisma.refreshToken.updateMany({
      where: { usuarioId, revocadoEn: null },
      data: { revocadoEn: ahora },
    });
  }

  async crearRecuperacion(usuarioId: string, tokenHash: string, expiraEn: Date): Promise<void> {
    await this.prisma.tokenRecuperacion.create({ data: { usuarioId, tokenHash, expiraEn } });
  }

  buscarRecuperacion(tokenHash: string): Promise<TokenRecuperacion | null> {
    return this.prisma.tokenRecuperacion.findUnique({ where: { tokenHash } });
  }

  /**
   * CU-03, paso 7: actualiza la contraseña, marca el token como usado y revoca todas las sesiones.
   * Devuelve false si el token ya se había usado (dos pedidos simultáneos).
   */
  restablecerPassword(
    tokenRecuperacionId: string,
    usuarioId: string,
    passwordHash: string,
    ahora: Date,
  ): Promise<boolean> {
    return this.prisma.$transaction(async (tx) => {
      const { count } = await tx.tokenRecuperacion.updateMany({
        where: { id: tokenRecuperacionId, usadoEn: null },
        data: { usadoEn: ahora },
      });
      if (count === 0) return false;
      await tx.usuario.update({ where: { id: usuarioId }, data: { passwordHash } });
      await tx.refreshToken.updateMany({
        where: { usuarioId, revocadoEn: null },
        data: { revocadoEn: ahora },
      });
      return true;
    });
  }
}
