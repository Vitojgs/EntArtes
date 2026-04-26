# Sistema de Gestão de Aulas, Figurinos e Eventos

## 1. Introdução

O presente projeto tem como objetivo o desenvolvimento de uma aplicação web para a gestão de aulas de coaching, gestão de figurinos e divulgação de eventos, permitindo a interação entre diferentes tipos de utilizadores, nomeadamente alunos, encarregados de educação, professores e direção.

A aplicação visa responder às necessidades identificadas no contexto da organização, promovendo a digitalização dos processos de marcação de aulas, gestão de recursos e comunicação de eventos.

---

## 2. Objetivos do Sistema

- Permitir autenticação segura de utilizadores
- Gerir pedidos e agendamento de aulas
- Controlar disponibilidade de professores e salas
- Gerir inventário e reservas de figurinos
- Disponibilizar e divulgar eventos
- Garantir comunicação eficiente entre os intervenientes

---

## 3. Tecnologias Utilizadas

| Camada | Tecnologia |
|--------|----------|
| Frontend | React |
| Backend | Node.js + Fastify |
| API | REST |
| Base de Dados | PostgreSQL + Prisma |
| Autenticação | JWT + bcrypt |
| Documentação | Swagger, JSDoc, Markdown |
| Testes | Vitest, React Testing Library |
| API Testing | Postman |

---

## 4. Arquitetura do Sistema

O sistema segue uma arquitetura modular baseada em três camadas principais:

- Frontend: Interface com o utilizador
- Backend: Lógica de negócio
- Base de Dados: Persistência de dados

A comunicação entre frontend e backend é realizada através de uma API REST.

---

## 5. Estrutura do Projeto

```
project-root/
├── frontend/
├── backend/
├── docs/
├── postman/
└── scripts/
```

---

## 6. Instalação e Execução

### 6.1 Pré-requisitos

- **Node.js** 18+ — https://nodejs.org
- **PostgreSQL** 14+ — https://www.postgresql.org/download
- **npm** (incluído com Node.js)

### 6.2 Setup automático (recomendado)

```bash
git clone <url-do-repositório>
cd project-root
chmod +x scripts/setup.sh
./scripts/setup.sh
```

O script faz automaticamente:
1. Cria o utilizador e base de dados PostgreSQL (`entartes`)
2. Copia `backend/.env.example` para `backend/.env`
3. Instala dependências de backend e frontend
4. Cria todas as tabelas (`prisma db push`)
5. Insere dados de seed (utilizadores de teste)

### 6.3 Setup manual (alternativa)

**1. Criar base de dados:**
```bash
psql -U postgres -c "CREATE USER entartes WITH PASSWORD 'entartes_dev_password';"
psql -U postgres -c "CREATE DATABASE entartes OWNER entartes;"
```

**2. Configurar variáveis de ambiente:**
```bash
cp backend/.env.example backend/.env
```
O ficheiro `.env.example` já contém as credenciais de desenvolvimento.

**3. Instalar dependências:**
```bash
cd backend && npm install
cd ../frontend && npm install
```

**4. Criar tabelas e seed:**
```bash
cd backend
npx prisma db push
node src/seed.js
```

### 6.4 Iniciar os serviços

**Opção A — Script automático:**
```bash
./scripts/start-services.sh
```

**Opção B — Manual (dois terminais separados):**
```bash
# Terminal 1 — Backend
cd backend && npm run dev

# Terminal 2 — Frontend
cd frontend && npm run dev
```

- Frontend: http://localhost:5173
- Backend API: http://localhost:3000
- Swagger docs: http://localhost:3000/docs

### 6.5 Credenciais de teste

| Role | Email | Password |
|------|-------|----------|
| Direção | direcao@entartes.pt | password123 |
| Professor | joao.santos@entartes.pt | password123 |
| Professor | maria.pereira@entartes.pt | password123 |
| Encarregado | pedro.oliveira@email.pt | password123 |
| Aluno | miguel.silva@email.pt | password123 |

---

## 7. Segurança

- Hash de passwords com bcrypt
- Autenticação com JWT
- Proteção de rotas

---

## 8. Documentação

- Swagger: API
- JSDoc: Código
- Markdown: Documentação técnica

---

## 9. Testes

- Backend: Vitest + Supertest
- Frontend: React Testing Library

---

## 10. Conclusão

O projeto permitiu aplicar conceitos de engenharia de software, arquitetura e desenvolvimento fullstack.

---

## 11. Autores

- André Filipe da Cunha Rodrigues
- Eduardo Jorge dos Santos Lage
- Francisco Duarte Araújo da Rocha
- Rui Pedro Rodrigues Gonçalves
- Vítor João Gomes da Silva
  
---

## 12. Contexto Académico

Projeto desenvolvido em contexto académico com foco em modelação, arquitetura e desenvolvimento web.
