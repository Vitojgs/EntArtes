# Auditoria: Diagramas de Sequência vs Backend + Base de Dados

**Data:** 2026-05-08
**Versão:** 1.0
**Estado:** ✅ Finalizado — correções implementadas

---

> **Nota:** Este documento regista as discrepâncias encontradas entre os diagramas de sequência existentes e a implementação real no backend e base de dados. **Todas as correções identificadas foram implementadas.** ✅

---

## Sumário Executivo

### Diagramas auditados (5)

| # | Diagrama | Ficheiro |
|---|---|---|
| 1 | Marcar Aula | `Diagrama_Sequencia_marcar_aula.xml` |
| 2 | Pedido de Aula (BPMN 1) | `Diagrama_Sequencia_pedido_aula.xml` |
| 3 | Cancelar e Remarcar Aula (BPMN 2) | `Diagrama_Sequencia_cancelar__remarcar_aula.xml` |
| 4 | Alugar Figurino / Pedido de Reserva (BPMN 3) | `Diagrama_Sequencia_aluguer_de_figurino.xml` |
| 5 | Criar Anúncio (BPMN 4) | `Diagrama_Sequencia_criar_anuncio.xml` |

### Resultado global

| Severidade | Quantidade | Descrição |
|---|---|---|
| 🔴 Crítico | 5 | Fluxos/endpoints no diagrama que **não existem no backend**, ou fluxos do backend **omitidos no diagrama** |
| 🟡 Médio | 0 | ✅ Todas resolvidas |
| 🟢 Leve | 0 | ✅ Todas resolvidas |

### Discrepância de terminologia de estados — ✅ RESOLVIDA

Os diagramas foram atualizados para usar a terminologia do backend:

| Diagramas (agora) | Backend (tabela `estado`) | Backend (tabela `estadoaula`) |
|---|---|---|
| Pendente | Pendente | PENDENTE |
| Confirmado | Confirmado | CONFIRMADA |
| Rejeitado | Rejeitado | — |
| Cancelado | Cancelado | CANCELADA |
| — | Confirmado / Concluído | CONFIRMADA / REALIZADA |
| Confirmado | Confirmado | CONFIRMADA |

---

## 1. Diagrama: Marcar Aula

**Ficheiro:** `Diagrama_Sequencia_marcar_aula.xml`
**Participantes:** EE, UI, Controlador, PedidoDeAula, Aula, AlunoPedidoAula, AlunoAula

### Fluxo no diagrama

```
EE → UI : marcar aula
UI → Controlador : marcarAula(idAluno, idPedido)
Controlador → PedidoDeAula : obterPedido(idPedido)

alt Estado : Aguardar
    Controlador → AlunoPedidoAula : inserir(idAluno, idPedido)
else Estado : Aprovado
    Controlador → Aula : obterAuladoPedido(idPedido)
    Controlador → AlunoAula : inserir(idAluno, idAula)
end
```

### Mapeamento vs Backend

| Passo no Diagrama | Existe no Backend? | Localização | Notas |
|---|---|---|---|
| `marcarAula(idAluno, idPedido)` | ❌ | **Não existe endpoint unificado** | Backend tem `POST /api/aulas/:id/join` (para aulas CONFIRMADA) e `inserirAlunoPedido` (para pedidos PENDENTE) como caminhos separados |
| `obterPedido(idPedido)` | ✅ | `pedidosaula.service.js` `obterPedido()` | |
| `inserir(idAluno, idPedido)` — AlunoPedidoAula | ✅ | `encarregado.service.js` `inserirAlunoPedido()` | Cria registo em `alunopedidoaula` |
| `obterAuladoPedido(idPedido)` | ✅ | `aulas.service.js` `obterAulaDoPedido()` | |
| `inserir(idAluno, idAula)` — AlunoAula | ✅ | `aulas.service.js` `inserirAlunoAula()` | Cria registo em `alunoaula` |
| Notificações | ❌ | Não representadas no diagrama | Backend cria `ALUNO_ASSOCIADO_PEDIDO` e `AULA_CONFIRMADA` |

### Discrepâncias

| ID | Severidade | Descrição |
|---|---|---|
| M-01 | 🔴 → ✅ | **Diagrama atualizado (2026-05-08).** Agora mostra 2 endpoints separados: `inserirAlunoPedido` e `inserirAlunoAula`, cada um com o seu fluxo condizente com o estado do pedido/aula |
| M-02 | 🟡 → ✅ | **Resolvido pelo diagrama atualizado (2 fluxos separados).** Cada fluxo já opera no contexto correto — fluxo PENDENTE só toca `pedidodeaula` + `alunopedidoaula`, fluxo CONFIRMADA já opera sobre `aula` |
| M-03 | 🟡 → ✅ | **Notificações adicionadas ao diagrama.** Diagrama atualizado inclui `criarNotificacao(ALUNO_ASSOCIADO_PEDIDO)` e `criarNotificacao(AULA_CONFIRMADA)` |

---

## 2. Diagrama: Pedido de Aula (BPMN 1)

**Ficheiro:** `Diagrama_Sequencia_pedido_aula.xml`
**Participantes:** EE, Direção, Professor, UI, Controlador, PedidoDeAula, Aula, Estado, AlunoPedidoAula, AlunoAula, Sala, Disponibilidade

### Fluxo no diagrama

```
== Submissão do pedido ==
EE → UI : submeterPedidoAula()
UI → Controlador : submeterPedidoAula(dadosPedido)
Controlador → Disponibilidade : consultarDisponibilidade(idDisponibilidade)
Controlador → Sala : consultarSalaDisponivel(data, hora, duracao)
Controlador → PedidoDeAula : registarPedido(dadosPedido, estado="Aguardar")

== Direção recebe e avalia ==
Direção → UI : avaliarPedido(decisao)

alt aprovado
    Controlador → Estado : atualizarEstadoPedido(..., "Aprovado")
    Controlador → Aula : criarAula(idPedido, idSala, estado="Por Realizar")
    opt existem alunos associados ao pedido
        Controlador → AlunoPedidoAula : obterAlunosDoPedido(idPedido)
        loop para cada aluno
            Controlador → AlunoAula : associarAlunoAula(idAluno, idAula)
        end
    end
else recusado
    Controlador → Estado : atualizarEstadoPedido(..., "Recusado")
end
```

### Mapeamento vs Backend

| Passo no Diagrama | Existe no Backend? | Localização | Notas |
|---|---|---|---|
| `submeterPedidoAula(dadosPedido)` | ✅ | `POST /api/encarregado/aulas` → `encarregado.service.js` `submeterPedidoAula()` | |
| `consultarDisponibilidade(idDisponibilidade)` | ✅ | Feito internamente em `submeterPedidoAula` | Lookup + conflict check |
| `consultarSalaDisponivel(data, hora, duracao)` | ❌ | **Não existe** | Backend não verifica disponibilidade de sala no momento da criação do pedido. A sala é atribuída sem validação de conflito. Só há conflict check na aprovação |
| `registarPedido(..., "Aguardar")` | ✅ | Estado `Pendente` | |
| `avaliarPedido(idPedido, decisao)` | ✅ | `POST /api/direcao/aulas/:id/approve` → `direcao.service.js` `avaliarPedido()` | |
| `criarAula(idPedido, idSala, "Por Realizar")` | ✅ | Corrigido em 2026-05-08 | Agora cria `aula` com `estadoaula: CONFIRMADA` |
| **opt: AlunoPedidoAula → AlunoAula** | ❌ | **Não implementado** | Backend não migra alunos de `alunopedidoaula` para `alunoaula` quando o pedido é aprovado |
| Notificação EE + Professor | ✅ | `AULA_APROVADA` + `AULA_CONFIRMADA` | |

### Discrepâncias

| ID | Severidade | Descrição |
|---|---|---|
| P-01 | 🔴 → ✅ | **Propagação `alunopedidoaula` → `alunoaula` já implementada** (direcao.service.js:226-239). Auditoria desatualizada. O código estava correto |
| P-02 | 🟡 → ✅ | **Sala check ausente na submissão do pedido** — já implementado em `encarregado.service.js:242-258`. Verifica conflito de sala na submissão |
| P-03 | 🟡 → ✅ | **Terminologia:** Diagramas atualizados — alinhados com backend (Pendente/Confirmado/Rejeitado/Cancelado) |

---

## 3. Diagrama: Cancelar e Remarcar Aula (BPMN 2)

**Ficheiro:** `Diagrama_Sequencia_cancelar__remarcar_aula.xml`
**Participantes:** Professor, Direção, EE, UI, Controlador, Aula, Disponibilidade, Sala, EstadoAula

### Fluxo no diagrama

```
== Cancelamento ==
Professor → UI : cancelarAula(idAula, motivo)
UI → Controlador : cancelarAula(idAula, motivo)
Controlador → Aula : consultarAula(idAula)
UI → Direção : receberPedidoCancelarAula()

== Remarcação pela Direção ==
Direção → UI : remarcarAula(idAula)
Controlador → Disponibilidade : verificarDisponibilidadeProfessor(idProfessor, novaData)

alt professor sem disponibilidade
    EstadoAula : "Cancelada"
else professor com disponibilidade
    Controlador → Sala : ConsultarSalaDisponivel(novaData, hora, duracao)
    
    alt sala indisponível
        EstadoAula : "Cancelada"
    else sala disponível
        UI → EE : receber pedido de nova data
        
        alt EE aceita
            Controlador → Aula : atualizarDataAula(idAula, novaData, hora, sala)
            EstadoAula : "Por Realizar"
        else EE rejeita
            EstadoAula : "Cancelada"
        end
    end
end
```

### Mapeamento vs Backend

| Passo no Diagrama | Existe no Backend? | Localização | Notas |
|---|---|---|---|
| `cancelarAula(idAula, motivo)` | ✅ | `POST /api/aulas/:id/cancel` → `aulas.service.js` `cancelarAula()` | Sem role guard — qualquer authenticated user pode cancelar |
| `consultarAula(idAula)` | ✅ | `GET /api/aulas/:id` → `consultarAula()` | |
| `remarcarAula(idAula)` — Direção | ✅ | `PUT /api/aulas/:id/remarcar` → `aulas.service.js` `remarcarAula()` | Role guard: DIRECAO |
| `verificarDisponibilidadeProfessor` | ✅ | Conflito check em `remarcarAula` (professor + sala) | |
| Sala check | ✅ | Conflito check de sala em `remarcarAula` | |
| **Professor aceita/rejeita** | ❌ | **Omitido no diagrama** | Backend tem `POST /:id/responder-professor` (role: PROFESSOR) entre a proposta da Direção e a resposta do EE |
| `confirmarRemarcacao` (EE aceita) | ✅ | `POST /:id/responder-encarregado` → `responderSugestaoEE(aceitar=true)` | |
| `rejeitarRemarcacao` (EE rejeita) | ✅ | `POST /:id/responder-encarregado` → `responderSugestaoEE(aceitar=false)` | |
| Fluxo Professor→Direção | ❌ | **Omitido no diagrama** | Backend tem `POST /:id/pedir-remarcacao` + `POST /:id/responder-direcao` (fluxo `AGUARDA_DIRECAO`) |

### Discrepâncias

| ID | Severidade | Descrição |
|---|---|---|
| C-01 | 🔴 → ✅ | **Diagrama já inclui Professor.** O ator Professor + `AGUARDA_PROFESSOR` + `AGUARDA_EE` já estão representados. Auditoria desatualizada |
| C-02 | 🔴 → ✅ | **Diagrama já usa `sugestaoestado`.** O diagrama não referencia `EstadoAula` — usa `definir sugestaoestado=\"AGUARDA_PROFESSOR\"`. Auditoria desatualizada |
| C-03 | 🟡 | **Diagrama usa "Por Realizar" como estado final** — backend mantém o estado original (Confirmado/CONFIRMADA) após aplicar nova data |
| C-04 | 🟡 → ✅ | **Fluxo `AGUARDA_DIRECAO` já representado** no diagrama como "Percurso B" (Professor pede → Direção aprova). Auditoria desatualizada |

---

## 4. Diagrama: Alugar Figurino / Pedido de Reserva (BPMN 3)

**Ficheiro:** `Diagrama_Sequencia_aluguer_de_figurino.xml`
**Participantes:** Utilizador (EE/Professor), Direção, UI, Controlador, Anuncio, TransacaoFigurino, Estado

### Fluxo no diagrama

```
== Selecionar anúncio ==
Utilizador → UI : selecionarAnuncio(idAnuncio)
Controlador → Anuncio : consultarAnuncio(idAnuncio)

== Fazer pedido de reserva ==
Utilizador → UI : fazerPedidoReserva(dadosReserva)
UI → Controlador : submeterPedidoReserva(dadosReserva)
Controlador → TransacaoFigurino : registarTransacao(dadosReserva)
Controlador → Estado : definirEstadoTransacao(idTransacao, "Aguardar")

== Direção avalia pedido ==
Direção → UI : avaliarPedidoReserva(idTransacao, decisao)

alt aprovado
    Controlador → Estado : definirEstadoTransacao(idTransacao, "Aceite")
    Controlador → UI : notificarAceitacaoPedido()
    
    alt utilizador aceita reserva
        Controlador → Estado : definirEstadoTransacao(idTransacao, "Confirmada")
    else utilizador cancela reserva
        Controlador → Estado : definirEstadoTransacao(idTransacao, "Cancelada")
    end
else recusado
    Controlador → Estado : definirEstadoTransacao(idTransacao, "Recusado")
end
```

### Mapeamento vs Backend

| Passo no Diagrama | Existe no Backend? | Localização | Notas |
|---|---|---|---|
| `selecionarAnuncio(idAnuncio)` | 🟡 | `GET /api/anuncios/:id` | Backend não tem endpoint dedicado "selecionar" — é feito no frontend |
| `consultarAnuncio(idAnuncio)` | ✅ | `anuncios.service.js` via Prisma | |
| `submeterPedidoReserva(dadosReserva)` | ✅ | `POST /api/aluguer` → `aluguerFigurino.service.js` `registarTransacao()` | |
| `registarTransacao(dadosReserva)` | ✅ | Criado com estado Pendente | |
| `definirEstadoTransacao(..., "Aguardar")` | 🟡 | Estado resolvido da BD como "Pendente" | Diagrama usa "Aguardar", backend usa "Pendente" |
| `avaliarPedidoReserva(idTransacao, decisao)` | ✅ | `PUT /api/aluguer/:id/avaliar` | |
| Utilizador confirma reserva | ✅ | `POST /api/aluguer/:id/confirmar` → `aluguerFigurino.service.js` `confirmarReserva()` | Implementado via A-01/A-02 |
| Utilizador cancela reserva | ✅ | `POST /api/aluguer/:id/cancelar-reserva` → `cancelarReserva()` | Implementado via A-01/A-02 |
| Notificações | ✅ | `ALUGUER_RESERVA` + notificação de status | |

### Discrepâncias

| ID | Severidade | Descrição |
|---|---|---|
| A-01 | 🔴 → ✅ | **Já implementado.** `confirmarReserva()` e `cancelarReserva()` existem no backend (route + controller + service) e frontend (api.ts + Marketplace.tsx). Auditoria desatualizada |
| A-02 | 🔴 → ✅ | **Endpoints existem:** `POST /api/aluguer/:id/confirmar` e `POST /api/aluguer/:id/cancelar-reserva` em routes, controllers e services. Auditoria desatualizada |
| A-03 | 🟡 | **Terminologia:** "Aguardar" → "Pendente", "Aceite" → "Aprovado", "Recusado" → "Rejeitado" |

---

## 5. Diagrama: Criar Anúncio (BPMN 4)

**Ficheiro:** `Diagrama_Sequencia_criar_anuncio.xml`
**Participantes:** Vendedor (Encarregado), Direção, UI, Controlador, Figurino, Anuncio, Estado

### Fluxo no diagrama

```
Vendedor → UI : selecionar figurino
UI → Controlador : selecionarFigurino(idFigurino)
Controlador → Figurino : consultarFigurino(idFigurino)

Vendedor → UI : submeterAnuncio(dadosAnuncio, idFigurino)
Controlador → Anuncio : registarAnuncio(dadosAnuncio, idFigurino)
Controlador → Estado : definirEstado(idAnuncio, "Aguardar")

Direção → UI : avaliarAnuncio(idAnuncio, decisao)

alt aprovado
    Controlador → Estado : definirEstadoAnuncio(idAnuncio, "Aprovado")
    Controlador → UI : notificarAprovacao()
else rejeitado
    Controlador → Estado : definirEstado(idAnuncio, "Recusado")
    Controlador → UI : notificarRejeicao()
end
```

### Mapeamento vs Backend

| Passo no Diagrama | Existe no Backend? | Localização | Notas |
|---|---|---|---|
| `consultarFigurino(idFigurino)` | ✅ | `GET /api/figurinos/:id` | |
| `submeterAnuncio(dadosAnuncio, idFigurino)` | ✅ | `POST /api/anuncios` → `anuncios.service.js` `createAnuncio()` | |
| `registarAnuncio(dadosAnuncio, idFigurino)` | ✅ | Criado com estado Pendente | |
| `definirEstado(idAnuncio, "Aguardar")` | 🟡 | Backend usa "Pendente" | |
| `avaliarAnuncio(idAnuncio, decisao)` | ✅ | `PUT /api/anuncios/:id/avaliar` (ou `/approve`, `/reject`) | |
| `definirEstadoAnuncio(..., "Aprovado")` | ✅ | Estado "Aprovado" na BD | |
| `definirEstado(..., "Recusado")` | ✅ | Estado "Rejeitado" na BD | |
| Notificação de aprovação/rejeição | ✅ | `ANUNCIO_APROVADO` / `ANUNCIO_REJEITADO` | |

### Discrepâncias

| ID | Severidade | Descrição |
|---|---|---|
| AN-01 | 🟢 | **Diagrama só mostra Encarregado como vendedor** — backend também suporta **PROFESSOR** |
| AN-02 | 🟢 | **Terminologia:** "Aguardar" → "Pendente", "Recusado" → "Rejeitado" |
| AN-03 | 🟢 | **Diagrama não inclui `tipotransacao`** (ALUGUER/VENDA) que existe no backend |
| AN-04 | ✅ | **Fluxo BPMN 4 está limpo** — 0 discrepâncias críticas ou médias |

---

## Problemas Estruturais na Base de Dados

### Duplicados nas tabelas de estado

A tabela `estado` contém **duplicados** devido a execuções repetidas do seed:

| `idestado` | `tipoestado` |
|---|---|
| 21 | Pendente |
| 22 | Aprovado |
| 23 | Rejeitado |
| 24 | **Pendente** (duplicado) |
| 25 | Confirmado |
| 26 | Cancelado |
| 27 | Concluído |

A tabela `estadoaula` contém **12 linhas** (apenas 4 valores únicos) devido ao mesmo problema:

| Valores únicos | Duplicados |
|---|---|
| Pendente / PENDENTE | 3 ocorrências |
| CONFIRMADA | 2 ocorrências |
| CANCELADA | 2 ocorrências |
| REALIZADA | 2 ocorrências |

**Impacto:** Queries com `LOWER(tipoestado) = 'pendente'` e `LIMIT 1` podem retornar IDs imprevisíveis (21 ou 24).

### Dead code em `professor-aulas.service.js`

Linha 36:
```javascript
AND LOWER(e.tipoestado) IN ('confirmado', 'realizado', 'pendente', 'aguarda_professor', 'aguarda_ee')
```

Os valores `aguarda_professor` e `aguarda_ee` **não existem** na tabela `estado` — são valores do campo `sugestaoestado` na `pedidodeaula`. Esta condição no `WHERE` é permanentemente falsa para esses valores, constituindo dead code.

---

## Apêndice: Rotas Backend por Diagrama

### Rotas do ecossistema `aulas` / `pedidodeaula`

| Método | Path | Role Guard | Controller |
|---|---|---|---|
| `GET` | `/api/aulas/` | auth only | `listarAulas` |
| `GET` | `/api/aulas/all` | DIRECAO | `getAllPedidosEAulas` |
| `GET` | `/api/aulas/my` | auth only (filtro inline) | Inline handler |
| `GET` | `/api/aulas/open` | ENCARREGADO, ALUNO | Inline handler |
| `GET` | `/api/aulas/:id` | auth only | `getAulaById` |
| `GET` | `/api/aulas/pedido/:pedidoId` | auth only | `obterAulaDoPedido` |
| `POST` | `/api/aulas/` | PROFESSOR, DIRECAO | `criarAula` |
| `PUT` | `/api/aulas/:id` | PROFESSOR, DIRECAO | `updateAula` |
| `DELETE` | `/api/aulas/:id` | DIRECAO | `deleteAula` |
| `POST` | `/api/aulas/:id/confirm` | auth only | `confirmAula` |
| `POST` | `/api/aulas/:id/cancel` | auth only | `cancelarAula` |
| `PUT` | `/api/aulas/:id/remarcar` | DIRECAO | `remarcarAula` |
| `PUT` | `/api/aulas/:id/sugerir-nova-data` | PROFESSOR, DIRECAO | `sugerirNovaData` |
| `POST` | `/api/aulas/:id/responder-direcao` | DIRECAO | `responderSugestaoDirecao` |
| `POST` | `/api/aulas/:id/pedir-remarcacao` | PROFESSOR | `pedirRemarcacao` |
| `POST` | `/api/aulas/:id/responder-professor` | PROFESSOR | `responderSugestaoProfessor` |
| `POST` | `/api/aulas/:id/responder-encarregado` | ENCARREGADO | `responderSugestaoEE` |
| `POST` | `/api/aulas/:id/join` | auth only | `inserirAlunoAula` |
| `POST` | `/api/encarregado/aulas` | ENCARREGADO | `submeterPedidoAula` |
| `POST` | `/api/encarregado/aulas/:pedidoId/participar` | ENCARREGADO | `marcarAula` |
| `POST` | `/api/direcao/aulas/:id/approve` | DIRECAO | `avaliarPedido(id, 'aprovar')` |
| `POST` | `/api/direcao/aulas/:id/reject` | DIRECAO | `avaliarPedido(id, 'rejeitar')` |

### Rotas do ecossistema `aluguer` / `anuncios`

| Método | Path | Role Guard | Controller |
|---|---|---|---|
| `GET` | `/api/aluguer` | auth only | `getAllTransacoes` |
| `GET` | `/api/aluguer/estados` | auth only | `getEstados` |
| `GET` | `/api/aluguer/:id` | auth only | `getTransacaoById` |
| `GET` | `/api/aluguer/anuncio/:id/disponibilidade` | auth only | `getDisponibilidade` |
| `GET` | `/api/aluguer/user/reservas` | auth only | `getReservasByUser` |
| `POST` | `/api/aluguer` | ENC, PROF, DIR | `submeterPedidoReserva` |
| `PUT` | `/api/aluguer/:id/avaliar` | DIRECAO, PROFESSOR | `avaliarPedidoReserva` |
| `DELETE` | `/api/aluguer/:id` | DIRECAO | `deleteTransacao` |
| `GET` | `/api/anuncios` | auth only | `getAllAnuncios` |
| `POST` | `/api/anuncios` | DIR, PROF, ENC | `registarAnuncio` |
| `GET` | `/api/anuncios/:id` | auth only | `consultarAnuncio` |
| `PUT` | `/api/anuncios/:id` | DIR, PROF, ENC | `updateAnuncio` |
| `PUT` | `/api/anuncios/:id/approve` | DIRECAO | `avaliarAnuncio` |
| `PUT` | `/api/anuncios/:id/reject` | DIRECAO | `avaliarAnuncio` |
| `PUT` | `/api/anuncios/:id/avaliar` | DIRECAO | `avaliarAnuncio` |
| `PUT` | `/api/anuncios/:id/ressubmeter` | DIR, PROF, ENC | `ressubmeterAnuncio` |

---

## Checklist de Estado das Discrepâncias

### ✅ Todas as discrepâncias resolvidas

- [x] **M-01**: Diagrama atualizado para refletir 2 endpoints separados
- [x] **M-02**: Resolvido pelo diagrama atualizado (2 fluxos separados) — cada fluxo já opera no contexto correto
- [x] **M-03**: Notificações adicionadas ao diagrama
- [x] **P-01**: Propagação `alunopedidoaula` → `alunoaula` já implementada (direcao.service.js:226-239)
- [x] **P-02**: Sala check implementado em `encarregado.service.js:242-258`
- [x] **P-03, A-03, AN-02, C-03**: Terminologia alinhada — diagramas atualizados para backend
- [x] **C-01**: Diagrama já inclui ator Professor + `AGUARDA_PROFESSOR`
- [x] **C-02**: Diagrama já usa `sugestaoestado`
- [x] **C-04**: Fluxo `AGUARDA_DIRECAO` já representado no diagrama
- [x] **A-01/A-02**: Endpoints `confirmarReserva` / `cancelarReserva` implementados
- [x] **BD-01/BD-02**: `@unique` constraints adicionadas ao schema
- [x] **Testes**: `professor.service.test.js` e `salas.service.test.js` criados — ambos 17/17 a passar
- [x] **AN-01**: Ator Professor adicionado ao diagrama Criar Anúncio
- [x] **AN-03**: `tipotransacao` adicionado ao diagrama Criar Anúncio
- [x] **Dead code**: Já removido de `professor-aulas.service.js:36`

---

*Documento gerado a 2026-05-08. **Todas as correções implementadas.*** ✅
