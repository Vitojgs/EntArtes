import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router';
import { useAuth } from '../contexts/AuthContext';
import { PedidoAula } from '../types';
import api from '../services/api';
import {
  CalendarDays, MapPin, Clock, ChevronLeft, ChevronRight,
  ArrowRight, Users, Calendar, UserPlus, ChevronDown, XCircle
} from 'lucide-react';
import { toast } from 'sonner';

const DIAS_SEMANA = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
const MESES = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];
const MESES_PT = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun',
  'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];

const MODALIDADE_DOT: Record<string, string> = {
  'Dança': 'bg-pink-500',
  'Yoga': 'bg-orange-500',
  'Pilates': 'bg-purple-500',
  'Meditação': 'bg-blue-500',
  'Customizado': 'bg-teal-500',
};

function formatTime(v: any): string {
  if (!v) return '';
  if (v instanceof Date) return v.toISOString().substring(11, 16);
  const s = String(v);
  return s.includes('T') ? s.substring(11, 16) : s.substring(0, 5);
}

export function DisponibilidadesProfessores() {
  const { user, activeRole } = useAuth();
  const navigate = useNavigate();

  const [disponibilidades, setDisponibilidades] = useState<any[]>([]);
  const [joinableCoachings, setJoinableCoachings] = useState<PedidoAula[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [joinAulaId, setJoinAulaId] = useState<string | null>(null);
  const [joinAlunoSelecionado, setJoinAlunoSelecionado] = useState<string>('');
  const [loading, setLoading] = useState(true);

  const hoje = new Date();
  const [calMonth, setCalMonth] = useState(hoje.getMonth());
  const [calYear, setCalYear] = useState(hoje.getFullYear());
  const [diaSelected, setDiaSelected] = useState<number | null>(null);

  const [professorFiltro, setProfessorFiltro] = useState<string>('TODOS');
  const [modalidadeFiltro, setModalidadeFiltro] = useState<string>('TODAS');

  useEffect(() => {
    loadDisponibilidades();
  }, []);

  const loadDisponibilidades = async () => {
    setLoading(true);
    try {
      const endpoint = activeRole === 'ALUNO'
        ? api.getAlunoDisponibilidades()
        : api.getEncarregadoDisponibilidades();
      const [dispRes, joinRes, usersRes] = await Promise.all([
        endpoint,
        activeRole === 'ENCARREGADO' ? api.getJoinableCoachings() : Promise.resolve(null),
        api.getUsers(),
      ]);
      if (dispRes.success) {
        setDisponibilidades(dispRes.data || []);
      }
      if (joinRes?.success && joinRes.data) {
        setJoinableCoachings(joinRes.data);
      }
      if (usersRes.success) {
        setUsers(usersRes.data || []);
      }
    } catch (err) {
      console.error('Erro ao carregar disponibilidades:', err);
    } finally {
      setLoading(false);
    }
  };

  const professores = useMemo(() => {
    const seen = new Set<string>();
    return disponibilidades
      .filter((d: any) => {
        if (seen.has(d.professorId)) return false;
        seen.add(d.professorId);
        return true;
      })
      .map((d: any) => ({ id: d.professorId, nome: d.professorNome }))
      .sort((a: any, b: any) => a.nome.localeCompare(b.nome));
  }, [disponibilidades]);

  const todasModalidades = useMemo(() => {
    return [...new Set(disponibilidades.map((d: any) => d.modalidade).filter(Boolean))]
      .sort();
  }, [disponibilidades]);

  const filtered = useMemo(() => {
    return disponibilidades.filter((d: any) => {
      if (professorFiltro !== 'TODOS' && d.professorId !== professorFiltro) return false;
      if (modalidadeFiltro !== 'TODAS' && d.modalidade !== modalidadeFiltro) return false;
      return true;
    });
  }, [disponibilidades, professorFiltro, modalidadeFiltro]);

  const porDia = useMemo(() => {
    const map: Record<string, any[]> = {};
    filtered.forEach((d: any) => {
      if (!d.data) return;
      if (!map[d.data]) map[d.data] = [];
      map[d.data].push(d);
    });
    return map;
  }, [filtered]);

  const joinablePorDia = useMemo(() => {
    const map: Record<string, PedidoAula[]> = {};
    joinableCoachings.forEach((c: PedidoAula) => {
      if (!c.data) return;
      if (professorFiltro !== 'TODOS' && c.professorId !== professorFiltro) return;
      if (modalidadeFiltro !== 'TODAS' && c.modalidade !== modalidadeFiltro) return;
      if (!map[c.data]) map[c.data] = [];
      map[c.data].push(c);
    });
    return map;
  }, [joinableCoachings, professorFiltro, modalidadeFiltro]);


  const primeiroDia = new Date(calYear, calMonth, 1).getDay();
  const diasNoMes = new Date(calYear, calMonth + 1, 0).getDate();

  const cells: (number | null)[] = [
    ...Array(primeiroDia).fill(null),
    ...Array.from({ length: diasNoMes }, (_, i) => i + 1),
  ];

  const hasDisp = (dia: number) => {
    const dataStr = `${calYear}-${String(calMonth + 1).padStart(2, '0')}-${String(dia).padStart(2, '0')}`;
    return !!porDia[dataStr] || !!joinablePorDia[dataStr];
  };

  const getDisponibilidadesDoDia = (dia: number) => {
    const dataStr = `${calYear}-${String(calMonth + 1).padStart(2, '0')}-${String(dia).padStart(2, '0')}`;
    return (porDia[dataStr] || []);
  };

  const isToday = (dia: number) =>
    dia === hoje.getDate() && calMonth === hoje.getMonth() && calYear === hoje.getFullYear();

  const prevMonth = () => {
    if (calMonth === 0) { setCalMonth(11); setCalYear(calYear - 1); }
    else setCalMonth(calMonth - 1);
    setDiaSelected(null);
  };

  const nextMonth = () => {
    if (calMonth === 11) { setCalMonth(0); setCalYear(calYear + 1); }
    else setCalMonth(calMonth + 1);
    setDiaSelected(null);
  };

  const handleMarcarSlot = (slot: any) => {
    navigate('/dashboard/coaching', {
      state: {
        prefill: {
          professorId: slot.professorId,
          data: slot.data,
          horaInicio: formatTime(slot.horaInicio),
          duracao: String(slot.maxDuracao || '60'),
          maxDuracao: String(slot.maxDuracao || '60'),
          modalidade: slot.modalidade,
          modalidadeId: slot.modalidadeId,
          estudioId: slot.estudioId || '',
          disponibilidadeId: slot.id,
        }
      }
    });
  };

  const handleJoinFromDisp = async (pedidoId: string, alunoId: string) => {
    try {
      await api.marcarAula(parseInt(pedidoId), parseInt(alunoId));
      toast.success('Aluno inscrito no coaching com sucesso!');
      const res = await api.getJoinableCoachings();
      if (res.success && res.data) setJoinableCoachings(res.data);
    } catch (err: any) {
      toast.error(err.message || 'Erro ao inscrever aluno');
    }
    setJoinAulaId(null);
    setJoinAlunoSelecionado('');
  };

  const getAlunosDisponiveis = (coaching: PedidoAula) => {
    if (activeRole !== 'ENCARREGADO') return [];
    const ids = coaching.participantes?.map(p => p.alunoId) ?? [coaching.alunoId];
    const meuAlunoIds = user.alunosIds ?? [];
    return users
      .filter(u => meuAlunoIds.includes(u.id))
      .filter(u => !ids.includes(u.id))
      .map(u => ({ id: u.id, nome: u.nome }));
  };

  const dispDia = diaSelected ? getDisponibilidadesDoDia(diaSelected) : [];
  const joinDia = diaSelected ? (joinablePorDia[`${calYear}-${String(calMonth + 1).padStart(2, '0')}-${String(diaSelected).padStart(2, '0')}`] || []) : [];
  const diaSemana = diaSelected ? new Date(calYear, calMonth, diaSelected).getDay() : -1;

  const greeting = (() => {
    const h = hoje.getHours();
    if (h < 12) return 'Bom dia';
    if (h < 19) return 'Boa tarde';
    return 'Boa noite';
  })();

  if (loading) {
    return (
      <div className="min-h-screen bg-[#f4f9f8] flex items-center justify-center">
        <div className="text-[#4d7068]">A carregar disponibilidades...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f4f9f8]">
      {/* Header */}
      <div className="bg-[#0a1a17] px-4 sm:px-6">
        <div className="max-w-7xl mx-auto py-5 flex items-center gap-3">
          <div className="w-9 h-9 bg-[#c9a84c]/20 rounded-xl flex items-center justify-center flex-shrink-0">
            <CalendarDays className="w-5 h-5 text-[#c9a84c]" />
          </div>
          <div>
            <h1 className="text-white text-lg" style={{ fontWeight: 600 }}>
              Disponibilidades dos Professores
            </h1>
            <p className="text-white/50 text-xs">
              {greeting}, {user?.nome?.split(' ')[0] || 'Utilizador'} · {activeRole === 'ALUNO' ? 'Visualização apenas' : 'Clique num slot para marcar'}
            </p>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-6 space-y-6">
        {/* Filters */}
        <div className="bg-white rounded-2xl shadow-sm border border-[#0d6b5e]/8 p-4">
          <div className="flex items-center gap-4 flex-wrap">
            <div className="flex items-center gap-2">
              <Users className="w-4 h-4 text-[#4d7068]" />
              <span className="text-sm text-[#4d7068]" style={{ fontWeight: 500 }}>Professor:</span>
              <select
                value={professorFiltro}
                onChange={(e) => { setProfessorFiltro(e.target.value); setDiaSelected(null); }}
                className="px-3 py-1.5 rounded-lg text-sm border border-[#0d6b5e]/20 bg-white text-[#0a1a17] focus:outline-none focus:ring-2 focus:ring-[#0d6b5e]/30 min-w-[180px]"
              >
                <option value="TODOS">Todos os Professores</option>
                {professores.map((p: any) => (
                  <option key={p.id} value={p.id}>{p.nome}</option>
                ))}
              </select>
            </div>
            <div className="flex items-center gap-2">
              <Calendar className="w-4 h-4 text-[#4d7068]" />
              <span className="text-sm text-[#4d7068]" style={{ fontWeight: 500 }}>Modalidade:</span>
              <select
                value={modalidadeFiltro}
                onChange={(e) => { setModalidadeFiltro(e.target.value); setDiaSelected(null); }}
                className="px-3 py-1.5 rounded-lg text-sm border border-[#0d6b5e]/20 bg-white text-[#0a1a17] focus:outline-none focus:ring-2 focus:ring-[#0d6b5e]/30 min-w-[160px]"
              >
                <option value="TODAS">Todas as Modalidades</option>
                {todasModalidades.map((mod: string) => (
                  <option key={mod} value={mod}>{mod}</option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Calendar + Side panel */}
        <div className="grid lg:grid-cols-3 gap-6">
          {/* Calendar */}
          <div className="lg:col-span-2 bg-white rounded-2xl shadow-sm border border-[#0d6b5e]/8 overflow-hidden">
            <div className="flex items-center justify-between px-6 py-4 border-b border-[#0d6b5e]/8">
              <button onClick={prevMonth}
                className="p-2 text-[#4d7068] hover:text-[#0d6b5e] hover:bg-[#e2f0ed] rounded-xl transition-colors">
                <ChevronLeft className="w-4 h-4" />
              </button>
              <div className="text-center">
                <p className="text-[#0a1a17]" style={{ fontWeight: 700, fontSize: '1.05rem' }}>
                  {MESES[calMonth]}
                </p>
                <p className="text-xs text-[#4d7068]">{calYear}</p>
              </div>
              <button onClick={nextMonth}
                className="p-2 text-[#4d7068] hover:text-[#0d6b5e] hover:bg-[#e2f0ed] rounded-xl transition-colors">
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>

            <div className="p-4">
              <div className="grid grid-cols-7 mb-1">
                {DIAS_SEMANA.map(d => (
                  <div key={d} className="text-center py-2 text-xs text-[#4d7068]/60" style={{ fontWeight: 600 }}>
                    {d}
                  </div>
                ))}
              </div>

              <div className="grid grid-cols-7 gap-1">
                {cells.map((dia, idx) => {
                  if (!dia) return <div key={idx} />;
                  const temDisp = hasDisp(dia);
                  const selected = diaSelected === dia;
                  const ehHoje = isToday(dia);

                  return (
                    <button
                      key={idx}
                      onClick={() => setDiaSelected(dia)}
                      className={`relative flex flex-col items-center py-2 rounded-xl transition-all group ${
                        selected
                          ? 'bg-[#0d6b5e] shadow-sm'
                          : ehHoje
                          ? 'bg-[#0d6b5e]/8 ring-2 ring-[#0d6b5e]/30'
                          : temDisp
                          ? 'hover:bg-[#e2f0ed]'
                          : 'hover:bg-[#f4f9f8]'
                      }`}
                    >
                      <span className={`text-sm leading-none ${
                        selected ? 'text-white' : ehHoje ? 'text-[#0d6b5e]' : 'text-[#0a1a17]'
                      }`} style={{ fontWeight: selected || ehHoje ? 700 : temDisp ? 500 : 400 }}>
                        {dia}
                      </span>

                      {temDisp && (
                        <div className="flex gap-0.5 mt-1.5 flex-wrap justify-center max-w-[28px]">
                          <div className={`w-1.5 h-1.5 rounded-full ${selected ? 'bg-white/70' : 'bg-[#c9a84c]'}`} />
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>

              {/* Legend */}
              <div className="flex items-center gap-5 mt-4 pt-4 border-t border-[#0d6b5e]/8">
                <div className="flex items-center gap-1.5 text-xs text-[#4d7068]">
                  <div className="w-2 h-2 rounded-full bg-[#c9a84c]" /> Com disponibilidade
                </div>
                <div className="flex items-center gap-1.5 text-xs text-[#4d7068]">
                  <div className="w-2 h-2 rounded-full bg-[#0d6b5e]" /> Selecionado
                </div>
              </div>
            </div>
          </div>

          {/* Side panel */}
          <div className="bg-white rounded-2xl shadow-sm border border-[#0d6b5e]/8 flex flex-col overflow-hidden">
            {diaSelected && (dispDia.length > 0 || joinDia.length > 0) ? (
              <>
                <div className="px-5 py-4 border-b border-[#0d6b5e]/8">
                  <p className="text-xs text-[#4d7068] mb-0.5">{DIAS_SEMANA[diaSemana]}</p>
                  <p className="text-[#0a1a17]" style={{ fontWeight: 700, fontSize: '1.4rem' }}>
                    {diaSelected} <span className="text-[#4d7068]" style={{ fontWeight: 400, fontSize: '1rem' }}>{MESES_PT[calMonth]}</span>
                  </p>
                  <p className="text-xs text-[#4d7068] mt-0.5">
                    {dispDia.length} slot{dispDia.length !== 1 ? 's' : ''} disponíve{dispDia.length !== 1 ? 'is' : 'l'}
                    {joinDia.length > 0 && ` · ${joinDia.length} coaching${joinDia.length !== 1 ? 's' : ''} com vagas`}
                  </p>
                </div>

                <div className="flex-1 overflow-y-auto divide-y divide-[#0d6b5e]/5">
                  {/* Disponibilidades */}
                  {dispDia
                    .sort((a: any, b: any) => (a.horaInicio || '').localeCompare(b.horaInicio || ''))
                    .map((d: any) => {
                      const modDot = MODALIDADE_DOT[d.modalidade] ?? 'bg-gray-400';
                      const horaInicio = formatTime(d.horaInicio);
                      const horaFim = formatTime(d.horaFim);
                      return (
                        <div key={d.id} className="px-5 py-4">
                          <div className="flex items-start justify-between gap-2 mb-2">
                            <div className="flex items-center gap-2">
                              <div className="flex items-center gap-1 text-[#0a1a17]" style={{ fontWeight: 600 }}>
                                <Clock className="w-3.5 h-3.5 text-[#0d6b5e]" />
                                <span className="text-sm">{horaInicio}</span>
                              </div>
                              <span className="text-xs text-[#4d7068]">– {horaFim}</span>
                            </div>
                          </div>
                          <p className="text-sm text-[#0a1a17] mb-1.5" style={{ fontWeight: 500 }}>
                            {d.professorNome}
                          </p>
                          <div className="flex items-center gap-3 text-xs text-[#4d7068]">
                            <span className="flex items-center gap-1">
                              <span className={`w-2 h-2 rounded-full ${modDot}`} />
                              {d.modalidade}
                            </span>
                            {d.estudioNome && (
                              <span className="flex items-center gap-1">
                                <MapPin className="w-3 h-3" />
                                {d.estudioNome}
                              </span>
                            )}
                          </div>
                          {activeRole === 'ENCARREGADO' && (
                            <button
                              onClick={() => handleMarcarSlot(d)}
                              className="mt-3 flex items-center gap-1.5 bg-[#0d6b5e] text-white px-4 py-2 rounded-lg text-sm hover:bg-[#065147] transition-colors w-full justify-center"
                              style={{ fontWeight: 500 }}
                            >
                              Marcar Coaching <ArrowRight className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      );
                    })}
                  {/* Joinable coachings */}
                  {joinDia
                    .sort((a: any, b: any) => (a.horaInicio || '').localeCompare(b.horaInicio || ''))
                    .map((c: PedidoAula) => {
                      const livres = (c.maxParticipantes ?? 1) - (1 + (c.participantes?.length ?? 0));
                      const isJoining = joinAulaId === c.id;
                      const alunosDisp = getAlunosDisponiveis(c);
                      return (
                        <div key={c.id} className="px-5 py-4 border-t border-[#c9a84c]/20">
                          <div className="flex items-start justify-between gap-2 mb-2">
                            <div className="flex items-center gap-2">
                              <div className="flex items-center gap-1 text-[#0a1a17]" style={{ fontWeight: 600 }}>
                                <Clock className="w-3.5 h-3.5 text-[#c9a84c]" />
                                <span className="text-sm">{c.horaInicio}</span>
                              </div>
                              <span className="text-xs text-[#4d7068]">– {c.horaFim}</span>
                              <span className={`text-xs px-1.5 py-0.5 rounded-full ${livres > 0 ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                                {livres} vaga{livres !== 1 ? 's' : ''}
                              </span>
                            </div>
                          </div>
                          <p className="text-sm text-[#0a1a17] mb-1.5" style={{ fontWeight: 500 }}>
                            {c.professorNome}
                          </p>
                          <div className="flex items-center gap-3 text-xs text-[#4d7068]">
                            <span className="flex items-center gap-1">
                              <span className="w-2 h-2 rounded-full bg-[#c9a84c]" />
                              {c.modalidade}
                            </span>
                            {c.estudioNome && (
                              <span className="flex items-center gap-1">
                                <MapPin className="w-3 h-3" />
                                {c.estudioNome}
                              </span>
                            )}
                          </div>
                          {activeRole === 'ENCARREGADO' && livres > 0 && (
                            <div className="mt-3">
                              {!isJoining ? (
                                <button
                                  onClick={() => { setJoinAulaId(c.id); setJoinAlunoSelecionado(''); }}
                                  className="flex items-center gap-1.5 bg-[#c9a84c] text-[#0a1a17] px-4 py-2 rounded-lg text-sm hover:bg-[#e8c97a] transition-colors w-full justify-center"
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
                                    className="flex-1 px-3 py-2 rounded-lg border border-[#0d6b5e]/20 text-sm bg-white"
                                  >
                                    <option value="">Selecionar aluno</option>
                                    {alunosDisp.map(a => (
                                      <option key={a.id} value={a.id}>{a.nome}</option>
                                    ))}
                                  </select>
                                  <button
                                    onClick={() => {
                                      if (!joinAlunoSelecionado) { toast.error('Selecione um aluno'); return; }
                                      handleJoinFromDisp(c.id, joinAlunoSelecionado);
                                    }}
                                    className="bg-[#0d6b5e] text-white px-3 py-2 rounded-lg text-sm hover:bg-[#065147] transition-colors"
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
                      );
                    })}
                </div>
              </>
            ) : (
              <div className="flex-1 flex flex-col items-center justify-center py-10 px-5 text-center">
                <Calendar className="w-12 h-12 text-[#0d6b5e]/20 mb-3" />
                <p className="text-sm text-[#4d7068]" style={{ fontWeight: 500 }}>
                  {diaSelected ? 'Nenhuma disponibilidade neste dia' : 'Selecione um dia no calendário'}
                </p>
                <p className="text-xs text-[#4d7068]/60 mt-1">
                  {diaSelected ? 'Tente alterar os filtros acima' : 'Clique num dia para ver os horários disponíveis'}
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Disponibilidades do dia selecionado (full-width) */}
        {diaSelected && (dispDia.length > 0 || joinDia.length > 0) && (
          <div className="bg-white rounded-2xl shadow-sm border border-[#0d6b5e]/8 overflow-hidden">
            <div className="px-5 py-4 border-b border-[#0d6b5e]/8 flex items-center gap-2">
              <div className="w-7 h-7 bg-[#c9a84c]/15 rounded-lg flex items-center justify-center">
                <Clock className="w-4 h-4 text-[#c9a84c]" />
              </div>
              <div>
                <p className="text-[#0a1a17]" style={{ fontWeight: 600 }}>
                  Disponibilidades — {diaSelected} de {MESES_PT[calMonth]}
                </p>
                <p className="text-xs text-[#4d7068]">{DIAS_SEMANA[diaSemana]} · {dispDia.length} slot{dispDia.length !== 1 ? 's' : ''} disponíve{dispDia.length !== 1 ? 'is' : 'l'}
                  {joinDia.length > 0 && ` · ${joinDia.length} coaching${joinDia.length !== 1 ? 's' : ''} com vagas`}
                </p>
              </div>
            </div>
            <div className="divide-y divide-[#0d6b5e]/5">
              {/* Disponibilidades */}
              {dispDia
                .sort((a: any, b: any) => (a.horaInicio || '').localeCompare(b.horaInicio || ''))
                .map((d: any) => {
                  const modDot = MODALIDADE_DOT[d.modalidade] ?? 'bg-gray-400';
                  const horaInicio = formatTime(d.horaInicio);
                  const horaFim = formatTime(d.horaFim);
                  return (
                    <div key={d.id || d.iddisponibilidade_mensal} className="flex items-center gap-4 px-5 py-3.5">
                      <div className="flex items-center gap-1 text-[#0a1a17] shrink-0 w-14" style={{ fontWeight: 600 }}>
                        <Clock className="w-3.5 h-3.5 text-[#c9a84c]" />
                        <span className="text-sm">{horaInicio}</span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm text-[#0a1a17]" style={{ fontWeight: 500 }}>{d.professorNome}</p>
                        <div className="flex items-center gap-3 text-xs text-[#4d7068] mt-0.5">
                          <span className="flex items-center gap-1">
                            <span className={`w-2 h-2 rounded-full ${modDot}`} />
                            {d.modalidade}
                          </span>
                          {d.estudioNome && (
                            <span className="flex items-center gap-1">
                              <MapPin className="w-3 h-3" />
                              {d.estudioNome}
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-2 text-xs text-[#4d7068] shrink-0">
                        <Clock className="w-3 h-3" />
                        <span>{horaInicio} – {horaFim}</span>
                      </div>
                      {activeRole === 'ENCARREGADO' && (
                        <button
                          onClick={() => handleMarcarSlot(d)}
                          className="flex items-center gap-1.5 bg-[#0d6b5e] text-white px-4 py-2 rounded-lg text-sm hover:bg-[#065147] transition-colors shrink-0"
                          style={{ fontWeight: 500 }}
                        >
                          Marcar <ArrowRight className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  );
                })}
              {/* Aulas com vagas (joinable) */}
              {joinDia
                .sort((a: any, b: any) => (a.horaInicio || '').localeCompare(b.horaInicio || ''))
                .map((c: PedidoAula) => {
                  const livres = (c.maxParticipantes ?? 1) - (1 + (c.participantes?.length ?? 0));
                  const isJoining = joinAulaId === c.id;
                  const alunosDisp = getAlunosDisponiveis(c);
                  return (
                    <div key={c.id} className="flex items-center gap-4 px-5 py-3.5 border-t border-[#c9a84c]/20">
                      <div className="flex items-center gap-1 text-[#0a1a17] shrink-0 w-14" style={{ fontWeight: 600 }}>
                        <Clock className="w-3.5 h-3.5 text-[#c9a84c]" />
                        <span className="text-sm">{c.horaInicio}</span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="text-sm text-[#0a1a17]" style={{ fontWeight: 500 }}>{c.professorNome}</p>
                          <span className={`text-xs px-1.5 py-0.5 rounded-full ${livres > 0 ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                            {livres} vaga{livres !== 1 ? 's' : ''}
                          </span>
                        </div>
                        <div className="flex items-center gap-3 text-xs text-[#4d7068] mt-0.5">
                          <span className="flex items-center gap-1">
                            <span className="w-2 h-2 rounded-full bg-[#c9a84c]" />
                            {c.modalidade}
                          </span>
                          {c.estudioNome && (
                            <span className="flex items-center gap-1">
                              <MapPin className="w-3 h-3" />
                              {c.estudioNome}
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-2 text-xs text-[#4d7068] shrink-0">
                        <Clock className="w-3 h-3" />
                        <span>{c.horaInicio} – {c.horaFim}</span>
                      </div>
                      {activeRole === 'ENCARREGADO' && livres > 0 && (
                        <div className="shrink-0">
                          {!isJoining ? (
                            <button
                              onClick={() => { setJoinAulaId(c.id); setJoinAlunoSelecionado(''); }}
                              className="flex items-center gap-1.5 bg-[#c9a84c] text-[#0a1a17] px-4 py-2 rounded-lg text-sm hover:bg-[#e8c97a] transition-colors"
                              style={{ fontWeight: 600 }}
                            >
                              <UserPlus className="w-4 h-4" />
                              Juntar-se
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
                                  <option key={a.id} value={a.id}>{a.id}</option>
                                ))}
                              </select>
                              <button
                                onClick={() => {
                                  if (!joinAlunoSelecionado) { toast.error('Selecione um aluno'); return; }
                                  handleJoinFromDisp(c.id, joinAlunoSelecionado);
                                }}
                                className="bg-[#0d6b5e] text-white px-3 py-2 rounded-lg text-sm hover:bg-[#065147] transition-colors"
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
                  );
                })}
            </div>
            <div className="px-5 py-3 border-t border-[#0d6b5e]/8">
              <button
                onClick={() => navigate('/dashboard/coaching')}
                className="flex items-center justify-center gap-1.5 text-sm text-[#0d6b5e] hover:text-[#065147] transition-colors w-full"
                style={{ fontWeight: 500 }}>
                Ir para marcação de coachings <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* Empty state */}
        {!diaSelected && disponibilidades.length === 0 && (
          <div className="bg-white rounded-2xl shadow-sm border border-[#0d6b5e]/8 p-12 text-center">
            <CalendarDays className="w-16 h-16 text-[#0d6b5e]/20 mx-auto mb-4" />
            <p className="text-[#4d7068] mb-1" style={{ fontWeight: 500 }}>Nenhuma disponibilidade encontrada</p>
            <p className="text-sm text-[#4d7068]/60">Os professores ainda não definiram horários disponíveis</p>
          </div>
        )}
      </div>
    </div>
  );
}
