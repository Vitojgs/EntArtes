import { useAuth } from '../contexts/AuthContext';
import { Link } from 'react-router';
import {
  Calendar, Clock, CheckCircle2, AlertCircle, ChevronRight, ChevronLeft,
  ShoppingBag, Users, BookOpen, Printer, MapPin, Zap
} from 'lucide-react';
import { useState, useEffect } from 'react';
import { PrintCoachingModal } from '../components/PrintCoachingModal';
import { CoachingStatistics } from '../components/CoachingStatistics';
import api from '../services/api';

const MESES = ['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro'];
const MESES_PT = ['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez'];
const DIAS_SEMANA = ['Dom','Seg','Ter','Qua','Qui','Sex','Sáb'];

const STATUS_CFG: Record<string, { label: string; bg: string; text: string; dot: string }> = {
  PENDENTE:   { label: 'Pendente',   bg: 'bg-amber-100',  text: 'text-amber-700',  dot: 'bg-amber-400' },
  CONFIRMADA: { label: 'Confirmado', bg: 'bg-teal-100',   text: 'text-teal-700',   dot: 'bg-teal-500'  },
  REJEITADA:  { label: 'Rejeitado',  bg: 'bg-red-100',    text: 'text-red-700',    dot: 'bg-red-400'   },
  REALIZADA:  { label: 'Realizado',  bg: 'bg-[#e2f0ed]',  text: 'text-[#0d6b5e]', dot: 'bg-[#0d6b5e]' },
  CANCELADA:  { label: 'Cancelado',  bg: 'bg-red-100',    text: 'text-red-700',    dot: 'bg-red-400'   },
};

const MODALIDADE_DOT: Record<string, string> = {
  'Ballet':          'bg-pink-400',
  'Ballet Clássico': 'bg-pink-400',
  'Hip-Hop':         'bg-purple-500',
  'Contemporâneo':   'bg-teal-500',
  'Dança Contemporânea': 'bg-teal-500',
  'Jazz':            'bg-amber-400',
  'Dança Urbana':    'bg-indigo-500',
  'Flamenco':        'bg-orange-500',
};

export function Dashboard() {
  const { user, activeRole } = useAuth();
  const hoje = new Date();
  const [currentPage, setCurrentPage] = useState(1);
  const [showPrintModal, setShowPrintModal] = useState(false);
  const [aulas, setAulas] = useState<any[]>([]);
  const [anuncios, setAnuncios] = useState<any[]>([]);
  const [turmas, setTurmas] = useState<any[]>([]);
  const [disponibilidades, setDisponibilidades] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const itemsPerPage = 5;

  // ── estado do calendário ──────────────────────────────────────────────────
  const [calMonth, setCalMonth] = useState(hoje.getMonth());
  const [calYear, setCalYear] = useState(hoje.getFullYear());
  const [diaSelected, setDiaSelected] = useState<number>(hoje.getDate());

  const prevMonth = () => {
    if (calMonth === 0) { setCalMonth(11); setCalYear(y => y - 1); }
    else setCalMonth(m => m - 1);
    setDiaSelected(0);
  };
  const nextMonth = () => {
    if (calMonth === 11) { setCalMonth(0); setCalYear(y => y + 1); }
    else setCalMonth(m => m + 1);
    setDiaSelected(0);
  };

  useEffect(() => {
    if (!user || !activeRole) return;

    const fetchData = async () => {
      setLoading(true);
      setError(null);

      try {
        let aulasRes, anunciosRes, turmasRes, dispRes;

        if (activeRole === 'ENCARREGADO') {
          [aulasRes, anunciosRes, turmasRes, dispRes] = await Promise.all([
            api.getEncarregadoAulas(),
            api.getAnuncios(),
            api.getEncarregadoAulasOpen(),
            api.getDisponibilidades(),
          ]);
        } else if (activeRole === 'PROFESSOR') {
          [aulasRes, anunciosRes, turmasRes, dispRes] = await Promise.all([
            api.getProfessorAulas(),
            api.getAnuncios(),
            api.getTurmas(),
            api.getDisponibilidades(),
          ]);
        } else if (activeRole === 'ALUNO') {
          [aulasRes, anunciosRes, turmasRes, dispRes] = await Promise.all([
            api.getAlunoAulas(),
            api.getAnuncios(),
            Promise.resolve({ success: true, data: [] }),
            api.getDisponibilidades(),
          ]);
        } else if (activeRole === 'DIRECAO') {
          [aulasRes, anunciosRes, turmasRes, dispRes] = await Promise.all([
            api.getDirecaoAulas(),
            api.getAnuncios(),
            api.getTurmas(),
            api.getDisponibilidades(),
          ]);
        } else {
          [aulasRes, anunciosRes, turmasRes, dispRes] = await Promise.all([
            Promise.resolve({ success: true, data: [] }),
            api.getAnuncios(),
            Promise.resolve({ success: true, data: [] }),
            api.getDisponibilidades(),
          ]);
        }

        if (aulasRes?.success) setAulas(aulasRes.data || []);
        if (anunciosRes?.success) setAnuncios(anunciosRes.data || []);
        if (turmasRes?.success) setTurmas(turmasRes.data || []);
        if (dispRes?.success) setDisponibilidades(dispRes.data || []);
      } catch (err: any) {
        console.error('Erro ao carregar dados:', err);
        setError(err.message || 'Erro ao carregar dados');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [user?.id, activeRole]);

  // ── estado vazio ──────────────────────────────────────────────────────────
  if (!user) return null;
  if (!activeRole) return null;

  // ── filtros role ──────────────────────────────────────────────────────────
  const allAulas = aulas;

  const meusAnuncios = (() => {
    if (activeRole === 'DIRECAO') return anuncios;
    if (activeRole === 'ENCARREGADO' || activeRole === 'PROFESSOR') {
      return anuncios.filter((a: any) => a.vendedorId === user.id);
    }
    return [];
  })();

  const stats = (() => {
    const pendentes  = allAulas.filter((a: any) => a.status === 'PENDENTE').length;
    const confirmadas = allAulas.filter((a: any) => a.status === 'CONFIRMADA').length;
    const rejeitadas = allAulas.filter((a: any) => a.status === 'REJEITADA').length;
    const realizadas = allAulas.filter((a: any) => a.status === 'REALIZADA').length;

    const anunciosPendentes  = meusAnuncios.filter((a: any) => a.status === 'PENDENTE').length;
    const anunciosAprovados  = meusAnuncios.filter((a: any) => a.status === 'APROVADO').length;
    const anunciosRejeitados = meusAnuncios.filter((a: any) => a.status === 'REJEITADO').length;

    const turmasAbertas = turmas.filter((t: any) => t.status === 'ABERTA').length;
    const totalAlunosTurmas = turmas.reduce((acc: number, t: any) => acc + (t.alunosInscritos?.length || 0), 0);

    return { pendentes, confirmadas, rejeitadas, realizadas, anunciosPendentes, anunciosAprovados, anunciosRejeitados, turmasAbertas, totalAlunosTurmas };
  })();

  const pendentes   = stats.pendentes;
  const confirmadas = stats.confirmadas;
  const rejeitadas  = stats.rejeitadas;
  const anunciosPend = stats.anunciosPendentes;

  // ── calendário ────────────────────────────────────────────────────────────
  const primeiroDia = new Date(calYear, calMonth, 1).getDay();
  const diasNoMes   = new Date(calYear, calMonth + 1, 0).getDate();

  const aulasDoMes = allAulas.filter((a: any) => {
    const d = new Date(a.data);
    return d.getMonth() === calMonth && d.getFullYear() === calYear;
  });

  const porDia: Record<number, any[]> = {};
  aulasDoMes.forEach((a: any) => {
    const dia = new Date(a.data).getDate();
    if (!porDia[dia]) porDia[dia] = [];
    porDia[dia].push(a);
  });

  // Dias com disponibilidades (para mostrar pontos no calendário)
  const dispPorDiaSet = new Set<number>();
  disponibilidades.forEach((d: any) => {
    if (!d.data) return;
    const dataDisp = new Date(d.data);
    if (dataDisp.getMonth() === calMonth && dataDisp.getFullYear() === calYear) {
      dispPorDiaSet.add(dataDisp.getDate());
    }
  });

  const isHoje = (dia: number) =>
    dia === hoje.getDate() && calMonth === hoje.getMonth() && calYear === hoje.getFullYear();

  const cells: (number | null)[] = [
    ...Array(primeiroDia).fill(null),
    ...Array.from({ length: diasNoMes }, (_, i) => i + 1),
  ];

  // ── dados do dia selecionado ──────────────────────────────────────────────
  const aulasDia = diaSelected ? (porDia[diaSelected] ?? []) : [];
  const dataSelectedStr = diaSelected
    ? `${String(diaSelected).padStart(2, '0')} de ${MESES[calMonth]} de ${calYear}`
    : '';

  const diaSemanaSelected = diaSelected
    ? new Date(calYear, calMonth, diaSelected).getDay()
    : -1;

  // Disponibilidades do dia selecionado (por data real)
  const dispDia = diaSelected
    ? disponibilidades.filter((d: any) => {
        if (!d.data) return false;
        const dataDisp = new Date(d.data);
        return dataDisp.getDate() === diaSelected &&
               dataDisp.getMonth() === calMonth &&
               dataDisp.getFullYear() === calYear;
      }).sort((a: any, b: any) => (a.horaInicio || a.horainicio || '').localeCompare(b.horaInicio || b.horainicio || ''))
    : [];

  // ── próximas confirmadas ──────────────────────────────────────────────────
  const proximas = allAulas
    .filter((a: any) => new Date(a.data) >= hoje && a.status === 'CONFIRMADA')
    .sort((a: any, b: any) => new Date(a.data).getTime() - new Date(b.data).getTime())
    .slice(0, 4);

  // ── turmas do professor ───────────────────────────────────────────────────
  const minhasTurmas = activeRole === 'PROFESSOR'
    ? turmas.filter((t: any) => t.professorId === user.id && t.status !== 'ARQUIVADA')
    : [];

  // ── saudação ──────────────────────────────────────────────────────────────
  const greeting = (() => {
    const h = hoje.getHours();
    if (h < 12) return 'Bom dia';
    if (h < 19) return 'Boa tarde';
    return 'Boa noite';
  })();

  // ── tabela de aulas ───────────────────────────────────────────────────────
  const aulasRecentes = [...allAulas].sort((a: any, b: any) => new Date(b.data).getTime() - new Date(a.data).getTime());
  const totalPages  = Math.ceil(aulasRecentes.length / itemsPerPage);
  const startIndex  = (currentPage - 1) * itemsPerPage;
  const paginatedAulas = aulasRecentes.slice(startIndex, startIndex + itemsPerPage);

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    const days   = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
    const months = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
    return `${days[date.getDay()]}, ${date.getDate()} ${months[date.getMonth()]}`;
  };

  const getStatusBadge = (status: string) => {
    const c = STATUS_CFG[status] || STATUS_CFG.PENDENTE;
    const Icon = status === 'PENDENTE' ? Clock : status === 'CONFIRMADA' ? CheckCircle2 : AlertCircle;
    return (
      <span className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-sm ${c.bg} ${c.text}`}>
        <Icon className="w-4 h-4" />{c.label}
      </span>
    );
  };

  // ── loading / error ───────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="min-h-screen bg-[#f4f9f8] flex items-center justify-center">
        <div className="text-[#4d7068]">A carregar...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-[#f4f9f8] flex items-center justify-center">
        <div className="text-red-600">Erro: {error}</div>
      </div>
    );
  }

  // ==========================================================================
  // RENDER
  // ==========================================================================
  return (
    <div className="min-h-screen bg-[#f4f9f8]">

      {/* ── Cabeçalho ─────────────────────────────────────────────────────── */}
      <div className="bg-[#0a1a17] px-4 py-6 md:py-8">
        <div className="max-w-7xl mx-auto">
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
            <div>
              <p className="text-white/40 text-sm mb-1">
                {hoje.toLocaleDateString('pt-PT', { weekday: 'long', day: 'numeric', month: 'long' })}
              </p>
              <h1 className="text-3xl text-white">
                {greeting}, <span className="text-[#c9a84c]">{user.nome.split(' ')[0]}</span>
              </h1>
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              {/* Pills de estado */}
              {pendentes > 0 && (
                <Link to="/dashboard/coaching"
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-amber-500/15 border border-amber-400/30 text-amber-300 text-sm hover:bg-amber-500/25 transition-colors">
                  <Clock className="w-3.5 h-3.5" />
                  <span style={{ fontWeight: 600 }}>{pendentes}</span>
                  <span className="text-amber-300/70">pendente{pendentes !== 1 ? 's' : ''}</span>
                </Link>
              )}
              {confirmadas > 0 && (
                <Link to="/dashboard/coaching"
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-teal-500/15 border border-teal-400/30 text-teal-300 text-sm hover:bg-teal-500/25 transition-colors">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span style={{ fontWeight: 600 }}>{confirmadas}</span>
                  <span className="text-teal-300/70">confirmada{confirmadas !== 1 ? 's' : ''}</span>
                </Link>
              )}
              {rejeitadas > 0 && (
                <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-red-500/15 border border-red-400/30 text-red-300 text-sm">
                  <AlertCircle className="w-3.5 h-3.5" />
                  <span style={{ fontWeight: 600 }}>{rejeitadas}</span>
                  <span className="text-red-300/70">rejeitada{rejeitadas !== 1 ? 's' : ''}</span>
                </div>
              )}
              {(activeRole === 'DIRECAO' || activeRole === 'ENCARREGADO') && anunciosPend > 0 && (
                <Link to="/dashboard/marketplace"
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[#c9a84c]/15 border border-[#c9a84c]/30 text-[#c9a84c] text-sm hover:bg-[#c9a84c]/25 transition-colors">
                  <ShoppingBag className="w-3.5 h-3.5" />
                  <span style={{ fontWeight: 600 }}>{anunciosPend}</span>
                  <span className="text-[#c9a84c]/70">marketplace</span>
                </Link>
              )}
              {pendentes === 0 && confirmadas === 0 && rejeitadas === 0 && (
                <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/5 border border-white/10 text-white/40 text-sm">
                  <Zap className="w-3.5 h-3.5" />
                  Tudo em dia
                </div>
              )}

              {/* Botão Imprimir */}
              {(activeRole === 'PROFESSOR') && (
                <button
                  onClick={() => setShowPrintModal(true)}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/10 border border-white/20 text-white/80 text-sm hover:bg-white/20 hover:text-white transition-colors ml-2"
                >
                  <Printer className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Imprimir</span>
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-6 space-y-6">

        {/* ── Calendário + Painel lateral ─────────────────────────────────── */}
        <div className="grid lg:grid-cols-3 gap-6">

          {/* ── Calendário ──────────────────────────────────────────────── */}
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
                  const aulasCell = porDia[dia] ?? [];
                  const selected = diaSelected === dia;
                  const ehHoje   = isHoje(dia);
                  const temAulas = aulasCell.length > 0;
                  const temDisp  = dispPorDiaSet.has(dia);
                  const hasEvento = temAulas || temDisp;

                  return (
                    <button
                      key={idx}
                      onClick={() => setDiaSelected(dia)}
                      className={`relative flex flex-col items-center py-2 rounded-xl transition-all group ${
                        selected
                          ? 'bg-[#0d6b5e] shadow-sm'
                          : ehHoje
                          ? 'bg-[#0d6b5e]/8 ring-2 ring-[#0d6b5e]/30'
                          : hasEvento
                          ? 'hover:bg-[#e2f0ed]'
                          : 'hover:bg-[#f4f9f8]'
                      }`}
                    >
                      <span className={`text-sm leading-none ${
                        selected ? 'text-white' : ehHoje ? 'text-[#0d6b5e]' : 'text-[#0a1a17]'
                      }`} style={{ fontWeight: selected || ehHoje ? 700 : hasEvento ? 500 : 400 }}>
                        {dia}
                      </span>

                      {hasEvento && (
                        <div className="flex gap-0.5 mt-1.5 flex-wrap justify-center max-w-[28px]">
                          {aulasCell.slice(0, 3).map((a: any, i: number) => (
                            <div
                              key={i}
                              className={`w-1.5 h-1.5 rounded-full ${
                                selected ? 'bg-white/70' :
                                a.status === 'CONFIRMADA' ? 'bg-[#0d6b5e]' :
                                a.status === 'PENDENTE'   ? 'bg-amber-400' :
                                'bg-red-400'
                              }`}
                            />
                          ))}
                          {aulasCell.length === 0 && temDisp && (
                            <div className={`w-1.5 h-1.5 rounded-full ${selected ? 'bg-white/70' : 'bg-[#c9a84c]'}`} />
                          )}
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>

              {/* Legenda */}
              <div className="flex items-center gap-5 mt-4 pt-4 border-t border-[#0d6b5e]/8">
                <div className="flex items-center gap-1.5 text-xs text-[#4d7068]">
                  <div className="w-2 h-2 rounded-full bg-[#0d6b5e]" /> Confirmado
                </div>
                <div className="flex items-center gap-1.5 text-xs text-[#4d7068]">
                  <div className="w-2 h-2 rounded-full bg-amber-400" /> Pendente
                </div>
                <div className="flex items-center gap-1.5 text-xs text-[#4d7068]">
                  <div className="w-2 h-2 rounded-full bg-red-400" /> Rejeitado
                </div>
                <div className="flex items-center gap-1.5 text-xs text-[#4d7068]">
                  <div className="w-2 h-2 rounded-full bg-[#c9a84c]" /> Disponível
                </div>
              </div>
            </div>
          </div>

          {/* ── Painel lateral ───────────────────────────────────────────── */}
          <div className="bg-white rounded-2xl shadow-sm border border-[#0d6b5e]/8 flex flex-col overflow-hidden">
            {diaSelected && aulasDia.length > 0 ? (
              <>
                <div className="px-5 py-4 border-b border-[#0d6b5e]/8">
                  <p className="text-xs text-[#4d7068] mb-0.5">{DIAS_SEMANA[new Date(calYear, calMonth, diaSelected).getDay()]}</p>
                  <p className="text-[#0a1a17]" style={{ fontWeight: 700, fontSize: '1.4rem' }}>
                    {diaSelected} <span className="text-[#4d7068]" style={{ fontWeight: 400, fontSize: '1rem' }}>{MESES_PT[calMonth]}</span>
                  </p>
                  <p className="text-xs text-[#4d7068] mt-0.5">{aulasDia.length} sessão{aulasDia.length !== 1 ? 'ões' : ''}</p>
                </div>

                <div className="flex-1 overflow-y-auto divide-y divide-[#0d6b5e]/5">
                  {aulasDia
                    .sort((a: any, b: any) => (a.horaInicio || '').localeCompare(b.horaInicio || ''))
                    .map((a: any) => {
                      const st = STATUS_CFG[a.status as keyof typeof STATUS_CFG] ?? STATUS_CFG.PENDENTE;
                      const modDot = MODALIDADE_DOT[a.modalidade] ?? 'bg-gray-400';
                      return (
                        <div key={a.id} className="px-5 py-4">
                          <div className="flex items-start justify-between gap-2 mb-2">
                            <div className="flex items-center gap-2">
                              <div className="flex items-center gap-1 text-[#0a1a17]" style={{ fontWeight: 600 }}>
                                <Clock className="w-3.5 h-3.5 text-[#0d6b5e]" />
                                <span className="text-sm">{a.horaInicio}</span>
                              </div>
                              <span className="text-xs text-[#4d7068]">– {a.horaFim}</span>
                            </div>
                            <span className={`text-xs px-2 py-0.5 rounded-full ${st.bg} ${st.text}`} style={{ fontWeight: 600 }}>
                              {st.label}
                            </span>
                          </div>
                          <p className="text-sm text-[#0a1a17] mb-1.5" style={{ fontWeight: 500 }}>
                            {activeRole === 'PROFESSOR' ? a.alunoNome : a.professorNome}
                          </p>
                          <div className="flex items-center gap-3 text-xs text-[#4d7068]">
                            <span className="flex items-center gap-1">
                              <span className={`w-2 h-2 rounded-full ${modDot}`} />
                              {a.modalidade}
                            </span>
                            <span className="flex items-center gap-1">
                              <MapPin className="w-3 h-3" />
                              {a.estudioNome ? a.estudioNome : <span className="text-xs bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded-full font-medium">Sem estúdio</span>}
                            </span>
                          </div>
                        </div>
                      );
                    })}
                </div>

                <div className="px-5 py-3 border-t border-[#0d6b5e]/8">
                  <Link to="/dashboard/coaching"
                    className="flex items-center justify-center gap-1.5 text-sm text-[#0d6b5e] hover:text-[#065147] transition-colors"
                    style={{ fontWeight: 500 }}>
                    Ver tudo em Coachings <ChevronRight className="w-4 h-4" />
                  </Link>
                </div>
              </>
            ) : diaSelected && aulasDia.length === 0 ? (
              <div className="flex flex-col items-center justify-center flex-1 p-8 text-center">
                <div className="w-12 h-12 bg-[#f4f9f8] rounded-2xl flex items-center justify-center mb-3">
                  <Calendar className="w-6 h-6 text-[#0d6b5e]/30" />
                </div>
                <p className="text-sm text-[#0a1a17]" style={{ fontWeight: 600 }}>
                  {diaSelected} de {MESES_PT[calMonth]}
                </p>
                <p className="text-xs text-[#4d7068] mt-1">Sem sessões neste dia</p>
                {(activeRole === 'ENCARREGADO' || activeRole === 'PROFESSOR') && (
                  <Link to="/dashboard/coaching"
                    className="mt-4 px-4 py-2 bg-[#0d6b5e] text-white rounded-xl text-xs hover:bg-[#065147] transition-colors"
                    style={{ fontWeight: 600 }}>
                    Marcar Sessão
                  </Link>
                )}
              </div>
            ) : (
              <>
                <div className="px-5 py-4 border-b border-[#0d6b5e]/8">
                  <p className="text-[#0a1a17]" style={{ fontWeight: 700 }}>Próximas Sessões</p>
                  <p className="text-xs text-[#4d7068] mt-0.5">Selecione um dia para ver o detalhe</p>
                </div>
                {proximas.length === 0 ? (
                  <div className="flex-1 flex flex-col items-center justify-center p-8 text-center">
                    <p className="text-sm text-[#4d7068]">Sem sessões confirmadas</p>
                    {(activeRole === 'ENCARREGADO' || activeRole === 'PROFESSOR') && (
                      <Link to="/dashboard/coaching"
                        className="mt-3 px-4 py-2 bg-[#0d6b5e] text-white rounded-xl text-xs hover:bg-[#065147] transition-colors"
                        style={{ fontWeight: 600 }}>
                        Marcar Sessão
                      </Link>
                    )}
                  </div>
                ) : (
                  <div className="flex-1 divide-y divide-[#0d6b5e]/5">
                    {proximas.map((a: any) => {
                      const dData = new Date(a.data);
                      return (
                        <button
                          key={a.id}
                          onClick={() => {
                            setCalMonth(dData.getMonth());
                            setCalYear(dData.getFullYear());
                            setDiaSelected(dData.getDate());
                          }}
                          className="w-full flex items-center gap-3 px-5 py-3.5 hover:bg-[#f4f9f8] transition-colors text-left"
                        >
                          <div className="w-10 h-10 bg-[#0d6b5e] rounded-xl flex flex-col items-center justify-center text-white shrink-0">
                            <span className="text-[10px] leading-none text-white/70">{MESES_PT[dData.getMonth()]}</span>
                            <span className="leading-none" style={{ fontWeight: 700, fontSize: '1rem' }}>{dData.getDate()}</span>
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm text-[#0a1a17] truncate" style={{ fontWeight: 500 }}>
                              {activeRole === 'PROFESSOR' ? a.alunoNome : a.professorNome}
                            </p>
                            <p className="text-xs text-[#4d7068]">{a.horaInicio} · {a.modalidade}</p>
                          </div>
                          <ChevronRight className="w-4 h-4 text-[#0d6b5e]/30 shrink-0" />
                        </button>
                      );
                    })}
                  </div>
                )}
                <div className="px-5 py-3 border-t border-[#0d6b5e]/8">
                  <Link to="/dashboard/coaching"
                    className="flex items-center justify-center gap-1.5 text-sm text-[#0d6b5e] hover:text-[#065147] transition-colors"
                    style={{ fontWeight: 500 }}>
                    Ver todos os Coachings <ChevronRight className="w-4 h-4" />
                  </Link>
                </div>
              </>
            )}
          </div>
        </div>

        {/* ── Disponibilidades do dia selecionado ────────────────────────── */}
        {diaSelected && dispDia.length > 0 && (
          <div className="bg-white rounded-2xl shadow-sm border border-[#0d6b5e]/8 overflow-hidden">
            <div className="px-5 py-4 border-b border-[#0d6b5e]/8 flex items-center gap-2">
              <div className="w-7 h-7 bg-[#c9a84c]/15 rounded-lg flex items-center justify-center">
                <Clock className="w-4 h-4 text-[#c9a84c]" />
              </div>
              <div>
                <p className="text-[#0a1a17]" style={{ fontWeight: 600 }}>
                  Disponibilidades — {diaSelected} de {MESES_PT[calMonth]}
                </p>
                <p className="text-xs text-[#4d7068]">{DIAS_SEMANA[diaSemanaSelected]} · {dispDia.length} slot{dispDia.length !== 1 ? 's' : ''} disponíve{dispDia.length !== 1 ? 'is' : 'l'}</p>
              </div>
            </div>
            <div className="divide-y divide-[#0d6b5e]/5">
              {dispDia.map((d: any) => {
                const modDot = MODALIDADE_DOT[d.modalidade || d.modalidade_nome] ?? 'bg-gray-400';
                const profNome = d.professorNome || d.professor?.utilizador?.nome || 'Professor';
                const horaInicio = d.horaInicio || d.horainicio || '—';
                const horaFim = d.horaFim || d.horafim || '—';
                const modalidade = d.modalidade || d.modalidade_nome || '—';
                const estudioNome = d.salaNome || d.sala?.nomesala || d.estudioNome || '—';
                return (
                  <div key={d.id || d.iddisponibilidade_mensal} className="flex items-center gap-4 px-5 py-3.5">
                    <div className="flex items-center gap-1 text-[#0a1a17] shrink-0 w-14" style={{ fontWeight: 600 }}>
                      <Clock className="w-3.5 h-3.5 text-[#c9a84c]" />
                      <span className="text-sm">{horaInicio}</span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-[#0a1a17]" style={{ fontWeight: 500 }}>{profNome}</p>
                      <div className="flex items-center gap-3 text-xs text-[#4d7068] mt-0.5">
                        <span className="flex items-center gap-1">
                          <span className={`w-2 h-2 rounded-full ${modDot}`} />{modalidade}
                        </span>
                        <span className="flex items-center gap-1">
                          <MapPin className="w-3 h-3" />{estudioNome}
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
            <div className="px-5 py-3 border-t border-[#0d6b5e]/8">
              <Link to={activeRole === 'PROFESSOR' ? '/dashboard/disponibilidades' : '/dashboard/disponibilidades-professores'}
                className="flex items-center justify-center gap-1.5 text-sm text-[#0d6b5e] hover:text-[#065147] transition-colors"
                style={{ fontWeight: 500 }}>
                Ver todas as disponibilidades <ChevronRight className="w-4 h-4" />
              </Link>
            </div>
          </div>
        )}

        {/* ── Turmas do professor ──────────────────────────────────────────── */}
        {activeRole === 'PROFESSOR' && minhasTurmas.length > 0 && (
          <div className="bg-white rounded-2xl shadow-sm border border-[#0d6b5e]/8 p-5">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 bg-[#c9a84c]/15 rounded-lg flex items-center justify-center">
                  <BookOpen className="w-4 h-4 text-[#c9a84c]" />
                </div>
                <h2 className="text-[#0a1a17]" style={{ fontWeight: 600 }}>Os Meus Grupos</h2>
              </div>
              <Link to="/dashboard/turmas"
                className="flex items-center gap-1 text-sm text-[#0d6b5e] hover:text-[#065147] transition-colors"
                style={{ fontWeight: 500 }}>
                Ver todos <ChevronRight className="w-4 h-4" />
              </Link>
            </div>
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {minhasTurmas.slice(0, 3).map((t: any) => {
                const inscritos = t.alunosInscritos?.length || 0;
                const livres = t.lotacaoMaxima > 0 ? t.lotacaoMaxima - inscritos : 0;
                const pct = t.lotacaoMaxima > 0 ? (inscritos / t.lotacaoMaxima) * 100 : 0;
                return (
                  <div key={t.id || t.idgrupo} className="rounded-xl overflow-hidden border border-black/5">
                    <div className="h-1.5" style={{ background: t.cor || '#0d6b5e' }} />
                    <div className="p-4">
                      <div className="flex items-center justify-between mb-1">
                        <p className="text-sm text-[#0a1a17] truncate" style={{ fontWeight: 600 }}>{t.nome || t.nomegrupo}</p>
                        <span className={`text-xs px-2 py-0.5 rounded-full ml-2 shrink-0 ${t.status === 'ABERTA' ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'}`}>
                          {t.status === 'ABERTA' ? 'Aberta' : t.status || '—'}
                        </span>
                      </div>
                      <p className="text-xs text-[#4d7068] mb-3">{t.modalidade || '—'} · {t.nivel || '—'}</p>
                      <div className="flex justify-between text-xs mb-1.5">
                        <span className="text-[#4d7068]">{inscritos}/{t.lotacaoMaxima || '—'} alunos</span>
                        <span className={livres > 0 ? 'text-[#0d6b5e]' : 'text-red-500'} style={{ fontWeight: 500 }}>
                          {livres > 0 ? `${livres} vagas` : 'Esgotado'}
                        </span>
                      </div>
                      <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                        <div className="h-full rounded-full" style={{ width: `${Math.min(pct, 100)}%`, background: t.cor || '#0d6b5e' }} />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* ── CoachingStatistics ─────────────────────────────────────────────── */}
        <CoachingStatistics aulas={allAulas} />

        {/* ── Tabela de Aulas ─────────────────────────────────────────────── */}
        <div className="bg-white rounded-2xl shadow-sm p-6 border border-[#0d6b5e]/10">
          <h2 className="text-xl text-[#0a1a17] mb-4">
            {activeRole === 'PROFESSOR' ? 'As Minhas Coachings' : 'Coachings Recentes'}
          </h2>

          {allAulas.length === 0 ? (
            <div className="text-[#4d7068] text-sm py-8 text-center">
              Nenhum coaching encontrado
            </div>
          ) : (
            <>
              <div className="hidden md:block overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-[#0d6b5e]/10 text-left">
                        <th className="pb-3 text-sm text-[#4d7068]">Data / Hora</th>
                        <th className="pb-3 text-sm text-[#4d7068]">
                          {activeRole === 'PROFESSOR' ? 'Aluno' : (activeRole === 'DIRECAO' ? 'Aluno / Professor' : 'Professor')}
                        </th>
                        <th className="pb-3 text-sm text-[#4d7068]">Sala</th>
                        <th className="pb-3 text-sm text-[#4d7068]">Modalidade</th>
                        <th className="pb-3 text-sm text-[#4d7068]">Estado</th>
                        <th className="pb-3 text-sm text-[#4d7068]"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {paginatedAulas.map((aula: any) => (
                      <tr key={aula.id} className="border-b border-[#0d6b5e]/5 hover:bg-[#f4f9f8] transition-colors">
                        <td className="py-4">
                          <div className="text-sm text-[#0a1a17]">{formatDate(aula.data)}</div>
                          <div className="text-sm text-[#4d7068]">{aula.horaInicio} – {aula.horaFim || aula.horaInicio}</div>
                          <div className="text-xs text-[#4d7068]">{aula.duracao ? `${aula.duracao} min` : '—'}</div>
                        </td>
                        <td className="py-4">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 bg-[#e2f0ed] rounded-full flex items-center justify-center">
                              <Users className="w-4 h-4 text-[#0d6b5e]" />
                            </div>
                            <span className="text-sm text-[#0a1a17]">
                              {activeRole === 'PROFESSOR' ? aula.alunoNome : (activeRole === 'DIRECAO' && aula.alunoNome ? aula.alunoNome : aula.professorNome)}
                            </span>
                          </div>
                        </td>
                        <td className="py-4 text-sm text-[#0a1a17]">{aula.estudioNome || <span className="text-xs bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded-full font-medium">Sem estúdio</span>}</td>
                        <td className="py-4 text-xs text-[#4d7068]">{aula.modalidade || '—'}</td>
                        <td className="py-4">{getStatusBadge(aula.status)}</td>
                        <td className="py-4">
                          <button className="text-[#0d6b5e]/30 hover:text-[#0d6b5e] transition-colors">
                            <ChevronRight className="w-5 h-5" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="md:hidden space-y-4">
                {paginatedAulas.map((aula: any) => (
                  <div key={aula.id} className="p-4 border border-[#0d6b5e]/10 rounded-xl">
                    <div className="flex items-center justify-between mb-3">
                      <div className="text-sm text-[#0a1a17]">{formatDate(aula.data)}</div>
                      {getStatusBadge(aula.status)}
                    </div>
                    <div className="flex items-center gap-3 mb-2">
                      <div className="w-10 h-10 bg-[#e2f0ed] rounded-full flex items-center justify-center">
                        <Users className="w-5 h-5 text-[#0d6b5e]" />
                      </div>
                      <div>
                        <div className="text-sm text-[#0a1a17]">
                          {activeRole === 'PROFESSOR' ? aula.alunoNome : aula.professorNome}
                        </div>
                        <div className="text-sm text-[#4d7068]">{aula.estudioNome || <span className="text-xs bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded-full font-medium">Sem estúdio</span>}</div>
                      </div>
                    </div>
                    <div className="text-sm text-[#4d7068]">{aula.horaInicio} – {aula.horaFim}</div>
                  </div>
                ))}
              </div>

              {totalPages > 1 && (
                <div className="flex items-center justify-between mt-6 pt-6 border-t border-[#0d6b5e]/10">
                  <button onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                    disabled={currentPage === 1}
                    className="px-4 py-2 text-sm text-[#4d7068] hover:text-[#0d6b5e] disabled:opacity-50 disabled:cursor-not-allowed transition-colors">
                    Anterior
                  </button>
                  <div className="flex items-center gap-2">
                    {Array.from({ length: totalPages }, (_, i) => i + 1).map(page => (
                      <button key={page} onClick={() => setCurrentPage(page)}
                        className={`w-8 h-8 rounded-lg text-sm transition-colors ${currentPage === page ? 'bg-[#0d6b5e] text-white' : 'text-[#4d7068] hover:bg-[#e2f0ed]'}`}>
                        {page}
                      </button>
                    ))}
                  </div>
                  <button onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                    disabled={currentPage === totalPages}
                    className="px-4 py-2 text-sm text-[#4d7068] hover:text-[#0d6b5e] disabled:opacity-50 disabled:cursor-not-allowed transition-colors">
                    Próxima
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {showPrintModal && (
        <PrintCoachingModal
          currentUser={user}
          onClose={() => setShowPrintModal(false)}
        />
      )}
    </div>
  );
}
