import { Notificacao } from '../types';

const FALLBACK_BY_TYPE: Record<string, string> = {
  AULA_CONFIRMADA: '/dashboard',
  AULA_APROVADA: '/dashboard',
  AULA_REJEITADA: '/dashboard',
  AULA_CANCELADA: '/dashboard',
  AULA_REALIZADA: '/dashboard',
  AULA_REMARCADA: '/dashboard',
  PEDIDO_APROVADO: '/dashboard',
  PEDIDO_REJEITADO: '/dashboard',
  PEDIDO_NOVO: '/dashboard',
  PEDIDO_REJEITADO_AUTO: '/dashboard',
  SUGESTAO_REMARCACAO_DIRECAO: '/dashboard',
  SUGESTAO_REMARCACAO_EE: '/dashboard',
  SUGESTAO_REMARCACAO_PROFESSOR: '/dashboard',
  REMARCACAO_REJEITADA_PROFESSOR: '/dashboard',
  REMARCACAO_REJEITADA_DIRECAO: '/dashboard',
  SUGESTAO_EXPIRADA: '/dashboard',
  ALUNO_ASSOCIADO_PEDIDO: '/dashboard',
  ALUNO_INSCRITO_AULA: '/dashboard',
  GRUPO_INSCRICAO: '/dashboard/grupos',
  GRUPO_REMOCAO: '/dashboard/grupos',
  GRUPO_FECHADO: '/dashboard/grupos',
  GRUPO_ABERTO: '/dashboard/grupos',
  GRUPO_ARQUIVADO: '/dashboard/grupos',
  ANUNCIO_APROVADO: '/dashboard/marketplace',
  ANUNCIO_REJEITADO: '/dashboard/marketplace',
  ANUNCIO_PENDENTE: '/dashboard/marketplace',
  ALUGUER_RESERVA: '/dashboard/marketplace?view=reservas',
  STOCK_BAIXO: '/dashboard/stock',
  EVENTO_PUBLICADO: '/eventos',
  EVENTO_REMARCADO: '/eventos',
};

const ROUTE_BY_REFERENCE_TYPE: Record<string, string> = {
  coaching: '/dashboard',
  turma: '/dashboard/grupos',
  anuncio: '/dashboard/marketplace',
  aluguer: '/dashboard/marketplace',
  figurino: '/dashboard/stock',
  evento: '/eventos',
};

export function getNotificationDestination(notificacao: Notificacao): string {
  const refId = notificacao.referencia_id;
  const refType = notificacao.referencia_tipo?.toLowerCase();

  if (refId && refType && ROUTE_BY_REFERENCE_TYPE[refType]) {
    const route = ROUTE_BY_REFERENCE_TYPE[refType];
    const params = new URLSearchParams({ ref: String(refId), refType });

    if (refType === 'aluguer') params.set('view', 'reservas');

    return `${route}?${params.toString()}`;
  }

  return FALLBACK_BY_TYPE[notificacao.tipo] ?? '/dashboard';
}
