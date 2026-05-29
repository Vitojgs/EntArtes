import { useState, useRef, useEffect } from 'react';
import { X, Printer, ChevronDown, User, CalendarDays } from 'lucide-react';
import { useFeriados } from '../contexts/FeriadosContext';
import { DatePicker } from './DatePicker';
import api from '../services/api';
import { User as UserType, PedidoAula } from '../types';
import { hasRole } from '../utils/roleUtils';

interface Props {
  currentUser: UserType;
  onClose: () => void;
}

const MONTHS = ['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro'];
const DAYS = ['Dom','Seg','Ter','Qua','Qui','Sex','Sáb'];

function formatDate(dateStr: string) {
  const d = new Date(dateStr);
  return `${DAYS[d.getDay()]}, ${String(d.getDate()).padStart(2,'0')} ${MONTHS[d.getMonth()]} ${d.getFullYear()}`;
}

function formatDateShort(dateStr: string) {
  if (!dateStr) return '';
  const [y, m, d] = dateStr.split('-');
  return `${d}/${m}/${y}`;
}

const ALL_STATUSES = ['PENDENTE', 'CONFIRMADA', 'REALIZADA', 'CANCELADA'] as const;
const STATUS_LABELS: Record<string, string> = {
  PENDENTE: 'Pendente', CONFIRMADA: 'Confirmado', REALIZADA: 'Realizado', CANCELADA: 'Cancelado',
};

function fmtDur(min: number) {
  if (min >= 60) {
    const h = Math.floor(min / 60);
    const m = min % 60;
    return `${h}h${m > 0 ? String(m).padStart(2,'0') + 'm' : ''}`;
  }
  return `${min}m`;
}

export function PrintCoachingModal({ currentUser, onClose }: Props) {
  const [users, setUsers] = useState<any[]>([]);
  const [aulas, setAulas] = useState<any[]>([]);
  const [encarregadoAulas, setEncarregadoAulas] = useState<any[]>([]);

  useEffect(() => {
    const fetchData = async () => {
      // Fetch users (sempre necessário)
      try {
        const usersRes = await api.getUsers();
        if (usersRes.success) setUsers(usersRes.data || []);
      } catch (err) {
        console.error('Erro ao carregar utilizadores:', err);
      }

      // Fetch aulas gerais (só DIRECAO tem acesso — falha silenciosamente para outros roles)
      try {
        const aulasRes = await api.consultarAula();
        if (aulasRes.success) setAulas(aulasRes.data || []);
      } catch (err) {
        // 403 esperado para roles não-DIRECAO
      }

      // For ENCARREGADO, fetch their specific aulas
      if (hasRole(currentUser.role, 'ENCARREGADO')) {
        try {
          const encRes = await api.getEncarregadoAulas();
          if (encRes.success) setEncarregadoAulas(encRes.data || []);
        } catch (err) {
          console.error('Erro ao carregar aulas do encarregado:', err);
        }
      }
    };
    fetchData();
  }, [currentUser.role]);

  const professors = users.filter(u => hasRole(u.role, 'PROFESSOR'));

  const [selectedProfId, setSelectedProfId] = useState<string>(
    hasRole(currentUser.role, 'PROFESSOR') ? currentUser.id : ''
  );
  const isEncarregado = hasRole(currentUser.role, 'ENCARREGADO');
  const [step, setStep] = useState<'select' | 'preview'>(
    hasRole(currentUser.role, 'PROFESSOR') || isEncarregado ? 'preview' : 'select'
  );

  // Range de datas — default: primeiro dia do mês atual até hoje
  const today = new Date();
  const defaultFrom = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2,'0')}-01`;
  const defaultTo   = today.toISOString().slice(0, 10);

  const [dateFrom, setDateFrom] = useState<string>(defaultFrom);
  const [dateTo,   setDateTo]   = useState<string>(defaultTo);
  const [alertaDateFrom, setAlertaDateFrom] = useState<{isWarning: boolean; mensagem?: string} | null>(null);
  const [alertaDateTo,   setAlertaDateTo]   = useState<{isWarning: boolean; mensagem?: string} | null>(null);
  const [selectedStatuses, setSelectedStatuses] = useState<string[]>([...ALL_STATUSES]);
  const [selectedAlunos, setSelectedAlunos] = useState<string[]>([]);
  const { isDiaWarning } = useFeriados();

  const printRef = useRef<HTMLDivElement>(null);

  const selectedProf = users.find(u => u.id === selectedProfId);

  // Data source: for ENCARREGADO use their specific aulas, otherwise all aulas
  const aulasSource = isEncarregado ? encarregadoAulas : aulas;

  // Extract unique alunos for ENCARREGADO
  const alunosList = isEncarregado
    ? [...new Map(
        aulasSource.flatMap((a: any) => {
          if (a.participantes?.length) return a.participantes.map((p: any) => [p.alunoId || p.alunoNome, p.alunoNome]);
          if (a.alunoNome) return [[a.alunoId || a.alunoNome, a.alunoNome]];
          return [];
        })
      ).entries()].map(([id, nome]) => ({ id, nome }))
    : [];

  // All aulas, filtradas por professor, range e status
  const aulasFiltradas: PedidoAula[] = aulasSource
    .filter(a => {
      // CANCELADA no UI representa ambos os estados cancelados
      const effectiveStatus = a.status === 'REJEITADA' ? 'CANCELADA' : a.status;
      if (!selectedStatuses.includes(effectiveStatus)) return false;
      if (!isEncarregado && String(a.professorId) !== selectedProfId) return false;
      if (dateFrom && a.data < dateFrom) return false;
      if (dateTo   && a.data > dateTo)   return false;
      if (isEncarregado && selectedAlunos.length > 0) {
        const alunoNome = a.alunoNome || a.participantes?.map((p: any) => p.alunoNome).filter(Boolean).join(', ') || '';
        if (!selectedAlunos.some(name => alunoNome.includes(name))) return false;
      }
      return true;
    })
    .sort((a, b) => new Date(b.data).getTime() - new Date(a.data).getTime());

  const totalMinutos = aulasFiltradas.reduce((acc, a) => acc + a.duracao, 0);

  const periodoLabel = dateFrom || dateTo
    ? `${dateFrom ? formatDateShort(dateFrom) : '—'} a ${dateTo ? formatDateShort(dateTo) : '—'}`
    : 'Todas as datas';

  const escapeHtml = (str: string | null | undefined): string => {
    if (str == null) return '';
    return str.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#039;');
  };

  const handlePrint = () => {
    const conteudo = printRef.current?.innerHTML ?? '';
    const win = window.open('', '_blank', 'width=960,height=720');
    if (!win) return;
    win.document.write(`<!DOCTYPE html>
<html lang="pt">
<head>
  <meta charset="UTF-8"/>
  <title>Aulas Realizadas — ${escapeHtml(selectedProf?.nome ?? '')} — ${escapeHtml(periodoLabel)}</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: 'Segoe UI', Arial, sans-serif; color: #0a1a17; padding: 32px; font-size: 13px; }
    table { width: 100%; border-collapse: collapse; margin-bottom: 20px; }
    thead tr { background: #0d6b5e; color: #fff; }
    thead th { padding: 10px 12px; text-align: left; font-size: 11px; font-weight: 600; text-transform: uppercase; letter-spacing: .5px; }
    tbody tr:nth-child(even) { background: #f4f9f8; }
    tbody td { padding: 9px 12px; font-size: 12px; color: #0a1a17; border-bottom: 1px solid #e2f0ed; }
    @media print { body { padding: 16px; } }
  </style>
</head>
<body>${conteudo}</body>
</html>`);
    win.document.close();
    win.focus();
    setTimeout(() => win.print(), 400);
  };

  const handleSelectProf = (id: string) => {
    setSelectedProfId(id);
    setDateFrom(defaultFrom);
    setDateTo(defaultTo);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(10,26,23,0.55)' }}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl max-h-[92vh] flex flex-col overflow-hidden">

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#0d6b5e]/10">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-[#e2f0ed] flex items-center justify-center">
              <Printer className="w-5 h-5 text-[#0d6b5e]" />
            </div>
            <div>
              <h2 className="text-base text-[#0a1a17]" style={{ fontWeight: 600 }}>
                Imprimir Coachings
              </h2>
              <p className="text-xs text-[#4d7068]">
                {step === 'select'
                  ? 'Selecione o professor'
                  : isEncarregado
                    ? `${currentUser.nome} · ${periodoLabel}`
                    : `${selectedProf?.nome} · ${periodoLabel}`}
              </p>
            </div>
          </div>
          <button onClick={onClose} className="w-8 h-8 rounded-lg hover:bg-[#f4f9f8] flex items-center justify-center transition-colors">
            <X className="w-5 h-5 text-[#4d7068]" />
          </button>
        </div>

        {/* Step 1 — Selecionar professor */}
        {step === 'select' && (
          <div className="flex-1 overflow-y-auto p-6">
            <p className="text-sm text-[#4d7068] mb-4">
              Escolha o professor cujos coachings pretende imprimir:
            </p>
            <div className="space-y-2">
              {professors.map(prof => {
                const count = aulas.filter(a => String(a.professorId) === prof.id && selectedStatuses.includes(a.status)).length;
                return (
                  <button
                    key={prof.id}
                    onClick={() => handleSelectProf(prof.id)}
                    className={`w-full flex items-center gap-4 p-4 rounded-xl border-2 text-left transition-all ${
                      selectedProfId === prof.id
                        ? 'border-[#0d6b5e] bg-[#e2f0ed]'
                        : 'border-[#0d6b5e]/10 bg-white hover:border-[#0d6b5e]/30 hover:bg-[#f4f9f8]'
                    }`}
                  >
                    <div className="w-10 h-10 rounded-full bg-[#0d6b5e] flex items-center justify-center shrink-0">
                      <User className="w-5 h-5 text-white" />
                    </div>
                    <div className="flex-1">
                      <p className="text-sm text-[#0a1a17]" style={{ fontWeight: 600 }}>{prof.nome}</p>
                      <p className="text-xs text-[#4d7068]">{prof.email}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-xl text-[#0d6b5e]" style={{ fontWeight: 700 }}>{count}</p>
                       <p className="text-xs text-[#4d7068]">coaching{count !== 1 ? 's' : ''}</p>
                    </div>
                    {selectedProfId === prof.id && (
                      <div className="w-5 h-5 rounded-full bg-[#0d6b5e] flex items-center justify-center shrink-0">
                        <svg viewBox="0 0 12 12" fill="none" className="w-3 h-3">
                          <path d="M2 6l3 3 5-5" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                        </svg>
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
            <div className="flex justify-end mt-6">
              <button
                onClick={() => setStep('preview')}
                disabled={!selectedProfId}
                className="flex items-center gap-2 px-6 py-2.5 bg-[#0d6b5e] text-white rounded-xl hover:bg-[#065147] transition-colors disabled:opacity-40 disabled:cursor-not-allowed text-sm"
                style={{ fontWeight: 500 }}
              >
                Ver pré-visualização <ChevronDown className="w-4 h-4 -rotate-90" />
              </button>
            </div>
          </div>
        )}

        {/* Step 2 — Preview */}
        {step === 'preview' && (
          <>
            <div className="flex-1 overflow-y-auto">

              {/* Filtro de datas */}
              <div className="px-6 pt-4 pb-4 border-b border-[#0d6b5e]/10 bg-[#f4f9f8]">
                <div className="flex items-center gap-2 mb-3">
                  <CalendarDays className="w-4 h-4 text-[#0d6b5e]" />
                  <span className="text-xs text-[#4d7068]" style={{ fontWeight: 600 }}>PERÍODO</span>
                  {!isEncarregado && hasRole(currentUser.role, 'DIRECAO') && (
                    <button
                      onClick={() => setStep('select')}
                      className="ml-auto flex items-center gap-1 text-xs text-[#0d6b5e] hover:text-[#065147] transition-colors"
                      style={{ fontWeight: 500 }}
                    >
                      <ChevronDown className="w-3.5 h-3.5 rotate-90" /> Mudar professor
                    </button>
                  )}
                </div>
                <div className="flex items-center gap-3 flex-wrap">
                  <div className="flex flex-col gap-1">
                    <label className="text-xs text-[#4d7068]">De</label>
                    <DatePicker
                      value={dateFrom}
                      max={dateTo || undefined}
                      onChange={(val) => { setDateFrom(val); setAlertaDateFrom(isDiaWarning(val)); }}
                      buttonClassName="px-3 py-2 rounded-xl bg-white"
                    />
                    {alertaDateFrom?.isWarning && (
                      <p className="text-xs text-red-500 mt-1 flex items-center gap-1">⚠️ {alertaDateFrom.mensagem}</p>
                    )}
                  </div>
                  <div className="flex flex-col gap-1">
                    <label className="text-xs text-[#4d7068]">Até</label>
                    <DatePicker
                      value={dateTo}
                      min={dateFrom || undefined}
                      onChange={(val) => { setDateTo(val); setAlertaDateTo(isDiaWarning(val)); }}
                      buttonClassName="px-3 py-2 rounded-xl bg-white"
                    />
                    {alertaDateTo?.isWarning && (
                      <p className="text-xs text-red-500 mt-1 flex items-center gap-1">⚠️ {alertaDateTo.mensagem}</p>
                    )}
                  </div>
                  <div className="flex flex-col gap-1 mt-auto">
                    <button
                      onClick={() => { setDateFrom(''); setDateTo(''); }}
                      className="px-3 py-2 rounded-xl border border-[#0d6b5e]/15 bg-white text-xs text-[#4d7068] hover:text-[#0d6b5e] hover:border-[#0d6b5e]/40 transition-colors"
                    >
                      Limpar datas
                    </button>
                  </div>
                  <div className="ml-auto flex items-end pb-0.5">
                    <span className="text-sm text-[#4d7068]">
                      <span className="text-[#0d6b5e]" style={{ fontWeight: 700 }}>{aulasFiltradas.length}</span>
                      {' '}coaching{aulasFiltradas.length !== 1 ? 's' : ''} encontrado{aulasFiltradas.length !== 1 ? 's' : ''}
                    </span>
                  </div>
                </div>

                {/* Filtro de estados */}
                <div className="mt-3">
                  <span className="text-xs text-[#4d7068]" style={{ fontWeight: 600 }}>ESTADOS</span>
                  <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                    {ALL_STATUSES.map(st => {
                      const active = selectedStatuses.includes(st);
                      return (
                        <button key={st}
                          onClick={() => setSelectedStatuses(prev =>
                            prev.includes(st) ? prev.filter(s => s !== st) : [...prev, st]
                          )}
                          className={`px-3 py-1.5 rounded-lg text-xs border transition-all ${
                            active
                              ? 'bg-[#0d6b5e] text-white border-[#0d6b5e]'
                              : 'bg-white text-[#4d7068] border-[#0d6b5e]/15 hover:border-[#0d6b5e]/40'
                          }`}
                        >
                          {STATUS_LABELS[st]}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Filtro de alunos (apenas ENCARREGADO) */}
                {isEncarregado && alunosList.length > 1 && (
                  <div className="mt-3">
                    <span className="text-xs text-[#4d7068]" style={{ fontWeight: 600 }}>ALUNOS</span>
                    <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                      <button
                        onClick={() => setSelectedAlunos(selectedAlunos.length === alunosList.length ? [] : alunosList.map(a => a.nome))}
                        className={`px-3 py-1.5 rounded-lg text-xs border transition-all ${
                          selectedAlunos.length === alunosList.length
                            ? 'bg-[#c9a84c] text-white border-[#c9a84c]'
                            : 'bg-white text-[#4d7068] border-[#0d6b5e]/15 hover:border-[#0d6b5e]/40'
                        }`}
                      >
                        {selectedAlunos.length === alunosList.length ? 'Todos' : 'Selecionar todos'}
                      </button>
                      {alunosList.map(aluno => {
                        const active = selectedAlunos.includes(aluno.nome);
                        return (
                          <button key={aluno.id}
                            onClick={() => setSelectedAlunos(prev =>
                              prev.includes(aluno.nome) ? prev.filter(n => n !== aluno.nome) : [...prev, aluno.nome]
                            )}
                            className={`px-3 py-1.5 rounded-lg text-xs border transition-all ${
                              active
                                ? 'bg-[#0d6b5e] text-white border-[#0d6b5e]'
                                : 'bg-white text-[#4d7068] border-[#0d6b5e]/15 hover:border-[#0d6b5e]/40'
                            }`}
                          >
                            {aluno.nome}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>

              {/* Conteúdo a imprimir */}
              <div className="p-6">
                <div ref={printRef}>
                  {/* Cabeçalho */}
                  <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:'20px', borderBottom:'2px solid #0d6b5e', paddingBottom:'14px' }}>
                    <div>
                      <div style={{ fontSize:'22px', fontWeight:700, color:'#0d6b5e', letterSpacing:'1px' }}>ENT'ARTES</div>
                      <div style={{ fontSize:'11px', color:'#4d7068', marginTop:'2px' }}>Escola de Dança · Relatório Interno</div>
                    </div>
                    <div style={{ textAlign:'right' }}>
                      <div style={{ fontSize:'15px', fontWeight:600, color:'#0a1a17' }}>Relatório de Coachings</div>
                      <div style={{ fontSize:'11px', color:'#4d7068', marginTop:'2px' }}>
                        Período: <strong>{periodoLabel}</strong>
                      </div>
                      <div style={{ fontSize:'11px', color:'#4d7068', marginTop:'1px' }}>
                        Gerado em {formatDate(new Date().toISOString())}
                      </div>
                    </div>
                  </div>

                  {/* Info professor / encarregado */}
                  <div style={{ background:'#f4f9f8', border:'1px solid #d1e8e4', borderRadius:'8px', padding:'10px 16px', marginBottom:'16px', display:'flex', gap:'32px', flexWrap:'wrap' }}>
                    <div>
                      <div style={{ fontSize:'10px', color:'#4d7068', textTransform:'uppercase', letterSpacing:'.5px' }}>{isEncarregado ? 'Encarregado' : 'Professor'}</div>
                      <div style={{ fontSize:'14px', fontWeight:600, color:'#0a1a17' }}>{isEncarregado ? currentUser.nome : selectedProf?.nome}</div>
                    </div>
                    <div>
                      <div style={{ fontSize:'10px', color:'#4d7068', textTransform:'uppercase', letterSpacing:'.5px' }}>Email</div>
                      <div style={{ fontSize:'13px', color:'#0a1a17' }}>{isEncarregado ? currentUser.email : selectedProf?.email}</div>
                    </div>
                    <div>
                      <div style={{ fontSize:'10px', color:'#4d7068', textTransform:'uppercase', letterSpacing:'.5px' }}>Período</div>
                      <div style={{ fontSize:'13px', fontWeight:600, color:'#0d6b5e' }}>{periodoLabel}</div>
                    </div>
                    <div>
                      <div style={{ fontSize:'10px', color:'#4d7068', textTransform:'uppercase', letterSpacing:'.5px' }}>Aulas no período</div>
                      <div style={{ fontSize:'13px', fontWeight:600, color:'#0d6b5e' }}>{aulasFiltradas.length}</div>
                    </div>
                  </div>

                  {/* Tabela */}
                  {aulasFiltradas.length === 0 ? (
                    <div className="text-center py-10 text-[#4d7068] text-sm">
                      Nenhum coaching encontrado com os filtros selecionados.
                    </div>
                  ) : (
                    <table style={{ width:'100%', borderCollapse:'collapse', marginBottom:'14px', fontSize:'12px' }}>
                      <thead>
                        <tr style={{ background:'#0d6b5e', color:'#fff' }}>
                          {['Data','Horário','Duração','Aluno','Estúdio','Modalidade','Estado'].map(h => (
                            <th key={h} style={{ padding:'9px 10px', textAlign:'left', fontSize:'10px', fontWeight:600, textTransform:'uppercase', letterSpacing:'.5px' }}>{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {aulasFiltradas.map((aula, idx) => (
                          <tr key={aula.id} style={{ background: idx % 2 === 0 ? '#fff' : '#f4f9f8' }}>
                            <td style={{ padding:'7px 10px', borderBottom:'1px solid #e2f0ed', color:'#0a1a17' }}>{formatDate(aula.data)}</td>
                            <td style={{ padding:'7px 10px', borderBottom:'1px solid #e2f0ed', color:'#0a1a17' }}>{aula.horaInicio} – {aula.horaFim}</td>
                            <td style={{ padding:'7px 10px', borderBottom:'1px solid #e2f0ed', color:'#4d7068' }}>{fmtDur(aula.duracao)}</td>
                            <td style={{ padding:'7px 10px', borderBottom:'1px solid #e2f0ed', color:'#0a1a17', fontWeight:500 }}>{aula.alunoNome}</td>
                            <td style={{ padding:'7px 10px', borderBottom:'1px solid #e2f0ed', color:'#4d7068' }}>{aula.estudioNome}</td>
                            <td style={{ padding:'7px 10px', borderBottom:'1px solid #e2f0ed' }}>
                              <span style={{ background:'#e2f0ed', color:'#0d6b5e', padding:'2px 8px', borderRadius:'999px', fontSize:'10px', fontWeight:600 }}>
                                {aula.modalidade}
                              </span>
                            </td>
                            <td style={{ padding:'7px 10px', borderBottom:'1px solid #e2f0ed' }}>
                              <span style={{
                                background: aula.status === 'PENDENTE' ? '#fdf6e3' : aula.status === 'REALIZADA' || aula.status === 'CONFIRMADA' ? '#e2f0ed' : '#fee2e2',
                                color: aula.status === 'PENDENTE' ? '#c9a84c' : aula.status === 'REALIZADA' || aula.status === 'CONFIRMADA' ? '#0d6b5e' : '#dc2626',
                                padding:'2px 8px', borderRadius:'999px', fontSize:'10px', fontWeight:600
                              }}>
                                {STATUS_LABELS[aula.status === 'REJEITADA' ? 'CANCELADA' : aula.status] || aula.status}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}

                  {/* Resumo */}
                  {aulasFiltradas.length > 0 && (
                    <div style={{ display:'flex', gap:'10px', marginTop:'12px', flexWrap:'wrap' }}>
                      <div style={{ flex:1, minWidth:'120px', border:'1px solid #d1e8e4', borderRadius:'8px', padding:'10px 12px', textAlign:'center' }}>
                        <div style={{ fontSize:'20px', fontWeight:700, color:'#0d6b5e' }}>{String(aulasFiltradas.length)}</div>
                        <div style={{ fontSize:'9px', color:'#4d7068', marginTop:'3px', textTransform:'uppercase', letterSpacing:'.5px' }}>Total coachings</div>
                      </div>
                      <div style={{ flex:1, minWidth:'120px', border:'1px solid #d1e8e4', borderRadius:'8px', padding:'10px 12px', textAlign:'center' }}>
                        <div style={{ fontSize:'20px', fontWeight:700, color:'#0d6b5e' }}>{fmtDur(totalMinutos)}</div>
                        <div style={{ fontSize:'9px', color:'#4d7068', marginTop:'3px', textTransform:'uppercase', letterSpacing:'.5px' }}>Total de horas</div>
                      </div>
                      {['REALIZADA','CONFIRMADA','PENDENTE','CANCELADA'].map(st => {
                        const count = aulasFiltradas.filter((a: any) => {
                          if (st === 'CANCELADA') return a.status === 'CANCELADA' || a.status === 'REJEITADA';
                          return a.status === st;
                        }).length;
                        if (count === 0) return null;
                        return (
                          <div key={st} style={{ flex:1, minWidth:'100px', border:'1px solid #d1e8e4', borderRadius:'8px', padding:'10px 12px', textAlign:'center' }}>
                            <div style={{ fontSize:'20px', fontWeight:700, color: st === 'REALIZADA' || st === 'CONFIRMADA' ? '#0d6b5e' : st === 'PENDENTE' ? '#c9a84c' : '#dc2626' }}>{String(count)}</div>
                            <div style={{ fontSize:'9px', color:'#4d7068', marginTop:'3px', textTransform:'uppercase', letterSpacing:'.5px' }}>{STATUS_LABELS[st]}</div>
                          </div>
                        );
                      })}
                    </div>
                  )}

                  {/* Rodapé */}
                  <div style={{ marginTop:'24px', borderTop:'1px solid #e2f0ed', paddingTop:'10px', fontSize:'10px', color:'#4d7068', display:'flex', justifyContent:'space-between' }}>
                    <span>ENT'ARTES — Escola de Dança · Documento gerado automaticamente</span>
                    <span style={{ color:'#c9a84c', fontWeight:600 }}>Confidencial</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="px-6 py-4 border-t border-[#0d6b5e]/10 flex items-center justify-between bg-[#f4f9f8]">
              <p className="text-xs text-[#4d7068]">
                <span style={{ fontWeight: 600 }}>{aulasFiltradas.length}</span> coaching{aulasFiltradas.length !== 1 ? 's' : ''}
                {' · '}
                <span style={{ fontWeight: 600 }}>{fmtDur(totalMinutos)}</span>
                {selectedStatuses.length < ALL_STATUSES.length && (
                  <> · Filtro: {selectedStatuses.map(s => STATUS_LABELS[s]).join(', ')}</>
                )}
              </p>
              <button
                onClick={handlePrint}
                disabled={aulasFiltradas.length === 0}
                className="flex items-center gap-2 px-5 py-2.5 bg-[#0d6b5e] text-white rounded-xl hover:bg-[#065147] transition-colors disabled:opacity-40 disabled:cursor-not-allowed text-sm"
                style={{ fontWeight: 500 }}
              >
                <Printer className="w-4 h-4" /> Imprimir / Guardar PDF
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}