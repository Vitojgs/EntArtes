# Guia de Testes Postman - Ent'Artes API

Este documento explica como usar a coleção Postman para testar a API do backend Ent'Artes.
Os testes estão alinhados com os fluxos BPMN dos testes E2E Playwright.

---

## 1. Importar para o Postman

### Passos:
1. Abrir o Postman
2. Clicar em **Import** (canto superior esquerdo)
3. Arrastar o ficheiro `Entartes_BPMN_Tests.postman_collection.json`
4. Em **Environments**, importar `entartes_environment.postman_environment.json`
5. Selecionar o ambiente "Ent'Artes - Development" na dropdown

### Credenciais de Teste:
| Role | Email | Password |
|------|-------|----------|
| Direção | direcao@entartes.pt | password123 |
| Professor | joao.santos@entartes.pt | password123 |
| Encarregado | pedro.oliveira@email.pt | password123 |
| Aluno | miguel.oliveira@email.pt | password123 |

---

## 2. Estrutura da Coleção

```
Ent'Artes BPMN Tests
├── 🟢 AUTH - Login (sem autenticacao)
│   ├── POST Login
│   ├── POST Register
│   └── POST Forgot Password
│
├── 📋 BPMN 1 - Pedido de Aula
│   ├── 1. Login como ENCARREGADO
│   ├── 2. Obter disponibilidades (publico)
│   ├── 3. Criar pedido de aula (ENCARREGADO)
│   ├── 4. Logout ENCARREGADO
│   ├── 5. Login como DIRECAO
│   ├── 6. Ver pedidos pendentes (DIRECAO)
│   └── 7. Aprovar pedido (DIRECAO)
│
├── 📋 BPMN 2 - Remarcacao de Aula
│   ├── 1. Criar pedido PENDENTE (setup)
│   ├── 2. Sugerir nova data (DIRECAO)
│   ├── 3. Logout DIRECAO
│   ├── 4. Login PROFESSOR
│   ├── 5. Responder como PROFESSOR (Aceitar)
│   ├── 6. Logout PROFESSOR
│   ├── 7. Login ENCARREGADO
│   └── 8. Responder como ENCARREGADO (Aceitar)
│
├── 📋 BPMN 3 - Aluguer de Figurino
│   ├── 1. Obter anuncios ativos
│   ├── 2. Criar reserva (ENCARREGADO)
│   ├── 3. Logout ENCARREGADO
│   ├── 4. Login DIRECAO
│   └── 5. Aprovar reserva (DIRECAO)
│
├── 📋 BPMN 4 - Criar Anuncio
│   ├── 1. Login ENCARREGADO
│   ├── 2. Obter figurinos (lookup)
│   ├── 3. Criar anuncio
│   ├── 4. Logout ENCARREGADO
│   ├── 5. Login DIRECAO
│   └── 6. Aprovar anuncio (PUT)
│
├── 🔒 PROTECTED - Endpoints autenticados
│   ├── GET /api/users
│   ├── GET /api/users/:id
│   ├── GET /api/aulas/my
│   ├── GET /api/aulas/open
│   ├── GET /api/professor/disponibilidades/all
│   ├── GET /api/turmas
│   ├── GET /api/figurinos
│   └── GET /api/notificacoes
│
└── 🌐 PUBLIC - Endpoints publicos
    ├── GET /api/public/disponibilidades
    ├── GET /api/public/eventos
    ├── GET /api/public/modalidades
    └── POST /api/contacto (formulario)
```

---

## 3. Fluxos de Teste (BPMN) - Detalhado

### 📋 BPMN 1 — Pedido de Aula

| Passo | Request | Endpoint | Body | Notas |
|-------|---------|---------|------|-------|
| 1 | Login ENCARREGADO | POST /api/auth/login | email, password | Guarda token |
| 2 | Get disponibilidades | GET /api/public/disponibilidades | - | Sem auth, guarda slotId |
| 3 | Criar pedido | POST /api/encarregado/aulas | data, horainicio, duracaoaula, disponibilidade_mensal_id, salaidsala | Guarda pedidoId |
| 4 | Logout | POST /api/auth/logout | - | Limpa token |
| 5 | Login DIRECAO | POST /api/auth/login | email, password | Guarda token |
| 6 | Pending | GET /api/direcao/aulas/pending | - | Guarda pendingPedidoId |
| 7 | Approve | POST /api/direcao/aulas/:id/approve | - | Estado → CONFIRMADA |

**Corpo do step 3 (criar pedido):**
```json
{
  "data": "{{slotData}}",
  "horainicio": "{{slotHoraInicio}}",
  "duracaoaula": 60,
  "disponibilidade_mensal_id": {{slotId}},
  "salaidsala": 1,
  "privacidade": false
}
```

---

### 📋 BPMN 2 — Remarcacao de Aula

| Passo | Request | Endpoint | Body | Notas |
|-------|---------|---------|------|-------|
| 1 | Criar PENDENTE | POST /api/encarregado/aulas | dados do pedido | Setup, guarda remarcaPedidoId |
| 2 | Sugerir data | PUT /api/aulas/:id/sugerir-nova-data | novaData, motivo | DIRECAO propõe |
| 3 | Logout | POST /api/auth/logout | - | Limpa token |
| 4 | Login PROFESSOR | POST /api/auth/login | email, password | Guarda token |
| 5 | Responder PROF | POST /api/aulas/:id/responder-professor | acao: "aceitar" | Estado → AGUARDA_EE |
| 6 | Logout | POST /api/auth/logout | - | Limpa token |
| 7 | Login ENCARREGADO | POST /api/auth/login | email, password | Guarda token |
| 8 | Responder EE | POST /api/aulas/:id/responder-encarregado | acao: "aceitar" | Data aplicada |

**Corpo do step 2 (sugerir nova data):**
```json
{
  "novaData": "2026-05-16",
  "motivo": "Professor indisponível"
}
```

**Corpo do step 5 (responder professor):**
```json
{
  "acao": "aceitar"
}
```

**Corpo do step 8 (responder encarregado):**
```json
{
  "acao": "aceitar"
}
```

---

### 📋 BPMN 3 — Aluguer de Figurino

| Passo | Request | Endpoint | Body | Notas |
|-------|---------|---------|------|-------|
| 1 | Get anuncios | GET /api/anuncios | - | Filtra APROVADO, ALUGUER |
| 2 | Criar reserva | POST /api/aluguer | anuncioId, dataInicio, dataFim, quantidade | Guarda reservaId |
| 3 | Logout | POST /api/auth/logout | - | Limpa token |
| 4 | Login DIRECAO | POST /api/auth/login | email, password | Guarda token |
| 5 | Aprovar | PUT /api/aluguer/:id/status | status: "APROVADO" | Estado → APROVADO |

**Corpo do step 2 (criar reserva):**
```json
{
  "anuncioId": {{anuncioId}},
  "dataInicio": "2026-05-01",
  "dataFim": "2026-05-07",
  "quantidade": 1
}
```

**Corpo do step 5 (aprovar reserva):**
```json
{
  "status": "APROVADO"
}
```

---

### 📋 BPMN 4 — Criar Anuncio

| Passo | Request | Endpoint | Body | Notas |
|-------|---------|---------|------|-------|
| 1 | Login ENCARREGADO | POST /api/auth/login | email, password | Guarda token |
| 2 | Get figurinos | GET /api/figurinos | - | Guarda figurinoId |
| 3 | Criar anuncio | POST /api/anuncios | figurinoId, tipoTransacao, valor, datas | Guarda novoAnuncioId |
| 4 | Logout | POST /api/auth/logout | - | Limpa token |
| 5 | Login DIRECAO | POST /api/auth/login | email, password | Guarda token |
| 6 | Approve | PUT /api/anuncios/:id/approve | - | Estado → APROVADO |

**Corpo do step 3 (criar anuncio):**
```json
{
  "figurinoidfigurino": {{figurinoId}},
  "tipotransacao": "ALUGUER",
  "valor": 15,
  "dataanuncio": "2026-05-01",
  "datainicio": "2026-05-01",
  "datafim": "2026-06-30",
  "quantidade": 1
}
```

---

## 4. Como Executar os Testes

### 4.1 Executar Fluxo Completo (BPMN 1)
1. Expandir pasta **📋 BPMN 1 - Pedido de Aula**
2. Clicar com botão direito no primeiro request
3. Selecionar **Run Collection**
4. Executar em ordem sequencial

### 4.2 Executar Todos os Fluxos
1. Clicar com botão direito na raiz da coleção
2. Selecionar **Run Ent'Artes BPMN Tests**
3. Configurar:
   - Iterations: 1
   - Delay: 500ms (entre requests)
   - Save responses: ✓

### 4.3 Executar Teste Específico
1. Expandir a pasta do módulo
2. Selecionar request individual
3. Clicar **Send**

---

## 5. Testes Incluídos (Verificações Automáticas)

Cada request inclui scripts de teste que verificam:

| Teste | O que verifica |
|-------|-----------------|
| Status 200/201 | Resposta com sucesso |
| Status 400 | Erro de validação |
| Has data array | Resposta contém array de dados |
| Token saved | JWT guardado em variável |
| ID saved | Entidade ID guardada para próximo request |

### Scripts de Teste Exemplo:

```javascript
// Teste de login com sucesso
pm.test("Login OK", () => pm.expect(pm.response.json().success).to.be.true);

// Guardar token automaticamente
pm.environment.set('authToken', pm.response.json().token);

// Guardar ID para próximo request
const json = pm.response.json();
if (json.data?.id) {
    pm.environment.set('pedidoId', json.data.id.toString());
}
```

---

## 6. Variáveis de Ambiente

O ficheiro `entartes_environment.postman_environment.json` inclui:

| Variável | Descrição |
|----------|-----------|
| `baseUrl` | http://localhost:3000 |
| `email` | Email do utilizador |
| `password` | Password |
| `authToken` | Token JWT (auto) |
| `userId` | ID do utilizador (auto) |
| `role` | Role do utilizador (auto) |
| `slotId` | ID da disponibilidade (auto) |
| `slotData` | Data do slot (auto) |
| `slotHoraInicio` | Hora inicio (auto) |
| `slotMaxDuracao` | Duração máxima (auto) |
| `pedidoId` | ID do pedido criado |
| `pendingPedidoId` | ID do pedido pendente |
| `remarcaPedidoId` | ID para remarcação |
| `anuncioId` | ID do anúncio |
| `reservaId` | ID da reserva |
| `figurinoId` | ID do figurino |
| `novoAnuncioId` | ID do novo anúncio |

---

## 7. Troubleshooting

### Erro: "Variable not defined"
**Solução**: Executar Login primeiro para guardar o token

### Erro: "Too many requests" (429)
**Solução**: Aumentar delay para 500ms ou 1000ms

### Erro: 401 Unauthorized
**Solução**: Requisitar novo token (expira em 1 hora)

### Erro: 403 Acesso Negado
**Solução**: Verificar role do utilizador logado (alguns endpoints só DIRECAO)

### Dados não encontrados
**Solução**: Executar seed primeiro: `cd backend && npm run seed`

---

## 8. Executar via Newman (CLI)

```bash
# Instalação
npm install -g newman

# Executar coleção completa
newman run Entartes_BPMN_Tests.postman_collection.json \
  -e entartes_environment.postman_environment.json

# Com relatório HTML
newman run Entartes_BPMN_Tests.postman_collection.json \
  -e entartes_environment.postman_environment.json \
  --reporters cli,html \
  --reporter-html-export report.html

# Apenas BPMN 1
newman run Entartes_BPMN_Tests.postman_collection.json \
  -e entartes_environment.postman_environment.json \
  --folder "BPMN 1 - Pedido de Aula"
```

---

## 9. Endpoints Públicos (sem auth)

| Endpoint | Método | Descrição |
|----------|--------|----------|
| /api/auth/login | POST | Login |
| /api/auth/register | POST | Registar |
| /api/auth/forgot-password | POST | Recuperar password |
| /api/public/disponibilidades | GET | Todas as disponibilidades |
| /api/public/eventos | GET | Eventos publicados |
| /api/public/modalidades | GET | Modalidades disponíveis |
| /api/contacto | POST | Formulário de contacto |

---

## 10. Notas Importantes

- Todos os endpoints `/api/*` (exceto os públicos) requerem JWT
- O header `Authorization: Bearer {{authToken}}` é adicionado automaticamente
- O header `Content-Type: application/json` é adicionado automaticamente
-Alguns IDs nas respostas são strings (não inteiros)
- O token expira em 1 hora
- Os testes guardam automaticamente IDs para usar em requests subsequentes

---

**Última Atualização:** 2026-04-28