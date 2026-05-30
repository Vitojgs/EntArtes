import { useState, useEffect } from 'react';
import { Users, CheckCircle, XCircle, Clock, MapPin, ChevronDown, ChevronUp } from 'lucide-react';
import api from '../services/api';
import { toast } from 'sonner';

interface GrupoPendenteDirecao {
  id: string;
  nome: string;
  professorNome: string;
  totalAlunos: number;
  alunosAceites: { alunoId: string; alunoNome: string }[];
}

export function DashboardDirecaoAprovacao({ salas }: { salas: { id: string; nome: string }[] }) {
  const [grupos, setGrupos] = useState<GrupoPendenteDirecao[]>([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const [showAprovar, setShowAprovar] = useState<Record<string, boolean>>({});
  const [showRejeitar, setShowRejeitar] = useState<Record<string, boolean>>({});
  const [estudioSel, setEstudioSel] = useState<Record<string, string>>({});
  const [motivos, setMotivos] = useState<Record<string, string>>({});

  const fetchPendentes = async () => {
    try {
      setLoading(true);
      const res = await api.getGruposPendentesDirecao();
      if (res.success) setGrupos(res.data || []);
    } catch (err: any) {
      console.error('Erro ao carregar grupos pendentes:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchPendentes(); }, []);

  const handleAprovar = async (turmaId: string) => {
    try {
      const estudioId = estudioSel[turmaId] ? parseInt(estudioSel[turmaId]) : undefined;
      const res = await api.aprovarDirecao(parseInt(turmaId), estudioId);
      if (res.success) {
        toast.success('Grupo aprovado com sucesso!');
        setShowAprovar(prev => ({ ...prev, [turmaId]: false }));
        fetchPendentes();
      }
    } catch (err: any) {
      toast.error(err.message || 'Erro ao aprovar grupo');
    }
  };

  const handleRejeitar = async (turmaId: string) => {
    const motivo = motivos[turmaId];
    if (!motivo?.trim()) {
      toast.error('É obrigatório indicar o motivo da rejeição');
      return;
    }
    try {
      const res = await api.rejeitarDirecao(parseInt(turmaId), motivo);
      if (res.success) {
        toast.success('Grupo rejeitado.');
        setShowRejeitar(prev => ({ ...prev, [turmaId]: false }));
        fetchPendentes();
      }
    } catch (err: any) {
      toast.error(err.message || 'Erro ao rejeitar grupo');
    }
  };

  if (loading && grupos.length === 0) {
    return (
      <div className="bg-white rounded-2xl shadow-sm border border-[#0d6b5e]/8 p-6">
        <p className="text-sm text-[#4d7068] text-center">A carregar grupos pendentes...</p>
      </div>
    );
  }

  if (grupos.length === 0) return null;

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-[#0d6b5e]/8 overflow-hidden">
      <div className="px-4 py-3 border-b border-[#0d6b5e]/8 flex items-center gap-3">
        <div className="w-7 h-7 bg-orange-100 rounded-lg flex items-center justify-center">
          <Clock className="w-4 h-4 text-orange-700" />
        </div>
        <h3 className="text-sm text-[#0a1a17]" style={{ fontWeight: 600 }}>Grupos Pendentes de Aprovação</h3>
        <span className="text-xs bg-orange-100 text-orange-800 px-2 py-0.5 rounded-full" style={{ fontWeight: 500 }}>
          {grupos.length} grupo{grupos.length !== 1 ? 's' : ''}
        </span>
      </div>
      <div className="divide-y divide-[#0d6b5e]/5">
        {grupos.map(g => (
          <div key={g.id}>
            <button
              onClick={() => setExpanded(prev => ({ ...prev, [g.id]: !prev[g.id] }))}
              className="w-full flex items-center justify-between px-4 py-3 hover:bg-[#f4f9f8] transition-colors text-left"
            >
              <div className="flex items-center gap-2 min-w-0">
                <Users className="w-4 h-4 text-[#0d6b5e] shrink-0" />
                <div className="min-w-0">
                  <span className="text-sm text-[#0a1a17] truncate block" style={{ fontWeight: 500 }}>{g.nome}</span>
                  <span className="text-xs text-[#4d7068]">{g.professorNome || '—'} · {g.totalAlunos} alunos</span>
                </div>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                {expanded[g.id] ? <ChevronUp className="w-4 h-4 text-[#4d7068]" /> : <ChevronDown className="w-4 h-4 text-[#4d7068]" />}
              </div>
            </button>
            {expanded[g.id] && (
              <div className="px-4 pb-3 space-y-3">
                {/* Students list */}
                <div className="space-y-1">
                  <p className="text-xs text-[#4d7068]" style={{ fontWeight: 500 }}>Alunos validados pelos EE:</p>
                  {g.alunosAceites.map(a => (
                    <div key={a.alunoId} className="flex items-center gap-2 text-sm text-[#0a1a17] bg-green-50 rounded-lg px-3 py-1.5">
                      <CheckCircle className="w-3.5 h-3.5 text-green-600" />
                      {a.alunoNome}
                    </div>
                  ))}
                </div>

                {/* Approve form */}
                {showAprovar[g.id] ? (
                  <div className="space-y-2 bg-[#f4f9f8] rounded-lg p-3">
                    <div>
                      <label className="text-xs text-[#4d7068] block mb-1" style={{ fontWeight: 500 }}>
                        <MapPin className="w-3 h-3 inline mr-1" /> Estúdio (opcional)
                      </label>
                      <select
                        value={estudioSel[g.id] || ''}
                        onChange={e => setEstudioSel(prev => ({ ...prev, [g.id]: e.target.value }))}
                        className="w-full px-3 py-1.5 border border-[#0d6b5e]/20 rounded-lg bg-white text-sm focus:outline-none focus:border-[#0d6b5e]"
                      >
                        <option value="">Manter estúdio sugerido</option>
                        {salas.map(s => <option key={s.id} value={s.id}>{s.nome}</option>)}
                      </select>
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleAprovar(g.id)}
                        className="flex items-center gap-1 text-xs bg-[#0d6b5e] text-white px-3 py-1.5 rounded-lg hover:bg-[#065147] transition-colors"
                        style={{ fontWeight: 500 }}
                      >
                        <CheckCircle className="w-3.5 h-3.5" /> Confirmar Aprovação
                      </button>
                      <button
                        onClick={() => setShowAprovar(prev => ({ ...prev, [g.id]: false }))}
                        className="text-xs text-[#4d7068] px-3 py-1.5 hover:bg-gray-100 rounded-lg transition-colors"
                      >
                        Cancelar
                      </button>
                    </div>
                  </div>
                ) : showRejeitar[g.id] ? (
                  <div className="space-y-2 bg-red-50 rounded-lg p-3">
                    <textarea
                      value={motivos[g.id] || ''}
                      onChange={e => setMotivos(prev => ({ ...prev, [g.id]: e.target.value }))}
                      placeholder="Motivo da rejeição (obrigatório)"
                      rows={2}
                      className="w-full px-3 py-1.5 border border-red-200 rounded-lg bg-white text-sm focus:outline-none focus:border-red-400 resize-none"
                    />
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleRejeitar(g.id)}
                        className="flex items-center gap-1 text-xs bg-red-600 text-white px-3 py-1.5 rounded-lg hover:bg-red-700 transition-colors"
                        style={{ fontWeight: 500 }}
                      >
                        <XCircle className="w-3.5 h-3.5" /> Confirmar Rejeição
                      </button>
                      <button
                        onClick={() => setShowRejeitar(prev => ({ ...prev, [g.id]: false }))}
                        className="text-xs text-[#4d7068] px-3 py-1.5 hover:bg-gray-100 rounded-lg transition-colors"
                      >
                        Cancelar
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="flex gap-2 pt-1">
                    <button
                      onClick={() => { setShowAprovar(prev => ({ ...prev, [g.id]: true })); setShowRejeitar(prev => ({ ...prev, [g.id]: false })); }}
                      className="flex items-center gap-1 text-xs bg-[#0d6b5e] text-white px-4 py-2 rounded-lg hover:bg-[#065147] transition-colors"
                      style={{ fontWeight: 600 }}
                    >
                      <CheckCircle className="w-3.5 h-3.5" /> Aprovar
                    </button>
                    <button
                      onClick={() => { setShowRejeitar(prev => ({ ...prev, [g.id]: true })); setShowAprovar(prev => ({ ...prev, [g.id]: false })); }}
                      className="flex items-center gap-1 text-xs bg-red-100 text-red-700 px-4 py-2 rounded-lg hover:bg-red-200 transition-colors"
                      style={{ fontWeight: 600 }}
                    >
                      <XCircle className="w-3.5 h-3.5" /> Rejeitar
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
