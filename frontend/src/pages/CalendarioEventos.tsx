import { useState, useEffect, useMemo } from 'react';
import { Link, useNavigate } from 'react-router';
import { ChevronLeft, ChevronRight, Home, Calendar } from 'lucide-react';
import {
  startOfMonth, endOfMonth, startOfWeek, endOfWeek,
  eachDayOfInterval, isSameMonth, isToday,
  format, addMonths, subMonths, parse,
} from 'date-fns';
import api from '../services/api';

const MESES = ['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro'];

interface EventoCalendario {
  id: string;
  titulo: string;
  data: string | string[];
  tipo: string | null;
  hora: string | null;
  local: string;
  imagem: string;
}

export function CalendarioEventos() {
  const navigate = useNavigate();
  const [eventos, setEventos] = useState<EventoCalendario[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentMonth, setCurrentMonth] = useState(() => format(new Date(), 'yyyy-MM'));

  const currentDate = useMemo(() => parse(currentMonth, 'yyyy-MM', new Date()), [currentMonth]);

  useEffect(() => {
    const fetch = async () => {
      try {
        const res = await api.getEventos();
        if (res.success && res.data) setEventos(res.data);
      } catch { void 0 }
      finally { setLoading(false); }
    };
    fetch();
  }, []);

  const eventsByDate = useMemo(() => {
    const map = new Map<string, EventoCalendario[]>();
    for (const e of eventos) {
      const datas = Array.isArray(e.data) ? e.data : (e.data ? [e.data] : []);
      for (const d of datas) {
        if (!d) continue;
        const existing = map.get(d) || [];
        existing.push(e);
        map.set(d, existing);
      }
    }
    return map;
  }, [eventos]);

  const days = useMemo(() => {
    const start = startOfWeek(startOfMonth(currentDate), { weekStartsOn: 1 });
    const end = endOfWeek(endOfMonth(currentDate), { weekStartsOn: 1 });
    return eachDayOfInterval({ start, end });
  }, [currentDate]);

  const prevMonth = () => setCurrentMonth(format(subMonths(currentDate, 1), 'yyyy-MM'));
  const nextMonth = () => setCurrentMonth(format(addMonths(currentDate, 1), 'yyyy-MM'));
  const goToday = () => setCurrentMonth(format(new Date(), 'yyyy-MM'));

  if (loading) {
    return (
      <div className="min-h-screen bg-[#f4f9f8] flex items-center justify-center">
        <p className="text-[#4d7068]">A carregar...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f4f9f8]">
      <div className="bg-[#0a1a17] border-b border-white/5">
        <div className="max-w-5xl mx-auto px-4 py-6">
          <div className="mb-4 flex items-center gap-2 text-sm text-white/50">
            <Link to="/" className="hover:text-[#c9a84c] flex items-center gap-1 transition-colors">
              <Home className="w-4 h-4" /> Home
            </Link>
            <span>/</span>
            <Link to="/eventos" className="hover:text-[#c9a84c] transition-colors">Eventos</Link>
            <span>/</span>
            <span className="text-white/80">Calendário</span>
          </div>
          <h1 className="text-3xl text-white">Calendário de Eventos</h1>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <button onClick={prevMonth} className="p-2 hover:bg-[#deecea] rounded-lg transition-colors">
              <ChevronLeft className="w-5 h-5 text-[#0d6b5e]" />
            </button>
            <h2 className="text-2xl text-[#0a1a17] font-semibold min-w-[200px] text-center">
              {MESES[currentDate.getMonth()]} {currentDate.getFullYear()}
            </h2>
            <button onClick={nextMonth} className="p-2 hover:bg-[#deecea] rounded-lg transition-colors">
              <ChevronRight className="w-5 h-5 text-[#0d6b5e]" />
            </button>
          </div>
          <button
            onClick={goToday}
            className="px-4 py-2 text-sm bg-[#0d6b5e] text-white rounded-xl hover:bg-[#065147] transition-colors"
          >
            Hoje
          </button>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-[#0d6b5e]/8 overflow-hidden">
          <div className="grid grid-cols-7 bg-[#f4f9f8] border-b border-[#0d6b5e]/10">
            {['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb', 'Dom'].map(d => (
              <div key={d} className="px-3 py-3 text-xs font-semibold text-[#4d7068] text-center uppercase tracking-wider">
                {d}
              </div>
            ))}
          </div>

          <div className="grid grid-cols-7">
            {days.map((day, idx) => {
              const dateStr = format(day, 'yyyy-MM-dd');
              const dayEvents = eventsByDate.get(dateStr) || [];
              const isCurrentMonth = isSameMonth(day, currentDate);
              const isTodayDate = isToday(day);

              return (
                <div
                  key={idx}
                  className={`min-h-[100px] border-b border-r border-[#0d6b5e]/5 p-2 transition-colors ${
                    isCurrentMonth ? 'bg-white' : 'bg-[#fafcfb]'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span
                      className={`text-sm font-medium w-7 h-7 flex items-center justify-center rounded-full ${
                        isTodayDate
                          ? 'bg-[#0d6b5e] text-white'
                          : isCurrentMonth
                            ? 'text-[#0a1a17]'
                            : 'text-[#4d7068]/40'
                      }`}
                    >
                      {format(day, 'd')}
                    </span>
                  </div>
                  <div className="space-y-1">
                    {dayEvents.slice(0, 3).map(e => (
                      <button
                        key={e.id + dateStr}
                        onClick={() => navigate(`/eventos/${e.id}`)}
                        className="w-full text-left text-xs px-1.5 py-1 rounded-md bg-[#0d6b5e]/10 text-[#0d6b5e] hover:bg-[#0d6b5e]/20 transition-colors truncate leading-tight"
                        title={e.titulo}
                      >
                        {e.titulo}
                      </button>
                    ))}
                    {dayEvents.length > 3 && (
                      <p className="text-xs text-[#4d7068] pl-1">
                        +{dayEvents.length - 3} mais
                      </p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {eventos.length === 0 && (
          <div className="mt-8 text-center py-12 bg-white rounded-2xl border border-[#0d6b5e]/10">
            <Calendar className="w-12 h-12 text-[#0d6b5e]/30 mx-auto mb-3" />
            <p className="text-[#4d7068]">Nenhum evento encontrado.</p>
            <Link to="/eventos" className="mt-2 inline-block text-[#0d6b5e] hover:underline text-sm">
              Ver lista de eventos
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
