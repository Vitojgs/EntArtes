import { useState } from 'react';
import {
  X, Calendar, Clock, User, UserPlus, MapPin,
  BookOpen, CheckCircle, XCircle, CalendarOff
} from 'lucide-react';
import api from '../services/api';
import { toast } from 'sonner';

const MESES_PT = ['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez'];

const STATUS_CFG: Record<string, { label: string; bg: string; text: string; dot: string }> = {
  PENDENTE:   { label: 'Pendente',   bg: 'bg-[#fdf6e3]', text: 'text-[#c9a84c]',  dot: 'bg-[#c9a84c]' },
  CONFIRMADA: { label: 'Confirmado', bg: 'bg-[#e2f0ed]',  text: 'text-[#0d6b5e]', dot: 'bg-[#0d6b5e]' },
  REALIZADA:  { label: 'Realizado',  bg: 'bg-[#e2f0ed]',  text: 'text-[#0d6b5e]', dot: 'bg-[#0d6b5e]' },
  REJEITADA:  { label: 'Cancelado',  bg: 'bg-red-100',    text: 'text-red-700',   dot: 'bg-red-400'   },
  CANCELADA:  { label: 'Cancelado',  bg: 'bg-red-100',    text: 'text-red-700',   dot: 'bg-red-400'   },
};

function formatHora(v: any): string {
  if (!v) return '';
  const s = String(v);
  const raw = s.includes('T') ? s.substring(11, 16) : s.substring(0, 5);
  const [h, m] = raw.split(':').map(Number);
  if (isNaN(h) || isNaN(m)) return '';
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

function formatDate(dateStr: string): string {
  const date = new Date(dateStr);
  const days = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
  const months = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
  return `${days[date.getDay()]}, ${date.getDate()} ${months[date.getMonth()]}`;
}

function getAlunoNome(a: any): string {
  return a.alunoNome || a.participantes?.map((p: any) => p.alunoNome).filter(Boolean).join(', ') || 'Aluno';
}

interface DashboardEncarregadoCoachingModalProps {
  open: boolean;
  onClose: () => void;
  onRefresh: () => void;
  aulas: any[];
  salas: { id: string; nome: string }[];
}

export function DashboardEncarregadoCoachingModal({ open, onClose, onRefresh, aulas }: DashboardEncarregadoCoachingModalProps) {
  const [selectedAula, setSelectedAula] = useState<any | null>(null);

  const handleResponderSugestaoEE = async (aulaId: string, aceitar: boolean) => {
    try {
      await api.responderSugestaoEE(Number(aulaId), aceitar);
      if (aceitar) {
        toast.success('Nova data aceite. Coaching confirmado!');
        onRefresh();
      } else {
        toast.info('Nova data recusada. Coaching cancelado.');
      }
      setSelectedAula(null);
      onRefresh();
    } catch (error: any) {
      toast.error(error.message || 'Erro ao responder à sugestão');
    }
  };

  const handleCancelarParticipacao = async (aulaId: string) => {
    if (!confirm('Tem a certeza que deseja cancelar a sua participação neste coaching?')) return;
    try {
      await api.cancelarParticipacaoAula(parseInt(aulaId));
      toast.success('Participação cancelada com sucesso.');
      setSelectedAula(null);
      onRefresh();
    } catch (err: any) {
      toast.error(err.message || 'Erro ao cancelar participação');
    }
  };

  // ── (Marcar Coachings removed — only Agenda remains) ─────────────

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-10 pb-10 bg-black/40 overflow-y-auto"
      onClick={onClose}>
      <div className="relative w-11/12 max-w-3xl bg-white rounded-2xl shadow-xl"
        onClick={e => e.stopPropagation()}>

        {/* ── Header ───────────────────────────────────────────────────*/}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#0d6b5e]/8">
          {selectedAula ? (
            <button type="button"
              onClick={() => setSelectedAula(null)}
              className="flex items-center gap-1.5 text-sm text-[#0d6b5e] hover:text-[#065147] transition-colors">
              <ChevronLeft className="w-4 h-4" />
              Voltar
            </button>
          ) : (
            <h2 className="text-lg text-[#0a1a17]" style={{ fontWeight: 700 }}>Agenda Coachings</h2>
          )}
          <button type="button" onClick={onClose}
            className="p-1 rounded-full hover:bg-black/5 transition-colors">
            <X className="w-5 h-5 text-[#4d7068]" />
          </button>
        </div>

        {/* ── Content ─────────────────────────────────────────────────*/}
        <div className="p-6 max-h-[65vh] overflow-y-auto">

          {/* ── Agenda: show existing aulas list ───────────────────── */}
          {!selectedAula && (
            <div className="space-y-2">
              {aulas.length === 0 ? (
                <div className="text-center py-8">
                  <p className="text-sm text-[#4d7068]">Nenhum coaching encontrado.</p>
                </div>
              ) : (
                [...aulas]
                  .filter((a: any) => a.status !== 'CANCELADA' && a.status !== 'REJEITADA')
                  .sort((a: any, b: any) => new Date(b.data).getTime() - new Date(a.data).getTime())
                  .slice(0, 50)
                  .map((aula: any) => {
                    const st = STATUS_CFG[aula.status] || STATUS_CFG.PENDENTE;
                    const d = new Date(aula.data);
                    return (
                      <button key={aula.id}
                        onClick={() => setSelectedAula(aula)}
                        className="w-full flex items-center gap-3 px-4 py-3 rounded-xl border border-[#0d6b5e]/10 bg-white hover:bg-[#f4f9f8] hover:border-[#0d6b5e]/25 transition-all text-left">
                        <div className="w-10 h-10 bg-[#0d6b5e] rounded-xl flex flex-col items-center justify-center text-white shrink-0">
                          <span className="text-[10px] leading-none text-white/70">{MESES_PT[d.getMonth()]}</span>
                          <span className="leading-none" style={{ fontWeight: 700, fontSize: '1rem' }}>{d.getDate()}</span>
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-sm text-[#0a1a17]">
                              {getAlunoNome(aula)} · {aula.professorNome}
                            </span>
                            <span className={`px-2 py-0.5 rounded-full text-[10px] font-medium ${st.bg} ${st.text}`}>
                              {st.label}
                            </span>
                          </div>
                          <div className="flex items-center gap-2 mt-1">
                            <span className="flex items-center gap-1 text-xs text-[#4d7068]">
                              <Calendar className="w-3 h-3" />
                              {d.toLocaleDateString('pt-PT')}
                            </span>
                            <span className="flex items-center gap-1 text-xs text-[#4d7068]">
                              <Clock className="w-3 h-3" />
                              {formatHora(aula.horaInicio)} – {formatHora(aula.horaFim || aula.horaInicio)}
                            </span>
                          </div>
                        </div>
                      </button>
                    );
                  })
              )}
            </div>
          )}

          {/* ── Agenda: detail view when aula is selected ─────────── */}
          {selectedAula && (
            <div>
              <div className="flex items-center gap-2 flex-wrap mb-4">
                <h4 className="text-lg text-[#0a1a17]">
                  {selectedAula.alunoNome || 'Coaching'}
                </h4>
                {(() => {
                  const st = STATUS_CFG[selectedAula.status];
                  if (!st) return null;
                  return (
                    <span className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-sm ${st.bg} ${st.text}`}>
                      <span className={`w-2 h-2 rounded-full ${st.dot}`} />
                      {st.label}
                    </span>
                  );
                })()}
              </div>

              {selectedAula.status === 'REJEITADA' && selectedAula.motivoRejeicao && (
                <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
                  <p className="text-xs text-red-700 font-medium mb-1">Motivo da rejeição</p>
                  <p className="text-sm text-red-800">{selectedAula.motivoRejeicao}</p>
                </div>
              )}

              <div className="grid grid-cols-2 gap-4 text-sm text-[#4d7068]">
                <div className="flex items-center gap-2">
                  <User className="w-4 h-4 text-[#0d6b5e] shrink-0" />
                  <span>Aluno: <span className="text-[#0a1a17]">{getAlunoNome(selectedAula)}</span></span>
                </div>
                <div className="flex items-center gap-2">
                  <UserPlus className="w-4 h-4 text-[#0d6b5e] shrink-0" />
                  <span>Prof.: <span className="text-[#0a1a17]">{selectedAula.professorNome}</span></span>
                </div>
                <div className="flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-[#0d6b5e] shrink-0" />
                  <span>{formatDate(selectedAula.data)}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Clock className="w-4 h-4 text-[#0d6b5e] shrink-0" />
                  <span>{formatHora(selectedAula.horaInicio)} – {formatHora(selectedAula.horaFim || selectedAula.horaInicio)}</span>
                </div>
                {selectedAula.estudioNome && (
                  <div className="flex items-center gap-2">
                    <MapPin className="w-4 h-4 text-[#0d6b5e] shrink-0" />
                    <span>{selectedAula.estudioNome}</span>
                  </div>
                )}
                {selectedAula.modalidade && (
                  <div className="flex items-center gap-2">
                    <BookOpen className="w-4 h-4 text-[#0d6b5e] shrink-0" />
                    <span>{selectedAula.modalidade}</span>
                  </div>
                )}
                {selectedAula.duracao && (
                  <div className="flex items-center gap-2">
                    <Clock className="w-4 h-4 text-[#0d6b5e] shrink-0" />
                    <span>{selectedAula.duracao} min</span>
                  </div>
                )}
              </div>

              {/* Sugestão de remarcação — aguarda resposta do EE */}
              {selectedAula.sugestaoestado === 'AGUARDA_EE' && (
                <div className="mt-6 pt-5 border-t border-[#0d6b5e]/8">
                  <p className="text-xs text-orange-700 bg-orange-50 px-3 py-2 rounded-lg border border-orange-200 mb-3">
                    Nova data proposta: {selectedAula.novadata || selectedAula.novaData}
                  </p>
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleResponderSugestaoEE(selectedAula.id, true)}
                      className="flex items-center gap-1.5 bg-[#0d6b5e] text-white px-4 py-2 rounded-lg hover:bg-[#065147] transition-colors text-sm flex-1 justify-center">
                      <CheckCircle className="w-4 h-4" />
                      Aceitar
                    </button>
                    <button
                      onClick={() => handleResponderSugestaoEE(selectedAula.id, false)}
                      className="flex items-center gap-1.5 bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 transition-colors text-sm flex-1 justify-center">
                      <XCircle className="w-4 h-4" />
                      Recusar
                    </button>
                  </div>
                </div>
              )}

              {/* Sugestão de remarcação — aguarda resposta da direção */}
              {selectedAula.sugestaoestado === 'AGUARDA_DIRECAO' && (
                <div className="mt-6 pt-5 border-t border-[#0d6b5e]/8">
                  <p className="text-xs text-amber-700 bg-amber-50 px-3 py-2 rounded-lg border border-amber-200 flex items-center gap-2">
                    <CalendarOff className="w-4 h-4 shrink-0" />
                    Remarcação a aguardar resposta da direção.
                  </p>
                </div>
              )}

              {/* Sugestão de remarcação — aguarda resposta do professor */}
              {selectedAula.sugestaoestado === 'AGUARDA_PROFESSOR' && (
                <div className="mt-6 pt-5 border-t border-[#0d6b5e]/8">
                  <p className="text-xs text-amber-700 bg-amber-50 px-3 py-2 rounded-lg border border-amber-200 flex items-center gap-2">
                    <CalendarOff className="w-4 h-4 shrink-0" />
                    Remarcação a aguardar resposta do professor.
                  </p>
                </div>
              )}

              {/* Cancelar participação (apenas PENDENTE ou CONFIRMADA sem sugestão ativa) */}
              {!selectedAula.sugestaoestado && (selectedAula.status === 'PENDENTE' || selectedAula.status === 'CONFIRMADA') && (
                <div className="mt-6 pt-5 border-t border-[#0d6b5e]/8">
                  <button
                    onClick={() => handleCancelarParticipacao(selectedAula.id)}
                    className="flex items-center gap-1.5 bg-red-100 text-red-700 px-4 py-2 rounded-lg hover:bg-red-200 transition-colors text-sm border border-red-200"
                  >
                    <XCircle className="w-4 h-4" />
                    Cancelar Participação
                  </button>
                </div>
              )}
            </div>
          )}

        </div>
      </div>
    </div>
  );
}
