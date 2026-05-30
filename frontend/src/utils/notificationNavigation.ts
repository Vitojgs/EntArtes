import { Notificacao } from '../types';

const FALLBACK_BY_TYPE: Record<string, string> = {
  AULA_CONFIRMADA: '/dashboard/coaching',
  AULA_APROVADA: '/dashboard/coaching',
  AULA_REJEITADA: '/dashboard/coaching',
  AULA_CANCELADA: '/dashboard/coaching',
  AULA_REALIZADA: '/dashboard/coaching',
  AULA_REMARCADA: '/dashboard/coaching',
  PEDIDO_APROVADO: '/dashboard/coaching',
  PEDIDO_REJEITADO: '/dashboard/coaching',
  PEDIDO_NOVO: '/dashboard/coaching',
  PEDIDO_REJEITADO_AUTO: '/dashboard/coaching',
  SUGESTAO_REMARCACAO_DIRECAO: '/dashboard/coaching',
  SUGESTAO_REMARCACAO_EE: '/dashboard/coaching',
  SUGESTAO_REMARCACAO_PROFESSOR: '/dashboard/coaching',
  REMARCACAO_REJEITADA_PROFESSOR: '/dashboard/coaching',
  REMARCACAO_REJEITADA_DIRECAO: '/dashboard/coaching',
  SUGESTAO_EXPIRADA: '/dashboard/coaching',
  ALUNO_ASSOCIADO_PEDIDO: '/dashboard/coaching',
  ALUNO_INSCRITO_AULA: '/dashboard/coaching',
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
  coaching: '/dashboard/coaching',
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
