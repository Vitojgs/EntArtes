# Tabela Resumo dos Testes - Ent'Artes BPMN Marcação de Aula

## 1. Visão Geral

| Categoria | Quantidade | Descrição |
|-----------|----------|--------|
| **Total de Testes** | 35 | TestesPostman |
| **Testes Unitários** | 10 | Validação de endpoints, auth, campos |
| **Testes Integração** | 12 | CRUD, leitura, consistency |
| **Testes E2E** | 13 | FluxoscompletosBPMN |

---

## 2. Tabela Completa de Testes

| # | Nome do Teste | Tipo | Endpoint | Método | Fluxo BPMN | Objetivo |
|---|--------------|------|----------|--------|-----------|--------|
| 1 | Login como Encarregado | Unitário | POST /api/auth/login | AUTH | Autenticação | Validar login EE e obter token |
| 2 | Login como Professor | Unitário | POST /api/auth/login | AUTH | Autenticação | Validar login PROF e obter token |
| 3 | Login como Direção | Unitário | POST /api/auth/login | AUTH | Autenticação | Validar login DIREÇÃO e obter token |
| 4 | Login inválido | Unitário | POST /api/auth/login | AUTH | Rejeitar credenciais erradas |
| 5 | Ver Disponibilidades | Integração | GET /api/encarregado/disponibilidades | READ | BPMN1-1 | Listar horários disponíveis |
| 6 | Criar Pedido (data futura) | Integração | POST /api/encarregado/aulas | CREATE | BPMN1-1 | Criar pedido válido |
| 7 | Ver meus pedidos (Encarr.) | Integração | GET /api/encarregado/aulas | READ | BPMN1-1 | Listar pedidos EE |
| 8 | Ver pedidos pendentes (Dir.) | Integração | GET /api/direcao/aulas/pending | READ | BPMN1-2 | Listar pendentes (DIREÇÃO) |
| 9 | Aprovar pedido (Direção) | E2E | POST /api/direcao/aulas/:id/approve | UPDATE | BPMN1-2 | Aprovar pelo admin |
| 10 | Confirmar realização (Dir.) | E2E | POST /api/direcao/aulas/:id/realizado | UPDATE | BPMN1-3 | Marcar realizations |
| 11 | Ver aula confirmada (Prof.) | Integração | GET /api/professor/aulas | READ | BPMN1-3 | PROF vê aulas |
| 12 | Criar pedido - Data passada | Unitário | POST /api/encarregado/aulas | VALIDATE | BPMN1-E1 | Rejeitar data passada |
| 13 | Criar pedido - Sem auth | Unitário | POST /api/encarregado/aulas | VALIDATE | AUT-ERR | Rejeitar sem token |
| 14 | Criar pedido - Campos vazios | Unitário | POST /api/encarregado/aulas | VALIDATE | VAL-ERR | Rejeitar campos em falta |
| 15 | Aprovar - Sem permissão | Unitário | POST /api/direcao/aulas/:id/approve | VALIDATE | AUTH-ERR | Rejeitar sem role |
| 16 | 1. Sugerir nova data (Dir.) | E2E | PUT /api/aulas/:id/remarcar | UPDATE | BPMN2-1 | Propor remarcação |
| 17 | 2. Professoraceita | E2E | POST /api/aulas/:id/responder-professor | UPDATE | BPMN2-2 | PROF aceita |
| 18 | 3. Encarregado confirma | E2E | POST /api/aulas/:id/responder-encarregado | UPDATE | BPMN2-3 | EE confirma |
| 19 | Rejeitar remarcação (EE) | E2E | POST /api/aulas/:id/responder-encarregado | UPDATE | BPMN2-ERR | EE rejeita |
| 20 | Sugerir data passada (erro) | Unitário | PUT /api/aulas/:id/remarcar | VALIDATE | BPMN2-E1 | Rejeitar data passada |
| 21 | Listar Salas | Unitário | GET /api/salas | READ | UTIL | Listar salas |
| 22 | Listar Modalidades | Unitário | GET /api/users/modalidades | READ | UTIL | Listar modalidades |
| 23 | Listar Users | Unitário | GET /api/users | READ | UTIL | Listar utilizadores |
| 24 | Notificações | Integração | GET /api/notificacoes | READ | UTIL | Ver notificações |
| 25 | Pedido não encontrado | Unitário | GET /api/pedidos/:id | 404 | FALHA-1 | Testar 404 |
| 26 | Aula cancelada | Integração | POST /api/direcao/aulas/:id/approve | STATE | FALHA-2 | Testar state machine |

---

## 3. Mapeamento com BPMN

### BPMN1: Marcação de Aula

| Passo | Ação | Teste(s) Associado(s) |
|-------|------|---------------------|
| 1 | EE visualiza disponibilidades | #5 |
| 2 | EE submete pedido | #6 |
| 3 | Sistema notifica DIREÇÃO | #24 |
| 4 | DIREÇÃO visualiza pendentes | #8 |
| 5 | DIREÇÃO aprova | #9 |
| 6 | Sistema cria aula | #10, #11 |

### BPMN2: Remarcação

| Passo | Ação | Teste(s) Associado(s) |
|-------|------|---------------------|
| 1 | DIREÇÃO propõe nova data | #16 |
| 2 | PROFESSORaceita/rejeita | #17 |
| 3 | EE confirma/rejeita | #18, #19 |
| 4 | Sistema aplica/remarcação | #18 |

---

## 4. Tipos de Teste por Objetivo

### Testes Unitários (Validação)
- #1-4: Autenticação
- #12-15: Validação de entrada
- #20: Validação temporal
- #21-23: Utilitários

### Testes de Integração (Leitura/Escrita)
- #5-8: CRUD básico
- #24-26: Estados e transições

### Testes End-to-End (Fluxos)
- #9-11: Fluxo completo BPMN1
- #16-19: Fluxo completo BPMN2

---

## 5. Casos de Erro Testados

| Código | Cenário | Teste |
|--------|--------|-------|
| 400 | Data no passado | #12, #20 |
| 400 | Campos vazios | #14 |
| 401 | Sem autenticação | #13 |
| 403 | Sem permissão | #15 |
| 404 | Recurso não existe | #25 |
| 400 | Estado inválido | #26 |

---

## 6. Como Usar

### Importar para oPostman

1. Abrir Postman
2. File → Import
3. Selecionar `EntArtes_BPMN_Marcacao_Aula.json`
4. Selecionar `EntArtes_Environment.json`
5. Criar variável `base_url` em Environment se necessário

### Executar Testes

```bash
# Executar coleção completa
# No Postman: Collection Runner

# Ou via Newman (CLI)
newman run EntArtes_BPMN_Marcacao_Aula.json -e EntArtes_Environment.json
```

---

## 7. Notas para Defesa

### Por que testesunitários vs integração?

| Critério | Unitário | Integração | E2E |
|---------|---------|-----------|-----|
| **Escopo** | 1 endpoint | Múltiplos endpoints | Sistema completo |
| **Base de dados** | Mock | Real | Real |
| **Dependências** | Isoladas | Parciais | Totais |
| **Velocidade** | Rápido | Médio | Lento |
| **Exemplo** | #12-15 | #5-8, #24 | #9-11, #16-19 |

### Por que estes fluxos?

1. **BPMN1 (Marcação)**: Fluxo principal do sistema - justifica oCore business
2. **BPMN2 (Remarcação)**: Workflow complexo com múltiplos atores
3. **Casos de erro**: Garantem robustez - validações de segurança

---

*Tabela gerada em 2026-04-30*