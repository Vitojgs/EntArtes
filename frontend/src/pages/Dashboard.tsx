import { useAuth } from '../contexts/AuthContext';
import { Link, useNavigate } from 'react-router';
import {
  Calendar, Clock, CheckCircle2, AlertCircle, ChevronRight, ChevronLeft,
  Users, BookOpen,   Printer, MapPin, X, Plus, Trash2, CalendarOff,
  User, XCircle, UserPlus, CheckCircle
} from 'lucide-react';
import { useState, useEffect, useMemo } from 'react';
import { PrintCoachingModal } from '../components/PrintCoachingModal';
import { CoachingStatistics } from '../components/CoachingStatistics';
import { NovaSessaoForm } from '../components/NovaSessaoForm';
import { DashboardGruposModal } from '../components/DashboardGruposModal';
import { CalendarioMini } from '../components/CalendarioMini';
import { OcupacaoSalas } from '../components/OcupacaoSalas';
import { NovaOcupacaoModal } from '../components/NovaOcupacaoModal';
import { Pill } from '../components/Pill';
import { DashboardCoachingModal } from '../components/DashboardCoachingModal';
import { DashboardEncarregadoCoachingModal } from '../components/DashboardEncarregadoCoachingModal';
import api from '../services/api';
import { useFeriados } from '../contexts/FeriadosContext';
import { DateWarningIcon } from '../components/DateAlerta';
import { PedidoAula } from '../types';
import { toast } from 'sonner';
import { Toaster } from '../components/ui/sonner';

function formatHora(v: any): string {
  if (!v) return '';
  const s = String(v);
  const raw = s.includes('T') ? s.substring(11, 16) : s.substring(0, 5);
  const [h, m] = raw.split(':').map(Number);
  if (isNaN(h) || isNaN(m)) return '';
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

// Coachings que já passaram não devem constar no calendário nem no horário
function isAulaFutura(a: any): boolean {
  const hFim = (a.horaFim || a.horaInicio || '00:00').substring(0, 5);
  return new Date(a.data + 'T' + hFim) > new Date();
}

const MESES = ['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro'];
const MESES_PT = ['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez'];
const DIAS_SEMANA = ['Dom','Seg','Ter','Qua','Qui','Sex','Sáb'];

const STATUS_CFG: Record<string, { label: string; bg: string; text: string; dot: string }> = {
  PENDENTE:   { label: 'Pendente',   bg: 'bg-[#fdf6e3]', text: 'text-[#c9a84c]',  dot: 'bg-[#c9a84c]' },
  CONFIRMADA: { label: 'Confirmado', bg: 'bg-[#e2f0ed]',  text: 'text-[#0d6b5e]', dot: 'bg-[#0d6b5e]' },
  REALIZADA:  { label: 'Realizado',  bg: 'bg-[#e2f0ed]',  text: 'text-[#0d6b5e]', dot: 'bg-[#0d6b5e]' },
  REJEITADA:  { label: 'Cancelado',  bg: 'bg-red-100',    text: 'text-red-700',   dot: 'bg-red-400'   },
  CANCELADA:  { label: 'Cancelado',  bg: 'bg-red-100',    text: 'text-red-700',   dot: 'bg-red-400'   },
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

const HORARIOS = [
  '08:00', '09:00', '10:00', '11:00', '12:00',
  '13:00', '14:00', '15:00', '16:00', '17:00',
  '18:00', '19:00', '20:00', '21:00'
];

export function Dashboard() {
  const { user, activeRole } = useAuth();
  const hoje = new Date();
  const { isDiaWarning } = useFeriados();
  const [currentPage, setCurrentPage] = useState(1);
  const [showPrintModal, setShowPrintModal] = useState(false);
  const [aulas, setAulas] = useState<any[]>([]);
  const [anuncios, setAnuncios] = useState<any[]>([]);
  const [turmas, setTurmas] = useState<any[]>([]);
  const [disponibilidades, setDisponibilidades] = useState<any[]>([]);
  const [minhasDisponibilidades, setMinhasDisponibilidades] = useState<any[]>([]);
  const [salas, setSalas] = useState<{ id: string; nome: string }[]>([]);
  const [dispProfessores, setDispProfessores] = useState<any[]>([]);
  // calMode is no longer used since we removed the mode select
  // Keeping the variable for now to avoid breaking changes, but it's not functional
  const [calMode, setCalMode] = useState<'coachings' | 'disponibilidades'>('coachings');
  const [professorFiltro, setProfessorFiltro] = useState<string>('TODOS');
  const [modalidadeFiltro, setModalidadeFiltro] = useState<string>('TODAS');
  const [alunoFiltro, setAlunoFiltro] = useState<string>('TODOS');
  const [showSolicitarModal, setShowSolicitarModal] = useState(false);
  const [selectedAulaForModal, setSelectedAulaForModal] = useState<any | null>(null);
  const [solicitarPrefill, setSolicitarPrefill] = useState<{
    professorId?: string; data?: string; horaInicio?: string; horaFim?: string;
    duracao?: string; maxDuracao?: string; modalidade?: string;
    modalidadeId?: string; disponibilidadeId?: string;
  } | undefined>(undefined);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [activeFilters, setActiveFilters] = useState<string[]>(['CONFIRMADA']);
  const itemsPerPage = 5;
  const [sugerirRemarcacaoModal, setSugerirRemarcacaoModal] = useState<string | null>(null);
  const [novaDataRemarcacao, setNovaDataRemarcacao] = useState<string>('');
  const [modalidadesProfessor, setModalidadesProfessor] = useState<any[]>([]);
  const [showNovaDispoModal, setShowNovaDispoModal] = useState(false);
  const [showGruposModal, setShowGruposModal] = useState(false);
  const [novaDispoForm, setNovaDispoForm] = useState({
    modalidadesprofessoridmodalidadeprofessor: '',
    data: '',
    horainicio: '',
    horafim: '',
    recorrente: false,
    diadasemana: [] as number[],
    dataFim: '',
  });
  const [selectedDisponibilidadeForModal, setSelectedDisponibilidadeForModal] = useState<any | null>(null);
  const [showCoachingModal, setShowCoachingModal] = useState(false);
  const [coachingModalTab, setCoachingModalTab] = useState<'marcar' | 'agenda'>('marcar');
  const [showNovaOcupacaoModal, setShowNovaOcupacaoModal] = useState(false);
  const [showEncarregadoCoachingModal, setShowEncarregadoCoachingModal] = useState(false);
  const [editDisponibilidadeMode, setEditDisponibilidadeMode] = useState(false);
  const [editDisponibilidadeForm, setEditDisponibilidadeForm] = useState({
    horainicio: '',
    horafim: '',
  });
  const [alertaDataDispo, setAlertaDataDispo] = useState<{isWarning: boolean; mensagem?: string} | null>(null);

  const toggleFilter = (filter: string) => {
    if (filter === 'TODOS') {
      setActiveFilters(['TODOS']);
      return;
    }
    setActiveFilters(prev => {
      if (prev.length === 1 && prev[0] === filter) return ['CONFIRMADA'];
      return [filter];
    });
  };

  const refreshAulas = async () => {
    try {
      if (activeRole === 'PROFESSOR') {
        const res = await api.getProfessorAulas();
        if (res.success && res.data) setAulas(res.data);
      } else if (activeRole === 'ENCARREGADO') {
        const res = await api.getEncarregadoAulas();
        if (res.success && res.data) setAulas(res.data);
      } else if (activeRole === 'DIRECAO') {
        const res = await api.getDirecaoAulas();
        if (res.success && res.data) setAulas(res.data);
      } else if (activeRole === 'ALUNO') {
        const res = await api.getAlunoAulas();
        if (res.success && res.data) setAulas(res.data);
      }
    } catch {}
  };

  const handleConfirmarRealizacao = async (id: string) => {
    try {
      await api.confirmarRealizacaoAula(parseInt(id));
      setAulas(aulas.map(a => a.id === id ? { ...a, status: 'REALIZADA' } : a));
      setSelectedAulaForModal(null);
      toast.success('Coaching confirmado como realizado!');
    } catch (error: any) {
      toast.error(error.message || 'Erro ao confirmar realização');
    }
  };

  const handleSugerirRemarcacao = async () => {
    if (!sugerirRemarcacaoModal || !novaDataRemarcacao) {
      toast.error('Selecione uma nova data');
      return;
    }
    const agora = new Date();
    const dataHojeStr = agora.toISOString().split('T')[0];
    const dataInputStr = novaDataRemarcacao.split('T')[0];
    if (dataInputStr < dataHojeStr) {
      toast.error('A data não pode ser no passado');
      return;
    }
    if (dataInputStr === dataHojeStr) {
      const [horaH, horaM] = novaDataRemarcacao.split('T')[1].split(':').map(Number);
      const horaInput = horaH * 60 + horaM;
      const horaAtual = agora.getHours() * 60 + agora.getMinutes();
      if (horaInput <= horaAtual) {
        toast.error('A hora deve ser posterior à hora atual');
        return;
      }
    }
    try {
      const [dataPart, horaPart] = novaDataRemarcacao.split('T');
      const result = await api.sugerirNovaDataAula(Number(sugerirRemarcacaoModal), dataPart, horaPart);
      if (result.success) {
        setAulas(aulas.map(a => a.id === sugerirRemarcacaoModal ? { ...a, sugestaoestado: 'AGUARDA_DIRECAO', novadata: novaDataRemarcacao } : a));
        setSugerirRemarcacaoModal(null);
        setNovaDataRemarcacao('');
        setSelectedAulaForModal(null);
        toast.success('Sugestão de nova data enviada à direção.');
      }
    } catch (error: any) {
      toast.error(error.message || 'Erro ao sugerir nova data');
    }
  };

  const handlePedirRemarcacao = async (id: string) => {
    try {
      await api.pedirRemarcacao(Number(id));
      setAulas(aulas.map(a => a.id === id ? { ...a, sugestaoestado: 'AGUARDA_DIRECAO', novaData: undefined, novadata: undefined } : a));
      setSelectedAulaForModal(null);
      toast.success('Pedido de remarcação enviado à direção.');
    } catch (error: any) {
      toast.error(error.message || 'Erro ao pedir remarcação');
    }
  };

  const handleResponderSugestaoProfessor = async (aulaId: string, aceitar: boolean) => {
    try {
      await api.responderSugestaoProfessor(Number(aulaId), aceitar);
      if (aceitar) {
        setAulas(aulas.map(a => a.id === aulaId ? { ...a, sugestaoestado: 'AGUARDA_EE' } : a));
        toast.success('Sugestão aceite. A aguardar confirmação do encarregado.');
      } else {
        setAulas(aulas.map(a => a.id === aulaId ? { ...a, sugestaoestado: null } : a));
        toast.info('Data recusada. Direção pode propor nova data.');
      }
      setSelectedAulaForModal(null);
    } catch (error: any) {
      toast.error(error.message || 'Erro ao responder à sugestão');
    }
  };

  const handleResponderSugestaoEE = async (aulaId: string, aceitar: boolean) => {
    try {
      await api.responderSugestaoEE(Number(aulaId), aceitar);
      if (aceitar) {
        toast.success('Nova data aceite. Coaching confirmado!');
        const res = await api.getEncarregadoAulas();
        if (res.success && res.data) setAulas(res.data);
      } else {
        setAulas(aulas.map(a => a.id === aulaId ? { ...a, sugestaoestado: null, status: 'REJEITADA' } : a));
        toast.info('Nova data recusada. Coaching cancelado.');
      }
      setSelectedAulaForModal(null);
    } catch (error: any) {
      toast.error(error.message || 'Erro ao responder à sugestão');
    }
  };

  const handleOpenRemarcacao = () => {
    const primeira = pendentesRemarcacao[0];
    if (primeira) setSelectedAulaForModal(primeira);
  };

  const handleNovaDisponibilidade = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!novaDispoForm.modalidadesprofessoridmodalidadeprofessor || !novaDispoForm.data ||
        !novaDispoForm.horainicio || !novaDispoForm.horafim) {
      toast.error('Preencha todos os campos');
      return;
    }

    if (novaDispoForm.recorrente) {
      if (novaDispoForm.diadasemana.length === 0 || !novaDispoForm.dataFim) {
        toast.error('Selecione o dia da semana e a data final para a recorrência');
        return;
      }
      if (novaDispoForm.dataFim <= novaDispoForm.data) {
        toast.error('A data final deve ser posterior à data de início');
        return;
      }
    }

    const now = new Date();
    const selectedDate = new Date(`${novaDispoForm.data}T${novaDispoForm.horainicio}`);
    if (selectedDate <= now) {
      toast.error(
        selectedDate.toDateString() === now.toDateString()
          ? 'A hora de início deve ser posterior à hora atual'
          : 'A data não pode ser no passado'
      );
      return;
    }
    try {
      let result;
      if (novaDispoForm.recorrente) {
        result = await api.createRecorrenteDisponibilidade({
          modalidadesprofessoridmodalidadeprofessor: parseInt(novaDispoForm.modalidadesprofessoridmodalidadeprofessor),
          horainicio: novaDispoForm.horainicio,
          horafim: novaDispoForm.horafim,
          dataInicio: novaDispoForm.data,
          dataFim: novaDispoForm.dataFim,
          diadasemana: novaDispoForm.diadasemana,
        });
      } else {
        result = await api.createProfessorDisponibilidade({
          modalidadesprofessoridmodalidadeprofessor: parseInt(novaDispoForm.modalidadesprofessoridmodalidadeprofessor),
          data: novaDispoForm.data,
          horainicio: novaDispoForm.horainicio,
          horafim: novaDispoForm.horafim,
        });
      }
      if (result.success) {
        const msg = result.total
          ? result.message
          : 'Disponibilidade criada!';
        toast.success(msg);
        setShowNovaDispoModal(false);
        setAlertaDataDispo(null);
        setNovaDispoForm({ modalidadesprofessoridmodalidadeprofessor: '', data: '', horainicio: '', horafim: '', recorrente: false, diadasemana: [], dataFim: '' });
        const res = await api.getMyDisponibilidades();
        if (res.success && res.data) setMinhasDisponibilidades(res.data);
      }
    } catch (error: any) {
      toast.error(error.message || 'Erro ao criar disponibilidade');
    }
  };

  const openNovaDispoModal = async () => {
    try {
      const modRes = await api.getProfessorModalidades();
      if (modRes.success) setModalidadesProfessor(modRes.data || []);
    } catch {}
    setNovaDispoForm({ modalidadesprofessoridmodalidadeprofessor: '', data: '', horainicio: '', horafim: '', recorrente: false, diadasemana: [], dataFim: '' });
    setAlertaDataDispo(null);
    setShowNovaDispoModal(true);
  };

  const openEditDisponibilidadeModal = (disp: any) => {
    setSelectedDisponibilidadeForModal(disp);
    setEditDisponibilidadeMode(false);
    setEditDisponibilidadeForm({
      horainicio: disp.horaInicio || disp.horainicio || '',
      horafim: disp.horaFim || disp.horafim || '',
    });
  };

  const handleDeleteDisponibilidade = async () => {
    const disp = selectedDisponibilidadeForModal;
    if (!disp) return;
    if (!confirm('Tem a certeza que deseja eliminar esta disponibilidade?')) return;
    try {
      await api.deleteProfessorDisponibilidade(Number(disp.id || disp.iddisponibilidade_mensal));
      toast.success('Disponibilidade eliminada!');
      setMinhasDisponibilidades(prev => prev.filter(d => d.id !== disp.id && d.iddisponibilidade_mensal !== disp.iddisponibilidade_mensal));
      setSelectedDisponibilidadeForModal(null);
    } catch (error: any) {
      toast.error(error.message || 'Erro ao eliminar disponibilidade');
    }
  };

  const handleUpdateDisponibilidade = async () => {
    const disp = selectedDisponibilidadeForModal;
    if (!disp) return;
    if (!editDisponibilidadeForm.horainicio || !editDisponibilidadeForm.horafim) {
      toast.error('Preencha a hora de início e fim');
      return;
    }
    try {
      const id = Number(disp.id || disp.iddisponibilidade_mensal);
      await api.updateProfessorDisponibilidade(id, {
        horainicio: editDisponibilidadeForm.horainicio,
        horafim: editDisponibilidadeForm.horafim,
      });
      toast.success('Disponibilidade atualizada!');
      setMinhasDisponibilidades(prev => prev.map(d =>
        (d.id === disp.id || d.iddisponibilidade_mensal === disp.iddisponibilidade_mensal)
          ? { ...d, horainicio: editDisponibilidadeForm.horainicio, horafim: editDisponibilidadeForm.horafim }
          : d
      ));
      setSelectedDisponibilidadeForModal(null);
      setEditDisponibilidadeMode(false);
    } catch (error: any) {
      toast.error(error.message || 'Erro ao atualizar disponibilidade');
    }
  };

  const handleCancelarAulaDirecao = async (id: string) => {
    try {
      await api.cancelarAulaDirecao(parseInt(id));
      setAulas(aulas.map(a => a.id === id ? { ...a, status: 'CANCELADA' } : a));
      setSelectedAulaForModal(null);
      toast.success('Aula cancelada com sucesso!');
    } catch (error: any) {
      toast.error(error.message || 'Erro ao cancelar aula');
    }
  };

  const handleAprovarAula = async (id: string) => {
    try {
      await api.approveDirecaoAula(parseInt(id));
      setAulas(aulas.map(a => a.id === id ? { ...a, status: 'CONFIRMADA' } : a));
      setSelectedAulaForModal(null);
      toast.success('Coaching aprovado com sucesso!');
    } catch (error: any) {
      toast.error(error.message || 'Erro ao aprovar coaching');
    }
  };

  const handleRejeitarAula = async (id: string) => {
    const motivo = window.prompt('Motivo da rejeição:');
    if (motivo === null) return;
    if (!motivo?.trim()) { toast.error('Indique o motivo da rejeição.'); return; }
    try {
      await api.rejectDirecaoAula(parseInt(id), motivo.trim());
      setAulas(aulas.map(a => a.id === id ? { ...a, status: 'REJEITADA', motivoRejeicao: motivo.trim() } : a));
      setSelectedAulaForModal(null);
      toast.info('Coaching rejeitado.');
    } catch (error: any) {
      toast.error(error.message || 'Erro ao rejeitar coaching');
    }
  };

  const handleResponderSugestaoDirecao = async (aulaId: string, aceitar: boolean) => {
    try {
      await api.responderSugestaoDirecao(Number(aulaId), aceitar, undefined);
      if (aceitar) {
        setAulas(aulas.map(a => a.id === aulaId ? { ...a, sugestaoestado: 'AGUARDA_EE' } : a));
        toast.success('Aprovado. A aguardar confirmação do encarregado.');
      } else {
        setAulas(aulas.map(a => a.id === aulaId ? { ...a, sugestaoestado: null, novadata: undefined, novaData: undefined } : a));
        toast.info('Rejeitado. Professor notificado.');
      }
      setSelectedAulaForModal(null);
    } catch (error: any) {
      toast.error(error.message || 'Erro ao responder à sugestão');
    }
  };

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
          const [aulasRes2, anunciosRes2, turmasRes2, dispRes2] = await Promise.all([
            api.getDirecaoAulas(),
            api.getAnuncios(),
            api.getTurmas(),
            api.getDisponibilidades(),
          ]);
          aulasRes = aulasRes2;
          anunciosRes = anunciosRes2;
          turmasRes = turmasRes2;
          dispRes = dispRes2;

          const salasRes = await api.getSalas().catch(() => ({ success: false, data: [] }));
          if (salasRes.success) setSalas(salasRes.data || []);
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

        // Carrega as próprias disponibilidades do professor
        if (activeRole === 'PROFESSOR') {
          const myDispRes = await api.getMyDisponibilidades().catch(() => ({ success: false, data: [] }));
          if (myDispRes.success) setMinhasDisponibilidades(myDispRes.data || []);
        }
      } catch (err: any) {
        console.error('Erro ao carregar dados:', err);
        setError(err.message || 'Erro ao carregar dados');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [user?.id, activeRole]);

  // Carrega disponibilidades dos professores (sempre para ENCARREGADO/ALUNO)
  useEffect(() => {
    if (activeRole !== 'ENCARREGADO' && activeRole !== 'ALUNO') return;
    const load = async () => {
      try {
        const res = await api.getProfessorDisponibilidades();
        if (res.success) setDispProfessores(res.data || []);
      } catch (err) {
        console.error('Erro ao carregar disponibilidades dos professores:', err);
      }
    };
    load();
  }, [calMode, activeRole]);

  // ── ouvir clique em notificação vinda do layout ───────────────────────────
  const navigate = useNavigate();
  useEffect(() => {
    const handler = (e: Event) => {
      const n = (e as CustomEvent).detail;
      if (!n?.referencia_id || !n?.referencia_tipo) return;

      if (n.referencia_tipo === 'coaching') {
        const aula = aulas.find((a: any) => String(a.id) === String(n.referencia_id));
        if (aula) setSelectedAulaForModal(aula);
      } else if (n.referencia_tipo === 'turma') {
        setShowGruposModal(true);
      } else if (n.referencia_tipo === 'anuncio') {
        navigate('/dashboard/marketplace');
      } else {
        navigate('/dashboard');
      }
    };
    window.addEventListener('open-notificacao', handler);
    return () => window.removeEventListener('open-notificacao', handler);
  }, [aulas, navigate]);

  // ── estado vazio ──────────────────────────────────────────────────────────
  if (!user) return null;
  if (!activeRole) return null;

  // ── filtros role ──────────────────────────────────────────────────────────
  const allAulas = aulas;

  // Aulas filtradas para o encarregado (apenas dos seus próprios alunos)
  const filteredAulas = useMemo(() => {
    if (activeRole !== 'ENCARREGADO') return allAulas;
    const alunosIds = (user?.alunosIds ?? []).map(id => String(id));
    return allAulas.filter((a: any) => {
      if (a.alunoId && alunosIds.includes(String(a.alunoId))) return true;
      if (a.participantes?.some((p: any) => alunosIds.includes(String(p.alunoId)))) return true;
      return false;
    });
  }, [allAulas, activeRole, user?.alunosIds]);

  // Lista única de alunos do encarregado (extraída das aulas e filtrada pelos IDs do user)
  const alunosList = useMemo(() => {
    if (activeRole !== 'ENCARREGADO') return [] as string[];
    const alunosIds = (user?.alunosIds ?? []).map(id => String(id));
    const map = new Map<string, string>();
    allAulas.forEach((a: any) => {
      if (a.alunoNome && alunosIds.includes(String(a.alunoId))) {
        map.set(String(a.alunoId), a.alunoNome);
      }
      a.participantes?.forEach((p: any) => {
        if (p.alunoNome && alunosIds.includes(String(p.alunoId))) {
          map.set(String(p.alunoId), p.alunoNome);
        }
      });
    });
    return Array.from(map.values()).sort();
  }, [allAulas, activeRole, user?.alunosIds]);

  const pendentesCoachingCount = useMemo(() => {
    if (activeRole !== 'DIRECAO') return 0;
    return allAulas.filter((a: any) => a.status === 'PENDENTE').length;
  }, [allAulas, activeRole]);

  const pendentesRemarcacao = useMemo(() => {
    if (activeRole !== 'ENCARREGADO') return [];
    return filteredAulas.filter((a: any) => a.sugestaoestado === 'AGUARDA_EE');
  }, [filteredAulas, activeRole]);

  const meusAnuncios = (() => {
    if (activeRole === 'DIRECAO') return anuncios;
    if (activeRole === 'ENCARREGADO' || activeRole === 'PROFESSOR') {
      return anuncios.filter((a: any) => a.vendedorId === user.id);
    }
    return [];
  })();



  // ── calendário ────────────────────────────────────────────────────────────
  const primeiroDia = new Date(calYear, calMonth, 1).getDay();
  const diasNoMes   = new Date(calYear, calMonth + 1, 0).getDate();

  const aulasDoMes = filteredAulas.filter((a: any) => {
    const d = new Date(a.data);
    if (d.getMonth() !== calMonth || d.getFullYear() !== calYear) return false;
    return isAulaFutura(a);
  });

  const porDia: Record<number, any[]> = {};
  aulasDoMes.forEach((a: any) => {
    const dia = new Date(a.data).getDate();
    if (!porDia[dia]) porDia[dia] = [];
    porDia[dia].push(a);
  });

  // Fonte ativa de disponibilidades (quando filtro Disponibilidade do professor está ativo)
  const activeDisponibilidades = activeFilters.includes('DISPONIBILIDADE')
    ? dispProfessores.filter((d: any) => {
        if (professorFiltro !== 'TODOS' && d.professorId !== professorFiltro) return false;
        if (modalidadeFiltro !== 'TODAS' && d.modalidade !== modalidadeFiltro) return false;
        return true;
      })
    : [];

  // Listas para filtros (sempre disponíveis para ENCARREGADO/ALUNO)
  const showFilterSelects = activeRole === 'ENCARREGADO' || activeRole === 'ALUNO';
  const professoresList = showFilterSelects
    ? (() => {
        const seen = new Set<string>();
        return dispProfessores
          .filter((d: any) => { if (seen.has(d.professorId)) return false; seen.add(d.professorId); return true; })
          .map((d: any) => ({ id: d.professorId, nome: d.professorNome }))
          .sort((a: any, b: any) => (a.nome || '').localeCompare(b.nome || ''));
      })()
    : [];
  const todasModalidades = showFilterSelects
    ? [...new Set(dispProfessores.map((d: any) => d.modalidade).filter(Boolean))].sort()
    : [];

  // Dias com disponibilidades (para mostrar pontos no calendário)
  const dispPorDiaSet = new Set<number>();
  const showDispDots = activeRole === 'PROFESSOR'
    ? (activeFilters.includes('DISPONIBILIDADE') || activeFilters.includes('TODOS'))
    : (calMode === 'disponibilidades'
      || activeFilters.includes('DISPONIBILIDADE')
      || activeFilters.includes('TODOS')
      || (activeRole !== 'ENCARREGADO' && activeRole !== 'ALUNO'));
  if (showDispDots) {
    if (activeRole === 'PROFESSOR') {
      minhasDisponibilidades.forEach((d: any) => {
        if (!d.data) return;
        const dataDisp = new Date(d.data);
        if (dataDisp.getMonth() === calMonth && dataDisp.getFullYear() === calYear) {
          dispPorDiaSet.add(dataDisp.getDate());
        }
      });
    } else {
      const dispDotSource = calMode === 'disponibilidades' ? activeDisponibilidades : dispProfessores;
      dispDotSource.forEach((d: any) => {
        if (!d.data) return;
        const dataDisp = new Date(d.data);
        if (dataDisp.getMonth() === calMonth && dataDisp.getFullYear() === calYear) {
          dispPorDiaSet.add(dataDisp.getDate());
        }
      });
    }
  }

  const isHoje = (dia: number) =>
    dia === hoje.getDate() && calMonth === hoje.getMonth() && calYear === hoje.getFullYear();

  const cellDateStr = (dia: number) =>
    `${calYear}-${String(calMonth + 1).padStart(2, '0')}-${String(dia).padStart(2, '0')}`;

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
   const dispFilterByDay = (list: any[]) =>
     list.filter((d: any) => {
       if (!d.data) return false;
       const dataDisp = new Date(d.data);
       return dataDisp.getDate() === diaSelected &&
              dataDisp.getMonth() === calMonth &&
              dataDisp.getFullYear() === calYear;
     }).sort((a: any, b: any) => (a.horaInicio || a.horainicio || '').localeCompare(b.horaInicio || b.horainicio || ''));

   const dispDia = (activeRole === 'ENCARREGADO' || activeRole === 'ALUNO')
     ? (diaSelected && (activeFilters.includes('DISPONIBILIDADE') || activeFilters.includes('TODOS'))
         ? dispFilterByDay(dispProfessores)
         : [])
     : activeRole === 'PROFESSOR'
     ? (diaSelected && (activeFilters.includes('DISPONIBILIDADE') || activeFilters.includes('TODOS'))
         ? minhasDisponibilidades.filter((d: any) => {
             if (!d.data) return false;
             const dataDisp = new Date(d.data);
             return dataDisp.getDate() === diaSelected &&
                    dataDisp.getMonth() === calMonth &&
                    dataDisp.getFullYear() === calYear;
           }).sort((a: any, b: any) => (a.horaInicio || a.horainicio || '').localeCompare(b.horaInicio || b.horainicio || ''))
         : [])
     : (diaSelected
         ? activeDisponibilidades.filter((d: any) => {
             if (!d.data) return false;
             const dataDisp = new Date(d.data);
             return dataDisp.getDate() === diaSelected &&
                    dataDisp.getMonth() === calMonth &&
                    dataDisp.getFullYear() === calYear;
           }).sort((a: any, b: any) => (a.horaInicio || a.horainicio || '').localeCompare(b.horaInicio || b.horainicio || ''))
         : []);

  // ── próximas confirmadas ──────────────────────────────────────────────────
  const proximas = filteredAulas
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
  const getAlunoNome = (a: any) => a.alunoNome || a.participantes?.map((p: any) => p.alunoNome).filter(Boolean).join(', ') || 'Aluno';

  const aulasRecentes = [...allAulas]
    .filter((a: any) => {
      if (activeRole === 'ENCARREGADO' || activeRole === 'ALUNO') {
        return a.status !== 'CANCELADA' && a.status !== 'REJEITADA';
      }
      return true;
    })
    .filter((a: any) => {
      // Só mostrar aulas dos alunos que pertencem a este encarregado
      if (activeRole !== 'ENCARREGADO') return true;
      const alunosIds = (user?.alunosIds ?? []).map(id => String(id));
      if (a.alunoId && alunosIds.includes(String(a.alunoId))) return true;
      if (a.participantes?.some((p: any) => alunosIds.includes(String(p.alunoId)))) return true;
      return false;
    })
    .filter((a: any) => {
      if (activeRole !== 'ENCARREGADO' || alunoFiltro === 'TODOS') return true;
      const nomeAluno = getAlunoNome(a);
      return nomeAluno === alunoFiltro;
    })
    .sort((a: any, b: any) => new Date(b.data).getTime() - new Date(a.data).getTime());
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
              {activeRole === 'PROFESSOR' && (
                <Pill icon={Printer} label="Imprimir" onClick={() => setShowPrintModal(true)} />
              )}
              {activeRole === 'PROFESSOR' && (
                <Pill icon={Plus} label="Nova Disponibilidade" onClick={openNovaDispoModal} />
              )}
              {activeRole === 'PROFESSOR' && (
                <Pill icon={BookOpen} label="Grupos" onClick={() => setShowGruposModal(true)} />
              )}

              {activeRole === 'DIRECAO' && (
                <>
                  <Pill icon={CheckCircle} label="Aprovar Coachings" badgeCount={pendentesCoachingCount}
                    onClick={() => { setCoachingModalTab('marcar'); setShowCoachingModal(true); }} />
                  <Pill icon={Calendar} label="Agenda de Coachings"
                    onClick={() => { setCoachingModalTab('agenda'); setShowCoachingModal(true); }} />
                  <Pill icon={BookOpen} label="Grupos" onClick={() => setShowGruposModal(true)} />
                  <Pill icon={Plus} label="Nova Ocupação"
                    onClick={() => setShowNovaOcupacaoModal(true)} />
                </>
              )}

              {activeRole === 'ENCARREGADO' && (
                <>
                  {pendentesRemarcacao.length > 0 && (
                    <Pill icon={CalendarOff} label="Remarcações pendentes" badgeCount={pendentesRemarcacao.length}
                      onClick={handleOpenRemarcacao} />
                  )}
                  <Pill icon={Calendar} label="Coachings"
                    onClick={() => setShowEncarregadoCoachingModal(true)} />
                  <Pill icon={BookOpen} label="Grupos" onClick={() => setShowGruposModal(true)} />
                  <Pill icon={Printer} label="Imprimir" onClick={() => setShowPrintModal(true)} />
                </>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-6 space-y-6">

        {/* ── CoachingStatistics ─────────────────────────────────────────────── */}
        <CoachingStatistics aulas={filteredAulas} />

        {/* ── Calendário + Painel lateral ─────────────────────────────────── */}
        {activeRole === 'DIRECAO' ? (
          <div className="grid lg:grid-cols-[280px_1fr] gap-6 items-start">
            <CalendarioMini
              calMonth={calMonth}
              calYear={calYear}
              diaSelected={diaSelected}
              porDia={porDia}
              totalSalas={salas.length || 4}
              onPrevMonth={prevMonth}
              onNextMonth={nextMonth}
              onDiaClick={(dia) => setDiaSelected(dia)}
            />
            <OcupacaoSalas
              salas={salas}
              aulas={aulasDia}
              calMonth={calMonth}
              calYear={calYear}
              diaSelected={diaSelected}
              onAulaClick={(aula) => setSelectedAulaForModal(aula)}
            />
          </div>
        ) : (
          <div className="grid lg:grid-cols-5 gap-6 items-start">

          {/* ── Calendário ──────────────────────────────────────────────── */}
          <div className="lg:col-span-3">
            <div className="bg-white rounded-2xl shadow-sm border border-[#0d6b5e]/8 overflow-hidden">
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

            <div className="p-4 pb-6">
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
                   
                   // Filter aulas for calendar dots based on activeFilters
                    const filteredAulasCell = aulasCell.filter((a: any) => {
                      if (activeFilters.includes('TODOS')) return true;
                      const st = a.status;
                      if (st === 'CONFIRMADA' && !activeFilters.includes('CONFIRMADA')) return false;
                      if (st === 'PENDENTE' && !activeFilters.includes('PENDENTE')) return false;
                      if ((st === 'REJEITADA' || st === 'CANCELADA') && !activeFilters.includes('CANCELADA')) return false;
                      return ['CONFIRMADA', 'PENDENTE', 'REJEITADA', 'CANCELADA'].includes(st);
                    });
                   
                   // Check if there are disponibilidades to show (only when DISPONIBILIDADE or TODOS is active)
                   const showDispForCell = activeFilters.includes('DISPONIBILIDADE') || activeFilters.includes('TODOS');
                   const temAulas = filteredAulasCell.length > 0;
                   const temDisp  = showDispForCell && dispPorDiaSet.has(dia);
                   const hasEvento = temAulas || temDisp;
                   const warning  = isDiaWarning(cellDateStr(dia));
                   const ehWarning = warning.isWarning;

                   return (
                     <button
                       key={idx}
                       onClick={() => setDiaSelected(dia)}
                       className={`relative flex flex-col items-center py-2 rounded-xl transition-all group ${
                         selected
                           ? 'bg-[#0d6b5e] shadow-sm'
                           : ehHoje
                           ? 'bg-[#0d6b5e]/8 ring-2 ring-[#0d6b5e]/30'
                           : ehWarning
                           ? 'bg-red-100 ring-1 ring-red-200 hover:bg-red-200'
                           : hasEvento
                           ? 'hover:bg-[#e2f0ed]'
                           : 'hover:bg-[#f4f9f8]'
                       }`}
                       title={ehWarning ? warning.mensagem : undefined}
                     >
                       <span className={`text-sm leading-none ${
                         selected ? 'text-white' : ehHoje ? 'text-[#0d6b5e]' : ehWarning ? 'text-red-700' : 'text-[#0a1a17]'
                       }`} style={{ fontWeight: selected || ehHoje ? 700 : ehWarning ? 500 : hasEvento ? 500 : 400 }}>
                         {dia}
                       </span>

                       {ehWarning && (
                         <div className="mt-1 flex items-center gap-0.5" title={warning.mensagem}>
                           <AlertCircle className={`w-3 h-3 ${selected ? 'text-white/80' : 'text-red-500'}`} />
                         </div>
                       )}

                        {hasEvento && (
                          <div className="flex gap-0.5 mt-1.5 flex-wrap justify-center max-w-[28px]">
                            {filteredAulasCell.slice(0, 3).map((a: any, i: number) => (
                              <div
                                key={i}
                                className={`w-1.5 h-1.5 rounded-full ${
                                  selected ? 'bg-white/70' :
                                  a.status === 'CONFIRMADA' ? 'bg-[#0d6b5e]' :
                                  a.status === 'PENDENTE'   ? 'bg-amber-400' :
                                  'bg-red-400'
                                }`}/>
                            ))}
                               {filteredAulasCell.length === 0 && temDisp && (
                                 <div 
                                   className={selected ? 'w-1.5 h-1.5 rounded-full bg-white/70' : 'w-1.5 h-1.5 rounded-full bg-[#c9a84c]'}
                                 />
                               )}
                          </div>
                        )}
                     </button>
                   );
                 })}
                </div>

                {/* Legenda — filtros clicáveis */}
               {activeRole === 'ENCARREGADO' || activeRole === 'ALUNO' ? (
                  <div className="flex flex-wrap items-center gap-x-3 gap-y-2 mt-4 pt-4 border-t border-[#0d6b5e]/8">
                    <button
                      onClick={() => toggleFilter('TODOS')}
                      className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium transition-all ${
                        activeFilters.includes('TODOS')
                          ? 'bg-[#0d6b5e] text-white'
                          : 'bg-[#e2f0ed] text-[#0d6b5e] hover:bg-[#d0e8e3]'
                      }`}
                    >
                      Todos
                    </button>
                    <button
                      onClick={() => toggleFilter('CONFIRMADA')}
                      className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium transition-all ${
                        activeFilters.includes('CONFIRMADA')
                          ? 'bg-[#0d6b5e] text-white'
                          : 'bg-[#e2f0ed] text-[#0d6b5e] hover:bg-[#d0e8e3]'
                      }`}
                    >
                      <div className="w-2 h-2 rounded-full bg-[#0d6b5e]" /> Confirmado
                    </button>
                    <button
                      onClick={() => toggleFilter('PENDENTE')}
                      className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium transition-all ${
                        activeFilters.includes('PENDENTE')
                          ? 'bg-[#c9a84c] text-white'
                          : 'bg-[#fdf6e3] text-[#c9a84c] hover:bg-[#f5edd0]'
                      }`}
                    >
                      <div className="w-2 h-2 rounded-full bg-amber-400" /> Pendente
                    </button>
                    <button
                      onClick={() => toggleFilter('CANCELADA')}
                      className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium transition-all ${
                        activeFilters.includes('CANCELADA')
                          ? 'bg-red-600 text-white'
                          : 'bg-red-50 text-red-700 hover:bg-red-100'
                      }`}
                    >
                      <div className="w-2 h-2 rounded-full bg-red-400" /> Cancelado
                    </button>
                    {(activeRole === 'ENCARREGADO' || activeRole === 'ALUNO') && (
                      <button
                        onClick={() => toggleFilter('DISPONIBILIDADE')}
                        className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium transition-all ${
                          activeFilters.includes('DISPONIBILIDADE')
                            ? 'bg-[#c9a84c] text-white'
                            : 'bg-amber-50 text-[#c9a84c] hover:bg-amber-100'
                        }`}
                      >
                        <div className="w-2 h-2 rounded-full bg-[#c9a84c]" /> Disponibilidades
                      </button>
                    )}
                  </div>
               ) : activeRole === 'PROFESSOR' ? (
                  <div className="flex flex-wrap items-center gap-x-3 gap-y-2 mt-4 pt-4 border-t border-[#0d6b5e]/8">
                    <button
                      onClick={() => toggleFilter('TODOS')}
                      className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium transition-all ${
                        activeFilters.includes('TODOS')
                          ? 'bg-[#0d6b5e] text-white'
                          : 'bg-[#e2f0ed] text-[#0d6b5e] hover:bg-[#d0e8e3]'
                      }`}
                    >
                      Todos
                    </button>
                    <button
                      onClick={() => toggleFilter('CONFIRMADA')}
                      className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium transition-all ${
                        activeFilters.includes('CONFIRMADA')
                          ? 'bg-[#0d6b5e] text-white'
                          : 'bg-[#e2f0ed] text-[#0d6b5e] hover:bg-[#d0e8e3]'
                      }`}
                    >
                      <div className="w-2 h-2 rounded-full bg-[#0d6b5e]" /> Confirmado
                    </button>
                    <button
                      onClick={() => toggleFilter('PENDENTE')}
                      className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium transition-all ${
                        activeFilters.includes('PENDENTE')
                          ? 'bg-[#c9a84c] text-white'
                          : 'bg-[#fdf6e3] text-[#c9a84c] hover:bg-[#f5edd0]'
                      }`}
                    >
                      <div className="w-2 h-2 rounded-full bg-amber-400" /> Pendente
                    </button>
                    <button
                      onClick={() => toggleFilter('CANCELADA')}
                      className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium transition-all ${
                        activeFilters.includes('CANCELADA')
                          ? 'bg-red-600 text-white'
                          : 'bg-red-50 text-red-700 hover:bg-red-100'
                      }`}
                    >
                      <div className="w-2 h-2 rounded-full bg-red-400" /> Cancelado
                    </button>
                    <button
                      onClick={() => toggleFilter('DISPONIBILIDADE')}
                      className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium transition-all ${
                        activeFilters.includes('DISPONIBILIDADE')
                          ? 'bg-[#c9a84c] text-white'
                          : 'bg-amber-50 text-[#c9a84c] hover:bg-amber-100'
                      }`}
                    >
                      <div className="w-2 h-2 rounded-full bg-[#c9a84c]" /> Disponibilidades
                    </button>
                  </div>
               ) : calMode === 'disponibilidades' ? (
                 <div className="flex items-center gap-3 mt-4 pt-4 border-t border-[#0d6b5e]/8">
                   <div className="flex items-center gap-1.5 text-xs text-[#4d7068]">
                     <div className="w-2 h-2 rounded-full bg-[#c9a84c]" /> Disponível
                   </div>
                   <span className="text-[10px] text-[#4d7068]/60">— Vagas dos professores</span>
                 </div>
               ) : (
               <div className="flex items-center gap-5 mt-4 pt-4 border-t border-[#0d6b5e]/8">
                 <div className="flex items-center gap-1.5 text-xs text-[#4d7068]">
                   <div className="w-2 h-2 rounded-full bg-[#0d6b5e]" /> Confirmado
                 </div>
                 <div className="flex items-center gap-1.5 text-xs text-[#4d7068]">
                   <div className="w-2 h-2 rounded-full bg-amber-400" /> Pendente
                 </div>
                 <div className="flex items-center gap-1.5 text-xs text-[#4d7068]">
                   <div className="w-2 h-2 rounded-full bg-red-400" /> Cancelado
                 </div>
                 {activeRole !== 'ENCARREGADO' && activeRole !== 'ALUNO' && (
                   <Link to="/dashboard/coaching"
                     className="flex items-center gap-1.5 text-xs text-[#c9a84c] hover:text-[#b89438] transition-colors cursor-pointer">
                     <div className="w-2 h-2 rounded-full bg-[#c9a84c]" /> Disponível
                   </Link>
                 )}
               </div>
                 )}

               {/* Filtros professor/modalidade — apenas quando Disponibilidade do professor está ativo */}
               {activeRole === 'ENCARREGADO' || activeRole === 'ALUNO' ? (
                 <div className="flex items-center gap-4 mt-4 pt-4 border-t border-[#0d6b5e]/8">
                   {activeFilters.includes('DISPONIBILIDADE') && (
                     <>
                       <div className="flex items-center gap-2">
                         <label className="text-xs text-[#4d7068] font-medium">Professor:</label>
                         <select
                           value={professorFiltro}
                           onChange={e => setProfessorFiltro(e.target.value)}
                           className="text-xs border border-[#0d6b5e]/20 rounded px-2 py-1 bg-white text-[#0a1a17] focus:outline-none focus:border-[#c9a84c] cursor-pointer"
                         >
                           <option value="TODOS">Todos</option>
                           {professoresList.map(p => (
                             <option key={p.id} value={p.id}>{p.nome}</option>
                           ))}
                         </select>
                       </div>
                       <div className="flex items-center gap-2">
                         <label className="text-xs text-[#4d7068] font-medium">Modalidade:</label>
                         <select
                           value={modalidadeFiltro}
                           onChange={e => setModalidadeFiltro(e.target.value)}
                           className="text-xs border border-[#0d6b5e]/20 rounded px-2 py-1 bg-white text-[#0a1a17] focus:outline-none focus:border-[#c9a84c] cursor-pointer"
                         >
                           <option value="TODAS">Todas</option>
                           {todasModalidades.map(m => (
                             <option key={m} value={m}>{m}</option>
                           ))}
                         </select>
                       </div>
                     </>
                   )}
                 </div>
               ) : null}

            </div>
            </div>

            {/* ── Coachings Recentes (compacto) ──────────────────────────── */}
          <div className={activeRole === 'ENCARREGADO' || activeRole === 'ALUNO' ? 'mt-6 bg-white rounded-2xl shadow-sm border border-[#0d6b5e]/8 overflow-hidden' : 'border-t border-[#0d6b5e]/8'}>
            <div className="px-4 py-3 border-b border-[#0d6b5e]/8 flex items-center justify-between gap-3">
              <div className="flex items-center gap-3 min-w-0">
                <h3 className="text-sm text-[#0a1a17] whitespace-nowrap" style={{ fontWeight: 600 }}>
                  Coachings
                </h3>
                {activeRole === 'ENCARREGADO' && alunosList.length > 0 && (
                  <select
                    value={alunoFiltro}
                    onChange={(e) => { e.preventDefault(); setAlunoFiltro(e.target.value); setCurrentPage(1); }}
                    className="text-xs border border-[#0d6b5e]/20 rounded-lg px-2 py-1 text-[#0a1a17] bg-white focus:outline-none focus:ring-1 focus:ring-[#0d6b5e]/30 max-w-[160px]"
                  >
                    <option value="TODOS">Todos os alunos</option>
                    {alunosList.map(nome => (
                      <option key={nome} value={nome}>{nome}</option>
                    ))}
                  </select>
                )}
              </div>
              {activeRole !== 'ENCARREGADO' && (
                <Link to="/dashboard/coaching"
                  className="text-xs text-[#0d6b5e] hover:text-[#065147] transition-colors shrink-0"
                  style={{ fontWeight: 500 }}>
                  Ver todos
                </Link>
              )}
            </div>

            {aulasRecentes.length === 0 ? (
              <div className="text-[#4d7068] text-xs py-6 text-center">
                Nenhum coaching encontrado
              </div>
            ) : (
              <>
                <div className="divide-y divide-[#0d6b5e]/5">
                  {paginatedAulas.map((aula: any) =>
                    activeRole === 'ENCARREGADO' || activeRole === 'ALUNO' || activeRole === 'PROFESSOR' ? (
                      <button key={aula.id} onClick={() => setSelectedAulaForModal(aula)}
                        className="w-full text-left flex items-center gap-3 px-4 py-2.5 hover:bg-[#f4f9f8] transition-colors">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-sm text-[#0a1a17]">
                              {activeRole === 'ENCARREGADO' ? (
                                <>Aluno: {getAlunoNome(aula)} · Prof.: {aula.professorNome}</>
                              ) : activeRole === 'PROFESSOR' ? (
                                aula.alunoNome
                              ) : (
                                <>Prof.: {aula.professorNome}</>
                              )}
                            </span>
                            {STATUS_CFG[aula.status] && (
                              <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] ${STATUS_CFG[aula.status].bg} ${STATUS_CFG[aula.status].text}`}>
                                <span className={`w-1.5 h-1.5 rounded-full ${STATUS_CFG[aula.status].dot}`} />
                                {STATUS_CFG[aula.status].label}
                              </span>
                            )}
                          </div>
                          <div className="flex items-center gap-2 text-xs text-[#4d7068] mt-0.5 flex-wrap">
                            <span>{formatDate(aula.data)}</span>
                            <span>·</span>
                            <span>{formatHora(aula.horaInicio)} – {formatHora(aula.horaFim || aula.horaInicio)}</span>
                            {aula.estudioNome && <><span>·</span><span>{aula.estudioNome}</span></>}
                            {aula.modalidade && <><span>·</span><span>{aula.modalidade}</span></>}
                          </div>
                        </div>
                        <ChevronRight className="w-3.5 h-3.5 text-[#4d7068] shrink-0" />
                      </button>
                    ) : (
                      <Link key={aula.id} to="/dashboard/coaching"
                        className="flex items-center gap-3 px-4 py-2.5 hover:bg-[#f4f9f8] transition-colors">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-sm text-[#0a1a17]">
                              Prof.: {aula.professorNome}
                            </span>
                            {STATUS_CFG[aula.status] && (
                              <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] ${STATUS_CFG[aula.status].bg} ${STATUS_CFG[aula.status].text}`}>
                                <span className={`w-1.5 h-1.5 rounded-full ${STATUS_CFG[aula.status].dot}`} />
                                {STATUS_CFG[aula.status].label}
                              </span>
                            )}
                          </div>
                          <div className="flex items-center gap-2 text-xs text-[#4d7068] mt-0.5 flex-wrap">
                            <span>{formatDate(aula.data)}</span>
                            <span>·</span>
                            <span>{formatHora(aula.horaInicio)} – {formatHora(aula.horaFim || aula.horaInicio)}</span>
                            {aula.estudioNome && <><span>·</span><span>{aula.estudioNome}</span></>}
                            {aula.modalidade && <><span>·</span><span>{aula.modalidade}</span></>}
                          </div>
                        </div>
                        <ChevronRight className="w-3.5 h-3.5 text-[#4d7068] shrink-0" />
                      </Link>
                    )
                  )}
                </div>

                {totalPages > 1 && (
                  <div className="flex items-center justify-between px-4 py-2.5 border-t border-[#0d6b5e]/5">
                    <button onClick={(e) => { e.preventDefault(); setCurrentPage(p => Math.max(1, p - 1)); }}
                      disabled={currentPage === 1}
                      className="text-xs text-[#4d7068] hover:text-[#0d6b5e] disabled:opacity-50 disabled:cursor-not-allowed transition-colors">
                      Anterior
                    </button>
                    <div className="flex items-center gap-1">
                      {Array.from({ length: totalPages }, (_, i) => i + 1).map(page => (
                        <button key={page} onClick={(e) => { e.preventDefault(); setCurrentPage(page); }}
                          className={`w-6 h-6 rounded text-xs transition-colors ${currentPage === page ? 'bg-[#0d6b5e] text-white' : 'text-[#4d7068] hover:bg-[#e2f0ed]'}`}>
                          {page}
                        </button>
                      ))}
                    </div>
                    <button onClick={(e) => { e.preventDefault(); setCurrentPage(p => Math.min(totalPages, p + 1)); }}
                      disabled={currentPage === totalPages}
                      className="text-xs text-[#4d7068] hover:text-[#0d6b5e] disabled:opacity-50 disabled:cursor-not-allowed transition-colors">
                      Próxima
                    </button>
                  </div>
                )}
              </>
            )}
            </div>
          </div>

          {/* ── Painel lateral — Agenda Diária ──────────────────────────── */}
          <div className="lg:col-span-2 bg-white rounded-2xl shadow-sm border border-[#0d6b5e]/8 flex flex-col overflow-hidden">
            {diaSelected ? (
              <>
                <div className="px-5 py-4 border-b border-[#0d6b5e]/8">
                  <p className="text-xs text-[#4d7068] mb-0.5">{DIAS_SEMANA[new Date(calYear, calMonth, diaSelected).getDay()]}</p>
                  <p className="text-[#0a1a17]" style={{ fontWeight: 700, fontSize: '1.4rem' }}>
                    {diaSelected} <span className="text-[#4d7068]" style={{ fontWeight: 400, fontSize: '1rem' }}>{MESES_PT[calMonth]}</span>
                  </p>
                  <div className="flex items-center justify-between mt-0.5">
                    <p className="text-xs text-[#4d7068]">
                      {activeFilters.includes('DISPONIBILIDADE') || activeFilters.includes('TODOS')
                        ? `${dispDia.length} disponibilidade${dispDia.length !== 1 ? 's' : ''}` + (aulasDia.length > 0 ? ` · ${aulasDia.length} aula${aulasDia.length !== 1 ? 's' : ''}` : '')
                        : `${aulasDia.length} aula${aulasDia.length !== 1 ? 's' : ''}`}
                    </p>
                    {activeFilters.includes('DISPONIBILIDADE') && (
                      <span className="text-[10px] text-[#c9a84c] font-medium">Disponibilidades Professores</span>
                    )}
                  </div>
                </div>

                <div className="flex-1 overflow-y-auto">
                  {(() => {
                    const HORAS_TIMELINE = Array.from({ length: 14 }, (_, i) => i + 7);
                    const ALTURA_H = 72;

                    const paraMin = (h: string) => { const [h2, m] = h.split(':').map(Number); return h2 * 60 + (m || 0); };

                    const eventos: { id: string; inicio: number; fim: number; tipo: 'aula' | 'disponibilidade'; dados: any }[] = [];

                    // Aulas — filtradas por activeFilters (Confirmado/Pendente/Cancelado)
                    const showAulas = activeFilters.includes('TODOS') ||
                      activeFilters.some(f => ['CONFIRMADA', 'PENDENTE', 'CANCELADA'].includes(f));
                    if (showAulas) {
                      aulasDia.forEach((a: any) => {
                        if (!activeFilters.includes('TODOS')) {
                          const st = a.status;
                          if (st === 'CONFIRMADA' && !activeFilters.includes('CONFIRMADA')) return;
                          if (st === 'PENDENTE' && !activeFilters.includes('PENDENTE')) return;
                          if ((st === 'REJEITADA' || st === 'CANCELADA') && !activeFilters.includes('CANCELADA')) return;
                          if (!['CONFIRMADA', 'PENDENTE', 'REJEITADA', 'CANCELADA'].includes(st)) return;
                        }
                        const ini = paraMin(a.horaInicio || '00:00');
                        const dur = a.duracao || 60;
                        eventos.push({ id: 'a-' + a.id, inicio: ini, fim: ini + dur, tipo: 'aula', dados: a });
                      });
                    }

                    const horaFimDisp = (d: any) => {
                      const ini = paraMin(d.horaInicio || d.horainicio || '00:00');
                      const fim = paraMin(d.horaFim || d.horafim || '23:59');
                      return Math.max(fim, ini + 30);
                    };

                    // Disponibilidades — só se DISPONIBILIDADE (ou TODOS) estiver ativo
                    const showDisp = activeFilters.includes('TODOS') || activeFilters.includes('DISPONIBILIDADE');
                    if (showDisp) {
                      dispDia.forEach((d: any) => {
                        // Professor/modalidade só filtram quando DISPONIBILIDADE está ativo (não quando é TODOS)
                        if (activeFilters.includes('DISPONIBILIDADE')) {
                          if (professorFiltro !== 'TODOS' && d.professorId !== professorFiltro) return;
                          if (modalidadeFiltro !== 'TODAS' && d.modalidade !== modalidadeFiltro) return;
                        }
                        const ini = paraMin(d.horaInicio || d.horainicio || '00:00');
                        const fim = horaFimDisp(d);
                        eventos.push({ id: 'd-' + (d.id || d.iddisponibilidade_mensal), inicio: ini, fim, tipo: 'disponibilidade', dados: d });
                      });
                    }

                    eventos.sort((a, b) => a.inicio - b.inicio);

                    // ── colunas laterais para eventos sobrepostos ────────────
                    const colEvt: Record<string, number> = {};
                    const totalCols: Record<string, number> = {};
                    for (let i = 0; i < eventos.length; i++) {
                      const e = eventos[i];
                      const ocupadas = new Set<number>();
                      for (let j = 0; j < i; j++) {
                        const p = eventos[j];
                        if (e.inicio < p.fim && p.inicio < e.fim) ocupadas.add(colEvt[p.id]);
                      }
                      let c = 0;
                      while (ocupadas.has(c)) c++;
                      colEvt[e.id] = c;
                    }
                    // segunda passagem: total de colunas necessárias por grupo
                    for (let i = 0; i < eventos.length; i++) {
                      const e = eventos[i];
                      let maxC = 0;
                      for (let j = 0; j < eventos.length; j++) {
                        const o = eventos[j];
                        if (e.inicio < o.fim && o.inicio < e.fim) maxC = Math.max(maxC, colEvt[o.id] + 1);
                      }
                      totalCols[e.id] = maxC;
                    }

                    const MIN_HORA = 7;
                    const MAX_HORA = 20;
                    const MIN_PX = MIN_HORA * 60;
                    const topPorMin = (min: number) => ((min - MIN_PX) / 60) * ALTURA_H;

                    const TOTAL_H = (MAX_HORA - MIN_HORA) * ALTURA_H;
                    return (
                      <div className="relative" style={{ height: TOTAL_H + 'px' }}>
                        {HORAS_TIMELINE.map((h) => (
                          <div key={h}
                            className="absolute left-0 right-0 flex items-start pointer-events-none"
                            style={{ top: (h - MIN_HORA) * ALTURA_H + 'px', height: ALTURA_H + 'px' }}>
                            <span className="text-xs text-[#4d7068] font-medium tabular-nums bg-white pr-2 pl-1 leading-none pt-0.5"
                              style={{ minWidth: '3rem' }}>
                              {String(h).padStart(2, '0')}:00
                            </span>
                            <div className="flex-1 border-t border-[#0d6b5e]/8 self-start mt-1" />
                          </div>
                        ))}

                        {(() => {
                          const aulasApenas = eventos.filter(e => e.tipo === 'aula');
                          return eventos.map((evt, idx) => {
                            if (evt.tipo === 'aula') {
                              const a = evt.dados;
                              const topPx = topPorMin(evt.inicio);
                              const htPx = Math.max(topPorMin(evt.fim) - topPorMin(evt.inicio), 22);
                              const st = STATUS_CFG[a.status as keyof typeof STATUS_CFG] ?? STATUS_CFG.PENDENTE;
                              const temSugestao = !!a.sugestaoestado;
                              const corBorda = temSugestao ? 'border-orange-500'
                                : a.status === 'CANCELADA' || a.status === 'REJEITADA' ? 'border-red-400'
                                : a.status === 'PENDENTE' ? 'border-amber-400'
                                : 'border-[#0d6b5e]';

                              const aulaIdx = aulasApenas.indexOf(evt);
                              const par = aulaIdx % 2 === 0;
                              const corBg = temSugestao
                                ? (par ? 'bg-orange-50' : 'bg-orange-100')
                                : a.status === 'CANCELADA' || a.status === 'REJEITADA'
                                ? (par ? 'bg-red-50' : 'bg-red-100')
                                : a.status === 'PENDENTE'
                                ? (par ? 'bg-amber-50' : 'bg-amber-100')
                                : (par ? 'bg-[#e2f0ed]' : 'bg-[#d0e4df]');

                              const alunoNome = a.alunoNome || a.participantes?.map((p: any) => p.alunoNome).filter(Boolean).join(', ') || '';
                              return (
                                <div key={evt.id}
                                  onClick={() => setSelectedAulaForModal(a)}
                                  className={`absolute rounded-lg border-l-4 ${corBorda} ${corBg} px-2 py-1.5 overflow-hidden cursor-pointer hover:shadow-md transition-shadow`}
                                  style={{ top: topPx + 'px', height: htPx + 'px', left: `calc(4rem + ${colEvt[evt.id]} * ((100% - 4rem - 0.5rem) / ${totalCols[evt.id]}))`, width: `calc(((100% - 4rem - 0.5rem) / ${totalCols[evt.id]}) - 4px)` }}>
                                   <div className="flex items-center justify-between gap-0.5 mb-1">
                                     <span className="flex items-center gap-1 min-w-0">
                                       <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${st.bg} ${st.text} shrink-0 leading-none font-semibold`}>{st.label}</span>
                                       {temSugestao && <span className="text-[9px] px-1 py-0.5 rounded-full bg-orange-200 text-orange-800 shrink-0 leading-none font-semibold">Remarcação</span>}
                                     </span>
                                     <span className="text-[10px] text-[#4d7068] font-medium tabular-nums leading-none">{formatHora(a.horaInicio)}</span>
                                   </div>
                                  <div className="flex flex-col gap-0.5 text-[10px] text-[#0a1a17] leading-tight">
                                    {a.modalidade && <div><span className="text-[#4d7068]">Modalidade:</span> {a.modalidade}</div>}
                                    {a.estudioNome && <div><span className="text-[#4d7068]">Sala:</span> {a.estudioNome}</div>}
                                    <div><span className="text-[#4d7068]">Professor:</span> {a.professorNome}</div>
                                    {alunoNome && <div><span className="text-[#4d7068]">Aluno:</span> {alunoNome}</div>}
                                  </div>
                                </div>
                              );
                            } else {
                              const d = evt.dados;
                              const topPx = topPorMin(evt.inicio);
                              const htPx = Math.max(topPorMin(evt.fim) - topPorMin(evt.inicio), 22);
                              const modalidade = d.modalidade || d.modalidade_nome || '';
                              const estudioNome = d.salaNome || d.sala?.nomesala || d.estudioNome || '';
                              const horaInicio = formatHora(d.horaInicio || d.horainicio);
                              const horaFim = formatHora(d.horaFim || d.horafim);
                              const professorNome = d.professorNome || '';
                              const professorId = d.professorId || '';
                              const disponibilidadeId = d.id || d.iddisponibilidade_mensal || '';
                              const modalidadeId = d.modalidadeId || '';
                              // duração do slot em minutos
                              const slotDuracao = (() => {
                                if (!horaInicio || !horaFim) return 60;
                                const [h1, m1] = horaInicio.split(':').map(Number);
                                const [h2, m2] = horaFim.split(':').map(Number);
                                return Math.max((h2 * 60 + m2) - (h1 * 60 + m1), 30);
                              })();
                              const dataStr = `${calYear}-${String(calMonth + 1).padStart(2, '0')}-${String(diaSelected).padStart(2, '0')}`;

                              const handleSolicitar = () => {
                                setSubmitError(null);
                                setSolicitarPrefill({
                                  professorId,
                                  data: dataStr,
                                  horaInicio,
                                  horaFim,
                                  duracao: String(slotDuracao),
                                  maxDuracao: String(slotDuracao),
                                  modalidade,
                                  modalidadeId,
                                  disponibilidadeId,
                                });
                                setShowSolicitarModal(true);
                              };

                              if (activeRole === 'ENCARREGADO') {
                                return (
                                  <button key={evt.id} type="button" onClick={handleSolicitar}
                                    data-tipo="disponibilidade"
                                    data-professor={professorId}
                                    data-modalidade={modalidade}
                                    title={`${modalidade ? modalidade + ' · ' : ''}${estudioNome ? estudioNome + ' · ' : ''}${professorNome}${horaInicio ? '\n' + horaInicio + ' – ' + horaFim : ''}`}
                                    className="absolute rounded-lg border-l-4 border-[#c9a84c] bg-amber-50/60 px-2 py-1 overflow-hidden block hover:bg-amber-100 transition-colors text-left w-full cursor-pointer"
                                    style={{ top: topPx + 'px', height: htPx + 'px', left: `calc(4rem + ${colEvt[evt.id]} * ((100% - 4rem - 0.5rem) / ${totalCols[evt.id]}))`, width: `calc(((100% - 4rem - 0.5rem) / ${totalCols[evt.id]}) - 4px)` }}>
                                     <div className="flex items-center justify-between gap-0.5">
                                       <div className="flex items-center gap-1">
                                         <span className="text-[9px] font-semibold text-[#c9a84c] truncate leading-tight">Disponível</span>
                                         <span className="text-[10px] text-[#4d7068] font-medium leading-none">{horaInicio} – {horaFim}</span>
                                       </div>
                                     </div>
                                     <div className="flex flex-col items-start gap-1 mt-1">
                                       <span className="text-[10px] font-medium">{modalidade || '-'}</span>
                                       <span className="text-[10px]">{estudioNome || '-'}</span>
                                       <span className="text-[10px]">{professorNome || '-'}</span>
                                     </div>
                                  </button>
                                );
                              }

                              if (activeRole === 'ALUNO') {
                                return (
                                  <button key={evt.id} type="button" onClick={() => setSelectedDisponibilidadeForModal(d)}
                                    data-tipo="disponibilidade"
                                    className="absolute rounded-lg border-l-4 border-[#c9a84c] bg-amber-50/60 px-2 py-1 overflow-hidden block hover:bg-amber-100 transition-colors text-left w-full cursor-pointer"
                                    style={{ top: topPx + 'px', height: htPx + 'px', left: `calc(4rem + ${colEvt[evt.id]} * ((100% - 4rem - 0.5rem) / ${totalCols[evt.id]}))`, width: `calc(((100% - 4rem - 0.5rem) / ${totalCols[evt.id]}) - 4px)` }}>
                                    <div className="flex items-center justify-between gap-0.5">
                                      <div className="flex items-center gap-1">
                                        <span className="text-[9px] font-semibold text-[#c9a84c] truncate leading-tight">Disponível</span>
                                        <span className="text-[10px] text-[#4d7068] font-medium leading-none">{horaInicio} – {horaFim}</span>
                                      </div>
                                    </div>
                                    <div className="flex flex-col items-start gap-1 mt-1">
                                      <span className="text-[10px] font-medium">{modalidade || '-'}</span>
                                      <span className="text-[10px]">{estudioNome || '-'}</span>
                                      <span className="text-[10px]">{professorNome || '-'}</span>
                                    </div>
                                  </button>
                                );
                              }

                               if (activeRole === 'PROFESSOR') {
                                 return (
                                   <button key={evt.id} type="button" onClick={() => openEditDisponibilidadeModal(d)}
                                     data-tipo="disponibilidade"
                                     title={`${modalidade ? modalidade + ' · ' : ''}${horaInicio ? horaInicio + ' – ' + horaFim : ''}`}
                                     className="absolute rounded-lg border-l-4 border-[#c9a84c] bg-amber-50/60 px-2 py-1 overflow-hidden block hover:bg-amber-100 transition-colors text-left w-full cursor-pointer"
                                     style={{ top: topPx + 'px', height: htPx + 'px', left: `calc(4rem + ${colEvt[evt.id]} * ((100% - 4rem - 0.5rem) / ${totalCols[evt.id]}))`, width: `calc(((100% - 4rem - 0.5rem) / ${totalCols[evt.id]}) - 4px)` }}>
                                     <div className="flex items-center justify-between gap-0.5">
                                       <div className="flex items-center gap-1">
                                         <span className="text-[9px] font-semibold text-[#c9a84c] truncate leading-tight">Disponível</span>
                                         <span className="text-[10px] text-[#4d7068] font-medium leading-none">{horaInicio} – {horaFim}</span>
                                       </div>
                                     </div>
                                     <div className="flex flex-col items-start gap-1 mt-1">
                                       <span className="text-[10px] font-medium">{modalidade || '-'}</span>
                                       <span className="text-[10px]">{estudioNome || '-'}</span>
                                     </div>
                                   </button>
                                 );
                               }

                                return (
                                  <Link key={evt.id} to="/dashboard/coaching"
                                    data-tipo="disponibilidade"
                                    data-professor={professorId}
                                    data-modalidade={modalidade}
                                    title={`${modalidade ? modalidade + ' · ' : ''}${estudioNome ? estudioNome + ' · ' : ''}${professorNome}${horaInicio ? '\n' + horaInicio + ' – ' + horaFim : ''}`}
                                    className="absolute rounded-lg border-l-4 border-[#c9a84c] bg-amber-50/60 px-2 py-1 overflow-hidden block hover:bg-amber-100 transition-colors"
                                    style={{ top: topPx + 'px', height: htPx + 'px', left: `calc(4rem + ${colEvt[evt.id]} * ((100% - 4rem - 0.5rem) / ${totalCols[evt.id]}))`, width: `calc(((100% - 4rem - 0.5rem) / ${totalCols[evt.id]}) - 4px)` }}>
                                    <div className="flex items-center justify-between gap-0.5">
                                      <div className="flex items-center gap-1">
                                        <span className="text-[9px] font-semibold text-[#c9a84c] truncate leading-tight">Disponível</span>
                                        <span className="text-[10px] text-[#4d7068] font-medium leading-none">{horaInicio} – {horaFim}</span>
                                      </div>
                                    </div>
                                    <div className="flex flex-col items-start gap-1 mt-1">
                                      <span className="text-[10px] font-medium">{modalidade || '-'}</span>
                                      <span className="text-[10px]">{estudioNome || '-'}</span>
                                      <span className="text-[10px]">{professorNome || '-'}</span>
                                    </div>
                                  </Link>
                                );
                            }
                          });
                        })()}
                      </div>
                    );
                  })()}
                </div>

                <div className="px-5 py-3 border-t border-[#0d6b5e]/8">
                  <Link to="/dashboard/coaching"
                    className="flex items-center justify-center gap-1.5 text-sm text-[#0d6b5e] hover:text-[#065147] transition-colors"
                    style={{ fontWeight: 500 }}>
                    Ver tudo em Coachings <ChevronRight className="w-4 h-4" />
                  </Link>
                </div>
              </>
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
                          <DateWarningIcon data={a.data} />
                          <div className="flex-1 min-w-0">
                            <p className="text-sm text-[#0a1a17] truncate" style={{ fontWeight: 500 }}>
                              {activeRole === 'PROFESSOR' ? a.alunoNome : (activeRole === 'ENCARREGADO' ? ((a.alunoNome || a.participantes?.map((p: any) => p.alunoNome).filter(Boolean).join(', ') || 'Aluno') + ' · ' + a.professorNome) : a.professorNome)}
                            </p>
                            <p className="text-xs text-[#4d7068]">{formatHora(a.horaInicio)} · {a.modalidade}</p>
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

      </div>

      {showPrintModal && (
        <PrintCoachingModal
          currentUser={user}
          onClose={() => setShowPrintModal(false)}
        />
      )}

      {/* Modal Solicitar Coaching (disponibilidades professores) */}
      {showSolicitarModal && solicitarPrefill && (
        <div className="fixed inset-0 z-50 flex items-start justify-center pt-10 pb-10 bg-black/40 overflow-y-auto"
          onClick={() => { setShowSolicitarModal(false); setSolicitarPrefill(undefined); setSubmitError(null); }}>
          <div className="relative w-11/12 max-w-7xl"
            onClick={e => e.stopPropagation()}>
            <button type="button" onClick={() => { setShowSolicitarModal(false); setSolicitarPrefill(undefined); setSubmitError(null); }}
              className="absolute top-3 right-3 z-10 p-1 rounded-full hover:bg-black/5 transition-colors">
              <X className="w-5 h-5 text-[#4d7068]" />
            </button>
            <NovaSessaoForm
              onSuccess={async (novaAula: PedidoAula) => {
                try {
                  const dispId = solicitarPrefill?.disponibilidadeId ? parseInt(solicitarPrefill.disponibilidadeId) : undefined;
                  const profId = solicitarPrefill?.professorId ? parseInt(solicitarPrefill.professorId) : undefined;
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
                  // recarregar aulas do encarregado para refletir o novo pedido
                  try {
                    const res = await api.getEncarregadoAulas();
                    if (res.success && res.data) setAulas(res.data);
                  } catch {}
                } catch (error: any) {
                  toast.error(error.message || 'Erro ao criar coaching. Tente novamente.');
                  setSubmitError(error.message || 'Erro ao criar coaching. Tente novamente.');
                  return;
                }
                setShowSolicitarModal(false);
                setSolicitarPrefill(undefined);
                setSubmitError(null);
              }}
              onCancel={() => { setShowSolicitarModal(false); setSolicitarPrefill(undefined); setSubmitError(null); }}
              aulasExistentes={aulas}
            prefill={solicitarPrefill}
            submitError={submitError}
            onClearError={() => setSubmitError(null)}
          />
        </div>
      </div>
      )}

      {/* Modal detalhes coaching (ENCARREGADO) */}
      {selectedAulaForModal && (
        <div className="fixed inset-0 z-50 flex items-start justify-center pt-16 pb-10 bg-black/40 overflow-y-auto"
          onClick={() => setSelectedAulaForModal(null)}>
          <div className="relative w-full max-w-2xl mx-4 bg-white rounded-2xl shadow-xl"
            onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between px-6 py-4 border-b border-[#0d6b5e]/8">
              <h3 className="text-base text-[#0a1a17]" style={{ fontWeight: 600 }}>
                Detalhes do Coaching
              </h3>
              <button type="button" onClick={() => setSelectedAulaForModal(null)}
                className="p-1 rounded-full hover:bg-[#f4f9f8] transition-colors">
                <X className="w-5 h-5 text-[#4d7068]" />
              </button>
            </div>

            <div className="p-6">
              <div className="flex items-center gap-2 flex-wrap mb-4">
                <h4 className="text-lg text-[#0a1a17]">
                  {selectedAulaForModal.alunoNome || 'Coaching'}
                </h4>
                {(() => {
                  const st = STATUS_CFG[selectedAulaForModal.status];
                  if (!st) return null;
                  return (
                    <span className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-sm ${st.bg} ${st.text}`}>
                      <span className={`w-2 h-2 rounded-full ${st.dot}`} />
                      {st.label}
                    </span>
                  );
                })()}
              </div>

              {selectedAulaForModal.status === 'REJEITADA' && selectedAulaForModal.motivoRejeicao && (
                <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
                  <p className="text-xs text-red-700 font-medium mb-1">Motivo da rejeição</p>
                  <p className="text-sm text-red-800">{selectedAulaForModal.motivoRejeicao}</p>
                </div>
              )}

              <div className="grid grid-cols-2 gap-4 text-sm text-[#4d7068]">
                <div className="flex items-center gap-2">
                  <User className="w-4 h-4 text-[#0d6b5e] shrink-0" />
                  <span>Aluno: <span className="text-[#0a1a17]">{getAlunoNome(selectedAulaForModal)}</span></span>
                </div>
                <div className="flex items-center gap-2">
                  <UserPlus className="w-4 h-4 text-[#0d6b5e] shrink-0" />
                  <span>Prof.: <span className="text-[#0a1a17]">{selectedAulaForModal.professorNome}</span></span>
                </div>
                <div className="flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-[#0d6b5e] shrink-0" />
                  <span>{formatDate(selectedAulaForModal.data)}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Clock className="w-4 h-4 text-[#0d6b5e] shrink-0" />
                  <span>{formatHora(selectedAulaForModal.horaInicio)} – {formatHora(selectedAulaForModal.horaFim || selectedAulaForModal.horaInicio)}</span>
                </div>
                {selectedAulaForModal.estudioNome && (
                  <div className="flex items-center gap-2">
                    <MapPin className="w-4 h-4 text-[#0d6b5e] shrink-0" />
                    <span>{selectedAulaForModal.estudioNome}</span>
                  </div>
                )}
                {selectedAulaForModal.modalidade && (
                  <div className="flex items-center gap-2">
                    <BookOpen className="w-4 h-4 text-[#0d6b5e] shrink-0" />
                    <span>{selectedAulaForModal.modalidade}</span>
                  </div>
                )}
                {selectedAulaForModal.duracao && (
                  <div className="flex items-center gap-2">
                    <Clock className="w-4 h-4 text-[#0d6b5e] shrink-0" />
                    <span>{selectedAulaForModal.duracao} min</span>
                  </div>
                )}
              </div>

              {activeRole === 'ENCARREGADO' && selectedAulaForModal.sugestaoestado === 'AGUARDA_EE' && (
                <div className="mt-6 pt-5 border-t border-[#0d6b5e]/8">
                  <p className="text-xs text-orange-700 bg-orange-50 px-3 py-2 rounded-lg border border-orange-200 mb-3">
                    Nova data proposta: {selectedAulaForModal.novadata || selectedAulaForModal.novaData}
                  </p>
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleResponderSugestaoEE(selectedAulaForModal.id, true)}
                      className="flex items-center gap-1.5 bg-[#0d6b5e] text-white px-4 py-2 rounded-lg hover:bg-[#065147] transition-colors text-sm flex-1 justify-center">
                      <CheckCircle className="w-4 h-4" />
                      Aceitar
                    </button>
                    <button
                      onClick={() => handleResponderSugestaoEE(selectedAulaForModal.id, false)}
                      className="flex items-center gap-1.5 bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 transition-colors text-sm flex-1 justify-center">
                      <XCircle className="w-4 h-4" />
                      Recusar
                    </button>
                  </div>
                </div>
              )}

              {activeRole === 'ENCARREGADO' && selectedAulaForModal.sugestaoestado === 'AGUARDA_DIRECAO' && (
                <div className="mt-6 pt-5 border-t border-[#0d6b5e]/8">
                  <p className="text-xs text-amber-700 bg-amber-50 px-3 py-2 rounded-lg border border-amber-200 flex items-center gap-2">
                    <CalendarOff className="w-4 h-4 shrink-0" />
                    Remarcação a aguardar resposta da direção.
                  </p>
                </div>
              )}

              {activeRole === 'ENCARREGADO' && selectedAulaForModal.sugestaoestado === 'AGUARDA_PROFESSOR' && (
                <div className="mt-6 pt-5 border-t border-[#0d6b5e]/8">
                  <p className="text-xs text-amber-700 bg-amber-50 px-3 py-2 rounded-lg border border-amber-200 flex items-center gap-2">
                    <CalendarOff className="w-4 h-4 shrink-0" />
                    Remarcação a aguardar resposta do professor.
                  </p>
                </div>
              )}

              {activeRole === 'ENCARREGADO' && !selectedAulaForModal.sugestaoestado && (selectedAulaForModal.status === 'PENDENTE' || selectedAulaForModal.status === 'CONFIRMADA') && (
                <div className="mt-6 pt-5 border-t border-[#0d6b5e]/8">
                  <button
                    onClick={async () => {
                      if (!confirm('Tem a certeza que deseja cancelar a sua participação neste coaching?')) return;
                      try {
                        await api.cancelarParticipacaoAula(parseInt(selectedAulaForModal.id));
                        toast.success('Participação cancelada com sucesso.');
                        const res = await api.getEncarregadoAulas();
                        if (res.success && res.data) setAulas(res.data);
                        setSelectedAulaForModal(null);
                      } catch (err: any) {
                        toast.error(err.message || 'Erro ao cancelar participação');
                      }
                    }}
                    className="flex items-center gap-1.5 bg-red-100 text-red-700 px-4 py-2 rounded-lg hover:bg-red-200 transition-colors text-sm border border-red-200"
                  >
                    <XCircle className="w-4 h-4" />
                    Cancelar Participação
                  </button>
                </div>
              )}

              {activeRole === 'DIRECAO' && selectedAulaForModal.status === 'PENDENTE' && (
                <div className="mt-6 pt-5 border-t border-[#0d6b5e]/8 flex gap-2">
                  <button
                    onClick={() => handleAprovarAula(selectedAulaForModal.id)}
                    className="flex items-center gap-1.5 bg-[#0d6b5e] text-white px-4 py-2 rounded-lg hover:bg-[#065147] transition-colors text-sm flex-1 justify-center">
                    <CheckCircle className="w-4 h-4" />
                    Aprovar
                  </button>
                  <button
                    onClick={() => handleRejeitarAula(selectedAulaForModal.id)}
                    className="flex items-center gap-1.5 bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 transition-colors text-sm flex-1 justify-center">
                    <XCircle className="w-4 h-4" />
                    Rejeitar
                  </button>
                </div>
              )}

              {activeRole === 'DIRECAO' && selectedAulaForModal.status === 'CONFIRMADA' && !selectedAulaForModal.sugestaoestado && (
                <div className="mt-6 pt-5 border-t border-[#0d6b5e]/8 flex gap-2">
                  <button
                    onClick={async () => {
                      if (!confirm('Tem a certeza que deseja cancelar esta aula?')) return;
                      await handleCancelarAulaDirecao(selectedAulaForModal.id);
                    }}
                    className="flex items-center gap-1.5 bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 transition-colors text-sm flex-1 justify-center">
                    <XCircle className="w-4 h-4" />
                    Cancelar
                  </button>
                </div>
              )}

              {activeRole === 'DIRECAO' && selectedAulaForModal.sugestaoestado === 'AGUARDA_PROFESSOR' && (
                <div className="mt-6 pt-5 border-t border-[#0d6b5e]/8">
                  <p className="text-xs text-amber-700 bg-amber-50 px-3 py-2 rounded-lg border border-amber-200 flex items-center gap-2">
                    <CalendarOff className="w-4 h-4 shrink-0" />
                    Remarcação a aguardar resposta do professor.
                  </p>
                </div>
              )}

              {activeRole === 'DIRECAO' && selectedAulaForModal.sugestaoestado === 'AGUARDA_EE' && (
                <div className="mt-6 pt-5 border-t border-[#0d6b5e]/8">
                  <p className="text-xs text-blue-700 bg-blue-50 px-3 py-2 rounded-lg border border-blue-200 flex items-center gap-2">
                    <CalendarOff className="w-4 h-4 shrink-0" />
                    Remarcação a aguardar confirmação do encarregado de educação.
                  </p>
                </div>
              )}

              {activeRole === 'DIRECAO' && selectedAulaForModal.sugestaoestado === 'AGUARDA_DIRECAO' && (
                <div className="mt-6 pt-5 border-t border-[#0d6b5e]/8">
                  <p className="text-xs text-orange-700 bg-orange-50 px-3 py-2 rounded-lg border border-orange-200 mb-3">
                    {(selectedAulaForModal.novadata || selectedAulaForModal.novaData)
                      ? `Nova data proposta: ${selectedAulaForModal.novadata || selectedAulaForModal.novaData}`
                      : 'Professor pediu remarcação sem data específica.'}
                  </p>
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleResponderSugestaoDirecao(selectedAulaForModal.id, true)}
                      className="flex items-center gap-1.5 bg-[#0d6b5e] text-white px-4 py-2 rounded-lg hover:bg-[#065147] transition-colors text-sm flex-1 justify-center">
                      <CheckCircle className="w-4 h-4" />
                      Aceitar
                    </button>
                    <button
                      onClick={() => handleResponderSugestaoDirecao(selectedAulaForModal.id, false)}
                      className="flex items-center gap-1.5 bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 transition-colors text-sm flex-1 justify-center">
                      <XCircle className="w-4 h-4" />
                      Rejeitar
                    </button>
                  </div>
                </div>
              )}

              {activeRole === 'PROFESSOR' && selectedAulaForModal.status === 'CONFIRMADA' && !selectedAulaForModal.sugestaoestado && (
                <div className="mt-6 pt-5 border-t border-[#0d6b5e]/8 space-y-2">
                  <button
                    onClick={() => handleConfirmarRealizacao(selectedAulaForModal.id)}
                    className="flex items-center gap-1.5 bg-[#0d6b5e] text-white px-4 py-2 rounded-lg hover:bg-[#065147] transition-colors text-sm w-full justify-center">
                    <CheckCircle className="w-4 h-4" />
                    Confirmar Realização
                  </button>
                  <div className="flex gap-2">
                    <button
                      onClick={() => setSugerirRemarcacaoModal(selectedAulaForModal.id)}
                      className="flex items-center gap-1.5 bg-orange-600 text-white px-4 py-2 rounded-lg hover:bg-orange-700 transition-colors text-sm flex-1 justify-center">
                      <CalendarOff className="w-4 h-4" />
                      Sugerir Data
                    </button>
                    <button
                      onClick={() => handlePedirRemarcacao(selectedAulaForModal.id)}
                      className="flex items-center gap-1.5 bg-orange-500 text-white px-4 py-2 rounded-lg hover:bg-orange-600 transition-colors text-sm flex-1 justify-center">
                      <CalendarOff className="w-4 h-4" />
                      Pedir Remarcação
                    </button>
                  </div>
                </div>
              )}

              {activeRole === 'PROFESSOR' && selectedAulaForModal.sugestaoestado === 'AGUARDA_PROFESSOR' && (
                <div className="mt-6 pt-5 border-t border-[#0d6b5e]/8">
                  <p className="text-xs text-orange-700 bg-orange-50 px-3 py-2 rounded-lg border border-orange-200 mb-3">
                    Nova data proposta: {selectedAulaForModal.novadata || selectedAulaForModal.novaData}
                  </p>
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleResponderSugestaoProfessor(selectedAulaForModal.id, true)}
                      className="flex items-center gap-1.5 bg-[#0d6b5e] text-white px-4 py-2 rounded-lg hover:bg-[#065147] transition-colors text-sm flex-1 justify-center">
                      <CheckCircle className="w-4 h-4" />
                      Aceitar
                    </button>
                    <button
                      onClick={() => handleResponderSugestaoProfessor(selectedAulaForModal.id, false)}
                      className="flex items-center gap-1.5 bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 transition-colors text-sm flex-1 justify-center">
                      <XCircle className="w-4 h-4" />
                      Recusar
                    </button>
                  </div>
                </div>
              )}

              {activeRole === 'PROFESSOR' && selectedAulaForModal.sugestaoestado === 'AGUARDA_DIRECAO' && (
                <div className="mt-6 pt-5 border-t border-[#0d6b5e]/8">
                  <p className="text-xs text-amber-700 bg-amber-50 px-3 py-2 rounded-lg border border-amber-200 flex items-center gap-2">
                    <CalendarOff className="w-4 h-4 shrink-0" />
                    Pedido de remarcação enviado à direção. Aguarda resposta.
                  </p>
                </div>
              )}

              {activeRole === 'PROFESSOR' && selectedAulaForModal.sugestaoestado === 'AGUARDA_EE' && (
                <div className="mt-6 pt-5 border-t border-[#0d6b5e]/8">
                  <p className="text-xs text-blue-700 bg-blue-50 px-3 py-2 rounded-lg border border-blue-200 flex items-center gap-2">
                    <CalendarOff className="w-4 h-4 shrink-0" />
                    Remarcação a aguardar confirmação do encarregado de educação.
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Modal Sugerir Data (Professor) */}
      {sugerirRemarcacaoModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40"
          onClick={() => { setSugerirRemarcacaoModal(null); setNovaDataRemarcacao(''); }}>
          <div className="bg-white rounded-2xl shadow-xl p-6 w-full max-w-sm mx-4"
            onClick={e => e.stopPropagation()}>
            <h3 className="text-base text-[#0a1a17] mb-4" style={{ fontWeight: 600 }}>Sugerir Nova Data</h3>
            <p className="text-sm text-[#4d7068] mb-4">
              Selecione uma nova data para a aula. A direção receberá a sua sugestão e irá analisar.
            </p>
            <input
              type="datetime-local"
              value={novaDataRemarcacao}
              onChange={e => setNovaDataRemarcacao(e.target.value)}
              min={new Date().toISOString().slice(0, 16)}
              className="w-full px-3 py-2 border border-[#0d6b5e]/20 rounded-lg bg-[#f4f9f8] text-[#0a1a17] focus:outline-none focus:border-[#0d6b5e] mb-4"
            />
            <div className="flex gap-2">
              <button onClick={handleSugerirRemarcacao}
                className="flex-1 bg-orange-600 text-white px-4 py-2 rounded-lg hover:bg-orange-700 transition-colors text-sm">
                Enviar Sugestão
              </button>
              <button onClick={() => { setSugerirRemarcacaoModal(null); setNovaDataRemarcacao(''); }}
                className="flex-1 bg-gray-100 text-[#4d7068] px-4 py-2 rounded-lg hover:bg-gray-200 transition-colors text-sm">
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Editar / Eliminar Disponibilidade (Professor) */}
      {selectedDisponibilidadeForModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40"
          onClick={() => { setSelectedDisponibilidadeForModal(null); setEditDisponibilidadeMode(false); }}>
          <div className="bg-white rounded-2xl shadow-xl p-6 w-full max-w-sm mx-4"
            onClick={e => e.stopPropagation()}>
            <h3 className="text-base text-[#0a1a17] mb-4" style={{ fontWeight: 600 }}>
              {editDisponibilidadeMode ? 'Editar Disponibilidade' : 'Disponibilidade'}
            </h3>

            {!editDisponibilidadeMode ? (
              <>
                <div className="space-y-2 text-sm text-[#4d7068] mb-6">
                  <div className="flex items-center gap-2">
                    <Calendar className="w-4 h-4 text-[#0d6b5e] shrink-0" />
                    <span className="text-[#0a1a17]">{formatDate(selectedDisponibilidadeForModal.data)}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Clock className="w-4 h-4 text-[#0d6b5e] shrink-0" />
                    <span className="text-[#0a1a17]">
                      {formatHora(selectedDisponibilidadeForModal.horaInicio || selectedDisponibilidadeForModal.horainicio)} – {formatHora(selectedDisponibilidadeForModal.horaFim || selectedDisponibilidadeForModal.horafim)}
                    </span>
                  </div>
                  {selectedDisponibilidadeForModal.modalidade && (
                    <div className="flex items-center gap-2">
                      <BookOpen className="w-4 h-4 text-[#0d6b5e] shrink-0" />
                      <span className="text-[#0a1a17]">{selectedDisponibilidadeForModal.modalidade}</span>
                    </div>
                  )}
                  {selectedDisponibilidadeForModal.professorNome && (
                    <div className="flex items-center gap-2">
                      <User className="w-4 h-4 text-[#0d6b5e] shrink-0" />
                      <span className="text-[#0a1a17]">{selectedDisponibilidadeForModal.professorNome}</span>
                    </div>
                  )}
                </div>
                {activeRole === 'PROFESSOR' ? (
                  <div className="flex gap-2">
                    <button onClick={() => setEditDisponibilidadeMode(true)}
                      className="flex-1 bg-[#0d6b5e] text-white px-4 py-2 rounded-lg hover:bg-[#065147] transition-colors text-sm">
                      Editar
                    </button>
                    <button onClick={handleDeleteDisponibilidade}
                      className="flex-1 bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 transition-colors text-sm">
                      Eliminar
                    </button>
                  </div>
                ) : (
                  <button onClick={() => { setSelectedDisponibilidadeForModal(null); setEditDisponibilidadeMode(false); }}
                    className="w-full bg-gray-100 text-[#4d7068] px-4 py-2 rounded-lg hover:bg-gray-200 transition-colors text-sm">
                    Fechar
                  </button>
                )}
              </>
            ) : (
              <div className="space-y-4">
                <div>
                  <label className="block text-sm text-[#4d7068] mb-1">Data</label>
                  <p className="text-sm text-[#0a1a17] px-3 py-2 bg-[#f4f9f8] rounded-lg">{formatDate(selectedDisponibilidadeForModal.data)}</p>
                </div>
                <div className="flex gap-2">
                  <div className="flex-1">
                    <label className="block text-sm text-[#4d7068] mb-1">Hora Início</label>
                    <input
                      type="time"
                      value={editDisponibilidadeForm.horainicio}
                      onChange={e => setEditDisponibilidadeForm(f => ({ ...f, horainicio: e.target.value }))}
                      className="w-full px-3 py-2 border border-[#0d6b5e]/20 rounded-lg bg-[#f4f9f8] text-[#0a1a17] focus:outline-none focus:border-[#0d6b5e]"
                      required
                    />
                  </div>
                  <div className="flex-1">
                    <label className="block text-sm text-[#4d7068] mb-1">Hora Fim</label>
                    <input
                      type="time"
                      value={editDisponibilidadeForm.horafim}
                      onChange={e => setEditDisponibilidadeForm(f => ({ ...f, horafim: e.target.value }))}
                      className="w-full px-3 py-2 border border-[#0d6b5e]/20 rounded-lg bg-[#f4f9f8] text-[#0a1a17] focus:outline-none focus:border-[#0d6b5e]"
                      required
                    />
                  </div>
                </div>
                <div className="flex gap-2 pt-2">
                  <button onClick={handleUpdateDisponibilidade}
                    className="flex-1 bg-[#0d6b5e] text-white px-4 py-2 rounded-lg hover:bg-[#065147] transition-colors text-sm">
                    Guardar
                  </button>
                  <button onClick={() => setEditDisponibilidadeMode(false)}
                    className="flex-1 bg-gray-100 text-[#4d7068] px-4 py-2 rounded-lg hover:bg-gray-200 transition-colors text-sm">
                    Voltar
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Modal Nova Disponibilidade (Professor) */}
      {showNovaDispoModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40"
          onClick={() => { setShowNovaDispoModal(false); setAlertaDataDispo(null); }}>
          <div className="bg-white rounded-2xl shadow-xl p-6 w-full max-w-sm mx-4"
            onClick={e => e.stopPropagation()}>
            <h3 className="text-base text-[#0a1a17] mb-4" style={{ fontWeight: 600 }}>Nova Disponibilidade</h3>
            <form onSubmit={handleNovaDisponibilidade} className="space-y-4">
              <div>
                <label className="block text-sm text-[#4d7068] mb-1">Modalidade *</label>
                <select
                  value={novaDispoForm.modalidadesprofessoridmodalidadeprofessor}
                  onChange={e => setNovaDispoForm(f => ({ ...f, modalidadesprofessoridmodalidadeprofessor: e.target.value }))}
                  className="w-full px-3 py-2 border border-[#0d6b5e]/20 rounded-lg bg-[#f4f9f8] text-[#0a1a17] focus:outline-none focus:border-[#0d6b5e]"
                  required
                >
                  <option value="">Selecionar modalidade...</option>
                  {modalidadesProfessor.map((mod: any) => (
                    <option key={mod.idmodalidadeprofessor || mod.id} value={mod.idmodalidadeprofessor || mod.id}>
                      {mod.modalidade_nome || mod.modalidade?.designacao || mod.designacao || 'Modalidade'}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm text-[#4d7068] mb-1">Data *</label>
                <input
                  type="date"
                  value={novaDispoForm.data}
                  onChange={e => {
                    setNovaDispoForm(f => ({ ...f, data: e.target.value }));
                    setAlertaDataDispo(isDiaWarning(e.target.value));
                  }}
                  min={new Date().toISOString().split('T')[0]}
                  className="w-full px-3 py-2 border border-[#0d6b5e]/20 rounded-lg bg-[#f4f9f8] text-[#0a1a17] focus:outline-none focus:border-[#0d6b5e]"
                  required
                />
                {alertaDataDispo?.isWarning && (
                  <p className="text-xs text-red-500 mt-1 flex items-center gap-1">⚠️ {alertaDataDispo.mensagem}</p>
                )}
              </div>
              <div className="flex gap-2">
                <div className="flex-1">
                  <label className="block text-sm text-[#4d7068] mb-1">Hora de Início *</label>
                  <select
                    value={novaDispoForm.horainicio}
                    onChange={e => setNovaDispoForm(f => ({ ...f, horainicio: e.target.value, horafim: '' }))}
                    className="w-full px-3 py-2 border border-[#0d6b5e]/20 rounded-lg bg-[#f4f9f8] text-[#0a1a17] focus:outline-none focus:border-[#0d6b5e]"
                    required
                  >
                    <option value="">Selecionar hora...</option>
                    {HORARIOS.filter(h => {
                      if (!novaDispoForm.data) return true;
                      const today = new Date().toISOString().split('T')[0];
                      if (novaDispoForm.data !== today) return true;
                      const now = new Date();
                      const [hh, mm] = h.split(':').map(Number);
                      return hh * 60 + mm > now.getHours() * 60 + now.getMinutes();
                    }).map(h => (
                      <option key={h} value={h}>{h}</option>
                    ))}
                  </select>
                </div>
                <div className="flex-1">
                  <label className="block text-sm text-[#4d7068] mb-1">Hora de Fim *</label>
                  <select
                    value={novaDispoForm.horafim}
                    onChange={e => setNovaDispoForm(f => ({ ...f, horafim: e.target.value }))}
                    className="w-full px-3 py-2 border border-[#0d6b5e]/20 rounded-lg bg-[#f4f9f8] text-[#0a1a17] focus:outline-none focus:border-[#0d6b5e]"
                    required
                  >
                    <option value="">Selecionar hora...</option>
                    {HORARIOS.filter(h => h > novaDispoForm.horainicio).map(h => (
                      <option key={h} value={h}>{h}</option>
                    ))}
                  </select>
                </div>
              </div>

              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={novaDispoForm.recorrente}
                  onChange={e => setNovaDispoForm(f => ({ ...f, recorrente: e.target.checked }))}
                  className="w-4 h-4 rounded border-[#0d6b5e]/30 text-[#0d6b5e] focus:ring-[#0d6b5e]/30"
                />
                <span className="text-sm text-[#4d7068]">Repetir semanalmente</span>
              </label>

              {novaDispoForm.recorrente && (
                <div className="flex gap-2">
                  <div className="flex-1">
                    <label className="block text-sm text-[#4d7068] mb-1">Dias da Semana *</label>
                    <div className="grid grid-cols-4 gap-1">
                      {DIAS_SEMANA.map((label: string, i: number) => (
                        <label key={i} className="flex items-center gap-1 cursor-pointer text-xs">
                          <input
                            type="checkbox"
                            checked={novaDispoForm.diadasemana.includes(i)}
                            onChange={e => {
                              const updated = e.target.checked
                                ? [...novaDispoForm.diadasemana, i]
                                : novaDispoForm.diadasemana.filter(d => d !== i);
                              setNovaDispoForm(f => ({ ...f, diadasemana: updated }));
                            }}
                            className="w-3 h-3 rounded border-[#0d6b5e]/30 text-[#0d6b5e] focus:ring-[#0d6b5e]/30"
                          />
                          {label}
                        </label>
                      ))}
                    </div>
                  </div>
                  <div className="flex-1">
                    <label className="block text-sm text-[#4d7068] mb-1">Até *</label>
                    <input
                      type="date"
                      value={novaDispoForm.dataFim}
                      onChange={e => setNovaDispoForm(f => ({ ...f, dataFim: e.target.value }))}
                      min={novaDispoForm.data || new Date().toISOString().split('T')[0]}
                      className="w-full px-3 py-2 border border-[#0d6b5e]/20 rounded-lg bg-[#f4f9f8] text-[#0a1a17] focus:outline-none focus:border-[#0d6b5e]"
                      required
                    />
                  </div>
                </div>
              )}

              <div className="flex gap-2 pt-2">
                <button type="submit"
                  className="flex-1 bg-[#0d6b5e] text-white px-4 py-2 rounded-lg hover:bg-[#065147] transition-colors text-sm">
                  Criar
                </button>
                <button type="button" onClick={() => { setShowNovaDispoModal(false); setAlertaDataDispo(null); }}
                  className="flex-1 bg-gray-100 text-[#4d7068] px-4 py-2 rounded-lg hover:bg-gray-200 transition-colors text-sm">
                  Cancelar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <DashboardCoachingModal
        open={showCoachingModal}
        initialTab={coachingModalTab}
        aulas={aulas}
        estudios={salas}
        onClose={() => setShowCoachingModal(false)}
        onRefresh={refreshAulas}
      />
      {showNovaOcupacaoModal && (
        <NovaOcupacaoModal
          salas={salas}
          data={`${calYear}-${String(calMonth + 1).padStart(2, '0')}-${String(diaSelected).padStart(2, '0')}`}
          onClose={() => setShowNovaOcupacaoModal(false)}
          onSuccess={refreshAulas}
        />
      )}
      <DashboardGruposModal open={showGruposModal} onClose={() => setShowGruposModal(false)} />
      <DashboardEncarregadoCoachingModal
        open={showEncarregadoCoachingModal}
        onClose={() => setShowEncarregadoCoachingModal(false)}
        onRefresh={refreshAulas}
        aulas={aulas}
        salas={salas}
      />
      <Toaster position="top-right" />
    </div>
  );
}
