# Guia de Deployment — Ent'Artes

Este documento describe os passos e plataformas recomendadas para colocar o projeto Ent'Artes em produção.

---

## 1. Opções de Plataformas

### 1.1 Recomendadas (Gratuito/Two)

| Serviço | Uso | Custo | Notas |
|---------|-----|-------|-------|
| **Render** | Backend + DB | Free tier | PostgreSQL disponível |
| **Railway** | Backend + DB | Free tier | Easy setup |
| **Fly.io** | Backend | Free tier | Docker support |
| **Supabase** | PostgreSQL only | Free tier | Alternativa a PostgreSQL managed |
| **Vercel** | Frontend | Free | Optimizado para Vite |
| **Netlify** | Frontend | Free | Deploy automático |

### 1.2 Recomendação para Início

**Stack gratuita para pequenos projetos:**

| Componente | Plataforma |
|------------|-------------|
| Backend | **Render** (Free) ou **Railway** |
| PostgreSQL | **Render** (Free) ou **Supabase** |
| Frontend | **Vercel** (gratuito) |

---

## 2. Preparação do Código para Produção

### 2.1 Variáveis de Ambiente

Criar `.env` de produção:

```bash
# Base de Dados
DATABASE_URL="postgresql://user:password@host:5432/entartes"

# JWT
JWT_SECRET="gerar-com-openssl-rand-hex-64"

# Servidor
PORT=3000
NODE_ENV=production
```

### 2.2 Scripts npm

No `backend/package.json`:

```json
{
  "scripts": {
    "start": "node src/server.js",
    "build": "prisma generate",
    "db:deploy": "prisma migrate deploy"
  }
}
```

### 2.3 Configurações de Produção

Verificar `backend/src/app.js`:

```javascript
// Em produção, desativar swagger
if (process.env.NODE_ENV !== 'production') {
  await app.register(require('@fastify/swagger'), { ... });
}
```

---

## 3. Opção 1: Render (Backend + PostgreSQL)

### 3.1 Passos

1. Criar conta em **render.com**
2. Criar ** PostgreSQL** (New → PostgreSQL)
   - Guardar connection string
3. Criar **Web Service** (New → Web Service)
   - Build Command: `npm install`
   - Start Command: `npm start`
   - Environment Variables:
     - `DATABASE_URL`: (connection string do PostgreSQL)
     - `JWT_SECRET`: (gerar novo)
     - `NODE_ENV`: `production`

### 3.2 Configurar Base de Dados

```bash
# Na máquinalocal, executar:
DATABASE_URL="postgresql://..." npx prisma db push
npx prisma db seed
```

---

## 4. Opção 2: Railway

### 4.1 Passos

1. Criar conta em **railway.app**
2. New Project → PostgreSQL
3. New Project → Node.js (Backend)
4. Ligar variáveis:
   - `DATABASE_URL`: (do serviço PostgreSQL)
   - `JWT_SECRET`: (gerar)
   - `NODE_ENV`: `production`

### 4.2 Deploy Automático

Railway faz deploy automático a partir do GitHub.

---

## 5. Frontend — Vercel

### 5.1 Passos

1. Criar conta em **vercel.com**
2. Importar projeto do GitHub
3. Configurar:
   - Framework Preset: **Vite**
   - Build Command: `npm run build`
   - Output Directory: `dist`
4. Environment Variables:
   - `VITE_API_URL`: URL do backend em produção

### 5.2 Configurar CORS

No backend, adicionar domínio Vercel ao CORS:

```javascript
// backend/src/app.js
await app.register(cors, {
  origin: [
    'http://localhost:5173',
    'https://seu-projeto.vercel.app'
  ]
});
```

---

## 6. Docker (Opcional)

### 6.1 Dockerfile (Backend)

```dockerfile
FROM node:20-alpine

WORKDIR /app

COPY package*.json ./
RUN npm ci --only=production

COPY prisma ./prisma/
RUN npx prisma generate

COPY src ./src/

EXPOSE 3000

CMD ["node", "src/server.js"]
```

### 6.2 docker-compose.yml

```yaml
version: '3.8'

services:
  backend:
    build: ./backend
    ports:
      - "3000:3000"
    environment:
      - DATABASE_URL=postgresql://postgres:postgres@db:5432/entartes
      - JWT_SECRET=${JWT_SECRET}
      - NODE_ENV=production
    depends_on:
      - db

  db:
    image: postgres:15-alpine
    environment:
      - POSTGRES_USER=postgres
      - POSTGRES_PASSWORD=postgres
      - POSTGRES_DB=entartes
    volumes:
      - postgres_data:/var/lib/postgresql/data

volumes:
  postgres_data:
```

### 6.3 Build e Run

```bash
docker-compose up --build
```

---

## 7. Checklist de Produção

| # | Verificação | Done |
|---|------------|------|
| 1 | Variáveis de ambiente configuradas | ☐ |
| 2 | JWT_SECRET gerado (64 caracteres) | ☐ |
| 3 | DATABASE_URL configurado | ☐ |
| 4 | CORS permitido para frontend | ☐ |
| 5 | Swagger desativado em produção | ☐ |
| 6 | Seed executado na BD de produção | ☐ |
| 7 | Frontend com API_URL correta | ☐ |
| 8 | Testado em ambiente local | ☐ |

---

## 8. Domínio Próprio (Opcional)

### 8.1 Configuração Render

1. Settings → Custom Domains
2. Adicionar domínio
3. Configurar DNS no registo (.pt)

### 8.2 SSL

Render fornece SSL automático.

---

## 9. Monitorização

### 9.1 Health Endpoint

O backend já tem `/api/health`:

```bash
curl https://seu-backend.onrender.com/api/health
```

### 9.2 Logs

- **Render:** Dashboard → Logs
- **Railway:** Dashboard → Deploys → Logs

---

## 10. Resumo —Quick Start

### Render (Recomendado)

```
1. Criar PostgreSQL no Render
2. Criar Backend no Render
3. Configurar variáveis de ambiente
4. Deploy automático via GitHub
```

### Vercel (Frontend)

```
1. Importar projeto no Vercel
2. Configurar build com Vite
3. Definir VITE_API_URL
4. Deploy automático
```

---

## 11. Fluxo Completo

```mermaid
graph LR
    A[GitHub] --> B[Backend Render]
    A --> C[Vercel]
    B --> D[PostgreSQL Render]
    C --> E[Browser User]
    E --> B
```

---

**Precisas de detalhes adicionais para alguma plataforma específica?**