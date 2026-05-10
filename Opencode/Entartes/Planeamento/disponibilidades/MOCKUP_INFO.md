# ENT'ARTES - Sistema de Gestão de Escola de Dança

## Mockup Funcional

Este é um mockup completo e funcional do sistema de gestão da escola de dança ENT'ARTES.

## Credenciais de Teste

Para testar o sistema, utilize as seguintes credenciais (password para todos: `password123`):

### Direção
- Email: `direcao@entartes.pt`
- Acesso total ao sistema

### Professor
- Email: `joao.santos@entartes.pt`
- Pode consultar e confirmar aulas

### Encarregado
- Email: `pedro.oliveira@email.pt`
- Pode solicitar aulas e usar marketplace

### Aluno
- Email: `miguel.oliveira@email.pt`
- Apenas visualiza sua agenda (leitura)

## Funcionalidades Implementadas

### Área Pública
- ✅ Home page com apresentação da escola
- ✅ Página de Eventos (acesso sem login)
- ✅ Design responsivo e moderno

### Autenticação
- ✅ Login com validação
- ✅ Reset password
- ✅ Gestão de sessão

### Sistema RBAC (Role-Based Access Control)
- ✅ 4 tipos de utilizadores: Direção, Professor, Encarregado, Aluno
- ✅ Permissões diferenciadas por role
- ✅ Aluno tem apenas leitura na agenda

### Gestão de Aulas
- ✅ Solicitação de aulas por encarregados
- ✅ Validação de duração (30-120 minutos)
- ✅ Estados: PENDENTE, CONFIRMADA, REJEITADA, REALIZADA, REMARCAR
- ✅ Aprovação/rejeição pela direção
- ✅ Confirmação de realização pelo professor
- ✅ Filtros por status
- ✅ Vinculação encarregado-aluno respeitada

### Marketplace
- ✅ Criação de anúncios por encarregados
- ✅ Moderação pela direção
- ✅ Estados: PENDENTE, APROVADO, REJEITADO
- ✅ Visualização de contactos apenas em anúncios aprovados

### Stock de Figurinos
- ✅ Gestão exclusiva pela direção
- ✅ Estados: DISPONIVEL, ALUGADO, MANUTENCAO, VENDIDO
- ✅ Bloqueio automático de itens alugados/manutenção
- ✅ Estatísticas de inventário

### Gestão de Utilizadores
- ✅ Criação exclusiva pela direção
- ✅ Vinculação obrigatória aluno-encarregado
- ✅ Pesquisa e filtros
- ✅ Visualização de relações

## Regras de Negócio Implementadas

### RN 01 - RBAC e Centralização
- ✅ Apenas direção cria utilizadores
- ✅ Aluno vinculado obrigatoriamente a encarregado
- ✅ Aluno com permissão apenas leitura
- ✅ Encarregado vê apenas seus alunos

### RN 02 - Gestão de Aulas
- ✅ Restrição de duração (30-120 min)
- ✅ Hierarquia de decisão (PENDENTE → CONFIRMADA)
- ✅ Confirmação de realização para faturação
- ✅ Sistema de remarcação

### RN 03 - Gestão de Figurinos
- ✅ Moderação de vendas no marketplace
- ✅ Bloqueio de inventário (ALUGADO/MANUTENCAO)

### RN 04 - Gestão de Eventos
- ✅ Redirecionamento externo para Ticketline
- ✅ Eventos visíveis publicamente

## Estrutura do Projeto

```
/src/app
  ├── components/       # Componentes reutilizáveis
  ├── contexts/         # Context API (Auth)
  ├── data/            # Dados mock
  ├── layouts/         # Layouts (Public, Dashboard)
  ├── pages/           # Páginas principais
  ├── types/           # TypeScript types
  └── routes.ts        # Configuração de rotas

/src/styles
  └── theme.css        # Tema e estilos globais
```

## Tecnologias Utilizadas

- React 18
- React Router 7 (Data Mode)
- TypeScript
- Tailwind CSS v4
- Lucide React (ícones)
- date-fns (formatação de datas)

## Próximos Passos (Para Implementação Real)

1. Integrar com backend real (Supabase sugerido)
2. Implementar autenticação JWT
3. Adicionar validação de conflitos de sala/professor
4. Implementar sistema de créditos/pack de horas
5. Sistema de notificações
6. Upload de imagens real
7. Relatórios e dashboards analíticos
8. Sistema de pagamentos
9. Calendário visual interativo
10. Chat/mensagens entre utilizadores
