import { useState, useEffect, useMemo } from 'react';
import {
  X, CheckCircle, XCircle, Clock, User, CalendarDays, Music2, MapPin,
  Users, Package, Megaphone, Loader, Filter, ChevronDown, ChevronUp, AlertCircle
} from 'lucide-react';
import { PedidoAula } from '../types';
import api from '../services/api';
import { toast } from 'sonner';

interface DashboardAprovacoesModalProps {
  open: boolean;
  aulas: PedidoAula[];
  salas: { id: string; nome: string }[];
  onClose: () => void;
  onRefresh: () => void;
}

type TabId = 'coachings' | 'perfis' | 'grupos' | 'alugueres' | 'anuncios';

const TAB_CFG: { id: TabId; label: string; icon: typeof Clock }[] = [
  { id: 'coachings', label: 'Coachings', icon: Clock },
  { id: 'perfis', label: 'Perfis', icon: User },
  { id: 'grupos', label: 'Grupos', icon: Users },
  { id: 'alugueres', label: 'Alugueres', icon: Package },
  { id: 'anuncios', label: 'Anúncios', icon: Megaphone },
];

function formatHora(v: any): string {
  if (!v) return '';
  const s = String(v);
  const raw = s.includes('T') ? s.substring(11, 16) : s.substring(0, 5);
  const [h, m] = raw.split(':').map(Number);
  if (isNaN(h) || isNaN(m)) return '';
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

export function DashboardAprovacoesModal({ open, aulas, salas, onClose, onRefresh }: DashboardAprovacoesModalProps) {
  const [tab, setTab] = useState<TabId>('coachings');

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-start justify-center overflow-y-auto py-8">
      <div className="bg-[#f4f9f8] rounded-2xl shadow-xl w-full max-w-4xl mx-4 max-h-[85vh] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="bg-[#0a1a17] px-6 py-4 flex items-center justify-between shrink-0">
          <h2 className="text-lg text-white font-semibold">Aprovações</h2>
          <button onClick={onClose} className="p-1.5 rounded-full hover:bg-white/10 transition-colors">
            <X className="w-5 h-5 text-white/70" />
          </button>
        </div>

        {/* Tabs */}
        <div className="bg-[#0a1a17] px-6 pb-3 flex gap-1 overflow-x-auto shrink-0">
          {TAB_CFG.map(t => {
            const Icon = t.icon;
            return (
              <button
                key={t.id}
                onClick={() => setTab(t.id)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs transition-colors whitespace-nowrap ${
                  tab === t.id
                    ? 'bg-[#c9a84c] text-[#0a1a17] font-semibold'
                    : 'text-white/70 hover:text-white hover:bg-white/10'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                {t.label}
              </button>
            );
          })}
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {tab === 'coachings' && <CoachingsTab aulas={aulas} salas={salas} onRefresh={onRefresh} />}
          {tab === 'perfis' && <PerfisTab />}
          {tab === 'grupos' && <GruposTab salas={salas} />}
          {tab === 'alugueres' && <AlugueresTab />}
          {tab === 'anuncios' && <AnunciosTab />}
        </div>
      </div>
    </div>
  );
}

/* ── Coachings Tab ── */
function CoachingsTab({ aulas, salas, onRefresh }: { aulas: PedidoAula[]; salas: { id: string; nome: string }[]; onRefresh: () => void }) {
  const [aprovarModal, setAprovarModal] = useState<{ aulaId: string; salaId: string } | null>(null);
  const [rejeitarModal, setRejeitarModal] = useState<string | null>(null);
  const [rejeitarMotivo, setRejeitarMotivo] = useState('');
  const [processing, setProcessing] = useState<string | null>(null);

  const pendentes = useMemo(() =>
    aulas.filter((a: any) => a.status === 'PENDENTE')
      .sort((a, b) => new Date(a.data).getTime() - new Date(b.data).getTime()),
    [aulas]
  );

  const handleAprovar = async (aulaId: string) => {
    setProcessing(aulaId);
    try {
      const res = await api.request<{ success: boolean }>(`/api/coaching/${aulaId}/aprovar`, {
        method: 'PUT',
        body: JSON.stringify({ salaId: aprovarModal?.salaId || undefined }),
      });
      if (res.success) {
        toast.success('Coaching aprovado!');
        setAprovarModal(null);
        onRefresh();
      } else {
        toast.error('Erro ao aprovar');
      }
    } catch { toast.error('Erro ao aprovar'); }
    finally { setProcessing(null); }
  };

  const handleRejeitar = async (aulaId: string) => {
    if (!rejeitarMotivo.trim()) {
      toast.error('Indica o motivo da rejeição');
      return;
    }
    setProcessing(aulaId);
    try {
      const res = await api.request<{ success: boolean }>(`/api/coaching/${aulaId}/rejeitar`, {
        method: 'PUT',
        body: JSON.stringify({ motivo: rejeitarMotivo }),
      });
      if (res.success) {
        toast.success('Coaching rejeitado');
        setRejeitarModal(null);
        setRejeitarMotivo('');
        onRefresh();
      } else {
        toast.error('Erro ao rejeitar');
      }
    } catch { toast.error('Erro ao rejeitar'); }
    finally { setProcessing(null); }
  };

  if (pendentes.length === 0) {
    return (
      <div className="text-center py-12">
        <CheckCircle className="w-12 h-12 text-green-500 mx-auto mb-3" />
        <p className="text-[#4d7068] font-medium">Nenhum coaching pendente</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 text-sm text-[#4d7068] mb-2">
        <Clock className="w-4 h-4" />
        <span>{pendentes.length} coaching{pendentes.length !== 1 ? 's' : ''} pendente{pendentes.length !== 1 ? 's' : ''}</span>
      </div>
      {pendentes.map(aula => (
        <div key={aula.id} className="bg-white rounded-xl border border-[#0d6b5e]/10 p-5 shadow-sm">
          <div className="flex items-start justify-between mb-3">
            <div>
              <h3 className="text-lg font-semibold text-[#0a1a17] flex items-center gap-2">
                <User className="w-4 h-4 text-[#0d6b5e]" />
                {aula.alunoNome || 'Aluno'}
              </h3>
              <div className="flex flex-wrap gap-x-4 gap-y-1 mt-1 text-sm text-[#4d7068]">
                <span><CalendarDays className="w-3.5 h-3.5 inline mr-1" />{new Date(aula.data).toLocaleDateString('pt-PT')}</span>
                <span><Clock className="w-3.5 h-3.5 inline mr-1" />{formatHora(aula.horaInicio)}</span>
                {aula.modalidade && <span><Music2 className="w-3.5 h-3.5 inline mr-1" />{aula.modalidade}</span>}
                <span><MapPin className="w-3.5 h-3.5 inline mr-1" />{aula.estudioNome || '—'}</span>
              </div>
            </div>
            <span className="text-xs bg-amber-100 text-amber-700 font-semibold px-2.5 py-1 rounded-full shrink-0">Pendente</span>
          </div>

          {aprovarModal?.aulaId === aula.id ? (
            <div className="bg-[#f4f9f8] rounded-lg p-3 space-y-2">
              <div>
                <label className="text-xs text-[#4d7068] font-medium block mb-1">
                  <MapPin className="w-3 h-3 inline mr-1" />Estúdio
                </label>
                <select
                  value={aprovarModal.salaId}
                  onChange={e => setAprovarModal({ ...aprovarModal, salaId: e.target.value })}
                  className="w-full px-3 py-1.5 border border-[#0d6b5e]/20 rounded-lg bg-white text-sm focus:outline-none focus:border-[#0d6b5e]"
                >
                  <option value="">Selecionar estúdio</option>
                  {salas.map(s => <option key={s.id} value={s.id}>{s.nome}</option>)}
                </select>
              </div>
              <div className="flex gap-2">
                <button onClick={() => handleAprovar(aula.id)} disabled={processing === aula.id}
                  className="flex items-center gap-1 text-xs bg-[#0d6b5e] text-white px-3 py-1.5 rounded-lg hover:bg-[#065147] transition-colors font-medium">
                  {processing === aula.id ? <Loader className="w-3 h-3 animate-spin" /> : <CheckCircle className="w-3.5 h-3.5" />}
                  Confirmar Aprovação
                </button>
                <button onClick={() => setAprovarModal(null)}
                  className="text-xs text-[#4d7068] px-3 py-1.5 hover:bg-gray-100 rounded-lg transition-colors">
                  Cancelar
                </button>
              </div>
            </div>
          ) : rejeitarModal === aula.id ? (
            <div className="bg-red-50 rounded-lg p-3 space-y-2">
              <textarea
                value={rejeitarMotivo}
                onChange={e => setRejeitarMotivo(e.target.value)}
                placeholder="Motivo da rejeição (obrigatório)"
                className="w-full px-3 py-2 border border-red-200 rounded-lg text-sm bg-white focus:outline-none focus:border-red-400 resize-none"
                rows={2}
              />
              <div className="flex gap-2">
                <button onClick={() => handleRejeitar(aula.id)} disabled={processing === aula.id}
                  className="flex items-center gap-1 text-xs bg-red-600 text-white px-3 py-1.5 rounded-lg hover:bg-red-700 transition-colors font-medium">
                  {processing === aula.id ? <Loader className="w-3 h-3 animate-spin" /> : <XCircle className="w-3.5 h-3.5" />}
                  Rejeitar
                </button>
                <button onClick={() => { setRejeitarModal(null); setRejeitarMotivo(''); }}
                  className="text-xs text-[#4d7068] px-3 py-1.5 hover:bg-gray-100 rounded-lg transition-colors">
                  Cancelar
                </button>
              </div>
            </div>
          ) : (
            <div className="flex gap-2">
              <button onClick={() => setAprovarModal({ aulaId: aula.id, salaId: '' })}
                className="flex items-center gap-1 text-xs bg-[#0d6b5e] text-white px-3 py-1.5 rounded-lg hover:bg-[#065147] transition-colors font-medium">
                <CheckCircle className="w-3.5 h-3.5" /> Aprovar
              </button>
              <button onClick={() => setRejeitarModal(aula.id)}
                className="flex items-center gap-1 text-xs bg-white border border-red-200 text-red-600 px-3 py-1.5 rounded-lg hover:bg-red-50 transition-colors font-medium">
                <XCircle className="w-3.5 h-3.5" /> Rejeitar
              </button>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

/* ── Perfis Tab ── */
function PerfisTab() {
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
        toast.success('Alteração aprovada!');
        fetchPendentes();
      } else {
        toast.error(res.error || 'Erro ao aprovar');
      }
    } catch { toast.error('Erro ao aprovar'); }
    finally { setProcessing(null); }
  };

  const handleRejeitar = async (pedidoId: number) => {
    const motivo = prompt('Motivo da rejeição (opcional):');
    setProcessing(pedidoId);
    try {
      const res = await api.rejeitarAlteracaoPerfil(pedidoId, motivo || undefined);
      if (res.success) {
        toast.success('Alteração rejeitada');
        fetchPendentes();
      }
    } catch { toast.error('Erro ao rejeitar'); }
    finally { setProcessing(null); }
  };

  if (loading) {
    return <div className="flex justify-center py-12"><Loader className="w-6 h-6 animate-spin text-[#0d6b5e]" /></div>;
  }

  if (pedidos.length === 0) {
    return (
      <div className="text-center py-12">
        <CheckCircle className="w-12 h-12 text-green-500 mx-auto mb-3" />
        <p className="text-[#4d7068] font-medium">Nenhum pedido de alteração pendente</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="text-sm text-[#4d7068] mb-2">
        {pedidos.length} pedido{pedidos.length !== 1 ? 's' : ''} de alteração pendente{pedidos.length !== 1 ? 's' : ''}
      </div>
      {pedidos.map((pedido: any) => (
        <div key={pedido.idpedidoalteracao} className="bg-white rounded-xl border border-[#0d6b5e]/10 p-5 shadow-sm">
          <div className="flex items-start justify-between mb-3">
            <div className="flex items-start gap-3">
              <div className="bg-amber-100 rounded-full p-2 shrink-0">
                <Clock className="w-5 h-5 text-amber-600" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-[#0a1a17]">{pedido.aluno?.utilizador?.nome}</h3>
                <p className="text-sm text-[#4d7068]">
                  Solicitado por {pedido.solicitante?.nome} · {new Date(pedido.dataSolicitacao).toLocaleDateString('pt-PT')}
                </p>
              </div>
            </div>
            <span className="text-xs bg-amber-100 text-amber-700 font-semibold px-2.5 py-1 rounded-full shrink-0">Pendente</span>
          </div>

          <div className="grid sm:grid-cols-2 gap-3 mb-4">
            {pedido.novodataNascimento && (
              <div className="bg-[#f4f9f8] rounded-lg p-3">
                <p className="text-xs text-[#4d7068] font-medium mb-1 flex items-center gap-1">
                  <CalendarDays className="w-3.5 h-3.5" /> Data de Nascimento
                </p>
                <p className="text-sm text-[#0a1a17] font-medium">{new Date(pedido.novodataNascimento).toLocaleDateString('pt-PT')}</p>
              </div>
            )}
            {pedido.novasmodalidades?.length > 0 && (
              <div className="bg-[#f4f9f8] rounded-lg p-3">
                <p className="text-xs text-[#4d7068] font-medium mb-1 flex items-center gap-1">
                  <Music2 className="w-3.5 h-3.5" /> Modalidades
                </p>
                <div className="flex flex-wrap gap-1">
                  {pedido.novasmodalidades.map((m: any) => (
                    <span key={m.idmodalidade} className="bg-[#0d6b5e]/10 text-[#0d6b5e] text-xs px-2 py-0.5 rounded-full font-medium">
                      {m.nome}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>

          <div className="flex gap-2">
            <button onClick={() => handleAprovar(pedido.idpedidoalteracao)} disabled={processing === pedido.idpedidoalteracao}
              className="flex items-center gap-1 text-xs bg-[#0d6b5e] text-white px-3 py-1.5 rounded-lg hover:bg-[#065147] transition-colors font-medium">
              {processing === pedido.idpedidoalteracao ? <Loader className="w-3 h-3 animate-spin" /> : <CheckCircle className="w-3.5 h-3.5" />}
              Aprovar
            </button>
            <button onClick={() => handleRejeitar(pedido.idpedidoalteracao)} disabled={processing === pedido.idpedidoalteracao}
              className="flex items-center gap-1 text-xs bg-white border border-red-200 text-red-600 px-3 py-1.5 rounded-lg hover:bg-red-50 transition-colors font-medium">
              <XCircle className="w-3.5 h-3.5" /> Rejeitar
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}

/* ── Grupos Tab ── */
function GruposTab({ salas }: { salas: { id: string; nome: string }[] }) {
  const [grupos, setGrupos] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const [showAprovar, setShowAprovar] = useState<Record<string, boolean>>({});
  const [showRejeitar, setShowRejeitar] = useState<Record<string, boolean>>({});
  const [estudioSel, setEstudioSel] = useState<Record<string, string>>({});
  const [motivos, setMotivos] = useState<Record<string, string>>({});
  const [processing, setProcessing] = useState<Record<string, boolean>>({});

  const fetchPendentes = async () => {
    setLoading(true);
    try {
      const res = await api.getGruposPendentesDirecao();
      if (res.success) setGrupos(res.data || []);
    } catch { void 0 }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchPendentes(); }, []);

  const handleAprovar = async (turmaId: string) => {
    setProcessing(prev => ({ ...prev, [turmaId]: true }));
    try {
      const estudioId = estudioSel[turmaId] ? parseInt(estudioSel[turmaId]) : undefined;
      const res = await api.aprovarDirecao(parseInt(turmaId), estudioId);
      if (res.success) {
        toast.success('Grupo aprovado!');
        setShowAprovar(prev => ({ ...prev, [turmaId]: false }));
        fetchPendentes();
      }
    } catch (err: any) { toast.error(err.message || 'Erro ao aprovar grupo'); }
    finally { setProcessing(prev => ({ ...prev, [turmaId]: false })); }
  };

  const handleRejeitar = async (turmaId: string) => {
    const motivo = motivos[turmaId];
    if (!motivo?.trim()) {
      toast.error('É obrigatório indicar o motivo da rejeição');
      return;
    }
    setProcessing(prev => ({ ...prev, [turmaId]: true }));
    try {
      const res = await api.rejeitarDirecao(parseInt(turmaId), motivo);
      if (res.success) {
        toast.success('Grupo rejeitado');
        setShowRejeitar(prev => ({ ...prev, [turmaId]: false }));
        fetchPendentes();
      }
    } catch (err: any) { toast.error(err.message || 'Erro ao rejeitar grupo'); }
    finally { setProcessing(prev => ({ ...prev, [turmaId]: false })); }
  };

  if (loading) {
    return <div className="flex justify-center py-12"><Loader className="w-6 h-6 animate-spin text-[#0d6b5e]" /></div>;
  }

  if (grupos.length === 0) {
    return (
      <div className="text-center py-12">
        <CheckCircle className="w-12 h-12 text-green-500 mx-auto mb-3" />
        <p className="text-[#4d7068] font-medium">Nenhum grupo pendente de aprovação</p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <div className="text-sm text-[#4d7068] mb-2">
        {grupos.length} grupo{grupos.length !== 1 ? 's' : ''} pendente{grupos.length !== 1 ? 's' : ''} de aprovação
      </div>
      {grupos.map(g => (
        <div key={g.id} className="bg-white rounded-xl border border-[#0d6b5e]/10 overflow-hidden">
          <button
            onClick={() => setExpanded(prev => ({ ...prev, [g.id]: !prev[g.id] }))}
            className="w-full flex items-center justify-between px-5 py-4 hover:bg-[#f4f9f8] transition-colors text-left"
          >
            <div className="flex items-center gap-3 min-w-0">
              <Users className="w-5 h-5 text-[#0d6b5e] shrink-0" />
              <div className="min-w-0">
                <span className="text-sm text-[#0a1a17] font-medium truncate block">{g.nome}</span>
                <span className="text-xs text-[#4d7068]">{g.professorNome || '—'} · {g.totalAlunos} alunos</span>
              </div>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <span className="text-xs bg-amber-100 text-amber-700 font-semibold px-2 py-0.5 rounded-full">Pendente</span>
              {expanded[g.id] ? <ChevronUp className="w-4 h-4 text-[#4d7068]" /> : <ChevronDown className="w-4 h-4 text-[#4d7068]" />}
            </div>
          </button>

          {expanded[g.id] && (
            <div className="px-5 pb-4 space-y-3 border-t border-[#0d6b5e]/5">
              <div className="pt-3 space-y-1">
                <p className="text-xs text-[#4d7068] font-medium">Alunos validados pelos EE:</p>
                {g.alunosAceites?.map((a: any) => (
                  <div key={a.alunoId} className="flex items-center gap-2 text-sm text-[#0a1a17] bg-green-50 rounded-lg px-3 py-1.5">
                    <CheckCircle className="w-3.5 h-3.5 text-green-600" /> {a.alunoNome}
                  </div>
                ))}
              </div>

              {showAprovar[g.id] ? (
                <div className="space-y-2 bg-[#f4f9f8] rounded-lg p-3">
                  <div>
                    <label className="text-xs text-[#4d7068] block mb-1 font-medium">
                      <MapPin className="w-3 h-3 inline mr-1" /> Estúdio (opcional)
                    </label>
                    <select value={estudioSel[g.id] || ''} onChange={e => setEstudioSel(prev => ({ ...prev, [g.id]: e.target.value }))}
                      className="w-full px-3 py-1.5 border border-[#0d6b5e]/20 rounded-lg bg-white text-sm focus:outline-none focus:border-[#0d6b5e]">
                      <option value="">Manter estúdio sugerido</option>
                      {salas.map(s => <option key={s.id} value={s.id}>{s.nome}</option>)}
                    </select>
                  </div>
                  <div className="flex gap-2">
                    <button onClick={() => handleAprovar(g.id)} disabled={processing[g.id]}
                      className="flex items-center gap-1 text-xs bg-[#0d6b5e] text-white px-3 py-1.5 rounded-lg hover:bg-[#065147] transition-colors font-medium">
                      {processing[g.id] ? <Loader className="w-3 h-3 animate-spin" /> : <CheckCircle className="w-3.5 h-3.5" />}
                      Confirmar Aprovação
                    </button>
                    <button onClick={() => setShowAprovar(prev => ({ ...prev, [g.id]: false }))}
                      className="text-xs text-[#4d7068] px-3 py-1.5 hover:bg-gray-100 rounded-lg transition-colors">Cancelar</button>
                  </div>
                </div>
              ) : showRejeitar[g.id] ? (
                <div className="space-y-2 bg-red-50 rounded-lg p-3">
                  <textarea value={motivos[g.id] || ''} onChange={e => setMotivos(prev => ({ ...prev, [g.id]: e.target.value }))}
                    placeholder="Motivo da rejeição (obrigatório)" rows={2}
                    className="w-full px-3 py-2 border border-red-200 rounded-lg text-sm bg-white focus:outline-none focus:border-red-400 resize-none" />
                  <div className="flex gap-2">
                    <button onClick={() => handleRejeitar(g.id)} disabled={processing[g.id]}
                      className="flex items-center gap-1 text-xs bg-red-600 text-white px-3 py-1.5 rounded-lg hover:bg-red-700 transition-colors font-medium">
                      {processing[g.id] ? <Loader className="w-3 h-3 animate-spin" /> : <XCircle className="w-3.5 h-3.5" />}
                      Rejeitar
                    </button>
                    <button onClick={() => setShowRejeitar(prev => ({ ...prev, [g.id]: false }))}
                      className="text-xs text-[#4d7068] px-3 py-1.5 hover:bg-gray-100 rounded-lg transition-colors">Cancelar</button>
                  </div>
                </div>
              ) : (
                <div className="flex gap-2">
                  <button onClick={() => setShowAprovar(prev => ({ ...prev, [g.id]: true }))}
                    className="flex items-center gap-1 text-xs bg-[#0d6b5e] text-white px-3 py-1.5 rounded-lg hover:bg-[#065147] transition-colors font-medium">
                    <CheckCircle className="w-3.5 h-3.5" /> Aprovar
                  </button>
                  <button onClick={() => setShowRejeitar(prev => ({ ...prev, [g.id]: true }))}
                    className="flex items-center gap-1 text-xs bg-white border border-red-200 text-red-600 px-3 py-1.5 rounded-lg hover:bg-red-50 transition-colors font-medium">
                    <XCircle className="w-3.5 h-3.5" /> Rejeitar
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

/* ── Alugueres Tab ── */
function AlugueresTab() {
  const [reservas, setReservas] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState<number | null>(null);
  const [rejeitarModal, setRejeitarModal] = useState<number | null>(null);
  const [rejeitarMotivo, setRejeitarMotivo] = useState('');

  const fetchPendentes = async () => {
    setLoading(true);
    try {
      const res = await api.getAlugueres();
      if (res.success) {
        const pendentes = (res.data || []).filter((r: any) => {
          const estado = (r.estado?.tipoestado || r.status || '').toLowerCase();
          return estado === 'pendente';
        });
        setReservas(pendentes);
      }
    } catch { void 0 }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchPendentes(); }, []);

  const handleAprovar = async (id: number) => {
    setProcessing(id);
    try {
      const estadosRes = await api.getAluguerEstados();
      const estadoAprovado = estadosRes.success
        ? (estadosRes.data || []).find((e: any) => e.tipoestado?.toLowerCase() === 'aprovado')
        : null;
      const res = await api.avaliarPedidoReserva(id, 'aprovar', estadoAprovado?.idestado);
      if (res.success) {
        toast.success('Aluguer aprovado!');
        fetchPendentes();
      } else {
        toast.error(res.error || 'Erro ao aprovar');
      }
    } catch { toast.error('Erro ao aprovar'); }
    finally { setProcessing(null); }
  };

  const handleRejeitar = async (id: number) => {
    if (!rejeitarMotivo.trim()) {
      toast.error('Indica o motivo da rejeição');
      return;
    }
    setProcessing(id);
    try {
      const estadosRes = await api.getAluguerEstados();
      const estadoRejeitado = estadosRes.success
        ? (estadosRes.data || []).find((e: any) => e.tipoestado?.toLowerCase() === 'rejeitado')
        : null;
      const res = await api.avaliarPedidoReserva(id, 'rejeitar', estadoRejeitado?.idestado, rejeitarMotivo);
      if (res.success) {
        toast.success('Aluguer rejeitado');
        setRejeitarModal(null);
        setRejeitarMotivo('');
        fetchPendentes();
      }
    } catch { toast.error('Erro ao rejeitar'); }
    finally { setProcessing(null); }
  };

  if (loading) {
    return <div className="flex justify-center py-12"><Loader className="w-6 h-6 animate-spin text-[#0d6b5e]" /></div>;
  }

  if (reservas.length === 0) {
    return (
      <div className="text-center py-12">
        <CheckCircle className="w-12 h-12 text-green-500 mx-auto mb-3" />
        <p className="text-[#4d7068] font-medium">Nenhum aluguer pendente</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="text-sm text-[#4d7068] mb-2">
        {reservas.length} aluguer{reservas.length !== 1 ? 'es' : ''} pendente{reservas.length !== 1 ? 's' : ''}
      </div>
      {reservas.map(r => {
        const figurinoNome = r.itemfigurino?.figurino?.nome || r.anuncio?.figurino?.nome || 'Figurino';
        const solicitante = r.utilizador?.nome || r.encarregadoeducacao?.nome || '—';
        return (
          <div key={r.idtransacao} className="bg-white rounded-xl border border-[#0d6b5e]/10 p-5 shadow-sm">
            <div className="flex items-start justify-between mb-3">
              <div>
                <h3 className="text-lg font-semibold text-[#0a1a17] flex items-center gap-2">
                  <Package className="w-4 h-4 text-[#0d6b5e]" />
                  {figurinoNome}
                </h3>
                <p className="text-sm text-[#4d7068] mt-1">
                  Solicitado por {solicitante}
                </p>
                <div className="flex flex-wrap gap-x-4 gap-y-1 mt-1 text-sm text-[#4d7068]">
                  {r.datainicio && <span><CalendarDays className="w-3.5 h-3.5 inline mr-1" />{new Date(r.datainicio).toLocaleDateString('pt-PT')} → {r.datafim ? new Date(r.datafim).toLocaleDateString('pt-PT') : '—'}</span>}
                  <span>Qtd: {r.quantidade}</span>
                </div>
              </div>
              <span className="text-xs bg-amber-100 text-amber-700 font-semibold px-2.5 py-1 rounded-full shrink-0">Pendente</span>
            </div>

            {rejeitarModal === r.idtransacao ? (
              <div className="bg-red-50 rounded-lg p-3 space-y-2">
                <textarea value={rejeitarMotivo} onChange={e => setRejeitarMotivo(e.target.value)}
                  placeholder="Motivo da rejeição (obrigatório)" rows={2}
                  className="w-full px-3 py-2 border border-red-200 rounded-lg text-sm bg-white focus:outline-none focus:border-red-400 resize-none" />
                <div className="flex gap-2">
                  <button onClick={() => handleRejeitar(r.idtransacao)} disabled={processing === r.idtransacao}
                    className="flex items-center gap-1 text-xs bg-red-600 text-white px-3 py-1.5 rounded-lg hover:bg-red-700 transition-colors font-medium">
                    {processing === r.idtransacao ? <Loader className="w-3 h-3 animate-spin" /> : <XCircle className="w-3.5 h-3.5" />}
                    Rejeitar
                  </button>
                  <button onClick={() => { setRejeitarModal(null); setRejeitarMotivo(''); }}
                    className="text-xs text-[#4d7068] px-3 py-1.5 hover:bg-gray-100 rounded-lg transition-colors">Cancelar</button>
                </div>
              </div>
            ) : (
              <div className="flex gap-2">
                <button onClick={() => handleAprovar(r.idtransacao)} disabled={processing === r.idtransacao}
                  className="flex items-center gap-1 text-xs bg-[#0d6b5e] text-white px-3 py-1.5 rounded-lg hover:bg-[#065147] transition-colors font-medium">
                  {processing === r.idtransacao ? <Loader className="w-3 h-3 animate-spin" /> : <CheckCircle className="w-3.5 h-3.5" />}
                  Aprovar
                </button>
                <button onClick={() => setRejeitarModal(r.idtransacao)}
                  className="flex items-center gap-1 text-xs bg-white border border-red-200 text-red-600 px-3 py-1.5 rounded-lg hover:bg-red-50 transition-colors font-medium">
                  <XCircle className="w-3.5 h-3.5" /> Rejeitar
                </button>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

/* ── Anuncios Tab ── */
function AnunciosTab() {
  const [anuncios, setAnuncios] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState<number | null>(null);
  const [rejeitarModal, setRejeitarModal] = useState<number | null>(null);
  const [rejeitarMotivo, setRejeitarMotivo] = useState('');

  const fetchPendentes = async () => {
    setLoading(true);
    try {
      const res = await api.getAnuncios();
      if (res.success) {
        const pendentes = (res.data || []).filter((a: any) => {
          const estado = (a.estado?.tipoestado || a.status || '').toLowerCase();
          return estado === 'pendente';
        });
        setAnuncios(pendentes);
      }
    } catch { void 0 }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchPendentes(); }, []);

  const handleAprovar = async (id: number) => {
    setProcessing(id);
    try {
      const res = await api.avaliarAnuncio(id, 'aprovar');
      if (res.success) {
        toast.success('Anúncio aprovado!');
        fetchPendentes();
      } else {
        toast.error(res.error || 'Erro ao aprovar');
      }
    } catch { toast.error('Erro ao aprovar'); }
    finally { setProcessing(null); }
  };

  const handleRejeitar = async (id: number) => {
    if (!rejeitarMotivo.trim()) {
      toast.error('Indica o motivo da rejeição');
      return;
    }
    setProcessing(id);
    try {
      const res = await api.avaliarAnuncio(id, 'rejeitar', rejeitarMotivo);
      if (res.success) {
        toast.success('Anúncio rejeitado');
        setRejeitarModal(null);
        setRejeitarMotivo('');
        fetchPendentes();
      }
    } catch { toast.error('Erro ao rejeitar'); }
    finally { setProcessing(null); }
  };

  if (loading) {
    return <div className="flex justify-center py-12"><Loader className="w-6 h-6 animate-spin text-[#0d6b5e]" /></div>;
  }

  if (anuncios.length === 0) {
    return (
      <div className="text-center py-12">
        <CheckCircle className="w-12 h-12 text-green-500 mx-auto mb-3" />
        <p className="text-[#4d7068] font-medium">Nenhum anúncio pendente</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="text-sm text-[#4d7068] mb-2">
        {anuncios.length} anúncio{anuncios.length !== 1 ? 's' : ''} pendente{anuncios.length !== 1 ? 's' : ''}
      </div>
      {anuncios.map(a => {
        const anunciante = a.utilizador?.nome || a.professor?.nome || '—';
        return (
          <div key={a.idanuncio} className="bg-white rounded-xl border border-[#0d6b5e]/10 p-5 shadow-sm">
            <div className="flex items-start justify-between mb-3">
              <div>
                <h3 className="text-lg font-semibold text-[#0a1a17] flex items-center gap-2">
                  <Megaphone className="w-4 h-4 text-[#0d6b5e]" />
                  {a.titulo || 'Anúncio'}
                </h3>
                <p className="text-sm text-[#4d7068] mt-1">
                  Por {anunciante} · {a.datacriacao ? new Date(a.datacriacao).toLocaleDateString('pt-PT') : '—'}
                </p>
                {a.descricao && <p className="text-sm text-[#0a1a17] mt-2 line-clamp-2">{a.descricao}</p>}
              </div>
              <span className="text-xs bg-amber-100 text-amber-700 font-semibold px-2.5 py-1 rounded-full shrink-0">Pendente</span>
            </div>

            {rejeitarModal === a.idanuncio ? (
              <div className="bg-red-50 rounded-lg p-3 space-y-2">
                <textarea value={rejeitarMotivo} onChange={e => setRejeitarMotivo(e.target.value)}
                  placeholder="Motivo da rejeição (obrigatório)" rows={2}
                  className="w-full px-3 py-2 border border-red-200 rounded-lg text-sm bg-white focus:outline-none focus:border-red-400 resize-none" />
                <div className="flex gap-2">
                  <button onClick={() => handleRejeitar(a.idanuncio)} disabled={processing === a.idanuncio}
                    className="flex items-center gap-1 text-xs bg-red-600 text-white px-3 py-1.5 rounded-lg hover:bg-red-700 transition-colors font-medium">
                    {processing === a.idanuncio ? <Loader className="w-3 h-3 animate-spin" /> : <XCircle className="w-3.5 h-3.5" />}
                    Rejeitar
                  </button>
                  <button onClick={() => { setRejeitarModal(null); setRejeitarMotivo(''); }}
                    className="text-xs text-[#4d7068] px-3 py-1.5 hover:bg-gray-100 rounded-lg transition-colors">Cancelar</button>
                </div>
              </div>
            ) : (
              <div className="flex gap-2">
                <button onClick={() => handleAprovar(a.idanuncio)} disabled={processing === a.idanuncio}
                  className="flex items-center gap-1 text-xs bg-[#0d6b5e] text-white px-3 py-1.5 rounded-lg hover:bg-[#065147] transition-colors font-medium">
                  {processing === a.idanuncio ? <Loader className="w-3 h-3 animate-spin" /> : <CheckCircle className="w-3.5 h-3.5" />}
                  Aprovar
                </button>
                <button onClick={() => setRejeitarModal(a.idanuncio)}
                  className="flex items-center gap-1 text-xs bg-white border border-red-200 text-red-600 px-3 py-1.5 rounded-lg hover:bg-red-50 transition-colors font-medium">
                  <XCircle className="w-3.5 h-3.5" /> Rejeitar
                </button>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
