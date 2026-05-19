import { useState, useEffect } from 'react';
import api from '../services/api';
import { SlotDisponibilidade, PedidoAula } from '../types';
import { hasRole } from '../utils/roleUtils';
import { Clock, MapPin, Music, CalendarDays, ChevronRight, CheckCircle2, AlertCircle, UserPlus, Users, ChevronDown, XCircle } from 'lucide-react';
import { format, addDays, startOfDay } from 'date-fns';
import { DateWarningIcon } from './DateAlerta';
import { toast } from 'sonner';

interface DisponibilidadeProfessoresPanelProps {
  aulasExistentes: PedidoAula[];
  onMarcarSlot?: (prefill: {
    professorId: string;
    estudioId?: string;
    data: string;
    horaInicio: string;
    duracao: string;
    maxDuracao?: string;
    modalidade?: string;
    modalidadeId?: string;
    disponibilidadeId?: string;
  }) => void;
  joinableCoachings?: PedidoAula[];
  onJoin?: (pedidoId: string, alunoId: string) => void;
  userAlunosIds?: string[];
}

const DIAS_SEMANA = [
  { num: 1, label: 'Segunda-feira', short: 'Seg' },
  { num: 2, label: 'Terça-feira', short: 'Ter' },
  { num: 3, label: 'Quarta-feira', short: 'Qua' },
  { num: 4, label: 'Quinta-feira', short: 'Qui' },
  { num: 5, label: 'Sexta-feira', short: 'Sex' },
  { num: 6, label: 'Sábado', short: 'Sáb' },
];

const MODALIDADE_COLORS: Record<string, string> = {
  'Hip-Hop': 'bg-orange-100 text-orange-800 border-orange-200',
  'Dança Urbana': 'bg-yellow-100 text-yellow-800 border-yellow-200',
  'Ballet Clássico': 'bg-pink-100 text-pink-800 border-pink-200',
  'Ballet Contemporâneo': 'bg-purple-100 text-purple-800 border-purple-200',
  'Dança Clássica': 'bg-rose-100 text-rose-800 border-rose-200',
  'Dança Contemporânea': 'bg-teal-100 text-teal-800 border-teal-200',
  'Teatro Dança': 'bg-indigo-100 text-indigo-800 border-indigo-200',
};

const PROFESSOR_AVATAR_COLORS: Record<string, string> = {
  'prof1': 'bg-orange-500',
  'prof2': 'bg-pink-500',
  'prof3': 'bg-teal-600',
};

const calcularHoraFim = (horaInicio: string, duracaoMin: number): string => {
  if (!horaInicio) return '';
  const [h, m] = horaInicio.split(':').map(Number);
  const totalMin = h * 60 + m + duracaoMin;
  return `${String(Math.floor(totalMin / 60)).padStart(2, '0')}:${String(totalMin % 60).padStart(2, '0')}`;
};

export function DisponibilidadeProfessoresPanel({ aulasExistentes, onMarcarSlot, joinableCoachings, onJoin, userAlunosIds }: DisponibilidadeProfessoresPanelProps) {
  const [users, setUsers] = useState<any[]>([]);
  const [professorSlots, setProfessorSlots] = useState<any[]>([]);
  const [joinAulaId, setJoinAulaId] = useState<string | null>(null);
  const [joinAlunoSelecionado, setJoinAlunoSelecionado] = useState<string>('');
  
  useEffect(() => {
    const fetchData = async () => {
      try {
        const [usersRes, slotsRes] = await Promise.all([
          api.getUsers(),
          api.getProfessorDisponibilidades()
        ]);
        if (usersRes.success) setUsers(usersRes.data || []);
        if (slotsRes.success) setProfessorSlots(slotsRes.data || []);
      } catch (err) {
        console.error('Erro ao carregar dados:', err);
      }
    };
    fetchData();
  }, []);

  const professores = users.filter(u => hasRole(u.role, 'PROFESSOR'));
  const [professorSelecionado, setProfessorSelecionado] = useState<string>('TODOS');
  const [slotExpandido, setSlotExpandido] = useState<string | null>(null);
  const [filtroModalidade, setFiltroModalidade] = useState<string>('TODAS');
  const todasModalidades = Array.from(new Set(professorSlots.map(s => s.modalidade).filter(Boolean))).sort();

  // Para slots de data específica (disponibilidade_mensal), retorna a própria data se for futura ou de hoje
  const getProximasDatas = (slot: any): { data: string; disponivel: boolean }[] => {
    const slotData = slot.data as string | undefined;
    if (slotData) {
      const hoje = startOfDay(new Date());
      const slotDate = startOfDay(new Date(slotData + 'T12:00:00'));
      // Allow slots from today onwards (not past dates)
      if (slotDate < hoje) return [];
      // Check if there are available minutes (maxDuracao > 0)
      const hasVagas = (slot.maxDuracao ?? 1) > 0;
      return [{ data: slotData, disponivel: hasVagas }];
    }
    // Fallback para slots recorrentes (diaSemana)
    const hoje = startOfDay(new Date());
    const resultados: { data: string; disponivel: boolean }[] = [];
    for (let i = 1; i <= 60 && resultados.length < 5; i++) {
      const data = addDays(hoje, i);
      if (data.getDay() === slot.diaSemana) {
        const dataStr = format(data, 'yyyy-MM-dd');
        const slotFim = calcularHoraFim(slot.horaInicio, slot.duracao || 60);
        const temConflito = aulasExistentes.some(a => {
          if (a.data !== dataStr) return false;
          if (a.status !== 'CONFIRMADA' && a.status !== 'PENDENTE') return false;
          if (a.professorId !== slot.professorId && a.estudioId !== slot.estudioId) return false;
          const aulaFim = a.horaFim || calcularHoraFim(a.horaInicio, a.duracao || 60);
          return (
            (slot.horaInicio >= a.horaInicio && slot.horaInicio < aulaFim) ||
            (slotFim > a.horaInicio && slotFim <= aulaFim) ||
            (slot.horaInicio <= a.horaInicio && slotFim >= aulaFim)
          );
        });
        resultados.push({ data: dataStr, disponivel: !temConflito });
      }
    }
    return resultados;
  };

  const formatDataChip = (dataStr: string) => {
    const data = new Date(dataStr + 'T12:00:00');
    const dia = data.getDate();
    const meses = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
    const mes = meses[data.getMonth()];
    const diaSemanaShort = DIAS_SEMANA.find(d => d.num === data.getDay())?.short || '';
    return { dia, mes, diaSemanaShort };
  };

  const professoresFiltrados = (professorSelecionado === 'TODOS'
    ? professores
    : professores.filter(p => p.id === professorSelecionado)
  ).filter(p =>
    filtroModalidade === 'TODAS'
    || professorSlots.some(s => s.professorId === p.id && s.modalidade === filtroModalidade)
  );

  // Agrupar slots por data (ou diaSemana para slots recorrentes legacy)
  const getSlotsPorDia = (professorId: string) => {
    const slots = professorSlots.filter(d => d.professorId === professorId);
    const porDia: Record<string, any[]> = {};
    slots.forEach((slot: any) => {
      const key = slot.data || String(slot.diaSemana);
      if (!porDia[key]) porDia[key] = [];
      porDia[key].push(slot);
    });
    return porDia;
  };

  // Obter modalidades únicas de um professor
  const getModalidadesProfessor = (professorId: string) => {
    const slots = professorSlots.filter(d => d.professorId === professorId);
    return [...new Set(slots.map(s => s.modalidade))];
  };

  return (
    <div className="space-y-5">
      {/* Header informativo */}
      <div className="bg-gradient-to-r from-[#0a1a17] to-[#0d3d33] p-5 rounded-2xl border border-white/5">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 bg-[#c9a84c]/20 rounded-xl flex items-center justify-center flex-shrink-0">
            <CalendarDays className="w-5 h-5 text-[#c9a84c]" />
          </div>
          <div>
            <h2 className="text-white mb-1" style={{ fontWeight: 600 }}>
              Disponibilidade dos Professores
            </h2>
            <p className="text-white/50 text-sm">
              Consulte os horários e salas disponíveis de cada professor. Clique numa data para pré-preencher automaticamente o formulário de marcação.
            </p>
          </div>
        </div>

        {/* Legenda */}
        <div className="flex items-center gap-4 mt-4 flex-wrap">
          <div className="flex items-center gap-1.5 text-xs text-white/60">
            <div className="w-3 h-3 rounded-full bg-[#0d6b5e]" />
            Disponível
          </div>
          <div className="flex items-center gap-1.5 text-xs text-white/60">
            <div className="w-3 h-3 rounded-full bg-red-500/70" />
            Ocupado
          </div>
          {onMarcarSlot && (
            <div className="flex items-center gap-1.5 text-xs text-white/60">
              <div className="w-3 h-3 rounded-full bg-[#c9a84c]" />
              Clique para marcar
            </div>
          )}
        </div>
      </div>

      {/* Filtros: Professor + Modalidade */}
      <div className="flex items-center gap-3 flex-wrap">
        <span className="text-sm text-[#4d7068]" style={{ fontWeight: 500 }}>Filtrar:</span>
        <select value={professorSelecionado} onChange={e => setProfessorSelecionado(e.target.value)}
          className="px-3 py-1.5 rounded-lg text-sm bg-white border border-[#0d6b5e]/20 focus:outline-none focus:border-[#0d6b5e] text-[#0a1a17]">
          <option value="TODOS">Todos os Professores</option>
          {professores.map(prof => (
            <option key={prof.id} value={prof.id}>{prof.nome}</option>
          ))}
        </select>
        <select value={filtroModalidade} onChange={e => setFiltroModalidade(e.target.value)}
          className="px-3 py-1.5 rounded-lg text-sm bg-white border border-[#0d6b5e]/20 focus:outline-none focus:border-[#0d6b5e] text-[#0a1a17]">
          <option value="TODAS">Todas as Modalidades</option>
          {todasModalidades.map(m => (
            <option key={m} value={m}>{m}</option>
          ))}
        </select>
      </div>

      {/* Cards dos professores */}
      {professoresFiltrados.map(professor => {
        const slotsPorDia = getSlotsPorDia(professor.id);
        const modalidades = getModalidadesProfessor(professor.id);
        const diasComSlots = Object.keys(slotsPorDia).sort();

        return (
          <div key={professor.id} className="bg-white rounded-2xl shadow-sm border border-[#0d6b5e]/10 overflow-hidden">
            {/* Header do professor */}
            <div className="bg-[#f4f9f8] px-6 py-4 border-b border-[#0d6b5e]/10">
              <div className="flex items-center gap-4">
                {/* Avatar */}
                <div className={`w-12 h-12 rounded-full flex items-center justify-center text-white text-lg flex-shrink-0 ${PROFESSOR_AVATAR_COLORS[professor.id] || 'bg-[#0d6b5e]'}`}>
                  {professor.nome.charAt(0)}
                </div>
                {/* Info */}
                <div className="flex-1">
                  <h3 className="text-[#0a1a17]" style={{ fontWeight: 600 }}>{professor.nome}</h3>
                  <p className="text-xs text-[#4d7068]">{professor.email}</p>
                  {/* Modalidades */}
                  <div className="flex flex-wrap gap-1.5 mt-2">
                    {modalidades.map(mod => (
                      <span
                        key={mod}
                        className={`px-2 py-0.5 rounded-full text-xs border ${MODALIDADE_COLORS[mod] || 'bg-gray-100 text-gray-700 border-gray-200'}`}
                      >
                        {mod}
                      </span>
                    ))}
                  </div>
                </div>
                {/* Resumo de datas */}
                <div className="hidden md:flex items-center gap-2 flex-shrink-0">
                  <div className="flex flex-col items-center px-4 py-2 rounded-xl bg-[#0d6b5e]/10 border border-[#0d6b5e]/20">
                    <span className="text-lg text-[#0d6b5e]" style={{ fontWeight: 700 }}>{diasComSlots.length}</span>
                    <span className="text-xs text-[#4d7068]">datas</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Slots por data */}
            <div className="divide-y divide-[#0d6b5e]/5">
              {diasComSlots.map(dateKey => {
                const slots = slotsPorDia[dateKey];
                const isDateKey = dateKey.includes('-');
                const dateLabel = isDateKey
                  ? new Date(dateKey + 'T12:00:00').toLocaleDateString('pt-PT', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })
                  : (DIAS_SEMANA.find(d => d.num === Number(dateKey))?.label ?? dateKey);

                return (
                  <div key={dateKey} className="px-6 py-4">
                    {/* Label da data */}
                    <div className="flex items-center gap-2 mb-3">
                      <div className="w-2 h-2 rounded-full bg-[#c9a84c]" />
                      <span className="inline-flex items-center gap-1 text-sm text-[#0a1a17]" style={{ fontWeight: 600 }}>
                        {dateLabel}
                        <DateWarningIcon data={dateKey} />
                      </span>
                    </div>

                    {/* Slots desse dia */}
                    <div className="space-y-3 ml-4">
                      {slots.map(slot => {
                        const proximasDatas = getProximasDatas(slot);
                        const isExpanded = slotExpandido === slot.id;
                        const disponiveisCount = proximasDatas.filter(d => d.disponivel).length;

                        return (
                          <div
                            key={slot.id}
                            className="border border-[#0d6b5e]/15 rounded-xl overflow-hidden hover:border-[#0d6b5e]/30 transition-colors"
                          >
                            {/* Info do slot */}
                            <button
                              onClick={() => setSlotExpandido(isExpanded ? null : slot.id)}
                              className="w-full text-left p-4"
                            >
                              <div className="flex items-center justify-between">
                                <div className="flex items-center gap-4 flex-wrap">
                                  {/* Hora */}
                                  <div className="flex items-center gap-1.5 text-sm text-[#0a1a17]">
                                    <Clock className="w-4 h-4 text-[#0d6b5e]" />
                                    <span style={{ fontWeight: 600 }}>{slot.horaInicio}</span>
                                    <span className="text-[#4d7068]">–</span>
                                    <span style={{ fontWeight: 600 }}>{slot.horaFim}</span>
                                    {slot.intervalosLivres && slot.intervalosLivres.length > 0 ? (
                                      <span className="text-xs text-[#4d7068] ml-1">
                                        {slot.intervalosLivres.length} intervalo{slot.intervalosLivres.length > 1 ? 's' : ''} livre{slot.intervalosLivres.length > 1 ? 's' : ''}
                                      </span>
                                    ) : (
                                      <span className="text-xs text-[#4d7068] ml-1">({slot.maxDuracao ?? slot.duracao} min disponíveis)</span>
                                    )}
                                  </div>

                                  {!onMarcarSlot && slot.estudioNome && (
                                    <div className="flex items-center gap-1.5 text-sm text-[#4d7068]">
                                      <MapPin className="w-4 h-4 text-[#0d6b5e]" />
                                      <span>{slot.estudioNome}</span>
                                    </div>
                                  )}

                                  {/* Modalidade */}
                                  <div className="flex items-center gap-1.5">
                                    <Music className="w-3.5 h-3.5 text-[#0d6b5e]" />
                                    <span
                                      className={`px-2 py-0.5 rounded-full text-xs border ${
                                        MODALIDADE_COLORS[slot.modalidade] || 'bg-gray-100 text-gray-700 border-gray-200'
                                      }`}
                                    >
                                      {slot.modalidade}
                                    </span>
                                  </div>
                                </div>

                                {/* Status e toggle */}
                                <div className="flex items-center gap-2 ml-2 flex-shrink-0">
                                  <span className={`text-xs px-2 py-1 rounded-full ${
                                    disponiveisCount > 0
                                      ? 'bg-[#e2f0ed] text-[#0d6b5e]'
                                      : 'bg-red-50 text-red-700'
                                  }`}>
                                    {disponiveisCount > 0 ? `${disponiveisCount} datas livres` : 'Sem vagas'}
                                  </span>
                                  <ChevronRight
                                    className={`w-4 h-4 text-[#4d7068] transition-transform ${isExpanded ? 'rotate-90' : ''}`}
                                  />
                                </div>
                              </div>
                            </button>

                            {/* Datas expandidas */}
                            {isExpanded && (
                              <div className="px-4 pb-4 bg-[#f4f9f8]/50 border-t border-[#0d6b5e]/10">
                                {slot.intervalosLivres && slot.intervalosLivres.length > 0 && slot.data ? (
                                  <>
                                    <p className="text-xs text-[#4d7068] mt-3 mb-3" style={{ fontWeight: 500 }}>
                                      Intervalos disponíveis em {new Date(slot.data + 'T12:00:00').toLocaleDateString('pt-PT', { day: 'numeric', month: 'long' })}:
                                    </p>
                                    <div className="flex flex-wrap gap-2">
                                      {slot.intervalosLivres.map((int, idx) => (
                                        <button
                                          key={idx}
                                          onClick={() => {
                                            if (onMarcarSlot) {
                                              onMarcarSlot({
                                                professorId: slot.professorId,
                                                estudioId: slot.estudioId,
                                                data: slot.data,
                                                horaInicio: int.inicio,
                                                duracao: String(Math.min(int.minutos, 120)),
                                                maxDuracao: String(int.minutos),
                                                modalidade: slot.modalidade,
                                                disponibilidadeId: slot.id,
                                              });
                                            }
                                          }}
                                          disabled={!onMarcarSlot}
                                          className="flex flex-col items-center px-4 py-2.5 rounded-xl border transition-all bg-white border-[#0d6b5e]/30 hover:bg-[#0d6b5e] hover:text-white hover:border-[#0d6b5e] group cursor-pointer shadow-sm"
                                        >
                                          <span className="text-sm font-semibold text-[#0a1a17] group-hover:text-white">
                                            {int.inicio} – {int.fim}
                                          </span>
                                          <span className="text-xs text-[#0d6b5e] group-hover:text-white/80">
                                            {int.minutos} min
                                          </span>
                                        </button>
                                      ))}
                                    </div>
                                    {onMarcarSlot && (
                                      <p className="text-xs text-[#0d6b5e] mt-3 flex items-center gap-1">
                                        <CheckCircle2 className="w-3.5 h-3.5" />
                                        Clique num intervalo para pré-preencher o formulário de marcação
                                      </p>
                                    )}
                                  </>
                                ) : (
                                  <>
                                    <p className="text-xs text-[#4d7068] mt-3 mb-3" style={{ fontWeight: 500 }}>
                                      Data disponível:
                                    </p>
                                    <div className="flex flex-wrap gap-2">
                                      {proximasDatas.map(({ data, disponivel }) => {
                                        const { dia, mes, diaSemanaShort } = formatDataChip(data);
                                        return (
  <button
                                          key={data}
                                          onClick={() => {
                                            if (disponivel && onMarcarSlot) {
                                              onMarcarSlot({
                                                professorId: slot.professorId,
                                                estudioId: slot.estudioId,
                                                data: data,
                                                horaInicio: slot.horaInicio.includes('T')
                                                  ? slot.horaInicio.substring(11, 16)
                                                  : String(slot.horaInicio).substring(0, 5),
                                                duracao: String(slot.maxDuracao > 0 ? slot.maxDuracao : 30),
                                                maxDuracao: String(slot.maxDuracao),
                                                modalidade: slot.modalidade,
                                                disponibilidadeId: slot.id,
                                              });
                                            }
                                          }}
                                          disabled={!disponivel || slot.maxDuracao <= 0 || !onMarcarSlot}
                                            className={`flex flex-col items-center px-3 py-2 rounded-xl border transition-all ${
                                              disponivel && onMarcarSlot
                                                ? 'bg-white border-[#0d6b5e]/30 hover:bg-[#0d6b5e] hover:text-white hover:border-[#0d6b5e] group cursor-pointer shadow-sm'
                                                : disponivel
                                                  ? 'bg-white border-[#0d6b5e]/30 shadow-sm cursor-default'
                                                  : 'bg-gray-50 border-gray-200 cursor-not-allowed opacity-60'
                                            }`}
                                            title={disponivel && !onMarcarSlot ? `Disponível em ${data}` : disponivel ? `Marcar coaching para ${data}` : 'Data ocupada'}
                                          >
                                            <span className={`text-xs mb-0.5 ${disponivel ? 'text-[#4d7068] group-hover:text-white/80' : 'text-gray-400'}`}>
                                              {diaSemanaShort}
                                            </span>
                                            <span className={`text-sm ${disponivel ? 'text-[#0a1a17] group-hover:text-white' : 'text-gray-400'}`} style={{ fontWeight: 600 }}>
                                              {dia}
                                            </span>
                                            <span className={`text-xs ${disponivel ? 'text-[#0d6b5e] group-hover:text-white/80' : 'text-gray-400'}`}>
                                              {mes}
                                            </span>
                                            {disponivel ? (
                                              <CheckCircle2 className="w-3 h-3 text-[#0d6b5e] group-hover:text-white mt-0.5" />
                                            ) : (
                                              <AlertCircle className="w-3 h-3 text-red-400 mt-0.5" />
                                            )}
                                          </button>
                                        );
                                      })}
                                    </div>

                                    {proximasDatas.filter(d => d.disponivel).length > 0 && (
                                      <p className="text-xs text-[#0d6b5e] mt-3 flex items-center gap-1">
                                        <CheckCircle2 className="w-3.5 h-3.5" />
                                        Clique numa data disponível para pré-preencher o formulário de marcação
                                      </p>
                                    )}
                                  </>
                                )}
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* ─── Aulas com Vagas (joinable coachings) ─── */}
            {joinableCoachings && joinableCoachings.length > 0 && (
              <div className="border-t border-[#0d6b5e]/10 px-6 py-4">
                <div className="flex items-center gap-2 mb-3">
                  <Users className="w-4 h-4 text-[#c9a84c]" />
                  <span className="text-sm text-[#0a1a17]" style={{ fontWeight: 600 }}>
                    Coachings com Vagas
                  </span>
                  <span className="text-xs px-2 py-0.5 rounded-full bg-[#c9a84c]/20 text-[#8a6a1a]" style={{ fontWeight: 600 }}>
                    {joinableCoachings.filter(c => c.professorId === professor.id).length}
                  </span>
                </div>
                <div className="space-y-3">
                  {joinableCoachings
                    .filter(c => c.professorId === professor.id)
                    .map(coaching => {
                      const ocupados = (coaching.alunoId ? 1 : 0) + (coaching.participantes?.length ?? 0);
                      const livres = (coaching.maxParticipantes ?? 1) - ocupados;
                      const isJoining = joinAulaId === coaching.id;
                      const alunosDisp = (userAlunosIds ?? [])
                        .map(id => users.find(u => u.id === id))
                        .filter(Boolean)
                        .filter(u => !(coaching.participantes ?? []).some(p => p.alunoId === u.id)
                          && u.id !== coaching.alunoId);

                      return (
                        <div key={coaching.id} className="border border-[#c9a84c]/30 rounded-xl bg-[#fefce8]/50 p-4">
                          <div className="flex items-center justify-between gap-4">
                            <div className="flex items-center gap-3 flex-wrap">
                              <div className="flex items-center gap-1.5 text-sm text-[#0a1a17]">
                                <Clock className="w-4 h-4 text-[#0d6b5e]" />
                                <span style={{ fontWeight: 600 }}>{coaching.horaInicio}</span>
                                <span className="text-[#4d7068]">–</span>
                                <span style={{ fontWeight: 600 }}>{coaching.horaFim}</span>
                              </div>
                              <div className="flex items-center gap-1.5 text-sm text-[#4d7068]">
                                <MapPin className="w-4 h-4 text-[#0d6b5e]" />
                                <span>{coaching.estudioNome}</span>
                              </div>
                              <span className={`text-xs px-2 py-0.5 rounded-full border ${MODALIDADE_COLORS[coaching.modalidade] || 'bg-gray-100 text-gray-700 border-gray-200'}`}>
                                {coaching.modalidade}
                              </span>
                              <span className={`text-xs px-2 py-0.5 rounded-full ${livres > 0 ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                                {livres} vaga{livres !== 1 ? 's' : ''}
                              </span>
                            </div>

                            {onJoin && livres > 0 && alunosDisp.length > 0 && (
                              <div className="flex-shrink-0">
                                {!isJoining ? (
                                  <button
                                    onClick={() => { setJoinAulaId(coaching.id); setJoinAlunoSelecionado(''); }}
                                    className="flex items-center gap-1.5 bg-[#c9a84c] text-[#0a1a17] px-3 py-2 rounded-lg hover:bg-[#e8c97a] transition-colors text-sm whitespace-nowrap"
                                    style={{ fontWeight: 600 }}
                                  >
                                    <UserPlus className="w-4 h-4" />
                                    Juntar-se
                                    <ChevronDown className="w-3 h-3" />
                                  </button>
                                ) : (
                                  <div className="flex items-center gap-2">
                                    <select
                                      value={joinAlunoSelecionado}
                                      onChange={(e) => setJoinAlunoSelecionado(e.target.value)}
                                      className="px-3 py-2 rounded-lg border border-[#0d6b5e]/20 text-sm bg-white"
                                    >
                                      <option value="">Selecionar aluno</option>
                                      {alunosDisp.map(a => (
                                        <option key={a.id} value={a.id}>{a.nome}</option>
                                      ))}
                                    </select>
                                    <button
                                      onClick={() => {
                                        if (!joinAlunoSelecionado) { toast.error('Selecione um aluno'); return; }
                                        onJoin(coaching.id, joinAlunoSelecionado);
                                        setJoinAulaId(null);
                                        setJoinAlunoSelecionado('');
                                      }}
                                      className="bg-[#0d6b5e] text-white px-3 py-2 rounded-lg hover:bg-[#065147] transition-colors text-sm"
                                      style={{ fontWeight: 600 }}
                                    >
                                      Confirmar
                                    </button>
                                    <button
                                      onClick={() => { setJoinAulaId(null); setJoinAlunoSelecionado(''); }}
                                      className="p-2 text-[#4d7068] hover:text-red-600 transition-colors"
                                    >
                                      <XCircle className="w-5 h-5" />
                                    </button>
                                  </div>
                                )}
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })}
                </div>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
