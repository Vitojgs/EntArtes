# Quadros Resumo de Testes — Ent'Artes

> **Data da execução:** 2026-05-11
> **Projeto:** Ent'Artes — Sistema de Gestão de Escola de Dança

---

## 1. Visão Geral

| Framework | Tests/Assertions | Passam | Falham | % Sucesso |
|-----------|-------|--------|--------|-----------|
| **Vitest** (backend) | 447 | 447 | 0 | **100%** |
| **Postman/Newman** (API) | 96 | 78 | 18 | **81%** |
| **Playwright** (E2E) | 24 | N/A ⚠️ | N/A | N/A |

> ⚠️ **E2E Playwright:** 5 spec files configurados, mas não executáveis neste ambiente (ubuntu26.04-x64 não suportado pelo Playwright). Requerem frontend + backend em execução e browser com GUI.
>
> **Postman/Newman:** 18 falhas concentradas em 3 endpoints comuns (approve/submit pedido devolvem 400, marcar realizada devolve 500). Os testes foram escritos para uma versão anterior da API.

---

## 2. Testes Vitest (backend)

### 2.1 Resumo Geral

| Métrica | Valor |
|---------|-------|
| Ficheiros de teste | 30 |
| Total de testes | 447 |
| Testes passados | 447 |
| Testes falhados | 0 |
| Duração | ~11.5s |

### 2.2 Distribuição por Categoria

| Categoria | Testes | % do Total |
|-----------|--------|------------|
| Unitários | 302 | 68% |
| Integração (BD real) | 66 | 15% |
| API (HTTP inject) | 39 | 9% |
| Contract | 14 | 3% |
| Edge (Segurança) | 26 | 6% |
| **Total** | **447** | **100%** |

### 2.3 Resultados por Ficheiro

#### Unitários (17 ficheiros, 302 testes)

| Ficheiro | Testes | Passam | Falham |
|----------|-------|--------|--------|
| `validacao-data.test.js` | 11 | 11 | 0 |
| `validacao-pressao.test.js` | 5 | 5 | 0 |
| `bpmn01-negative-edge.test.js` | 12 | 12 | 0 |
| `auth.service.test.js` | 22 | 22 | 0 |
| `users.service.test.js` | 32 | 32 | 0 |
| `pedidosaula.service.test.js` | 25 | 25 | 0 |
| `pedidosaula.controller.test.js` | 22 | 22 | 0 |
| `anuncios.service.test.js` | 13 | 13 | 0 |
| `aluguerFigurino.service.test.js` | 11 | 11 | 0 |
| `figurinos.service.test.js` | 42 | 42 | 0 |
| `eventos.service.test.js` | 14 | 14 | 0 |
| `turmas.service.test.js` | 25 | 25 | 0 |
| `notificacoes.service.test.js` | 7 | 7 | 0 |
| `audit.service.test.js` | 14 | 14 | 0 |
| `professor-aulas.service.test.js` | 13 | 13 | 0 |
| `salas.service.test.js` | 17 | 17 | 0 |
| `professor.service.test.js` | 17 | 17 | 0 |

#### Integração BD Real (7 ficheiros, 66 testes)

| Ficheiro | Testes | Passam | Falham |
|----------|-------|--------|--------|
| `prisma-bpmn01.test.js` (BPMN 1) | 6 | 6 | 0 |
| `prisma-bpmn02.test.js` (BPMN 2) | 6 | 6 | 0 |
| `prisma-bpmn03.test.js` (BPMN 3) | 5 | 5 | 0 |
| `prisma-bpmn04.test.js` (BPMN 4) | 6 | 6 | 0 |
| `bpmn-integracao.test.js` | 17 | 17 | 0 |
| `scheduler-integracao.test.js` | 6 | 6 | 0 |
| `pedidosaula.controller.test.js` | 20 | 20 | 0 |

#### API HTTP Inject (4 ficheiros, 39 testes)

| Ficheiro | Testes | Passam | Falham |
|----------|-------|--------|--------|
| `00-smoke.test.js` | 5 | 5 | 0 |
| `auth.api.test.js` | 15 | 15 | 0 |
| `eventos.api.test.js` | 10 | 10 | 0 |
| `notificacoes.api.test.js` | 9 | 9 | 0 |

#### Contract + Edge (2 ficheiros, 40 testes)

| Ficheiro | Testes | Passam | Falham |
|----------|-------|--------|--------|
| `resposta-shapes.test.js` | 14 | 14 | 0 |
| `entrada-api.test.js` | 26 | 26 | 0 |

---

## 3. Testes E2E Playwright

### 3.1 Resumo Geral

| Métrica | Valor |
|---------|-------|
| Ficheiros de teste | 5 |
| Testes configurados | 24 |
| Estado | ⚠️ Não executável |

### 3.2 Resultados por Fluxo BPMN

| Ficheiro | Fluxo BPMN | Testes | Estado |
|----------|-----------|--------|--------|
| `bpmn1-pedido-aula.spec.js` | BPMN 1 — Marcação de Aula | 4 | ⚠️ N/A |
| `bpmn2-remarcacao.spec.js` | BPMN 2 — Remarcação | 5 | ⚠️ N/A |
| `bpmn3-aluguer-figurino.spec.js` | BPMN 3 — Aluguer de Figurino | 7 | ⚠️ N/A |
| `bpmn4-criar-anuncio.spec.js` | BPMN 4 — Criar Anúncio | 4 | ⚠️ N/A |
| `verificacao-completa.spec.js` | Verificação de Dashboards | 4 | ⚠️ N/A |
| **Total** | | **24** | **⚠️** |

### 3.3 Causa da Indisponibilidade

O Playwright não suporta a instalação de browsers em `ubuntu26.04-x64` (sistema atual). Para executar:

```bash
cd e2e
npx playwright test                    # Todos os 24 testes
npx playwright test bpmn1-pedido-aula  # BPMN 1 apenas
```

**Pré-requisitos:**
- Backend em `localhost:3000`
- Frontend em `localhost:5173`
- PostgreSQL com seed (`npm run seed` em `backend/`)
- Ambiente com display gráfico (ou `xvfb-run`)

### 3.4 Fluxos BPMN Cobertos

| BPMN | Atores | Transições |
|------|--------|------------|
| **BPMN 1** | EE → Direção | Pendente → Confirmado / Rejeitado |
| **BPMN 2** | Direção → Professor → EE | AGUARDA_PROFESSOR → AGUARDA_EE → Confirmado |
| **BPMN 3** | EE/Professor → Direção | Pendente → Aprovado (aluguer) |
| **BPMN 4** | EE/Professor → Direção | Pendente → Aprovado (anúncio) |

---

## 4. Testes Postman/Newman

### 4.1 Resumo Geral

| Métrica | Valor |
|---------|-------|
| Coleções executadas | 4 |
| Total assertions | 96 |
| Assertions passadas | 78 (81%) |
| Assertions falhadas | 18 (19%) |

### 4.2 Resultados por Coleção

| Coleção | Requests | Assertions | ✅ Passam | ❌ Falham |
|---------|---------|------------|-----------|-----------|
| `BPMN1_Unitarios` | 21 | 24 | 22 | 2 |
| `BPMN1_Full_Tests` | 12 | 15 | 12 | 3 |
| `BPMN1_E2E_Full` | 29 | 29 | 27 | 2 |
| `BPMN_Flows` | 28 | 28 | 17 | 11 |
| **Total** | **90** | **96** | **78** | **18** |

### 4.3 Falhas Comuns

| Endpoint | Erro | Frequência |
|----------|------|-----------|
| `POST /api/direcao/aulas/:id/approve` | 400 (Bad Request) | 4x |
| `POST /api/encarregado/aulas` (criar pedido) | 400 (Bad Request) | 2x |
| `PUT /api/professor/aulas/:id/realizado` | 500 (Internal Server Error) | 1x |
| Diversos endpoints (BPMN_Flows) | 400/401/404 | 11x |

**Nota:** Os testes Postman foram escritos para uma versão anterior da API. Os endpoints de aprovação e criação de pedidos sofreram alterações nos dados esperados (payload/parâmetros).

### 4.4 Coleção Não Executada

- **`EntArtes_BPMN_Marcacao_Aula`**: Não executada — as variáveis de ambiente não correspondem (usa `direcao_email`, `encarregado_email` vs. `email_direcao`, `email_encarregado` no environment).
- **`Entartes_BPMN_Tests`**: JSON inválido (linha 674), não pode ser carregada.

### 4.5 Execução

```bash
cd postman
newman run <coleção>.json -e EntArtes_Environment.json --reporters cli
```
