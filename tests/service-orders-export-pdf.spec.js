import { test, expect } from '@playwright/test';

const baseUrl = process.env.PLAYWRIGHT_BASE_URL || 'https://aguia-florestal-tawny.vercel.app';
const adminPassword = '12345';

test.setTimeout(60000);

async function loginAsAdmin(page) {
  await page.goto(`${baseUrl}/login`, { waitUntil: 'domcontentloaded' });
  await page.waitForLoadState('networkidle');

  const adminButton = page.locator('button').filter({ hasText: /admin/i }).first();
  await expect(adminButton).toBeVisible({ timeout: 15000 });
  await adminButton.click();
  await page.waitForTimeout(800);

  const desktopPasswordInput = page.locator('input[placeholder="Digite sua senha"]');
  const numericPasswordInput = page.locator('input[placeholder="••••••••"]');

  if (await desktopPasswordInput.isVisible().catch(() => false)) {
    await desktopPasswordInput.fill(adminPassword);
    await page.getByRole('button', { name: /^Entrar$/i }).click();
  } else if (await numericPasswordInput.isVisible().catch(() => false)) {
    for (const digit of adminPassword.split('')) {
      await page.getByRole('button', { name: `Número ${digit}` }).click();
    }
    await page.getByRole('button', { name: /^Entrar$/i }).click();
  } else {
    throw new Error('Tela de senha do login nao apareceu');
  }

  await page.waitForURL((url) => !url.pathname.endsWith('/login'), { timeout: 20000 });
  await page.waitForLoadState('networkidle');
}

test('exportar PDF da visualização gera download sem erro', async ({ browser }) => {
  const context = await browser.newContext({
    acceptDownloads: true,
    viewport: { width: 1440, height: 1080 },
    serviceWorkers: 'block',
  });

  const page = await context.newPage();
  const pageErrors = [];

  page.on('pageerror', (error) => {
    pageErrors.push(String(error));
  });

  await loginAsAdmin(page);
  await page.goto(`${baseUrl}/service-orders`, { waitUntil: 'domcontentloaded' });
  await page.waitForLoadState('networkidle');

  await page.getByRole('button', { name: /Visualizar/i }).first().click();
  await expect(page.getByText(/Ordem de Serviço #/i).first()).toBeVisible({ timeout: 15000 });

  const downloadPromise = page.waitForEvent('download', { timeout: 30000 });
  await page.getByRole('button', { name: /Exportar PDF/i }).click();
  const download = await downloadPromise;

  expect(download.suggestedFilename().toLowerCase()).toContain('.pdf');
  expect(pageErrors, `A página lançou erros ao exportar PDF: ${pageErrors.join(' | ')}`).toEqual([]);

  await context.close();
});