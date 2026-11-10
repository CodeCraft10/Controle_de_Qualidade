import { test, expect } from '@playwright/test';

test('entra sem credenciais, cadastra produto e continua após recarregar', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByRole('heading', { name: 'Visão geral', exact: true })).toBeVisible();
  await expect(page.getByLabel('E-mail', { exact: true })).toHaveCount(0);
  await expect(
    page.getByText('Modo demonstração: acesso sem login. Use somente dados de teste.', {
      exact: true,
    }),
  ).toBeVisible();
  await expect(page.getByRole('button', { name: 'Sair', exact: true })).toHaveCount(0);
  await page.getByRole('link', { name: 'Produtos', exact: true }).click();
  await page.getByRole('button', { name: '+ Novo produto', exact: true }).click();
  await page.getByLabel('Código *', { exact: true }).fill('DEMO-UI');
  await page.getByLabel('Nome *', { exact: true }).fill('Produto sem login');
  await page.getByRole('button', { name: 'Criar cadastro', exact: true }).click();
  await expect(page).toHaveURL(/#\/produtos\/[0-9]+$/);
  await page.reload();
  await expect(page.getByRole('heading', { name: 'Produto sem login', exact: true })).toBeVisible();
  await expect(page.getByLabel('E-mail', { exact: true })).toHaveCount(0);
});

test('sessão temporária mantém validação da API e a rota login abre o painel', async ({
  page,
  request,
}) => {
  await page.goto('/#/login');
  await expect(page).toHaveURL(/#\/dashboard$/);
  const config = await request.get('/api/config');
  expect(await config.json()).toEqual({ demo_mode: true });
  expect((await request.get('/api/produtos')).status()).toBe(401);
  const response = await request.post('/api/auth/demo');
  expect(response.status()).toBe(200);
  const session = await response.json();
  expect(session.usuario).toMatchObject({ demo: true, perfil: 'admin' });
  const headers = { Authorization: `Bearer ${session.token}` };
  expect((await request.get('/api/produtos', { headers })).status()).toBe(200);
  expect((await request.post('/api/auth/logout', { headers })).status()).toBe(204);
  expect((await request.get('/api/produtos', { headers })).status()).toBe(401);
});
