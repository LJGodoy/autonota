import { Injectable } from '@nestjs/common';
import * as argon2 from 'argon2';

/** Hash de contraseñas con Argon2 (RNF-03, ADR-006) */
@Injectable()
export class PasswordHasher {
  hash(password: string): Promise<string> {
    return argon2.hash(password, { type: argon2.argon2id });
  }

  async verificar(hash: string, password: string): Promise<boolean> {
    try {
      return await argon2.verify(hash, password);
    } catch {
      return false;
    }
  }
}
