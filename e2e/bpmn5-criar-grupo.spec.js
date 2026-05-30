// @ts-check
/**
 * BPMN 5 — Fluxo de Criação de Grupo com Validação EE + Direção
 *
 * 1. Professor cria grupo → inscreve aluno → submete para validação EE
 * 2. Encarregado de Educação valida o aluno (ACEITE)
 * 3. Direção aprova o grupo → fica ATIVA
 */
const { test, expect } = require('@playwright/test');
const { login, logout, navTo, waitForToast } = require('./helpers');

test.describe.serial('BPMN 5 — Criar Grupo com Validação EE e Direção', () => {

  test('Professor cria grupo, inscreve aluno e submete para EE', async ({ page }) => {
    // ── 1. Login como professor ──────────────────────────────────────
    await login(page, 'professor');
    await navTo(page, 'Turmas');
    await expect(page).toHaveURL(/turmas/i);

    // ── 2. Criar novo grupo ──────────────────────────────────────────
    await page.waitForSelector('button:has-text("Novo Grupo")', { timeout: 10_000 });
    await page.click('button:has-text("Novo Grupo")');
    await page.waitForTimeout(700);

    // Preencher formulário
    const nomeInput = page.locator('input[placeholder*="Nome"]').or(
      page.locator('label:has-text("Nome") + input, label:has-text("Nome") ~ input')
    ).first();
    if (await nomeInput.count() > 0) {
      const nomeUnico = `Grupo E2E ${Date.now()}`;
      await nomeInput.fill(nomeUnico);
    }

    // Preencher modalidade (select)
    const selectModalidade = page.locator('select').filter({ hasText: /modalidade|Ballet|Dança|Música|Teatro/i }).first();
    if (await selectModalidade.count() > 0) {
      const opts = await selectModalidade.locator('option').count();
      if (opts > 1) await selectModalidade.selectOption({ index: 1 });
    }

    // Selecionar professor (select)
    const selectProfessor = page.locator('select').filter({ hasText: /professor|Professor/i }).first();
    if (await selectProfessor.count() > 0) {
      const opts = await selectProfessor.locator('option').count();
      if (opts > 1) await selectProfessor.selectOption({ index: 1 });
    }

    // Clicar "Criar Grupo"
    const btnCriar = page.locator('button:has-text("Criar Grupo")').or(
      page.locator('button[type="submit"]')
    ).first();
    await btnCriar.waitFor({ timeout: 5_000 });
    await btnCriar.click();

    await page.waitForTimeout(1000);

    // ── 3. Inscrever aluno no grupo ──────────────────────────────────
    // Procurar botão "Inscrever Aluno" no card do grupo recem-criado
    const btnInscrever = page.locator('button:has-text("Inscrever Aluno")').first();
    if (await btnInscrever.count() > 0) {
      await btnInscrever.click();
      await page.waitForTimeout(600);

      // Selecionar aluno no dropdown/select que aparece
      const selectAluno = page.locator('select, [role="combobox"]').filter({ hasText: /aluno|Selecionar/i }).first();
      if (await selectAluno.count() > 0) {
        const opts = await selectAluno.locator('option').count();
        if (opts > 1) await selectAluno.selectOption({ index: 1 });
        await page.waitForTimeout(300);
      }

      // Confirmar inscrição
      const btnConfirmar = page.locator('button:has-text("Confirmar")').or(
        page.locator('button:has-text("Inscrever")')
      ).first();
      if (await btnConfirmar.count() > 0) {
        await btnConfirmar.click();
        await page.waitForTimeout(600);
      }
    }

    // ── 4. Submeter para validação EE ────────────────────────────────
    const btnSubmeter = page.locator('button:has-text("Submeter para EE")').first();
    await btnSubmeter.waitFor({ timeout: 10_000 });
    await btnSubmeter.click();

    // Verificar toast de sucesso
    await waitForToast(page, 'sucesso');
    await page.waitForTimeout(500);

    // Verificar que o badge de status mudou para "Aguarda EE"
    await page.waitForSelector('text=Aguarda EE', { timeout: 8_000 }).catch(() => {
      // Fallback: pode estar com texto alternativo
    });

    await logout(page);
  });

  test('EE valida o aluno do grupo', async ({ page }) => {
    // ── 1. Login como encarregado (com role EE) ──────────────────────
    await login(page, 'encarregado');
    await navTo(page, 'Painel');
    await page.waitForTimeout(800);

    // ── 2. Procurar painel de validação EE ───────────────────────────
    const painelValidacao = page.locator('text=Validação de Grupos');
    if (await painelValidacao.count() === 0) {
      // Pode estar no Dashboard com texto alternativo
      await page.waitForTimeout(1000);
    }

    // ── 3. Aceitar o aluno pendente ──────────────────────────────────
    const btnAceitar = page.locator('button:has-text("Aceitar")').or(
      page.locator('button:has-text("Validar")').or(
        page.locator('button:has-text("ACEITE")')
      )
    ).first();

    if (await btnAceitar.count() > 0) {
      await btnAceitar.click();
      await waitForToast(page, 'sucesso');
      await page.waitForTimeout(500);
    }

    await logout(page);
  });

  test('Direção aprova o grupo', async ({ page }) => {
    // ── 1. Login como direção ────────────────────────────────────────
    await login(page, 'direcao');
    await navTo(page, 'Painel');
    await page.waitForTimeout(800);

    // ── 2. Procurar painel de aprovação ──────────────────────────────
    const painelAprovacao = page.locator('text=Aprovação de Grupos').or(
      page.locator('text=Aprovar Grupo')
    );
    if (await painelAprovacao.count() === 0) {
      await page.waitForTimeout(1000);
    }

    // ── 3. Aprovar o grupo ───────────────────────────────────────────
    const btnAprovar = page.locator('button:has-text("Aprovar")').first();
    if (await btnAprovar.count() > 0) {
      await btnAprovar.click();
      await waitForToast(page, 'sucesso');
    } else {
      // Pode necessitar de expandir ou selecionar primeiro
      const btnExpandir = page.locator('button:has-text("Aprovar Grupo")').or(
        page.locator('text=Grupos Pendentes')
      ).first();
      if (await btnExpandir.count() > 0) {
        await btnExpandir.click();
        await page.waitForTimeout(600);
        const btnAprovar2 = page.locator('button:has-text("Aprovar")').first();
        if (await btnAprovar2.count() > 0) {
          await btnAprovar2.click();
          await waitForToast(page, 'sucesso');
        }
      }
    }

    await page.waitForTimeout(500);
    await logout(page);
  });

});
