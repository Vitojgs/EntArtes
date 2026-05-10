import { useState } from 'react';
import { Link } from 'react-router';
import { useAuth } from '../contexts/AuthContext';
import { mockUsers, mockDisponibilidades, mockProfessoresPerfis, mockEstudios } from '../data/mockData';
import { SlotDisponibilidade, ProfessorPerfil } from '../types';
import {
  ArrowLeft, Clock, MapPin, BookOpen, Star, Edit3,
  Plus, Trash2, Check, X, ChevronLeft, Calendar
} from 'lucide-react';

/* ─── constantes ─── */
const DIAS_SEMANA = [
  { num: 1, label: 'Segunda', abbr: 'Seg' },
  { num: 2, label: 'Terça',   abbr: 'Ter' },
  { num: 3, label: 'Quarta',  abbr: 'Qua' },
  { num: 4, label: 'Quinta',  abbr: 'Qui' },
  { num: 5, label: 'Sexta',   abbr: 'Sex' },
  { num: 6, label: 'Sábado',  abbr: 'Sáb' },
];

const MODALIDADE_CORES: Record<string, string> = {
  'Hip-Hop':              'bg-violet-100 text-violet-700',
  'Dança Urbana':         'bg-indigo-100 text-indigo-700',
  'Breaking':             'bg-blue-100 text-blue-700',
  'Ballet Clássico':      'bg-pink-100 text-pink-700',
  'Ballet Contemporâneo': 'bg-rose-100 text-rose-700',
  'Dança Clássica':       'bg-fuchsia-100 text-fuchsia-700',
  'Dança Contemporânea':  'bg-teal-100 text-teal-700',
  'Teatro Dança':         'bg-emerald-100 text-emerald-700',
  'Contemporâneo':        'bg-cyan-100 text-cyan-700',
  'Jazz':                 'bg-amber-100 text-amber-700',
  'Popping & Locking':    'bg-orange-100 text-orange-700',
};

function modalidadeCor(m: string) {
  return MODALIDADE_CORES[m] ?? 'bg-[#e2f0ed] text-[#0d6b5e]';
}

function avatarIniciais(nome: string) {
  return nome.split(' ').slice(0, 2).map(p => p[0]).join('').toUpperCase();
}

/* ─── tipo local ─── */
interface NovoSlot {
  diaSemana: number;
  horaInicio: string;
  horaFim: string;
  estudioId: string;
  modalidade: string;
}
const SLOT_VAZIO: NovoSlot = {
  diaSemana: 1, horaInicio: '09:00', horaFim: '10:00', estudioId: 'est1', modalidade: ''
};

/* ════════════════════════════════════════════════════════════
   GRELHA DE DISPONIBILIDADE
═══════════════════════════════════════════════════════════════ */
function DisponibilidadeSection({
  professorId,
  professorNome,
  canEdit,
  slots,
  onSlotsChange,
}: {
  professorId: string;
  professorNome: string;
  canEdit: boolean;
  slots: SlotDisponibilidade[];
  onSlotsChange: (s: SlotDisponibilidade[]) => void;
}) {
  const [modoEdicao, setModoEdicao] = useState(false);
  const [showForm, setShowForm]     = useState(false);
  const [novoSlot, setNovoSlot]     = useState<NovoSlot>(SLOT_VAZIO);
  const [feedback, setFeedback]     = useState<string | null>(null);

  function remover(id: string) {
    onSlotsChange(slots.filter(s => s.id !== id));
    flash('Slot removido.');
  }

  function adicionar() {
    if (!novoSlot.modalidade.trim()) { flash('Preenche a modalidade.'); return; }
    if (novoSlot.horaInicio >= novoSlot.horaFim) { flash('Hora de início deve ser antes da hora de fim.'); return; }
    const est = mockEstudios.find(e => e.id === novoSlot.estudioId)!;
    const [hi, mi] = novoSlot.horaInicio.split(':').map(Number);
    const [hf, mf] = novoSlot.horaFim.split(':').map(Number);
    const novo: SlotDisponibilidade = {
      id: 'disp_' + Date.now(),
      professorId,
      professorNome,
      diaSemana: novoSlot.diaSemana,
      horaInicio: novoSlot.horaInicio,
      horaFim: novoSlot.horaFim,
      duracao: (hf * 60 + mf) - (hi * 60 + mi),
      estudioId: novoSlot.estudioId,
      estudioNome: est.nome,
      modalidade: novoSlot.modalidade.trim(),
    };
    onSlotsChange([...slots, novo]);
    setNovoSlot(SLOT_VAZIO);
    setShowForm(false);
    flash('Slot adicionado!');
  }

  function flash(msg: string) {
    setFeedback(msg);
    setTimeout(() => setFeedback(null), 3000);
  }

  const porDia      = DIAS_SEMANA.map(d => ({
    ...d,
    slots: slots.filter(s => s.diaSemana === d.num).sort((a, b) => a.horaInicio.localeCompare(b.horaInicio))
  }));
  const diasComSlots = porDia.filter(d => d.slots.length > 0);

  return (
    <div>
      {/* Cabeçalho */}
      <div className="flex items-center justify-between mb-5">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-[#0d6b5e]/10 flex items-center justify-center">
            <Calendar className="w-5 h-5 text-[#0d6b5e]" />
          </div>
          <div>
            <h3 className="text-[#0a1a17]" style={{ fontWeight: 600 }}>
              Disponibilidade Semanal
            </h3>
            <p className="text-sm text-[#4d7068]">
              Horários disponíveis para marcação de aulas individuais
            </p>
          </div>
        </div>

        {canEdit && !modoEdicao && (
          <button
            onClick={() => setModoEdicao(true)}
            className="flex items-center gap-2 px-4 py-2 bg-[#0d6b5e] text-white rounded-lg hover:bg-[#065147] transition-colors text-sm"
          >
            <Edit3 className="w-4 h-4" />
            Gerir Disponibilidade
          </button>
        )}
        {canEdit && modoEdicao && (
          <button
            onClick={() => { setModoEdicao(false); setShowForm(false); }}
            className="flex items-center gap-2 px-4 py-2 bg-[#deecea] text-[#0d6b5e] rounded-lg hover:bg-[#c8e0dc] transition-colors text-sm"
          >
            <Check className="w-4 h-4" />
            Concluir Edição
          </button>
        )}
      </div>

      {/* Feedback */}
      {feedback && (
        <div className="mb-4 px-4 py-2 rounded-lg bg-[#e2f0ed] text-[#0d6b5e] text-sm border border-[#0d6b5e]/20">
          {feedback}
        </div>
      )}

      {/* Grelha */}
      {slots.length === 0 ? (
        <div className="text-center py-10 bg-[#f4f9f8] rounded-xl border border-dashed border-[#0d6b5e]/20">
          <Clock className="w-10 h-10 text-[#0d6b5e]/20 mx-auto mb-2" />
          <p className="text-[#4d7068] text-sm">
            {canEdit
              ? 'Ainda não definiste disponibilidades. Clica em "Gerir Disponibilidade" para adicionar.'
              : 'Este professor ainda não definiu disponibilidades.'}
          </p>
        </div>
      ) : (
        <div className="grid gap-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {diasComSlots.map(dia => (
              <div key={dia.num} className="bg-[#f4f9f8] rounded-xl border border-[#0d6b5e]/10 overflow-hidden">
                <div className="px-4 py-2.5 bg-[#0d6b5e] flex items-center justify-between">
                  <span className="text-white text-sm" style={{ fontWeight: 600 }}>{dia.label}</span>
                  <span className="text-white/60 text-xs">{dia.slots.length} slot{dia.slots.length > 1 ? 's' : ''}</span>
                </div>
                <div className="divide-y divide-[#0d6b5e]/5">
                  {dia.slots.map(slot => (
                    <div key={slot.id} className="px-4 py-3 flex items-start justify-between gap-2">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 mb-1 flex-wrap">
                          <span className="text-[#0a1a17] text-sm" style={{ fontWeight: 600 }}>
                            {slot.horaInicio} – {slot.horaFim}
                          </span>
                          <span className="text-xs text-[#4d7068]">({slot.duracao} min)</span>
                        </div>
                        <span className={`inline-block text-xs px-2 py-0.5 rounded-full mb-1.5 ${modalidadeCor(slot.modalidade)}`}>
                          {slot.modalidade}
                        </span>
                        <div className="flex items-center gap-1 text-xs text-[#4d7068]">
                          <MapPin className="w-3 h-3 flex-shrink-0" />
                          <span className="truncate">{slot.estudioNome}</span>
                        </div>
                      </div>
                      {modoEdicao && (
                        <button
                          onClick={() => remover(slot.id)}
                          className="flex-shrink-0 w-7 h-7 rounded-lg bg-red-50 text-red-400 hover:bg-red-100 hover:text-red-600 flex items-center justify-center transition-colors"
                          title="Remover slot"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>

          {/* Dias sem slots em modo edição */}
          {modoEdicao && porDia.some(d => d.slots.length === 0) && (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-2">
              {porDia.filter(d => d.slots.length === 0).map(dia => (
                <div key={dia.num} className="border border-dashed border-[#0d6b5e]/20 rounded-xl py-3 text-center">
                  <span className="text-xs text-[#4d7068]/60">{dia.label}</span>
                  <p className="text-xs text-[#4d7068]/40 mt-0.5">sem slots</p>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Botão / formulário de novo slot */}
      {modoEdicao && (
        <div className="mt-4">
          {!showForm ? (
            <button
              onClick={() => setShowForm(true)}
              className="w-full flex items-center justify-center gap-2 py-3 border-2 border-dashed border-[#0d6b5e]/30 rounded-xl text-[#0d6b5e] hover:border-[#0d6b5e] hover:bg-[#e2f0ed] transition-colors text-sm"
            >
              <Plus className="w-4 h-4" />
              Adicionar Novo Slot
            </button>
          ) : (
            <div className="bg-white border border-[#0d6b5e]/20 rounded-xl p-5 shadow-sm">
              <div className="flex items-center justify-between mb-4">
                <h4 className="text-[#0a1a17] text-sm" style={{ fontWeight: 600 }}>
                  Novo Slot de Disponibilidade
                </h4>
                <button
                  onClick={() => setShowForm(false)}
                  className="w-7 h-7 rounded-lg bg-[#f4f9f8] text-[#4d7068] hover:bg-[#deecea] flex items-center justify-center"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs text-[#4d7068] mb-1.5">Dia da Semana</label>
                  <select
                    value={novoSlot.diaSemana}
                    onChange={e => setNovoSlot(s => ({ ...s, diaSemana: +e.target.value }))}
                    className="w-full px-3 py-2 text-sm border border-[#0d6b5e]/20 rounded-lg bg-[#f4f9f8] focus:outline-none focus:border-[#0d6b5e]"
                  >
                    {DIAS_SEMANA.map(d => <option key={d.num} value={d.num}>{d.label}</option>)}
                  </select>
                </div>

                <div>
                  <label className="block text-xs text-[#4d7068] mb-1.5">Estúdio</label>
                  <select
                    value={novoSlot.estudioId}
                    onChange={e => setNovoSlot(s => ({ ...s, estudioId: e.target.value }))}
                    className="w-full px-3 py-2 text-sm border border-[#0d6b5e]/20 rounded-lg bg-[#f4f9f8] focus:outline-none focus:border-[#0d6b5e]"
                  >
                    {mockEstudios.map(e => <option key={e.id} value={e.id}>{e.nome}</option>)}
                  </select>
                </div>

                <div>
                  <label className="block text-xs text-[#4d7068] mb-1.5">Hora de Início</label>
                  <input
                    type="time"
                    value={novoSlot.horaInicio}
                    onChange={e => setNovoSlot(s => ({ ...s, horaInicio: e.target.value }))}
                    className="w-full px-3 py-2 text-sm border border-[#0d6b5e]/20 rounded-lg bg-[#f4f9f8] focus:outline-none focus:border-[#0d6b5e]"
                  />
                </div>

                <div>
                  <label className="block text-xs text-[#4d7068] mb-1.5">Hora de Fim</label>
                  <input
                    type="time"
                    value={novoSlot.horaFim}
                    onChange={e => setNovoSlot(s => ({ ...s, horaFim: e.target.value }))}
                    className="w-full px-3 py-2 text-sm border border-[#0d6b5e]/20 rounded-lg bg-[#f4f9f8] focus:outline-none focus:border-[#0d6b5e]"
                  />
                </div>

                <div className="md:col-span-2">
                  <label className="block text-xs text-[#4d7068] mb-1.5">Modalidade</label>
                  <input
                    type="text"
                    placeholder="ex: Hip-Hop, Ballet Clássico, Jazz…"
                    value={novoSlot.modalidade}
                    onChange={e => setNovoSlot(s => ({ ...s, modalidade: e.target.value }))}
                    className="w-full px-3 py-2 text-sm border border-[#0d6b5e]/20 rounded-lg bg-[#f4f9f8] focus:outline-none focus:border-[#0d6b5e]"
                  />
                </div>
              </div>

              <div className="flex gap-3 mt-4">
                <button
                  onClick={adicionar}
                  className="flex items-center gap-2 px-4 py-2 bg-[#0d6b5e] text-white rounded-lg hover:bg-[#065147] transition-colors text-sm"
                >
                  <Plus className="w-4 h-4" />
                  Adicionar Slot
                </button>
                <button
                  onClick={() => { setShowForm(false); setNovoSlot(SLOT_VAZIO); }}
                  className="px-4 py-2 bg-[#f4f9f8] text-[#4d7068] rounded-lg hover:bg-[#deecea] transition-colors text-sm"
                >
                  Cancelar
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Nota para alunos/encarregados */}
      {!canEdit && slots.length > 0 && (
        <div className="mt-4 p-3 bg-[#e2f0ed]/60 rounded-xl border border-[#0d6b5e]/10 text-xs text-[#4d7068]">
          Para marcar uma aula nestes horários, acede a{' '}
          <strong>Aulas → Marcar Aulas</strong> e seleciona este professor.
        </div>
      )}
    </div>
  );
}

/* ════════════════════════════════════════════════════════════
   DETALHE DO PROFESSOR
═══════════════════════════════════════════════════════════════ */
function ProfessorDetalhe({
  professorId,
  onBack,
  canEdit,
  slots,
  onSlotsChange,
  perfil,
  onPerfilChange,
}: {
  professorId: string;
  onBack: () => void;
  canEdit: boolean;
  slots: SlotDisponibilidade[];
  onSlotsChange: (s: SlotDisponibilidade[]) => void;
  perfil: ProfessorPerfil;
  onPerfilChange: (p: ProfessorPerfil) => void;
}) {
  const professor = mockUsers.find(u => u.id === professorId)!;
  const [novaEsp, setNovaEsp] = useState('');
  const [editEsp, setEditEsp] = useState(false);

  function adicionarEsp() {
    if (!novaEsp.trim()) return;
    onPerfilChange({ ...perfil, especialidades: [...perfil.especialidades, novaEsp.trim()] });
    setNovaEsp('');
  }
  function removerEsp(i: number) {
    onPerfilChange({ ...perfil, especialidades: perfil.especialidades.filter((_, idx) => idx !== i) });
  }

  return (
    <div>
      <button
        onClick={onBack}
        className="flex items-center gap-2 text-[#0d6b5e] hover:text-[#065147] mb-6 text-sm transition-colors"
      >
        <ChevronLeft className="w-4 h-4" />
        Ver todos os professores
      </button>

      <div className="grid lg:grid-cols-4 gap-6">
        {/* ── Coluna esquerda: info do professor ── */}
        <div className="lg:col-span-1 space-y-4">
          {/* Card professor */}
          <div className="bg-white rounded-2xl shadow-sm border border-[#0d6b5e]/5 overflow-hidden">
            <div className="h-20 bg-gradient-to-br from-[#0d6b5e] to-[#065147]" />
            <div className="px-5 pb-5 -mt-8">
              <div
                className="w-16 h-16 rounded-2xl bg-[#c9a84c] flex items-center justify-center text-white text-xl border-4 border-white shadow-md mb-3"
                style={{ fontWeight: 700 }}
              >
                {avatarIniciais(professor.nome)}
              </div>
              <h2 className="text-lg text-[#0a1a17] mb-0.5" style={{ fontWeight: 700 }}>{professor.nome}</h2>
              <p className="text-xs text-[#4d7068] mb-3">{professor.email}</p>
              <span className="text-xs px-2.5 py-1 rounded-full bg-[#e2f0ed] text-[#0d6b5e]">Professor</span>
            </div>
          </div>

          {/* Estatísticas */}
          <div className="bg-white rounded-2xl shadow-sm border border-[#0d6b5e]/5 p-4 space-y-3">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-xl bg-[#c9a84c]/10 flex items-center justify-center flex-shrink-0">
                <Star className="w-4 h-4 text-[#c9a84c]" />
              </div>
              <div>
                <div className="text-xs text-[#4d7068]">Experiência</div>
                <div className="text-sm text-[#0a1a17]" style={{ fontWeight: 600 }}>{perfil.anosExperiencia} anos</div>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-xl bg-[#0d6b5e]/10 flex items-center justify-center flex-shrink-0">
                <Clock className="w-4 h-4 text-[#0d6b5e]" />
              </div>
              <div>
                <div className="text-xs text-[#4d7068]">Slots / semana</div>
                <div className="text-sm text-[#0a1a17]" style={{ fontWeight: 600 }}>{slots.length}</div>
              </div>
            </div>
          </div>

          {/* Especialidades */}
          <div className="bg-white rounded-2xl shadow-sm border border-[#0d6b5e]/5 p-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm text-[#0a1a17] flex items-center gap-2" style={{ fontWeight: 600 }}>
                <BookOpen className="w-4 h-4 text-[#0d6b5e]" />
                Modalidades
              </h3>
              {canEdit && (
                <button
                  onClick={() => setEditEsp(!editEsp)}
                  className="text-xs text-[#0d6b5e] hover:text-[#065147]"
                >
                  {editEsp ? 'Fechar' : 'Editar'}
                </button>
              )}
            </div>
            <div className="flex flex-wrap gap-1.5">
              {perfil.especialidades.map((esp, i) => (
                <div key={i} className="flex items-center gap-1">
                  <span className={`text-xs px-2 py-0.5 rounded-full ${modalidadeCor(esp)}`}>{esp}</span>
                  {editEsp && (
                    <button
                      onClick={() => removerEsp(i)}
                      className="w-3.5 h-3.5 rounded-full bg-red-100 text-red-400 hover:bg-red-200 flex items-center justify-center"
                    >
                      <X className="w-2 h-2" />
                    </button>
                  )}
                </div>
              ))}
            </div>
            {editEsp && (
              <div className="mt-3 flex gap-2">
                <input
                  type="text"
                  placeholder="Nova modalidade…"
                  value={novaEsp}
                  onChange={e => setNovaEsp(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && adicionarEsp()}
                  className="flex-1 px-3 py-1.5 text-xs border border-[#0d6b5e]/20 rounded-lg bg-[#f4f9f8] focus:outline-none focus:border-[#0d6b5e]"
                />
                <button
                  onClick={adicionarEsp}
                  className="px-3 py-1.5 bg-[#0d6b5e] text-white rounded-lg hover:bg-[#065147] text-xs"
                >
                  <Plus className="w-3.5 h-3.5" />
                </button>
              </div>
            )}
          </div>
        </div>

        {/* ── Coluna direita: disponibilidade (ocupa 3/4) ── */}
        <div className="lg:col-span-3">
          <div className="bg-white rounded-2xl shadow-sm border border-[#0d6b5e]/5 p-6">
            <DisponibilidadeSection
              professorId={professorId}
              professorNome={professor.nome}
              canEdit={canEdit}
              slots={slots}
              onSlotsChange={onSlotsChange}
            />
          </div>
        </div>
      </div>
    </div>
  );
}

/* ════════════════════════════════════════════════════════════
   PÁGINA PRINCIPAL
═══════════════════════════════════════════════════════════════ */
export function Professores() {
  const { user } = useAuth();
  const professores = mockUsers.filter(u => u.role === 'PROFESSOR');

  const [allSlots, setAllSlots]   = useState<SlotDisponibilidade[]>(mockDisponibilidades);
  const [allPerfis, setAllPerfis] = useState<ProfessorPerfil[]>(mockProfessoresPerfis);

  // Professores abrem diretamente no seu próprio perfil
  const [selecionado, setSelecionado] = useState<string | null>(
    user?.role === 'PROFESSOR' ? user.id : null
  );

  function getSlots(pid: string) {
    return allSlots.filter(s => s.professorId === pid);
  }
  function getPerfil(pid: string): ProfessorPerfil {
    return allPerfis.find(p => p.professorId === pid) ?? {
      professorId: pid, bio: '', especialidades: [], anosExperiencia: 0, formacao: ''
    };
  }
  function updateSlots(pid: string, updated: SlotDisponibilidade[]) {
    setAllSlots([...allSlots.filter(s => s.professorId !== pid), ...updated]);
  }
  function updatePerfil(updated: ProfessorPerfil) {
    setAllPerfis(allPerfis.map(p => p.professorId === updated.professorId ? updated : p));
  }

  const canEdit = (pid: string) =>
    user?.role === 'DIRECAO' || (user?.role === 'PROFESSOR' && user.id === pid);

  /* ── VISTA DE DETALHE ── */
  if (selecionado) {
    const prof = mockUsers.find(u => u.id === selecionado)!;
    return (
      <div className="min-h-screen bg-[#f4f9f8]">
        <div className="bg-[#0a1a17] border-b border-white/5">
          <div className="max-w-7xl mx-auto px-4 py-6">
            <div className="mb-2 flex items-center gap-2 text-sm text-white/50">
              <Link to="/dashboard" className="hover:text-[#c9a84c] flex items-center gap-1 transition-colors">
                <ArrowLeft className="w-4 h-4" />
                Dashboard
              </Link>
              <span>/</span>
              {user?.role !== 'PROFESSOR' && (
                <>
                  <button
                    onClick={() => setSelecionado(null)}
                    className="hover:text-[#c9a84c] transition-colors"
                  >
                    Disponibilidades
                  </button>
                  <span>/</span>
                </>
              )}
              <span className="text-white/80">{prof.nome}</span>
            </div>
            <h1 className="text-2xl text-white">Disponibilidades de {prof.nome}</h1>
          </div>
        </div>

        <div className="max-w-7xl mx-auto px-4 py-8">
          <ProfessorDetalhe
            professorId={selecionado}
            onBack={() => setSelecionado(null)}
            canEdit={canEdit(selecionado)}
            slots={getSlots(selecionado)}
            onSlotsChange={u => updateSlots(selecionado, u)}
            perfil={getPerfil(selecionado)}
            onPerfilChange={updatePerfil}
          />
        </div>
      </div>
    );
  }

  /* ── LISTA DE PROFESSORES ── */
  return (
    <div className="min-h-screen bg-[#f4f9f8]">
      <div className="bg-[#0a1a17] border-b border-white/5">
        <div className="max-w-7xl mx-auto px-4 py-6">
          <div className="mb-4 flex items-center gap-2 text-sm text-white/50">
            <Link to="/dashboard" className="hover:text-[#c9a84c] flex items-center gap-1 transition-colors">
              <ArrowLeft className="w-4 h-4" />
              Dashboard
            </Link>
            <span>/</span>
            <span className="text-white/80">Disponibilidades</span>
          </div>
          <h1 className="text-3xl text-white mb-1">Disponibilidades de Professores</h1>
          <p className="text-white/50 text-sm">
            Consulta os horários disponíveis de cada professor para marcação de aulas individuais
          </p>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {professores.map(prof => {
            const perfil = getPerfil(prof.id);
            const slots  = getSlots(prof.id);
            const dias   = [...new Set(slots.map(s => s.diaSemana))].sort();

            return (
              <div
                key={prof.id}
                className="bg-white rounded-2xl shadow-sm border border-[#0d6b5e]/5 overflow-hidden hover:shadow-md transition-shadow"
              >
                {/* Banner */}
                <div className="h-16 bg-gradient-to-br from-[#0d6b5e] to-[#065147]" />

                <div className="px-5 pb-5 -mt-7">
                  <div
                    className="w-14 h-14 rounded-2xl bg-[#c9a84c] flex items-center justify-center text-white text-lg border-4 border-white shadow-md mb-3"
                    style={{ fontWeight: 700 }}
                  >
                    {avatarIniciais(prof.nome)}
                  </div>

                  <h3 className="text-[#0a1a17] mb-0.5" style={{ fontWeight: 700 }}>{prof.nome}</h3>
                  <p className="text-xs text-[#4d7068] mb-3">{perfil.anosExperiencia} anos de experiência</p>

                  {/* Modalidades */}
                  <div className="flex flex-wrap gap-1.5 mb-4">
                    {perfil.especialidades.slice(0, 3).map((esp, i) => (
                      <span key={i} className={`text-xs px-2 py-0.5 rounded-full ${modalidadeCor(esp)}`}>
                        {esp}
                      </span>
                    ))}
                    {perfil.especialidades.length > 3 && (
                      <span className="text-xs px-2 py-0.5 rounded-full bg-[#f4f9f8] text-[#4d7068]">
                        +{perfil.especialidades.length - 3}
                      </span>
                    )}
                  </div>

                  {/* Disponibilidade resumida */}
                  <div className="flex items-start gap-2 p-3 bg-[#f4f9f8] rounded-xl mb-4">
                    <Clock className="w-4 h-4 text-[#0d6b5e] flex-shrink-0 mt-0.5" />
                    <div>
                      <span className="text-xs text-[#4d7068]">
                        {slots.length === 0
                          ? 'Sem slots definidos'
                          : `${slots.length} slot${slots.length > 1 ? 's' : ''} disponíveis`}
                      </span>
                      {dias.length > 0 && (
                        <div className="flex gap-1 mt-1 flex-wrap">
                          {dias.map(d => {
                            const dia = DIAS_SEMANA.find(x => x.num === d);
                            return (
                              <span key={d} className="text-xs bg-[#0d6b5e]/10 text-[#0d6b5e] px-1.5 py-0.5 rounded">
                                {dia?.abbr}
                              </span>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  </div>

                  <button
                    onClick={() => setSelecionado(prof.id)}
                    className="w-full py-2 bg-[#0d6b5e] text-white rounded-xl hover:bg-[#065147] transition-colors text-sm"
                    style={{ fontWeight: 600 }}
                  >
                    Ver Disponibilidade
                  </button>
                </div>
              </div>
            );
          })}
        </div>

        {/* Nota informativa para alunos/encarregados */}
        {(user?.role === 'ALUNO' || user?.role === 'ENCARREGADO') && (
          <div className="mt-8 bg-[#e2f0ed] border border-[#0d6b5e]/20 rounded-xl p-5">
            <div className="flex items-start gap-3">
              <Calendar className="w-5 h-5 text-[#0d6b5e] flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-[#0d6b5e] text-sm" style={{ fontWeight: 600 }}>Como marcar uma aula?</p>
                <p className="text-[#4d7068] text-sm mt-1">
                  Consulta a disponibilidade do professor pretendido e depois acede a{' '}
                  <Link to="/dashboard/aulas" className="text-[#0d6b5e] underline hover:text-[#065147]">
                    Aulas → Marcar Aulas
                  </Link>{' '}
                  para submeter o pedido.
                </p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
