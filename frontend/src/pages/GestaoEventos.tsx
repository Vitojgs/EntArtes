import { useState, useEffect } from 'react';
import { Calendar, MapPin, Plus, Pencil, Trash2, Eye, EyeOff, Star, StarOff, ArrowLeft, Clock, Images } from 'lucide-react';
import { Pill } from '../components/Pill';
import api from '../services/api';
import { Link, useSearchParams } from 'react-router';
import { useFeriados } from '../contexts/FeriadosContext';
import { DateWarningIcon } from '../components/DateAlerta';
import { DatePicker } from '../components/DatePicker';

const TIPOS_EVENTO = ['Workshop', 'Espetáculo', 'Prova', 'Gala', 'Reunião', 'Outro'];

interface Evento {
  id: string;
  titulo: string;
  descricao: string;
  tipo: string | null;
  hora: string | null;
  data: string | string[];
  local: string;
  imagem: string;
  imagens?: string[];
  linkBilhetes: string;
  publicado: boolean;
  destaque: boolean;
}

const emptyForm = {
  titulo: '',
  descricao: '',
  tipo: '',
  hora: '',
  datas: [''],
  local: '',
  imagem: '',
  imagens: [] as string[],
  linkBilhetes: '',
  destaque: false,
  publicado: true,
};

export function GestaoEventos() {
  const { isDiaWarning } = useFeriados();
  const [searchParams] = useSearchParams();
  const [eventos, setEventos] = useState<Evento[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<typeof emptyForm>(emptyForm);
  const [submitting, setSubmitting] = useState(false);
  const [publishingId, setPublishingId] = useState<string | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const [imagemMode, setImagemMode] = useState<'url' | 'ficheiro'>('url');
  const [imagemPreview, setImagemPreview] = useState('');
  const [imagemZoom, setImagemZoom] = useState<string | null>(null);
  const [alertaDatas, setAlertaDatas] = useState<Record<number, {isWarning: boolean; mensagem?: string}>>({});

  const handleImagemFicheiro = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      setErro('Imagem demasiado grande (máx. 5 MB)');
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = reader.result as string;
      setForm({ ...form, imagem: dataUrl });
      setImagemPreview(dataUrl);
    };
    reader.readAsDataURL(file);
  };

  const handleGaleriaFicheiros = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    const newImagens: string[] = [];
    let hasError = false;
    let pending = files.length;
    const processFile = (file: File) => {
      if (file.size > 5 * 1024 * 1024) {
        setErro(`"${file.name}" é demasiado grande (máx. 5 MB)`);
        hasError = true;
        pending--;
        if (pending === 0) finalize();
        return;
      }
      const reader = new FileReader();
      reader.onload = () => {
        newImagens.push(reader.result as string);
        pending--;
        if (pending === 0) finalize();
      };
      reader.readAsDataURL(file);
    };
    const finalize = () => {
      if (!hasError && newImagens.length > 0) {
        setForm({ ...form, imagens: [...form.imagens, ...newImagens] });
      }
    };
    for (let i = 0; i < files.length; i++) processFile(files[i]);
  };

  const removeGaleriaImagem = (index: number) => {
    setForm({ ...form, imagens: form.imagens.filter((_, i) => i !== index) });
  };

  const fetchEventos = async () => {
    setLoading(true);
    try {
      const res = await api.getEventosAdmin();
      if (res.success && res.data) setEventos(res.data as Evento[]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchEventos(); }, []);

  useEffect(() => {
    const ref = searchParams.get('ref');
    if (!ref || loading) return;

    window.setTimeout(() => {
      document.getElementById(`evento-${ref}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }, 100);
  }, [searchParams, loading]);

  const openNew = () => {
    setEditingId(null);
    setForm({ ...emptyForm, datas: [''] });
    setShowForm(true);
    setImagemMode('url');
    setImagemPreview('');
  };

  const openEdit = (e: Evento) => {
    const eventDates = Array.isArray(e.data) ? e.data : [e.data];
    setEditingId(e.id);
    setForm({
      titulo: e.titulo,
      descricao: e.descricao,
      tipo: e.tipo || '',
      hora: e.hora || '',
      datas: eventDates.length > 0 ? eventDates : [''],
      local: e.local,
      imagem: e.imagem,
      imagens: e.imagens || [],
      linkBilhetes: e.linkBilhetes || '',
      destaque: e.destaque,
      publicado: e.publicado,
    });
    setShowForm(true);
    setImagemMode(e.imagem?.startsWith('data:') ? 'ficheiro' : 'url');
    setImagemPreview(e.imagem?.startsWith('data:') ? e.imagem : '');
  };

  const addData = () => {
    setForm({ ...form, datas: [...form.datas, ''] });
  };

  const removeData = (index: number) => {
    if (form.datas.length > 1) {
      setForm({ ...form, datas: form.datas.filter((_, i) => i !== index) });
    }
  };

  const updateData = (index: number, value: string) => {
    const newDatas = [...form.datas];
    newDatas[index] = value;
    setForm({ ...form, datas: newDatas });
    setAlertaDatas(prev => ({ ...prev, [index]: isDiaWarning(value) }));
  };

  const handleSubmit = async (ev: React.FormEvent) => {
    ev.preventDefault();
    if (!form.titulo) return;
    const validDatas = form.datas.filter(d => d.trim() !== '');
    if (validDatas.length === 0) {
      setErro('Adicione pelo menos uma data');
      return;
    }
    setErro(null);
    setSubmitting(true);
    try {
      const payload = { ...form, datas: validDatas };
      if (editingId) {
        await api.updateEvento(parseInt(editingId), payload);
      } else {
        await api.createEvento(payload);
      }
      setShowForm(false);
      await fetchEventos();
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Eliminar este evento?')) return;
    await api.deleteEvento(parseInt(id));
    await fetchEventos();
  };

  const handleTogglePublish = async (e: Evento) => {
    setErro(null);
    setPublishingId(e.id);
    try {
      if (!e.publicado) {
        await api.publishEvento(parseInt(e.id));
      } else {
        await api.updateEvento(parseInt(e.id), { publicado: false });
      }
      await fetchEventos();
    } catch (err: any) {
      setErro(`Erro ao ${e.publicado ? 'despublicar' : 'publicar'}: ${err.message}`);
    } finally {
      setPublishingId(null);
    }
  };

  const handleToggleDestaque = async (e: Evento) => {
    await api.updateEvento(parseInt(e.id), { destaque: !e.destaque });
    await fetchEventos();
  };

  return (
    <div className="min-h-screen bg-[#f4f9f8]">
      {/* Header */}
      <div className="bg-[#0a1a17] border-b border-white/5">
        <div className="max-w-7xl mx-auto px-4 py-6">
          <div className="mb-4 flex items-center gap-2 text-sm text-white/50">
            <Link to="/dashboard" className="hover:text-[#c9a84c] flex items-center gap-1 transition-colors">
              <ArrowLeft className="w-4 h-4" /> Dashboard
            </Link>
            <span>/</span>
            <span className="text-white/80">Eventos</span>
          </div>

          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-3xl text-white mb-1">Gestão de Eventos</h1>
              <p className="text-white/50 text-sm">{eventos.length} evento{eventos.length !== 1 ? 's' : ''}</p>
            </div>
            <Pill icon={Plus} label="Novo Evento" onClick={openNew} />
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-6">
      {showForm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-[#0d6b5e]/10">
              <h2 className="text-xl text-[#0a1a17]">
                {editingId ? 'Editar Evento' : 'Novo Evento'}
              </h2>
            </div>
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-sm text-[#4d7068] mb-1">Título *</label>
                <input
                  type="text"
                  required
                  value={form.titulo}
                  onChange={e => setForm({ ...form, titulo: e.target.value })}
                  className="w-full px-4 py-2.5 border border-[#0d6b5e]/20 rounded-lg bg-[#f4f9f8] focus:outline-none focus:border-[#0d6b5e] text-[#0a1a17]"
                  placeholder="Nome do evento"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm text-[#4d7068] mb-1">Tipo</label>
                  <select value={form.tipo} onChange={e => setForm({ ...form, tipo: e.target.value })}
                    className="w-full px-4 py-2.5 border border-[#0d6b5e]/20 rounded-lg bg-[#f4f9f8] focus:outline-none focus:border-[#0d6b5e] text-[#0a1a17] text-sm">
                    <option value="">Sem tipo</option>
                    {TIPOS_EVENTO.map(t => <option key={t} value={t}>{t}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm text-[#4d7068] mb-1">Hora</label>
                  <input type="time" value={form.hora} onChange={e => setForm({ ...form, hora: e.target.value })}
                    className="w-full px-4 py-2.5 border border-[#0d6b5e]/20 rounded-lg bg-[#f4f9f8] focus:outline-none focus:border-[#0d6b5e] text-[#0a1a17] text-sm" />
                </div>
              </div>
              <div>
                <label className="block text-sm text-[#4d7068] mb-1">Datas *</label>
                {form.datas.map((data, index) => (
                  <div key={index} className="flex gap-2 mb-2">
                    <div className="flex-1">
                      <DatePicker
                        value={form.datas[index]}
                        onChange={(val) => updateData(index, val)}
                        min={editingId ? undefined : new Date().toISOString().split('T')[0]}
                      />
                      {alertaDatas[index]?.isWarning && (
                        <p className="text-xs text-red-500 mt-1 flex items-center gap-1">⚠️ {alertaDatas[index].mensagem}</p>
                      )}
                    </div>
                    {form.datas.length > 1 && (
                      <button
                        type="button"
                        onClick={() => removeData(index)}
                        className="px-3 py-2 bg-red-100 text-red-600 rounded-lg hover:bg-red-200"
                      >
                        ×
                      </button>
                    )}
                  </div>
                ))}
                <button
                  type="button"
                  onClick={addData}
                  className="text-sm text-[#0d6b5e] hover:text-[#065147]"
                >
                  + Adicionar data
                </button>
              </div>
              <div>
                <label className="block text-sm text-[#4d7068] mb-1">Local</label>
                <input
                  type="text"
                  value={form.local}
                  onChange={e => setForm({ ...form, local: e.target.value })}
                  className="w-full px-4 py-2.5 border border-[#0d6b5e]/20 rounded-lg bg-[#f4f9f8] focus:outline-none focus:border-[#0d6b5e] text-[#0a1a17]"
                  placeholder="Ex: Teatro Municipal"
                />
              </div>
              <div>
                <label className="block text-sm text-[#4d7068] mb-1">Descrição</label>
                <textarea
                  value={form.descricao}
                  onChange={e => setForm({ ...form, descricao: e.target.value })}
                  rows={3}
                  className="w-full px-4 py-2.5 border border-[#0d6b5e]/20 rounded-lg bg-[#f4f9f8] focus:outline-none focus:border-[#0d6b5e] text-[#0a1a17] resize-none"
                  placeholder="Descrição do evento..."
                />
              </div>
              <div>
                <label className="block text-sm text-[#4d7068] mb-1">Imagem</label>
                <div className="flex rounded-lg overflow-hidden border border-[#0d6b5e]/20 text-xs mb-2">
                  <button
                    type="button"
                    onClick={() => { setImagemMode('url'); setImagemPreview(''); }}
                    className={`px-3 py-1.5 transition-colors flex-1 ${imagemMode === 'url' ? 'bg-[#0d6b5e] text-white' : 'bg-[#f4f9f8] text-[#4d7068] hover:bg-[#deecea]'}`}
                  >
                    URL
                  </button>
                  <button
                    type="button"
                    onClick={() => setImagemMode('ficheiro')}
                    className={`px-3 py-1.5 transition-colors flex-1 ${imagemMode === 'ficheiro' ? 'bg-[#0d6b5e] text-white' : 'bg-[#f4f9f8] text-[#4d7068] hover:bg-[#deecea]'}`}
                  >
                    Dispositivo
                  </button>
                </div>
                {imagemMode === 'url' ? (
                  <input
                    type="url"
                    value={form.imagem}
                    onChange={e => setForm({ ...form, imagem: e.target.value })}
                    className="w-full px-4 py-2.5 border border-[#0d6b5e]/20 rounded-lg bg-[#f4f9f8] focus:outline-none focus:border-[#0d6b5e] text-[#0a1a17]"
                    placeholder="https://..."
                  />
                ) : (
                  <div className="space-y-2">
                    <label className="flex flex-col items-center justify-center w-full h-24 border-2 border-dashed border-[#0d6b5e]/30 rounded-lg bg-[#f4f9f8] cursor-pointer hover:bg-[#deecea]/40 transition-colors">
                      <span className="text-sm text-[#4d7068]">{imagemPreview ? 'Clique para trocar' : 'Clique para escolher'}</span>
                      <span className="text-xs text-[#4d7068]/60">PNG, JPG, WEBP — máx. 5 MB</span>
                      <input type="file" accept="image/*" className="hidden" onChange={handleImagemFicheiro} />
                    </label>
                    {imagemPreview && (
                      <div 
                        className="relative w-full h-32 rounded-lg overflow-hidden border border-[#0d6b5e]/10 cursor-zoom-in"
                        onClick={() => setImagemZoom(imagemPreview)}
                      >
                        <img src={imagemPreview} alt="Preview" className="w-full h-full object-contain" />
                        <button
                          type="button"
                          onClick={(e) => { e.stopPropagation(); setForm({ ...form, imagem: '' }); setImagemPreview(''); }}
                          className="absolute top-1 right-1 bg-black/50 text-white rounded-full w-6 h-6 flex items-center justify-center text-sm hover:bg-black/70"
                        >
                          ×
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>

              <div>
                <label className="block text-sm text-[#4d7068] mb-1">
                  Imagens Adicionais (Galeria)
                  <span className="text-[#4d7068]/60 font-normal ml-1">(opcional)</span>
                </label>
                <div className="space-y-2">
                  {form.imagens.length > 0 && (
                    <div className="grid grid-cols-3 gap-2 mb-2">
                      {form.imagens.map((url, i) => (
                        <div key={i} className="relative rounded-lg overflow-hidden border border-[#0d6b5e]/10 group h-24">
                          <img src={url} alt={`Galeria ${i + 1}`} className="w-full h-full object-cover" />
                          <button
                            type="button"
                            onClick={() => removeGaleriaImagem(i)}
                            className="absolute top-1 right-1 bg-black/50 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs hover:bg-black/70 opacity-0 group-hover:opacity-100 transition-opacity"
                          >
                            ×
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                  <label className="flex flex-col items-center justify-center w-full h-20 border-2 border-dashed border-[#0d6b5e]/30 rounded-lg bg-[#f4f9f8] cursor-pointer hover:bg-[#deecea]/40 transition-colors">
                    <div className="flex items-center gap-2 text-sm text-[#4d7068]">
                      <Images className="w-4 h-4" />
                      <span>Adicionar imagens</span>
                    </div>
                    <span className="text-xs text-[#4d7068]/60">PNG, JPG, WEBP — máx. 5 MB cada</span>
                    <input type="file" accept="image/*" multiple className="hidden" onChange={handleGaleriaFicheiros} />
                  </label>
                </div>
              </div>

              <div>
                <label className="block text-sm text-[#4d7068] mb-1">Link de Bilhetes</label>
                <input
                  type="url"
                  value={form.linkBilhetes}
                  onChange={e => setForm({ ...form, linkBilhetes: e.target.value })}
                  className="w-full px-4 py-2.5 border border-[#0d6b5e]/20 rounded-lg bg-[#f4f9f8] focus:outline-none focus:border-[#0d6b5e] text-[#0a1a17]"
                  placeholder="https://..."
                />
              </div>
              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={form.destaque}
                  onChange={e => setForm({ ...form, destaque: e.target.checked })}
                  className="w-4 h-4 accent-[#0d6b5e]"
                />
                <span className="text-sm text-[#0a1a17]">Marcar como destaque</span>
              </label>
              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={form.publicado}
                  onChange={e => setForm({ ...form, publicado: e.target.checked })}
                  className="w-4 h-4 accent-[#0d6b5e]"
                />
                <span className="text-sm text-[#0a1a17]">
                  Publicar imediatamente
                  <span className="ml-1 text-[#4d7068]">(visível a todos)</span>
                </span>
              </label>

              <div className="flex gap-3 pt-2">
                <button
                  type="submit"
                  disabled={submitting}
                  className="flex-1 bg-[#0d6b5e] text-white py-2.5 rounded-xl hover:bg-[#065147] transition-colors disabled:opacity-50"
                >
                  {submitting ? 'A guardar...' : editingId ? 'Guardar Alterações' : 'Criar Evento'}
                </button>
                <button
                  type="button"
                  onClick={() => setShowForm(false)}
                  className="flex-1 border border-[#0d6b5e]/20 text-[#4d7068] py-2.5 rounded-xl hover:bg-[#f4f9f8] transition-colors"
                >
                  Cancelar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Erro banner */}
      {erro && (
        <div className="mb-4 px-4 py-3 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700 flex items-center justify-between">
          <span>{erro}</span>
          <button onClick={() => setErro(null)} className="ml-4 text-red-400 hover:text-red-600 font-bold">✕</button>
        </div>
      )}

      {/* List */}
      {loading ? (
        <div className="text-center py-16 text-[#4d7068]">A carregar...</div>
      ) : eventos.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-2xl border border-[#0d6b5e]/10">
          <Calendar className="w-12 h-12 text-[#0d6b5e]/30 mx-auto mb-3" />
          <p className="text-[#4d7068]">Nenhum evento criado.</p>
          <button onClick={openNew} className="mt-4 text-[#0d6b5e] hover:underline text-sm">
            Criar o primeiro evento
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {eventos.map(e => (
            <div
              key={e.id}
              id={`evento-${e.id}`}
              className={`bg-white rounded-xl border border-[#0d6b5e]/10 p-5 flex items-center gap-4 scroll-mt-24 ${searchParams.get('ref') === String(e.id) ? 'ring-2 ring-[#c9a84c]' : ''}`}
            >
              {e.imagem ? (
                <img src={e.imagem} alt={e.titulo} className="w-16 h-16 rounded-lg object-cover flex-shrink-0" />
              ) : (
                <div className="w-16 h-16 rounded-lg bg-[#f4f9f8] flex items-center justify-center flex-shrink-0">
                  <Calendar className="w-6 h-6 text-[#0d6b5e]/40" />
                </div>
              )}

              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <h3 className="text-[#0a1a17] font-medium truncate">{e.titulo}</h3>
                  {e.tipo && (
                    <span className="text-xs bg-[#0d6b5e]/10 text-[#0d6b5e] px-2 py-0.5 rounded-full">
                      {e.tipo}
                    </span>
                  )}
                  {e.destaque && (
                    <span className="text-xs bg-[#c9a84c]/15 text-[#8a6a00] px-2 py-0.5 rounded-full">
                      Destaque
                    </span>
                  )}
                  <span className={`text-xs px-2 py-0.5 rounded-full ${
                    e.publicado
                      ? 'bg-green-100 text-green-700'
                      : 'bg-gray-100 text-gray-500'
                  }`}>
                    {e.publicado ? 'Publicado' : 'Rascunho'}
                  </span>
                </div>
                <div className="flex items-center gap-4 mt-1 text-sm text-[#4d7068]">
                  <span className="flex items-center gap-1">
                    <Calendar className="w-3.5 h-3.5" />
                    {Array.isArray(e.data) 
                      ? e.data.map((d, i) => (
                          <span key={i}>
                            {i > 0 && ', '}
                            <DateWarningIcon data={d} />
                            {new Date(d + 'T00:00:00').toLocaleDateString('pt-PT')}
                          </span>
                        ))
                      : e.data 
                        ? <><DateWarningIcon data={e.data} />{new Date(e.data + 'T00:00:00').toLocaleDateString('pt-PT')}</>
                        : '—'}
                  </span>
                  {e.hora && (
                    <span className="flex items-center gap-1">
                      <Clock className="w-3.5 h-3.5" />
                      {e.hora}
                    </span>
                  )}
                  {e.local && (
                    <span className="flex items-center gap-1 truncate">
                      <MapPin className="w-3.5 h-3.5 flex-shrink-0" />
                      {e.local}
                    </span>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-1 flex-shrink-0">
                <button
                  onClick={() => handleToggleDestaque(e)}
                  title={e.destaque ? 'Remover destaque' : 'Marcar destaque'}
                  className="p-2 rounded-lg hover:bg-[#f4f9f8] text-[#c9a84c] transition-colors"
                >
                  {e.destaque ? <Star className="w-4 h-4 fill-current" /> : <StarOff className="w-4 h-4" />}
                </button>
                <button
                  onClick={() => handleTogglePublish(e)}
                  title={e.publicado ? 'Despublicar' : 'Publicar'}
                  disabled={publishingId === e.id}
                  className="p-2 rounded-lg hover:bg-[#f4f9f8] text-[#0d6b5e] transition-colors disabled:opacity-40"
                >
                  {publishingId === e.id
                    ? <span className="w-4 h-4 block border-2 border-[#0d6b5e] border-t-transparent rounded-full animate-spin" />
                    : e.publicado ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />
                  }
                </button>
                <button
                  onClick={() => openEdit(e)}
                  className="p-2 rounded-lg hover:bg-[#f4f9f8] text-[#0d6b5e] transition-colors"
                >
                  <Pencil className="w-4 h-4" />
                </button>
                <button
                  onClick={() => handleDelete(e.id)}
                  className="p-2 rounded-lg hover:bg-red-50 text-red-400 transition-colors"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      </div>
      {imagemZoom && (
        <div 
          className="fixed inset-0 bg-black/90 z-50 flex items-center justify-center p-4 cursor-zoom-out"
          onClick={() => setImagemZoom(null)}
        >
          <div className="relative max-w-[90vw] max-h-[90vh]">
            <img 
              src={imagemZoom} 
              alt="Imagem ampliada" 
              className="max-w-full max-h-[90vh] object-contain"
            />
          </div>
          <button
            onClick={() => setImagemZoom(null)}
            className="absolute top-4 right-4 bg-white/20 hover:bg-white/30 text-white rounded-full w-10 h-10 flex items-center justify-center text-2xl transition-colors"
          >
            ×
          </button>
        </div>
      )}
    </div>
  );
}
