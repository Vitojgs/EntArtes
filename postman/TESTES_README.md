# Testes Postman - EntArtes BPMN01

Este documento explica como executar os testes de API usando Postman ou Newman.

## Pré-requisitos

- Node.js 18+ instalado
- Backend a correr em `http://localhost:3000`
- Base de dados com dados de seed

## Credenciais de Teste

| Role | Email | Password |
|------|-------|----------|
| Direção | direcao@entartes.pt | password123 |
| Professor | joao.santos@entartes.pt | password123 |
| Encarregado | pedro.oliveira@email.pt | password123 |

---

## Ficheiros Disponíveis

### 1. Testes Unitários (24 testes)
- `postman/EntArtes_BPMN1_Unitarios.postman_collection.json`
- `postman/EntArtes_BPMN1_Unitarios_Environment.json`

### 2. Testes E2E (29 testes)
- `postman/EntArtes_BPMN1_E2E_Full.postman_collection.json`
- `postman/EntArtes_BPMN1_E2E_Environment.json`

---

## Executar com Postman (Aplicação Desktop)

### Importar Environment

1. Abrir Postman
2. Clicar em **Import**
3. Selecionar o ficheiro `*_Environment.json`
4. Clicar em **Import**

### Importar Coleção

1. Clicar em **Import**
2. Selecionar o ficheiro `*_postman_collection.json`
3. Clicar em **Import**

### Executar Testes

1. No painel esquerdo, selecionar a coleção
2. Clicar no botão **Run**
3. Selecionar o environment correto no dropdown
4. Clicar em **Run**

---

## Executar com Newman (Linha de Comandos)

### Instalar Newman (se necessário)

```bash
npm install -g newman
```

### Executar Testes Unitários

```bash
cd postman
newman run EntArtes_BPMN1_Unitarios.postman_collection.json -e EntArtes_BPMN1_Unitarios_Environment.json
```

### Executar Testes E2E

```bash
cd postman
newman run EntArtes_BPMN1_E2E_Full.postman_collection.json -e EntArtes_BPMN1_E2E_Environment.json
```

### Opções Úteis

```bash
# Ver output detalhado
newman run <coleção> -e <env> --verbose

# Exportar relatório HTML
newman run <coleção> -e <env> -h relatorio.html

# Executar apenas uma pasta (section)
newman run <coleção> -e <env> --folder "1. Login válido"

# Iterações
newman run <coleção> -e <env> -n 3
```

---

## Estrutura dos Testes

### Testes Unitários

| Secção | Descrição |
|--------|-----------|
| 1. Login válido | Login com 3 roles diferentes |
| 2. Login inválido | Senha errada, email inexistente, campos em falta |
| 3. Public | Disponibilidades públicas (sem auth) |
| 4. Acesso Negado | Sem token, token inválido |
| 5. BPMN01 - Fluxo Completo | Criar pedido, aprovar, rejeitar, validações |

### Testes E2E

| Fase | Descrição |
|------|-----------|
| FASE 1 | Professor cria disponibilidade |
| FASE 2 | Encarregado marca aula |
| FASE 3 | Direção aprova/rejeita |
| FASE 4 | Verificar visibilidade por role |
| FASE 5 | Professor marca aula como realizada |
| FASE 6 | Verificação final |

---

## Resolução de Problemas

### "Token inválido" (401)

- Os tokens são guardados em variáveis de environment
- Cada login guarda o token na variável correta (`authToken`, `eeToken`, etc.)
- Os requests seguintes devem usar o token correto

### "Connection refused"

- Verificar que o backend está a correr: `curl http://localhost:3000/api/public/disponibilidades`

### Testes falham com 400

- Verificar que a base de dados tem dados de seed
- Alguns testes dependem de estados específicos (ex: pedido criado anteriormente)

---

## Notas

- Os testes unitários são independentes e podem ser executados em qualquer ordem
- Os testes E2E dependem da ordem - executam o fluxo completo
- O Newman é mais consistente que o Postman app para execução automática