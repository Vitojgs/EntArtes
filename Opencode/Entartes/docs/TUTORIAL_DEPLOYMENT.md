# Tutorial Completo de Deployment — Ent'Artes

Este documento oferece instruções detalhadas para colocar o projeto Ent'Artes em produção.

---

## PARTE 1: PREPARAÇÃO DO CÓDIGO

### Passo 1.1 — Atualizar package.json do Backend

Edite o ficheiro `backend/package.json`:

```json
{
  "name": "entartes-backend",
  "version": "1.0.0",
  "type": "module",
  "description": "API do sistema Ent'Artes",
  "main": "src/server.js",
  "scripts": {
    "dev": "node src/server.js",
    "start": "node src/server.js",
    "build": "prisma generate",
    "db:push": "prisma db push",
    "db:migrate": "prisma migrate deploy",
    "test": "vitest"
  },
  "dependencies": {
    "@fastify/cors": "^8.5.0",
    "@fastify/rate-limit": "^9.1.0",
    "@fastify/swagger": "^8.15.0",
    "@fastify/swagger-ui": "^4.2.0",
    "bcrypt": "^5.1.1",
    "dotenv": "^16.0.0",
    "fastify": "^4.0.0",
    "jsonwebtoken": "^9.0.3",
    "@prisma/client": "^5.0.0",
    "nodemailer": "^6.9.0"
  },
  "devDependencies": {
    "prisma": "^5.0.0"
  }
}
```

### Passo 1.2 — Criar .env para Produção

Crie o ficheiro `backend/.env`:

```bash
# Base de Dados (preencher depois)
DATABASE_URL="postgresql://user:password@host:5432/entartes"

# JWT - gerar novo com: openssl rand -hex 32
JWT_SECRET="cole_aqui_o_resultado_do_comando"

# Configuração
NODE_ENV=production
PORT=3000
```

**Para gerar o JWT_SECRET, execute:**

```bash
# No terminal (Linux/Mac)
openssl rand -hex 32
```

### Passo 1.3 — Atualizar CORS no Backend

Edite `backend/src/app.js` e adicione o domínio do frontend em produção:

```javascript
await app.register(cors, {
  origin: [
    'http://localhost:5173',
    'http://localhost:4173',
    'https://entartes-frontend.vercel.app'  // SUBSTITUIR pelo teu domínio
  ]
});
```

### Passo 1.4 — Atualizar API URL no Frontend

Edite `frontend/src/services/api.ts`:

```typescript
// Substituir a URL base
const API_BASE_URL = import.meta.env.VITE_API_URL || 'https://entartes-backend.onrender.com/api';
```

---

## PARTE 2: GITHUB

### Passo 2.1 — Criar Repositório no GitHub

1. Vá para **github.com/new**
2. Repository name: `entartes`
3. Visibility: **Public** (ou Private)
4. Click **Create repository**

### Passo 2.2 —推送 Código para GitHub

Execute no terminal, na pasta raiz do projeto:

```bash
cd /home/ugrt/Documents/Opencode/Entartes

# Inicializar git (se ainda não iniciado)
git init

# Adicionar todos os ficheiros
git add .

# Criar commit inicial
git commit -m "Initial commit - Ent'Artes project"

# Adicionar remoto
git remote add origin https://github.com/YOUR_USERNAME/entartes.git

# Enviar para GitHub
git push -u origin main
```

**Substituir `YOUR_USERNAME` pelo teu username do GitHub.**

---

## PARTE 3: RENDER (Backend + PostgreSQL)

### Passo 3.1 — Criar Conta Render

1. Vá para **render.com**
2. Clique **Sign Up**
3. Autentique com GitHub

### Passo 3.2 — Criar PostgreSQL

1. Dashboard → **New** → **PostgreSQL**
2. Configurações:
   - Name: `entartes-db`
   - Database Name: `entartes`
   - User: `postgres`
3. Clique **Create Database**

**Guardar a PostgreSQL Connection String** (形式: `postgres://...`)

### Passo 3.3 — Criar Backend

1. Dashboard → **New** → **Web Service**
2. Configure:
   - Name: `entartes-backend`
   - GitHub: selecionar o repositório `entartes`
   - Branch: `main`
   - Build Command: `npm install`
   - Start Command: `npm start`
3. Clique **Create Web Service**

### Passo 3.4 — Configurar Variáveis de Ambiente

1. No serviço criado, vá para **Environment**
2. Adicionar variáveis:

| Variável | Valor |
|----------|-------|
| `DATABASE_URL` | Cole a connection string do PostgreSQL |
| `JWT_SECRET` | Cole o resultado de `openssl rand -hex 32` |
| `NODE_ENV` | `production` |

3. Clique **Save Changes**

### Passo 3.5 — Executar Migrations

1. Vá para **Shell** no dashboard do Render
2. Execute:

```bash
npx prisma db push
```

3. Execute o seed:

```bash
node src/seed.js
```

**Verificar se o backend está a funcionar:**

```
https://entartes-backend.onrender.com/api/health
```

---

## PARTE 4: VERCEL (Frontend)

### Passo 4.1 — Criar Conta Vercel

1. Vá para **vercel.com**
2. Clique **Sign Up**
3. Autentique com GitHub

### Passo 4.2 — Importar Projeto

1. Dashboard → **Add New...** → **Project**
2. Selecionar o repositório `entartes`
3. Configure:

| Opção | Valor |
|-------|-------|
| Framework Preset | **Vite** |
| Build Command | `npm run build` |
| Output Directory | `dist` |

### Passo 4.3 — Configurar Variáveis

1. Environment Variables → **Add**:
   
| Variável | Valor |
|----------|-------|
| `VITE_API_URL` | URL do backend (ex: `https://entartes-backend.onrender.com/api`) |

2. Clique **Deploy**

### Passo 4.4 — Guardar URL

Após o deploy, Vercel mostra uma URL como:
`https://entartes-frontend.vercel.app`

**Guardar esta URL!**

---

## PARTE 5: CONFIGURAR CORS NO BACKEND

### Passo 5.1 — Atualizar CORS

No Render, vá ao código do backend e edite `backend/src/app.js`:

```javascript
await app.register(cors, {
  origin: [
    'http://localhost:5173',
    'http://localhost:4173',
    'https://entartes-frontend.vercel.app'  // SUBSTITUIR pela tua URL Vercel
  ]
});
```

### Passo 5.2 — Commit e Deploy

```bash
git add .
git commit -m "Add production CORS"
git push origin main
```

O Render faz deploy automático!

---

## VERIFICAÇÃO FINAL

### Testar a aplicação

| Teste | URL | Esperado |
|-------|-----|----------|
| Health | `https://entartes-backend.onrender.com/api/health` | `{"status":"ok"}` |
| Login | POST para `/api/auth/login` | JWT token |
| Frontend | `https://entartes-frontend.vercel.app` | Página加载 |

### Testar Login via curl

```bash
curl -X POST https://entartes-backend.onrender.com/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"direcao@entartes.pt","password":"password123"}'
```

---

## RESUMO DE URLs

| Serviço | URL | Notas |
|---------|-----|-------|
| Backend | `https://entartes-backend.onrender.com` | Substituir pelo nome dado |
| API | `https://entartes-backend.onrender.com/api` | Endpoint base |
| Frontend | `https://entartes-frontend.vercel.app` | Página principal |
| Health | `.../api/health` | Verificar status |

---

## COMANDOS ÚTEIS

### Verificar logs no Render

```bash
# No dashboard do Render
# Services → entartes-backend → Logs
```

### Reiniciar o serviço

```bash
# No dashboard do Render
# Services → entartes-backend → Deploys → Rollback
```

### Aceder à base de dados

```bash
# No dashboard do Render
# PostgreSQL → Connect → conexão direta
```

---

## TROUBLESHOOTING

### Problema: "Connection refused"

**Solução:** Verificar se o PostgreSQL está a correr e a `DATABASE_URL` está correta.

### Problema: "CORS error"

**Solução:** Adicionar o domínio do frontend ao CORS no backend.

### Problema: 502 Bad Gateway

**Solução:** O servidor pode demorar a iniciar. Aguardar 30 segundos e tentar novamente.

### Problema: "Database not ready"

**Solução:** Executar `npx prisma db push` novamente no shell do Render.

---

**Tutorial completo! Segue estes passos e terás o projeto em produção.**