import { useState, useMemo } from 'react';
import { X, CheckCircle, XCircle, Bell, Filter, Calendar, Clock, User, MapPin, Music2, AlertCircle } from 'lucide-react';
import { PedidoAula } from '../types';
import api from '../services/api';
import { DirecaoModals } from './DirecaoModals';
import { toast } from 'sonner';

interface DashboardCoachingModalProps {
  open: boolean;
  initialTab: 'marcar' | 'agenda';
  aulas: PedidoAula[];
  estudios: { id: string; nome: string; capacidade?: number }[];
  onClose: () => void;
  onRefresh: () => void;
}

const MESES_PT = ['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez'];

function formatHora(v: any): string {
  if (!v) return '';
  const s = String(v);
  const raw = s.includes('T') ? s.substring(11, 16) : s.substring(0, 5);
  const [h, m] = raw.split(':').map(Number);
  if (isNaN(h) || isNaN(m)) return '';
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

const STATUS_BADGE: Record<string, { label: string; bg: string; text: string }> = {
  PENDENTE:   { label: 'Pendente',   bg: 'bg-[#fdf6e3]', text: 'text-[#c9a84c]' },
  CONFIRMADA: { label: 'Confirmado', bg: 'bg-[#e2f0ed]',  text: 'text-[#0d6b5e]' },
  REALIZADA:  { label: 'Realizado',  bg: 'bg-[#e2f0ed]',  text: 'text-[#0d6b5e]' },
  REJEITADA:  { label: 'Cancelado',  bg: 'bg-red-100',    text: 'text-red-700'   },
  CANCELADA:  { label: 'Cancelado',  bg: 'bg-red-100',    text: 'text-red-700'   },
  APROVADA:   { label: 'Aprovado',   bg: 'bg-blue-100',   text: 'text-blue-700'  },
};

export function DashboardCoachingModal({ open, initialTab, aulas, estudios, onClose, onRefresh }: DashboardCoachingModalProps) {
  const [activeTab, setActiveTab] = useState(initialTab);
  const [filtroStatus, setFiltroStatus] = useState<string>('TODAS');
  const [filtroProfessor, setFiltroProfessor] = useState<string>('TODOS');
  const [filtroEstudio, setFiltroEstudio] = useState<string>('TODOS');
  const [filtroModalidade, setFiltroModalidade] = useState<string>('TODAS');

  // Approve modal state
  const [aprovarModal, setAprovarModal] = useState<{ aulaId: string; salaId: string; slotEstudioId?: string } | null>(null);
  const [estudiosDisponiveis, setEstudiosDisponiveis] = useState<any[] | null>(null);

  // Reject modal state
  const [rejeitarModal, setRejeitarModal] = useState<string | null>(null);
  const [rejeitarMotivo, setRejeitarMotivo] = useState('');

  // DirecaoModals state (cancel/remarcar)
  const [direcaoCancelarModal, setDirecaoCancelarModal] = useState<string | null>(null);

  // Computed lists
  const professores = useMemo(() => {
    const set = new Set<string>();
    aulas.forEach(a => { if (a.professorNome) set.add(a.professorNome); });
    return Array.from(set).sort();
  }, [aulas]);

  const modalidades = useMemo(() => {
    const set = new Set<string>();
    aulas.forEach(a => { if (a.modalidade) set.add(a.modalidade); });
    return Array.from(set).sort();
  }, [aulas]);

  const pendentes = useMemo(() => {
    return aulas
      .filter(a => a.status === 'PENDENTE')
      .sort((a, b) => new Date(a.data).getTime() - new Date(b.data).getTime());
  }, [aulas]);

  const aulasFiltradas = useMemo(() => {
    let f = [...aulas];
    if (filtroStatus !== 'TODAS') f = f.filter(a => a.status === filtroStatus);
    if (filtroProfessor !== 'TODOS') f = f.filter(a => a.professorNome === filtroProfessor);
    if (filtroEstudio !== 'TODOS') f = f.filter(a => a.estudioId === filtroEstudio);
    if (filtroModalidade !== 'TODAS') f = f.filter(a => a.modalidade === filtroModalidade);
    return f.sort((a, b) => new Date(a.data).getTime() - new Date(b.data).getTime());
  }, [aulas, filtroStatus, filtroProfessor, filtroEstudio, filtroModalidade]);

  // ── Handlers ──

  const handleOpenAprovarModal = (aula: PedidoAula) => {
    const salaInicial = aula.estudioId || '';
    setAprovarModal({ aulaId: aula.id, salaId: salaInicial, slotEstudioId: aula.slotEstudioId || '' });
    setEstudiosDisponiveis(null);
    api.getSalasDisponiveis(aula.data, aula.horaInicio, aula.duracao, parseInt(aula.id))
      .then(res => {
        if (res.success) {
          const sorted = [...res.data].sort((a, b) => a.nome.localeCompare(b.nome, 'pt', { sensitivity: 'base' }));
          setEstudiosDisponiveis(sorted);
          if (!salaInicial) {
            const firstAvail = sorted.find((e: any) => e.disponivel);
            if (firstAvail) setAprovarModal(prev => prev ? { ...prev, salaId: String(firstAvail.id) } : prev);
          }
        }
      })
      .catch(() => {});
  };

  const handleAprovar = async (id: string, salaId?: number) => {
    try {
      await api.approveDirecaoAula(parseInt(id), salaId);
      setAprovarModal(null);
      toast.success('Coaching aprovado com sucesso!');
      onRefresh();
    } catch (error: any) {
      toast.error(error.message || 'Erro ao aprovar coaching');
    }
  };

  const handleRejeitar = (id: string) => {
    setRejeitarModal(id);
    setRejeitarMotivo('');
  };

  const handleConfirmarRejeitar = async () => {
    if (!rejeitarModal) return;
    try {
      await api.rejectDirecaoAula(parseInt(rejeitarModal), rejeitarMotivo);
      setRejeitarModal(null);
      setRejeitarMotivo('');
      toast.info('Coaching rejeitado.');
      onRefresh();
    } catch (error: any) {
      toast.error(error.message || 'Erro ao rejeitar coaching');
    }
  };

  const handleRemarcar = async (aulaId: string, novaData: string, novoHoraInicio: string, novoHoraFim: string, novoEstudioId: string, novoEstudioNome: string) => {
    try {
      await api.editarSalaDirecao(parseInt(aulaId), parseInt(novoEstudioId));
      setDirecaoCancelarModal(null);
      toast.success('Aula reagendada com sucesso!');
      onRefresh();
    } catch (error: any) {
      toast.error(error.message || 'Erro ao reagendar');
    }
  };

  const handleConfirmarRealizacao = async (id: string) => {
    try {
      await api.confirmarRealizacaoAula(parseInt(id));
      toast.success('Coaching confirmado como realizado!');
      onRefresh();
    } catch (error: any) {
      toast.error(error.message || 'Erro ao confirmar realização');
    }
  };

  const handleCancelar = async (id: string) => {
    try {
      await api.cancelarAulaDirecao(parseInt(id));
      setDirecaoCancelarModal(null);
      toast.success('Aula cancelada com sucesso!');
      onRefresh();
    } catch (error: any) {
      toast.error(error.message || 'Erro ao cancelar');
    }
  };

  if (!open) return null;

  // ── Render aula card ──

  const renderAulaCard = (aula: PedidoAula) => {
    const badge = STATUS_BADGE[aula.status] || STATUS_BADGE.PENDENTE;
    return (
      <div key={aula.id} className="bg-white rounded-2xl border border-[#0d6b5e]/5 shadow-sm p-5">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap mb-2">
              <h3 className="text-base text-[#0a1a17]" style={{ fontWeight: 600 }}>
                {aula.alunoNome || aula.modalidade || 'Coaching'}
              </h3>
              <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs ${badge.bg} ${badge.text}`} style={{ fontWeight: 500 }}>
                {badge.label}
              </span>
              {aula.modalidade && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-[#f4f9f8] text-[#4d7068] text-xs">
                  <Music2 className="w-3 h-3" />
                  {aula.modalidade}
                </span>
              )}
            </div>

            <div className="grid grid-cols-2 gap-x-4 gap-y-1.5 text-sm text-[#4d7068]">
              <div className="flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5 shrink-0" />
                <span>{new Date(aula.data).getDate()} {MESES_PT[new Date(aula.data).getMonth()]}</span>
              </div>
              <div className="flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 shrink-0" />
                <span>{formatHora(aula.horaInicio)} - {formatHora(aula.horaFim)}</span>
              </div>
              <div className="flex items-center gap-1.5">
                <User className="w-3.5 h-3.5 shrink-0" />
                <span className="truncate">Prof. {aula.professorNome || <span className="italic text-[#4d7068]/60">A definir</span>}</span>
              </div>
              <div className="flex items-center gap-1.5">
                <MapPin className="w-3.5 h-3.5 shrink-0" />
                <span className="truncate">{aula.estudioNome || <span className="italic text-[#4d7068]/60">Por atribuir</span>}</span>
              </div>
              {aula.alunoNome && (
                <div className="flex items-center gap-1.5 col-span-2">
                  <User className="w-3.5 h-3.5 shrink-0" />
                  <span>{aula.alunoNome}</span>
                </div>
              )}
            </div>
          </div>

          <div className="flex flex-col gap-2 shrink-0">
            {aula.status === 'PENDENTE' && (
              <>
                <button onClick={() => handleOpenAprovarModal(aula)}
                  className="flex items-center gap-1.5 bg-[#0d6b5e] text-white px-4 py-2 rounded-lg hover:bg-[#065147] transition-colors text-sm whitespace-nowrap">
                  <CheckCircle className="w-4 h-4" /> Aprovar
                </button>
                <button onClick={() => handleRejeitar(aula.id)}
                  className="flex items-center gap-1.5 bg-white border border-red-200 text-red-600 px-4 py-2 rounded-lg hover:bg-red-50 transition-colors text-sm whitespace-nowrap">
                  <XCircle className="w-4 h-4" /> Rejeitar
                </button>
              </>
            )}
            {aula.status === 'CONFIRMADA' && (
              <button onClick={() => handleConfirmarRealizacao(aula.id)}
                className="flex items-center gap-1.5 bg-[#0d6b5e] text-white px-4 py-2 rounded-lg hover:bg-[#065147] transition-colors text-sm whitespace-nowrap">
                <CheckCircle className="w-4 h-4" /> Realizado
              </button>
            )}
            {(aula.status === 'PENDENTE' || aula.status === 'CONFIRMADA') && (
              <button onClick={() => setDirecaoCancelarModal(aula.id)}
                className="flex items-center gap-1.5 bg-white border border-red-200 text-red-600 px-4 py-2 rounded-lg hover:bg-red-50 transition-colors text-sm whitespace-nowrap">
                <XCircle className="w-4 h-4" /> Cancelar
              </button>
            )}
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-start justify-center overflow-y-auto py-8">
      <div className="bg-[#f4f9f8] rounded-2xl shadow-xl w-full max-w-4xl mx-4 min-h-[70vh] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="bg-[#0a1a17] px-6 py-4 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <h2 className="text-lg text-white" style={{ fontWeight: 600 }}>Gestão de Coachings</h2>
            <div className="flex items-center gap-1.5 ml-2">
              <button onClick={() => setActiveTab('marcar')}
                className={`px-4 py-1.5 rounded-lg text-sm transition-colors ${activeTab === 'marcar' ? 'bg-[#c9a84c] text-[#0a1a17]' : 'bg-white/10 text-white/70 hover:bg-white/20'}`}
                style={{ fontWeight: activeTab === 'marcar' ? 600 : 400 }}>
                Aprovar Coachings
              </button>
              <button onClick={() => setActiveTab('agenda')}
                className={`px-4 py-1.5 rounded-lg text-sm transition-colors ${activeTab === 'agenda' ? 'bg-[#c9a84c] text-[#0a1a17]' : 'bg-white/10 text-white/70 hover:bg-white/20'}`}
                style={{ fontWeight: activeTab === 'agenda' ? 600 : 400 }}>
                Agenda de Coachings
              </button>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-full hover:bg-white/10 transition-colors">
            <X className="w-5 h-5 text-white/70" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          {/* DirecaoModals (cancel/remarcar flow) */}
          <DirecaoModals
            direcaoCancelarModal={direcaoCancelarModal}
            setDirecaoCancelarModal={setDirecaoCancelarModal}
            aulas={aulas}
            estudios={estudios}
            handleRejeitar={handleCancelar}
            onRemarcar={handleRemarcar}
          />

          {/* ── Aprovar Coachings Tab ── */}
          {activeTab === 'marcar' && (
            <div className="space-y-4">
              {pendentes.length === 0 ? (
                <div className="bg-white p-12 rounded-2xl shadow-sm text-center border border-[#0d6b5e]/5">
                  <CheckCircle className="w-16 h-16 text-[#0d6b5e]/20 mx-auto mb-4" />
                  <p className="text-[#4d7068] mb-1" style={{ fontWeight: 600 }}>Sem pedidos pendentes</p>
                  <p className="text-sm text-[#4d7068]/60">Todos os pedidos de coaching foram processados</p>
                </div>
              ) : (
                <>
                  <div className="flex items-center gap-2 mb-2">
                    <Bell className="w-5 h-5 text-amber-500" />
                    <h3 className="text-base text-[#0a1a17]" style={{ fontWeight: 600 }}>
                      Pedidos de Coaching Pendentes
                    </h3>
                    <span className="px-2.5 py-0.5 rounded-full bg-amber-100 text-amber-800 text-sm" style={{ fontWeight: 600 }}>
                      {pendentes.length}
                    </span>
                  </div>
                  {pendentes.map(renderAulaCard)}
                </>
              )}
            </div>
          )}

          {/* ── Agenda de Coachings Tab ── */}
          {activeTab === 'agenda' && (
            <div className="space-y-4">
              {/* Filters */}
              <div className="bg-white rounded-2xl border border-[#0d6b5e]/5 shadow-sm p-4">
                <div className="flex items-center gap-2 mb-3">
                  <Filter className="w-4 h-4 text-[#4d7068]" />
                  <span className="text-sm text-[#4d7068]" style={{ fontWeight: 500 }}>Filtros</span>
                </div>
                <div className="flex flex-wrap items-center gap-3">
                  <select value={filtroStatus} onChange={e => setFiltroStatus(e.target.value)}
                    className="px-3 py-1.5 text-sm border border-[#0d6b5e]/20 rounded-lg bg-[#f4f9f8] focus:outline-none focus:border-[#0d6b5e]">
                    <option value="TODAS">Todos os estados</option>
                    <option value="PENDENTE">Pendente</option>
                    <option value="CONFIRMADA">Confirmado</option>
                    <option value="REALIZADA">Realizado</option>
                    <option value="REJEITADA">Cancelado</option>
                  </select>
                  {professores.length > 0 && (
                    <select value={filtroProfessor} onChange={e => setFiltroProfessor(e.target.value)}
                      className="px-3 py-1.5 text-sm border border-[#0d6b5e]/20 rounded-lg bg-[#f4f9f8] focus:outline-none focus:border-[#0d6b5e]">
                      <option value="TODOS">Todos os professores</option>
                      {professores.map(p => <option key={p} value={p}>{p}</option>)}
                    </select>
                  )}
                  {estudios.length > 0 && (
                    <select value={filtroEstudio} onChange={e => setFiltroEstudio(e.target.value)}
                      className="px-3 py-1.5 text-sm border border-[#0d6b5e]/20 rounded-lg bg-[#f4f9f8] focus:outline-none focus:border-[#0d6b5e]">
                      <option value="TODOS">Todos os estúdios</option>
                      {estudios.map(e => <option key={e.id} value={e.id}>{e.nome}</option>)}
                    </select>
                  )}
                  {modalidades.length > 0 && (
                    <select value={filtroModalidade} onChange={e => setFiltroModalidade(e.target.value)}
                      className="px-3 py-1.5 text-sm border border-[#0d6b5e]/20 rounded-lg bg-[#f4f9f8] focus:outline-none focus:border-[#0d6b5e]">
                      <option value="TODAS">Todas as modalidades</option>
                      {modalidades.map(m => <option key={m} value={m}>{m}</option>)}
                    </select>
                  )}
                </div>
              </div>

              {/* Aula list */}
              {aulasFiltradas.length === 0 ? (
                <div className="bg-white p-12 rounded-2xl shadow-sm text-center border border-[#0d6b5e]/5">
                  <Calendar className="w-16 h-16 text-[#0d6b5e]/20 mx-auto mb-4" />
                  <p className="text-[#4d7068] mb-1" style={{ fontWeight: 600 }}>Nenhum resultado</p>
                  <p className="text-sm text-[#4d7068]/60">Tente alterar os filtros</p>
                </div>
              ) : (
                <>
                  <p className="text-sm text-[#4d7068]">
                    {aulasFiltradas.length} aula{aulasFiltradas.length !== 1 ? 's' : ''} encontrada{aulasFiltradas.length !== 1 ? 's' : ''}
                  </p>
                  {aulasFiltradas.map(renderAulaCard)}
                </>
              )}
            </div>
          )}
        </div>
      </div>

      {/* ── Approve Sala Modal ── */}
      {aprovarModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[60] p-4" onClick={() => setAprovarModal(null)}>
          <div className="bg-white rounded-2xl p-6 w-full max-w-md shadow-xl" onClick={e => e.stopPropagation()}>
            <h3 className="text-base text-[#0d1b19]" style={{ fontWeight: 600 }}>Aprovar Coaching</h3>
            {estudiosDisponiveis === null ? (
              <p className="text-sm text-[#4d7068] my-6">A verificar espaços disponíveis...</p>
            ) : (
              <>
                <p className="text-sm text-[#4d7068] mt-2 mb-4">
                  Selecione o espaço — apenas os disponíveis para este horário são exibidos.
                </p>
                {!estudiosDisponiveis.some((e: any) => e.disponivel) && (
                  <div className="bg-red-50 border border-red-200 text-red-700 text-sm p-3 rounded-lg mb-4">
                    Nenhum espaço disponível para este horário.
                  </div>
                )}
                <select
                  value={aprovarModal.salaId}
                  onChange={e => setAprovarModal({ ...aprovarModal, salaId: e.target.value })}
                  className="w-full p-3 border border-[#0d6b5e]/20 rounded-lg text-sm focus:outline-none focus:border-[#0d6b5e]">
                  {estudiosDisponiveis.map((e: any) => (
                    <option key={e.id} value={e.id} disabled={!e.disponivel}>
                      {e.nome}{e.disponivel ? '' : ' (Ocupado)'}
                    </option>
                  ))}
                </select>
                <div className="flex gap-3 justify-end mt-4">
                  <button onClick={() => setAprovarModal(null)}
                    className="px-4 py-2 text-sm text-[#4d7068] hover:bg-[#f0f5f4] rounded-lg transition-colors">
                    Cancelar
                  </button>
                  <button
                    disabled={!aprovarModal.salaId}
                    onClick={() => handleAprovar(aprovarModal.aulaId, parseInt(aprovarModal.salaId))}
                    className="px-4 py-2 text-sm bg-[#0d6b5e] text-white rounded-lg hover:bg-[#065147] transition-colors disabled:opacity-50">
                    Confirmar
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* ── Reject Motivo Modal ── */}
      {rejeitarModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[60] p-4" onClick={() => setRejeitarModal(null)}>
          <div className="bg-white rounded-2xl p-6 w-full max-w-md shadow-xl" onClick={e => e.stopPropagation()}>
            <h3 className="text-base text-[#0d1b19]" style={{ fontWeight: 600 }}>Rejeitar Coaching</h3>
            <p className="text-sm text-[#4d7068] mt-2 mb-3">Indique o motivo da rejeição</p>
            <textarea
              value={rejeitarMotivo}
              onChange={e => setRejeitarMotivo(e.target.value)}
              placeholder="Motivo (opcional)"
              rows={3}
              className="w-full px-3 py-2 text-sm border border-[#0d6b5e]/20 rounded-lg bg-[#f4f9f8] focus:outline-none focus:border-[#0d6b5e] resize-none" />
            <div className="flex gap-3 justify-end mt-4">
              <button onClick={() => setRejeitarModal(null)}
                className="px-4 py-2 text-sm text-[#4d7068] hover:bg-[#f0f5f4] rounded-lg transition-colors">
                Cancelar
              </button>
              <button onClick={handleConfirmarRejeitar}
                className="px-4 py-2 text-sm bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors">
                Rejeitar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
