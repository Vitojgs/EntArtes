# PLANO DE REFATORAÇÃO: Arquitetura Routes/Controllers/Services

## Data: 2026-05-06
## Backup: `backups/entartes_2026-05-06_23-28-10.zip`

---

## 1. DIAGNÓSTICO ATUAL

### Arquitetura Atual (INCORRETA)
```
Routes → Lógica Inline + Prisma → Response
        ↑ 95% dos endpoints têm lógica inline
```

### Arquitetura Correta (TARGET)
```
Routes → Controller → Service → Prisma (BD)
```

### Ficheiros com Problemas

| Ficheiro | Linhas c/ lógica inline | Severidade |
|---------|----------------------|------------|
| `aulas.routes.js` | 14 | 🔴 Alta |
| `direcao.routes.js` | 8 | 🔴 Alta |
| `turmas.routes.js` | 8 | 🔴 Alta |
| `users.routes.js` | 7 | 🟡 Média |
| `eventos.routes.js` | 5 | 🟡 Média |
| `salas.routes.js` | 5 | 🟡 Média |

---

## 2. SERVIÇOS IDENTIFICADOS (DEVEM EXISTIR)

### Serviços Atuais
- [x] `aulas.service.js` - ✅ existe
- [x] `pedidosaula.service.js` - ✅ existe
- [x] `figurinos.service.js` - ✅ existe
- [x] `anuncios.service.js` - ✅ existe
- [ ] `my-aulas.service.js` - ❌ NÃO EXISTE (precisa criar)
- [ ] `direcao-aulas.service.js` - ❌ NÃO EXISTE (precisa criar)
- [ ] `user.service.js` - ❌ NÃO EXISTE (precisa criar para lógica inline)

---

## 3. CONTROLLERS IDENTIFICADOS

### Controllers Atuais
- [x] `aulas.controller.js` - ✅ existe
- [x] `figurinos.controller.js` - ✅ existe
- [x] `anuncios.controller.js` - ✅ existe

### Controllers Necesários
- [ ] `my-aulas.controller.js` - ❌ NÃO EXISTE (precisa criar)
- [ ] `direcao-aulas.controller.js` - ❌ NÃO EXISTE (precisa criar)
- [ ] `user.controller.js` - ❌ NÃO EXISTE (precisa criar ou expandir)

---

## 4. PLANO DE REFATORAÇÃO

### FASE 1: Criar Serviços Falantes (Priority Alta)

#### 1.1 `my-aulas.service.js`
```javascript
// Novo serviço para /aulas/my
// Funções:
// - getMyAulas(userId, role)
// - getOpenAulas(role)
// - mapAulaParaResponse(pedido)
```

#### 1.2 `direcao-aulas.service.js`
```javascript
// Novo serviço para lógica de Direction em aulas
// Funções:
// - getPendingAulas()
// - approveAula(id, sala)
// - rejectAula(id, motivo)
// - remarcarAula(id, novaData)
// - getAllAulasComFiltros(filtros)
```

#### 1.3 `user.service.js` (expande users.service.js)
```javascript
// Adicionar funções:
// - getUsersComFiltros(role, modalidad)
// - getModalidades()
// - getUserById(id)
// - mapUserParaResponse(user)
```

---

### FASE 2: Criar Controllers Falantes (Priority Alta)

#### 2.1 `my-aulas.controller.js`
```javascript
// Chama my-aulas.service
export const getMyAulas = async (req, reply) => { ... }
export const getOpenAulas = async (req, reply) => { ... }
```

#### 2.2 `direcao-aulas.controller.js`
```javascript
// Chama direcao-aulas.service
export const getPendingAulas = async (req, reply) => { ... }
export const approveAula = async (req, reply) => { ... }
export const rejectAula = async (req, reply) => { ... }
export const remarcarAula = async (req, reply) => { ... }
```

#### 2.3 `user.controller.js` (expande users.controller.js)
```javascript
// Adicionar funções existentes
export const getUsers = async (req, reply) => { ... }
export const getModalidades = async (req, reply) => { ... }
```

---

### FASE 3: Atualizar Routes (Priority Alta)

#### 3.1 `aulas.routes.js`
```javascript
// ANTES (incorreto):
fastify.get("/my", async (req, reply) => {
  const pedidos = await prisma.pedidodeaula.findMany(...); // ❌ Inline!
  const data = filtered.map(p => ({ ... })); // ❌ Mapeamento inline!
  return reply.send({ success: true, data });
});

// DEPOIS (correto):
fastify.get("/my", myAulasController.getMyAulas);
```

#### 3.2 `direcao.routes.js`
```javascript
// ANTES (incorreto):
fastify.get("/aulas/pending", async (req, reply) => {
  const pending = await prisma.pedidodeaula.findMany(...); // ❌ Inline!
  return reply.send({ success: true, data: pending });
});

// DEPOIS (correto):
fastify.get("/aulas/pending", direcaoAulasController.getPendingAulas);
```

#### 3.3 `users.routes.js`
```javascript
// ANTES (incorreto):
fastify.get("/modalidades", async (req, reply) => {
  const mods = await prisma.modalidade.findMany(...); // ❌ Inline!
  return reply.send({ success: true, data: mods });
});

// DEPOIS (correto):
fastify.get("/modalidades", userController.getModalidades);
```

---

## 5. IMPLEMENTAÇÃO DETALHADA

### Passo 1: Criar `my-aulas.service.js`
**Ficheiro**: `backend/src/services/my-aulas.service.js`
**Funções**:
- `getMyAulas(userId, role)` → retorna aulas filtradas por role
- `getOpenAulas()` → retorna aulas abertas para inscrição

### Passo 2: Criar `my-aulas.controller.js`
**Ficheiro**: `backend/src/controllers/my-aulas.controller.js`
**Funções**:
- Extrai `req.user.id` e `req.user.role`
- Chama service
- Retorna resposta

### Passo 3: Atualizar `aulas.routes.js`
- Substituir lógica inline por chamada a controller
- Remover imports desnecessários de PrismaClient (se não forem mais necessários)

### Passo 4: Criar `direcao-aulas.service.js`
**Ficheiro**: `backend/src/services/direcao-aulas.service.js`
**Funções**:
- `getPendingAulas()`
- `approveAula(id, salaId, userId)`
- `rejectAula(id, motivo, userId)`
- `remarcarAula(id, novaData, hora, userId)`

### Passo 5: Criar `direcao-aulas.controller.js`
**Ficheiro**: `backend/src/controllers/direcao-aulas.controller.js`

### Passo 6: Atualizar `direcao.routes.js`
- Extrair lógica inline para controller

### Repetir para outros routes...

---

## 6. TESTES

### Testes unitários a criar:
1. `my-aulas.service.test.js`
2. `direcao-aulas.service.test.js`

### Testes de integração:
- Manter testes E2E existentes
- Adicionar testes para novos endpoints

---

## 7. CRITÉRIOS DE SUCESSO

- [ ] Todas as routes chamam controllers (não têm lógica inline)
- [ ] Todos os controllers chamam services
- [ ] Todos os services contêm lógica de negócio + acesso BD
- [ ] Testes E2E continuam a passar
- [ ] API continua a funcionar exatamente como antes

---

## 8. RISCOS E MITIGAÇÃO

| Risco | Mitigação |
|-------|--------|
| Quebrar API | Testar cada endpoint após refatoração |
| Perder lógica | Manter mapeamentos idênticos |
| Regressão | Correr testes E2E antes de commit |

---

## 9. ORDEM DE IMPLEMENTAÇÃO RECOMENDADA

1. `my-aulas` (mais crítico - usado frequentemente)
2. `direcao-aulas` (usado por Direction)
3. `turmas` (usado em turmas)
4. `users` (modalidades)
5. `eventos`
6. `salas`

---

**Próximo Passo**: Iniciar implementação da Fase 1