# Project Status Report

**Timestamp:** 2026-04-22 11:50:18 UTC
**Last Updated:** 2026-05-03 11:10:00 UTC

---

## Sessão 2026-05-03 11:10 - Testes Automatizados + Documentação Defesa

### O que foi feito

#### 1. Análise do Estado do Projeto

Verificado o estado atual do projeto:
- Frontend Build: ✅ OK (2466 modules, 666KB JS)
- Backend TypeScript: ✅ OK
- Vitest Tests: ✅ 108 testes passam
- Backend API: ✅ Funcionando (porta 3000)
- Frontend: ✅ Funcionando (porta 5173)

Problema identificado nos testes E2E:
- Testes falhavam devido a disponibilidades com datas passadas
- Seletores desatualizados na UI (BPMN3)
- Modal de aprovação não confirmado (BPMN1)

#### 2. Correção dos Testes E2E (Playwright)

**Global Setup corrigido:**
- Apaga disponibilidades com datas passadas
- Cria novas disponibilidades a partir de amanhã (+2 a +8 dias)
- Remove pedidos que referenciam disponibilidades antigas

**Ficheiros corrigidos:**
- `e2e/global-setup.js` - Limpeza e criação de slots futuros
- `e2e/bpmn1-pedido-aula.spec.js` - Setup usa datas futuras, confirma no modal
- `e2e/bpmn2-remarcacao.spec.js` - Setup usa datas futuras
- `e2e/bpmn3-aluguer-figurino.spec.js` - Seletor corrigido (input[type="date"])

**Resultado:** 14/14 testes E2E passam ✅

#### 3. Criação do Guia de Testes (GUIA_TESTES.md)

**NOVO FICHEIRO:** `GUIA_TESTES.md` na raiz do projeto

Conteúdo:
- Como instalar e executar Vitest
- Como instalar e executar Playwright
- Como instalar e executar Postman/Newman
- Resumo de comandos
- Credenciais de teste
- Resolução de problemas

#### 4. Atualização dos Testes Vitest

**NOVO FICHEIRO:** `backend/tests/unit/bpmn01-negative-edge.test.js` (45 testes)

Categorias de testes:
- Validações de Entrada (7)
- Validações de Disponibilidade (4)
- Validações de Sala (3)
- Validações de Utilizador (4)
- Validações de Data/Hora Edge Cases (5)
- Validações de Privacidade (2)
- Conflitos e Limites (3)
- Campos Obrigatórios (4)
- Estado do Pedido - Transições Inválidas (3)
- Timeout e Expiração (2)
- Validação de Strings e Tipos (3)
- Boundary Tests (5)

**Total Vitest:** 153 testes (antes: 108)

#### 5. Criação de Guias de Testes para Defesa

**5.1 GUIA_CRIACAO_TESTES_VITEST.md**
- Biblioteca: Vitest 1.6.1
- Estrutura dos testes
- Padrões de código (describe, it, expect, mocks)
- Como criar novos testes
- FAQ para defesa

**5.2 GUIA_CRIACAO_TESTES_POSTMAN.md**
- Postman + Newman
- Estrutura de coleções
- Variáveis de ambiente
- Scripts de teste
- Casos BPMN01
- FAQ para defesa

**5.3 GUIA_CRIACAO_TESTES_PLAYWRIGHT.md**
- Playwright
- Configuração (playwright.config.js)
- Funções auxiliares (login, navTo, logout)
- Selectors e esperas
- Global setup
- FAQ para defesa

#### 6. Atualização do Ficheiro de Defesa

**FICHEIRO ATUALIZADO:** `DEFESA_PROJETO.md`

Novas secções adicionadas:
- **Parte 4** - Suite Completa de Testes (Vitest + Postman + Playwright)
- **Parte 5** - Documentação de Testes para Defesa
- **Parte 6** - Perguntas sobre Testes Automatizados (7 novas perguntas)

Atualizações:
- Testes E2E: 11 → 14
- Testes Vitest: 108 → 153
- Total de testes: 255+

---

### Ficheiros Alterados/Novos

| Ficheiro | Tipo | Descrição |
|----------|------|-----------|
| `e2e/global-setup.js` | Alterado | Limpa dados passados, cria slots futuros |
| `e2e/bpmn1-pedido-aula.spec.js` | Alterado | Setup com datas futuras, confirmação modal |
| `e2e/bpmn2-remarcacao.spec.js` | Alterado | Setup com datas futuras |
| `e2e/bpmn3-aluguer-figurino.spec.js` | Alterado | Seletor corrigido |
| `backend/tests/unit/bpmn01-negative-edge.test.js` | **NOVO** | 45 testes Negative/Edge |
| `GUIA_TESTES.md` | **NOVO** | Guia geral de testes |
| `backend/tests/GUIA_CRIACAO_TESTES.md` | **NOVO** | Guia Vitest |
| `postman/GUIA_CRIACAO_TESTES_POSTMAN.md` | **NOVO** | Guia Postman |
| `e2e/GUIA_CRIACAO_TESTES_PLAYWRIGHT.md` | **NOVO** | Guia Playwright |
| `backend/tests/RELATORIO_TESTES_VITEST.md` | Atualizado | 153 testes |
| `DEFESA_PROJETO.md` | Atualizado | Novas secções de testes |

---

### Estado dos Serviços (2026-05-03 11:10)

| Serviço | Porta | Estado |
|---------|------|--------|
| Backend | 3000 | ✅ FUNCIONAL |
| Frontend | 5173 | ✅ FUNCIONAL |
| PostgreSQL | 5432 | ✅ FUNCIONAL |

---

### Resultados dos Testes

#### Vitest
| Suite | Testes | Estado |
|-------|--------|--------|
| validacao-data.test.js | 25 | ✅ |
| validacao-pressao.test.js | 24 | ✅ |
| pedidosaula.service.test.js | 17 | ✅ |
| bpmn01-negative-edge.test.js | 45 | ✅ |
| bpmn-integracao.test.js | 22 | ✅ |
| pedidosaula.controller.test.js | 20 | ✅ |
| **Total** | **153** | ✅ |

#### Playwright (E2E)
| Suite | Testes | Estado |
|-------|--------|--------|
| BPMN1 | 3 | ✅ |
| BPMN2 | 4 | ✅ |
| BPMN3 | 2 | ✅ |
| BPMN4 | 2 | ✅ |
| Verificação Completa | 3 | ✅ |
| **Total** | **14** | ✅ |

---

## Notas Importantes

1. **Testes E2E corrigidos** - Problema de datas passadas resolvido com global-setup que cria disponibilidades futuras

2. **Cobertura de testes** - 255+ testes automatizados em 3 camadas:
   - Vitest: 153 (código interno)
   - Postman: 88+ (API)
   - Playwright: 14 (UI/E2E)

3. **Documentação para defesa** - 3 guias criados + atualização do DEFESA_PROJETO.md

4. **Negative Testing** - 45 novos testes de casos de erro e limites para BPMN01

---

## Como Executar Testes

```bash
# Todos os testes Vitest
cd backend && npm test

# Testes E2E
cd e2e && npx playwright test

# Testes Postman/Newman
cd postman && newman run EntArtes_BPMN_Marcacao_Aula.json -e EntArtes_Environment.json

# Resumo geral
cat GUIA_TESTES.md
```

---

### Sessões Anteriores

<details>
<summary>Ver sessões anteriores</summary>

## Sessão 2026-05-03 (sessão 2) — Validações, autenticação persistente e notificações de eventos

[ conteúdo existente ]

## Sessão 2026-05-02 (sessão 2) — Auditoria e correções de gaps BPMN01–BPMN04

[ conteúdo existente ]

</details>

---

## Sessão 2026-05-01 12:30 - Excel Sprints + Setup Windows

### O que foi feito

#### 1. Extração de Tasks do HTML para Excel

Extraídas tasks/subtasks do ficheiro HTML `tabelas_US_TASKS_RF_RNF_MATRIX_V3.html` (Sheet 3: Tasks_Subtasks):

| Sprint | Tasks Extraídas | Release Goal |
|--------|-----------------|---------------|
| Sprint 3 | 5 | Autenticação e estrutura base |
| Sprint 4 | 12 | Gestão de Aulas e Pedidos |
| Sprint 5 | 14 | Figurinos e Marketplace |
| **Total** | **31** | — |

**Parsing realizado:**
- Tratamento de `rowspan` nas células de Task (células mescladas)
- Mapeamento de campos: Task ID, Task, Subtask ID, Subtask, Camada, Prioridade, Sprint

#### 2. Criação do Excel de Sprints

**Ficheiro criado:** `/Planeamento/sprints_completo.xlsx`

**Estrutura replicada do template original:**
```
Row 1: SPRINT X
Row 3: Release Goal: <descrição>
Row 5: Start date: <data>
Row 6: End date: <data>
Row 8: Headers (ID, Priority, Status, Task, Estimate, Who, Real time)
Row 9+: Tasks
```

**Sheets criadas:**
- `sprint_3` - 5 tarefas
- `sprint_4` - 12 tarefas  
- `sprint_5` - 14 tarefas

#### 3. Script de Setup para Windows

**Novo ficheiro:** `scripts/setup-windows.ps1`

Funcionalidades:
- Verifica Node.js instalado
- Deteta PostgreSQL (serviço ou Docker)
- Cria utilizador e base de dados no PostgreSQL
- Copia ficheiro .env
- Instala dependências (npm install)
- Executa Prisma db push + seed

**Alternativa Docker:**
```powershell
docker run -d -p 5432:5432 -e POSTGRES_PASSWORD=entartes_dev_password -e POSTGRES_USER=entartes -e POSTGRES_DB=entartes postgres:14
```

#### 4. Verificação do Projeto

Verificados ficheiros principais:
| Ficheiro | Estado |
|----------|--------|
| `backend/prisma/schema.prisma` | ✅ Atualizado |
| `backend/src/seed.js` | ✅ Atualizado (usa Prisma) |
| `backend/.env` | ✅ Configurado |
| `frontend/package.json` | ✅ OK |

---

## Ficheiros Alterados Nesta Sessão

| Ficheiro | Alteração |
|----------|-----------|
| `Planeamento/sprints_completo.xlsx` | **NOVO** - Excel com tasks dos sprints 3-5 |
| `scripts/setup-windows.ps1` | **NOVO** - Script de setup para Windows |

---

## Estado dos Serviços (2026-05-01 12:30)

| Serviço | Porta | Estado |
|---------|------|--------|
| Backend | 3000 | ✅ FUNCIONAL |
| Frontend | 5173 | ✅ FUNCIONAL |
| PostgreSQL | 5432 | ✅ FUNCIONAL |

---

## Notas Importantes

1. **Excel Sprints** - Template criado a partir do original `sprints.xlsx`, com 31 tasks extraídas do HTML
2. **Setup Windows** - Script PowerShell para configurar ambiente em Windows
3. **Docker** - Opção mais simples para PostgreSQL no Windows

---

## Sessão 2026-04-30 21:50 - Validações + Testes Complete

### O que foi feito

#### 1. Validações de Data e Hora (Não permitir criação no passado)

Implementadas validações em DUAS CAMADAS (Frontend + Backend) para impedir criação de recursos com data/hora anteriores ao momento atual:

**Frontend:**
- `frontend/src/components/NovaAulaForm.tsx` - Data e hora de início >= agora
- `frontend/src/pages/Aulas.tsx` - `handleSugerirRemarcacao` e `handleRemarcar`

**Backend:**
- `backend/src/services/encarregado.service.js` - `createPedidoAula` valida data/hora
- `backend/src/services/aulas.service.js` - `sugerirNovaData` e `remarcarAula` validam

**Erros retornados:**
- "A data não pode ser no passado"
- "A hora de início deve ser posterior à hora atual"

#### 2. Validações de Figurinos/Marketplace

Implementadas validações para anúncios e reservas:

**Backend:**
- `backend/src/services/anuncios.service.js` - `createAnuncio`: data início >= hoje + data fim > início
- `backend/src/services/aluguerFigurino.service.js` - `createTransacao`: validações iguais

**Frontend:**
- `frontend/src/pages/Marketplace.tsx` - `handleSubmitAnuncioEncarregado`, `handleSubmitAnuncioProfessor`, `handleSolicitarAluguer`

**Erros retornados:**
- "A data de início não pode ser no passado"
- "A data de fim deve ser posterior à data de início"

#### 3. Testes Unitários (Vitest)

Criados novos ficheiros de testes:

| Ficheiro | Testes | Descrição |
|----------|-------|---------|
| `backend/tests/unit/validacao-data.test.js` | 25 | Validação data/hora |
| `backend/tests/unit/validacao-pressao.test.js` | 24 | Testes de pressão |
| `backend/tests/integration/bpmn-integracao.test.js` | 22 | Fluxos BPMN |

**Resultado:** ✅ 108/108 testes passam

#### 4. Testes de Pressão Criados

| Cenário | Testado |
|--------|--------|
| Data passada | ✅ Rejeita |
| Hora anterior (hoje) | ✅ Rejeita |
| Grupo lotação máxima | ✅ Rejeita |
| Grupo fechado/arquivado | ✅ Rejeita |
| Aluno sem idade/nível | ✅ Rejeita |
| Aluno já inscrito | ✅ Rejeita |
| Conflito de horário | ✅ Rejeita |
| Figurino indisponível | ✅ Rejeita |
| Sem stock | ✅ Rejeita |
| Auth/token inválido | ✅ Rejeita |

#### 5. Coleção Postman (BPMN Marcação de Aula)

Criados ficheiros para importar diretamente no Postman:

| Ficheiro | Descrição |
|----------|----------|
| `postman/EntArtes_Environment.json` | Environment com variáveis |
| `postman/EntArtes_BPMN_Marcacao_Aula.json` | Coleção 35 testes |
| `postman/TABELA_TESTES_RESUMO.md` | Tabela para defesa |

**Distribuição dos testes Postman:**
- Unitários: 10 testes
- Integração: 12 testes
- E2E: 13 testes
- Total: 35 testes

---

## Resultados dos Testes

### testes unitários (Vitest)

| Suite | Testes | Estado |
|-------|--------|--------|
| validacao-data.test.js | 25/25 | ✅ Passa |
| validacao-pressao.test.js | 24/24 | ✅ Passa |
| bpmn-integracao.test.js | 22/22 | ✅ Passa |
| pedidosaula.service.test.js | 17/17 | ✅ Passa |
| pedidosaula.controller.test.js | 20/20 | ✅ Passa |

**Total: 108/108 testes ✅**

### Testes Postman

| Fluxo | Testes | Estado |
|-------|--------|--------|
| AUTH - Autenticação | 4 | ✅ |
| BPMN1 - Marcação | 11 | ✅ |
| BPMN1 - Erros | 4 | ✅ |
| BPMN2 - Remarcação | 5 | ✅ |
| UTIL - Utilitários | 4 | ✅ |
| FALHAS - Resiliência | 2 | ✅ |

---

## Ficheiros Alterados Nesta Sessão

| Ficheiro | Alteração |
|----------|-----------|
| `frontend/src/components/NovaAulaForm.tsx` | Validação data/hora >= agora |
| `frontend/src/pages/Aulas.tsx` | Validação remarcação |
| `backend/src/services/encarregado.service.js` | Validação createPedidoAula |
| `backend/src/services/aulas.service.js` | Validação sugerirNovaData + remarcarAula |
| `backend/src/services/anuncios.service.js` | Validação createAnuncio |
| `backend/src/services/aluguerFigurino.service.js` | Validação createTransacao |
| `frontend/src/pages/Marketplace.tsx` | Validação anúncios/reservas |
| `backend/tests/unit/validacao-data.test.js` | **NOVO** (25 testes) |
| `backend/tests/unit/validacao-pressao.test.js` | **NOVO** (24 testes) |
| `backend/tests/integration/bpmn-integracao.test.js` | **NOVO** (22 testes) |
| `backend/tests/RELATORIO_TESTES_UNIDADE.md` | **NOVO** |
| `postman/EntArtes_Environment.json` | **NOVO** |
| `postman/EntArtes_BPMN_Marcacao_Aula.json` | **NOVO** |
| `postman/TABELA_TESTES_RESUMO.md` | **NOVO** |

---

## Estado dos Serviços (2026-04-30 21:50)

| Serviço | Porta | Estado |
|---------|------|--------|
| Backend | 3000 | ✅ FUNCIONAL |
| Frontend | 5173 | ✅ FUNCIONAL |
| PostgreSQL | 5432 | ✅ FUNCIONAL |

---

## Notas Importantes

1. **Validação em DUAS camadas** - Frontend (UI) + Backend (API) para máxima segurança
2. **Testes Vitest** - 108 testes unitários/de integração passam
3. **Coleção Postman** - 35 testes para importar diretamente
4. **Tabela resumo** - Documentação para defesa académica

---

## Como Executar Testes

```bash
# Testes unitários (Vitest)
cd backend && npm test
# ou
npx vitest run

# Testes Postman (via Newman)
newman run postman/EntArtes_BPMN_Marcacao_Aula.json -e postman/EntArtes_Environment.json
```

---

### Sessões Anteriores

<details>
<summary>Ver sessões anteriores</summary>

## Sessão 2026-04-30 18:15 - Testes E2E + Verificação Completa

### O que foi feito

#### 1. Execução dos testes E2E dos 4 fluxos BPMN

Corridos os testes existentes em `/e2e/`:
- `bpmn1-pedido-aula.spec.js` - 3 testes
- `bpmn2-remarcacao.spec.js` - 4 testes
- `bpmn3-aluguer-figurino.spec.js` - 2 testes
- `bpmn4-criar-anuncio.spec.js` - 2 testes

**Resultado:** ✅ 11/11 testes passaram (33.1s)

#### 2. Criados testes de verificação completa

Novo ficheiro: `/e2e/verificacao-completa.spec.js`

Testes adicionais para verificar:
- Professor vê aulas confirmadas no dashboard
- Encarregado vê aulas confirmadas no dashboard
- Aluno vê as suas aulas no dashboard
- Notificações são criadas na BD

**Resultado:** ✅ 3/3 testes passaram (25.3s)

#### 3. Corrigido problema de duração no formulário

**Ficheiro:** `frontend/src/components/NovaAulaForm.tsx`

O problema: Ao selecionar um slot com 30 min, aparecia erro "A duração deve estar entre 30 e 120 minutos"

**Correção aplicada:**
```javascript
// Antes
if (duracao < 30 || duracao > 120)

// Depois  
const maxDuracaoAllow = prefill?.maxDuracao ? parseInt(prefill.maxDuracao) : 120;
if (isNaN(duracao) || duracao < 30 || duracao > maxDuracaoAllow)
```

A mensagem de erro agora mostra o limite correto baseado no slot selecionado.

#### 4. Verificação de dashboards

Verificado manualmente que cada role vê as aulas corretas:

| Role | vê Aulas? | Notas |
|------|----------|-------|
| PROFESSOR | ✅ Sim | Dashboard mostra aulas confirmadas |
| ENCARREGADO | ✅ Sim | Dashboard mostra aulas criadas |
| ALUNO | ✅ Sim | Vê aulas em Dashboard e Aulas |
| DIRECAO | ✅ Sim | Vê pendentes e confirmadas |

#### 5. Verificação de notificações

Na BD, as notificações são criadas corretamente:
- AULA_APROVADA (para encarregado)
- AULA_CONFIRMADA (para professor)
- AULA_REMARCADA (para remarcações)
- SUGESTAO_REMARCACAO_PROFESSOR
- SUGESTAO_REMARCACAO_EE
- ANUNCIO_APROVADO
- ALUGUER_RESERVA

---

## Resultados dos Testes

### Testes Base (BPMN)

| BPMN | Fluxo | Passos | Estado | Problemas |
|------|-------|--------|--------|----------|
| BPMN 1 | Pedido de Aula | 3/3 | ✅ Sucesso | Nenhum |
| BPMN 2 | Remarcação | 4/4 | ✅ Sucesso | Nenhum |
| BPMN 3 | Aluguer Figurino | 2/2 | ✅ Sucesso | Nenhum |
| BPMN 4 | Criar Anúncio | 2/2 | ✅ Sucesso | Nenhum |

### Testes de Verificação

| Teste | Resultado |
|------|-----------|
| Dashboard PROFESSOR | ✅ Passa |
| Dashboard ENCARREGADO | ✅ Passa |
| Dashboard ALUNO | ✅ Passa |
| Notificações BD | ✅ Passa |

### Problema identificado

**Notificações BPMN1 filtro** - O filtro no teste de verificação pode não encontrar por nomes de tipo diferentes. Na BD existem registos correctos.

---

## Ficheiros Alterados Nesta Sessão

| Ficheiro | Alteração |
|----------|-----------|
| `e2e/verificacao-completa.spec.js` | **NOVO** - Testes de verificação |
| `e2e/helpers.js` | Adicionado utilizador `aluno` |
| `e2e/RELATORIO_TESTES_BPMN.md` | **NOVO** - Relatório de testes |
| `frontend/src/components/NovaAulaForm.tsx` | Corrigida validação de duração |

---

## Estado dos Serviços (2026-04-30 18:15)

| Serviço | Porta | Estado |
|---------|------|--------|
| Backend | 3000 | ✅ FUNCIONAL |
| Frontend | 5173 | ✅ FUNCIONAL |
| PostgreSQL | 5432 | ✅ FUNCIONAL |

---

## Notas Importantes

1. **Testes E2E** - Todos os fluxos BPMN estão a funcionar corretamente
2. **Dashboards** - Cada role vê as aulas correctas após aprovação
3. **Notificações** - São criadas na BD para todos os eventos
4. **Problema duração** - Corrigido, agora aceita slots com menor duração

---

### Sessões Anteriores

<details>
<summary>Ver sessões anteriores</summary>

## Sessão 2026-04-30 12:00 - Correção Pedido de Aula (Aluno + Duração)

### Problemas Identificados

| # | Problema | Descrição |
|---|---------|-----------|
| 1 | Direção via pedidos sem dados | Não mostrava aluno, professor, duração |
| 2 | Professor não via aulas confirmadas | Após aprovação, não aparecia na lista |
| 3 | Duração 30 min não funcionava | Só aceitava 60 min |
| 4 | Aluno não aparecia no pedido | Campo não era guardado na BD |

### Correções Aplicadas

#### 1. Schema - Novo campo `alunoutilizadoriduser`

**Ficheiro:** `backend/prisma/schema.prisma`

```prisma
model pedidodeaula {
  // ... campos existentes
  alunoutilizadoriduser Int?  // NOVO - guarda aluno diretamente
}
```

**Comando aplicado:**
```bash
npx prisma db push --accept-data-loss
```

#### 2. Backend - Criação do pedido com aluno

**Ficheiro:** `backend/src/services/encarregado.service.js`

```javascript
// Agora aceita e guarda o aluno
const aluId = alunoutilizadoriduser ? parseInt(alunoutilizadoriduser) : null;

// Valores passados no INSERT
VALUES (... $9)
..., aluId)
```

#### 3. Backend - Query getPendingAulas corrigida

**Ficheiro:** `backend/src/services/direcao.service.js`

- JOIN com `utilizador alu` através do novo campo `pa.alunoutilizadoriduser`
- Duração calculada corretamente (horas × 60 + minutos)

```sql
LEFT JOIN utilizador alu ON pa.alunoutilizadoriduser = alu.iduser
```

#### 4. Frontend - Envio do aluno no pedido

**Ficheiro:** `frontend/src/pages/Aulas.tsx`

```javascript
await api.createEncarregadoAula({
  // ... outros campos
  alunoutilizadoriduser: novaAula.alunoId ? parseInt(novaAula.alunoId) : undefined,
});
```

**Ficheiro:** `frontend/src/services/api.ts`

```typescript
async createEncarregadoAula(data: {
  // ... outros campos
  alunoutilizadoriduser?: number;
})
```

#### 5. Backend - Correção duração

**Ficheiro:** `backend/src/services/direcao.service.js`

```javascript
// Antes: parseInt(duracao.split(':')[0]) - dava 1 para 01:30
// Depois: parseInt(parts[0]) * 60 + parseInt(parts[1])
const parts = duracao.split(':');
duracaoFmt = parseInt(parts[0]) * 60 + parseInt(parts[1]);
```

#### 6. Frontend - UI atualizada

**Ficheiro:** `frontend/src/pages/Dashboard.tsx`

- Coluna "Modalidade" adicionada
- Duração mostrada (ex: "30 min")
- Para DIREÇÃO: mostra aluno em vez de professor

```tsx
// Cabeçalho
<th>Modalidade</th>
// Célula
{aula.modalidade || '—'}
{aula.duracao ? `${aula.duracao} min` : '—'}
// Para Direction
{user.role === 'DIRECAO' && aula.alunoNome ? aula.alunoNome : aula.professorNome}
```

---

### Ficheiros Alterados

| Ficheiro | Alteração |
|----------|-----------|
| `backend/prisma/schema.prisma` | Novo campo `alunoutilizadoriduser` |
| `backend/src/services/encarregado.service.js` | Aceita + guarda aluno |
| `backend/src/services/direcao.service.js` | JOIN aluno + duração corrigida |
| `frontend/src/pages/Aulas.tsx` | Envia `alunoutilizadoriduser` |
| `frontend/src/services/api.ts` | Novo parâmetro `alunoutilizadoriduser` |
| `frontend/src/pages/Dashboard.tsx` | UI atualizada (modalidade + duração + aluno) |

---

### Scripts de Start/Stop

| Script | Descrição |
|--------|-----------|
| `./scripts/start-services.sh` | Inicia PostgreSQL + Backend + Frontend |
| `./scripts/stop-services.sh` | Para todos os serviços |

**Problema identificado:** O script `start-services.sh` pode não encontrar o frontend se o diretório não for o correto. Solução: iniciar manualmente:

```bash
cd frontend && npm run dev
```

---

### Estado dos Serviços (2026-04-30)

| Serviço | Porta | Estado |
|---------|------|--------|
| Backend | 3000 | ✅ FUNCIONAL |
| Frontend | 5173 | ⚠️ REQUER START MANUAL |
| PostgreSQL | 5432 | ✅ FUNCIONAL |

---

### Notas Importantes

1. **Pedidos existentes** - Os pedidos criados ANTES destas correções (`id < 94`) não têm o campo `alunoutilizadoriduser` preenchido. Para testar corretamente, é necessário **criar um NOVO pedido**.

2. **Duração** - A duração é guardada como TIME no PostgreSQL (ex: "00:30:00"), não como INTERVAL. A correção calcula corretamente: `horas × 60 + minutos`.

3. **Campo aluno** - O aluno é guardado diretamente no pedido (campo novo `alunoutilizadoriduser`), não através da tabela `alunoaula` (que é para aulas CONFIRMADAS).

---

### Fluxo Testado

| Passo | Ação | Resultado |
|-------|------|----------|
| 1 | Login como ENCARREGADO | ✅ OK |
| 2 | Selecionar disponibilidade (30 min) | ✅ Opção disponível |
| 3 | Escolher aluno | ✅ Dropdown funciona |
| 4 | Criar pedido | ✅ Criado |
| 5 | Login como DIREÇÃO | ✅ OK |
| 6 | Ver pedidos pendentes | ✅ Mostra aluno + duração |
| 7 | Aprovar pedido | ✅ Criado |

</details>

---

## Sessão 2026-05-03 - Testes Unitários Postman + Newman

### O que foi feito

#### 1. Testes Unitários para Postman

Criada coleção completa de testes unitários para endpoints de autenticação e pedido de aula:

| Ficheiro | Descrição |
|----------|-----------|
| `postman/EntArtes_BPMN1_Unitarios.postman_collection.json` | Coleção com 24 testes |
| `postman/EntArtes_BPMN1_Unitarios_Environment.json` | Environment |
| `postman/TESTES_README.md` | Documentação de uso |

#### 2. Estrutura dos Testes

**Secção 1 - Login válido (3 testes):**
- Login direção (200)
- Login professor (200)
- Login encarregado (200)

**Secção 2 - Login inválido (3 testes):**
- Senha errada (4xx)
- Email inexistente (4xx)
- Campos em falta (4xx)

**Secção 3 - Public (1 teste):**
- Disponibilidades públicas

**Secção 4 - Acesso Negado (2 testes):**
- Sem token (401)
- Token inválido (401)

**Secção 5 - BPMN01 Fluxo Completo (15 testes):**
- Login EE → Criar pedido → Data válida (201)
- Criar pedido → Data passada (400)
- Login Direção → Listar pendentes → Aprovar pedido (200)
- Rejeitar pedido (4xx)
- Aprovar pedido inexistente (4xx)
- Login Professor → Listar aulas (200)
- EE tenta aprovar (403)
- Professor tenta aprobar (403)

#### 3. Testes E2E Corrigidos

Corrigidos erros na coleção E2E anterior:
- Tokens guardados em variáveis erradas (`professorToken`, `eeToken`) →统一使用 `authToken`
- 29/29 testes E2E passam

#### 4. Documentação Criada

**TESTES_README.md** inclui:
- Pré-requisitos e credenciais
- Como importar no Postman
- Comandos Newman
- Estrutura dos testes
- Resolução de problemas

---

## Resultados

### Testes Unitários Postman

| Suite | Testes | Estado |
|-------|--------|--------|
| Login válido | 3 | ✅ Passa |
| Login inválido | 3 | ✅ Passa |
| Public | 1 | ✅ Passa |
| Acesso Negado | 2 | ✅ Passa |
| BPMN01 Fluxo | 15 | ✅ Passa |

**Total: 24/24 testes ✅**

### Testes E2E Postman

**Total: 29/29 testes ✅**

---

## Ficheiros Alterados Nesta Sessão

| Ficheiro | Alteração |
|----------|-----------|
| `postman/EntArtes_BPMN1_Unitarios.postman_collection.json` | **NOVO** - 24 testes unitários |
| `postman/EntArtes_BPMN1_Unitarios_Environment.json` | **NOVO** - Environment |
| `postman/EntArtes_BPMN1_E2E_Full.postman_collection.json` | Corrigido tokens |
| `postman/EntArtes_BPMN1_E2E_Environment.json` | Corrigido type field |
| `postman/TESTES_README.md` | **NOVO** - Documentação |

---

## Estado dos Serviços (2026-05-03)

| Serviço | Porta | Estado |
|---------|------|--------|
| Backend | 3000 | ✅ FUNCIONAL |
| Frontend | 5173 | ✅ FUNCIONAL |
| PostgreSQL | 5432 | ✅ FUNCIONAL |

---

## Notas Importantes

1. **Problema resolvido** - Tokens não eram guardados corretamente entre requests no Newman. Solução: guardar token apenas em login bem-sucedido (`if pm.response.status === 200`).

2. **Testes robustos** - Os testes unitários verificam tanto o código de estado HTTP como o conteúdo da resposta.

3. **Pre-request scripts** - Adicionados em alguns requests para garantir que o header Authorization é enviado automaticamente.

---

## Como Executar

```bash
# Testes Unitários
cd postman
newman run EntArtes_BPMN1_Unitarios.postman_collection.json -e EntArtes_BPMN1_Unitarios_Environment.json

# Testes E2E
newman run EntArtes_BPMN1_E2E_Full.postman_collection.json -e EntArtes_BPMN1_E2E_Environment.json
```

---

**Última Atualização:** 2026-05-03 UTC