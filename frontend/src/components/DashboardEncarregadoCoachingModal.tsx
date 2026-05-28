import { useState, useEffect } from 'react';
import { X, Calendar, Clock, User, Music2, MapPin, ChevronLeft } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { NovaSessaoForm } from './NovaSessaoForm';
import { PedidoAula } from '../types';
import api from '../services/api';
import { toast } from 'sonner';

const MESES_PT = ['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez'];

const STATUS_BADGE: Record<string, { label: string; bg: string; text: string }> = {
  PENDENTE:   { label: 'Pendente',   bg: 'bg-[#fdf6e3]', text: 'text-[#c9a84c]' },
  CONFIRMADA: { label: 'Confirmado', bg: 'bg-[#e2f0ed]',  text: 'text-[#0d6b5e]' },
  REALIZADA:  { label: 'Realizado',  bg: 'bg-[#e2f0ed]',  text: 'text-[#0d6b5e]' },
  REJEITADA:  { label: 'Cancelado',  bg: 'bg-red-100',    text: 'text-red-700'   },
  CANCELADA:  { label: 'Cancelado',  bg: 'bg-red-100',    text: 'text-red-700'   },
};

function formatHora(v: any): string {
  if (!v) return '';
  const s = String(v);
  const raw = s.includes('T') ? s.substring(11, 16) : s.substring(0, 5);
  const [h, m] = raw.split(':').map(Number);
  if (isNaN(h) || isNaN(m)) return '';
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
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

export function DashboardEncarregadoCoachingModal({ open, onClose, onRefresh, aulas, salas }: DashboardEncarregadoCoachingModalProps) {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<'marcar' | 'agenda'>('marcar');
  const [dispProfessores, setDispProfessores] = useState<any[]>([]);
  const [selectedSlot, setSelectedSlot] = useState<any | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);

  // Fetch disponibilidades when modal opens
  useEffect(() => {
    if (!open) return;
    (async () => {
      try {
        const res = await api.getProfessorDisponibilidades();
        if (res.success) setDispProfessores(res.data || []);
      } catch (err) {
        console.error('Erro ao carregar disponibilidades:', err);
      }
    })();
  }, [open]);

  // Reset selectedSlot when switching tabs
  useEffect(() => {
    setSelectedSlot(null);
    setSubmitError(null);
  }, [activeTab]);

  // ── Group disponibilidades by professor ──────────────────────────────
  const slotsPorProfessor = dispProfessores.reduce((acc: any[], d: any) => {
    const profNome = d.professorNome || d.professor?.nome || 'Professor';
    const profId = d.professorId || d.professor?.id;
    const existing = acc.find((g: any) => g.profId === profId);
    const slot = {
      id: d.id,
      data: d.data,
      horaInicio: d.horaInicio || d.horainicio,
      horaFim: d.horaFim || d.horafim,
      modalidade: d.modalidade || d.modalidadeNome || '',
      modalidadeId: d.modalidadeId || '',
      estudioNome: d.estudioNome || d.sala?.nome || '',
      professorId: String(profId),
      professorNome: profNome,
      disponibilidadeId: String(d.id),
      duracao: (() => {
        if (!d.horaInicio || !d.horaFim) return 60;
        const [h1, m1] = d.horaInicio.split(':').map(Number);
        const [h2, m2] = d.horaFim.split(':').map(Number);
        return Math.max((h2 * 60 + m2) - (h1 * 60 + m1), 30);
      })(),
    };
    if (existing) {
      existing.slots.push(slot);
    } else {
      acc.push({ profId, profNome, slots: [slot] });
    }
    return acc;
  }, []);

  // Sort by data then hora
  slotsPorProfessor.forEach((g: any) => {
    g.slots.sort((a: any, b: any) => {
      if (a.data !== b.data) return a.data.localeCompare(b.data);
      return (a.horaInicio || '').localeCompare(b.horaInicio || '');
    });
  });

  // ── Handle slot click ───────────────────────────────────────────────
  const handleSlotClick = (slot: any) => {
    setSubmitError(null);
    setSelectedSlot(slot);
  };

  // ── Handle NovaSessaoForm success ───────────────────────────────────
  const handleFormSuccess = async (novaAula: PedidoAula) => {
    if (!selectedSlot) return;
    try {
      const dispId = selectedSlot.disponibilidadeId ? parseInt(selectedSlot.disponibilidadeId) : undefined;
      const profId = selectedSlot.professorId ? parseInt(selectedSlot.professorId) : undefined;
      await api.submeterPedidoAula({
        data: novaAula.data,
        horainicio: novaAula.horaInicio,
        duracaoaula: String(novaAula.duracao),
        disponibilidade_mensal_id: dispId,
        professor_utilizador_id: profId,
        salaidsala: undefined,
        privacidade: novaAula.privacidade ?? false,
        maxparticipantes: novaAula.maxParticipantes ? parseInt(String(novaAula.maxParticipantes)) : undefined,
        alunoutilizadoriduser: novaAula.alunoId ? parseInt(novaAula.alunoId) : undefined,
      });
      toast.success('Pedido de coaching criado com sucesso! Aguardando aprovação da direção.');
      setSelectedSlot(null);
      onRefresh();
    } catch (error: any) {
      const msg = error?.response?.data?.error || error?.message || 'Erro ao submeter pedido';
      setSubmitError(msg);
      toast.error(msg);
    }
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-10 pb-10 bg-black/40 overflow-y-auto"
      onClick={onClose}>
      <div className="relative w-11/12 max-w-3xl bg-white rounded-2xl shadow-xl"
        onClick={e => e.stopPropagation()}>

        {/* ── Header ──────────────────────────────────────────────────── */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#0d6b5e]/8">
          {selectedSlot ? (
            <button type="button" onClick={() => { setSelectedSlot(null); setSubmitError(null); }}
              className="flex items-center gap-1.5 text-sm text-[#0d6b5e] hover:text-[#065147] transition-colors">
              <ChevronLeft className="w-4 h-4" />
              Voltar
            </button>
          ) : (
            <h2 className="text-lg text-[#0a1a17]" style={{ fontWeight: 700 }}>Coachings</h2>
          )}
          <button type="button" onClick={onClose}
            className="p-1 rounded-full hover:bg-black/5 transition-colors">
            <X className="w-5 h-5 text-[#4d7068]" />
          </button>
        </div>

        {/* ── Tabs (only when not in form view) ───────────────────────── */}
        {!selectedSlot && (
          <div className="flex border-b border-[#0d6b5e]/8">
            <button
              onClick={() => setActiveTab('marcar')}
              className={`flex-1 py-3 text-sm font-medium transition-colors ${
                activeTab === 'marcar'
                  ? 'text-[#0d6b5e] border-b-2 border-[#0d6b5e]'
                  : 'text-[#4d7068] hover:text-[#0d6b5e]'
              }`}
            >
              Marcar Coachings
            </button>
            <button
              onClick={() => setActiveTab('agenda')}
              className={`flex-1 py-3 text-sm font-medium transition-colors ${
                activeTab === 'agenda'
                  ? 'text-[#0d6b5e] border-b-2 border-[#0d6b5e]'
                  : 'text-[#4d7068] hover:text-[#0d6b5e]'
              }`}
            >
              Agenda Coachings
            </button>
          </div>
        )}

        {/* ── Content ────────────────────────────────────────────────── */}
        <div className="p-6 max-h-[65vh] overflow-y-auto">

          {/* ── Marcar tab: show disponibilidades list ────────────────── */}
          {activeTab === 'marcar' && !selectedSlot && (
            <div className="space-y-6">
              {slotsPorProfessor.length === 0 ? (
                <div className="text-center py-8">
                  <p className="text-sm text-[#4d7068]">Nenhuma disponibilidade encontrada.</p>
                  <p className="text-xs text-[#4d7068] mt-1">Os professores ainda não registaram disponibilidades.</p>
                </div>
              ) : (
                slotsPorProfessor.map((grupo: any) => (
                  <div key={grupo.profId}>
                    <div className="flex items-center gap-2 mb-3">
                      <User className="w-4 h-4 text-[#0d6b5e]" />
                      <h3 className="text-sm text-[#0a1a17]" style={{ fontWeight: 600 }}>{grupo.profNome}</h3>
                    </div>
                    <div className="grid gap-2">
                      {grupo.slots.map((slot: any) => {
                        const d = new Date(slot.data);
                        return (
                          <button key={slot.id}
                            onClick={() => handleSlotClick(slot)}
                            className="flex items-center gap-3 px-4 py-3 rounded-xl border border-[#0d6b5e]/10 bg-white hover:bg-[#f4f9f8] hover:border-[#0d6b5e]/25 transition-all text-left">
                            <div className="w-10 h-10 bg-[#0d6b5e] rounded-xl flex flex-col items-center justify-center text-white shrink-0">
                              <span className="text-[10px] leading-none text-white/70">{MESES_PT[d.getMonth()]}</span>
                              <span className="leading-none" style={{ fontWeight: 700, fontSize: '1rem' }}>{d.getDate()}</span>
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className="flex items-center gap-1 text-xs text-[#4d7068]">
                                  <Clock className="w-3 h-3" />
                                  {formatHora(slot.horaInicio)} – {formatHora(slot.horaFim)}
                                </span>
                                {slot.modalidade && (
                                  <span className="flex items-center gap-1 text-xs text-[#4d7068]">
                                    <Music2 className="w-3 h-3" />
                                    {slot.modalidade}
                                  </span>
                                )}
                                {slot.estudioNome && (
                                  <span className="flex items-center gap-1 text-xs text-[#4d7068]">
                                    <MapPin className="w-3 h-3" />
                                    {slot.estudioNome}
                                  </span>
                                )}
                              </div>
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                ))
              )}
            </div>
          )}

          {/* ── Marcar tab: show NovaSessaoForm when slot selected ────── */}
          {activeTab === 'marcar' && selectedSlot && (
            <NovaSessaoForm
              onSuccess={handleFormSuccess}
              onCancel={() => { setSelectedSlot(null); setSubmitError(null); }}
              aulasExistentes={aulas as PedidoAula[]}
              prefill={{
                professorId: selectedSlot.professorId,
                data: selectedSlot.data,
                horaInicio: selectedSlot.horaInicio,
                horaFim: selectedSlot.horaFim,
                duracao: String(selectedSlot.duracao),
                maxDuracao: String(selectedSlot.duracao),
                modalidade: selectedSlot.modalidade,
                modalidadeId: selectedSlot.modalidadeId,
              }}
              submitError={submitError}
              onClearError={() => setSubmitError(null)}
            />
          )}

          {/* ── Agenda tab: show existing aulas ──────────────────────── */}
          {activeTab === 'agenda' && (
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
                    const st = STATUS_BADGE[aula.status] || { label: aula.status, bg: 'bg-gray-100', text: 'text-gray-700' };
                    const d = new Date(aula.data);
                    return (
                      <div key={aula.id}
                        className="flex items-center gap-3 px-4 py-3 rounded-xl border border-[#0d6b5e]/10 bg-white">
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
                      </div>
                    );
                  })
              )}
            </div>
          )}

        </div>
      </div>
    </div>
  );
}
