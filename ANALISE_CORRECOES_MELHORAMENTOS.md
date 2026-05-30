# Analise de Correcoes e Melhoramentos Possiveis

Data: 2026-05-29

Este documento resume correcoes e melhorias identificadas apos leitura do projeto, backend, frontend, BD, `.sisyphus`, `EntArtes_DOCS` e `Planeamento`.

## Prioridade Alta

### 1. Segredo JWT exposto

**Estado:** correcao necessaria.

Foram encontrados ficheiros com `JWT_SECRET` em texto claro:

- `.sisyphus/render-env.md`
- `EntArtes_DOCS/render-env.md`

**Risco:** se este segredo foi usado em producao, qualquer token JWT assinado com ele deve ser considerado potencialmente comprometido.

**Correcao recomendada:**

- Rodar o `JWT_SECRET` no Render.
- Remover estes ficheiros ou substituir o valor por placeholder.
- Rever historico Git se estes ficheiros foram commitados.
- Invalidar sessoes ativas, se necessario, incrementando `tokenVersion` dos utilizadores.

### 2. RBAC nas rotas de Direcao

**Estado:** melhoria/correcao de seguranca.

O backend ja tem `verifyToken` e `authorizeRole`, mas algumas rotas de direcao autenticam sem aplicar autorizacao explicita no ficheiro de rotas.

Exemplo atual:

```js
fastify.addHook("onRequest", async (req, reply) => {
  return verifyToken(req, reply);
});
```

Isto valida login, mas nao garante no router que o utilizador tem role `DIRECAO`.

**Correcao recomendada:**

- Aplicar `authorizeRole("DIRECAO")` em `/api/direcao/*`.
- Garantir protecao explicita em aprovar/rejeitar/cancelar coachings, ocupacao de salas e relatorios.
- Adicionar testes API para confirmar que `ALUNO`, `ENCARREGADO` e `PROFESSOR` recebem `403`.

### 3. Validacao do `X-Active-Role`

**Estado:** melhoria de seguranca.

O frontend envia `X-Active-Role`, e o backend usa esse valor para definir `req.user.role`. Antes de aceitar esse papel ativo, o backend deve validar que ele pertence a `availableRoles`.

**Correcao recomendada:**

```js
const activeRole = activeRoleHeader.toUpperCase();
const allowedRoles = req.user.availableRoles.map(r => r.toUpperCase());

if (!allowedRoles.includes(activeRole)) {
  return reply.status(403).send({ error: "Role ativa invalida" });
}

req.user.role = activeRole;
req.user.normalizedRoles = [activeRole];
```

### 4. Consistencia de `minutos_ocupados`

**Estado:** correcao de logica existente.

A BD e os servicos ja suportam `disponibilidade_mensal.minutos_ocupados`, mas a documentacao aponta riscos em cancelamentos, remarcacoes e coachings partilhados.

**Problema:** um slot pode continuar a parecer ocupado depois de uma aula ser cancelada/remarcada, causando conflitos falsos ou desaparecimento de disponibilidades.

**Correcao recomendada:**

- Centralizar a atualizacao de ocupacao num helper/service.
- Incrementar apenas quando uma aula/pedido passa a ocupar efetivamente o slot.
- Decrementar quando uma aula e cancelada ou removida do slot.
- Em remarcacao aceite, libertar o slot antigo e ocupar o novo.
- Em coaching partilhado, adicionar participantes nao deve duplicar minutos ocupados.
- Nunca permitir `minutos_ocupados < 0`.

Fluxos a testar:

- aprovar coaching incrementa minutos;
- cancelar coaching decrementa minutos;
- remarcacao move minutos do slot A para o slot B;
- cancelar participacao do ultimo aluno liberta slot;
- participar em coaching partilhado nao incrementa minutos.

## Prioridade Media

### 5. Testes backend desatualizados

**Estado:** correcao necessaria para confiabilidade.

A execucao local dos testes unitarios falhou. Foram encontrados:

- imports para ficheiros antigos/inexistentes, como `pedidosaula.service.js`;
- mocks Prisma incompletos;
- expectativas antigas para notificacoes e formatos;
- divergencias entre testes e logica atual.

**Correcao recomendada:**

- Atualizar nomes antigos `aulas`/`pedidosaula` para `coaching`/`pedidocoaching`, quando aplicavel.
- Corrigir mocks Prisma de `users.service`, `anuncios.service`, `professor.service`, `notificacoes.service`.
- Separar testes historicos dos testes atuais.
- Criar uma suite minima verde antes de voltar a expandir cobertura.

### 6. Typecheck frontend

**Estado:** correcao recomendada.

O build Vite passa, mas a documentacao indica falhas em `tsc`. Isto pode esconder erros de contrato entre frontend e backend.

**Correcao recomendada:**

- Executar `npx tsc -b --noEmit`.
- Corrigir tipos em `api.ts`, `types/index.ts` e paginas com payloads divergentes.
- Adicionar script `typecheck` ao `frontend/package.json`.

### 7. Rotas e documentacao desatualizadas

**Estado:** limpeza necessaria.

Varias docs e colecoes Postman ainda referem:

- `/api/aulas`
- `/api/direcao/aulas`
- `aulas.routes.js`
- `pedidosaula.service.js`

O codigo atual usa maioritariamente:

- `/api/coaching`
- `/api/direcao/coaching`
- `pedidocoaching`
- rotas por role (`encarregado`, `professor`, `professor-coaching`)

**Melhoria recomendada:**

- Criar uma tabela oficial de endpoints atuais.
- Atualizar Postman/Newman.
- Marcar documentos historicos como historicos.
- Manter apenas um guia de testes atual.

### 8. Fastify response schemas

**Estado:** melhoria/correcao.

Alguns schemas usam `data: { type: "object" }`. Em Fastify, isto pode serializar respostas como `data: {}` se nao forem permitidas propriedades adicionais.

**Correcao recomendada:**

```js
data: {
  type: "object",
  additionalProperties: true
}
```

Ou definir schemas completos para respostas mais importantes.

## Prioridade Baixa / Melhorias

### 9. Code splitting no frontend

**Estado:** melhoria de performance.

O build do frontend passa, mas o bundle principal fica grande.

**Melhoria recomendada:**

- Usar `React.lazy` e `Suspense` por pagina/rota.
- Separar paginas pesadas como `Dashboard`, `Marketplace`, `Stock`, `Coaching`.
- Avaliar chunks manuais no Vite se necessario.

### 10. Design system e UI consistente

**Estado:** melhoria de manutencao.

A documentacao em `.sisyphus/plans/reorganizacao-frontend.md` aponta duplicacao de estilos, badges, botoes, estados vazios e loading.

**Melhoria recomendada:**

- Criar componentes reutilizaveis: `Button`, `Badge`, `PageHeader`, `EmptyState`, `LoadingState`, `ErrorState`.
- Trocar hex hardcoded por tokens.
- Normalizar estados visuais de coachings, anuncios, reservas e figurinos.

### 11. Estado de erro/loading no frontend

**Estado:** melhoria de UX.

Algumas paginas tratam erros apenas com `console.error`.

**Melhoria recomendada:**

- Mostrar erro visivel ao utilizador.
- Usar `sonner` de forma consistente.
- Adicionar estados vazios e loading padronizados.

### 12. Base de dados de teste isolada

**Estado:** melhoria de engenharia.

Testes de integracao e E2E dependem de PostgreSQL local e seed. O ideal e nao usar a mesma BD de desenvolvimento.

**Melhoria recomendada:**

- Criar `entartes_test`.
- Usar `DATABASE_URL_TEST`.
- Resetar dados antes de suites E2E/API.
- Evitar testes dependentes de IDs fixos.

## Decisoes Tecnicas Recomendadas

### Partilha de coachings

A opcao mais segura continua a ser manter o slot intacto e usar:

- `pedidodeaula.maxparticipantes`
- `alunopedidoaula`
- contagem real de participantes

Evitar split complexo de slots, porque aumenta risco de inconsistencias, rollback dificil e queries mais complexas.

### Roles

Manter multi-role, mas garantir que:

- `availableRoles` vem do backend;
- `activeRole` e apenas uma escolha dentro de `availableRoles`;
- autorizacao sensivel e sempre feita no backend, nunca apenas no frontend.

## Plano Sugerido de Execucao

1. Rodar/remover `JWT_SECRET` exposto.
2. Corrigir `X-Active-Role` e aplicar `authorizeRole` nas rotas de direcao.
3. Criar testes API de autorizacao para rotas sensiveis.
4. Corrigir consistencia de `minutos_ocupados`.
5. Atualizar testes unitarios backend ate ficarem verdes.
6. Corrigir typecheck frontend.
7. Atualizar documentacao/Postman para endpoints atuais.
8. Fazer code splitting e limpeza de design system.

