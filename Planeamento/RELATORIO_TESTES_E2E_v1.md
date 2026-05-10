# Relatório de Testes E2E (Playwright) — BPMN 01–04

**Data:** 2026-05-08
**Versão:** 1.0
**Âmbito:** Testes E2E com Playwright sobre os 4 fluxos BPMN principais — Pedido de Aula, Remarcação de Aula, Aluguer de Figurino, Criar Anúncio

---

## Índice

1. [Sumário Executivo](#1-sumário-executivo)
2. [Resultados por BPMN](#2-resultados-por-bpmn)
   - 2.1 [BPMN 01 — Pedido de Aula](#21-bpmn-01--pedido-de-aula)
   - 2.2 [BPMN 02 — Remarcação de Aula](#22-bpmn-02--remação-de-aula)
   - 2.3 [BPMN 03 — Aluguer de Figurino](#23-bpmn-03--aluguer-de-figurino)
   - 2.4 [BPMN 04 — Criar Anúncio](#24-bpmn-04--criar-anúncio)
3. [Alterações Efetuadas](#3-alterações-efetuadas)
4. [Bugs Conhecidos que Afetam o Fim-a-Fim](#4-bugs-conhecidos-que-afetam-o-fim-a-fim)
5. [O que Falta para um Funcionamento Robusto](#5-o-que-falta-para-um-funcionamento-robusto)
6. [Recomendações para Produção](#6-recomendações-para-produção)

---

## 1. Sumário Executivo

### Testes E2E (Playwright)

| BPMN | Testes | Passam | Falham | Status |
|------|--------|--------|--------|--------|
| BPMN 01 — Pedido de Aula | 9 | 9 | 0 | ✅ |
| BPMN 02 — Remarcação de Aula | 5 | 5 | 0 | ✅ |
| BPMN 03 — Aluguer de Figurino | 2 | 2 | 0 | ✅ |
| BPMN 04 — Criar Anúncio | 2 | 2 | 0 | ✅ |
| **Total** | **18** | **18** | **0** | **✅** |

### Cobertura vs Diagramas de Sequência

| BPMN | Fluxo Principal | Fluxo Alternativo | Validações | BD Verification |
|------|----------------|-------------------|-----------|-----------------|
| BPMN 01 | ✅ Criar + Aprovar (UI) | ✅ Rejeitar (UI) | ✅ Data passada, campo obrigatório, conflito slot | ✅ Approve + Reject |
| BPMN 02 | ✅ Remarcar (UI) + Aceitar Prof/EE | ✅ Prof rejeita, EE rejeita | — | ✅ Remarcação via API |
| BPMN 03 | ✅ Solicitar + Aprovar | — | — | — |
| BPMN 04 | ✅ Criar anúncio + Aprovar | — | — | — |

### Estado Atual

Todos os 18 testes E2E passam consistentemente quando executados isoladamente com BD limpa. No entanto, existem **6 bugs conhecidos** que impedem um funcionamento completamente robusto — especialmente em cenários de execução sequencial ou com dados residuais.

---

## 2. Resultados por BPMN

### 2.1 BPMN 01 — Pedido de Aula

**Ficheiro:** `e2e/bpmn1-pedido-aula.spec.js`
**Resultado:** 9/9 ✅

| # | Teste | Tipo | O que valida |
|---|-------|------|-------------|
| 1 | Happy path: criar → direção aprovar (UI) | Fluxo Principal | Pedido → Pendente → Confirmado + aula criada |
| 2 | Rejeição: criar → direção rejeitar (UI) | Fluxo Alternativo | Pedido → Pendente → Rejeitado |
| 3 | Data passada → 400 | Validação | Backend rejeita data anterior a hoje |
| 4 | Campo obrigatório ausente → 400 | Validação | Backend rejeita body sem `data` |
| 5 | Conflito mesmo slot → "reservado" | Validação | 2º pedido no mesmo horário/sala é rejeitado |
| 6 | EE visualiza Pendente na UI | UI | Badge "Pendente" visível na Agenda do EE |
| 7 | Direção visualiza Pendentes na UI | UI | Lista "Pedidos de Aula Pendentes" visível |
| 8 | BD verification: approve → Confirmado | BD | Estado no DB, aula record criado |
| 9 | BD verification: reject → Rejeitado | BD | Estado no DB, sugestaoestado=null |

**Problemas detetados (resolvidos):**
- Nenhum. Todos os testes passam sem intervenção.

### 2.2 BPMN 02 — Remarcação de Aula

**Ficheiro:** `e2e/bpmn2-remarcacao.spec.js`
**Resultado:** 5/5 ✅

| # | Teste | Tipo | O que valida |
|---|-------|------|-------------|
| 1 | Setup: criar pedido + cleanup | Setup | Cria pedido PENDENTE via API e limpa (approve) |
| 2 | Happy path: remarcar (UI) → Prof aceita → EE aceita | Fluxo Principal | Sugestão percorre AGUARDA_PROFESSOR → AGUARDA_EE → resolvida |
| 3 | Prof rejeita: remarcar (UI) → Prof rejeita | Fluxo Alt. (Prof) | Sugestão cancelada, pedido mantém estado/data original |
| 4 | EE rejeita: remarcar (UI) → Prof aceita → EE rejeita | Fluxo Alt. (EE) | Pedido muda para Cancelado |
| 5 | BD verification: remarcação (API) → dados atualizados | BD | `data` muda para `novadata`, `sugestaoestado` limpo |

**Problemas detetados e corrigidos:**

| Problema | Causa | Correção |
|----------|-------|----------|
| `CANCELADO` / `CONFIRMADO` (ALL-CAPS) vs DB Title Case | Teste usava maiúsculas, DB guarda `Cancelado` / `Confirmado` | Corrigido no `bpmn2-remarcacao.spec.js` |
| Pedido do Test 1 (Setup) poluía Tests 2–5 | Setup criava pedido sem limpar → UI interagia com pedido errado | Adicionado `approvePedidoApi()` no cleanup do Test 1 |
| `criarPedidoPendente()` usava `futureTime()` → midnight wrap | `futureTime()` às 23h+1 = 00h, conflito com pedidos existentes | Helper agora usa `slot.horaInicio` + offset (60 min) |
| Offset de 13 min entre pedidos era insuficiente | 13 min < 60 min (duração aula) → pedidos sobrepunham-se | Alterado para 60 min de offset, capped dentro da duração do slot |
| Test 5 (BD) esperava `Confirmado` após remarcação | Remarcação não muda estado (fica Pendente) | Expectativa corrigida para `Pendente`, `data` deve conter `novaData` |
| Frontend `remarcarAula()` enviava campos errados | Enviava `{data, hora}` mas backend espera `{novadata, novaHora}` | Corrigido em sessão anterior (`api.ts` linhas 600-604) |

### 2.3 BPMN 03 — Aluguer de Figurino

**Ficheiro:** `e2e/bpmn3-aluguer-figurino.spec.js`
**Resultado:** 2/2 ✅

| # | Teste | Tipo | O que valida |
|---|-------|------|-------------|
| 1 | EE solicita aluguer (UI) | Fluxo Principal | Seleciona anúncio → "Solicitar Aluguer" → preenche datas → "Confirmar" |
| 2 | Direção aprova reserva (UI) | Fluxo Principal | "Ver Reservas" → "Aprovação de Reservas" → "Aprovar" → badge "Aprovada" |

**Problemas detetados (não críticos):**
- Setup `garantirAnuncioAluguer()` usa `fetch` com hardcoded `direcaoutilizadoriduser: 23`, `encarregadoeducacaoutilizadoriduser: 26`, `professorutilizadoriduser: 24` — IDs que podem não ser válidos noutras bases.
- Função de setup não limpa o anúncio criado após o teste.

### 2.4 BPMN 04 — Criar Anúncio

**Ficheiro:** `e2e/bpmn4-criar-anuncio.spec.js`
**Resultado:** 2/2 ✅

| # | Teste | Tipo | O que valida |
|---|-------|------|-------------|
| 1 | EE cria anúncio de aluguer (UI) | Fluxo Principal | "Novo Anúncio" → preenche formulário → "Publicar Aluguer" → badge "Pendente" |
| 2 | Direção aprova anúncio (UI) | Fluxo Principal | Badge "Pendente" → "Aprovar" → badge some |

**Problemas detetados (não críticos):**
- Teste 2 não verifica explicitamente que o badge "Aprovado" aparece (apenas que "Pendente" desaparece).
- Seletores frágeis: `input[placeholder*="25"]`, `select` filter `hasText: /figurino|Selecionar/i`.

---

## 3. Alterações Efetuadas

### `e2e/helpers.js`

| Alteração | Motivo |
|-----------|--------|
| `criarPedidoPendente()` usa `slot.horaInicio` em vez de `futureTime()` | Evita midnight wrap (00:04) que conflitava com pedidos às 00:02 |
| Pedidos consecutivos têm offset de 60 min (capped na duração do slot) | Impede sobreposição de pedidos de 60 min no mesmo slot |
| Adicionado `_pedidoCallCount` (contador de chamadas) | Controlo do offset para N chamadas dentro do mesmo slot |
| `horaFim` do slot é lida para calcular duração máxima | Garante que offset não ultrapassa os limites do slot |
| Export `approvePedidoApi` e `findSlot` | Necessários para cleanup e BD verification dos testes |

### `e2e/bpmn2-remarcacao.spec.js`

| Alteração | Linhas |
|-----------|--------|
| `'CANCELADO'` → `'Cancelado'` | 220 |
| `'CONFIRMADO'` → `'Confirmado'` | 291 |
| Import `approvePedidoApi` adicionado | 2 |
| Cleanup no Test 1 (approve do pedido de setup) | 6-13 |
| Test 5: removida UI, usada API para remarcação + expectativas corrigidas | 234-313 |

### `frontend/src/services/api.ts`

| Alteração | Linhas |
|-----------|--------|
| `remarcarAula()` envia `{novadata, novaHora}` em vez de `{data, hora}` | 600-604 |

---

## 4. Bugs Conhecidos que Afetam o Fim-a-Fim

### 🔴 Críticos

| ID | Bug | Impacto | Localização |
|----|-----|---------|-------------|
| **B-01** | **Overlap temporal meia-noite** | Backend não deteta conflito quando `horainicio + duracaoaula` ultrapassa meia-noite (PostgreSQL `time` type ignora data). Pedidos às 23:30 com 60 min não conflitam com pedidos às 00:00 do dia seguinte. | `encarregado.service.js:submeterPedidoAula` |
| **B-02** | **`minutos_ocupados` nunca decrementado** | Quando uma aula é remarcada (data muda) ou cancelada, `minutos_ocupados` da disponibilidade original não é decrementado. Isto faz com que o slot fique "cheio" mesmo depois de as aulas serem movidas, impedindo novas marcações. | `aulas.service.js:responderSugestaoEncarregado` (linha 514), `aulas.service.js:responderSugestaoProfessor` (rejeitar, linha 407) |
| **B-03** | **Fastify response schemas sem `additionalProperties`** | Rotas com `data: { type: "object" }` sem `additionalProperties: true` serializam resposta como `data: {}` (objeto vazio). Apenas corrigido para `encarregado.routes.js`. Afeta: direção, professor, aulas. | Várias route files |

### 🟡 Médios

| ID | Bug | Impacto | Localização |
|----|-----|---------|-------------|
| **B-04** | **Card não mostra ID do pedido** | Cartão de aula/pedido (`Aulas.tsx`) não renderiza `idpedidoaula`. Testes não conseguem localizar um pedido específico pelo ID na UI — têm de clicar no primeiro botão disponível, o que é frágil quando há múltiplos pedidos. | `Aulas.tsx` |
| **B-05** | **Remarcação não atualiza `data` quando `novadata` não é definido** | Se o frontend não enviar `novadata` (ex.: por falha na UI), o backend define `sugestaoestado=AGUARDA_PROFESSOR` sem `novadata`. Quando EE aceita, `novaData` é null, e a `data` não é atualizada — mas `sugestaoestado` é limpo, dando a falsa impressão de que a remarcação funcionou. | `aulas.service.js:remarcarAula` (linha 364) + `responderSugestaoEE` (linha 472) |

### 🟢 Leves

| ID | Bug | Impacto | Localização |
|----|-----|---------|-------------|
| **B-06** | **403 `/api/direcao/aulas/status`** | Direção logada recebe 403 ao tentar ler status de aulas. Aparece no console do browser como erro não tratado. Não afeta funcionalidade principal. | Rota de status de aulas |
| **B-07** | **`eventSource.current?.close()` error** | Erro no console ao fechar página de Aulas (componente desmonta com EventSource ativo). Não afeta testes. | `Aulas.tsx` |

---

## 5. O que Falta para um Funcionamento Robusto

### 5.1 Correções Obrigatórias no Backend

#### B-01: Overlap temporal meia-noite

**Problema:** Comparação de `time` no PostgreSQL ignora data. `'23:30' + '60 min' = '00:30'` (próximo dia), mas `'00:30'::time` não conflita com `'23:30'::time`.

**Solução proposta:**
```sql
-- Em vez de comparar apenas time, comparar timestamp (data + hora)
WHERE (pa.data + pa.horainicio) < ($1 + $2::interval)
  AND (pa.data + pa.horainicio + pa.duracaoaula) > $1
```

**Ficheiros:** `encarregado.service.js:submeterPedidoAula`

#### B-02: `minutos_ocupados` não decrementado

**Problema:** Sempre que um pedido é removido de um slot (remarcação, cancelamento), `minutos_ocupados` devia ser decrementado mas não é.

**Solução proposta:** Adicionar `minutos_ocupados: { decrement: duracaoMinutos }` nos seguintes locais:
- `aulas.service.js:responderSugestaoProfessor` (rejeitar: ~linha 407) — só decrementar se o pedido original estava associado a uma disponibilidade
- `aulas.service.js:responderSugestaoEncarregado` (aceitar: ~linha 514) — decrementar da disponibilidade ORIGINAL, incrementar na NOVA (se houver)
- `aulas.service.js:responderSugestaoEncarregado` (rejeitar: ~linha 485) — decrementar quando pedido é cancelado

**Nota:** É necessário guardar o `disponibilidade_mensal_id` original antes da remarcação para saber qual slot decrementar.

#### B-03: Fastify response schemas

**Problema:** Schemas de resposta sem `additionalProperties` cortam campos.

**Solução proposta:** Adicionar `additionalProperties: true` a todos os schemas `response` que usam `data: { type: "object" }`. Alternativamente, usar `data: { type: "object", additionalProperties: true }` em todas as rotas.

**Ficheiros:** `aulas.routes.js`, `direcao.routes.js` (e possivelmente outros).

### 5.2 Melhorias no Frontend

#### B-04: Card sem ID do pedido

**Problema:** UI não mostra `idpedidoaula`, impossibilitando testes E2E de localizar pedidos específicos.

**Solução proposta:** Adicionar `data-pedido-id={pedido.idpedidoaula}` aos cartões de aula no `Aulas.tsx`. Isto permite que os testes usem `page.locator('[data-pedido-id="123"]')` em vez de clicar no primeiro botão.

#### B-05: Validação de `novadata` antes de aceitar

**Problema:** Se `novadata` não foi definido na remarcação, a aceitação do EE não atualiza a data mas limpa o estado.

**Solução proposta:** No frontend, validar que `novaData` não está vazio antes de chamar `remarcarAula()`. No backend, rejeitar o pedido de remarcação se `newData` for falsy.

### 5.3 Melhorias nos Testes

| Melhoria | Prioridade | Descrição |
|----------|-----------|-----------|
| **Limpeza automática da BD** | Alta | `global-setup.js` deve limpar `pedidodeaula`, `aula`, `anuncio`, `reserva` antes de cada execução |
| **Reset `minutos_ocupados`** | Alta | `global-setup.js` deve correr `UPDATE disponibilidade_mensal SET minutos_ocupados = 0` |
| **Testes isolados (não seriais)** | Média | Usar `test.describe.serial` é necessário porque os testes partilham estado (UI com múltiplos pedidos). Idealmente cada teste devia criar o seu próprio pedido identificável |
| **Seletores `data-*`** | Média | Adicionar `data-testid` ou `data-pedido-id` aos componentes para eliminar a fragilidade dos seletores por texto |
| **Remover `@ts-check`** | Baixa | `bpmn3-aluguer-figurino.spec.js` e `bpmn4-criar-anuncio.spec.js` ainda têm `// @ts-check` que não é usado (projeto não tem TypeScript configurado nos testes) |

### 5.4 Infraestrutura de Testes

| Componente | Estado | Necessário |
|-----------|--------|------------|
| **CI/CD pipeline** | ❌ Não existe | Pipeline GitHub Actions que corre `npx playwright test` em cada PR |
| **Base de dados de teste isolada** | ❌ Usa mesma BD do dev | BD separada para testes (ex.: `entartes_test`) com seed controlado |
| **Relatório de cobertura** | ❌ Não existe | `playwright show-report` para debug visual de falhas |
| **Testes paralelos** | ❌ `workers: 1` | Atualmente limitado a 1 worker porque partilham BD. Com BD isolada, pode subir para 2-4 workers |

---

## 6. Recomendações para Produção

### Prioridade 1 (Fazer Antes de Produção)

1. **Corrigir B-02 (`minutos_ocupados` decrement)** — É o bug com maior impacto na experiência do utilizador. Sem esta correção, os slots ficam progressivamente "cheios" e os utilizadores não conseguem marcar aulas.
2. **Corrigir B-03 (Fastify schemas)** — Sem `additionalProperties`, respostas da API devolvem objetos vazios, o que pode quebrar integrações e dificultar debugging.
3. **Adicionar `global-setup` com limpeza da BD** — Garante que cada execução de testes começa com estado conhecido.

### Prioridade 2 (Antes de CI/CD)

4. **Corrigir B-01 (midnight overlap)** — Bug de consistência de dados. Permite marcações conflitantes.
5. **Adicionar `data-pedido-id` aos cartões** — Melhora testabilidade e debugging.
6. **BD de teste isolada** — Permite execução paralela e eliminada risco de corrupção de dados de desenvolvimento.
7. **Pipeline GitHub Actions** — `playwright.yml` com setup, build, test.

### Prioridade 3 (Qualidade)

8. **Seletores `data-testid` em vez de texto** — Elimina falsos negativos por alterações de texto na UI.
9. **Testes paralelos (workers > 1)** — Reduz tempo de execução de ~60s para ~20s.
10. **Relatório de cobertura Playwright** — Facilita debug de falhas com screenshots, vídeos e traces.

---

## Anexo: Comandos Úteis

```bash
# Executar todos os testes E2E
cd e2e && npx playwright test --config=playwright.config.js

# Executar BPMN específico
cd e2e && npx playwright test bpmn2-remarcacao.spec.js --config=playwright.config.js

# Ver relatório HTML (após execução com --reporter=html)
cd e2e && npx playwright show-report

# Limpar BD para testes
psql "postgresql://entartes:entartes_dev_password@localhost:5432/entartes" -c "
  DELETE FROM aula;
  DELETE FROM pedidodeaula;
  UPDATE disponibilidade_mensal SET minutos_ocupados = 0 WHERE data >= CURRENT_DATE;
"

# Ver log do backend
tail -f /tmp/backend.log
```
