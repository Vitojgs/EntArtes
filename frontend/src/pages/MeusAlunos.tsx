import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import api from '../services/api';
import { User, CalendarDays, Music2, Send, Clock, CheckCircle2, XCircle, Loader, AlertCircle, Users } from 'lucide-react';
import { toast } from 'sonner';

export function MeusAlunos() {
  const { user } = useAuth();
  const [alunos, setAlunos] = useState<any[]>([]);
  const [modalidades, setModalidades] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [solicitacoes, setSolicitacoes] = useState<any[]>([]);
  const [selectedAluno, setSelectedAluno] = useState<any | null>(null);
  const [filtroAlunoId, setFiltroAlunoId] = useState<string | null>(null);
  const [novoDataNasc, setNovoDataNasc] = useState('');
  const [novasMods, setNovasMods] = useState<number[]>([]);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!user?.alunosIds?.length) {
      setLoading(false);
      return;
    }

    Promise.all(
      user.alunosIds.map(id =>
        api.request<{ success: boolean; data: any }>(`/api/users/${id}`).then(r => r.data)
      )
    )
      .then(usersData => {
        setAlunos(usersData.filter(Boolean));
      })
      .catch(() => {})
      .finally(() => setLoading(false));

    api.getModalidades()
      .then(res => { if (res.success) setModalidades(res.data); })
      .catch(() => {});

    api.getMinhasSolicitacoesAlteracao()
      .then(res => { if (res.success) setSolicitacoes(res.data); })
      .catch(() => {});
  }, [user]);

  const handleSolicitar = async (alunoId: string) => {
    if (!novoDataNasc && !novasMods.length) {
      toast.error('Seleciona pelo menos um campo para alterar');
      return;
    }
    setSubmitting(true);
    try {
      const res = await api.solicitarAlteracaoPerfil(alunoId, {
        novodataNascimento: novoDataNasc || undefined,
        novasmodalidades: novasMods.length ? novasMods : undefined,
      });
      if (res.success) {
        toast.success('Pedido de alteração enviado para aprovação da Direção');
        setSelectedAluno(null);
        setNovoDataNasc('');
        setNovasMods([]);
        const solRes = await api.getMinhasSolicitacoesAlteracao();
        if (solRes.success) setSolicitacoes(solRes.data);
      } else {
        toast.error(res.error || 'Erro ao solicitar alteração');
      }
    } catch (err: any) {
      toast.error(err.message || 'Erro ao solicitar alteração');
    } finally {
      setSubmitting(false);
    }
  };

  if (!user?.alunosIds?.length) {
    return (
      <div className="p-6">
        <h1 className="text-2xl font-bold text-[#0a1a17] mb-4">Os Meus Alunos</h1>
        <div className="bg-white rounded-xl border border-[#0d6b5e]/10 p-8 text-center">
          <AlertCircle className="w-12 h-12 text-[#4d7068] mx-auto mb-3" />
          <p className="text-[#4d7068]">Não tens alunos associados à tua conta.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 space-y-6">
      <h1 className="text-2xl font-bold text-[#0a1a17]">Os Meus Alunos</h1>

      {alunos.length > 1 && (
        <div className="flex items-center gap-2 flex-wrap">
          <Users className="w-4 h-4 text-[#4d7068]" />
          <button
            onClick={() => { setFiltroAlunoId(null); setSelectedAluno(null); }}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
              filtroAlunoId === null
                ? 'bg-[#0d6b5e] text-white'
                : 'bg-[#f4f9f8] text-[#0a1a17] border border-[#0d6b5e]/10 hover:border-[#0d6b5e]/30'
            }`}
          >
            Todos
          </button>
          {alunos.map(a => (
            <button
              key={a.id}
              onClick={() => { setFiltroAlunoId(a.id); setSelectedAluno(null); }}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                filtroAlunoId === a.id
                  ? 'bg-[#0d6b5e] text-white'
                  : 'bg-[#f4f9f8] text-[#0a1a17] border border-[#0d6b5e]/10 hover:border-[#0d6b5e]/30'
              }`}
            >
              {a.nome}
            </button>
          ))}
        </div>
      )}

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader className="w-6 h-6 animate-spin text-[#0d6b5e]" />
        </div>
      ) : (
        <div className="grid gap-6">
          {(filtroAlunoId ? alunos.filter((a: any) => a.id === filtroAlunoId) : alunos).map((aluno: any) => (
            <div key={aluno.id} className="bg-white rounded-xl border border-[#0d6b5e]/10 p-5 shadow-sm">
              <div className="flex items-start justify-between mb-4">
                <div>
                  <h3 className="text-lg font-semibold text-[#0a1a17] flex items-center gap-2">
                    <User className="w-5 h-5 text-[#0d6b5e]" />
                    {aluno.nome}
                  </h3>
                  {aluno.dataNascimento && (
                    <p className="text-sm text-[#4d7068] mt-1">
                      <CalendarDays className="w-3.5 h-3.5 inline mr-1" />
                      {new Date(aluno.dataNascimento).toLocaleDateString('pt-PT')}
                    </p>
                  )}
                  {aluno.nivel && (
                    <p className="text-sm text-[#4d7068]">
                      <span className="font-medium">Nível:</span> {aluno.nivel}
                    </p>
                  )}
                </div>
                <button
                  onClick={() => {
                    setSelectedAluno(selectedAluno?.id === aluno.id ? null : aluno);
                    setNovoDataNasc(aluno.dataNascimento?.split('T')[0] || '');
                    setNovasMods(aluno.modalidades?.map((m: any) => m.id || m.modalidadeidmodalidade) || []);
                  }}
                  className="text-sm bg-[#0d6b5e] text-white px-4 py-2 rounded-lg hover:bg-[#065147] transition-colors"
                >
                  {selectedAluno?.id === aluno.id ? 'Cancelar' : 'Solicitar Alteração'}
                </button>
              </div>

              {aluno.modalidades?.length > 0 && (
                <div className="flex flex-wrap gap-1.5">
                  {aluno.modalidades.map((m: any) => (
                    <span key={m.id || m.modalidadeidmodalidade} className="bg-[#0d6b5e]/10 text-[#0d6b5e] text-xs px-2.5 py-1 rounded-full font-medium">
                      {m.nome || m.modalidade?.nome}
                    </span>
                  ))}
                </div>
              )}

              {/* Solicitacao Form */}
              {selectedAluno?.id === aluno.id && (
                <div className="mt-4 pt-4 border-t border-[#0d6b5e]/10 space-y-4">
                  <h4 className="text-sm font-semibold text-[#0a1a17]">Pedir Alteração</h4>
                  <p className="text-xs text-[#4d7068]">As alterações ficam PENDENTES até aprovação da Direção.</p>

                  <div>
                    <label className="flex items-center gap-2 text-sm text-[#0a1a17] font-medium mb-1">
                      <CalendarDays className="w-4 h-4 text-[#0d6b5e]" />
                      Data de Nascimento
                    </label>
                    <input
                      type="date"
                      value={novoDataNasc}
                      onChange={e => setNovoDataNasc(e.target.value)}
                      className="w-full border border-[#0d6b5e]/20 rounded-lg px-3 py-2 text-sm bg-white text-[#0a1a17] focus:outline-none focus:border-[#0d6b5e]"
                    />
                  </div>

                  <div>
                    <label className="flex items-center gap-2 text-sm text-[#0a1a17] font-medium mb-1">
                      <Music2 className="w-4 h-4 text-[#0d6b5e]" />
                      Modalidades
                    </label>
                    <div className="flex flex-wrap gap-2">
                      {modalidades.map((mod: any) => {
                        const checked = novasMods.includes(mod.idmodalidade);
                        return (
                          <label
                            key={mod.idmodalidade}
                            className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border text-sm cursor-pointer transition-colors ${
                              checked
                                ? 'bg-[#0d6b5e] text-white border-[#0d6b5e]'
                                : 'bg-[#f4f9f8] text-[#0a1a17] border-[#0d6b5e]/10 hover:border-[#0d6b5e]/30'
                            }`}
                          >
                            <input
                              type="checkbox"
                              checked={checked}
                              onChange={() => setNovasMods(prev =>
                                prev.includes(mod.idmodalidade)
                                  ? prev.filter(v => v !== mod.idmodalidade)
                                  : [...prev, mod.idmodalidade]
                              )}
                              className="sr-only"
                            />
                            {mod.nome}
                          </label>
                        );
                      })}
                    </div>
                  </div>

                  <button
                    onClick={() => handleSolicitar(aluno.id)}
                    disabled={submitting}
                    className="flex items-center gap-2 bg-[#c9a84c] text-[#0a1a17] px-5 py-2 rounded-lg hover:bg-[#e8c97a] transition-colors text-sm font-semibold disabled:opacity-50"
                  >
                    {submitting ? (
                      <Loader className="w-4 h-4 animate-spin" />
                    ) : (
                      <Send className="w-4 h-4" />
                    )}
                    {submitting ? 'A enviar…' : 'Solicitar Aprovação'}
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Histórico de Solicitações */}
      {solicitacoes.length > 0 && (
        <div className="bg-white rounded-xl border border-[#0d6b5e]/10 p-5 shadow-sm">
          <h2 className="text-lg font-semibold text-[#0a1a17] mb-4">Histórico de Solicitações</h2>
          <div className="space-y-3">
            {solicitacoes.map((sol: any) => (
              <div key={sol.idpedidoalteracao} className="flex items-center justify-between py-2 border-b border-[#0d6b5e]/5 last:border-0">
                <div className="text-sm">
                  <span className="text-[#0a1a17] font-medium">{sol.aluno?.utilizador?.nome}</span>
                  <span className="text-[#4d7068] ml-2">
                    {new Date(sol.dataSolicitacao).toLocaleDateString('pt-PT')}
                  </span>
                </div>
                <span className={`text-xs font-semibold px-2 py-1 rounded-full ${
                  sol.status === 'APROVADO' ? 'bg-green-100 text-green-700' :
                  sol.status === 'REJEITADO' ? 'bg-red-100 text-red-700' :
                  'bg-amber-100 text-amber-700'
                }`}>
                  {sol.status === 'APROVADO' ? 'Aprovado' : sol.status === 'REJEITADO' ? 'Rejeitado' : 'Pendente'}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
