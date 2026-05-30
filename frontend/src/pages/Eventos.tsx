import { Link, useSearchParams } from 'react-router';
import { useState, useEffect, useMemo } from 'react';
import { Calendar, MapPin, ExternalLink, Home, Clock, Filter } from 'lucide-react';
import { format } from 'date-fns';
import api from '../services/api';
import { ImageWithFallback } from '../components/ui/ImageWithFallback';
import { DateWarningIcon } from '../components/DateAlerta';

const MESES = ['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro'];

const TIPOS_EVENTO = ['Workshop', 'Espetáculo', 'Prova', 'Gala', 'Reunião', 'Outro'];

function getPrimeiraData(e: any): string {
  if (!e.data) return '';
  const datas = Array.isArray(e.data) ? e.data : [e.data];
  return datas.filter(Boolean).sort()[0] || '';
}

function getUltimaData(e: any): string {
  if (!e.data) return '';
  const datas = Array.isArray(e.data) ? e.data : [e.data];
  return datas.filter(Boolean).sort().reverse()[0] || '';
}

function ePassado(e: any, hoje: Date): boolean {
  const ultima = getUltimaData(e);
  if (!ultima) return false;
  return new Date(ultima + 'T23:59:59') < hoje;
}

export function Eventos() {
  const [searchParams] = useSearchParams();
  const [eventos, setEventos] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [imagemZoom, setImagemZoom] = useState<string | null>(null);
  const [filtroMes, setFiltroMes] = useState<string>('TODOS');
  const [filtroTipo, setFiltroTipo] = useState<string>('TODOS');
  const [showFilters, setShowFilters] = useState(false);

  const hoje = useMemo(() => new Date(), []);

  useEffect(() => {
    const fetchEventos = async () => {
      try {
        const result = await api.getEventos();
        if (result.success && result.data) {
          setEventos(result.data);
        }
      } catch (error) {
        console.error('Error fetching eventos:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchEventos();
  }, []);

  useEffect(() => {
    const ref = searchParams.get('ref');
    if (!ref || loading) return;

    window.setTimeout(() => {
      document.getElementById(`evento-${ref}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }, 100);
  }, [searchParams, loading]);

  const filtered = useMemo(() => {
    return eventos.filter(e => {
      if (filtroTipo !== 'TODOS' && e.tipo !== filtroTipo) return false;
      if (filtroMes !== 'TODOS') {
        const primeira = getPrimeiraData(e);
        if (!primeira) return false;
        const mes = new Date(primeira + 'T00:00:00').getMonth();
        if (mes !== parseInt(filtroMes)) return false;
      }
      return true;
    });
  }, [eventos, filtroMes, filtroTipo]);

  const eventosDestaque = useMemo(() =>
    filtered.filter(e => e.destaque && !ePassado(e, hoje)),
  [filtered, hoje]);

  const outrosFuturos = useMemo(() =>
    filtered.filter(e => !e.destaque && !ePassado(e, hoje)),
  [filtered, hoje]);

  const eventosPassados = useMemo(() =>
    filtered.filter(e => ePassado(e, hoje)),
  [filtered, hoje]);

  const mesesDisponiveis = useMemo(() => {
    const set = new Set<number>();
    eventos.forEach(e => {
      const d = getPrimeiraData(e);
      if (d) set.add(new Date(d + 'T00:00:00').getMonth());
    });
    return Array.from(set).sort((a, b) => b - a);
  }, [eventos]);

  const tiposDisponiveis = useMemo(() => {
    const set = new Set<string>();
    eventos.forEach(e => { if (e.tipo) set.add(e.tipo); });
    return Array.from(set).sort();
  }, [eventos]);

  return (
    <div className="min-h-screen bg-[#f4f9f8]">
      {/* Header */}
      <section className="bg-[#0a1a17] text-white py-24 px-4 relative overflow-hidden">
        <div className="absolute inset-0 opacity-20"
          style={{
            backgroundImage: `radial-gradient(circle at 30% 50%, #c9a84c 0%, transparent 50%),
                              radial-gradient(circle at 70% 30%, #0d6b5e 0%, transparent 50%)`
          }}
        />
        <div className="max-w-6xl mx-auto relative z-10">
          <div className="mb-6 flex items-center gap-2 text-sm text-white/50">
            <Link to="/" className="hover:text-[#c9a84c] flex items-center gap-1 transition-colors">
              <Home className="w-4 h-4" />
              Home
            </Link>
            <span>/</span>
            <span className="text-white/80">Eventos</span>
          </div>

          <div className="text-center">
            <span className="text-[#c9a84c] tracking-widest uppercase text-sm">Agenda</span>
            <h1 className="text-5xl md:text-6xl mt-2 mb-4">Eventos</h1>
            <p className="text-xl text-white/70">
              Acompanhe os próximos espetáculos e workshops da ENT'ART
            </p>
          </div>
        </div>
      </section>

      {loading ? (
        <div className="text-center py-16 text-[#4d7068]">A carregar eventos...</div>
      ) : eventos.length === 0 ? (
        <section className="py-16 px-4">
          <div className="max-w-6xl mx-auto text-center">
            <Calendar className="w-16 h-16 text-[#0d6b5e]/30 mx-auto mb-4" />
            <p className="text-[#4d7068] text-lg">Nenhum evento disponível de momento.</p>
          </div>
        </section>
      ) : (
        <>
          {/* Filter bar */}
          <section className="py-4 px-4 bg-white border-b border-[#0d6b5e]/8">
            <div className="max-w-6xl mx-auto">
              <button
                onClick={() => setShowFilters(!showFilters)}
                className="flex items-center gap-1 text-sm text-[#4d7068] hover:text-[#0d6b5e] transition-colors"
              >
                <Filter className="w-4 h-4" />
                {showFilters ? 'Ocultar filtros' : 'Filtrar eventos'}
                {(filtroMes !== 'TODOS' || filtroTipo !== 'TODOS') && (
                  <span className="ml-1 text-xs bg-[#0d6b5e]/10 text-[#0d6b5e] px-1.5 py-0.5 rounded-full">
                    {(filtroMes !== 'TODOS' ? 1 : 0) + (filtroTipo !== 'TODOS' ? 1 : 0)} activo(s)
                  </span>
                )}
              </button>

              {showFilters && (
                <div className="flex flex-wrap items-center gap-3 mt-3">
                  <select value={filtroMes} onChange={e => setFiltroMes(e.target.value)}
                    className="text-sm px-3 py-1.5 border border-[#0d6b5e]/20 rounded-lg bg-[#f4f9f8] focus:outline-none focus:border-[#0d6b5e] text-[#0a1a17]">
                    <option value="TODOS">Todos os meses</option>
                    {mesesDisponiveis.map(m => (
                      <option key={m} value={m}>{MESES[m]}</option>
                    ))}
                  </select>

                  <select value={filtroTipo} onChange={e => setFiltroTipo(e.target.value)}
                    className="text-sm px-3 py-1.5 border border-[#0d6b5e]/20 rounded-lg bg-[#f4f9f8] focus:outline-none focus:border-[#0d6b5e] text-[#0a1a17]">
                    <option value="TODOS">Todos os tipos</option>
                    {tiposDisponiveis.map(t => (
                      <option key={t} value={t}>{t}</option>
                    ))}
                  </select>

                  {(filtroMes !== 'TODOS' || filtroTipo !== 'TODOS') && (
                    <button onClick={() => { setFiltroMes('TODOS'); setFiltroTipo('TODOS'); }}
                      className="text-xs text-red-600 hover:underline">
                      Limpar filtros
                    </button>
                  )}
                </div>
              )}
            </div>
          </section>

          {/* Em Destaque */}
          {eventosDestaque.length > 0 && (
            <section className="py-16 px-4">
              <div className="max-w-6xl mx-auto">
                <div className="flex items-center gap-3 mb-8">
                  <div className="w-8 h-0.5 bg-[#c9a84c]" />
                  <h2 className="text-3xl text-[#0a1a17]">Em Destaque</h2>
                </div>
                <div className="grid md:grid-cols-2 gap-8">
                  {eventosDestaque.map(evento => (
                    <EventoCard key={evento.id} evento={evento} searchParams={searchParams}
                      onImagemZoom={setImagemZoom} />
                  ))}
                </div>
              </div>
            </section>
          )}

          {/* Próximos Eventos */}
          {outrosFuturos.length > 0 && (
            <section className={`py-16 px-4 ${eventosDestaque.length > 0 ? 'bg-white' : ''}`}>
              <div className="max-w-6xl mx-auto">
                <div className="flex items-center gap-3 mb-8">
                  <div className="w-8 h-0.5 bg-[#c9a84c]" />
                  <h2 className="text-3xl text-[#0a1a17]">Próximos Eventos</h2>
                  <span className="text-sm text-[#4d7068]">({outrosFuturos.length})</span>
                </div>
                <div className="grid md:grid-cols-3 gap-6">
                  {outrosFuturos.map(evento => (
                    <EventoCardSmall key={evento.id} evento={evento} searchParams={searchParams}
                      onImagemZoom={setImagemZoom} />
                  ))}
                </div>
              </div>
            </section>
          )}

          {/* Eventos Passados */}
          {eventosPassados.length > 0 && (
            <section className="py-16 px-4 bg-white">
              <div className="max-w-6xl mx-auto">
                <div className="flex items-center gap-3 mb-8">
                  <div className="w-8 h-0.5 bg-gray-300" />
                  <h2 className="text-3xl text-gray-400">Arquivo</h2>
                  <span className="text-sm text-gray-400">({eventosPassados.length})</span>
                </div>
                <div className="grid md:grid-cols-3 gap-6">
                  {eventosPassados.map(evento => (
                    <EventoCardSmall key={evento.id} evento={evento} searchParams={searchParams}
                      onImagemZoom={setImagemZoom} passado />
                  ))}
                </div>
              </div>
            </section>
          )}
        </>
      )}

      {imagemZoom && (
        <div
          className="fixed inset-0 bg-black/90 z-50 flex items-center justify-center p-4 cursor-zoom-out"
          onClick={() => setImagemZoom(null)}
        >
          <div className="relative max-w-4xl w-full">
            <ImageWithFallback
              src={imagemZoom}
              alt="Imagem ampliada"
              className="w-full h-auto max-h-[90vh] object-contain rounded-lg"
            />
            <button
              className="absolute top-2 right-2 bg-white/10 hover:bg-white/20 text-white p-2 rounded-full transition-colors"
              onClick={() => setImagemZoom(null)}
            >
              ✕
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

/* ── Big featured card ── */
function EventoCard({ evento, searchParams, onImagemZoom }: any) {
  return (
    <div
      id={`evento-${evento.id}`}
      className={`bg-white rounded-2xl shadow-lg overflow-hidden border border-[#0d6b5e]/5 transition-all duration-300 ease-out hover:-translate-y-2 hover:shadow-2xl hover:shadow-[#0d6b5e]/10 cursor-pointer group scroll-mt-24 ${searchParams.get('ref') === String(evento.id) ? 'ring-2 ring-[#c9a84c]' : ''}`}
    >
      <div className="relative overflow-hidden">
        <ImageWithFallback
          src={evento.imagem}
          alt={evento.titulo}
          className="w-full h-64 object-contain bg-[#f0f0f0] transition-transform duration-500 group-hover:scale-105 cursor-zoom-in"
          onClick={() => evento.imagem && onImagemZoom(evento.imagem)}
        />
        <div className="absolute top-4 left-4 flex gap-2">
          {evento.tipo && (
            <span className="bg-[#0d6b5e] text-white px-3 py-1 rounded-full text-xs" style={{ fontWeight: 600 }}>
              {evento.tipo}
            </span>
          )}
          <span className="bg-[#c9a84c] text-[#0a1a17] px-3 py-1 rounded-full text-xs" style={{ fontWeight: 600 }}>
            Destaque
          </span>
        </div>
      </div>
      <div className="p-6">
        <h3 className="text-2xl mb-3 text-[#0a1a17]">{evento.titulo}</h3>
        <p className="text-[#4d7068] mb-4">{evento.descricao}</p>

        <div className="space-y-2 mb-5">
          <div className="flex items-center gap-2 text-[#0a1a17]">
            <Calendar className="w-5 h-5 text-[#0d6b5e]" />
            <span>
              {evento.data && evento.data.length > 0
                ? evento.data.map((d: string, i: number) => (
                    <span key={i}>
                      {i > 0 && ', '}
                      <DateWarningIcon data={d} />
                      {format(new Date(d + 'T00:00:00'), "dd/MM/yyyy")}
                    </span>
                  ))
                : 'Data não definida'}
            </span>
          </div>
          {evento.hora && (
            <div className="flex items-center gap-2 text-[#0a1a17]">
              <Clock className="w-5 h-5 text-[#0d6b5e]" />
              <span>{evento.hora}</span>
            </div>
          )}
          <div className="flex items-center gap-2 text-[#0a1a17]">
            <MapPin className="w-5 h-5 text-[#0d6b5e]" />
            <span>{evento.local}</span>
          </div>
        </div>

        {evento.linkBilhetes && (
          <a
            href={evento.linkBilhetes}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 bg-[#0d6b5e] text-white px-6 py-3 rounded-xl hover:bg-[#065147] transition-colors"
            style={{ fontWeight: 600 }}
          >
            Comprar Bilhetes
            <ExternalLink className="w-4 h-4" />
          </a>
        )}
      </div>
    </div>
  );
}

/* ── Small card (future or archive) ── */
function EventoCardSmall({ evento, searchParams, onImagemZoom, passado }: any) {
  return (
    <div
      id={`evento-${evento.id}`}
      className={`rounded-2xl overflow-hidden border transition-all duration-300 ease-out hover:-translate-y-2 hover:shadow-xl cursor-pointer group scroll-mt-24 ${searchParams.get('ref') === String(evento.id) ? 'ring-2 ring-[#c9a84c]' : ''} ${passado ? 'bg-gray-50 border-gray-200 opacity-70 hover:opacity-100' : 'bg-[#f4f9f8] border-[#0d6b5e]/5 hover:shadow-[#0d6b5e]/10'}`}
    >
      <div className="overflow-hidden">
        <ImageWithFallback
          src={evento.imagem}
          alt={evento.titulo}
          className={`w-full h-48 object-contain bg-[#f0f0f0] transition-transform duration-500 group-hover:scale-105 cursor-zoom-in ${passado ? 'grayscale' : ''}`}
          onClick={() => evento.imagem && onImagemZoom(evento.imagem)}
        />
      </div>
      <div className="p-5">
        <div className="flex items-center gap-2 mb-2 flex-wrap">
          {evento.tipo && (
            <span className={`text-xs px-2 py-0.5 rounded-full ${passado ? 'bg-gray-200 text-gray-500' : 'bg-[#0d6b5e]/10 text-[#0d6b5e]'}`}>
              {evento.tipo}
            </span>
          )}
          {passado && (
            <span className="text-xs bg-gray-200 text-gray-500 px-2 py-0.5 rounded-full">Concluído</span>
          )}
        </div>
        <h3 className={`text-xl mb-2 ${passado ? 'text-gray-500' : 'text-[#0a1a17]'}`}>{evento.titulo}</h3>
        <p className={`text-sm mb-4 line-clamp-2 ${passado ? 'text-gray-400' : 'text-[#4d7068]'}`}>{evento.descricao}</p>

        <div className="space-y-2 mb-4">
          <div className="flex items-center gap-2 text-sm">
            <Calendar className={`w-4 h-4 ${passado ? 'text-gray-400' : 'text-[#0d6b5e]'}`} />
            <span className={passado ? 'text-gray-400' : 'text-[#0a1a17]'}>
              {evento.data && evento.data.length > 0
                ? evento.data.map((d: string, i: number) => (
                    <span key={i}>
                      {i > 0 && ', '}
                      <DateWarningIcon data={d} />
                      {format(new Date(d + 'T00:00:00'), "dd/MM/yyyy")}
                    </span>
                  ))
                : 'Data não definida'}
            </span>
          </div>
          {evento.hora && (
            <div className="flex items-center gap-2 text-sm">
              <Clock className={`w-4 h-4 ${passado ? 'text-gray-400' : 'text-[#0d6b5e]'}`} />
              <span className={passado ? 'text-gray-400' : 'text-[#0a1a17]'}>{evento.hora}</span>
            </div>
          )}
          <div className="flex items-center gap-2 text-sm">
            <MapPin className={`w-4 h-4 ${passado ? 'text-gray-400' : 'text-[#0d6b5e]'}`} />
            <span className={`line-clamp-1 ${passado ? 'text-gray-400' : 'text-[#0a1a17]'}`}>{evento.local}</span>
          </div>
        </div>

        {evento.linkBilhetes && !passado && (
          <a
            href={evento.linkBilhetes}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 text-[#0d6b5e] hover:text-[#065147] transition-colors text-sm"
            style={{ fontWeight: 600 }}
          >
            Ver Detalhes
            <ExternalLink className="w-3 h-3" />
          </a>
        )}
      </div>
    </div>
  );
}
