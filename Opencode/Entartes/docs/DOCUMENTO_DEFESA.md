# Ent'Artes — Documento de Defesa Académica

**Projeto de Desenvolvimento de Software**  
**Escola de Dança — Plataforma de Gestão Web**

---

## 1. Introdução e Visão Geral do Projeto

### 1.1 Contextualização

O presente documento constitui o guião de suporte à defesa oral do projeto **Ent'Artes**, desenvolvido no âmbito da unidade curricular de Projeto e Desenvolvimento de Software.

A Ent'Artes é uma plataforma web destinada à gestão integral de uma escola de dança, permitindo a interação entre diferentes tipos de utilizadores — alunos, encarregados de educação, professores e direção — através de uma interface moderna e intuitive.

### 1.2 Objetivos do Projeto

O sistema foi desenvolvido com os seguintes objetivos:

- Digitalização dos processos de marcação e gestão de aulas
- Gestão de inventário e reservas de figurinos
- Divulgação e gestão de eventos organizacionais
- Comunicação eficaz entre direção, docentes e alunos
- Segurança e fiabilidade na manipulação de dados pessoais

### 1.3 Alcance Funcional

| Módulo Funcional | Descrição |
|-----------------|-----------|
| **Autenticação e Autorização** | Registo, login, recuperação de password, sistema multi-role |
| **Gestão de Aulas** | Marcação, aprovação, cancelamento, remarcação, presenças |
| **Figurinos e Marketplace** | Inventário, reservas, anúncios, transações |
| **Eventos** | Criação, edição, publicação, gestão |
| **Turmas e Grupos** | Matrículas, inscrições, gestão de grupos |
| **Auditoria** | Registo completo de ações dos utilizadores |

---

## 2. Arquitetura do Sistema

### 2.1 Arquitetura de Três Camadas (Three-Tier)

O projeto segue uma arquitetura cliente-servidor clássica, organizada em três camadas distintas:

```
┌─────────────────────────────────────────────────────┐
│                   FRONTEND                          │
│              (React + Vite + Tailwind)              │
├─────────────────────────────────────────────────────┤
│                   BACKEND                           │
│         (Node.js + Fastify + Prisma)                │
├─────────────────────────────────────────────────────┤
│               BASE DE DADOS                         │
│                 (PostgreSQL)                        │
└─────────────────────────────────────────────────────┘
```

### 2.2 Estrutura Modular do Backend

O backend segue o padrão de três camadas, garantindo separação de responsabilidades:

```
backend/src/
├── config/
│   └── db.js              # Configuração Prisma
├── controllers/           # Lógica de request/response
│   ├── auth.controller.js
│   ├── aulas.controller.js
│   └── ...
├── middleware/
│   ├── auth.middleware.js    # Verificação JWT
│   └── role.middleware.js     # Autorização por roles
├── routes/                # Definição de endpoints
│   ├── auth.routes.js
│   ├── aulas.routes.js
│   └── ...
├── services/             # Lógica de negócio
│   ├── auth.service.js
│   ├── aulas.service.js
│   └── ...
├── utils/
│   └── jwt.js            # Utilitários JWT
├── app.js                # Configuração Fastify
└── server.js              # Ponto de entrada
```

**Justificação Técnica:**

| Camada | Responsabilidade | Benefício |
|--------|-----------------|-----------|
| **Routes** | Validação de schema, autenticação, documentação | Segurança na entrada |
| **Controllers** | Parsing de parâmetros, resposta HTTP | Simplificação dos serviços |
| **Services** | Lógica de negócio, acesso a dados | Reutilização, testabilidade |
| **Prisma** | Mapeamento objeto-relacional | Type safety, migrações |

### 2.3 Fluxo de Dados

```
HTTP Request
    ↓
Routes (validação, autenticação)
    ↓
Controllers (parsing, resposta)
    ↓
Services (lógica de negócio)
    ↓
Prisma ORM
    ↓
PostgreSQL
```

---

## 3. Stack Tecnológica

### 3.1 Tecnologias Utilizadas

| Camada | Tecnologia | Versão | Justificação |
|--------|------------|-------|---------------|
| Frontend | React | 19 | Componentização, Virtual DOM |
| Build | Vite | 5 | Desenvolvimento rápido, HMR |
| Estilização | Tailwind CSS | 4 | utility-first, performance |
| Backend | Node.js | 20+ | Runtime JavaScript moderno |
| Framework | Fastify | 4 | Performance, schema validation |
| ORM | Prisma | 5 | Type safety, migrations |
| BD | PostgreSQL | 15+ | ACID, integridade relacional |
| Autenticação | JWT + bcrypt | — | Stateless, segurança |

### 3.2 Comparação de Tecnologias

**Fastify vs Express:**
- Fastify oferece schema validation nativo
- Performance superior (até 3x mais rápido que Express)
- Suporte nativo a TypeScript

**Prisma vs Raw SQL:**
- Type safety em tempo de desenvolvimento
- Migration system robusto
- Queries type-safe
- Abstração de banco de dados

---

## 4. Sistema de Autenticação e Autorização

### 4.1 Fluxo de Autenticação

```
Utilizador → Login Form → API /auth/login
    ↓
Validação de credenciais (bcrypt)
    ↓
Geração de JWT (1h de expiração)
    ↓
Token armazenado no localStorage
    ↓
Requests subsequentes com Bearer Token
```

### 4.2 Implementação JWT

```javascript
// Geração do token
const token = jwt.sign(
  { id: user.iduser, role: user.role, availableRoles, tokenVersion },
  process.env.JWT_SECRET,
  { expiresIn: "1h" }
);
```

**Campos do Token:**

| Campo | Descrição |
|-------|-----------|
| `id` | ID do utilizador |
| `role` | Role atual (string ou array) |
| `availableRoles` | Todas as roles do utilizador |
| `tokenVersion` | Para invalidação de sessões |

### 4.3 Middleware de Autenticação

```javascript
// Verificação em cada request protegida
const verifyToken = async (req, reply) => {
  // 1. Extrair token do header
  // 2. Decodificar JWT
  // 3. Verificar utilizador na BD
  // 4. Validar estado (ativo)
  // 5. Validar tokenVersion
};
```

---

## 5. Sistema Multi-Role

### 5.1 Conceito

Uma das principais mais-valias do projeto é o suporte a **múltiplas roles por utilizador**. Um utilizador pode ser simultaneamente Professor e Direção, ou Encarregado e Professor, consoante a sua posição na organização.

### 5.2 Roles Suportadas

| Role | Permissões |
|------|-----------|
| `DIRECAO` | Gestão completa do sistema |
| `PROFESSOR` | Aulas, disponibilidades, figurinos |
| `ENCARREGADO` | Marcações, reservas, gestão de alunos |
| `ALUNO` | Visualização, partecipação |
| `UTILIZADOR` | Base (sem privilégios) |

### 5.3 Vantagens da Abordagem Multi-Role

| Aspetto | Sistema Simples | Sistema Multi-Role |
|---------|----------------|-------------------|
| Flexibilidade | Uma conta por função | Uma conta para todas as funções |
| Experiência | Necessidade de múltiplas contas | Seamless switching |
| Manutenção | Duplicação de dados | Dados centralizados |
| Segurança | Gestão complexa de mappings | Via `availableRoles` |

### 5.4 Implementação

```javascript
// Detecção de roles no login
const [direcao, professor, encarregado, aluno] = await Promise.all([
  prisma.direcao.findUnique({ where: { utilizadoriduser: user.iduser } }),
  prisma.professor.findUnique({ where: { utilizadoriduser: user.iduser } }),
  prisma.encarregadoeducacao.findUnique({ where: { utilizadoriduser: user.iduser } }),
  prisma.aluno.findUnique({ where: { utilizadoriduser: user.iduser } })
]);

// Retorno
const role = userRoles.length === 1 ? userRoles[0] : [...userRoles];
const availableRoles = [...userRoles];
```

### 5.5 Role Switcher no Frontend

```typescript
// AuthContext.tsx
const [activeRole, setActiveRole] = useState<string>(null);

// O utilizador pode alternar entre as suas roles
// O sistema filtra conteúdos e permissões conforme activeRole
```

---

## 6. Base de Dados

### 6.1 Esquema Relacional

O projeto utiliza **31 tabelas** com integridade referencial completa:

```
Tabela principal: utilizador
    ↓
┌─────────┬──────────┬────────────┬──────────┐
│ direcao │ professor│encarregado │  aluno   │  ←─ Perfis
├─────────┼──────────┼────────────┼──────────┤
│ pedido  │ disponibilidade       │ aula     │  ←─ Aulas
├─────────┼──────────┼────────────┼──────────┤
│ anuncio │ transacao│ figurino   │  sala    │  ←─ Recursos
├─────────┼──────────┼────────────┼──────────┤
│ evento  │ notific  │ audit_log  │  grupo   │  ←─ Gestão
└─────────┴──────────┴────────────┴──────────┘
```

### 6.2 Integridade Relacional

| Constraint | Implementação |
|-----------|--------------|
| Foreign Keys | Prisma relations |
| Unique | `@unique` no schema |
| Not Null | Campos obrigatórios |
| Enumerações | Tabelas de referência |

### 6.3 Prisma ORM — Vantagens

- **Type Safety:** Queries verificadas em compilação
- **Migrations:** Versionamento do schema
- **Relations:** FKs geridas automaticamente
- **Migrations:** Deploy reproduzível

---

## 7. API REST

### 7.1 Endpoints Principais

| Método | Endpoint | Descrição | Autenticação |
|--------|----------|-----------|--------------|
| POST | /auth/register | Registo de utilizador | Público |
| POST | /auth/login | Login | Público |
| GET | /aulas | Lista de aulas | Autenticado |
| POST | /aulas | Criar aula | Professor/Direção |
| POST | /direcao/aulas/:id/approve | Aprovar aula | Direção |
| POST | /api/aluguer | Criar reserva | Autenticado |
| PUT | /api/anuncios/:id/approve | Aprovar anúncio | Direção |

### 7.2 Estrutura de Resposta

```json
{
  "success": true,
  "data": { ... },
  "message": "Operação bem sucedida"
}
```

### 7.3 Documentação

A API está documentada através de:
- JSDoc em cada função exported
- Schema de validação Fastify
- Route annotations (Swagger/OpenAPI)

---

## 8. Segurança

### 8.1 Medidas Implementadas

| Medida | Implementação |
|--------|---------------|
| **Hash de passwords** | bcrypt (cost 10) |
| **Tokens** | JWT com expiração 1h |
| **Proteção de rotas** | Middleware verifyToken |
| **Controlo de acessos** | Middleware hasRole |
| **Validação de inputs** | Fastify Schema |
| **SQL Injection** | Prisma ORM (parameterized queries) |
| **Invalidação de sessões** | tokenVersion |

### 8.2 JWT — Expiração

- **Login:** 1 hora
- **Password reset:** 1 hora

A expiração curta do JWT fuerza re-autenticação periódica, aumentando a segurança.

### 8.3 Invalidação de Sessões

Quando um administrador altera roles ou desativa um utilizador, todas as sessões são invalidadas através do incremento de `tokenVersion`:

```javascript
// O JWT guarda o tokenVersion atual
{ id: 1, role: "PROFESSOR", tokenVersion: 5 }

// Se a BD tem tokenVersion diferente, o token é rejeitado
// "Token expirado — a sua role ou estado foi alterado"
```

---

## 9. Testes e Validação

### 9.1 Suite de Testes

| Tipo | Framework | Quantidade |
|------|-----------|-----------|
| Unitários | Vitest | ~150 |
| Integração | Vitest + BD | ~50 |
| API | Vitest + supertest | ~40 |
| E2E | Playwright | 14 |

### 9.2 Cobertura de Testes

| Módulo | Testes |
|--------|--------|
| auth.service.js | Register, login, validation |
| aulas.service.js | CRUD, conflict detection |
| direcao.service.js | Approval flow |
| auth.routes.js | Endpoints validation |

### 9.3 Validação de Desempenho

```bash
# Benchmark Results
GET /api/aulas:     ~2ms (média)
GET /api/aulas/:id: ~1ms (média)
POST /auth/login:  ~45ms (bcrypt)
GET /api/health:  ~0.5ms
```

---

## 10. Requisitos Não Funcionais

### 10.1 Segurança (RNF01)

- Hash de passwords com bcrypt
- JWT com segredo configurável
- Sistema de invalidação de sessões

### 10.2 Controlo de Acesso (RNF02)

- Middleware de verificação por role
- Sistema multi-role com authorizeRole()

### 10.3 Manutenibilidade (RNF08)

- Arquitectura modular 3-camadas
- Separação clara de responsabilidades
- Testes automatizados

### 10.4 Escalabilidade (RNF07)

- Rate limiting (300 req/min/IP)
- Cache headers em endpoints públicos
- Arquitetura stateless (JWT)

### 10.5 Confiabilidade (RNF09)

- Prisma ORM com FKs
- Validações server-side
- Testes de integração

---

## 11. Melhorias Futuras Tecnicamente Justificáveis

### 11.1 Docker

**Justificação:** Containerização para deployment consistente.

```dockerfile
FROM node:20-alpine
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
EXPOSE 3000
CMD ["node", "src/server.js"]
```

### 11.2 Refresh Tokens

**Justificação:** UX protegida — 1h é seguro mas pode ser interrupto.

O JWT de refresh permite renovação sem re-login:
- Access token: 1h (curto, sensível)
- Refresh token: 7d (maior,HttpOnly cookie)

### 11.3 CI/CD

**Justificação:** Automação de testes e deployment.

GitHub Actions example:
- Run tests on push
- Build Docker image
- Deploy to production

### 11.4 Dashboard Analytics

**Justificação:** Métricas de uso para decisões pedagógicas.

---

## 12. Ordem Recomendada para Demonstração

### 12.1 Preparação (antes da defesa)

1. ✅ Levantar base de dados (`npx prisma db push`)
2. ✅ Executar seed (`node src/seed.js`)
3. ✅ Iniciar backend (`node src/server.js`)
4. ✅ Iniciar frontend (`npm run dev`)

### 12.2 Demonstração Proposta

| # | Passo | Funcionalidade | Tempo |
|---|-------|----------------|-------|
| 1 | Login | Login como Direção | 2 min |
| 2 | Dashboard | Visão geral | 1 min |
| 3 | Aulas | Criar + aprovar aula | 3 min |
| 4 | Marketplace | Criar anúncio + reserva | 3 min |
| 5 | Multi-role | Demonstrar role switcher | 2 min |
| 6 | Auditoria | Ver logs de ações | 1 min |
| 7 | Code | Mostrar estrutura | 2 min |

**Total estimado:** 14 minutos

---

## 13. Frases Técnicas para Defesa Oral

### 13.1 Arquitetura

> "O projeto segue uma arquitetura three-tier, separando completamente a interface do utilizador da lógica de negócio e do acesso a dados."

> "O backend utiliza Node.js com Fastify, escolhermos Fastify em detrimento de Express pela sua performance superior e schema validation nativo."

> "O Prisma ORM garante type safety em tempo de desenvolvimento e migrations versionadas."

### 13.2 Segurança

> "A autenticação é stateless através de JWT, com expiração de 1 hora para minimizar riscos em caso de comprometimento."

> "O sistema de tokenVersion permiteinvalidar todas as sessões de um utilizador instantaneamente, sem necessidade de logout individual."

### 13.3 Multi-Role

> "A abordagem multi-role permite que um mesmo utilizador tenha múltiplas funções, eliminando a necessidade de múltiplas contas e proporcionando uma transição seamless entre papéis."

### 13.4 Testes

> "A suite de testes incluiValidação de inputs, testes de integração com base de dados real, e testes E2E com Playwright, garantindo a fiabilidade do sistema."

### 13.5 Base de Dados

> "O PostgreSQL garante propriedades ACID, essenciais para a integridade das transações financeiras e reservas de figurinos."

---

## 14. Conclusão

O projeto Ent'Artes demonstra a aplicação prática de conceitos fundamentais de engenharia de software:

- **Arquitetura modular** com separação de responsabilidades
- **Segurança** através de autenticação robusta e controlo de acessos
- **Qualidade** através de testes automatizados
- **Manutenibilidade** através de código estruturado e documentado

O sistema está preparada para uso real, com potencial de expansão através das melhorias futuras identificadas.

---

**Documento elaborado para defesa académica**  
**Maio 2026**