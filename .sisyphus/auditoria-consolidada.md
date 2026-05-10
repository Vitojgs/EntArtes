# Relatório de Auditoria Consolidado — Ent'Artes

**Data:** 2026-05-08
**Âmbito:** Mapeamento completo frontend ↔ backend ↔ schema ↔ BPMN ↔ testes

---

## 1. RESUMO EXECUTIVO

| Dimensão | Total |
|----------|-------|
| Endpoints backend | ~108 |
| Route files | 19 |
| Service files | 18 |
| Funções service exportadas | 154 |
| Controller files | 11 (+ 1 dead: `auth.controller.js`) |
| Modelos Prisma | 23 |
| Páginas frontend | 11 |
| Ficheiros de teste | 16 |
| Diagramas BPMN | 4 |
| Diagramas de Sequência | 5 |
| Testes E2E Playwright | 14 (11 BPMN + 3 verificação) |
| Testes Vitest | 108 |

---

## 2. BPMN vs IMPLEMENTAÇÃO — Cross-Reference

### BPMN01 — Pedido de Aula

| Passo BPMN | Implementação | Estado |
|------------|---------------|--------|
| Professor define horários → disponibilidade | `professor.service.js` `createDisponibilidadeMensal()` + `POST /api/professor/disponibilidades` | ✅ |
| EE consulta disponibilidades | `GET /api/encarregado/disponibilidades` → `alunoService.getAllDisponibilidadesMensais()` | ✅ |
| EE preenche/submete pedido | `POST /api/encarregado/aulas` → `encarregadoService.submeterPedidoAula()` | ✅ |
| Direção recebe pedido pendente | `GET /api/direcao/aulas/pending` → `direcaoService.getPendingAulas()` | ✅ |
| Direção avalia (APROVADO? gateway) | `POST /api/direcao/aulas/:id/approve` ou `/reject` → `direcaoService.avaliarPedido()` | ✅ |
| SIM: atribuir espaço + confirmar | `avaliarPedido` aceita `salaId` — marca sala e cria aula | ✅ |
| SIM: notificar EE + Professor | `createNotificacao()` em `direcao.service.js` | ✅ |
| NÃO: notificar rejeição | `createNotificacao()` em `direcao.service.js` | ✅ |
| 3h timer: auto-rejeitar | `pedidoaula.scheduler.js` `checkAndAutoReject()` — 60s interval | ✅ |
| **Conformidade:** 100% — todos os passos implementados | | ✅ |

### BPMN02 — Remarcação Aula

| Passo BPMN | Implementação | Estado |
|------------|---------------|--------|
| Professor cancela aula | `POST /api/aulas/:id/cancel` → `aulasService.cancelarAula()` | ✅ |
| Direção recebe pedido de cancelamento | Não há endpoint específico — cancelamento é imediato no backend | ⚠️ |
| Direção remarca: verifica disponibilidade professor | `aulasService.remarcarAula()` verifica disponibilidade? Precisa confirmar | ⚠️ |
| Direção verifica sala disponível | `salasService.getSalaAvailability()` ou `consultarSalaDisponivel()` | ✅ |
| Com disponibilidade: envia nova data ao Professor | `aulasService.remarcarAula()` → `sugestaoestado='AGUARDA_PROFESSOR'` + notificação | ✅ |
| Professor recebe → Aceita? gateway | `POST /api/aulas/:id/responder-professor` → `aulasService.responderSugestaoProfessor()` | ✅ |
| Sim: envia ao EE | `sugestaoestado='AGUARDA_EE'` + notificação | ✅ |
| Não: envia rejeição à Direção | notificação de rejeição | ✅ |
| EE recebe → Aceita? gateway | `POST /api/aulas/:id/responder-encarregado` → `aulasService.responderSugestaoEE()` | ✅ |
| Sim: aula remarcada | data aplicada ao pedido/aula | ✅ |
| Não / timeout: aula cancelada | scheduler + `checkAndExpireSugestoes()` | ✅ |
| **EXTENSÃO:** Professor pode propor data (→ `AGUARDA_DIRECAO`) | `POST /api/aulas/:id/sugerir-nova-data` + `POST /api/aulas/:id/responder-direcao` | ➕ |
| **Conformidade:** ~90% — fluxo principal completo. Cancelamento do Professor é direto (não passa por Direção como no BPMN) | | ⚠️ |

### BPMN03 — Aluguer Figurino

| Passo BPMN | Implementação | Estado |
|------------|---------------|--------|
| EE/Prof seleciona anúncio | `Marketplace.tsx` — listagem + seleção | ✅ |
| Submete pedido de reserva | `POST /api/aluguer` → `aluguerService.registarTransacao()` | ✅ |
| Direção recebe pedido | `GET /api/aluguer` (pendentes) | ✅ |
| Aprovado? gateway | `PUT /api/aluguer/:id/avaliar` → `aluguerService.avaliarPedidoReserva()` | ✅ |
| Sim: notificar aceitação | `createNotificacao()` | ✅ |
| Não: notificar rejeição | `createNotificacao()` | ✅ |
| **EXTENSÃO:** Confirmação do utilizador após aprovação | `POST /api/aluguer/:id/confirmar` → `aluguerService.confirmarReserva()` | ➕ |
| **Conformidade:** 100% — BPMN coberto + funcionalidade extra (confirmação) | | ✅ |

### BPMN04 — Criar Anúncio

| Passo BPMN | Implementação | Estado |
|------------|---------------|--------|
| EE/Prof seleciona figurino (existe?) | UI flow: dropdown de figurinos existentes + botão "Adicionar Figurino" | ✅ |
| Não existe: criar figurino | `POST /api/figurinos` ou `POST /api/figurinos/stock` | ✅ |
| Criar anúncio | `POST /api/anuncios` → `anunciosService.registarAnuncio()` | ✅ |
| Direção aprova/rejeita | `PUT /api/anuncios/:id/approve` ou `/reject` → `anunciosService.avaliarAnuncio()` | ✅ |
| Aprovado: notificar | `createNotificacao()` | ✅ |
| Rejeitado: notificar + "Refazer?" gateway | `anunciosService.ressubmeterAnuncio()` + UI de rejeição | ✅ |
| Sim: voltar a criar anúncio | Ressubmeter → reaberto para edição | ✅ |
| Não: cancelado | Anúncio permanece rejeitado/arquivado | ✅ |
| **Conformidade:** 100% — todos os passos implementados | | ✅ |

---

## 3. ARQUITETURA — Anomalias Técnicas

### 🔴 Bug: `aulas.service.js` linha 809 — Condição invertida

```javascript
// Erro: lança "Aluno não participa" quando o aluno JÁ participa
if (participation) {
    throw new Error("Aluno não participa nesta aula");
}
```
Deveria ser `if (!participation)` ou a mensagem deveria ser "Aluno já participa".

### 🔴 Bug: `aluguerFigurino.controller.js` — Mismatch route schema vs controller

- Route schema: `POST /api/aluguer/:id/avaliar` espera `decisao: { type: 'string' }` no body
- Controller chama `aluguerService.avaliarPedidoReserva(id, estadoidestado, ...)` — passa `estadoidestado` (number) que vem de `body.estadoidestado || body.decisao`
- A rota regista `decisao` como obrigatório mas o controller tenta ler `estadoidestado` primeiro
- **Possível bug** — testar com `body = { decisao: "Aprovado" }`

### 🟡 Dead code: `auth.controller.js`

Ficheiro `/controllers/auth.controller.js` exporta `register` e `login` mas **nunca é importado** por route nenhuma. Todo o auth é inline em `auth.routes.js`.

### 🟡 Dead code: `figurinosController.consultarFigurino`

Exportado em `figurinos.controller.js` mas nenhuma route o regista.

### 🟡 7 route files sem controller (bypass do padrão 3-layer)

`auth.routes.js`, `encarregado.routes.js`, `professor.routes.js`, `professor-aulas.routes.js`, `aluno.routes.js`, `direcao.routes.js` — todo o código está inline nos handlers em vez de usar controllers.

### 🟡 `createPedidoAula` em `encarregado.service.js` — `disponibilidadeiddisponibilidade` hardcoded como 7

O campo `disponibilidadeiddisponibilidade` no INSERT SQL está hardcoded como `7`. O valor passado no body só é usado para atualizar `disponibilidade_mensal.minutos_ocupados`.

---

## 4. COBERTURA DE TESTES

### Testes E2E Playwright (`/e2e/`)

| Ficheiro | Testes | Status |
|----------|--------|--------|
| `bpmn1-pedido-aula.spec.js` | 3 | ✅ |
| `bpmn2-remarcacao.spec.js` | 4 | ✅ |
| `bpmn3-aluguer-figurino.spec.js` | 2 | ✅ |
| `bpmn4-criar-anuncio.spec.js` | 2 | ✅ |
| `verificacao-completa.spec.js` | 3 | ✅ |
| **Total** | **14** | **✅** |

### Testes Vitest (`/backend/tests/`)

| Ficheiro | Testes | Status |
|----------|--------|--------|
| `unit/validacao-data.test.js` | 25 | ✅ |
| `unit/validacao-pressao.test.js` | 24 | ✅ |
| `integration/bpmn-integracao.test.js` | 22 | ✅ |
| `unit/pedidosaula.service.test.js` | 17 | ✅ |
| `unit/pedidosaula.controller.test.js` | 20 | ✅ |
| **Total** | **108** | **✅** |

### Postman Collection

| Coleção | Testes |
|---------|--------|
| `EntArtes_BPMN_Marcacao_Aula.json` | 35 requests com testes automáticos |

### Lacunas de Teste — Service files sem testes:

| Service | Funções | Risco |
|---------|---------|-------|
| `audit.service.js` | 2 | 🔴 — lógica de auditoria nunca testada |
| `email.service.js` | 1 | 🟡 — envia emails reais, difícil de testar unitariamente |
| `professor-aulas.service.js` | 2 | 🟡 — apenas wrapper sobre Prisma |

---

## 5. MAPA COMPLETO FRONTEND → BACKEND

| Página Frontend | API Calls |
|----------------|-----------|
| `Aulas.tsx` | getEncarregadoAulas, getProfessorAulas, getAlunoAulas, getDirecaoAulasPending, getDirecaoAulas, criarAula, createEncarregadoAula, approveDirecaoAula, rejectDirecaoAula, confirmarRealizacaoAula, remarcarAula, sugerirNovaData, responderSugestaoProfessor, responderSugestaoEE, responderSugestaoDirecao, pedirRemarcacao, getAulasDisponiveisParaInscricao, getEncarregadoAulasOpen, participarAula, confirmAula, cancelAula |
| `Turmas.tsx` | getTurmas, createTurma, updateTurma, deleteTurma, enrollAluno, removeAluno, closeTurma, archiveTurma, getUsers, getSalas, getModalidades |
| `Marketplace.tsx` | getAnuncios, getFigurinos, createAnuncio, updateAnuncio, deleteAnuncio, approveAnuncio, rejectAnuncio, criarReserva, getReservas, getEstados, approveReserva, getDisponibilidadeAluguer, ressubmeterAnuncio |
| `Stock.tsx` | getFigurinos, createFigurinoStock, updateFigurinoStatus, getTipos, getTamanhos, getGeneros, getCores |
| `GestaoEventos.tsx` | getEventosAdmin, createEvento, updateEvento, deleteEvento, publishEvento |
| `Disponibilidades.tsx` | getProfessorDisponibilidades, createProfessorDisponibilidade, updateProfessorDisponibilidade, deleteProfessorDisponibilidade |
| `Dashboard.tsx` | getAulas/all/getDirecaoAulas, getProfessorAulas, getEncarregadoAulas, getAlunoAulas, getUsers, getAnuncios, getDisponibilidades |
| `Utilizadores.tsx` | getUsers, createUser, updateUser, deleteUser, getModalidades |
| `Inscricoes.tsx` | getContactos |
| `Profile.tsx` | PUT /api/users/:id (via updateUser) |
| `ResetPassword.tsx` | forgotPassword, resetPassword |

---

## 6. MAPA COMPLETO BACKEND (ESQUEMATIZADO)

```
auth.routes.js (5, public, inline)
  ├── POST /api/auth/register
  ├── POST /api/auth/login
  ├── POST /api/auth/logout
  ├── POST /api/auth/forgot-password
  └── POST /api/auth/reset-password

users.routes.js (7, auth)
  ├── GET /api/users → usersController.getAllUsers → usersService.getAllUsers
  ├── GET /api/users/modalidades (inline) → prisma.modalidade
  ├── GET /api/users/:id → usersController.getUserById → usersService.getUserById
  ├── POST /api/users → usersController.createUser → usersService.createUser (DIRECAO)
  ├── PUT /api/users/:id → usersController.updateUser → usersService.updateUser (DIRECAO|self)
  ├── DELETE /api/users/:id → usersController.deleteUser → usersService.deleteUser (DIRECAO)
  └── GET /api/users/:id/modalidades → usersController.getUserModalidades → usersService.getUserModalidades

aulas.routes.js (21, auth)
  ├── GET /api/aulas → aulasController.listarAulas → aulasService.listarAulas
  ├── GET /api/aulas/all (inline, DIRECAO) → pedidosaulaService.getAllPedidosEAulas
  ├── GET /api/aulas/my (inline) → prisma
  ├── GET /api/aulas/open (inline, ENCARREGADO|ALUNO) → prisma
  ├── GET /api/aulas/:id → aulasController.getAulaById → aulasService.consultarAula
  ├── ... 16 more endpoints (ver relatório completo)
  └── POST /api/aulas/:id/presenca (inline, DIRECAO|PROFESSOR) → aulasService.registrarPresenca

encarregado.routes.js (6, inline)
  ├── GET /api/encarregado/aulas → encarregadoService.getEncarregadoAulas
  ├── GET /api/encarregado/disponibilidades → alunoService.getAllDisponibilidadesMensais
  ├── GET /api/encarregado/aulas/open → encarregadoService.getGruposAbertos
  ├── POST /api/encarregado/aulas/:pedidoId/participar → encarregadoService.marcarAula
  ├── POST /api/encarregado/aulas/:pedidoId/cancelar-participacao → encarregadoService.cancelarParticipacaoAula
  └── POST /api/encarregado/aulas → encarregadoService.submeterPedidoAula

professor.routes.js (8, inline)
  ├── GET /api/professor/disponibilidades → professorService.verificarDisponibilidadeProfessor
  ├── GET /api/professor/modalidades → professorService.getProfessorModalidades
  ├── GET /api/professor/aulas → professorService.getProfessorAulas
  ├── POST /api/professor/disponibilidades → professorService.createDisponibilidadeMensal
  ├── PUT /api/professor/disponibilidades/:id → professorService.updateDisponibilidadeMensal
  ├── DELETE /api/professor/disponibilidades/:id → professorService.deleteDisponibilidadeMensal
  ├── GET /api/professor/disponibilidades/all → professorService.getAllDisponibilidadesMensais
  └── GET /api/professor/dias-semana → professorService.getDiasSemana

direcao.routes.js (7, inline)
  ├── GET /api/direcao/aulas → direcaoService.consultarAula
  ├── GET /api/direcao/aulas/pending → direcaoService.getPendingAulas
  ├── POST /api/direcao/aulas/:id/approve → direcaoService.avaliarPedido
  ├── POST /api/direcao/aulas/:id/reject → direcaoService.avaliarPedido
  ├── POST /api/direcao/aulas/:id/realizado → direcaoService.confirmarAulaRealizada
  ├── GET /api/direcao/relatorio/aulas/:ano/:mes → direcaoService.getRelatorioAulasMensal
  └── GET /api/direcao/relatorio/presencas → direcaoService.getRelatorioPresencas

figurinos.routes.js (10, auth) → figurinosController → figurinosService (13 funções)
eventos.routes.js (6, auth) → eventosController → eventosService (6 funções)
turmas.routes.js (8, auth) → turmasController → turmasService (9 funções)
anuncios.routes.js (9, auth) → anunciosController → anunciosService (10 funções)
aluguerFigurino.routes.js (10, auth) → aluguerController → aluguerService (11 funções)
pedidosaula.routes.js (8, DIRECAO) → pedidosaulaController → pedidosaulaService (9 funções)
salas.routes.js (6, auth) → salasController → salasService (7 funções)
notificacoes.routes.js (5, auth) → notificacoesController → notificacoesService (6 funções)
audit.routes.js (1, DIRECAO, inline) → auditService (2 funções)
protected.routes.js (1, auth, inline) → req.user
public-contact.routes.js (1, public) → contactoController → emailService
```

---

## 7. MODELO DE DADOS PRISMA — 23 Entidades

```
utilizador (iduser, nome, email, telemovel, password, role, avatar, datacriacao)
  ├── aluno (idaluno, utilizadoriduser FK, encarregadoiduser FK, datadenascimento, genero)
  ├── professor (utilizadoriduser PK/FK, numeromecanografico)
  ├── encarregadoeducacao (utilizadoriduser PK/FK)
  ├── direcao (utilizadoriduser PK/FK)

pedidodeaula (idpedidoaula, data, horainicio, duracao, estadoidestado FK,
              encarregadoeducacaoutilizadoriduser FK, modalidade, mensagem,
              disponibilidade_mensal_id FK, alunoutilizadoriduser?,
              sugestaoestado?, novadata?, novadatalimite?)
  ├── estadoidestado → estado (idestado, tipoestado)
  ├── disponibilidade_mensal (iddisponibilidade_mensal, professorutilizadoriduser FK,
  │                           data, horainicio, horafim, sala FK, modalidade FK,
  │                           minutos_ocupados)
  ├── alunopedidoaula (alunoid FK, pedidoid FK)
  └── aula (idaula, pedidoid FK, sala FK, estadoaulaidestadoaula FK)
        ├── estadoaula (idestadoaula, nomeestadoaula)
        └── alunoaula (alunoid FK, aulaid FK)

grupo / turma (idgrupo, nome, status, descricao, modalidade, nivel, faixaetaria,
               professorId FK, estudioId FK, diasSemana, horainicio, horafim,
               duracao, lotacaomaxima, datainicio, datafim, cor, requisitos)
  └── alunogrupo (alunoid FK, grupoid FK)

figurino (idfigurino, nome, descricao, ...)
  ├── itemfigurino (iditem, tipo, tamanho, genero, cor, ...)
  └── transacaofigurino (idtransacao, ...)
        └── estado → estado

anuncio (idanuncio, ...)
contacto (idcontacto, ...)
notificacao (idnotificacao, ...)
evento (idevento, ...)
sala / estudio (idsala, ...)
presenca (idaula FK, idaluno FK, ...)
modalidade (idmodalidade, nomenclatura)
auditlog (idaudit, ...)
```

---

## 8. RECOMENDAÇÕES

### Prioritárias (bugs)

1. **🔴 Corrigir condição invertida em `aulas.service.js:809`** — `if (participation)` → `if (!participation)`
2. **🔴 Verificar `avaliarPedidoReserva` — route schema `decisao` vs controller `estadoidestado`** — alinhar parâmetros

### Médias (qualidade)

1. **🟡 Implementar controllers para rotas inline** — encarregado, professor, aluno, direcao (7 route files)
2. **🟡 Remover dead code** — `auth.controller.js` (ou importá-lo), `figurinosController.consultarFigurino`
3. **🟡 Adicionar testes para `audit.service.js` e `professor-aulas.service.js`**

### Baixas (melhoria contínua)

1. **🟢 Unificar padrão de role-checking** — mistura `hasRole()`, `.includes()`, `authorizeRole()`
2. **🟢 Schema: adicionar índices em FKs usadas em queries frequentes** (ex: `pedidodeaula.estadoidestado`)
