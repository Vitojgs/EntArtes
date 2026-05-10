# Pendentes & Possíveis Melhorias

**Criado:** 2026-05-09
**Contexto:** Verificação do sistema multi-role + token invalidation por @Sisyphus

---

## 🐞 Bugs Confirmados

### BUG-01: `rolesChanged` em `updateUser` não parseia JSON array da BD

**Ficheiro:** `backend/src/services/users.service.js` (L229-233)

**Problema:** Quando um utilizador multi-role tem a role guardada como `'["DIRECAO","PROFESSOR"]'` no campo `role` da BD (string JSON), a comparação `rolesChanged` trata isso como uma única string em vez de fazer parse para array.

```javascript
// existingUser.role = '["DIRECAO","PROFESSOR"]' (string raw da BD, via Prisma)
const existingRoleStr = existingUser.role?.toLowerCase();  // => '["direcao","professor"]'
const existingRoleArray = [existingRoleStr];               // => ['["direcao","professor"]'] ❌
// vs o novo role (ex: ["PROFESSOR"]) que dá ["professor"]
// roleArray.length === existingRoleArray.length → 1 === 1 → rolesChanged = false ❗
```

**Impacto:** Se um admin REMOVER uma role de um utilizador multi-role (ex: remover DIRECAO, ficando só PROFESSOR), o `tokenVersion` NÃO incrementa. O token antigo com a role removida continua válido por até 1h (expiração do JWT).

**Correção sugerida:** Fazer parse do JSON array da BD antes de comparar:
```javascript
const parseExistingRoles = (role) => {
  if (!role) return [];
  try {
    const parsed = JSON.parse(role);
    if (Array.isArray(parsed)) return parsed.map(r => r.toLowerCase());
  } catch (_) {}
  return [role.toLowerCase()];
};
```

---

### BUG-02: Login retorna `alunosIds: []` vazio mesmo para ENCARREGADO

**Ficheiro:** `backend/src/services/auth.service.js` (L119)

**Problema:** No login (`auth.service.js` L119), o campo `alunosIds` é sempre `[]`. O encarregado que já tem alunos associados na BD não recebe essa informação no login — o frontend depois fica sem saber que alunos o encarregado tem.

**Correção sugerida:** Se o utilizador for ENCARREGADO, fazer query dos alunos e preencher `alunosIds`. Exemplo do `getAllUsers()` em `users.service.js` (L28-41) já faz isto.

---

## ⚠️ Gaps / Melhorias

### GAP-01: Frontend sem interceptor global de 401 (logout automático)

**Ficheiro:** `frontend/src/services/api.ts` (L43-46)

**Problema:** Quando o backend rejeita um request com 401 (token expirado, revogado, ou utilizador desativado), o `api.ts` apenas lança um erro. Não faz logout automático do utilizador nem redireciona para o login. O utilizador continua a ver a página como se estivesse autenticado até fazer refresh.

**Correção sugerida:** Adicionar interceptor no método `request()` que deteta 401 e faz logout + redireciona para `/login`:
```javascript
if (response.status === 401) {
  localStorage.removeItem('authToken');
  localStorage.removeItem('currentUser');
  localStorage.removeItem('activeRole');
  window.location.href = '/login';
  throw new Error('Sessão expirada');
}
```

---

### GAP-02: `validateToken()` não retorna `tokenVersion`

**Ficheiro:** `backend/src/services/auth.service.js` (L131-175)

**Problema:** A função `validateToken()` verifica corretamente o `tokenVersion` mas o objeto retornado (L165-171) não inclui o `tokenVersion` atualizado. Isto significa que se o frontend usar `validateToken` para renovar a sessão, o novo `tokenVersion` nunca é atualizado no JWT (o token antigo continua a ser usado).

**Correção sugerida:** Se o `tokenVersion` mudou, devolver um novo token com o `tokenVersion` atualizado (ou forçar re-login).

---

### GAP-03: Sem endpoint para revalidar token/sessão

Não existe um endpoint tipo `GET /api/auth/me` ou `POST /api/auth/refresh-token` que o frontend possa usar para verificar periodicamente se o token ainda é válido. O `validateToken` existe como função, mas não está exposto como rota.

**Correção sugerida:** Expor `validateToken` como rota protegida `GET /api/auth/me` para o frontend verificar a sessão ao carregar a página.

---

### GAP-04: `GET /api/users/:id` retorna `data: {}` vazio

**Ficheiro:** `backend/src/routes/users.routes.js` (possivelmente schema OpenAPI)

**Problema:** O schema de response do Fastify para `GET /api/users/:id` define `data: { type: "object" }` sem `additionalProperties`, e o serializer do Fastify strip todos os campos do objeto. O endpoint devolve `{"success":true,"data":{}}`.

**Impacto:** A página de perfil/detalhes de utilizador não funciona.

**Correção sugerida:** Adicionar `additionalProperties: true` ao schema OpenAPI da response ou usar um schema com as propriedades explícitas.

---

### GAP-05: Permitir definir `tokenVersion` na criação de utilizador

Atualmente `tokenVersion` começa sempre em `1` (default do schema). Se um utilizador for criado e depois precisar de ser imediatamente invalidado (ex: admin cria e depois apaga), funciona bem. Mas se houver necessidade de criar utilizadores com `tokenVersion` específico (ex: migração), não há suporte.

**Relevância:** Muito baixa. Apenas em cenários de migração de dados.

---

## 🔮 Possíveis Implementações Futuras

### FUT-01: Refresh Token flow
Implementar refresh tokens com `tokenVersion` duplo (access + refresh). O access token expira em 15min, o refresh token em 7d. Quando o `tokenVersion` incrementa, ambos são invalidados.

### FUT-02: Auditoria de tentativas de uso de token revogado
Sempre que o middleware rejeita um token por `tokenVersion` mismatch, registar em audit log com IP, user-agent, etc. Útil para detetar tokens roubados.

### FUT-03: Notificar utilizador quando é desativado
Se um admin desativa um utilizador, o `tokenVersion` incrementa. Mas o utilizador só descobre quando tenta fazer um request e recebe 401. Podia haver uma notificação na BD antes de desativar.

### FUT-04: Forçar re-login ao mudar de role no frontend
Quando o utilizador muda de role no switcher, o activeRole muda mas o token JWT mantém as roles originais. O middleware já lida com isto via `X-Active-Role`, mas forçar re-login ao trocar de role seria mais seguro (embora menos prático).

### FUT-05: Testes unitários para `tokenVersion`
Adicionar testes:
- `deleteUser` incrementa `tokenVersion`
- `updateUser({ estado: false })` incrementa
- `updateUser` com role change incrementa
- Middleware rejeita token com `tokenVersion` desatualizado
- Utilizador inativo é rejeitado mesmo com token válido
