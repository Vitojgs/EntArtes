# Guia de Criação de Testes - Postman / Newman

## 1. Introdução

Este documento explica como foram criados os testes de API para o projeto Ent'Artes utilizando **Postman** e **Newman**.

---

## 2. Ferramentas

### 2.1 Postman

**O que é:**  
Postman é uma plataforma colaborativa para desenvolvimento de APIs. Permite criar, testar e documentar APIs REST.

**Versão:** Aplicação Desktop / Web (https://postman.com)

**Instalação:**
- Desktop: https://www.postman.com/downloads/
- Ou usar diretamente no navegador (web)

### 2.2 Newman

**O que é:**  
Newman é a ferramenta de linha de comando do Postman. Permite executar coleções diretamente no terminal.

**Instalação:**
```bash
npm install -g newman
```

**Dependência adicional (para relatórios HTML):**
```bash
npm install -g newman-reporter-html
```

---

## 3. Estrutura das Coleções

### 3.1 Ficheiros Criados

```
postman/
├── EntArtes_BPMN_Marcacao_Aula.json       # Coleção principal (35+ testes)
├── EntArtes_BPMN1_Unitarios.postman_collection.json   # Testes unitários (24 testes)
├── EntArtes_BPMN1_E2E_Full.postman_collection.json     # Testes E2E (29 testes)
├── EntArtes_Environment.json               # Environment padrão
├── EntArtes_BPMN1_Unitarios_Environment.json          # Environment unitários
├── EntArtes_BPMN1_E2E_Environment.json                 # Environment E2E
└── TABELA_TESTES_RESUMO.md              # Resumo para defesa
```

### 3.2 Coleções por Tipo

| Coleção | Testes | Descrição |
|---------|--------|-----------|
| `EntArtes_BPMN_Marcacao_Aula.json` | 35+ | Testes completos de marcação de aula |
| `EntArtes_BPMN1_Unitarios.postman_collection.json` | 24 | Testes unitários (login, auth) |
| `EntArtes_BPMN1_E2E_Full.postman_collection.json` | 29 | Testes E2E (fluxo completo) |

---

## 4. Estrutura de um Teste Postman

### 4.1 Componentes Principais

```json
{
  "info": {
    "name": "Nome da Coleção",
    "description": "Descrição",
    "schema": "https://schema.getpostman.com/json/collection/v2.1.0/collection.json"
  },
  "item": [
    {
      "name": "Nome do Request/Teste",
      "request": {
        "method": "GET|POST|PUT|DELETE",
        "url": "http://localhost:3000/api/...",
        "header": [...],
        "body": {...}
      },
      "event": [
        {
          "listen": "test",
          "script": {
            "exec": [
              "// Código do teste"
            ]
          }
        }
      ]
    }
  ]
}
```

### 4.2 Estrutura de um Teste

Cada request pode ter dois tipos de scripts:

1. **Pre-request Script** - Executa antes do request
2. **Test Script** - Executa após receber a resposta

**Exemplo de Test Script:**

```javascript
// Verificar status code
pm.test("Status code é 200", function () {
    pm.response.to.have.status(200);
});

// Verificar resposta JSON
pm.test("Retorna lista de pedidos", function () {
    var jsonData = pm.response.json();
    pm.expect(jsonData.success).to.eql(true);
});

// Verificar campo específico
pm.test("Token presente na resposta", function () {
    var jsonData = pm.response.json();
    pm.expect(jsonData).to.have.property('token');
});
```

---

## 5. Tipos de Testes Criados

### 5.1 Testes de Autenticação

```javascript
// Teste de login válido
pm.test("Login com sucesso - Direção", function () {
    pm.response.to.have.status(200);
    var jsonData = pm.response.json();
    pm.expect(jsonData.success).to.eql(true);
    pm.expect(jsonData.token).to.not.be.null;
});

// Teste de login inválido (senha errada)
pm.test("Login falha com senha errada", function () {
    pm.response.to.have.status(401);
});
```

### 5.2 Testes de Validação de Entrada

```javascript
// Teste de email inválido
pm.test("Rejeita email inválido", function () {
    pm.response.to.have.status(400);
    var jsonData = pm.response.json();
    pm.expect(jsonData.error).to.include('email');
});

// Teste de campos obrigatórios
pm.test("Rejeita pedido sem campos obrigatórios", function () {
    pm.response.to.have.status(400);
});
```

### 5.3 Testes de Fluxo BPMN01

```javascript
// 1. Login como ENCARREGADO
pm.test("1. Login EE bem-sucedido", function () {
    pm.response.to.have.status(200);
    pm.expect(pm.response.json().token).to.not.be.undefined;
});

// 2. Criar pedido
pm.test("2. Criar pedido com dados válidos", function () {
    pm.response.to.have.status(201);
    pm.expect(pm.response.json().success).to.eql(true);
});

// 3. Login como DIREÇÃO
pm.test("3. Login Direção bem-sucedido", function () {
    pm.response.to.have.status(200);
});

// 4. Aprovar pedido
pm.test("4. Aprovar pedido", function () {
    pm.response.to.have.status(200);
});
```

### 5.4 Testes de Segurança

```javascript
// Teste sem token
pm.test("Rejeita pedido sem token", function () {
    pm.response.to.have.status(401);
});

// Teste com token inválido
pm.test("Rejeita token inválido", function () {
    pm.response.to.have.status(401);
});
```

---

## 6. Variáveis de Ambiente

### 6.1 Estrutura do Environment

```json
{
  "id": "environment-id",
  "name": "EntArtes Dev",
  "values": [
    {
      "key": "baseUrl",
      "value": "http://localhost:3000",
      "enabled": true
    },
    {
      "key": "authToken",
      "value": "",
      "enabled": true
    },
    {
      "key": "direcaoToken",
      "value": "",
      "enabled": true
    },
    {
      "key": "professorToken",
      "value": "",
      "enabled": true
    }
  ]
}
```

### 6.2 Como Usar Variáveis

```javascript
// No URL
{{baseUrl}}/api/aulas

// No header
Authorization: Bearer {{authToken}}

// No script
var token = pm.variables.get("authToken");
```

### 6.3 Automações com Variáveis

```javascript
// Guardar token após login
var jsonData = pm.response.json();
if (pm.response.status === "OK" && jsonData.token) {
    pm.variables.set("authToken", jsonData.token);
}

// Guardar ID do pedido criado
var jsonData = pm.response.json();
if (jsonData.success && jsonData.data) {
    pm.variables.set("pedidoId", jsonData.data.idpedidoaula);
}
```

---

## 7. Criar Novos Testes no Postman

### 7.1 Criar Nova Coleção

1. Abrir Postman
2. Clicar em "Collections" → "Create Collection"
3. Nomear a coleção
4. Adicionar requests

### 7.2 Adicionar Request

1. Clicar em "Add Request"
2. Selecionar método (GET, POST, etc.)
3. Inserir URL
4. Adicionar headers, body, etc.

### 7.3 Adicionar Testes

1. Clicar na aba "Tests"
2. Escrever código JavaScript
3. Usar biblioteca pm (Postman)

**Template:**

```javascript
// Descrição do teste
pm.test("Nome do teste", function () {
    // Código de verificação
    pm.expect(...).to.eql(...);
});
```

### 7.4 Exemplo Completo

```
Request: POST /api/auth/login
Body: {"email": "teste@teste.pt", "password": "123"}

Test Script:
---
pm.test("Login bem-sucedido", function () {
    pm.response.to.have.status(200);
    var jsonData = pm.response.json();
    pm.expect(jsonData.success).to.eql(true);
    pm.expect(jsonData.token).to.not.be.undefined;
});

pm.test("Retorna dados do utilizador", function () {
    var jsonData = pm.response.json();
    pm.expect(jsonData.user).to.have.property('nome');
    pm.expect(jsonData.user).to.have.property('email');
});
```

---

## 8. Executar Testes

### 8.1 Postman (GUI)

1. Abrir coleção no Postman
2. Clicar em "Run"
3. Selecionar Environment
4. Clicar "Run [Nome da Coleção]"

### 8.2 Newman (CLI)

```bash
# Testes principais
newman run EntArtes_BPMN_Marcacao_Aula.json -e EntArtes_Environment.json

# Testes unitários
newman run EntArtes_BPMN1_Unitarios.postman_collection.json -e EntArtes_BPMN1_Unitarios_Environment.json

# Testes E2E
newman run EntArtes_BPMN1_E2E_Full.postman_collection.json -e EntArtes_BPMN1_E2E_Environment.json
```

### 8.3 Opções Úteis

```bash
# Com relatório HTML
newman run kolecao.json -e environment.json --reporters cli,html --html-reporter-export report.html

# Com relatório JSON
newman run kolecao.json -e environment.json --reporters cli,json --json-reporter-export report.json

# Iterações (executar N vezes)
newman run kolecao.json -e environment.json -n 5

# Parar no primeiro erro
newman run kolecao.json -e environment.json --bail

# Verbose
newman run kolecao.json -e environment.json --verbose
```

---

## 9. Casos de Teste para BPMN01 (Marcação de Aula)

### 9.1 Autenticação

| ID | Teste | Endpoint | Expected |
|----|-------|----------|----------|
| AUTH-01 | Login válido - Direção | POST /api/auth/login | 200 + token |
| AUTH-02 | Login válido - Professor | POST /api/auth/login | 200 + token |
| AUTH-03 | Login válido - Encarregado | POST /api/auth/login | 200 + token |
| AUTH-04 | Login senha errada | POST /api/auth/login | 401 |
| AUTH-05 | Login email inexistente | POST /api/auth/login | 401 |

### 9.2 Criação de Pedido

| ID | Teste | Endpoint | Expected |
|----|-------|----------|----------|
| BPMN1-01 | Criar pedido válido | POST /api/encarregado/aulas | 201 |
| BPMN1-02 | Criar pedido data passada | POST /api/encarregado/aulas | 400 |
| BPMN1-03 | Criar pedido sem campos | POST /api/encarregado/aulas | 400 |
| BPMN1-04 | Criar pedido sem availability | POST /api/encarregado/aulas | 400 |

### 9.3 Aprovação/Rejeição

| ID | Teste | Endpoint | Expected |
|----|-------|----------|----------|
| BPMN1-05 | Direção lista pendentes | GET /api/direcao/aulas/pending | 200 |
| BPMN1-06 | Direção aprova pedido | POST /api/direcao/aulas/:id/approve | 200 |
| BPMN1-07 | Direção rejeita pedido | POST /api/direcao/aulas/:id/reject | 200 |
| BPMN1-08 | Professor lista aulas | GET /api/professor/aulas | 200 |

### 9.4 Segurança

| ID | Teste | Expected |
|----|-------|----------|
| SEC-01 | Request sem token | 401 |
| SEC-02 | Request token inválido | 401 |
| SEC-03 | EE tenta Approve (só Direção) | 403 |

---

## 10. Boas Práticas

### 10.1 Organização

- Nomear requests de forma descritiva
- Usar pastas para agrupar requests relacionados
- Documentar cada teste com `pm.test("descrição", ...)`

### 10.2 Variáveis

- Usar nomes claros para variáveis
- Inicializar variáveis no environment
- Limpar variáveis entre testes se necessário

### 10.3 Testes

- Testar happy path e casos de erro
- Verificar status code e corpo da resposta
- Usar assertions significativas

### 10.4 Dados de Teste

- Usar dados realistas
- Evitar dados hardcoded nos scripts
- Preferir environment variables

---

## 11. Perguntas Frequentes na Defesa

### P: O que é Postman e Newman?

**R:**  
- **Postman** é uma ferramenta GUI (interface gráfica) para testar APIs REST. Permite criar requests, organizar em coleções e adicionar testes automatizados.
- **Newman** é a versão de linha de comando do Postman. Permite executar as mesmas coleções diretamente no terminal, útil para CI/CD.

### P: Qual a diferença entre Postman/Newman e Vitest?

**R:**
- **Vitest** testa o código JavaScript/TypeScript internamente (lógica de negócio, funções, serviços)
- **Postman/Newman** testa a **API** (endpoints REST), verificando que a comunicação entre cliente e servidor funciona corretamente

São complementares: Vitest testa o Backend internamente, Postman testa a API como um todo.

### P: Como garantem a qualidade dos testes API?

**R:**
1. **Diversidade**: Testes de autenticação, validação, fluxos BPMN, segurança
2. **Cobertura**: 35+ testes na coleção principal, 24 unitários, 29 E2E
3. **Automação**: Executados via Newman em pipeline
4. **Validação bidirecional**: Vitest (backend) + Postman (API)

### P: O que são testes E2E no Postman?

**R:** Testes End-to-End que simulam o fluxo completo de uma funcionalidade:
1. Login → 2. Criar pedido → 3. Logout → 4. Login direção → 5. Aprovar pedido

Cada request depende do resultado do anterior (tokens, IDs).

### P: Como lidam com autenticação nos testes?

**R:**
1. O primeiro request faz login e guarda o token numa variável
2. Requests seguintes usam `{{authToken}}` no header
3. O Pre-request script pode automaticamente adicionar o token

### P: O que são Environments?

**R:** Environments são conjuntos de variáveis que permitem mudar a configuração sem alterar os testes:
- Development: http://localhost:3000
- Production: https://api.entartes.pt

Cada coleção pode usar um environment diferente.

---

## 12. Estatísticas

| Coleção | Testes | Tipo |
|---------|--------|------|
| BPMN Marcação Aula | 35+ | Completo |
| Unitários | 24 | Login + Auth |
| E2E | 29 | Fluxo Completo |
| **Total** | **88+** | - |

---

## 13. Executar Todos os Testes

```bash
# Todos os testes Postman
cd postman
newman run EntArtes_BPMN_Marcacao_Aula.json -e EntArtes_Environment.json

# Unitários
newman run EntArtes_BPMN1_Unitarios.postman_collection.json -e EntArtes_BPMN1_Unitarios_Environment.json

# E2E
newman run EntArtes_BPMN1_E2E_Full.postman_collection.json -e EntArtes_BPMN1_E2E_Environment.json
```

---

## 14. Conclusão

Os testes API com Postman/Newman complementam os testes Vitest:

| Aspecto | Vitest | Postman/Newman |
|--------|--------|----------------|
| **O que testa** | Código interno | Endpoints API |
| **Nível** | Unitário + Integração | Integração + E2E |
| **Ferramenta** | Vitest (Node.js) | Postman (GUI) + Newman (CLI) |
| **Total testes** | 153 | 88+ |

Juntos garantem que o sistema funciona tanto internamente (lógica) quanto externamente (API).