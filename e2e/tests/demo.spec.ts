import { expect, test, type Page } from '@playwright/test';

const DIA_MS = 86_400_000;

/**
 * Día hábil de la semana que viene (la que muestra la agenda al tocar «siguiente»),
 * que no sea el del bloqueo de la demo (hoy + 10 días)
 */
function diaHabilProximo(): string {
  const texto = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Argentina/Buenos_Aires',
  }).format(new Date());
  const hoy = new Date(`${texto}T12:00:00Z`);
  const dia = hoy.getUTCDay();
  const lunesProximo = new Date(hoy.getTime() + ((dia === 0 ? -6 : 1 - dia) + 7) * DIA_MS);
  const bloqueado = new Date(hoy.getTime() + 10 * DIA_MS).toISOString().slice(0, 10);
  for (let d = 0; d < 5; d++) {
    const f = new Date(lunesProximo.getTime() + d * DIA_MS).toISOString().slice(0, 10);
    if (f !== bloqueado) return f;
  }
  throw new Error('Sin día hábil');
}

async function abrirEmprendimiento(page: Page, nombre: string) {
  await page.goto('/emprendimientos');
  await page.getByRole('link', { name: nombre }).click();
}

// CU-15, CU-06, CU-08, CU-09 y CU-10 con una sola cuenta de demostración
test.describe.serial('demo con los tres tipos de negocio', () => {
  let page: Page;

  test.beforeAll(async ({ browser }) => {
    page = await browser.newPage();
  });

  test.afterAll(async () => {
    await page.close();
  });

  test('CU-15: debería crear una cuenta de demostración con los tres tipos de negocio', async () => {
    await page.goto('/');
    await page.getByRole('button', { name: 'Probar demo' }).click();
    await expect(page.getByText('Estás usando una cuenta de prueba')).toBeVisible();
    for (const nombre of [
      'Peluquería de ejemplo',
      'Clases de tenis de ejemplo',
      'Pastelería de ejemplo',
    ]) {
      await expect(page.getByRole('link', { name: nombre })).toBeVisible();
    }
  });

  test('CU-06 y CU-08: debería dar un turno, marcarlo realizado y cobrarlo una sola vez', async () => {
    await abrirEmprendimiento(page, 'Peluquería de ejemplo');
    await expect(page.locator('.fc-timegrid')).toBeVisible();
    await page.getByRole('button', { name: '+ Nuevo turno' }).click();
    const dialogo = page.locator('dialog[open]');
    await dialogo.getByLabel('Cliente').selectOption({ index: 1 });
    await dialogo.getByLabel('Fecha').fill(diaHabilProximo());
    await dialogo.getByLabel('Hora de inicio').fill('13:15');
    await dialogo.getByLabel('Duración estimada (minutos)').fill('30');
    await dialogo.getByLabel(/Descripción del trabajo/).fill('Prueba E2E');
    await dialogo.getByRole('button', { name: 'Guardar' }).click();
    await expect(dialogo).toBeHidden();

    // Ir a la semana del turno y abrirlo
    await page.locator('.fc-next-button').click();
    await page.locator('.fc-event', { hasText: 'Prueba E2E' }).click();
    await page.locator('dialog[open]').getByRole('button', { name: 'Realizado' }).click();
    const cobro = page.locator('dialog[open]');
    await cobro.getByText('Cobré en este momento').click();
    await cobro.getByLabel('Monto en pesos').fill('5.000');
    await cobro.getByRole('button', { name: 'Marcar realizado' }).dblclick();
    await expect(cobro).toBeHidden();

    await page.locator('.fc-event.evento-realizado', { hasText: 'Prueba E2E' }).click();
    await expect(page.locator('dialog[open]')).toContainText('Cobrado: $ 5.000,00');
  });

  test('CU-09: debería registrar el pago por clase de un alumno y dejar de listarlo como deudor', async () => {
    await abrirEmprendimiento(page, 'Clases de tenis de ejemplo');
    const panel = page.locator('aside');
    await panel.getByText('Solo los que deben').click();
    const fila = panel.locator('ul li').filter({ hasText: 'Debe' }).first();
    const nombre = (await fila.locator('p').first().textContent()) ?? '';
    await fila.getByRole('button').first().click();
    await expect(page.getByRole('heading', { name: nombre })).toBeVisible();
    await page.getByRole('button', { name: 'Registrar pago' }).click();
    const dialogo = page.locator('dialog[open]');
    const clases = dialogo.getByRole('checkbox');
    await expect(clases.first()).toBeVisible();
    for (const casilla of await clases.all()) await casilla.check();
    await dialogo.getByLabel('Monto total en pesos').fill('40.000');
    await dialogo.getByRole('button', { name: 'Guardar pago' }).click();
    await expect(dialogo).toBeHidden();
    await page.getByRole('link', { name: '← Volver al calendario' }).click();
    await page.locator('aside').getByText('Solo los que deben').click();
    await expect(page.locator('aside ul li').filter({ hasText: nombre })).toHaveCount(0);
  });

  test('CU-10: debería copiar la semana anterior de clases', async () => {
    await abrirEmprendimiento(page, 'Clases de tenis de ejemplo');
    await expect(page.locator('.fc-timegrid')).toBeVisible();
    // La demo tiene clases hasta la semana que viene; dos semanas adelante está vacía
    await page.locator('.fc-next-button').click();
    await page.locator('.fc-next-button').click();
    await page.getByRole('button', { name: 'Copiar semana anterior' }).click();
    const dialogo = page.locator('dialog[open]');
    await expect(dialogo).toContainText('Semana copiada');
    await expect(dialogo).toContainText(/Se crearon? \d+ clase/);
    await dialogo.getByRole('button', { name: 'Listo' }).click();
    await expect(page.locator('.fc-event').first()).toBeVisible();
  });
});
