import { useState, useEffect } from 'react';
import {
  X, Calendar, Clock, User, MapPin, BookOpen, Filter, Music2,
  ChevronLeft, CheckCircle, XCircle, CalendarOff
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

function formatDataHoraInput(dateStr: string): string {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

interface DashboardProfessorCoachingModalProps {
  open: boolean;
  onClose: () => void;
}

export function DashboardProfessorCoachingModal({ open, onClose }: DashboardProfessorCoachingModalProps) {
  const [aulas, setAulas] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filtroStatus, setFiltroStatus] = useState<string>('TODAS');
  const [filtroModalidade, setFiltroModalidade] = useState<string>('TODAS');
  const [selectedAula, setSelectedAula] = useState<any | null>(null);
  const [confirmCancelId, setConfirmCancelId] = useState<string | null>(null);
  const [showSugerirData, setShowSugerirData] = useState<string | null>(null);
  const [novaDataInput, setNovaDataInput] = useState('');

  useEffect(() => {
    if (!open) return;
    const fetchData = async () => {
      setLoading(true);
      setSelectedAula(null);
      setConfirmCancelId(null);
      setShowSugerirData(null);
      setNovaDataInput('');
      setFiltroStatus('TODAS');
      setFiltroModalidade('TODAS');
      try {
        const res = await api.getProfessorAulas();
        if (res.success && res.data) setAulas(res.data);
      } catch (error) {
        console.error('Erro ao carregar coachings:', error);
        toast.error('Erro ao carregar coachings');
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [open]);

  const todasModalidades = Array.from(new Set(aulas.map((a: any) => a.modalidade))).sort();

  const aulasFiltradas = aulas.filter((a: any) => {
    if (filtroStatus !== 'TODAS' && a.status !== filtroStatus) return false;
    if (filtroModalidade !== 'TODAS' && a.modalidade !== filtroModalidade) return false;
    return true;
  }).sort((a: any, b: any) => new Date(b.data).getTime() - new Date(a.data).getTime());

  const handleConfirmarRealizacao = async (id: string) => {
    try {
      await api.confirmarRealizacaoAula(parseInt(id));
      setAulas((prev: any[]) => prev.map((a: any) => a.id === id ? { ...a, status: 'REALIZADA' } : a));
      setSelectedAula(null);
      toast.success('Coaching confirmado como realizado!');
    } catch (error: any) {
      toast.error(error.message || 'Erro ao confirmar realização');
    }
  };

  const handleCancelarAula = async (id: string) => {
    try {
      await api.cancelarAula(parseInt(id));
      setAulas((prev: any[]) => prev.map((a: any) => a.id === id ? { ...a, status: 'CANCELADA' } : a));
      setSelectedAula(null);
      setConfirmCancelId(null);
      toast.success('Aula cancelada com sucesso!');
    } catch (error: any) {
      toast.error(error.message || 'Erro ao cancelar aula');
    }
  };

  const handleSugerirData = async () => {
    if (!showSugerirData || !novaDataInput) {
      toast.error('Selecione uma nova data');
      return;
    }
    const agora = new Date();
    const dataHojeStr = agora.toISOString().split('T')[0];
    const dataInputStr = novaDataInput.split('T')[0];
    if (dataInputStr < dataHojeStr) {
      toast.error('A data não pode ser no passado');
      return;
    }
    if (dataInputStr === dataHojeStr) {
      const [horaH, horaM] = novaDataInput.split('T')[1].split(':').map(Number);
      const horaInput = horaH * 60 + horaM;
      const horaAtual = agora.getHours() * 60 + agora.getMinutes();
      if (horaInput <= horaAtual) {
        toast.error('A hora deve ser posterior à hora atual');
        return;
      }
    }
    try {
      const [dataPart, horaPart] = novaDataInput.split('T');
      const result = await api.sugerirNovaDataAula(Number(showSugerirData), dataPart, horaPart);
      if (result.success) {
        setAulas((prev: any[]) => prev.map((a: any) =>
          a.id === showSugerirData ? { ...a, sugestaoestado: 'AGUARDA_DIRECAO', novadata: novaDataInput } : a
        ));
        setShowSugerirData(null);
        setNovaDataInput('');
        setSelectedAula(null);
        toast.success('Sugestão de nova data enviada à direção.');
      }
    } catch (error: any) {
      toast.error(error.message || 'Erro ao sugerir nova data');
    }
  };

  const handlePedirRemarcacao = async (id: string) => {
    try {
      await api.pedirRemarcacao(Number(id));
      setAulas((prev: any[]) => prev.map((a: any) =>
        a.id === id ? { ...a, sugestaoestado: 'AGUARDA_DIRECAO', novadata: undefined } : a
      ));
      setSelectedAula(null);
      toast.success('Pedido de remarcação enviado à direção.');
    } catch (error: any) {
      toast.error(error.message || 'Erro ao pedir remarcação');
    }
  };

  const handleResponderSugestao = async (id: string, aceitar: boolean) => {
    try {
      await api.responderSugestaoProfessor(Number(id), aceitar);
      if (aceitar) {
        setAulas((prev: any[]) => prev.map((a: any) =>
          a.id === id ? { ...a, sugestaoestado: 'AGUARDA_EE' } : a
        ));
        toast.success('Sugestão aceite. A aguardar confirmação do encarregado.');
      } else {
        setAulas((prev: any[]) => prev.map((a: any) =>
          a.id === id ? { ...a, sugestaoestado: null } : a
        ));
        toast.info('Data recusada. Direção pode propor nova data.');
      }
      setSelectedAula(null);
    } catch (error: any) {
      toast.error(error.message || 'Erro ao responder à sugestão');
    }
  };

  const FILTER_STATUS = ['PENDENTE', 'CONFIRMADA', 'CANCELADA'];

  if (!open) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white w-full max-w-5xl max-h-[90vh] overflow-hidden rounded-2xl shadow-xl flex flex-col mx-4">

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#0d6b5e]/8 shrink-0">
          <div className="flex items-center gap-3">
            {selectedAula && (
              <button onClick={() => { setSelectedAula(null); setConfirmCancelId(null); }}
                className="p-1.5 hover:bg-gray-100 rounded-lg transition-colors">
                <ChevronLeft className="w-5 h-5 text-[#4d7068]" />
              </button>
            )}
            <h2 className="text-2xl font-bold text-[#0a1b17]">
              {selectedAula ? 'Detalhes do Coaching' : 'Gestão de Coachings'}
            </h2>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-xl transition-colors">
            <X className="w-5 h-5 text-[#4d7068]" />
          </button>
        </div>

        {!selectedAula && (
          <>
            {/* Filters */}
            <div className="px-6 py-3 shrink-0 border-b border-[#0d6b5e]/8">
              <div className="flex items-center gap-4 flex-wrap">
                <div className="flex items-center gap-1.5 text-sm text-[#4d7068]">
                  <Filter className="w-4 h-4" /> Status:
                </div>
                {(['TODAS', ...FILTER_STATUS] as const).map(s => (
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
                ))}
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

            {/* List */}
            <div className="flex-1 overflow-y-auto p-6">
              {loading ? (
                <div className="flex items-center justify-center py-20 text-[#4d7068]">
                  <Calendar className="w-6 h-6 animate-pulse mr-2" />
                  A carregar...
                </div>
              ) : aulasFiltradas.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-20 text-center">
                  <Calendar className="w-16 h-16 text-[#0d6b5e]/20 mx-auto mb-4" />
                  <p className="text-[#4d7068] mb-1">Nenhum coaching encontrado</p>
                  <p className="text-sm text-[#4d7068]/60">Tente ajustar os filtros</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {aulasFiltradas.map((aula: any) => {
                    const style = getModalidadeStyle(aula.modalidade);
                    return (
                      <button key={aula.id} type="button" onClick={() => { setSelectedAula(aula); setConfirmCancelId(null); }}
                        className="w-full text-left bg-white rounded-2xl border border-[#0d6b5e]/8 hover:shadow-md transition-shadow overflow-hidden"
                      >
                        <div className="p-5">
                          <div className="flex items-start justify-between gap-4">
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 flex-wrap mb-3">
                                <h3 className="text-lg font-semibold text-[#0a1a17]">
                                  {aula.alunoNome || 'Coaching'}
                                </h3>
                                <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium ${STATUS_CFG[aula.status]?.bg || 'bg-gray-100'} ${STATUS_CFG[aula.status]?.text || 'text-gray-700'}`}>
                                  <span className={`w-1.5 h-1.5 rounded-full ${STATUS_CFG[aula.status]?.dot || 'bg-gray-400'}`} />
                                  {STATUS_CFG[aula.status]?.label || aula.status}
                                </span>
                                <span className={`inline-flex px-2 py-0.5 rounded text-xs font-medium ${style.bg} ${style.text}`}>
                                  {aula.modalidade}
                                </span>
                              </div>
                              <div className="grid grid-cols-2 lg:grid-cols-3 gap-3 text-sm text-[#4d7068]">
                                <div className="flex items-center gap-2">
                                  <User className="w-4 h-4 text-[#0d6b5e] shrink-0" />
                                  <span className="truncate">{aula.alunoNome || <span className="italic">Aluno</span>}</span>
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
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          </>
        )}

        {/* Detail View */}
        {selectedAula && (
          <div className="flex-1 overflow-y-auto p-6">
            <div className="bg-white rounded-2xl border border-[#0d6b5e]/8 p-6">
              {/* Info */}
              <div className="flex items-center gap-2 flex-wrap mb-4">
                <h3 className="text-xl font-semibold text-[#0a1a17]">
                  {selectedAula.alunoNome || 'Coaching'}
                </h3>
                <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium ${STATUS_CFG[selectedAula.status]?.bg} ${STATUS_CFG[selectedAula.status]?.text}`}>
                  <span className={`w-1.5 h-1.5 rounded-full ${STATUS_CFG[selectedAula.status]?.dot}`} />
                  {STATUS_CFG[selectedAula.status]?.label || selectedAula.status}
                </span>
                <span className={`inline-flex px-2 py-0.5 rounded text-xs font-medium ${getModalidadeStyle(selectedAula.modalidade).bg} ${getModalidadeStyle(selectedAula.modalidade).text}`}>
                  {selectedAula.modalidade}
                </span>
              </div>

              <div className="grid grid-cols-2 gap-4 text-sm text-[#4d7068] mb-6">
                <div className="flex items-center gap-2">
                  <User className="w-4 h-4 text-[#0d6b5e] shrink-0" />
                  <span>{selectedAula.alunoNome || '-'}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-[#0d6b5e] shrink-0" />
                  <span>{formatDate(selectedAula.data)}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Clock className="w-4 h-4 text-[#0d6b5e] shrink-0" />
                  <span>{formatHora(selectedAula.horaInicio || selectedAula.data)} – {formatHora(selectedAula.horaFim || selectedAula.data)}</span>
                </div>
                <div className="flex items-center gap-2">
                  <MapPin className="w-4 h-4 text-[#0d6b5e] shrink-0" />
                  <span>{selectedAula.estudioNome || 'Por definir'}</span>
                </div>
              </div>

              {/* Actions - CONFIRMADA, no sugestaoestado */}
              {selectedAula.status === 'CONFIRMADA' && !selectedAula.sugestaoestado && (
                confirmCancelId === selectedAula.id ? (
                  <div className="pt-5 border-t border-[#0d6b5e]/8">
                    <p className="text-sm text-[#0a1a17] mb-4" style={{ fontWeight: 500 }}>
                      Tens a certeza que queres cancelar esta aula?
                    </p>
                    <div className="flex gap-2">
                      <button onClick={() => setConfirmCancelId(null)}
                        className="flex items-center gap-1.5 bg-white text-[#4d7068] border border-[#0d6b5e]/20 px-4 py-2 rounded-lg hover:bg-[#f4f9f8] transition-colors text-sm flex-1 justify-center"
                        style={{ fontWeight: 500 }}>
                        Voltar
                      </button>
                      <button onClick={() => handleCancelarAula(selectedAula.id)}
                        className="flex items-center gap-1.5 bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 transition-colors text-sm flex-1 justify-center">
                        <XCircle className="w-4 h-4" />
                        Confirmar cancelamento
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="pt-5 border-t border-[#0d6b5e]/8 space-y-2">
                    <button onClick={() => handleConfirmarRealizacao(selectedAula.id)}
                      className="flex items-center gap-1.5 bg-[#0d6b5e] text-white px-4 py-2 rounded-lg hover:bg-[#065147] transition-colors text-sm w-full justify-center">
                      <CheckCircle className="w-4 h-4" />
                      Confirmar Realização
                    </button>
                    <div className="flex gap-2">
                      <button onClick={() => { setShowSugerirData(selectedAula.id); setNovaDataInput(formatDataHoraInput(selectedAula.data) || ''); }}
                        className="flex items-center gap-1.5 bg-orange-600 text-white px-4 py-2 rounded-lg hover:bg-orange-700 transition-colors text-sm flex-1 justify-center">
                        <CalendarOff className="w-4 h-4" />
                        Sugerir Data
                      </button>
                      <button onClick={() => setConfirmCancelId(selectedAula.id)}
                        className="flex items-center gap-1.5 bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 transition-colors text-sm flex-1 justify-center">
                        <XCircle className="w-4 h-4" />
                        Cancelar Aula
                      </button>
                    </div>
                    <button onClick={() => handlePedirRemarcacao(selectedAula.id)}
                      className="flex items-center gap-1.5 bg-gray-600 text-white px-4 py-2 rounded-lg hover:bg-gray-700 transition-colors text-sm w-full justify-center">
                      <CalendarOff className="w-4 h-4" />
                      Pedir Remarcação
                    </button>
                  </div>
                )
              )}

              {/* AGUARDA_PROFESSOR - proposed date by direcao */}
              {selectedAula.sugestaoestado === 'AGUARDA_PROFESSOR' && (
                <div className="pt-5 border-t border-[#0d6b5e]/8">
                  <p className="text-xs text-orange-700 bg-orange-50 px-3 py-2 rounded-lg border border-orange-200 mb-3">
                    Nova data proposta: {selectedAula.novadata || selectedAula.novaData}
                  </p>
                  <div className="flex gap-2">
                    <button onClick={() => handleResponderSugestao(selectedAula.id, true)}
                      className="flex items-center gap-1.5 bg-[#0d6b5e] text-white px-4 py-2 rounded-lg hover:bg-[#065147] transition-colors text-sm flex-1 justify-center">
                      <CheckCircle className="w-4 h-4" />
                      Aceitar
                    </button>
                    <button onClick={() => handleResponderSugestao(selectedAula.id, false)}
                      className="flex items-center gap-1.5 bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 transition-colors text-sm flex-1 justify-center">
                      <XCircle className="w-4 h-4" />
                      Recusar
                    </button>
                  </div>
                </div>
              )}

              {/* AGUARDA_DIRECAO */}
              {selectedAula.sugestaoestado === 'AGUARDA_DIRECAO' && (
                <div className="pt-5 border-t border-[#0d6b5e]/8">
                  <p className="text-xs text-amber-700 bg-amber-50 px-3 py-2 rounded-lg border border-amber-200 flex items-center gap-2">
                    <CalendarOff className="w-4 h-4 shrink-0" />
                    {selectedAula.novadata
                      ? `Nova data proposta: ${selectedAula.novadata}. A aguardar resposta da direção.`
                      : 'Pedido de remarcação enviado. A aguardar resposta da direção.'}
                  </p>
                </div>
              )}

              {/* AGUARDA_EE */}
              {selectedAula.sugestaoestado === 'AGUARDA_EE' && (
                <div className="pt-5 border-t border-[#0d6b5e]/8">
                  <p className="text-xs text-blue-700 bg-blue-50 px-3 py-2 rounded-lg border border-blue-200 flex items-center gap-2">
                    <CalendarOff className="w-4 h-4 shrink-0" />
                    Remarcação a aguardar confirmação do encarregado de educação.
                  </p>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Sugerir Data Modal */}
      {showSugerirData && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40"
          onClick={() => { setShowSugerirData(null); setNovaDataInput(''); }}>
          <div className="bg-white rounded-2xl shadow-xl p-6 w-full max-w-sm mx-4"
            onClick={e => e.stopPropagation()}>
            <h3 className="text-base text-[#0a1a17] mb-4" style={{ fontWeight: 600 }}>Sugerir Nova Data</h3>
            <p className="text-sm text-[#4d7068] mb-4">
              Selecione uma nova data para a aula. A direção receberá a sua sugestão e irá analisar.
            </p>
            <input type="datetime-local" value={novaDataInput} onChange={e => setNovaDataInput(e.target.value)}
              min={new Date().toISOString().slice(0, 16)}
              className="w-full px-3 py-2 border border-[#0d6b5e]/20 rounded-lg bg-[#f4f9f8] text-[#0a1a17] focus:outline-none focus:border-[#0d6b5e] mb-4"
            />
            <div className="flex gap-2">
              <button onClick={handleSugerirData}
                className="flex-1 bg-orange-600 text-white px-4 py-2 rounded-lg hover:bg-orange-700 transition-colors text-sm">
                Enviar Sugestão
              </button>
              <button onClick={() => { setShowSugerirData(null); setNovaDataInput(''); }}
                className="flex-1 bg-gray-100 text-[#4d7068] px-4 py-2 rounded-lg hover:bg-gray-200 transition-colors text-sm">
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
