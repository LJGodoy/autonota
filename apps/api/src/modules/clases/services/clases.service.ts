import { Injectable } from '@nestjs/common';
import type {
  BorrarClasesInput,
  CancelarClaseInput,
  Clase,
  CopiarSemanaInput,
  CrearClaseInput,
  EditarClaseInput,
  ResultadoCopiaClases,
} from '@autonota/shared';
import { DomainException } from '../../../common/errors/domain.exception';
import { MS_SEMANA } from '../../../common/utils/agenda';
import { desdeHoraArgentina } from '../../../common/utils/fechas';
import {
  ClasesRepository,
  type ClaseConAlumnos,
  type NuevaClase,
} from '../repositories/clases.repository';
import { AlumnosService } from './alumnos.service';

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function aClaseDto(c: ClaseConAlumnos): Clase {
  return {
    id: c.id,
    titulo: c.titulo,
    modalidad: c.modalidad,
    inicio: c.inicio.toISOString(),
    fin: c.fin.toISOString(),
    duracionMinutos: Math.round((c.fin.getTime() - c.inicio.getTime()) / 60000),
    cancelada: c.canceladaEn !== null,
    motivoCancelacion: c.motivoCancelacion,
    alumnos: c.alumnos.map((ca) => ({ ...ca.alumno, pagada: ca.pago !== null })),
  };
}

@Injectable()
export class ClasesService {
  constructor(
    private readonly repo: ClasesRepository,
    private readonly alumnos: AlumnosService,
  ) {}

  /** RF-33 */
  async listar(emprendimientoId: string, desde: string, hasta: string): Promise<Clase[]> {
    return (await this.repo.listar(emprendimientoId, new Date(desde), new Date(hasta))).map(
      aClaseDto,
    );
  }

  async obtener(emprendimientoId: string, id: string): Promise<Clase> {
    return aClaseDto(await this.buscarOFallar(emprendimientoId, id));
  }

  /** RF-31: individual o grupal, con alumnos activos del mismo emprendimiento */
  async crear(emprendimientoId: string, input: CrearClaseInput): Promise<Clase> {
    await this.validarAlumnos(emprendimientoId, input.alumnoIds);
    const inicio = new Date(input.inicio);
    return aClaseDto(
      await this.repo.crear({
        emprendimientoId,
        titulo: input.titulo || null,
        modalidad: input.modalidad,
        inicio,
        fin: new Date(inicio.getTime() + input.duracionMinutos * 60000),
        alumnoIds: input.alumnoIds,
      }),
    );
  }

  /** RF-32: edita o reprograma una clase, incluida la lista de alumnos */
  async editar(emprendimientoId: string, id: string, input: EditarClaseInput): Promise<Clase> {
    const actual = await this.buscarOFallar(emprendimientoId, id);
    if (actual.canceladaEn) {
      throw new DomainException('ESTADO_INVALIDO', 'Una clase cancelada no se puede editar.');
    }
    const modalidad = input.modalidad ?? actual.modalidad;
    const alumnoIds = input.alumnoIds ?? actual.alumnos.map((a) => a.alumnoId);
    if (modalidad === 'INDIVIDUAL' && alumnoIds.length !== 1) {
      throw new DomainException('VALIDACION', 'Una clase individual tiene exactamente un alumno.', [
        { field: 'alumnoIds', message: 'Una clase individual tiene exactamente un alumno' },
      ]);
    }
    if (input.alumnoIds) await this.validarAlumnos(emprendimientoId, input.alumnoIds);
    const inicio = input.inicio ? new Date(input.inicio) : actual.inicio;
    const duracion =
      input.duracionMinutos ?? Math.round((actual.fin.getTime() - actual.inicio.getTime()) / 60000);
    const actualizada = await this.repo.actualizar(
      actual.id,
      {
        titulo: input.titulo === undefined ? undefined : input.titulo || null,
        modalidad,
        inicio,
        fin: new Date(inicio.getTime() + duracion * 60000),
      },
      input.alumnoIds,
    );
    return aClaseDto(actualizada);
  }

  /** Cancela la clase sin borrarla: deja de contar como deuda y los pagos ya hechos se conservan */
  async cancelar(emprendimientoId: string, id: string, input: CancelarClaseInput): Promise<Clase> {
    const actual = await this.buscarOFallar(emprendimientoId, id);
    if (actual.canceladaEn) {
      throw new DomainException('ESTADO_INVALIDO', 'La clase ya está cancelada.');
    }
    return aClaseDto(
      await this.repo.actualizar(actual.id, {
        canceladaEn: new Date(),
        motivoCancelacion: input.motivo || null,
      }),
    );
  }

  /** Borra la clase; los ingresos quedan, sin el vínculo con ella */
  async eliminar(emprendimientoId: string, id: string): Promise<void> {
    const actual = await this.buscarOFallar(emprendimientoId, id);
    await this.repo.eliminar(actual.id);
  }

  /** Borrado de las clases del día o la semana que se ve en el calendario */
  async borrarDelRango(
    emprendimientoId: string,
    input: BorrarClasesInput,
  ): Promise<{ borradas: number }> {
    const borradas = await this.repo.eliminarQueEmpiezanEn(
      emprendimientoId,
      new Date(input.desde),
      new Date(input.hasta),
    );
    return { borradas };
  }

  /**
   * CU-10 (RF-37): copia las clases a la semana siguiente con sus alumnos activos.
   * Omite las que quedan sin alumnos. Con forzar, las copias se suman a las existentes.
   */
  async copiarSemana(
    emprendimientoId: string,
    input: CopiarSemanaInput,
  ): Promise<ResultadoCopiaClases> {
    const [a, m, d] = input.semanaOrigen.split('-').map(Number) as [number, number, number];
    const origen = desdeHoraArgentina(a, m, d);
    const destino = new Date(origen.getTime() + MS_SEMANA);
    const existentes = await this.repo.queEmpiezanEn(
      emprendimientoId,
      destino,
      new Date(destino.getTime() + MS_SEMANA),
    );
    if (existentes.length > 0 && !input.forzar) throw new DomainException('SEMANA_DESTINO_OCUPADA');

    const fuente = await this.repo.queEmpiezanEn(emprendimientoId, origen, destino);
    const nuevas: NuevaClase[] = [];
    const omitidas: ResultadoCopiaClases['omitidas'] = [];
    for (const c of fuente) {
      const alumnoIds = c.alumnos.filter((ca) => ca.alumno.activo).map((ca) => ca.alumnoId);
      const inicio = new Date(c.inicio.getTime() + MS_SEMANA);
      if (alumnoIds.length === 0) {
        omitidas.push({
          claseOrigenId: c.id,
          inicio: inicio.toISOString(),
          titulo: c.titulo,
          motivo: 'SIN_ALUMNOS',
        });
        continue;
      }
      nuevas.push({
        emprendimientoId,
        titulo: c.titulo,
        modalidad: c.modalidad,
        inicio,
        fin: new Date(c.fin.getTime() + MS_SEMANA),
        alumnoIds,
      });
    }
    const creadas = nuevas.length ? await this.repo.crearVarias(nuevas) : [];
    return { creadas: creadas.map(aClaseDto), omitidas };
  }

  private async buscarOFallar(emprendimientoId: string, id: string): Promise<ClaseConAlumnos> {
    const c = UUID.test(id) ? await this.repo.buscar(id, emprendimientoId) : null;
    if (!c) throw new DomainException('NO_ENCONTRADO');
    return c;
  }

  /** Los alumnos deben estar activos y pertenecer al emprendimiento (400 VALIDACION) */
  private async validarAlumnos(emprendimientoId: string, ids: string[]): Promise<void> {
    const activos = await this.alumnos.activosEntre(emprendimientoId, ids);
    if (activos.length !== ids.length) {
      throw new DomainException('VALIDACION', 'Hay alumnos que no existen o están dados de baja.', [
        { field: 'alumnoIds', message: 'Elegí alumnos activos' },
      ]);
    }
  }
}
