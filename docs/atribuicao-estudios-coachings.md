# Atribuição de Estúdios a Coachings

## Problema

Quando um encarregado marcava um coaching, era obrigado a selecionar um estúdio/sala. No entanto, o fluxo desejado é:

1. Professor dá a sua disponibilidade **sem atribuir estúdio**
2. Encarregado marca o coaching **sem selecionar estúdio**
3. A **Direção**, ao aprovar o coaching, escolhe o estúdio disponível para aquela data/hora

## O que mudou

### 1. Base de Dados — `salaidsala` passa a opcional

**Antes**: `pedidodeaula.salaidsala` era `NOT NULL` — obrigava a ter um estúdio desde a criação do pedido.

**Depois**: `salaidsala` passa a `NULLABLE` — o pedido pode ser criado sem estúdio.

| Ficheiro | Alteração |
|---|---|
| `backend/prisma/schema.prisma` | `salaidsala Int` → `salaidsala Int?` e `sala sala?` |
| `backend/prisma/migrations/.../migration.sql` | `ALTER TABLE pedidodeaula ALTER COLUMN salaidsala DROP NOT NULL` |

### 2. Submissão do Pedido (Encarregado) — estúdio deixa de ser obrigatório

**Controller** (`pedidocoaching.controller.js`):
- Removida a validação `!salaidsala` dos campos obrigatórios

**Service** (`pedidocoaching.service.js`):
- `salaidsala` tratado como opcional: se não for enviado, fica `null` na BD
- Verificação de conflito de sala só acontece SE `salaidsala` foi fornecido

**Frontend** (`Coaching.tsx`):
- `salaidsala: parseInt(... || '1') || 1` → `parseInt(...) || undefined` (já não força estúdio default "1")

**API service** (`api.ts`):
- Tipo `salaidsala: number` → `salaidsala?: number`

### 3. Aprovação (Direção) — estúdio é obrigatório antes de aprovar

**Service** (`direcao.service.js`):
- Adicionada validação: se o pedido não tem estúdio E nenhum foi selecionado no approve, rejeita com erro
- Criação do registo `aula` agora usa o `salaIdsala` resolvido (já existia no request ou no pedido)

## Fluxo Completo

```
Professor
  └── Cria disponibilidade (sem estúdio)
       │
Encarregado
  └── Marca coaching (estúdio fica null)
       │
Direção (Dashboard → Coaching)
  └── Abre modal de aprovação
       ├── Carrega GET /api/salas/disponiveis?data=&hora=&duracao=
       ├── Mostra apenas estúdios LIVRES para aquele horário
       ├── Seleciona um estúdio
       └── Aprova → backend valida e confirma
```

## Endpoints envolvidos

| Método | Rota | Descrição |
|---|---|---|
| `GET` | `/api/salas` | Lista todas as salas/estúdios |
| `GET` | `/api/salas/disponiveis?data=&hora=&duracao=` | Salas disponíveis para um horário (já existia) |
| `POST` | `/api/encarregado/coaching` | Submeter pedido de aula (agora sem sala obrigatória) |
| `POST` | `/api/direcao/coaching/:id/approve` | Aprovar pedido (aceita `salaId` opcional no body) |

## Como testar

1. **Professor**: criar disponibilidade sem selecionar estúdio
2. **Encarregado**: marcar coaching — o campo estúdio já não aparece como obrigatório
3. **Direção**: abrir o coaching pendente → modal de aprovação mostra lista de estúdios disponíveis → selecionar um → aprovar
4. Verificar que o coaching fica com estado `CONFIRMADA` e o estúdio atribuído
