import { useState, useMemo } from 'react';
import { AlertCircle, Filter } from 'lucide-react';
import { PedidoAula } from '../types';

const MESES_PT = ['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez'];
const DIAS_SEMANA_PT = ['Domingo','Segunda-feira','Terça-feira','Quarta-feira','Quinta-feira','Sexta-feira','Sábado'];

const HORAS = [
  '08:00','09:00','10:00','11:00','12:00',
  '13:00','14:00','15:00','16:00','17:00',
  '18:00','19:00','20:00','21:00',
];

type EstadoExibicao = 'REALIZADA' | 'PENDENTE_APROVACAO' | 'POR_REALIZAR' | 'OUTROS';

function mapearEstado(aula: PedidoAula, hoje: Date): EstadoExibicao {
  const raw = (aula.status || '').toUpperCase();
  if (raw === 'REALIZADA' || raw === 'CONCLUÍDO') return 'REALIZADA';
  if (raw === 'PENDENTE' || raw === 'APROVADA') return 'PENDENTE_APROVACAO';
  if (raw === 'CONFIRMADA') {
    const dataAula = new Date(aula.data + 'T' + (aula.horaInicio || '00:00'));
    return dataAula <= hoje ? 'REALIZADA' : 'POR_REALIZAR';
  }
  return 'OUTROS';
}

const STATUS_EXIBICAO: Record<EstadoExibicao, { label: string; bg: string; border: string; text: string; badge: string }> = {
  REALIZADA:           { label: 'Realizada',             bg: 'bg-gray-50',   border: 'border-gray-300', text: 'text-gray-700',  badge: 'bg-gray-500' },
  PENDENTE_APROVACAO:  { label: 'Pendente de aprovação', bg: 'bg-amber-50',  border: 'border-amber-300', text: 'text-amber-800', badge: 'bg-amber-500' },
  POR_REALIZAR:        { label: 'Por realizar',          bg: 'bg-green-50',  border: 'border-green-300', text: 'text-green-800', badge: 'bg-green-500' },
  OUTROS:              { label: 'Outros',                bg: 'bg-gray-100',  border: 'border-gray-200',  text: 'text-gray-500',  badge: 'bg-gray-400' },
};

function formatHora(v: any): string {
  if (!v) return '';
  const s = String(v);
  const raw = s.includes('T') ? s.substring(11, 16) : s.substring(0, 5);
  const [h, m] = raw.split(':').map(Number);
  if (isNaN(h) || isNaN(m)) return '';
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

function paraMin(h: string): number {
  const [h2, m] = h.split(':').map(Number);
  return h2 * 60 + (m || 0);
}

interface OcupacaoSalasProps {
  salas: { id: string; nome: string }[];
  aulas: PedidoAula[];
  calMonth: number;
  calYear: number;
  diaSelected: number;
  onAulaClick?: (aula: PedidoAula) => void;
}

export function OcupacaoSalas({
  salas, aulas, calMonth, calYear, diaSelected, onAulaClick,
}: OcupacaoSalasProps) {
  const hoje = useMemo(() => new Date(), []);

  // Only show CONFIRMADA coachings in the schedule
  const aulasConfirmadas = useMemo(() => {
    return aulas.filter(a => (a.status || '').toUpperCase() === 'CONFIRMADA');
  }, [aulas]);

  const [filtroSala, setFiltroSala] = useState<string>('TODAS');
  const [filtroEstado, setFiltroEstado] = useState<string>('TODOS');
  const [filtroOcupacao, setFiltroOcupacao] = useState<string>('TODAS');

  const professores = useMemo(() => {
    const set = new Set<string>();
    aulasConfirmadas.forEach(a => { if (a.professorNome) set.add(a.professorNome); });
    return Array.from(set).sort();
  }, [aulasConfirmadas]);

  const modalidades = useMemo(() => {
    const set = new Set<string>();
    aulasConfirmadas.forEach(a => { if (a.modalidade) set.add(a.modalidade); });
    return Array.from(set).sort();
  }, [aulasConfirmadas]);

  const [filtroProfessor, setFiltroProfessor] = useState<string>('TODOS');
  const [filtroModalidade, setFiltroModalidade] = useState<string>('TODAS');
  const [showFilters, setShowFilters] = useState(false);

  // Map CONFIRMADA to display state (past → REALIZADA, future → POR_REALIZAR)
  const aulasComEstado = useMemo(() => {
    return aulasConfirmadas.map(a => ({ aula: a, estadoExib: mapearEstado(a, hoje) }));
  }, [aulasConfirmadas, hoje]);

  // Grid-level UI filters (applied on top of CONFIRMADA-only)
  const aulasFiltradas = useMemo(() => {
    return aulasComEstado.filter(({ aula, estadoExib }) => {
      if (filtroSala !== 'TODAS' && aula.estudioNome !== filtroSala) return false;
      if (filtroEstado !== 'TODOS' && estadoExib !== filtroEstado) return false;
      if (filtroProfessor !== 'TODOS' && aula.professorNome !== filtroProfessor) return false;
      if (filtroModalidade !== 'TODAS' && aula.modalidade !== filtroModalidade) return false;
      return true;
    });
  }, [aulasComEstado, filtroSala, filtroEstado, filtroProfessor, filtroModalidade]);

  // Counters from ALL CONFIRMADA (unfiltered), matched against actual salas
  const salasOcupadasSet = useMemo(() => {
    return new Set(
      aulasConfirmadas
        .map(a => a.estudioNome)
        .filter(Boolean)
        .filter(nome => salas.some(s => s.nome === nome))
    );
  }, [aulasConfirmadas, salas]);
  const totalSalas = salas.length || 1;
  const resumo = {
    ocupadas: salasOcupadasSet.size,
    livres: totalSalas - salasOcupadasSet.size,
    totalAulas: aulasConfirmadas.length,
    realizadas: aulasComEstado.filter(({ estadoExib }) => estadoExib === 'REALIZADA').length,
    pendentes: aulasComEstado.filter(({ estadoExib }) => estadoExib === 'PENDENTE_APROVACAO').length,
    porRealizar: aulasComEstado.filter(({ estadoExib }) => estadoExib === 'POR_REALIZAR').length,
  };

  const diaSemana = diaSelected ? DIAS_SEMANA_PT[new Date(calYear, calMonth, diaSelected).getDay()] : '';
  const dataResumo = diaSelected
    ? `${diaSemana}, ${diaSelected} ${MESES_PT[calMonth]} ${calYear}`
    : '';

  const grid = useMemo(() => {
    const mapa: Record<string, Record<string, { aula: PedidoAula; estadoExib: EstadoExibicao }[]>> = {};
    HORAS.forEach(h => {
      mapa[h] = {};
      salas.forEach(s => { mapa[h][s.nome] = []; });
    });

    aulasFiltradas.forEach(({ aula, estadoExib }) => {
      const inicio = paraMin(formatHora(aula.horaInicio));
      const fim = paraMin(formatHora(aula.horaFim));
      if (!aula.estudioNome) return;

      HORAS.forEach(h => {
        const hMin = paraMin(h);
        if (hMin >= inicio && hMin < fim) {
          if (!mapa[h][aula.estudioNome]) mapa[h][aula.estudioNome] = [];
          mapa[h][aula.estudioNome].push({ aula, estadoExib });
        }
      });
    });

    return mapa;
  }, [aulasFiltradas, salas]);

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-[#0d6b5e]/8 flex flex-col overflow-hidden">
      {diaSelected ? (
        <div className="px-4 py-3 border-b border-[#0d6b5e]/8">
          <p className="text-xs text-[#4d7068] mb-0.5">{diaSemana}</p>
          <p className="text-[#0a1a17]" style={{ fontWeight: 700, fontSize: '1.15rem' }}>
            {diaSelected} <span className="text-[#4d7068]" style={{ fontWeight: 400, fontSize: '0.85rem' }}>{MESES_PT[calMonth]}</span>
          </p>
          <div className="flex items-center gap-3 mt-2 flex-wrap text-xs">
            <span className="text-[#4d7068]"><strong>{resumo.ocupadas}</strong>/{totalSalas} salas ocupadas</span>
            <span className="text-[#0d6b5e]">{resumo.livres} livre{resumo.livres !== 1 ? 's' : ''}</span>
            <span className="text-gray-500">{resumo.realizadas} realizada{resumo.realizadas !== 1 ? 's' : ''}</span>
            <span className="text-amber-600">{resumo.pendentes} pendente{resumo.pendentes !== 1 ? 's' : ''}</span>
            <span className="text-green-600">{resumo.porRealizar} por realizar</span>
          </div>
        </div>
      ) : (
        <div className="px-4 py-3 border-b border-[#0d6b5e]/8">
          <p className="text-sm text-[#4d7068]">Selecione um dia no calendário</p>
        </div>
      )}

      <div className="px-4 py-1.5 border-b border-[#0d6b5e]/8">
        <button
          onClick={() => setShowFilters(!showFilters)}
          className="flex items-center gap-1 text-xs text-[#4d7068] hover:text-[#0d6b5e] transition-colors"
        >
          <Filter className="w-3 h-3" />
          {showFilters ? 'Ocultar filtros' : 'Filtros'}
        </button>

        {showFilters && (
          <div className="flex flex-wrap items-center gap-2 mt-1.5 pb-1.5">
            <select value={filtroSala} onChange={e => setFiltroSala(e.target.value)}
              className="text-[11px] px-1.5 py-1 border border-[#0d6b5e]/20 rounded bg-[#f4f9f8] focus:outline-none">
              <option value="TODAS">Todas as salas</option>
              {salas.map(s => <option key={s.id} value={s.nome}>{s.nome}</option>)}
            </select>

            <select value={filtroEstado} onChange={e => setFiltroEstado(e.target.value)}
              className="text-[11px] px-1.5 py-1 border border-[#0d6b5e]/20 rounded bg-[#f4f9f8] focus:outline-none">
              <option value="TODOS">Todos os estados</option>
              <option value="REALIZADA">Realizadas</option>
              <option value="PENDENTE_APROVACAO">Pendentes de aprovação</option>
              <option value="POR_REALIZAR">Por realizar</option>
            </select>

            <select value={filtroOcupacao} onChange={e => setFiltroOcupacao(e.target.value)}
              className="text-[11px] px-1.5 py-1 border border-[#0d6b5e]/20 rounded bg-[#f4f9f8] focus:outline-none">
              <option value="TODAS">Todas</option>
              <option value="OCUPADAS">Apenas ocupadas</option>
              <option value="LIVRES">Apenas livres</option>
            </select>

            {professores.length > 0 && (
              <select value={filtroProfessor} onChange={e => setFiltroProfessor(e.target.value)}
                className="text-[11px] px-1.5 py-1 border border-[#0d6b5e]/20 rounded bg-[#f4f9f8] focus:outline-none">
                <option value="TODOS">Todos os professores</option>
                {professores.map(p => <option key={p} value={p}>{p}</option>)}
              </select>
            )}

            {modalidades.length > 0 && (
              <select value={filtroModalidade} onChange={e => setFiltroModalidade(e.target.value)}
                className="text-[11px] px-1.5 py-1 border border-[#0d6b5e]/20 rounded bg-[#f4f9f8] focus:outline-none">
                <option value="TODAS">Todas as modalidades</option>
                {modalidades.map(m => <option key={m} value={m}>{m}</option>)}
              </select>
            )}
          </div>
        )}
      </div>

      <div className="flex-1 overflow-auto">
        <table className="w-full border-collapse">
          <thead>
            <tr className="sticky top-0 bg-white z-10">
              <th className="text-left text-[10px] text-[#4d7068] px-2 py-1.5 border-b border-r border-[#0d6b5e]/8 whitespace-nowrap sticky left-0 bg-white z-20">
                Hora
              </th>
              {salas.filter(s => filtroSala === 'TODAS' || s.nome === filtroSala).map(s => (
                <th key={s.id} className="text-left text-[10px] text-[#4d7068] px-2 py-1.5 border-b border-[#0d6b5e]/8 whitespace-nowrap">
                  {s.nome}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {HORAS.map(h => {
              const salasVisiveis = salas.filter(s => filtroSala === 'TODAS' || s.nome === filtroSala);
              const rowHasOcupadas = salasVisiveis.some(s => (grid[h]?.[s.nome]?.length ?? 0) > 0);
              if (filtroOcupacao === 'OCUPADAS' && !rowHasOcupadas) return null;
              if (filtroOcupacao === 'LIVRES' && rowHasOcupadas) return null;

              return (
                <tr key={h} className="border-b border-[#0d6b5e]/4">
                  <td className="text-[10px] text-[#4d7068] px-2 py-1.5 border-r border-[#0d6b5e]/8 whitespace-nowrap sticky left-0 bg-white">
                    {h}
                  </td>
                  {salasVisiveis.map(s => {
                    const entradas = grid[h]?.[s.nome] ?? [];
                    if (entradas.length === 0) {
                      return (
                        <td key={s.id} className="px-2 py-2 text-center">
                          <span className="text-[9px] text-gray-300 italic">Livre</span>
                        </td>
                      );
                    }

                    const { aula, estadoExib } = entradas[0];
                    const cor = STATUS_EXIBICAO[estadoExib] || STATUS_EXIBICAO.OUTROS;

                    return (
                      <td
                        key={s.id}
                        className={`px-2 py-1 ${cor.bg} cursor-pointer hover:opacity-80 transition-opacity`}
                        onClick={() => onAulaClick?.(aula)}
                      >
                        <div className="space-y-0 leading-tight min-w-[110px] max-w-[180px]">
                          <div className="flex items-center justify-between gap-1">
                            <span className="text-[11px] font-semibold text-[#0a1a17] truncate">
                              {aula.modalidade}
                            </span>
                            <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${cor.badge}`} />
                          </div>
                          <p className="text-[9px] text-[#4d7068]">
                            {formatHora(aula.horaInicio)} - {formatHora(aula.horaFim)}
                          </p>
                          <p className="text-[9px] text-[#4d7068] truncate">
                            Prof.: {aula.professorNome}
                          </p>
                          {aula.alunoNome && (
                            <p className="text-[9px] text-[#4d7068] truncate">
                              Aluno: {aula.alunoNome}
                            </p>
                          )}
                          <span className={`inline-block text-[8px] px-1 py-0.5 rounded-full font-medium ${cor.bg} ${cor.text} leading-tight`}>
                            {cor.label}
                          </span>
                        </div>
                      </td>
                    );
                  })}
                </tr>
              );
            })}
          </tbody>
        </table>

        {diaSelected && aulasFiltradas.length === 0 && (
          <div className="flex items-center justify-center gap-2 py-8 text-gray-400">
            <AlertCircle className="w-4 h-4" />
            <span className="text-xs">Nenhuma reserva encontrada com os filtros atuais</span>
          </div>
        )}
      </div>
    </div>
  );
}
