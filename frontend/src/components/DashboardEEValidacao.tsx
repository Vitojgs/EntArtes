import { useState, useEffect } from 'react';
import { Users, CheckCircle, XCircle, Clock, ChevronDown, ChevronUp } from 'lucide-react';
import api from '../services/api';
import { toast } from 'sonner';

interface GrupoPendenteEE {
  id: string;
  nome: string;
  alunosPorValidar: { alunoId: string; alunoNome: string }[];
}

export function DashboardEEValidacao() {
  const [grupos, setGrupos] = useState<GrupoPendenteEE[]>([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const [motivos, setMotivos] = useState<Record<string, string>>({});
  const [rejeitando, setRejeitando] = useState<Record<string, boolean>>({});

  const fetchPendentes = async () => {
    try {
      setLoading(true);
      const res = await api.getGruposPendentesEE();
      if (res.success) setGrupos(res.data || []);
    } catch (err: any) {
      console.error('Erro ao carregar grupos pendentes EE:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchPendentes(); }, []);

  const handleValidar = async (turmaId: string, alunoId: string, aceite: boolean) => {
    const key = `${turmaId}-${alunoId}`;
    try {
      const res = await api.validarAlunoEE(parseInt(turmaId), alunoId, aceite, aceite ? undefined : motivos[key]);
      if (res.success) {
        toast.success(aceite ? 'Aluno validado com sucesso!' : 'Aluno rejeitado.');
        fetchPendentes();
      }
    } catch (err: any) {
      toast.error(err.message || 'Erro ao validar aluno');
    }
  };

  if (loading && grupos.length === 0) {
    return (
      <div className="mt-6 bg-white rounded-2xl shadow-sm border border-[#0d6b5e]/8 p-6">
        <p className="text-sm text-[#4d7068] text-center">A carregar grupos pendentes...</p>
      </div>
    );
  }

  if (grupos.length === 0) return null;

  return (
    <div className="mt-6 bg-white rounded-2xl shadow-sm border border-[#0d6b5e]/8 overflow-hidden">
      <div className="px-4 py-3 border-b border-[#0d6b5e]/8 flex items-center gap-3">
        <div className="w-7 h-7 bg-yellow-100 rounded-lg flex items-center justify-center">
          <Clock className="w-4 h-4 text-yellow-700" />
        </div>
        <h3 className="text-sm text-[#0a1a17]" style={{ fontWeight: 600 }}>Validação de Grupos</h3>
        <span className="text-xs bg-yellow-100 text-yellow-800 px-2 py-0.5 rounded-full" style={{ fontWeight: 500 }}>
          {grupos.reduce((acc, g) => acc + g.alunosPorValidar.length, 0)} por validar
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
                <span className="text-sm text-[#0a1a17] truncate" style={{ fontWeight: 500 }}>{g.nome}</span>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <span className="text-xs bg-yellow-100 text-yellow-800 px-2 py-0.5 rounded-full">
                  {g.alunosPorValidar.length} aluno{g.alunosPorValidar.length !== 1 ? 's' : ''}
                </span>
                {expanded[g.id] ? <ChevronUp className="w-4 h-4 text-[#4d7068]" /> : <ChevronDown className="w-4 h-4 text-[#4d7068]" />}
              </div>
            </button>
            {expanded[g.id] && (
              <div className="px-4 pb-3 space-y-2">
                {g.alunosPorValidar.map(a => {
                  const key = `${g.id}-${a.alunoId}`;
                  return (
                    <div key={a.alunoId} className="bg-[#f4f9f8] rounded-lg p-3">
                      <p className="text-sm text-[#0a1a17]" style={{ fontWeight: 500 }}>{a.alunoNome}</p>
                      {rejeitando[key] ? (
                        <div className="mt-2 space-y-2">
                          <textarea
                            value={motivos[key] || ''}
                            onChange={e => setMotivos(prev => ({ ...prev, [key]: e.target.value }))}
                            placeholder="Motivo da rejeição (obrigatório)"
                            rows={2}
                            className="w-full px-3 py-1.5 border border-red-200 rounded-lg bg-white text-sm focus:outline-none focus:border-red-400 resize-none"
                          />
                          <div className="flex gap-2">
                            <button
                              onClick={() => handleValidar(g.id, a.alunoId, false)}
                              disabled={!motivos[key]?.trim()}
                              className="flex items-center gap-1 text-xs bg-red-600 text-white px-3 py-1.5 rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50"
                              style={{ fontWeight: 500 }}
                            >
                              <XCircle className="w-3.5 h-3.5" /> Confirmar Rejeição
                            </button>
                            <button
                              onClick={() => setRejeitando(prev => ({ ...prev, [key]: false }))}
                              className="text-xs text-[#4d7068] px-3 py-1.5 hover:bg-gray-100 rounded-lg transition-colors"
                            >
                              Cancelar
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div className="mt-2 flex gap-2">
                          <button
                            onClick={() => handleValidar(g.id, a.alunoId, true)}
                            className="flex items-center gap-1 text-xs bg-[#0d6b5e] text-white px-3 py-1.5 rounded-lg hover:bg-[#065147] transition-colors"
                            style={{ fontWeight: 500 }}
                          >
                            <CheckCircle className="w-3.5 h-3.5" /> Aceitar
                          </button>
                          <button
                            onClick={() => setRejeitando(prev => ({ ...prev, [key]: true }))}
                            className="flex items-center gap-1 text-xs bg-red-100 text-red-700 px-3 py-1.5 rounded-lg hover:bg-red-200 transition-colors"
                            style={{ fontWeight: 500 }}
                          >
                            <XCircle className="w-3.5 h-3.5" /> Rejeitar
                          </button>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
