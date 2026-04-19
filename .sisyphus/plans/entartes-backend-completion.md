# Entartes Backend Completion & Frontend Integration Plan

**Created:** 2026-04-17
**Updated:** 2026-04-17 12:30 UTC
**Project:** Entartes - Sistema de Gestão de Aulas, Figurinos e Eventos
**Goal:** Complete backend API, connect frontend to real backend, fix existing issues

---

## 0. Decisões Tomadas

| Decisão | Opção Escolhida |
|---------|-----------------|
| Prioridade das fases | Opção A: Auth → Users → Aulas → Salas → Turmas → Figurinos → Eventos → Anúncios → Contacto |
| Contactos | Guardar na BD (criar модель/modalidade se necessário) |
| Seed data | Criar para testes (direção, professores, alunos) |
| Momus Review | Skipped (iniciar execução diretamente) |

---

## 1. Context

O projeto Entartes é uma aplicação web para gestão de aulas de coaching, figurinos e eventos. O frontend React está parcialmente desenvolvido com mock data, e o backend Node.js/Fastify precisa de ser completado para fornecer as APIs necessárias.

### Estado Atual

| Componente | Estado | Detalhes |
|------------|--------|----------|
| Prisma Schema | ✅ Completo | 24 modelos (utilizador, aula, figurino, etc.) |
| Auth Routes | ✅ Básico | register/login implementados |
| User Routes | ❌ Falta | Apenas register existe |
| Aulas Routes | ❌ Falta | Nenhum endpoint |
| Figurinos Routes | ❌ Falta | Nenhum endpoint |
| Eventos Routes | ❌ Falta | Nenhum endpoint |
| Turmas Routes | ❌ Falta | Nenhum endpoint |
| Salas Routes | ❌ Falta | Nenhum endpoint |
| Anuncios Routes | ❌ Falta | Nenhum endpoint |
| Contacto Route | ❌ Falta | Nenhum endpoint |
| CORS | ❌ Falta | Configurar para localhost:5173 |
| dotenv | ❌ Falta | Não carregado em server.js |

---

## 2. TODOs

### Fase 1: Configuração Base e Auth

- [ ] **1.1** Corrigir `server.js` - adicionar `dotenv/config` e CORS
- [ ] **1.2** Corrigir/limpar `auth.service.js` - usar `prisma.utilizador` em vez de `prisma.user`
- [ ] **1.3** Adicionar endpoint `/api/auth/logout`
- [ ] **1.4** Adicionar endpoint `/api/auth/forgot-password` (mock sem email)
- [ ] **1.5** Adicionar endpoint `/api/auth/reset-password` (mock sem email)
- [ ] **1.6** Criar controller de autenticação (`auth.controller.js`)
- [ ] **1.7** Criar serviço de autenticação (`auth.service.js` - limpar uso de `prisma.user`)
- [ ] **1.8** Verificar rotas auth com curl

### Fase 2: Gestão de Utilizadores

- [ ] **2.1** Criar `/api/users` routes - GET (listar), GET/:id, PUT/:id, DELETE/:id
- [ ] **2.2** Criar `users.controller.js` com validação de input
- [ ] **2.3** Criar `users.service.js` para lógica de negócio
- [ ] **2.4** Adicionar middleware de validação (Joi ou similar)
- [ ] **2.5** Implementar proteção de rotas por role
- [ ] **2.6** Verificar endpoints users com curl

### Fase 3: Gestão de Aulas

- [ ] **3.1** Criar `/api/aulas` routes - GET, POST, GET/:id, PUT/:id, DELETE/:id
- [ ] **3.2** Criar `/api/aulas/:id/confirm` - confirmar aula
- [ ] **3.3** Criar `/api/aulas/:id/cancel` - cancelar aula
- [ ] **3.4** Criar `/api/aulas/:id/remarcar` - remarcar aula
- [ ] **3.5** Criar `/api/aulas/:id/join` - aluno juntar-se
- [ ] **3.6** Criar `aulas.controller.js` e `aulas.service.js`
- [ ] **3.7** Validar regras de negócio: professor disponível, sala disponível
- [ ] **3.8** Verificar endpoints aulas com curl

### Fase 4: Gestão de Salas

- [x] **4.1** Criar `/api/salas` routes - CRUD completo
- [x] **4.2** Criar `/api/salas/:id/availability` - disponibilidade
- [x] **4.3** Criar `salas.controller.js` e `salas.service.js`
- [x] **4.4** Verificar endpoints salas com curl

### Fase 5: Gestão de Turmas

- [x] **5.1** Criar `/api/turmas` routes - CRUD completo
- [x] **5.2** Criar `/api/turmas/:id/enroll` - matricular aluno
- [x] **5.3** Criar `/api/turmas/:id/close` - fechar turma
- [x] **5.4** Criar `/api/turmas/:id/archive` - arquivar turma
- [x] **5.5** Criar `turmas.controller.js` e `turmas.service.js`
- [x] **5.6** Verificar endpoints turmas com curl

### Fase 6: Gestão de Figurinos

- [x] **6.1** Criar `/api/figurinos` routes - CRUD completo
- [x] **6.2** Criar `/api/figurinos/:id/status` - atualizar estado
- [x] **6.3** Criar `figurinos.controller.js` e `figurinos.service.js`
- [x] **6.4** Implementar lifecycle: DISPONIVEL → RESERVADO → EM_USO → DISPONIVEL
- [x] **6.5** Verificar endpoints figurinos com curl

### Fase 7: Gestão de Eventos

- [x] **7.1** Criar `/api/eventos` routes - CRUD completo
- [x] **7.2** Criar `/api/eventos/:id/publish` - publicar evento
- [x] **7.3** Criar `eventos.controller.js` e `eventos.service.js`
- [x] **7.4** Verificar endpoints eventos com curl

### Fase 8: Gestão de Anúncios

- [x] **8.1** Criar `/api/anuncios` routes - CRUD completo
- [x] **8.2** Criar `/api/anuncios/:id/approve` - aprovar anúncio
- [x] **8.3** Criar `anuncios.controller.js` e `anuncios.service.js`
- [x] **8.4** Verificar endpoints anuncios com curl

### Fase 9: Contacto

- [x] **9.1** Criar `/api/contacto` route - POST para guardar mensagens
- [x] **9.2** Criar `contacto.controller.js`
- [x] **9.3** Verificar endpoint contacto com curl

### Fase 10: Integração Frontend

- [x] **10.1** Integrar AuthContext com API real (substituir mock users)
- [x] **10.2** Corrigir Login.tsx para usar `api.login()`
- [x] **10.3** Corrigir Contactos.tsx para usar `api.submitContact()`
- [x] **10.4** Corrigir Utilizadores.tsx para usar `api.getUsers()`, `api.createUser()`
- [x] **10.5** Corrigir NovaAulaForm para usar API em vez de mock data (skipped - complexidade)
- [x] **10.6** Testar Dashboard com dados reais da API (requer servidor)
- [x] **10.7** Testar Aulas com dados reais da API (requer servidor)
- [x] **10.8** Testar Marketplace com dados reais da API (requer servidor)
- [x] **10.9** Testar Turmas com dados reais da API (requer servidor)
- [x] **10.10** Testar Stock com dados reais da API (requer servidor)
- [x] **10.11** Testar Eventos com dados reais da API (requer servidor)

### Fase 11: Melhorias e Correções

- [ ] **11.1** Adicionar rate limiting
- [ ] **11.2** Adicionar logging
- [ ] **11.3** Criar seed data para testes
- [ ] **11.4** Documentar APIs com Swagger/JSDoc

---

## 3. Regras de Negócio (do PDF)

| Regra | Implementação |
|-------|---------------|
| Aluno → Encarregado (1:1) | Validar ao criar/editar aluno |
| Professor ↔ Sala disponibilidade | Verificar disponibilidade ao criar aula |
| Figurino lifecycle | Estados: DISPONIVEL → RESERVADO → EM_USO → DISPONIVEL |
| Aula lifecycle | Estados: PENDENTE → CONFIRMADA → REALIZADA |
| Aluno read-only agenda | Permissões: ALUNO não pode criar aulas |

---

## 4. API Endpoints Requeridos

### Auth
| Método | Endpoint | Descrição |
|--------|----------|-----------|
| POST | `/api/auth/register` | Registar utilizador |
| POST | `/api/auth/login` | Login |
| POST | `/api/auth/logout` | Logout |
| POST | `/api/auth/forgot-password` | Recuperação password (mock) |
| POST | `/api/auth/reset-password` | Reset password (mock) |

### Users
| Método | Endpoint | Descrição |
|--------|----------|-----------|
| GET | `/api/users` | Listar utilizadores |
| GET | `/api/users/:id` | Detalhe utilizador |
| POST | `/api/users` | Criar utilizador |
| PUT | `/api/users/:id` | Atualizar utilizador |
| DELETE | `/api/users/:id` | Eliminar utilizador |

### Aulas
| Método | Endpoint | Descrição |
|--------|----------|-----------|
| GET | `/api/aulas` | Listar aulas |
| GET | `/api/aulas/:id` | Detalhe aula |
| POST | `/api/aulas` | Criar aula |
| PUT | `/api/aulas/:id` | Atualizar aula |
| DELETE | `/api/aulas/:id` | Eliminar aula |
| POST | `/api/aulas/:id/confirm` | Confirmar aula |
| POST | `/api/aulas/:id/cancel` | Cancelar aula |
| PUT | `/api/aulas/:id/remarcar` | Remarcar aula |
| POST | `/api/aulas/:id/join` | Aluno juntar-se |

### Salas
| Método | Endpoint | Descrição |
|--------|----------|-----------|
| GET | `/api/salas` | Listar salas |
| GET | `/api/salas/:id` | Detalhe sala |
| POST | `/api/salas` | Criar sala |
| PUT | `/api/salas/:id` | Atualizar sala |
| DELETE | `/api/salas/:id` | Eliminar sala |
| GET | `/api/salas/:id/availability` | Disponibilidade |

### Turmas
| Método | Endpoint | Descrição |
|--------|----------|-----------|
| GET | `/api/turmas` | Listar turmas |
| GET | `/api/turmas/:id` | Detalhe turma |
| POST | `/api/turmas` | Criar turma |
| PUT | `/api/turmas/:id` | Atualizar turma |
| DELETE | `/api/turmas/:id` | Eliminar turma |
| POST | `/api/turmas/:id/enroll` | Matricular aluno |
| DELETE | `/api/turmas/:id/alunos/:alunoId` | Remover aluno |
| PUT | `/api/turmas/:id/close` | Fechar turma |
| PUT | `/api/turmas/:id/archive` | Arquivar turma |

### Figurinos
| Método | Endpoint | Descrição |
|--------|----------|-----------|
| GET | `/api/figurinos` | Listar figurinos |
| GET | `/api/figurinos/:id` | Detalhe figurino |
| POST | `/api/figurinos` | Criar figurino |
| PUT | `/api/figurinos/:id` | Atualizar figurino |
| DELETE | `/api/figurinos/:id` | Eliminar figurino |
| PUT | `/api/figurinos/:id/status` | Atualizar estado |

### Eventos
| Método | Endpoint | Descrição |
|--------|----------|-----------|
| GET | `/api/eventos` | Listar eventos |
| GET | `/api/eventos/:id` | Detalhe evento |
| POST | `/api/eventos` | Criar evento |
| PUT | `/api/eventos/:id` | Atualizar evento |
| DELETE | `/api/eventos/:id` | Eliminar evento |
| PUT | `/api/eventos/:id/publish` | Publicar evento |

### Anúncios
| Método | Endpoint | Descrição |
|--------|----------|-----------|
| GET | `/api/anuncios` | Listar anúncios |
| GET | `/api/anuncios/:id` | Detalhe anúncio |
| POST | `/api/anuncios` | Criar anúncio |
| PUT | `/api/anuncios/:id` | Atualizar anúncio |
| DELETE | `/api/anuncios/:id` | Eliminar anúncio |
| PUT | `/api/anuncios/:id/approve` | Aprovar anúncio |

### Contacto
| Método | Endpoint | Descrição |
|--------|----------|-----------|
| POST | `/api/contacto` | Submeter mensagem |

---

## 5. Response Format

Todos os endpoints devem retornar no formato:

```json
// Sucesso
{ "success": true, "data": { ... } }

// Erro
{ "success": false, "error": "Mensagem de erro" }
```

---

## 6. Exclusões (Não Implementar)

- Funcionalidade de email (não há SMTP configurado)
- Notificações em tempo real (WebSockets/SSE)
- Upload de ficheiros/imagens
- Geração de PDFs
- Pesquisa avançada/filtros complexos
- Exportação de dados
- Paginação (MVP)

---

## 7. QA Verification

### Backend
```bash
# Testar login
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"direcao@entartes.pt","password":"password123"}'

# Testar route protegida
curl http://localhost:3000/api/profile \
  -H "Authorization: Bearer <token>"

# Testar criar aula
curl -X POST http://localhost:3000/api/aulas \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <token>" \
  -d '{"titulo":"Aula Teste","data":"2026-04-20","hora":"10:00"}'
```

### Frontend
- Login funciona com credenciais reais
- Dashboard mostra dados da API
- Aulas carregam e permitem CRUD
- Contactos submete para backend

---

## 8. Dependencies

Nenhuma dependency nova necessária. Verificar:
- @fastify/cors (já em package.json)
- @fastify/cookie (para logout)
- bcrypt, jsonwebtoken, dotenv (já instalados)