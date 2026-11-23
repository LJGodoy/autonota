import { expect, test } from '@playwright/test';

// CU-01 (iniciar sesión) y CU-02 (renovar la sesión), con una cuenta propia que se elimina al final (CU-17)
test.describe.serial('cuenta y sesión', () => {
  const email = `e2e-${Date.now()}@mail.com`;
  const password = 'Prueba2026e2e';

  test('debería registrarse, cerrar sesión, iniciar sesión y mantenerla al recargar', async ({
    page,
  }) => {
    await page.goto('/registro');
    await page.getByLabel('Tu nombre').fill('Prueba E2E');
    await page.getByLabel('Email').fill(email);
    await page.getByLabel('Contraseña').fill(password);
    await page.getByLabel(/Leí y acepto/).check();
    await page.getByRole('button', { name: 'Crear cuenta' }).click();
    await expect(page.getByRole('heading', { name: 'Hola, Prueba E2E' })).toBeVisible();

    await page.getByRole('button', { name: 'Menú de la cuenta' }).click();
    await page.getByRole('menuitem', { name: 'Cerrar sesión' }).click();
    await expect(page).toHaveURL(/\/$/);

    // CU-01
    await page.goto('/ingresar');
    await page.getByLabel('Email').fill(email.toUpperCase());
    await page.getByLabel('Contraseña').fill(password);
    await page.getByRole('button', { name: 'Ingresar' }).click();
    await expect(page.getByRole('heading', { name: 'Hola, Prueba E2E' })).toBeVisible();

    // CU-02: el access token vive en memoria; al recargar, la cookie lo renueva a través del proxy
    await page.reload();
    await expect(page.getByRole('heading', { name: 'Hola, Prueba E2E' })).toBeVisible();
    expect(await page.evaluate(() => document.cookie)).not.toContain('refresh_token');

    // CU-17: limpieza
    await page.getByRole('button', { name: 'Menú de la cuenta' }).click();
    await page.getByRole('menuitem', { name: 'Eliminar cuenta' }).click();
    await page.getByRole('button', { name: 'Eliminar mi cuenta' }).click();
    await page.getByLabel('Tu contraseña, para confirmar').fill(password);
    await page.getByRole('button', { name: 'Eliminar para siempre' }).click();
    await expect(page).toHaveURL(/\/$/);
  });

  test('debería rechazar credenciales incorrectas con el mismo mensaje', async ({ page }) => {
    await page.goto('/ingresar');
    await page.getByLabel('Email').fill(email);
    await page.getByLabel('Contraseña').fill('Incorrecta123');
    await page.getByRole('button', { name: 'Ingresar' }).click();
    await expect(page.getByRole('alert')).toContainText(
      'El email o la contraseña no son correctos',
    );
  });
});
