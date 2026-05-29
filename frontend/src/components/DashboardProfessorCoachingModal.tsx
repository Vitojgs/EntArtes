import { useState, useEffect } from 'react';
import {
  X, Calendar, Clock, User, MapPin, BookOpen, ChevronRight, Filter, Music2
} from 'lucide-react';
import api from '../services/api';
import { toast } from 'sonner';
import { AulaStatus } from '../types';

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

const MODALIDADE_COLORS: Record<string, { bg: string; text: string; dot: string }> = {
  'Ballet':              { bg: 'bg-pink-100',    text: 'text-pink-800',    dot: 'bg-pink-400' },
  'Ballet Clássico':     { bg: 'bg-pink-100',    text: 'text-pink-800',    dot: 'bg-pink-400' },
  'Hip-Hop':             { bg: 'bg-purple-100',  text: 'text-purple-800',  dot: 'bg-purple-500' },
  'Contemporâneo':       { bg: 'bg-teal-100',    text: 'text-teal-800',    dot: 'bg-teal-500' },
  'Dança Contemporânea': { bg: 'bg-teal-100',    text: 'text-teal-800',    dot: 'bg-teal-500' },
  'Jazz':                { bg: 'bg-amber-100',   text: 'text-amber-800',   dot: 'bg-amber-400' },
  'Dança Urbana':        { bg: 'bg-indigo-100',  text: 'text-indigo-800',  dot: 'bg-indigo-500' },
  'Teatro Dança':        { bg: 'bg-orange-100',  text: 'text-orange-800',  dot: 'bg-orange-500' },
};

function getModalidadeStyle(modalidade: string) {
  return MODALIDADE_COLORS[modalidade] ?? { bg: 'bg-gray-100', text: 'text-gray-700', dot: 'bg-gray-400' };
}

interface DashboardProfessorCoachingModalProps {
  open: boolean;
  onClose: () => void;
}

export function DashboardProfessorCoachingModal({ open, onClose }: DashboardProfessorCoachingModalProps) {
  const [activeTab, setActiveTab] = useState<'agenda' | 'historico'>('agenda');
  const [aulas, setAulas] = useState<any[]>([]);
  const [estudios, setEstudios] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filtroStatus, setFiltroStatus] = useState<AulaStatus | 'TODAS'>('TODAS');
  const [filtroModalidade, setFiltroModalidade] = useState<string>('TODAS');
  const [selectedAula, setSelectedAula] = useState<any | null>(null);

  useEffect(() => {
    if (!open) return;
    const fetchData = async () => {
      setLoading(true);
      try {
        const [aulasRes, salasRes] = await Promise.all([
          api.getProfessorAulas(),
          api.getSalas(),
        ]);
        if (aulasRes.success && aulasRes.data) setAulas(aulasRes.data);
        if (salasRes.success && salasRes.data) setEstudios(salasRes.data);
      } catch (error) {
        console.error('Erro ao carregar coachings:', error);
        toast.error('Erro ao carregar coachings');
      } finally {
        setLoading(false);
      }
    };
    fetchData();
    setActiveTab('agenda');
    setSelectedAula(null);
  }, [open]);

  const todasModalidades = Array.from(new Set(aulas.map(a => a.modalidade))).sort();

  const aulasFiltradas = aulas.filter((a: any) => {
    if (activeTab === 'historico' && a.status !== 'REALIZADA') return false;
    if (activeTab === 'agenda' && a.status === 'REALIZADA') return false;
    if (filtroStatus !== 'TODAS' && a.status !== filtroStatus) return false;
    if (filtroModalidade !== 'TODAS' && a.modalidade !== filtroModalidade) return false;
    return true;
  }).sort((a: any, b: any) => new Date(a.data).getTime() - new Date(b.data).getTime());

  if (!open) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white w-full max-w-5xl max-h-[90vh] overflow-hidden rounded-2xl shadow-xl flex flex-col mx-4">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#0d6b5e]/8 shrink-0">
          <h2 className="text-2xl font-bold text-[#0a1b17]">Gestão de Coachings</h2>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-xl transition-colors">
            <X className="w-5 h-5 text-[#4d7068]" />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex items-center gap-2 px-6 pt-4 shrink-0">
          {(['agenda', 'historico'] as const).map(tab => (
            <button key={tab}
              onClick={() => { setActiveTab(tab); setSelectedAula(null); }}
              className={`px-5 py-2 rounded-lg transition-colors text-sm ${
                activeTab === tab
                  ? 'bg-[#c9a84c] text-[#0a1a17] font-semibold'
                  : 'bg-gray-100 text-[#4d7068] hover:bg-gray-200'
              }`}
            >
              {tab === 'agenda' ? 'Agenda' : 'Histórico'}
            </button>
          ))}
        </div>

        {/* Filters */}
        <div className="px-6 py-3 shrink-0 border-b border-[#0d6b5e]/8">
          <div className="flex items-center gap-4 flex-wrap">
            <div className="flex items-center gap-1.5 text-sm text-[#4d7068]">
              <Filter className="w-4 h-4" /> Status:
            </div>
            {(['TODAS', 'PENDENTE', 'CONFIRMADA', 'REALIZADA'] as const).map(s => {
              if (activeTab === 'historico' && s !== 'TODAS' && s !== 'REALIZADA') return null;
              return (
                <button key={s}
                  onClick={() => setFiltroStatus(s)}
                  className={`px-3 py-1 rounded-lg text-xs transition-colors ${
                    filtroStatus === s
                      ? 'bg-[#c9a84c] text-[#0a1a17] font-semibold'
                      : 'bg-gray-100 text-[#4d7068] hover:bg-gray-200'
                  }`}
                >
                  {s === 'TODAS' ? 'Todas' : s.charAt(0) + s.slice(1).toLowerCase()}
                </button>
              );
            })}
            <div className="flex items-center gap-1.5 text-sm text-[#4d7068] ml-2">
              <Music2 className="w-4 h-4" /> Modalidade:
            </div>
            <select value={filtroModalidade} onChange={e => setFiltroModalidade(e.target.value)}
              className="px-3 py-1 rounded-lg text-xs bg-gray-100 text-[#0a1a17] border border-gray-200 focus:outline-none focus:border-[#c9a84c]">
              <option value="TODAS">Todas</option>
              {todasModalidades.map(m => (
                <option key={m} value={m}>{m}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {loading ? (
            <div className="flex items-center justify-center py-20 text-[#4d7068]">
              <Calendar className="w-6 h-6 animate-pulse mr-2" />
              A carregar...
            </div>
          ) : aulasFiltradas.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-center">
              <Calendar className="w-16 h-16 text-[#0d6b5e]/20 mx-auto mb-4" />
              <p className="text-[#4d7068] mb-1">
                {activeTab === 'agenda' ? 'Nenhum coaching agendado' : 'Nenhum coaching realizado'}
              </p>
              <p className="text-sm text-[#4d7068]/60">
                {activeTab === 'agenda'
                  ? 'As suas aulas agendadas aparecerão aqui'
                  : 'O histórico de aulas lecionadas aparecerá aqui'}
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {aulasFiltradas.map((aula: any) => {
                const style = getModalidadeStyle(aula.modalidade);
                return (
                  <div key={aula.id}
                    className="bg-white rounded-2xl border border-[#0d6b5e]/8 hover:shadow-md transition-shadow overflow-hidden"
                  >
                    {/* Card header */}
                    <div className="p-5">
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1 min-w-0">
                          {/* Badges row */}
                          <div className="flex items-center gap-2 flex-wrap mb-3">
                            <h3 className="text-lg font-semibold text-[#0a1a17]">
                              {aula.alunoNome || aula.modalidade || 'Coaching'}
                            </h3>
                            <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium ${STATUS_CFG[aula.status]?.bg || 'bg-gray-100'} ${STATUS_CFG[aula.status]?.text || 'text-gray-700'}`}>
                              <span className={`w-1.5 h-1.5 rounded-full ${STATUS_CFG[aula.status]?.dot || 'bg-gray-400'}`} />
                              {STATUS_CFG[aula.status]?.label || aula.status}
                            </span>
                            <span className={`inline-flex px-2 py-0.5 rounded text-xs font-medium ${style.bg} ${style.text}`}>
                              {aula.modalidade}
                            </span>
                          </div>

                          {/* Details grid */}
                          <div className="grid grid-cols-2 lg:grid-cols-3 gap-3 text-sm text-[#4d7068]">
                            <div className="flex items-center gap-2">
                              <User className="w-4 h-4 text-[#0d6b5e] shrink-0" />
                              <span className="truncate">
                                {aula.alunoNome || <span className="italic">Aluno</span>}
                              </span>
                            </div>
                            <div className="flex items-center gap-2">
                              <Calendar className="w-4 h-4 text-[#0d6b5e] shrink-0" />
                              <span>{formatDate(aula.data)}</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <Clock className="w-4 h-4 text-[#0d6b5e] shrink-0" />
                              <span>{formatHora(aula.horaInicio || aula.data)} – {formatHora(aula.horaFim || aula.data)}</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <MapPin className="w-4 h-4 text-[#0d6b5e] shrink-0" />
                              <span className="truncate">{aula.estudioNome || 'Por definir'}</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <BookOpen className="w-4 h-4 text-[#0d6b5e] shrink-0" />
                              <span className="truncate">{aula.modalidade || '-'}</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
