import { useState, FormEvent, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import api from '../services/api';
import { PedidoAula } from '../types';
import { hasRole } from '../utils/roleUtils';
import { AlertCircle, Info, Lock, Users } from 'lucide-react';
import { toast } from 'sonner';
import { useFeriados } from '../contexts/FeriadosContext';
import { DatePicker } from './DatePicker';

interface NovaSessaoFormProps {
  onSuccess: (aula: PedidoAula) => void;
  onCancel: () => void;
  aulasExistentes: PedidoAula[];
  prefill?: {
    professorId?: string;
    estudioId?: string;
    data?: string;
    horaInicio?: string;
    horaFim?: string;
    duracao?: string;
    maxDuracao?: string;
    modalidade?: string;
    modalidadeId?: string;
  };
  submitError?: string | null;
  onClearError?: () => void;
}

type TipoAula = 'individual' | 'privada';

export function NovaSessaoForm({ onSuccess, onCancel, aulasExistentes, prefill, submitError, onClearError }: NovaSessaoFormProps) {
  const { user } = useAuth();
  const { isDiaWarning } = useFeriados();
  const [alertaData, setAlertaData] = useState<{isWarning: boolean; mensagem?: string} | null>(null);
  const [formData, setFormData] = useState({
    alunoId: user?.role && hasRole(user.role, 'ALUNO') ? user.id : '',
    professorId: user?.role && hasRole(user.role, 'PROFESSOR') ? user.id : '',
    data: '',
    horaInicio: '',
    duracao: '',
    modalidade: '',
    observacoes: '',
    tipoAula: 'individual' as TipoAula,
    turmaId: '',
    vagasTotais: '1',
  });
  const [errors, setErrors] = useState<string[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [turmas, setTurmas] = useState<any[]>([]);

  useEffect(() => {
    const fetchData = async () => {
      const [usersRes, turmasRes] = await Promise.all([
        api.getUsers(),
        api.getTurmas()
      ]);
      if (usersRes.success) setUsers(usersRes.data || []);
      if (turmasRes.success) setTurmas(turmasRes.data || []);
    };
    fetchData();
  }, []);

  useEffect(() => {
    if (prefill) {
      setFormData(prev => ({
        ...prev,
        professorId: prefill.professorId ?? (user?.role && hasRole(user.role, 'PROFESSOR') ? user.id : prev.professorId),
        data: prefill.data ?? prev.data,
        horaInicio: prefill.horaInicio || prev.horaInicio,
        duracao: prefill.duracao || prev.duracao,
        modalidade: prefill.modalidade || prev.modalidade,
      }));
    }
  }, [prefill]);

  const maxDuracao = prefill?.maxDuracao ? parseInt(prefill.maxDuracao) : 120;

  const duracaoOptions = [30, 60, 90, 120].filter(d => d <= maxDuracao);

  if (!user) return null;

  const calcularHoraFim = (horaInicio: string, duracao: number): string => {
    if (!horaInicio) return '';
    const [horas, minutos] = horaInicio.split(':').map(Number);
    const totalMinutos = horas * 60 + minutos + duracao;
    const horasFim = Math.floor(totalMinutos / 60);
    const minutosFim = totalMinutos % 60;
    return `${String(horasFim).padStart(2, '0')}:${String(minutosFim).padStart(2, '0')}`;
  };

  const validarConflitosProfessor = (
    professorId: string,
    data: string,
    horaInicio: string,
    horaFim: string
  ): string[] => {
    const erros: string[] = [];
    const aulasAtivas = aulasExistentes.filter(
      a => a.status === 'CONFIRMADA' || a.status === 'PENDENTE'
    );
    const conflitoProf = aulasAtivas.find(a =>
      a.professorId === professorId &&
      a.data === data &&
      (
        (horaInicio >= a.horaInicio && horaInicio < a.horaFim) ||
        (horaFim > a.horaInicio && horaFim <= a.horaFim) ||
        (horaInicio <= a.horaInicio && horaFim >= a.horaFim)
      )
    );
    if (conflitoProf) {
      erros.push(`O professor já tem um coaching agendado das ${conflitoProf.horaInicio} às ${conflitoProf.horaFim}`);
    }
    return erros;
  };

  const validarConflitosAluno = (
    alunoId: string,
    professorId: string,
    data: string,
    horaInicio: string,
    horaFim: string
  ): string[] => {
    const erros: string[] = [];
    const aulasAtivas = aulasExistentes.filter(
      a => a.status === 'CONFIRMADA' || a.status === 'PENDENTE'
    );
    const conflitoAluno = aulasAtivas.find(a =>
      a.alunoId === alunoId &&
      a.professorId !== professorId &&
      a.data === data &&
      (
        (horaInicio >= a.horaInicio && horaInicio < a.horaFim) ||
        (horaFim > a.horaInicio && horaFim <= a.horaFim) ||
        (horaInicio <= a.horaInicio && horaFim >= a.horaFim)
      )
    );
    if (conflitoAluno) {
      erros.push(`O aluno já tem um coaching marcado com ${conflitoAluno.professorNome} das ${conflitoAluno.horaInicio} às ${conflitoAluno.horaFim} (data: ${conflitoAluno.data})`);
    }
    return erros;
  };

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    setErrors([]);
    onClearError?.();

    const novosErros: string[] = [];
    if (!formData.alunoId) novosErros.push('Selecione um aluno');
    if (!formData.professorId) novosErros.push('Selecione um professor');
    if (!formData.data) novosErros.push('Selecione uma data');
    if (!formData.horaInicio) novosErros.push('Selecione o horário de início');
    if (!formData.modalidade) novosErros.push('Selecione a modalidade');
    if (formData.tipoAula === 'privada' && !formData.turmaId) {
      novosErros.push('Selecione o grupo para o coaching privado');
    }

    const duracao = parseInt(formData.duracao);
    const minDuracao = 30;
    const maxDuracaoAllow = prefill?.maxDuracao ? parseInt(prefill.maxDuracao) : 120;
    // Validar: duracao deve estar entre 30 e maxDuracao do slot (ou 120 se não houver slot)
    if (isNaN(duracao) || duracao < minDuracao || duracao > maxDuracaoAllow) {
      novosErros.push(`A duração deve estar entre ${minDuracao} e ${maxDuracaoAllow} minutos`);
    }

    const dataAula = new Date(formData.data);
    const agora = new Date();
    const hoje = new Date();
    hoje.setHours(0, 0, 0, 0);
    
    // Validar data não pode ser no passado
    if (dataAula < hoje) {
      novosErros.push('A data não pode ser no passado');
    }
    
    // Se data for hoje, validar hora de início
    const dataHojeStr = hoje.toISOString().split('T')[0];
    if (formData.data === dataHojeStr && formData.horaInicio) {
      const [horaH, horaM] = formData.horaInicio.split(':').map(Number);
      const horaAula = horaH * 60 + horaM;
      const horaAtual = agora.getHours() * 60 + agora.getMinutes();
      if (horaAula <= horaAtual) {
        novosErros.push('A hora de início deve ser posterior à hora atual');
      }
    }

    if (prefill?.horaInicio && prefill?.horaFim && formData.horaInicio) {
      const [selH, selM] = formData.horaInicio.split(':').map(Number);
      const [slotH, slotM] = prefill.horaInicio.split(':').map(Number);
      const [slotFimH, slotFimM] = prefill.horaFim.split(':').map(Number);
      const selMin = selH * 60 + selM;
      const slotMin = slotH * 60 + slotM;
      const slotFimMin = slotFimH * 60 + slotFimM;
      if (selMin < slotMin) {
        novosErros.push(`A hora de início (${formData.horaInicio}) é antes do início da disponibilidade (${prefill.horaInicio})`);
      }
      if (selMin >= slotFimMin) {
        novosErros.push(`A hora de início (${formData.horaInicio}) é após o fim da disponibilidade (${prefill.horaFim})`);
      }
    }

    if (prefill?.horaFim && formData.horaInicio && formData.duracao) {
      const horaFimCalc = calcularHoraFim(formData.horaInicio, parseInt(formData.duracao));
      const [fimCalcH, fimCalcM] = horaFimCalc.split(':').map(Number);
      const [slotFimH, slotFimM] = prefill.horaFim.split(':').map(Number);
      const fimCalcMin = fimCalcH * 60 + fimCalcM;
      const slotFimMin = slotFimH * 60 + slotFimM;
      if (fimCalcMin > slotFimMin) {
        novosErros.push(`A hora de início combinada com a duração ultrapassa o fim da disponibilidade (${prefill.horaFim})`);
      }
    }

    if (novosErros.length > 0) {
      setErrors(novosErros);
      toast.error('Corrija os erros no formulário');
      return;
    }

    const horaFim = calcularHoraFim(formData.horaInicio, duracao);

    const conflitoErros = validarConflitosProfessor(
      formData.professorId,
      formData.data,
      formData.horaInicio,
      horaFim
    );
    if (conflitoErros.length > 0) {
      setErrors(conflitoErros);
      toast.error('Conflito de horário detectado');
      return;
    }

    const conflitoAlunoErros = validarConflitosAluno(
      formData.alunoId,
      formData.professorId,
      formData.data,
      formData.horaInicio,
      horaFim
    );
    if (conflitoAlunoErros.length > 0) {
      setErrors(conflitoAlunoErros);
      toast.error('Conflito de horário do aluno');
      return;
    }

    const aluno = users.find(u => u.id === formData.alunoId);
    const professor = users.find(u => u.id === formData.professorId);
    const turma = formData.turmaId ? turmas.find(t => t.id === formData.turmaId) : undefined;

    if (!aluno || !professor) {
      toast.error('Erro ao buscar dados');
      return;
    }

    const novoPedido: PedidoAula = {
      id: `aula-${Date.now()}`,
      alunoId: formData.alunoId,
      alunoNome: aluno.nome,
      encarregadoId: user.id,
      professorId: formData.professorId,
      professorNome: professor.nome,
      estudioId: turma?.estudioId ?? '',
      estudioNome: turma?.estudioNome ?? 'A definir pela direção',
      modalidade: formData.modalidade,
      data: formData.data,
      horaInicio: formData.horaInicio,
      horaFim: horaFim,
      duracao: duracao,
      status: 'PENDENTE',
      privacidade: formData.tipoAula === 'privada',
      maxParticipantes: parseInt(formData.vagasTotais),
      observacoes: [
        formData.observacoes,
        formData.tipoAula === 'privada' && turma ? `Coaching privado — Grupo: ${turma.nome}` : '',
        formData.tipoAula === 'privada' && !turma ? 'Coaching privado' : '',
      ].filter(Boolean).join(' · '),
      criadoEm: new Date().toISOString(),
    };

    onSuccess(novoPedido);

    // Nota: o form NAO é limpo aqui — o parent (Dashboard/Coaching) é responsável
    // por fechar o modal em caso de sucesso. Se houver erro na submissão,
    // os dados permanecem para o utilizador ajustar.
  };

  const alunosDisponiveis = hasRole(user.role, 'ENCARREGADO')
    ? users.filter(u => hasRole(u.role, 'ALUNO') && user.alunosIds?.includes(u.id))
    : users.filter(u => hasRole(u.role, 'ALUNO'));

  const professores = users.filter(u => hasRole(u.role, 'PROFESSOR'));

  // Turmas do professor selecionado (para aula privada)
  const turmasDoProf = formData.professorId
    ? turmas.filter(t => t.professorId === formData.professorId && t.status !== 'ARQUIVADA')
    : [];

  if (hasRole(user.role, 'ENCARREGADO') && alunosDisponiveis.length === 1 && !formData.alunoId) {
    setFormData(prev => ({ ...prev, alunoId: alunosDisponiveis[0].id }));
  }

  const horaFimCalculada = formData.horaInicio && formData.duracao
    ? calcularHoraFim(formData.horaInicio, parseInt(formData.duracao))
    : '';

  return (
    <div className="bg-white p-6 rounded-2xl shadow-md border border-[#0d6b5e]/10">
      <h2 className="text-xl mb-5 text-[#0a1a17]" style={{ fontWeight: 600 }}>
        Solicitar Novo Coaching
      </h2>

      {errors.length > 0 && (
        <div className="mb-4 p-4 bg-red-50 rounded-xl border border-red-200">
          <div className="flex items-start gap-2">
            <AlertCircle className="w-5 h-5 text-red-600 mt-0.5" />
            <div>
              <p className="text-sm text-red-800" style={{ fontWeight: 600 }}>Erros encontrados:</p>
              <ul className="mt-2 space-y-1">
                {errors.map((erro, idx) => (
                  <li key={idx} className="text-sm text-red-700">• {erro}</li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-5">

        {/* ── Tipo de aula ── */}
        <div>
          <label className="block text-sm mb-2 text-[#4d7068]" style={{ fontWeight: 500 }}>
            Tipo de Coaching *
          </label>
          <div className="flex gap-3">
            {/* Individual / Pública */}
            <button
              type="button"
              onClick={() => setFormData({ ...formData, tipoAula: 'individual', turmaId: '' })}
              className={`flex-1 flex items-center gap-3 px-4 py-3 rounded-xl border-2 transition-all ${
                formData.tipoAula === 'individual'
                  ? 'border-[#0d6b5e] bg-[#e2f0ed]'
                  : 'border-[#0d6b5e]/15 bg-[#f4f9f8] hover:border-[#0d6b5e]/35'
              }`}
            >
              <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${
                formData.tipoAula === 'individual' ? 'bg-[#0d6b5e]' : 'bg-[#0d6b5e]/15'
              }`}>
                <Users className={`w-4 h-4 ${formData.tipoAula === 'individual' ? 'text-white' : 'text-[#0d6b5e]'}`} />
              </div>
              <div className="text-left">
                <p className="text-sm text-[#0a1a17]" style={{ fontWeight: 600 }}>Pública</p>
                <p className="text-xs text-[#4d7068]">Visível para outros encarregados aderirem</p>
              </div>
              {formData.tipoAula === 'individual' && (
                <div className="ml-auto w-4 h-4 rounded-full bg-[#0d6b5e] flex items-center justify-center">
                  <svg viewBox="0 0 10 10" fill="none" className="w-2.5 h-2.5">
                    <path d="M2 5l2.5 2.5 4-4" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </div>
              )}
            </button>

            {/* Privada */}
            <button
              type="button"
              onClick={() => setFormData({ ...formData, tipoAula: 'privada' })}
              className={`flex-1 flex items-center gap-3 px-4 py-3 rounded-xl border-2 transition-all ${
                formData.tipoAula === 'privada'
                  ? 'border-[#c9a84c] bg-[#c9a84c]/10'
                  : 'border-[#c9a84c]/20 bg-[#f4f9f8] hover:border-[#c9a84c]/40'
              }`}
            >
              <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${
                formData.tipoAula === 'privada' ? 'bg-[#c9a84c]' : 'bg-[#c9a84c]/20'
              }`}>
                <Lock className={`w-4 h-4 ${formData.tipoAula === 'privada' ? 'text-white' : 'text-[#c9a84c]'}`} />
              </div>
              <div className="text-left">
                <p className="text-sm text-[#0a1a17]" style={{ fontWeight: 600 }}>Privada</p>
                <p className="text-xs text-[#4d7068]">Apenas para o teu grupo, não é pública</p>
              </div>
              {formData.tipoAula === 'privada' && (
                <div className="ml-auto w-4 h-4 rounded-full bg-[#c9a84c] flex items-center justify-center">
                  <svg viewBox="0 0 10 10" fill="none" className="w-2.5 h-2.5">
                    <path d="M2 5l2.5 2.5 4-4" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </div>
              )}
            </button>
          </div>
        </div>

        {/* ── Seletor de grupo (só se privada) ── */}
        {formData.tipoAula === 'privada' && (
          <div className="p-4 bg-[#c9a84c]/8 border border-[#c9a84c]/25 rounded-xl">
            <label className="block text-sm mb-2 text-[#7a5e1a]" style={{ fontWeight: 500 }}>
              Grupo *
            </label>
            {!formData.professorId ? (
              <p className="text-sm text-[#4d7068] italic">Selecione primeiro um professor para ver os grupos disponíveis.</p>
            ) : turmasDoProf.length === 0 ? (
              <p className="text-sm text-[#4d7068] italic">Este professor não tem grupos ativos.</p>
            ) : (
              <div className="space-y-2">
                {turmasDoProf.map(turma => (
                  <button
                    key={turma.id}
                    type="button"
                    onClick={() => setFormData({ ...formData, turmaId: turma.id })}
                    className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl border-2 text-left transition-all ${
                      formData.turmaId === turma.id
                        ? 'border-[#c9a84c] bg-[#c9a84c]/15'
                        : 'border-[#c9a84c]/20 bg-white hover:border-[#c9a84c]/50'
                    }`}
                  >
                    <div
                      className="w-3 h-10 rounded-full shrink-0"
                      style={{ background: turma.cor }}
                    />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-[#0a1a17] truncate" style={{ fontWeight: 600 }}>{turma.nome}</p>
                      <p className="text-xs text-[#4d7068]">
                        {turma.modalidade} · {turma.nivel} · {turma.faixaEtaria}
                      </p>
                      <p className="text-xs text-[#4d7068]">
                        {turma.alunosInscritos.length}/{turma.lotacaoMaxima} alunos ·{' '}
                        <span className={turma.status === 'ABERTA' ? 'text-[#0d6b5e]' : 'text-amber-600'}>
                          {turma.status === 'ABERTA' ? 'Aberta' : 'Fechada'}
                        </span>
                      </p>
                    </div>
                    {formData.turmaId === turma.id && (
                      <div className="w-5 h-5 rounded-full bg-[#c9a84c] flex items-center justify-center shrink-0">
                        <svg viewBox="0 0 10 10" fill="none" className="w-3 h-3">
                          <path d="M2 5l2.5 2.5 4-4" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                        </svg>
                      </div>
                    )}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ── Aluno + Professor ── */}
        <div className="grid md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm mb-2 text-[#4d7068]" style={{ fontWeight: 500 }}>
              Aluno *
            </label>
            <select
              value={formData.alunoId}
              onChange={(e) => setFormData({ ...formData, alunoId: e.target.value })}
              className="w-full px-4 py-2.5 border border-[#0d6b5e]/20 rounded-lg bg-[#f4f9f8] focus:outline-none focus:border-[#0d6b5e] focus:ring-2 focus:ring-[#0d6b5e]/10 transition-colors"
              required
            >
              <option value="">Selecione um aluno</option>
              {alunosDisponiveis.map(aluno => (
                <option key={aluno.id} value={aluno.id}>{aluno.nome}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm mb-2 text-[#4d7068]" style={{ fontWeight: 500 }}>
              Professor *
            </label>
            <select
              value={formData.professorId}
              onChange={(e) => setFormData({ ...formData, professorId: e.target.value, turmaId: '' })}
              className="w-full px-4 py-2.5 border border-[#0d6b5e]/20 rounded-lg bg-[#f4f9f8] focus:outline-none focus:border-[#0d6b5e] focus:ring-2 focus:ring-[#0d6b5e]/10 transition-colors"
              required
              disabled={hasRole(user.role, 'PROFESSOR') || !!prefill?.professorId}
            >
              <option value="">Selecione um professor</option>
              {professores.map(prof => (
                <option key={prof.id} value={prof.id}>{prof.nome}</option>
              ))}
            </select>
            {(hasRole(user.role, 'PROFESSOR') || prefill?.professorId) && (
              <p className="mt-1 text-xs text-[#0d6b5e]">
                {prefill?.professorId ? 'Definido pelo horário do professor' : 'Marcado automaticamente como professor'}
              </p>
            )}
          </div>

          {/* Modalidade */}
          <div>
            <label className="block text-sm mb-2 text-[#4d7068]" style={{ fontWeight: 500 }}>
              Modalidade *
            </label>
            <select
              value={formData.modalidade}
              onChange={(e) => setFormData({ ...formData, modalidade: e.target.value })}
              className="w-full px-4 py-2.5 border border-[#0d6b5e]/20 rounded-lg bg-[#f4f9f8] focus:outline-none focus:border-[#0d6b5e] focus:ring-2 focus:ring-[#0d6b5e]/10 transition-colors"
              required
              disabled={!!prefill?.modalidade}
            >
              <option value="">Selecione a modalidade</option>
              {(() => {
                const OPCOES = ['Ballet', 'Ballet Clássico', 'Hip-Hop', 'Jazz', 'Contemporâneo', 'Dança Urbana', 'Teatro Dança', 'Outra'];
                const todas = prefill?.modalidade && !OPCOES.includes(prefill.modalidade)
                  ? [prefill.modalidade, ...OPCOES]
                  : OPCOES;
                return todas.map(m => (
                  <option key={m} value={m}>{m}</option>
                ));
              })()}
            </select>
            {prefill?.modalidade && (
              <p className="mt-1 text-xs text-[#0d6b5e]">Definido pelo horário do professor</p>
            )}
          </div>

          {/* Data */}
          <div>
            <label className="block text-sm mb-2 text-[#4d7068]" style={{ fontWeight: 500 }}>
              Data *
            </label>
            <DatePicker
              value={formData.data}
              onChange={(val) => { setFormData({ ...formData, data: val }); setAlertaData(isDiaWarning(val)); }}
              min={new Date().toISOString().split('T')[0]}
              required
              disabled={!!prefill?.data}
            />
            {alertaData?.isWarning && (
              <p className="text-xs text-red-500 mt-1 flex items-center gap-1">⚠️ {alertaData.mensagem}</p>
            )}
            {prefill?.data && (
              <p className="mt-1 text-xs text-[#0d6b5e]">Definido pelo horário do professor</p>
            )}
          </div>

          {/* Hora Início */}
          <div>
            <label className="block text-sm mb-2 text-[#4d7068]" style={{ fontWeight: 500 }}>
              Hora de Início *
            </label>
            {prefill?.horaInicio ? (() => {
              const [hI, mI] = prefill.horaInicio.split(':').map(Number);
              const inicioMin = hI * 60 + mI;
              const minDuracao = 30;
              let fimMin: number;
              if (prefill.horaFim) {
                const [hF, mF] = prefill.horaFim.split(':').map(Number);
                fimMin = hF * 60 + mF;
              } else {
                const maxD = prefill.maxDuracao ? parseInt(prefill.maxDuracao) : 120;
                fimMin = inicioMin + maxD;
              }
              const opcoes: { value: string; label: string }[] = [];
              for (let m = inicioMin; m <= fimMin - minDuracao; m += 30) {
                const h = Math.floor(m / 60);
                const min = m % 60;
                const value = `${String(h).padStart(2, '0')}:${String(min).padStart(2, '0')}`;
                opcoes.push({ value, label: value });
              }
              const apenasUma = opcoes.length === 1;
              if (apenasUma && formData.horaInicio !== opcoes[0].value) {
                setTimeout(() => setFormData(f => ({ ...f, horaInicio: opcoes[0].value })), 0);
              }
              return (
                <select
                  value={apenasUma ? opcoes[0].value : formData.horaInicio}
                  onChange={(e) => setFormData({ ...formData, horaInicio: e.target.value })}
                  disabled={apenasUma}
                  className="w-full px-4 py-2.5 border border-[#0d6b5e]/20 rounded-lg bg-[#f4f9f8] focus:outline-none focus:border-[#0d6b5e] focus:ring-2 focus:ring-[#0d6b5e]/10 transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
                  required
                >
                  {opcoes.length === 0 ? (
                    <option value="">Sem horários disponíveis</option>
                  ) : !apenasUma ? (
                    <option value="">Selecione a hora</option>
                  ) : null}
                  {opcoes.map(o => (
                    <option key={o.value} value={o.value}>{o.label}</option>
                  ))}
                </select>
              );
            })() : (
              <input
                type="time"
                value={formData.horaInicio}
                onChange={(e) => setFormData({ ...formData, horaInicio: e.target.value })}
                className="w-full px-4 py-2.5 border border-[#0d6b5e]/20 rounded-lg bg-[#f4f9f8] focus:outline-none focus:border-[#0d6b5e] focus:ring-2 focus:ring-[#0d6b5e]/10 transition-colors"
                required
              />
            )}
            {prefill?.horaInicio && prefill?.horaFim && (
              <p className="mt-1 text-xs text-[#0d6b5e]">
                Disponibilidade: {prefill.horaInicio} – {prefill.horaFim}
              </p>
            )}
          </div>

          {/* Duração */}
          <div>
            <label className="block text-sm mb-2 text-[#4d7068]" style={{ fontWeight: 500 }}>
              Duração *
            </label>
            <select
              value={formData.duracao}
              onChange={(e) => setFormData({ ...formData, duracao: e.target.value })}
              className="w-full px-4 py-2.5 border border-[#0d6b5e]/20 rounded-lg bg-[#f4f9f8] focus:outline-none focus:border-[#0d6b5e] focus:ring-2 focus:ring-[#0d6b5e]/10"
              required
            >
              <option value="">Selecione a duração</option>
              {duracaoOptions.map(d => (
                <option key={d} value={String(d)}>
                  {d === 30 ? '30 minutos' : d === 60 ? '60 minutos (1 hora)' : d === 90 ? '90 minutos (1h30)' : '120 minutos (2 horas)'}
                </option>
              ))}
            </select>
            {prefill?.maxDuracao && (
              <p className="mt-1 text-xs text-[#0d6b5e]">
                Tempo máximo neste intervalo: {prefill.maxDuracao} minutos
              </p>
            )}
            {horaFimCalculada && (
              <p className="mt-1 text-sm text-[#0d6b5e]">
                Término previsto: <span style={{ fontWeight: 600 }}>{horaFimCalculada}</span>
              </p>
            )}
          </div>
        </div>

        {/* Nº de Vagas (só para aulas públicas/partilhadas) */}
        {formData.tipoAula === 'individual' && (
          <div>
            <label className="block text-sm mb-2 text-[#4d7068]" style={{ fontWeight: 500 }}>
              N.º de Vagas <span className="text-xs text-[#4d7068]/70 font-normal">(partilha com outros alunos)</span>
            </label>
            <div className="flex items-center gap-3">
              <select
                value={formData.vagasTotais}
                onChange={(e) => setFormData({ ...formData, vagasTotais: e.target.value })}
                className="w-28 px-4 py-2.5 border border-[#0d6b5e]/20 rounded-lg bg-[#f4f9f8] focus:outline-none focus:border-[#0d6b5e] focus:ring-2 focus:ring-[#0d6b5e]/10 transition-colors"
              >
                {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(n => (
                  <option key={n} value={String(n)}>{n} {n === 1 ? 'vaga' : 'vagas'}</option>
                ))}
              </select>
              <p className="text-xs text-[#4d7068]">
                Define quantos alunos no total podem participar neste coaching.
              </p>
            </div>
          </div>
        )}

        {/* Observações */}
        <div>
          <label className="block text-sm mb-2 text-[#4d7068]" style={{ fontWeight: 500 }}>
            Observações
          </label>
          <textarea
            value={formData.observacoes}
            onChange={(e) => setFormData({ ...formData, observacoes: e.target.value })}
            className="w-full px-4 py-2.5 border border-[#0d6b5e]/20 rounded-lg bg-[#f4f9f8] focus:outline-none focus:border-[#0d6b5e] focus:ring-2 focus:ring-[#0d6b5e]/10 transition-colors resize-none"
            rows={3}
            placeholder="Informações adicionais sobre o coaching (opcional)…"
          />
        </div>

        {submitError && (
          <div className="flex items-start gap-2 p-3 bg-red-50 border border-red-200 rounded-lg">
            <AlertCircle className="w-5 h-5 text-red-500 mt-0.5 shrink-0" />
            <p className="text-sm text-red-700">{submitError}</p>
          </div>
        )}

        {/* Botões */}
        <div className="flex gap-3 pt-1">
          <button
            type="submit"
            className="bg-[#0d6b5e] text-white px-6 py-2.5 rounded-lg hover:bg-[#065147] transition-colors"
            style={{ fontWeight: 600 }}
          >
            Solicitar Coaching
          </button>
          <button
            type="button"
            onClick={onCancel}
            className="bg-[#deecea] text-[#0d6b5e] px-6 py-2.5 rounded-lg hover:bg-[#c8e0dc] transition-colors"
            style={{ fontWeight: 600 }}
          >
            Cancelar
          </button>
        </div>
      </form>

      {/* Nota informativa */}
      <div className="mt-5 p-4 bg-[#e2f0ed] rounded-xl border border-[#0d6b5e]/20">
        <div className="flex items-start gap-2">
          <Info className="w-5 h-5 text-[#0d6b5e] mt-0.5 shrink-0" />
          <div className="text-sm text-[#0d6b5e]">
            <p style={{ fontWeight: 600 }} className="mb-1">Informações importantes:</p>
            <ul className="space-y-1">
              <li>• O estúdio será atribuído pela direção após aprovação</li>
              <li>• Os coachings devem ter entre 30 e 120 minutos</li>
              <li>• O pedido fica pendente até aprovação da direção</li>
              <li>• Coachings <strong>Públicos</strong> ficam visíveis para outros encarregados aderirem (Grupos Abertos)</li>
              <li>• Coachings <strong>Privados</strong> só são visíveis ao teu grupo</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
