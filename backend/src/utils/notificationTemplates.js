const formatDate = (value) => {
  if (!value) return '';
  return value instanceof Date
    ? value.toLocaleDateString('pt-PT')
    : String(value);
};

const formatTime = (value) => {
  if (!value) return '';
  if (value instanceof Date) {
    return `${String(value.getUTCHours()).padStart(2, '0')}:${String(value.getUTCMinutes()).padStart(2, '0')}`;
  }
  return String(value).substring(0, 5);
};

const withHora = (hora) => hora ? ` às ${formatTime(hora)}` : '';
const withMotivo = (motivo) => motivo ? ` Motivo: ${motivo}.` : '';

export const NotificationType = Object.freeze({
  PEDIDO_NOVO: 'PEDIDO_NOVO',
  PEDIDO_APROVADO: 'PEDIDO_APROVADO',
  PEDIDO_REJEITADO: 'PEDIDO_REJEITADO',
  PEDIDO_REJEITADO_AUTO: 'PEDIDO_REJEITADO_AUTO',

  AULA_APROVADA: 'AULA_APROVADA',
  AULA_CONFIRMADA: 'AULA_CONFIRMADA',
  AULA_REJEITADA: 'AULA_REJEITADA',
  AULA_CANCELADA: 'AULA_CANCELADA',
  AULA_REALIZADA: 'AULA_REALIZADA',
  AULA_REMARCADA: 'AULA_REMARCADA',
  AULA_REABERTA: 'AULA_REABERTA',

  SUGESTAO_REMARCACAO_PROFESSOR: 'SUGESTAO_REMARCACAO_PROFESSOR',
  SUGESTAO_REMARCACAO_EE: 'SUGESTAO_REMARCACAO_EE',
  SUGESTAO_REMARCACAO_DIRECAO: 'SUGESTAO_REMARCACAO_DIRECAO',
  REMARCACAO_REJEITADA_PROFESSOR: 'REMARCACAO_REJEITADA_PROFESSOR',
  SUGESTAO_EXPIRADA: 'SUGESTAO_EXPIRADA',

  ALUNO_INSCRITO_AULA: 'ALUNO_INSCRITO_AULA',
  ALUNO_ASSOCIADO_PEDIDO: 'ALUNO_ASSOCIADO_PEDIDO',

  GRUPO_INSCRICAO: 'GRUPO_INSCRICAO',
  GRUPO_REMOCAO: 'GRUPO_REMOCAO',
  GRUPO_FECHADO: 'GRUPO_FECHADO',
  GRUPO_ABERTO: 'GRUPO_ABERTO',
  GRUPO_ARQUIVADO: 'GRUPO_ARQUIVADO',

  EVENTO_PUBLICADO: 'EVENTO_PUBLICADO',

  ANUNCIO_APROVADO: 'ANUNCIO_APROVADO',
  ANUNCIO_REJEITADO: 'ANUNCIO_REJEITADO',
  ANUNCIO_PENDENTE: 'ANUNCIO_PENDENTE',
  ANUNCIO_REMOVIDO: 'ANUNCIO_REMOVIDO',

  ALUGUER_RESERVA: 'ALUGUER_RESERVA',
  STOCK_BAIXO: 'STOCK_BAIXO',
});

export const ReferenciaTipo = Object.freeze({
  COACHING: 'coaching',
  TURMA: 'turma',
  ANUNCIO: 'anuncio',
  EVENTO: 'evento',
  ALUGUER: 'aluguer',
  FIGURINO: 'figurino',
});

export const notificationTemplates = {
  pedidoNovoDirecao: ({ encarregadoNome = 'Um encarregado de educação', professorNome = 'Professor', data, hora }) => ({
    tipo: NotificationType.PEDIDO_NOVO,
    mensagem: `Novo pedido de coaching: ${encarregadoNome} solicitou coaching com ${professorNome} para ${formatDate(data)}${withHora(hora)}.`,
    referencia_tipo: ReferenciaTipo.COACHING,
  }),

  pedidoNovoProfessor: ({ encarregadoNome = 'um encarregado de educação', data, hora }) => ({
    tipo: NotificationType.PEDIDO_NOVO,
    mensagem: `Tem um novo pedido de coaching de ${encarregadoNome} para ${formatDate(data)}${withHora(hora)}.`,
    referencia_tipo: ReferenciaTipo.COACHING,
  }),

  pedidoAprovadoEncarregado: ({ data, hora }) => ({
    tipo: NotificationType.AULA_APROVADA,
    mensagem: `O seu coaching para ${formatDate(data)}${withHora(hora)} foi aprovado.`,
    referencia_tipo: ReferenciaTipo.COACHING,
  }),

  pedidoAprovadoProfessor: ({ data, hora }) => ({
    tipo: NotificationType.AULA_CONFIRMADA,
    mensagem: `Foi confirmado um novo coaching para ${formatDate(data)}${withHora(hora)}.`,
    referencia_tipo: ReferenciaTipo.COACHING,
  }),

  pedidoRejeitado: ({ motivo }) => ({
    tipo: NotificationType.AULA_REJEITADA,
    mensagem: `O seu pedido de coaching foi rejeitado.${withMotivo(motivo)} Pode consultar novas disponibilidades e submeter outro pedido.`,
    referencia_tipo: ReferenciaTipo.COACHING,
  }),

  pedidoRejeitadoAuto: ({ data }) => ({
    tipo: NotificationType.PEDIDO_REJEITADO_AUTO,
    mensagem: `O seu pedido de coaching para ${formatDate(data)} foi rejeitado automaticamente por não ter sido avaliado dentro do prazo. Pode submeter um novo pedido.`,
    referencia_tipo: ReferenciaTipo.COACHING,
  }),

  aulaCancelada: ({ data, hora, origem = 'direção' } = {}) => ({
    tipo: NotificationType.AULA_CANCELADA,
    mensagem: `O coaching${data ? ` de ${formatDate(data)}${withHora(hora)}` : ''} foi cancelado pela ${origem}.`,
    referencia_tipo: ReferenciaTipo.COACHING,
  }),

  aulaRealizada: ({ data }) => ({
    tipo: NotificationType.AULA_REALIZADA,
    mensagem: `O coaching de ${formatDate(data)} foi confirmado como realizado.`,
    referencia_tipo: ReferenciaTipo.COACHING,
  }),

  aulaRemarcada: ({ id, data, hora }) => ({
    tipo: NotificationType.AULA_REMARCADA,
    mensagem: `Coaching #${id} remarcado para ${formatDate(data)}${withHora(hora)}.`,
    referencia_tipo: ReferenciaTipo.COACHING,
  }),

  sugestaoProfessor: ({ id, data, hora }) => ({
    tipo: NotificationType.SUGESTAO_REMARCACAO_PROFESSOR,
    mensagem: `A Direção propôs remarcar o coaching #${id} para ${formatDate(data)}${withHora(hora)}. Confirme se aceita.`,
    referencia_tipo: ReferenciaTipo.COACHING,
  }),

  sugestaoEncarregado: ({ id, data, hora, origem = 'A Direção' }) => ({
    tipo: NotificationType.SUGESTAO_REMARCACAO_EE,
    mensagem: `${origem} propôs remarcar o coaching #${id} para ${formatDate(data)}${withHora(hora)}. Confirme se aceita.`,
    referencia_tipo: ReferenciaTipo.COACHING,
  }),

  sugestaoDirecao: ({ id, professorNome = 'Professor', data, hora }) => ({
    tipo: NotificationType.SUGESTAO_REMARCACAO_DIRECAO,
    mensagem: `${professorNome} sugeriu remarcar o coaching #${id}${data ? ` para ${formatDate(data)}${withHora(hora)}` : ''}. A Direção deve aprovar ou propor nova data.`,
    referencia_tipo: ReferenciaTipo.COACHING,
  }),

  remarcacaoRejeitadaProfessor: ({ id }) => ({
    tipo: NotificationType.REMARCACAO_REJEITADA_PROFESSOR,
    mensagem: `O professor rejeitou a data proposta para o coaching #${id}. A Direção pode propor uma nova data.`,
    referencia_tipo: ReferenciaTipo.COACHING,
  }),

  remarcacaoRejeitadaDirecao: ({ id }) => ({
    tipo: NotificationType.REMARCACAO_REJEITADA_PROFESSOR,
    mensagem: `A Direção rejeitou o pedido de remarcação do coaching #${id}.`,
    referencia_tipo: ReferenciaTipo.COACHING,
  }),

  sugestaoExpirada: ({ id, participante = 'participante' }) => ({
    tipo: NotificationType.SUGESTAO_EXPIRADA,
    mensagem: `A sugestão de remarcação do coaching #${id} expirou sem resposta do ${participante}. O coaching foi cancelado.`,
    referencia_tipo: ReferenciaTipo.COACHING,
  }),

  alunoInscritoAula: ({ alunoNome, id }) => ({
    tipo: NotificationType.ALUNO_INSCRITO_AULA,
    mensagem: `O aluno ${alunoNome} inscreveu-se no coaching #${id}.`,
    referencia_tipo: ReferenciaTipo.COACHING,
  }),

  alunoAssociadoPedido: ({ id }) => ({
    tipo: NotificationType.ALUNO_ASSOCIADO_PEDIDO,
    mensagem: `Foi associado ao pedido de coaching #${id}.`,
    referencia_tipo: ReferenciaTipo.COACHING,
  }),

  grupoInscricaoEncarregado: ({ alunoNome, grupoNome }) => ({
    tipo: NotificationType.GRUPO_INSCRICAO,
    mensagem: `O seu educando ${alunoNome} foi inscrito no grupo "${grupoNome}".`,
    referencia_tipo: ReferenciaTipo.TURMA,
  }),

  grupoInscricaoProfessor: ({ alunoNome, grupoNome }) => ({
    tipo: NotificationType.GRUPO_INSCRICAO,
    mensagem: `Um novo aluno (${alunoNome}) foi inscrito no grupo "${grupoNome}".`,
    referencia_tipo: ReferenciaTipo.TURMA,
  }),

  grupoRemocaoEncarregado: ({ alunoNome, grupoNome }) => ({
    tipo: NotificationType.GRUPO_REMOCAO,
    mensagem: `O seu educando ${alunoNome} foi removido do grupo "${grupoNome}".`,
    referencia_tipo: ReferenciaTipo.TURMA,
  }),

  grupoRemocaoProfessor: ({ alunoNome, grupoNome }) => ({
    tipo: NotificationType.GRUPO_REMOCAO,
    mensagem: `O aluno ${alunoNome} foi removido do grupo "${grupoNome}".`,
    referencia_tipo: ReferenciaTipo.TURMA,
  }),

  grupoEstado: ({ grupoNome, estado, destinatario = 'professor' }) => {
    const mensagens = {
      FECHADO: destinatario === 'encarregado'
        ? `As inscrições do grupo "${grupoNome}" foram encerradas pela Direção.`
        : `O grupo "${grupoNome}" foi encerrado para novas inscrições.`,
      ABERTO: `O grupo "${grupoNome}" foi reaberto para inscrições.`,
      ARQUIVADO: destinatario === 'encarregado'
        ? `O grupo "${grupoNome}" foi arquivado. O seu educando já não terá aulas neste grupo.`
        : `O grupo "${grupoNome}" foi arquivado pela Direção.`,
    };
    const tipos = {
      FECHADO: NotificationType.GRUPO_FECHADO,
      ABERTO: NotificationType.GRUPO_ABERTO,
      ARQUIVADO: NotificationType.GRUPO_ARQUIVADO,
    };
    return {
      tipo: tipos[estado],
      mensagem: mensagens[estado],
      referencia_tipo: ReferenciaTipo.TURMA,
    };
  },

  eventoPublicado: ({ titulo, datas }) => ({
    tipo: NotificationType.EVENTO_PUBLICADO,
    mensagem: `Novo evento: "${titulo}" - ${datas}`,
    referencia_tipo: ReferenciaTipo.EVENTO,
  }),

  anuncioEstado: ({ anuncioId, estado, motivo }) => {
    const estadoUpper = String(estado || '').toUpperCase();
    const aprovado = estadoUpper === 'APROVADO';
    return {
      tipo: aprovado ? NotificationType.ANUNCIO_APROVADO : NotificationType.ANUNCIO_REJEITADO,
      mensagem: aprovado
        ? `O seu anúncio #${anuncioId} foi aprovado.`
        : `O seu anúncio #${anuncioId} foi rejeitado.${withMotivo(motivo)}`,
      referencia_tipo: ReferenciaTipo.ANUNCIO,
    };
  },

  anuncioPendente: ({ anuncioId }) => ({
    tipo: NotificationType.ANUNCIO_PENDENTE,
    mensagem: `Novo anúncio #${anuncioId} aguarda validação.`,
    referencia_tipo: ReferenciaTipo.ANUNCIO,
  }),

  anuncioRemovido: ({ modeloNome }) => ({
    tipo: NotificationType.ANUNCIO_REMOVIDO,
    mensagem: `O seu anúncio "${modeloNome}" foi removido pela Direção.`,
    referencia_tipo: ReferenciaTipo.ANUNCIO,
  }),

  aluguerReserva: ({ transacaoId, anuncioId }) => ({
    tipo: NotificationType.ALUGUER_RESERVA,
    mensagem: `Nova reserva #${transacaoId} para o anúncio #${anuncioId}.`,
    referencia_tipo: ReferenciaTipo.ALUGUER,
  }),

  aluguerEstado: ({ transacaoId, estado }) => ({
    tipo: `ALUGUER_${String(estado || '').toUpperCase()}`,
    mensagem: `A sua reserva #${transacaoId} foi atualizada para ${estado}.`,
    referencia_tipo: ReferenciaTipo.ALUGUER,
  }),

  stockBaixo: ({ figurinoId, quantidade, stockMinimo }) => ({
    tipo: NotificationType.STOCK_BAIXO,
    mensagem: `Alerta de stock: o figurino #${figurinoId} tem apenas ${quantidade} unidades disponíveis (mínimo: ${stockMinimo}).`,
    referencia_tipo: ReferenciaTipo.FIGURINO,
  }),
};

export function buildNotification(templateName, params = {}) {
  const template = notificationTemplates[templateName];
  if (!template) {
    throw new Error(`Template de notificação não encontrado: ${templateName}`);
  }
  return template(params);
}
