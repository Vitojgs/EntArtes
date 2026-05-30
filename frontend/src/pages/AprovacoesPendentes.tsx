import { useState, useEffect } from 'react';
import api from '../services/api';
import { User, CalendarDays, Music2, CheckCircle, XCircle, Loader, AlertCircle, Clock, Search } from 'lucide-react';
import { toast } from 'sonner';

export function AprovacoesPendentes() {
  const [pedidos, setPedidos] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState<number | null>(null);

  const fetchPendentes = async () => {
    setLoading(true);
    try {
      const res = await api.getAlteracoesPendentes();
      if (res.success) setPedidos(res.data);
    } catch { void 0 }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchPendentes(); }, []);

  const handleAprovar = async (pedidoId: number) => {
    setProcessing(pedidoId);
    try {
      const res = await api.aprovarAlteracaoPerfil(pedidoId);
      if (res.success) {
        toast.success('Alteração aprovada com sucesso!');
        fetchPendentes();
      } else {
        toast.error(res.error || 'Erro ao aprovar');
      }
    } catch (err: any) {
      toast.error(err.message || 'Erro ao aprovar');
    } finally { setProcessing(null); }
  };

  const handleRejeitar = async (pedidoId: number) => {
    const motivo = prompt('Motivo da rejeição (opcional):');
    setProcessing(pedidoId);
    try {
      const res = await api.rejeitarAlteracaoPerfil(pedidoId, motivo || undefined);
      if (res.success) {
        toast.success('Alteração rejeitada');
        fetchPendentes();
      } else {
        toast.error(res.error || 'Erro ao rejeitar');
      }
    } catch (err: any) {
      toast.error(err.message || 'Erro ao rejeitar');
    } finally { setProcessing(null); }
  };

  return (
    <div className="p-4 sm:p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-[#0a1a17]">Aprovações Pendentes</h1>
        <span className="text-sm bg-amber-100 text-amber-700 px-3 py-1 rounded-full font-medium">
          {pedidos.length} pedido{pedidos.length !== 1 ? 's' : ''}
        </span>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader className="w-6 h-6 animate-spin text-[#0d6b5e]" />
        </div>
      ) : pedidos.length === 0 ? (
        <div className="bg-white rounded-xl border border-[#0d6b5e]/10 p-8 text-center">
          <CheckCircle className="w-12 h-12 text-green-500 mx-auto mb-3" />
          <p className="text-[#4d7068] text-lg font-medium">Nenhum pedido pendente</p>
          <p className="text-[#4d7068] text-sm mt-1">Todos os pedidos de alteração foram processados.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {pedidos.map((pedido: any) => (
            <div key={pedido.idpedidoalteracao} className="bg-white rounded-xl border border-[#0d6b5e]/10 p-5 shadow-sm">
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-start gap-3">
                  <div className="bg-amber-100 rounded-full p-2">
                    <Clock className="w-5 h-5 text-amber-600" />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-[#0a1a17]">
                      {pedido.aluno?.utilizador?.nome}
                    </h3>
                    <p className="text-sm text-[#4d7068]">
                      Solicitado por {pedido.solicitante?.nome} em {new Date(pedido.dataSolicitacao).toLocaleDateString('pt-PT')}
                    </p>
                  </div>
                </div>
                <span className="text-xs bg-amber-100 text-amber-700 font-semibold px-2.5 py-1 rounded-full">
                  Pendente
                </span>
              </div>

              <div className="grid sm:grid-cols-2 gap-4 mb-4">
                {pedido.novodataNascimento && (
                  <div className="bg-[#f4f9f8] rounded-lg p-3">
                    <p className="text-xs text-[#4d7068] font-medium mb-1 flex items-center gap-1">
                      <CalendarDays className="w-3.5 h-3.5" />
                      Data de Nascimento
                    </p>
                    <p className="text-sm text-[#0a1a17] font-medium">
                      {new Date(pedido.novodataNascimento).toLocaleDateString('pt-PT')}
                    </p>
                    {pedido.aluno?.utilizador?.dataNascimento && (
                      <p className="text-xs text-[#4d7068] mt-1">
                        Atual: {new Date(pedido.aluno.utilizador.dataNascimento).toLocaleDateString('pt-PT')}
                      </p>
                    )}
                  </div>
                )}
                {pedido.novasmodalidades && (
                  <div className="bg-[#f4f9f8] rounded-lg p-3">
                    <p className="text-xs text-[#4d7068] font-medium mb-1 flex items-center gap-1">
                      <Music2 className="w-3.5 h-3.5" />
                      Modalidades
                    </p>
                    <div className="flex flex-wrap gap-1.5">
                      {JSON.parse(pedido.novasmodalidades).map((modId: number) => {
                        const mod = pedido.aluno?.modalidadealuno?.find(
                          (ma: any) => ma.modalidadeidmodalidade === modId || ma.modalidade?.idmodalidade === modId
                        );
                        return (
                          <span key={modId} className="bg-[#0d6b5e]/10 text-[#0d6b5e] text-xs px-2 py-0.5 rounded-full">
                            {mod?.modalidade?.nome || `ID ${modId}`}
                          </span>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>

              <div className="flex items-center gap-3 pt-3 border-t border-[#0d6b5e]/10">
                <button
                  onClick={() => handleAprovar(pedido.idpedidoalteracao)}
                  disabled={processing === pedido.idpedidoalteracao}
                  className="flex items-center gap-2 bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors text-sm font-semibold disabled:opacity-50"
                >
                  {processing === pedido.idpedidoalteracao ? (
                    <Loader className="w-4 h-4 animate-spin" />
                  ) : (
                    <CheckCircle className="w-4 h-4" />
                  )}
                  Aprovar
                </button>
                <button
                  onClick={() => handleRejeitar(pedido.idpedidoalteracao)}
                  disabled={processing === pedido.idpedidoalteracao}
                  className="flex items-center gap-2 bg-red-50 text-red-600 border border-red-200 px-4 py-2 rounded-lg hover:bg-red-100 transition-colors text-sm font-semibold disabled:opacity-50"
                >
                  <XCircle className="w-4 h-4" />
                  Rejeitar
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
