import type { CrearPersonaInput, EditarPersonaInput, Paginado, Persona } from '@autonota/shared';
import { DomainException } from '../errors/domain.exception';

/** Registro de cliente o alumno tal como lo devuelve Prisma (Parte 3, sección 5.6) */
export interface PersonaDb {
  id: string;
  emprendimientoId: string;
  nombre: string;
  telefono: string | null;
  notas: string | null;
  activo: boolean;
  creadoEn: Date;
}

export interface FiltroPersonasRepo {
  q?: string;
  activo: boolean;
  saltar: number;
  tomar: number;
}

/** Operaciones de datos comunes a clientes y alumnos */
export interface RepositorioPersonas {
  listar(emprendimientoId: string, filtro: FiltroPersonasRepo): Promise<[PersonaDb[], number]>;
  buscar(id: string, emprendimientoId: string): Promise<PersonaDb | null>;
  crear(datos: {
    emprendimientoId: string;
    nombre: string;
    telefono: string | null;
    notas: string | null;
  }): Promise<PersonaDb>;
  actualizar(
    id: string,
    datos: Partial<Pick<PersonaDb, 'nombre' | 'telefono' | 'notas' | 'activo'>>,
  ): Promise<PersonaDb>;
}

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function aPersonaDto(p: PersonaDb): Persona {
  return {
    id: p.id,
    nombre: p.nombre,
    telefono: p.telefono,
    notas: p.notas,
    activo: p.activo,
    creadoEn: p.creadoEn.toISOString(),
  };
}

/** Reglas comunes de clientes (RF-19) y alumnos (RF-30) */
export class PersonasService {
  constructor(
    protected readonly repo: RepositorioPersonas,
    private readonly nombreAnonimo: string,
  ) {}

  async listar(
    emprendimientoId: string,
    f: { q?: string; activo: boolean; page: number; pageSize: number },
  ): Promise<Paginado<Persona>> {
    const [items, total] = await this.repo.listar(emprendimientoId, {
      q: f.q || undefined,
      activo: f.activo,
      saltar: (f.page - 1) * f.pageSize,
      tomar: f.pageSize,
    });
    return { data: items.map(aPersonaDto), meta: { page: f.page, pageSize: f.pageSize, total } };
  }

  async obtener(emprendimientoId: string, id: string): Promise<Persona> {
    return aPersonaDto(await this.buscarOFallar(emprendimientoId, id));
  }

  async crear(emprendimientoId: string, input: CrearPersonaInput): Promise<Persona> {
    const creada = await this.repo.crear({
      emprendimientoId,
      nombre: input.nombre,
      telefono: input.telefono || null,
      notas: input.notas || null,
    });
    return aPersonaDto(creada);
  }

  /** Edita datos o reactiva (activo: true) */
  async editar(emprendimientoId: string, id: string, input: EditarPersonaInput): Promise<Persona> {
    const actual = await this.buscarOFallar(emprendimientoId, id);
    const actualizada = await this.repo.actualizar(actual.id, {
      nombre: input.nombre,
      telefono: input.telefono === undefined ? undefined : input.telefono || null,
      notas: input.notas === undefined ? undefined : input.notas || null,
      activo: input.activo,
    });
    return aPersonaDto(actualizada);
  }

  /** Baja lógica: conserva sus turnos, clases y pagos (Parte 3, sección 4.4) */
  async darDeBaja(emprendimientoId: string, id: string): Promise<void> {
    const actual = await this.buscarOFallar(emprendimientoId, id);
    await this.repo.actualizar(actual.id, { activo: false });
  }

  /** CU-18: borra los datos personales y conserva turnos, clases y pagos. No se puede deshacer. */
  async anonimizar(emprendimientoId: string, id: string): Promise<Persona> {
    const actual = await this.buscarOFallar(emprendimientoId, id);
    const anonima = await this.repo.actualizar(actual.id, {
      nombre: this.nombreAnonimo,
      telefono: null,
      notas: null,
      activo: false,
    });
    return aPersonaDto(anonima);
  }

  protected async buscarOFallar(emprendimientoId: string, id: string): Promise<PersonaDb> {
    const p = UUID.test(id) ? await this.repo.buscar(id, emprendimientoId) : null;
    if (!p) throw new DomainException('NO_ENCONTRADO');
    return p;
  }
}
