import type { Emprendimiento } from '@prisma/client';
import { EmprendimientosService } from '../services/emprendimientos.service';
import type { EmprendimientosRepository } from '../repositories/emprendimientos.repository';
import { DomainException } from '../../../common/errors/domain.exception';

const emp: Emprendimiento = {
  id: 'e1',
  usuarioId: 'u1',
  nombre: 'Peluquería Laura',
  tipo: 'TURNERO',
  creadoEn: new Date('2026-11-15T20:00:00Z'),
  actualizadoEn: new Date('2026-11-15T20:00:00Z'),
};

function crear() {
  const repo = {
    listarDelUsuario: jest.fn(),
    buscarDelUsuario: jest.fn(),
    crearConLimite: jest.fn(),
    renombrar: jest.fn(),
    eliminar: jest.fn(),
  };
  return {
    repo,
    servicio: new EmprendimientosService(repo as unknown as EmprendimientosRepository),
  };
}

describe('EmprendimientosService', () => {
  it('debería crear un emprendimiento respetando el máximo de 3', async () => {
    const { repo, servicio } = crear();
    repo.crearConLimite.mockResolvedValue(emp);
    const creado = await servicio.crear('u1', { nombre: 'Peluquería Laura', tipo: 'TURNERO' });
    expect(repo.crearConLimite).toHaveBeenCalledWith(
      'u1',
      { nombre: 'Peluquería Laura', tipo: 'TURNERO' },
      3,
    );
    expect(creado).toEqual({
      id: 'e1',
      nombre: 'Peluquería Laura',
      tipo: 'TURNERO',
      creadoEn: '2026-11-15T20:00:00.000Z',
    });
  });

  it('debería responder LIMITE_EMPRENDIMIENTOS si el usuario ya tiene 3', async () => {
    const { repo, servicio } = crear();
    repo.crearConLimite.mockResolvedValue(null);
    await expect(servicio.crear('u1', { nombre: 'Cuarto', tipo: 'VENTAS' })).rejects.toMatchObject({
      code: 'LIMITE_EMPRENDIMIENTOS',
    });
  });

  it('debería responder NO_ENCONTRADO para un emprendimiento ajeno', async () => {
    const { repo, servicio } = crear();
    repo.buscarDelUsuario.mockResolvedValue(null);
    await expect(servicio.obtener('e1', 'otro')).rejects.toBeInstanceOf(DomainException);
  });

  it('no debería eliminar si el nombre escrito no coincide', async () => {
    const { repo, servicio } = crear();
    await expect(servicio.eliminar(emp, 'Peluqueria')).rejects.toMatchObject({
      code: 'VALIDACION',
    });
    expect(repo.eliminar).not.toHaveBeenCalled();
  });

  it('debería eliminar si el nombre coincide', async () => {
    const { repo, servicio } = crear();
    await servicio.eliminar(emp, 'Peluquería Laura');
    expect(repo.eliminar).toHaveBeenCalledWith('e1');
  });

  it('debería listar los emprendimientos como DTOs de salida', async () => {
    const { repo, servicio } = crear();
    repo.listarDelUsuario.mockResolvedValue([emp]);
    expect(await servicio.listar('u1')).toHaveLength(1);
  });
});
