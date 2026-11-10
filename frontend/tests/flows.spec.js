import { test, expect } from '@playwright/test';
import { readFile, mkdir } from 'node:fs/promises';
import { randomBytes } from 'node:crypto';
import path from 'node:path';

let fixture;
test.beforeAll(async () => {
  fixture = JSON.parse(await readFile(new URL('../.e2e/session.json', import.meta.url), 'utf8'));
});

async function login(page, role = 'admin') {
  await page.goto('/#/login');
  await page.getByLabel('E-mail', { exact: true }).fill(fixture.accounts[role].email);
  await page.getByLabel('Senha', { exact: true }).fill(fixture.accounts[role].password);
  await page.locator('form button[type="submit"]').click();
  await expect(page).toHaveURL(/#\/dashboard$/);
  await expect(page.locator('h1')).toContainText(/Visão geral|Dashboard/);
}

async function route(page, routeName, heading) {
  await page.evaluate((name) => {
    location.hash = '#/' + name;
  }, routeName);
  if (heading)
    await expect(page.getByRole('heading', { name: heading, exact: true })).toBeVisible();
}

async function screenshot(page, filename) {
  if (process.env.E2E_SCREENSHOTS !== '1') return;
  await expect(page.locator('.loading-state')).toHaveCount(0);
  await expect(page.locator('.toast')).toHaveCount(0, { timeout: 8000 });
  await expect(page.locator('.loading-state')).toHaveCount(0);
  await page.evaluate(() => document.fonts.ready);
  const directory = path.resolve('docs/screenshots');
  await mkdir(directory, { recursive: true });
  await page.screenshot({ path: path.join(directory, filename), fullPage: true });
}

async function api(request, role = 'admin') {
  const user = fixture.accounts[role];
  const response = await request.post(fixture.apiURL + '/login', {
    data: { email: user.email, senha: user.password },
  });
  expect(response.ok()).toBeTruthy();
  const { token } = await response.json();
  return async (method, resource, data) => {
    const result = await request.fetch(fixture.apiURL + resource, {
      method,
      headers: { Authorization: 'Bearer ' + token },
      ...(data ? { data } : {}),
    });
    return result;
  };
}

async function createCatalog(page, resource, singular, values) {
  await route(page, resource);
  await page.getByRole('button', { name: '+ Novo ' + singular, exact: true }).click();
  for (const [name, value] of Object.entries(values)) {
    const control = page.locator(`[data-catalog-form] [name="${name}"]`);
    if ((await control.evaluate((element) => element.tagName)) === 'SELECT')
      await control.selectOption(value);
    else await control.fill(String(value));
  }
  await page.getByRole('button', { name: 'Criar cadastro', exact: true }).click();
  await expect(page).toHaveURL(new RegExp(`#/${resource}/[0-9]+$`));
  await expect(
    page.getByRole('heading', { name: 'Informações do cadastro', exact: true }),
  ).toBeVisible();
  return page.url().split('/').at(-1);
}

async function seedInspection(request, suffix, owner = 'inspetor') {
  const admin = await api(request);
  async function create(resource, data) {
    const response = await admin('POST', resource, data);
    expect(response.status()).toBe(201);
    return response.json();
  }
  const product = await create('/produtos', { codigo: 'P-' + suffix, nome: 'Produto ' + suffix });
  const lot = await create('/lotes', {
    codigo: 'L-' + suffix,
    produto_id: product.id,
    quantidade: 10,
  });
  const criterion = await create('/criterios', { nome: 'Critério ' + suffix });
  const checklist = await create('/checklists', { nome: 'Checklist ' + suffix });
  const item = await create(`/checklists/${checklist.id}/itens`, { criterio_id: criterion.id });
  const asOwner = await api(request, owner);
  const response = await asOwner('POST', '/inspecoes', {
    lote_id: lot.id,
    checklist_id: checklist.id,
  });
  expect(response.status()).toBe(201);
  const inspection = await response.json();
  return { inspection, lot, checklist, item, product, asOwner, admin };
}

test('login inválido, sessão em memória, logout e proteção de rota', async ({ page }) => {
  await page.goto('/#/produtos');
  await expect(page.getByLabel('E-mail', { exact: true })).toBeVisible();
  await screenshot(page, 'login-desktop.png');
  await page.getByLabel('E-mail', { exact: true }).fill(fixture.accounts.admin.email);
  await page.getByLabel('Senha', { exact: true }).fill('senha-incorreta-123');
  await page.locator('form button[type="submit"]').click();
  await expect(page.getByRole('alert')).toContainText('Credenciais inválidas');
  await login(page);
  expect(
    await page.evaluate(() => ({ local: { ...localStorage }, session: { ...sessionStorage } })),
  ).toEqual({ local: {}, session: {} });
  await page.getByRole('button', { name: 'Sair', exact: true }).click();
  await expect(page.getByLabel('E-mail', { exact: true })).toBeVisible();
  await route(page, 'produtos');
  await expect(page.getByLabel('E-mail', { exact: true })).toBeVisible();
  await login(page);
  await page.reload();
  await expect(page.getByLabel('E-mail', { exact: true })).toBeVisible();
});

test('fluxo completo persiste cadastros, inspeção, desvio, foto, histórico e relatório', async ({
  page,
  request,
}) => {
  await login(page);
  const productId = await createCatalog(page, 'produtos', 'produto', {
    codigo: 'P-E2E-001',
    nome: 'Peça de controle E2E',
    descricao: 'Registro sintético de teste integrado.',
  });
  await page.getByRole('button', { name: 'Editar cadastro', exact: true }).click();
  await page
    .locator('[data-catalog-form] [name="descricao"]')
    .fill('Descrição revisada pelo fluxo de edição.');
  await page.getByRole('button', { name: 'Salvar alterações', exact: true }).click();
  await expect(
    page.getByText('Descrição revisada pelo fluxo de edição.', { exact: true }),
  ).toBeVisible();
  await route(page, 'produtos', 'Produtos');
  await page.getByLabel('Buscar produtos').fill('P-E2E-001');
  await expect(page.getByRole('row').filter({ hasText: 'Peça de controle E2E' })).toBeVisible();
  await page.getByLabel('Buscar produtos').fill('inexistente-xyz');
  await expect(page.getByText('Nenhum registro corresponde aos filtros.')).toBeVisible();
  const criterionId = await createCatalog(page, 'criterios', 'critério', {
    nome: 'Integridade da superfície E2E',
    descricao: 'Verificar riscos e acabamento.',
  });
  const checklistId = await createCatalog(page, 'checklists', 'checklist', {
    nome: 'Inspeção visual E2E',
  });
  await page.getByLabel('Critério *', { exact: true }).selectOption(criterionId);
  await page.getByRole('button', { name: 'Adicionar item', exact: true }).click();
  await expect(
    page.getByRole('row').filter({ hasText: 'Integridade da superfície E2E' }),
  ).toBeVisible();
  const lotId = await createCatalog(page, 'lotes', 'lote', {
    codigo: 'L-E2E-001',
    produto_id: productId,
    quantidade: 20,
  });
  await createCatalog(page, 'inspetores', 'inspetor', {
    nome: 'Inspetor cadastrado E2E',
    email: 'cadastrado@gp4.test',
    senha: randomBytes(18).toString('base64url'),
  });
  await route(page, 'inspecoes', 'Inspeções');
  await page.getByRole('button', { name: 'Nova inspeção', exact: true }).click();
  await page.getByLabel('Lote', { exact: true }).selectOption(lotId);
  await page.getByLabel('Checklist', { exact: true }).selectOption(checklistId);
  await page.getByRole('button', { name: 'Iniciar inspeção', exact: true }).click();
  await expect(
    page.getByRole('heading', { name: 'Inspeção do lote L-E2E-001', exact: true }),
  ).toBeVisible();
  const inspectionId = page.url().split('/').at(-1);
  await page.getByRole('button', { name: 'Revisar conclusão', exact: true }).click();
  await expect(page.getByRole('alert')).toContainText('Responda os itens obrigatórios');
  await page.getByLabel('Resultado', { exact: true }).selectOption('nao_conforme');
  await page
    .getByLabel('Observação', { exact: true })
    .fill('Risco visível durante inspeção de teste.');
  await page.getByRole('button', { name: 'Salvar resposta', exact: true }).click();
  await expect(page.getByText('1 de 1 itens salvos')).toBeVisible();
  await page.getByRole('button', { name: 'Revisar conclusão', exact: true }).click();
  await expect(page.getByRole('alert')).toContainText('Registre a não conformidade');
  await page
    .getByLabel('Descrição do defeito')
    .fill('Risco superficial identificado no ensaio E2E.');
  await page.getByLabel('Severidade', { exact: true }).selectOption('maior');
  await page.getByRole('button', { name: 'Registrar desvio', exact: true }).click();
  await page.getByRole('link', { name: 'Ver desvio e anexar fotos', exact: true }).click();
  await expect(page.getByRole('heading', { name: /Não conformidade #[0-9]+/ })).toBeVisible();
  const ncId = page.url().split('/').at(-1);
  await page.getByLabel('Adicionar foto').setInputFiles({
    name: 'invalido.txt',
    mimeType: 'text/plain',
    buffer: Buffer.from('Não é uma imagem'),
  });
  await page.getByRole('button', { name: 'Enviar foto', exact: true }).click();
  await expect(page.getByRole('alert')).toContainText('Selecione uma imagem JPEG, PNG ou WebP');
  const png = Buffer.from(
    'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+j8XkAAAAASUVORK5CYII=',
    'base64',
  );
  await page
    .getByLabel('Adicionar foto')
    .setInputFiles({ name: 'evidencia-teste.png', mimeType: 'image/png', buffer: png });
  await page.getByRole('button', { name: 'Enviar foto', exact: true }).click();
  await expect(page.getByText('Foto anexada à não conformidade.', { exact: true })).toBeVisible();
  await expect(page.getByRole('img', { name: 'Evidência: evidencia-teste.png' })).toBeVisible();
  await expect(page.getByRole('img', { name: 'Evidência: evidencia-teste.png' })).toHaveJSProperty(
    'naturalWidth',
    1,
  );
  const photoDownload = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Baixar foto', exact: true }).click();
  expect((await photoDownload).suggestedFilename()).toBe('evidencia-teste.png');
  await screenshot(page, 'nao-conformidade-desktop.png');
  await page.getByRole('link', { name: 'Voltar à inspeção', exact: true }).click();
  await page.getByRole('button', { name: 'Revisar conclusão', exact: true }).click();
  await expect(
    page.getByRole('button', { name: 'Confirmar e finalizar', exact: true }),
  ).toBeDisabled();
  await page.getByLabel('Conferi as respostas, os desvios e as evidências.').check();
  await page.getByRole('button', { name: 'Confirmar e finalizar', exact: true }).click();
  await expect(
    page.getByText('Inspeção finalizada. Respostas e evidências estão preservadas para consulta.', {
      exact: true,
    }),
  ).toBeVisible();
  await expect(page.locator('.page-header .badge')).toHaveText('Reprovada');
  await screenshot(page, 'inspecao-desktop.png');
  const admin = await api(request);
  expect((await (await admin('GET', `/inspecoes/${inspectionId}`)).json()).status).toBe(
    'reprovada',
  );
  expect((await (await admin('GET', `/lotes/${lotId}`)).json()).status).toBe('reprovado');
  await route(page, `nao-conformidades/${ncId}`);
  await expect(
    page.getByText(
      'Inspeção finalizada. As evidências existentes foram preservadas e não podem receber novos anexos.',
    ),
  ).toBeVisible();
  await expect(page.getByLabel('Adicionar foto')).toHaveCount(0);
  await page.getByRole('button', { name: 'Iniciar tratamento', exact: true }).click();
  await page.getByRole('button', { name: 'Marcar como resolvida', exact: true }).click();
  await expect(page.locator('ol li')).toHaveCount(3);
  await route(page, 'dashboard');
  await expect(page.locator('h1')).toContainText(/Visão geral|Dashboard/);
  await page.locator('details.report-advanced > summary').click();
  await expect(page.locator('details.report-advanced')).toHaveAttribute('open', '');
  await page.getByLabel('Lote', { exact: true }).selectOption(lotId);
  await page.getByRole('button', { name: 'Aplicar filtros', exact: true }).click();
  await expect(page.locator('[data-report-results]')).toHaveAttribute('aria-busy', 'false');
  await expect(
    page
      .locator('.metric-card')
      .filter({ has: page.getByRole('heading', { name: 'Inspeções registradas', exact: true }) })
      .locator('.metric-value'),
  ).toHaveText('1');
  await expect(page.getByRole('meter', { name: 'Reprovadas', exact: true })).toHaveAttribute(
    'aria-valuenow',
    '1',
  );
  await screenshot(page, 'dashboard-desktop.png');
  const metrics = await (await admin('GET', '/indicadores?lote_id=' + lotId)).json();
  expect(metrics).toMatchObject({
    total: 1,
    reprovadas: 1,
    nao_conformidades: 1,
    taxa_reprovacao: 100,
  });
  await expect(
    page.locator('.metric-card').filter({ hasText: 'Não conformidades' }).locator('.metric-value'),
  ).toHaveText('1');
  await route(page, 'relatorios');
  await expect(page.locator('h1')).toContainText(/Relatórios|Histórico/);
  await expect(page.getByRole('row').filter({ hasText: 'L-E2E-001' })).toBeVisible();
  const exported = page.waitForEvent('download');
  await page.getByRole('button', { name: /Exportar.*CSV|Baixar.*CSV/ }).click();
  const csv = await exported;
  expect(csv.suggestedFilename()).toMatch(/\.csv$/);
  const exportedText = await readFile(await csv.path(), 'utf8');
  expect(exportedText).toContain('L-E2E-001');
  expect(exportedText).toContain('reprovada');
});

test('perfis respeitam cadastros, usuários e autoria da inspeção', async ({ page, request }) => {
  const seeded = await seedInspection(request, 'PERMISSOES');
  await login(page, 'supervisor');
  await route(page, 'produtos', 'Produtos');
  await expect(page.getByRole('button', { name: '+ Novo produto', exact: true })).toBeVisible();
  await route(page, 'inspetores', 'Inspetores');
  await expect(page.getByRole('button', { name: '+ Novo inspetor', exact: true })).toHaveCount(0);
  await page.getByRole('button', { name: 'Sair', exact: true }).click();
  await login(page, 'inspetor');
  await route(page, 'produtos', 'Produtos');
  await expect(page.getByRole('button', { name: '+ Novo produto', exact: true })).toHaveCount(0);
  await route(page, 'inspetores');
  await expect(page.getByRole('heading', { name: 'Acesso negado', exact: true })).toBeVisible();
  await route(page, `inspecoes/${seeded.inspection.id}`);
  await page.getByLabel('Resultado', { exact: true }).selectOption('nao_aplicavel');
  await page.getByRole('button', { name: 'Salvar resposta', exact: true }).click();
  expect(
    await page
      .getByLabel('Observação', { exact: true })
      .evaluate((element) => element.validity.valueMissing),
  ).toBe(true);
  await page.getByLabel('Observação', { exact: true }).fill('Critério não aplicável neste ensaio.');
  await page.getByRole('button', { name: 'Salvar progresso', exact: true }).click();
  await expect(page.getByText('1 de 1 itens salvos')).toBeVisible();
  await page.getByRole('button', { name: 'Sair', exact: true }).click();
  await login(page, 'outro');
  await route(page, `inspecoes/${seeded.inspection.id}`);
  await expect(
    page.getByText('Consulta da inspeção de outro responsável.', { exact: false }),
  ).toBeVisible();
  await expect(page.getByRole('button', { name: 'Salvar resposta', exact: true })).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'Revisar conclusão', exact: true })).toHaveCount(0);
  expect(
    (await seeded.asOwner('POST', '/produtos', { codigo: 'NAO', nome: 'Proibido' })).status(),
  ).toBe(403);
  const supervisor = await api(request, 'supervisor');
  expect((await supervisor('POST', '/usuarios', {})).status()).toBe(403);
});

test('layout de celular, navegação e estados de erro recuperáveis', async ({ page, request }) => {
  await seedInspection(request, 'MOBILE');
  await page.setViewportSize({ width: 390, height: 844 });
  await login(page, 'inspetor');
  await screenshot(page, 'dashboard-mobile.png');
  const overflow = await page.evaluate(() =>
    [...document.querySelectorAll('body *')]
      .filter((element) => {
        const rect = element.getBoundingClientRect();
        return (
          rect.right > innerWidth + 1 &&
          getComputedStyle(element).position !== 'fixed' &&
          !element.closest('.table-wrap')
        );
      })
      .map((element) => ({
        tag: element.tagName,
        class: element.className,
        right: element.getBoundingClientRect().right,
      })),
  );
  expect(
    await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth),
    JSON.stringify(overflow),
  ).toBe(true);
  await route(page, 'produtos', 'Produtos');
  await screenshot(page, 'produtos-mobile.png');
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.getByRole('button', { name: 'Abrir navegação', exact: true }).click();
  await page.getByRole('link', { name: 'Inspeções', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Inspeções', exact: true })).toBeVisible();
  await route(page, 'rota-inexistente');
  await expect(page.locator('h1')).toContainText(
    /Página não encontrada|Página indisponível|Não encontramos esta página/,
  );
  await page.route('**/api/produtos?**', (route) => route.abort('failed'));
  await route(page, 'produtos');
  await expect(page.getByRole('alert')).toBeVisible();
  await page.unroute('**/api/produtos?**');
  await page.getByRole('button', { name: 'Tentar novamente', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Registros', exact: true })).toBeVisible();
});

test('respostas não salvas exigem confirmação e sessão revogada exige novo login', async ({
  page,
  request,
}) => {
  const seeded = await seedInspection(request, 'SESSAO', 'outro');
  await login(page, 'outro');
  await route(page, `inspecoes/${seeded.inspection.id}`);
  await page.getByLabel('Resultado', { exact: true }).selectOption('conforme');
  page.once('dialog', (dialog) => dialog.dismiss());
  await page.getByRole('link', { name: 'Produtos', exact: true }).click();
  await expect(page).toHaveURL(new RegExp(`#/inspecoes/${seeded.inspection.id}$`));
  await expect(page.getByLabel('Resultado', { exact: true })).toHaveValue('conforme');
  page.once('dialog', (dialog) => dialog.accept());
  await page.getByRole('link', { name: 'Produtos', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Produtos', exact: true })).toBeVisible();
  const revoke = await seeded.admin('PATCH', `/usuarios/${fixture.accounts.outro.id}`, {
    nome: 'Conta de teste revisada',
  });
  expect(revoke.status()).toBe(200);
  await route(page, 'dashboard');
  await expect(page.getByLabel('E-mail', { exact: true })).toBeVisible();
  await expect(page.locator('.login-panel [role="status"]')).toContainText(
    'Sua sessão expirou ou foi revogada',
  );
});
