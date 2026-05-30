import prisma from "../config/db.js";
import * as pedidosaulaService from '../services/pedidocoaching.service.js';
import * as notificacoesService from '../services/notificacoes.service.js';
import { buildNotification } from '../utils/notificationTemplates.js';

export async function getAllPedidosAula(req, reply) {
  try {
    const pedidos = await pedidosaulaService.getAllPedidosAula();
    return { success: true, data: pedidos };
  } catch (error) {
    console.error('Error getting pedidos:', error);
    return reply.status(500).send({ success: false, error: error.message });
  }
}

export async function obterPedido(req, reply) {
  try {
    const { id } = req.params;
    const pedido = await pedidosaulaService.obterPedido(id);
    
    if (!pedido) {
      return reply.status(404).send({ success: false, error: 'Pedido não encontrado' });
    }
    
    return { success: true, data: pedido };
  } catch (error) {
    console.error('Error getting pedido:', error);
    return reply.status(500).send({ success: false, error: error.message });
  }
}

export async function getMyPedidos(req, reply) {
  try {
    const userId = req.user.id;
    const pedidos = await pedidosaulaService.getPedidosByEncarregado(userId);
    return { success: true, data: pedidos };
  } catch (error) {
    console.error('Error getting my pedidos:', error);
    return reply.status(500).send({ success: false, error: error.message });
  }
}

export async function getPedidosPendentes(req, reply) {
  try {
    const pedidos = await pedidosaulaService.getPedidosPendentes();
    return { success: true, data: pedidos };
  } catch (error) {
    console.error('Error getting pending pedidos:', error);
    return reply.status(500).send({ success: false, error: error.message });
  }
}

export async function submeterPedidoAula(req, reply) {
  try {
    const userId = req.user.id;
    const { 
      data: dataAula, 
      horainicio, 
      duracaoaula,
      maxparticipantes,
      privacidade,
      disponibilidade_mensal_id,
      grupoidgrupo,
      salaidsala
    } = req.body;

    if (!dataAula || !horainicio) {
      return reply.status(400).send({
        success: false,
        error: 'Campos obrigatórios: data, horainicio'
      });
    }

    const pedido = await pedidosaulaService.submeterPedidoAula({
      data: dataAula,
      horainicio,
      duracaoaula: duracaoaula || '01:00',
      maxparticipantes: maxparticipantes || 10,
      privacidade: privacidade || false,
      disponibilidade_mensal_id,
      grupoidgrupo,
      salaidsala,
      encarregadoeducacaoutilizadoriduser: userId
    });

    const direcao = await prisma.direcao.findFirst();
    if (direcao) {
      const eeNome = pedido?.encarregadoeducacao?.utilizador?.nome || 'Um encarregado de educação';
      const profNome = pedido?.disponibilidade_mensal?.professor?.utilizador?.nome || 'Professor';
      const notificacao = buildNotification('pedidoNovoDirecao', {
        encarregadoNome: eeNome,
        professorNome: profNome,
        data: pedido?.data || dataAula,
        hora: horainicio,
      });
      await notificacoesService.createNotificacao(
        direcao.utilizadoriduser,
        notificacao.mensagem,
        notificacao.tipo,
        pedido.idpedidoaula,
        notificacao.referencia_tipo
      );
    }

    const professorUserId = pedido?.disponibilidade_mensal?.professor?.utilizadoriduser;
    if (professorUserId) {
      const eeNome = pedido?.encarregadoeducacao?.utilizador?.nome || 'Um encarregado de educação';
      const notificacao = buildNotification('pedidoNovoProfessor', {
        encarregadoNome: eeNome,
        data: pedido?.data || dataAula,
        hora: horainicio,
      });
      await notificacoesService.createNotificacao(
        professorUserId,
        notificacao.mensagem,
        notificacao.tipo,
        pedido.idpedidoaula,
        notificacao.referencia_tipo
      );
    }

    return { success: true, data: pedido, message: 'Pedido submetido com sucesso!' };
  } catch (error) {
    console.error('Error creating pedido:', error);
    return reply.status(500).send({ success: false, error: error.message });
  }
}

export async function approvePedidoAula(req, reply) {
  try {
    const { id } = req.params;

    const pedido = await pedidosaulaService.updatePedidoAulaStatus(id, 'CONFIRMADO');

    if (pedido?.encarregadoeducacao) {
      const notificacao = buildNotification('pedidoAprovadoEncarregado', {
        data: pedido?.data,
        hora: pedido?.horainicio,
      });
      await notificacoesService.createNotificacao(
        pedido.encarregadoeducacao.utilizadoriduser,
        notificacao.mensagem,
        notificacao.tipo,
        parseInt(id),
        notificacao.referencia_tipo
      );
    }

    const professorId = pedido?.disponibilidade_mensal?.professor?.utilizadoriduser;
    if (professorId) {
      const notificacao = buildNotification('pedidoAprovadoProfessor', {
        data: pedido?.data,
        hora: pedido?.horainicio,
      });
      await notificacoesService.createNotificacao(
        professorId,
        notificacao.mensagem,
        notificacao.tipo,
        parseInt(id),
        notificacao.referencia_tipo
      );
    }

    return {
      success: true,
      data: pedido,
      message: 'Pedido aprovado! Aula confirmada.'
    };
  } catch (error) {
    console.error('Error approving pedido:', error);
    return reply.status(500).send({ success: false, error: error.message });
  }
}

export async function rejectPedidoAula(req, reply) {
  try {
    const { id } = req.params;
    const { motivo } = req.body;
    
    const pedido = await pedidosaulaService.updatePedidoAulaStatus(id, 'REJEITADO');
    
    if (pedido?.encarregadoeducacao) {
      const notificacao = buildNotification('pedidoRejeitado', { motivo });
      await notificacoesService.createNotificacao(
        pedido.encarregadoeducacao.utilizadoriduser,
        notificacao.mensagem,
        notificacao.tipo,
        parseInt(id),
        notificacao.referencia_tipo
      );
    }
    
    return { 
      success: true, 
      data: pedido, 
      message: 'Pedido rejeitado.' 
    };
  } catch (error) {
    console.error('Error rejecting pedido:', error);
    return reply.status(500).send({ success: false, error: error.message });
  }
}

export async function deletePedidoAula(req, reply) {
  try {
    const { id } = req.params;
    
    await pedidosaulaService.deletePedidoAula(id);
    
    return { success: true, message: 'Pedido eliminado com sucesso!' };
  } catch (error) {
    console.error('Error deleting pedido:', error);
    return reply.status(500).send({ success: false, error: error.message });
  }
}