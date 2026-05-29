import { ChevronLeft, ChevronRight } from 'lucide-react';

const MESES = ['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro'];
const DIAS_SEMANA = ['Dom','Seg','Ter','Qua','Qui','Sex','Sáb'];

interface CalendarioMiniProps {
  calMonth: number;
  calYear: number;
  diaSelected: number;
  porDia: Record<number, any[]>;
  totalSalas: number;
  onPrevMonth: () => void;
  onNextMonth: () => void;
  onDiaClick: (dia: number) => void;
}

function isHoje(dia: number, month: number, year: number) {
  const hoje = new Date();
  return dia === hoje.getDate() && month === hoje.getMonth() && year === hoje.getFullYear();
}

function calcularOcupacao(aulas: any[], totalSalas: number): { ocupadas: number; total: number; label: string; cor: string } {
  const confirmadasRealizadas = aulas.filter(a => {
    const st = (a.status || '').toUpperCase();
    return st === 'CONFIRMADA' || st === 'REALIZADA';
  });
  const salasOcupadas = new Set(confirmadasRealizadas.map(a => a.estudioNome).filter(Boolean));
  const ocupadas = salasOcupadas.size;
  const total = totalSalas;

  if (ocupadas === 0) return { ocupadas: 0, total, label: 'livre', cor: 'text-gray-400' };
  if (ocupadas >= total) return { ocupadas, total, label: 'lotado', cor: 'text-red-500' };
  return { ocupadas, total, label: `${ocupadas}/${total}`, cor: 'text-[#0d6b5e]' };
}

export function CalendarioMini({
  calMonth, calYear, diaSelected, porDia, totalSalas,
  onPrevMonth, onNextMonth, onDiaClick,
}: CalendarioMiniProps) {
  const primeiroDia = new Date(calYear, calMonth, 1).getDay();
  const diasNoMes = new Date(calYear, calMonth + 1, 0).getDate();

  const dias: (number | null)[] = [
    ...Array(primeiroDia).fill(null),
    ...Array.from({ length: diasNoMes }, (_, i) => i + 1),
  ];

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-[#0d6b5e]/8 overflow-hidden">
      <div className="flex items-center justify-between px-3 py-2 border-b border-[#0d6b5e]/8">
        <button onClick={onPrevMonth}
          className="p-1 text-[#4d7068] hover:text-[#0d6b5e] hover:bg-[#e2f0ed] rounded-lg transition-colors">
          <ChevronLeft className="w-3.5 h-3.5" />
        </button>
        <div className="text-center">
          <p className="text-[#0a1a17]" style={{ fontWeight: 600, fontSize: '0.8rem' }}>
            {MESES[calMonth]}
          </p>
          <p className="text-[10px] text-[#4d7068]">{calYear}</p>
        </div>
        <button onClick={onNextMonth}
          className="p-1 text-[#4d7068] hover:text-[#0d6b5e] hover:bg-[#e2f0ed] rounded-lg transition-colors">
          <ChevronRight className="w-3.5 h-3.5" />
        </button>
      </div>

        <div className="p-2">
        <div className="grid grid-cols-7 mb-0.5">
          {DIAS_SEMANA.map(d => (
            <div key={d} className="text-center text-[10px] text-[#4d7068]/60" style={{ fontWeight: 600 }}>
              {d}
            </div>
          ))}
        </div>


        <div className="grid grid-cols-7 gap-0.5">
          {dias.map((dia, idx) => {
            if (!dia) return <div key={idx} />;

            const aulasDoDia = porDia[dia] ?? [];
            const ocup = calcularOcupacao(aulasDoDia, totalSalas);
            const selected = diaSelected === dia;
            const hoje = isHoje(dia, calMonth, calYear);

            return (
              <button
                key={idx}
                onClick={() => onDiaClick(dia)}
                className={`
                  relative flex flex-col items-center py-1 rounded-lg transition-all cursor-pointer min-h-[36px]
                  ${selected ? 'bg-[#0d6b5e] shadow-sm' : hoje ? 'bg-[#e2f0ed]' : 'hover:bg-[#f4f9f8]'}
                `}
              >
                <span className={`text-[11px] leading-tight ${
                  selected ? 'text-white' : hoje ? 'text-[#0d6b5e]' : 'text-[#0a1a17]'
                }`} style={{ fontWeight: selected || hoje ? 700 : 500 }}>
                  {dia}
                </span>


                {aulasDoDia.length > 0 ? (
                  <span className={`text-[9px] mt-0.5 leading-tight ${selected ? 'text-white/80' : ocup.cor}`}>
                    {ocup.label}
                  </span>
                ) : (
                  <span className="text-[9px] mt-0.5 leading-tight text-gray-300">—</span>
                )}
              </button>
            );
          })}
        </div>


        <div className="flex flex-wrap items-center gap-x-2 gap-y-1 mt-2 pt-2 border-t border-[#0d6b5e]/8">
          <span className="text-[9px] text-[#4d7068]">Ocupação:</span>
          <span className="flex items-center gap-1 text-[9px]">
            <span className="w-1.5 h-1.5 rounded-full bg-[#0d6b5e]" /> Livre
          </span>
          <span className="flex items-center gap-1 text-[9px]">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-500" /> Parcial
          </span>
          <span className="flex items-center gap-1 text-[9px]">
            <span className="w-1.5 h-1.5 rounded-full bg-red-500" /> Lotado
          </span>
        </div>
      </div>
    </div>
  );
}
