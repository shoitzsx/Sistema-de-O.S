import { test, expect, devices } from '@playwright/test';

const baseUrl = process.env.PLAYWRIGHT_BASE_URL || 'https://aguia-florestal-tawny.vercel.app';
const adminPassword = '12345';

async function measure(locator) {
  return locator.evaluate((element) => {
    const rect = element.getBoundingClientRect();
    return {
      x: rect.x,
      y: rect.y,
      width: rect.width,
      height: rect.height,
    };
  });
}

const viewports = [
  {
    name: 'desktop',
    options: {
      viewport: { width: 1440, height: 1080 },
    },
  },
  {
    name: 'notebook',
    options: {
      viewport: { width: 1280, height: 900 },
    },
  },
  {
    name: 'tablet',
    options: {
      ...devices['iPad (gen 7)'],
    },
  },
  {
    name: 'android',
    options: {
      ...devices['Pixel 7'],
    },
  },
];

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
  await page.goto(`${baseUrl}/checklist`, { waitUntil: 'domcontentloaded' });
  await page.waitForLoadState('networkidle');
}

for (const { name, options } of viewports) {
  test(`modal checklist responsivo em ${name}`, async ({ browser }) => {
    const context = await browser.newContext({
      ...options,
      serviceWorkers: 'block',
    });

    const page = await context.newPage();
    await loginAsAdmin(page);

    const openModalButton = page.getByRole('button', { name: /Cadastrar Inspeção/i });
    await expect(openModalButton).toBeVisible({ timeout: 15000 });
    await openModalButton.click();

    const modalTitle = page.getByRole('heading', { name: /Configuração de Inspeção/i });
    const structureHeading = page.getByTestId('checklist-template-structure-title');
    const leftPanel = page.getByTestId('checklist-template-left-panel');
    const rightPanel = page.getByTestId('checklist-template-right-panel');
    const structureContent = page.getByTestId('checklist-template-structure-content');

    await expect(modalTitle).toBeVisible({ timeout: 15000 });
    await expect(structureHeading).toBeVisible({ timeout: 15000 });
    await expect(leftPanel).toBeVisible({ timeout: 15000 });
    await expect(rightPanel).toBeVisible({ timeout: 15000 });
    await expect(structureContent).toBeVisible({ timeout: 15000 });

    await structureHeading.scrollIntoViewIfNeeded();
    await leftPanel.scrollIntoViewIfNeeded();
    await structureContent.scrollIntoViewIfNeeded();

    const titleBox = await measure(structureHeading);
    const contentBox = await measure(structureContent);
    const leftPanelBox = await measure(leftPanel);
    const rightPanelBox = await measure(rightPanel);

    expect(contentBox.y, `O painel direito sobrepoe o titulo em ${name}`).toBeGreaterThan(titleBox.y + titleBox.height + 12);
    if (name === 'desktop' || name === 'notebook') {
      expect(rightPanelBox.x, `O painel direito nao ficou separado do painel esquerdo em ${name}`).toBeGreaterThan(leftPanelBox.x + leftPanelBox.width + 16);
    }

    await page.screenshot({
      path: `test-results/checklist-modal-${name}.png`,
      fullPage: true,
    });

    await context.close();
  });
}