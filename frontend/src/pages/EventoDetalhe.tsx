import { Link, useParams } from 'react-router';
import { useState, useEffect } from 'react';
import { Calendar, MapPin, Clock, ArrowLeft, ExternalLink, Home } from 'lucide-react';
import { format } from 'date-fns';
import api from '../services/api';
import { ImageWithFallback } from '../components/ui/ImageWithFallback';
import { DateWarningIcon } from '../components/DateAlerta';

export function EventoDetalhe() {
  const { id } = useParams();
  const [evento, setEvento] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [imagemZoom, setImagemZoom] = useState<string | null>(null);
  const [erro, setErro] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    const fetch = async () => {
      try {
        const res = await api.getEventoById(parseInt(id));
        if (res.success && res.data) {
          setEvento(res.data);
        } else {
          setErro('Evento não encontrado');
        }
      } catch {
        setErro('Erro ao carregar evento');
      } finally {
        setLoading(false);
      }
    };
    fetch();
  }, [id]);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#f4f9f8] flex items-center justify-center">
        <p className="text-[#4d7068]">A carregar...</p>
      </div>
    );
  }

  if (erro || !evento) {
    return (
      <div className="min-h-screen bg-[#f4f9f8] flex flex-col items-center justify-center gap-4">
        <p className="text-[#4d7068] text-lg">{erro || 'Evento não encontrado'}</p>
        <Link to="/eventos" className="text-[#0d6b5e] hover:underline flex items-center gap-1">
          <ArrowLeft className="w-4 h-4" /> Voltar para eventos
        </Link>
      </div>
    );
  }

  const datas = Array.isArray(evento.data) ? evento.data : (evento.data ? [evento.data] : []);

  return (
    <div className="min-h-screen bg-[#f4f9f8]">
      {/* Hero */}
      <section className="relative overflow-hidden">
        {evento.imagem ? (
          <div className="relative h-[50vh] md:h-[60vh]">
            <ImageWithFallback
              src={evento.imagem}
              alt={evento.titulo}
              className="w-full h-full object-cover cursor-zoom-in"
              onClick={() => setImagemZoom(evento.imagem)}
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-transparent" />
          </div>
        ) : (
          <div className="h-[30vh] bg-[#0a1a17] flex items-center justify-center">
            <Calendar className="w-16 h-16 text-white/20" />
          </div>
        )}

        <div className="absolute bottom-0 left-0 right-0 p-6 md:p-12">
          <div className="max-w-4xl mx-auto">
            <div className="mb-4 flex items-center gap-2 text-sm text-white/50">
              <Link to="/" className="hover:text-[#c9a84c] flex items-center gap-1 transition-colors">
                <Home className="w-4 h-4" /> Home
              </Link>
              <span>/</span>
              <Link to="/eventos" className="hover:text-[#c9a84c] transition-colors">Eventos</Link>
              <span>/</span>
              <span className="text-white/80 truncate">{evento.titulo}</span>
            </div>

            <div className="flex items-center gap-2 mb-3 flex-wrap">
              {evento.tipo && (
                <span className="bg-[#0d6b5e] text-white px-3 py-1 rounded-full text-xs font-semibold">
                  {evento.tipo}
                </span>
              )}
              {evento.destaque && (
                <span className="bg-[#c9a84c] text-[#0a1a17] px-3 py-1 rounded-full text-xs font-semibold">
                  Destaque
                </span>
              )}
            </div>
            <h1 className="text-4xl md:text-5xl text-white font-bold">{evento.titulo}</h1>
          </div>
        </div>
      </section>

      {/* Content */}
      <section className="py-12 px-4">
        <div className="max-w-4xl mx-auto">
          <Link to="/eventos" className="inline-flex items-center gap-1 text-sm text-[#4d7068] hover:text-[#0d6b5e] transition-colors mb-8">
            <ArrowLeft className="w-4 h-4" /> Voltar para eventos
          </Link>

          <div className="grid md:grid-cols-3 gap-8">
            {/* Main content */}
            <div className="md:col-span-2 space-y-6">
              {evento.descricao && (
                <div className="bg-white rounded-2xl shadow-sm border border-[#0d6b5e]/8 p-6">
                  <h2 className="text-xl text-[#0a1a17] font-semibold mb-3">Sobre o Evento</h2>
                  <p className="text-[#4d7068] leading-relaxed whitespace-pre-line">{evento.descricao}</p>
                </div>
              )}
            </div>

            {/* Sidebar */}
            <div className="space-y-4">
              <div className="bg-white rounded-2xl shadow-sm border border-[#0d6b5e]/8 p-5 space-y-4">
                <h3 className="text-sm text-[#0a1a17] font-semibold">Detalhes</h3>

                <div className="space-y-3">
                  <div className="flex items-start gap-3">
                    <Calendar className="w-5 h-5 text-[#0d6b5e] shrink-0 mt-0.5" />
                    <div>
                      <p className="text-xs text-[#4d7068]">Data{datas.length > 1 ? 's' : ''}</p>
                      {datas.length > 0 ? datas.map((d: string, i: number) => (
                        <p key={i} className="text-sm text-[#0a1a17]">
                          <DateWarningIcon data={d} />
                          {format(new Date(d + 'T00:00:00'), "dd/MM/yyyy")}
                        </p>
                      )) : <p className="text-sm text-gray-400">A definir</p>}
                    </div>
                  </div>

                  {evento.hora && (
                    <div className="flex items-start gap-3">
                      <Clock className="w-5 h-5 text-[#0d6b5e] shrink-0 mt-0.5" />
                      <div>
                        <p className="text-xs text-[#4d7068]">Hora</p>
                        <p className="text-sm text-[#0a1a17]">{evento.hora}</p>
                      </div>
                    </div>
                  )}

                  {evento.local && (
                    <div className="flex items-start gap-3">
                      <MapPin className="w-5 h-5 text-[#0d6b5e] shrink-0 mt-0.5" />
                      <div>
                        <p className="text-xs text-[#4d7068]">Local</p>
                        <p className="text-sm text-[#0a1a17]">{evento.local}</p>
                      </div>
                    </div>
                  )}
                </div>

                {evento.linkBilhetes && (
                  <a
                    href={evento.linkBilhetes}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="block w-full text-center bg-[#0d6b5e] text-white py-3 rounded-xl hover:bg-[#065147] transition-colors font-semibold"
                  >
                    Comprar Bilhetes
                    <ExternalLink className="w-4 h-4 inline ml-1" />
                  </a>
                )}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Image zoom modal */}
      {imagemZoom && (
        <div className="fixed inset-0 bg-black/90 z-50 flex items-center justify-center p-4 cursor-zoom-out"
          onClick={() => setImagemZoom(null)}>
          <div className="relative max-w-4xl w-full">
            <ImageWithFallback src={imagemZoom} alt="Imagem ampliada"
              className="w-full h-auto max-h-[90vh] object-contain rounded-lg" />
            <button className="absolute top-2 right-2 bg-white/10 hover:bg-white/20 text-white p-2 rounded-full transition-colors"
              onClick={() => setImagemZoom(null)}>✕</button>
          </div>
        </div>
      )}
    </div>
  );
}
