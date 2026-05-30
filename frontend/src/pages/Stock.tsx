import { useState, useEffect } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router';
import api from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import { Figurino, FigurinoStatus } from '../types';
import { Package, ArrowLeft, Plus, MapPin, Megaphone, RotateCcw, User, Calendar, Pencil, Trash2, CheckCircle, RefreshCw, Clock, Download } from 'lucide-react';
import { toast } from 'sonner';
import { Toaster } from '../components/ui/sonner';
import { Pill } from '../components/Pill';

const ESTADO_LABEL: Record<FigurinoStatus, string> = {
  DISPONIVEL: 'Disponível',
  ALUGADO: 'Alugado',
  VENDIDO: 'Vendido',
};
const ESTADO_STYLE: Record<FigurinoStatus, string> = {
  DISPONIVEL: 'bg-green-100 text-green-800',
  ALUGADO: 'bg-blue-100 text-blue-800',
  VENDIDO: 'bg-gray-100 text-gray-800',
};

const FORM_VAZIO = {
  nome: '', descricao: '', fotografia: '', localizacao: '',
  tipofigurinoid: '', tamanhoid: '', generoid: '', corid: '', estadousoid: '',
  quantidadetotal: '1', quantidadedisponivel: '1',
};

type ImagemMode = 'url' | 'ficheiro';

export function Stock() {
  const { user, activeRole } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [figurinos, setFigurinos] = useState<Figurino[]>([]);
  const [lookup, setLookup] = useState<{ tamanhos: any[]; generos: any[]; cores: any[]; tipos: any[]; estadosUso: any[] }>({
    tamanhos: [], generos: [], cores: [], tipos: [], estadosUso: [],
  });
  const [loading, setLoading] = useState(true);
  const [filtroStatus, setFiltroStatus] = useState<'TODOS' | FigurinoStatus>('TODOS');
  const [searchQuery, setSearchQuery] = useState('');
  const [filtroTipo, setFiltroTipo] = useState<string>('');
  const [filtroTamanho, setFiltroTamanho] = useState<string>('');
  const [filtroGenero, setFiltroGenero] = useState<string>('');
  const [filtroCor, setFiltroCor] = useState<string>('');
  const [showNovoForm, setShowNovoForm] = useState(false);
  const [novoFigurino, setNovoFigurino] = useState(FORM_VAZIO);
  const [saving, setSaving] = useState(false);
  const [imagemMode, setImagemMode] = useState<ImagemMode>('url');
  const [imagemPreview, setImagemPreview] = useState<string>('');
  const [alugueresAtivos, setAlugueresAtivos] = useState<any[]>([]);
  const [editingFigurino, setEditingFigurino] = useState<Figurino | null>(null);
  const [editFormData, setEditFormData] = useState(FORM_VAZIO);
  const [showEditModal, setShowEditModal] = useState(false);
  const [savingEdit, setSavingEdit] = useState(false);
  const [showReporModal, setShowReporModal] = useState(false);
  const [reporFigurino, setReporFigurino] = useState<Figurino | null>(null);
  const [reporQuantidade, setReporQuantidade] = useState(1);
  const [savingRepor, setSavingRepor] = useState(false);
  const [showHistoryModal, setShowHistoryModal] = useState(false);
  const [historyFigurino, setHistoryFigurino] = useState<Figurino | null>(null);
  const [historyData, setHistoryData] = useState<any[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);

  const fetchFigurinos = async () => {
    const res = await api.getFigurinos();
    if (res.success && res.data) setFigurinos(res.data as Figurino[]);
  };

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [figurinosRes, lookupRes, alugueresRes] = await Promise.all([
          api.getFigurinos(),
          api.getFigurinoLookup(),
          activeRole === 'DIRECAO' ? api.getAluguerTransacoes() : Promise.resolve({ success: true, data: [] }),
        ]);
        if (figurinosRes.success && figurinosRes.data) setFigurinos(figurinosRes.data as Figurino[]);
        if (lookupRes.success && lookupRes.data) {
          setLookup({
            tamanhos: lookupRes.data.tamanhos || [],
            generos: lookupRes.data.generos || [],
            cores: lookupRes.data.cores || [],
            tipos: lookupRes.data.tipos || [],
            estadosUso: lookupRes.data.estadosUso || [],
          });
        }
        if (alugueresRes.success && alugueresRes.data) {
          setAlugueresAtivos(alugueresRes.data);
        }
      } catch (error) {
        console.error('Error fetching data:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [activeRole]);

  useEffect(() => {
    const ref = searchParams.get('ref');
    if (!ref || loading) return;

    window.setTimeout(() => {
      document.getElementById(`figurino-${ref}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }, 100);
  }, [searchParams, loading]);

  const handleDevolverAluguer = async (aluguerId: number) => {
    try {
      await api.devolverAluguer(aluguerId);
      await api.getFigurinos().then(res => {
        if (res.success && res.data) setFigurinos(res.data as Figurino[]);
      });
      const res = await api.getAluguerTransacoes();
      if (res.success && res.data) setAlugueresAtivos(res.data);
      toast.success('Aluguer devolvido com sucesso!');
    } catch (error: any) {
      toast.error(error.message || 'Erro ao devolver aluguer');
    }
  };

  const getFigurinosFiltrados = () => {
    const items = figurinos || [];
    let filtered = filtroStatus === 'TODOS' ? items : items.filter(f => f.status === filtroStatus);
    if (searchQuery.trim()) {
      const q = searchQuery.trim().toLowerCase();
      filtered = filtered.filter(f =>
        f.nome.toLowerCase().includes(q) ||
        (f.localArmazenamento && f.localArmazenamento.toLowerCase().includes(q))
      );
    }
    if (filtroTipo) filtered = filtered.filter(f => f.tipofigurinoid?.toString() === filtroTipo);
    if (filtroTamanho) filtered = filtered.filter(f => f.tamanhoid?.toString() === filtroTamanho);
    if (filtroGenero) filtered = filtered.filter(f => f.generoid?.toString() === filtroGenero);
    if (filtroCor) filtered = filtered.filter(f => f.corid?.toString() === filtroCor);
    return filtered;
  };

  const downloadCSV = (content: string, filename: string) => {
    const blob = new Blob([content], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  };

  const exportCSVStock = () => {
    const items = figurinosFiltrados;
    const esc = (v: string) => `"${(v || '').replace(/"/g, '""')}"`;
    const linhas: string[] = [
      ['Nome', 'Tipo', 'Tamanho', 'Genero', 'Cor', 'Status', 'Qtd. Total', 'Qtd. Disponivel', 'Localizacao'].join(',')
    ];
    items.forEach(f => {
      linhas.push([
        esc(f.nome),
        esc(f.tipofigurino || ''),
        esc(f.tamanho || ''),
        esc(f.genero || ''),
        esc(f.cor || ''),
        esc(ESTADO_LABEL[f.status] || f.status),
        String(f.quantidadeTotal ?? ''),
        String(f.quantidadeDisponivel ?? ''),
        esc(f.localArmazenamento || ''),
      ].join(','));
    });
    downloadCSV(linhas.join('\r\n'), `stock-figurinos-${new Date().toISOString().split('T')[0]}.csv`);
  };

  const handleImagemFicheiro = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      toast.error('Imagem demasiado grande (máx. 5 MB)');
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = reader.result as string;
      setImagemPreview(dataUrl);
      setNovoFigurino(f => ({ ...f, fotografia: dataUrl }));
    };
    reader.readAsDataURL(file);
  };

  const handleAdicionarFigurino = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!novoFigurino.nome || !novoFigurino.tipofigurinoid || !novoFigurino.tamanhoid || !novoFigurino.generoid || !novoFigurino.corid) {
      toast.error('Preencha todos os campos obrigatórios');
      return;
    }
    setSaving(true);
    try {
      await api.createFigurinoStock({
        nome: novoFigurino.nome,
        descricao: novoFigurino.descricao,
        fotografia: novoFigurino.fotografia,
        tipofigurinoid: parseInt(novoFigurino.tipofigurinoid),
        tamanhoid: parseInt(novoFigurino.tamanhoid),
        generoid: parseInt(novoFigurino.generoid),
        corid: parseInt(novoFigurino.corid),
        localizacao: novoFigurino.localizacao,
        estadousoid: novoFigurino.estadousoid ? parseInt(novoFigurino.estadousoid) : undefined,
        quantidadetotal: parseInt(novoFigurino.quantidadetotal) || 1,
        quantidadedisponivel: parseInt(novoFigurino.quantidadedisponivel) || 1,
      });
      await fetchFigurinos();
      setNovoFigurino(FORM_VAZIO);
      setImagemMode('url');
      setImagemPreview('');
      setShowNovoForm(false);
      toast.success('Figurino adicionado ao stock com sucesso!');
    } catch (error: any) {
      toast.error(error.message || 'Erro ao adicionar figurino');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteFigurino = async (figurino: Figurino) => {
    if (!window.confirm(`Tem a certeza que deseja eliminar o figurino "${figurino.nome}"?`)) return;
    try {
      await api.deleteFigurino(parseInt(figurino.id));
      await fetchFigurinos();
      toast.success('Figurino eliminado com sucesso!');
    } catch (error: any) {
      toast.error(error.message || 'Erro ao eliminar figurino');
    }
  };

  const handleOpenEdit = (figurino: Figurino) => {
    setEditingFigurino(figurino);
    setEditFormData({
      nome: figurino.nome,
      descricao: figurino.descricao,
      fotografia: figurino.imagem,
      localizacao: figurino.localArmazenamento || '',
      tipofigurinoid: (figurino as any).tipofigurinoid?.toString() || '',
      tamanhoid: (figurino as any).tamanhoid?.toString() || '',
      generoid: (figurino as any).generoid?.toString() || '',
      corid: (figurino as any).corid?.toString() || '',
      estadousoid: '',
      quantidadetotal: figurino.quantidadeTotal?.toString() || '1',
      quantidadedisponivel: figurino.quantidadeDisponivel?.toString() || '1',
    });
    setShowEditModal(true);
  };

  const handleUpdateFigurino = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingFigurino) return;
    if (!editFormData.nome || !editFormData.tipofigurinoid || !editFormData.tamanhoid || !editFormData.generoid || !editFormData.corid) {
      toast.error('Preencha todos os campos obrigatórios');
      return;
    }
    setSavingEdit(true);
    try {
      await api.updateFigurino(parseInt(editingFigurino.id), {
        nome: editFormData.nome,
        descricao: editFormData.descricao,
        fotografia: editFormData.fotografia,
        tipofigurinoid: parseInt(editFormData.tipofigurinoid),
        tamanhoidtamanho: parseInt(editFormData.tamanhoid),
        generoidgenero: parseInt(editFormData.generoid),
        coridcor: parseInt(editFormData.corid),
        localizacao: editFormData.localizacao,
        quantidadetotal: parseInt(editFormData.quantidadetotal) || 1,
        quantidadedisponivel: parseInt(editFormData.quantidadedisponivel) || 1,
      });
      await fetchFigurinos();
      setShowEditModal(false);
      setEditingFigurino(null);
      toast.success('Figurino atualizado com sucesso!');
    } catch (error: any) {
      toast.error(error.message || 'Erro ao atualizar figurino');
    } finally {
      setSavingEdit(false);
    }
  };

  const handleReporStock = async () => {
    if (!reporFigurino || reporQuantidade < 1) return;
    setSavingRepor(true);
    try {
      const totalAtual = reporFigurino.quantidadeTotal || 0;
      const dispAtual = reporFigurino.quantidadeDisponivel || 0;
      await api.updateFigurino(parseInt(reporFigurino.id), {
        quantidadetotal: totalAtual + reporQuantidade,
        quantidadedisponivel: dispAtual + reporQuantidade,
      });
      await fetchFigurinos();
      setShowReporModal(false);
      setReporFigurino(null);
      setReporQuantidade(1);
      toast.success(`Stock reposto: +${reporQuantidade} unidades`);
    } catch (error: any) {
      toast.error(error.message || 'Erro ao repor stock');
    } finally {
      setSavingRepor(false);
    }
  };

  const handleOpenHistory = async (figurino: Figurino) => {
    setHistoryFigurino(figurino);
    setShowHistoryModal(true);
    setLoadingHistory(true);
    try {
      const res = await api.getFigurinoHistory(parseInt(figurino.id));
      if (res.success && res.data) setHistoryData(res.data);
      else setHistoryData([]);
    } catch {
      setHistoryData([]);
    } finally {
      setLoadingHistory(false);
    }
  };

  const getStatusCount = (status: FigurinoStatus) => figurinos.filter(f => f.status === status).length;
  const figurinosFiltrados = getFigurinosFiltrados();

  return (
    <div className="min-h-screen bg-[#f4f9f8]">
      <Toaster position="top-right" />

      {/* Header */}
      <div className="bg-[#0a1a17] border-b border-white/5">
        <div className="max-w-7xl mx-auto px-4 py-6">
          <div className="mb-4 flex items-center gap-2 text-sm text-white/50">
            <Link to="/dashboard" className="hover:text-[#c9a84c] flex items-center gap-1 transition-colors">
              <ArrowLeft className="w-4 h-4" /> Dashboard
            </Link>
            <span>/</span>
            <span className="text-white/80">Stock</span>
          </div>

          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-3xl text-white mb-1">Stock de Figurinos</h1>
              <p className="text-white/50 text-sm">Gestão do inventário da escola</p>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={exportCSVStock}
                className="flex items-center gap-2 px-4 py-2 bg-[#c9a84c] text-[#0a1a17] rounded-lg hover:bg-[#e8c97a] transition-colors text-sm font-medium"
              >
                <Download className="w-4 h-4" />
                <span className="hidden sm:inline">Exportar CSV</span>
              </button>
              <Pill icon={Plus} label="Adicionar Figurino" onClick={() => setShowNovoForm(!showNovoForm)} />
            </div>
          </div>

          {(() => {
            const totalItems = figurinos.reduce((s, f) => s + (f.quantidadeTotal || 0), 0);
            const dispItems = figurinos.reduce((s, f) => s + (f.quantidadeDisponivel || 0), 0);
            const alugados = figurinos.filter(f => (f.quantidadeDisponivel ?? 0) < (f.quantidadeTotal ?? 0)).length;
            const pctAlugados = figurinos.length > 0 ? Math.round((alugados / figurinos.length) * 100) : 0;
            const baixoStock = figurinos.filter(f => f.quantidadeDisponivel !== undefined && f.stockMinimo !== undefined && f.quantidadeDisponivel <= f.stockMinimo).length;
            return (
              <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
                <div className="bg-white/5 p-4 rounded-xl border border-white/10">
                  <div className="text-3xl text-[#1a9885] mb-1">{getStatusCount('DISPONIVEL')}</div>
                  <div className="text-sm text-white/50">Disponíveis</div>
                </div>
                <div className="bg-white/5 p-4 rounded-xl border border-white/10">
                  <div className="text-3xl text-[#c9a84c] mb-1">{alugados}</div>
                  <div className="text-sm text-white/50">Alugados</div>
                </div>
                <div className="bg-white/5 p-4 rounded-xl border border-[#c9a84c]/30">
                  <div className="text-3xl text-[#c9a84c] mb-1">{figurinos.length}</div>
                  <div className="text-sm text-white/50">Total Figurinos</div>
                </div>
                <div className="bg-white/5 p-4 rounded-xl border border-red-400/30">
                  <div className="text-3xl text-red-400 mb-1">{baixoStock}</div>
                  <div className="text-sm text-white/50">Stock Baixo</div>
                </div>
                <div className="bg-white/5 p-4 rounded-xl border border-white/10 col-span-2 md:col-span-1">
                  <div className="text-sm text-white/50 mb-1">Alugados %</div>
                  <div className="text-3xl text-white mb-2">{pctAlugados}%</div>
                  <div className="w-full h-1.5 bg-white/10 rounded-full overflow-hidden">
                    <div className="h-full bg-[#c9a84c] rounded-full transition-all" style={{ width: `${pctAlugados}%` }} />
                  </div>
                </div>
              </div>
            );
          })()}

          {/* Filtros */}
          <div className="flex items-center gap-3 flex-wrap">
            <span className="text-sm text-white/50">Filtrar:</span>
            {(['TODOS', 'DISPONIVEL', 'ALUGADO'] as const).map(s => (
              <button key={s} onClick={() => setFiltroStatus(s)}
                className={`px-4 py-1.5 rounded-lg text-sm transition-colors ${filtroStatus === s ? 'bg-[#c9a84c] text-[#0a1a17]' : 'bg-white/10 text-white/70 hover:bg-white/20'}`}>
                {s === 'TODOS' ? 'Todos' : ESTADO_LABEL[s]}
              </button>
            ))}
            <select value={filtroTipo} onChange={e => setFiltroTipo(e.target.value)}
              className="px-3 py-1.5 rounded-lg text-sm bg-white/10 text-white/80 border border-white/10 focus:outline-none focus:border-[#c9a84c]">
              <option value="" className="bg-[#0a1a17]">Todos os tipos</option>
              {(lookup.tipos || []).map((t: any) => (
                <option key={t.idtipofigurino} value={t.idtipofigurino} className="bg-[#0a1a17]">{t.tipofigurino}</option>
              ))}
            </select>
            <select value={filtroTamanho} onChange={e => setFiltroTamanho(e.target.value)}
              className="px-3 py-1.5 rounded-lg text-sm bg-white/10 text-white/80 border border-white/10 focus:outline-none focus:border-[#c9a84c]">
              <option value="" className="bg-[#0a1a17]">Todos os tamanhos</option>
              {(lookup.tamanhos || []).map((t: any) => (
                <option key={t.idtamanho} value={t.idtamanho} className="bg-[#0a1a17]">{t.nometamanho}</option>
              ))}
            </select>
            <select value={filtroGenero} onChange={e => setFiltroGenero(e.target.value)}
              className="px-3 py-1.5 rounded-lg text-sm bg-white/10 text-white/80 border border-white/10 focus:outline-none focus:border-[#c9a84c]">
              <option value="" className="bg-[#0a1a17]">Todos os géneros</option>
              {(lookup.generos || []).map((g: any) => (
                <option key={g.idgenero} value={g.idgenero} className="bg-[#0a1a17]">{g.nomegenero}</option>
              ))}
            </select>
            <select value={filtroCor} onChange={e => setFiltroCor(e.target.value)}
              className="px-3 py-1.5 rounded-lg text-sm bg-white/10 text-white/80 border border-white/10 focus:outline-none focus:border-[#c9a84c]">
              <option value="" className="bg-[#0a1a17]">Todas as cores</option>
              {(lookup.cores || []).map((c: any) => (
                <option key={c.idcor} value={c.idcor} className="bg-[#0a1a17]">{c.nomecor}</option>
              ))}
            </select>
            <div className="flex-1" />
            <input
              type="text"
              placeholder="Procurar figurino..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="px-3 py-1.5 rounded-lg text-sm bg-white/10 text-white placeholder-white/40 border border-white/10 focus:outline-none focus:border-[#c9a84c] w-64"
            />
          </div>
        </div>
      </div>

      {/* Formulário Adicionar */}
      {showNovoForm && (
        <div className="max-w-7xl mx-auto px-4 py-6">
          <div className="bg-white p-6 rounded-2xl shadow-md border border-[#0d6b5e]/10">
            <h2 className="text-xl mb-4 text-[#0a1a17]" style={{ fontWeight: 700 }}>Adicionar Figurino ao Stock</h2>
            <form onSubmit={handleAdicionarFigurino} className="space-y-4">
              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm mb-1.5 text-[#4d7068]" style={{ fontWeight: 500 }}>Nome *</label>
                  <input value={novoFigurino.nome} onChange={e => setNovoFigurino({ ...novoFigurino, nome: e.target.value })}
                    className="w-full px-4 py-2 border border-[#0d6b5e]/20 rounded-lg bg-[#f4f9f8] focus:outline-none focus:border-[#0d6b5e]"
                    placeholder="Ex: Tutu Clássico Azul" required />
                </div>
                <div>
                  <label className="block text-sm mb-1.5 text-[#4d7068]" style={{ fontWeight: 500 }}>Tipo *</label>
                  <select value={novoFigurino.tipofigurinoid} onChange={e => setNovoFigurino({ ...novoFigurino, tipofigurinoid: e.target.value })}
                    className="w-full px-4 py-2 border border-[#0d6b5e]/20 rounded-lg bg-[#f4f9f8] focus:outline-none focus:border-[#0d6b5e]" required>
                    <option value="">Selecionar tipo…</option>
                    {(lookup.tipos || []).map((t: any) => <option key={t.idtipofigurino} value={t.idtipofigurino}>{t.tipofigurino}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm mb-1.5 text-[#4d7068]" style={{ fontWeight: 500 }}>Tamanho *</label>
                  <select value={novoFigurino.tamanhoid} onChange={e => setNovoFigurino({ ...novoFigurino, tamanhoid: e.target.value })}
                    className="w-full px-4 py-2 border border-[#0d6b5e]/20 rounded-lg bg-[#f4f9f8] focus:outline-none focus:border-[#0d6b5e]" required>
                    <option value="">Selecionar tamanho…</option>
                    {(lookup.tamanhos || []).map((t: any) => <option key={t.idtamanho} value={t.idtamanho}>{t.nometamanho}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm mb-1.5 text-[#4d7068]" style={{ fontWeight: 500 }}>Género *</label>
                  <select value={novoFigurino.generoid} onChange={e => setNovoFigurino({ ...novoFigurino, generoid: e.target.value })}
                    className="w-full px-4 py-2 border border-[#0d6b5e]/20 rounded-lg bg-[#f4f9f8] focus:outline-none focus:border-[#0d6b5e]" required>
                    <option value="">Selecionar género…</option>
                    {(lookup.generos || []).map((g: any) => <option key={g.idgenero} value={g.idgenero}>{g.nomegenero}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm mb-1.5 text-[#4d7068]" style={{ fontWeight: 500 }}>Cor *</label>
                  <select value={novoFigurino.corid} onChange={e => setNovoFigurino({ ...novoFigurino, corid: e.target.value })}
                    className="w-full px-4 py-2 border border-[#0d6b5e]/20 rounded-lg bg-[#f4f9f8] focus:outline-none focus:border-[#0d6b5e]" required>
                    <option value="">Selecionar cor…</option>
                    {(lookup.cores || []).map((c: any) => <option key={c.idcor} value={c.idcor}>{c.nomecor}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm mb-1.5 text-[#4d7068]" style={{ fontWeight: 500 }}>Estado de Uso</label>
                  <select value={novoFigurino.estadousoid} onChange={e => setNovoFigurino({ ...novoFigurino, estadousoid: e.target.value })}
                    className="w-full px-4 py-2 border border-[#0d6b5e]/20 rounded-lg bg-[#f4f9f8] focus:outline-none focus:border-[#0d6b5e]">
                    <option value="">Selecionar estado de uso…</option>
                    {(lookup.estadosUso || []).map((e: any) => <option key={e.idestado} value={e.idestado}>{e.estadouso}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm mb-1.5 text-[#4d7068]" style={{ fontWeight: 500 }}>Local de Armazenamento</label>
                  <input value={novoFigurino.localizacao} onChange={e => setNovoFigurino({ ...novoFigurino, localizacao: e.target.value })}
                    className="w-full px-4 py-2 border border-[#0d6b5e]/20 rounded-lg bg-[#f4f9f8] focus:outline-none focus:border-[#0d6b5e]"
                    placeholder="Ex: Armário A — Prateleira 2" />
                </div>
                <div className="md:col-span-2">
                  <label className="block text-sm mb-1.5 text-[#4d7068]" style={{ fontWeight: 500 }}>Descrição</label>
                  <textarea value={novoFigurino.descricao} onChange={e => setNovoFigurino({ ...novoFigurino, descricao: e.target.value })}
                    rows={2} className="w-full px-4 py-2 border border-[#0d6b5e]/20 rounded-lg bg-[#f4f9f8] focus:outline-none focus:border-[#0d6b5e] resize-none"
                    placeholder="Descrição opcional do figurino…" />
                </div>
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="block text-sm text-[#4d7068]" style={{ fontWeight: 500 }}>Fotografia</label>
                    <div className="flex rounded-lg overflow-hidden border border-[#0d6b5e]/20 text-xs">
                      <button type="button"
                        onClick={() => { setImagemMode('url'); setImagemPreview(''); setNovoFigurino(f => ({ ...f, fotografia: '' })); }}
                        className={`px-3 py-1 transition-colors ${imagemMode === 'url' ? 'bg-[#0d6b5e] text-white' : 'bg-[#f4f9f8] text-[#4d7068] hover:bg-[#deecea]'}`}>
                        URL
                      </button>
                      <button type="button"
                        onClick={() => { setImagemMode('ficheiro'); setNovoFigurino(f => ({ ...f, fotografia: '' })); setImagemPreview(''); }}
                        className={`px-3 py-1 transition-colors ${imagemMode === 'ficheiro' ? 'bg-[#0d6b5e] text-white' : 'bg-[#f4f9f8] text-[#4d7068] hover:bg-[#deecea]'}`}>
                        Dispositivo
                      </button>
                    </div>
                  </div>
                  {imagemMode === 'url' ? (
                    <input value={novoFigurino.fotografia} onChange={e => setNovoFigurino({ ...novoFigurino, fotografia: e.target.value })}
                      className="w-full px-4 py-2 border border-[#0d6b5e]/20 rounded-lg bg-[#f4f9f8] focus:outline-none focus:border-[#0d6b5e]"
                      placeholder="https://…" />
                  ) : (
                    <div className="space-y-2">
                      <label className="flex flex-col items-center justify-center w-full h-24 border-2 border-dashed border-[#0d6b5e]/30 rounded-lg bg-[#f4f9f8] cursor-pointer hover:bg-[#deecea]/40 transition-colors">
                        <span className="text-xs text-[#4d7068]">{imagemPreview ? 'Clique para trocar imagem' : 'Clique para escolher ficheiro'}</span>
                        <span className="text-xs text-[#4d7068]/60 mt-0.5">PNG, JPG, WEBP — máx. 5 MB</span>
                        <input type="file" accept="image/*" className="hidden" onChange={handleImagemFicheiro} />
                      </label>
                      {imagemPreview && (
                        <div className="relative w-full h-32 rounded-lg overflow-hidden border border-[#0d6b5e]/10">
                          <img src={imagemPreview} alt="Pré-visualização" className="w-full h-full object-cover" />
                          <button type="button"
                            onClick={() => { setImagemPreview(''); setNovoFigurino(f => ({ ...f, fotografia: '' })); }}
                            className="absolute top-1 right-1 bg-black/50 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs hover:bg-black/70">
                            ×
                          </button>
                        </div>
                      )}
                    </div>
                  )}
                </div>
                <div>
                  <label className="block text-sm mb-1.5 text-[#4d7068]" style={{ fontWeight: 500 }}>Quantidade</label>
                  <input type="number" min={1} value={novoFigurino.quantidadetotal}
                    onChange={e => setNovoFigurino({ ...novoFigurino, quantidadetotal: e.target.value, quantidadedisponivel: e.target.value })}
                    className="w-full px-4 py-2 border border-[#0d6b5e]/20 rounded-lg bg-[#f4f9f8] focus:outline-none focus:border-[#0d6b5e]" />
                </div>
              </div>
              <div className="flex gap-3 pt-2">
                <button type="submit" disabled={saving}
                  className="bg-[#0d6b5e] text-white px-6 py-2 rounded-lg hover:bg-[#065147] transition-colors disabled:opacity-50"
                  style={{ fontWeight: 600 }}>
                  {saving ? 'A guardar…' : 'Adicionar ao Stock'}
                </button>
                <button type="button" onClick={() => { setShowNovoForm(false); setImagemMode('url'); setImagemPreview(''); }}
                  className="bg-[#deecea] text-[#0d6b5e] px-6 py-2 rounded-lg hover:bg-[#c8e0dc] transition-colors"
                  style={{ fontWeight: 600 }}>
                  Cancelar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showEditModal && editingFigurino && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white z-10 flex items-center justify-between p-6 pb-4 border-b border-[#0d6b5e]/10">
              <h2 className="text-xl text-[#0a1a17]" style={{ fontWeight: 700 }}>Editar Figurino</h2>
              <button onClick={() => { setShowEditModal(false); setEditingFigurino(null); }} className="text-[#4d7068] hover:text-[#0a1a17] text-2xl leading-none">&times;</button>
            </div>
            <form onSubmit={handleUpdateFigurino} className="p-6 space-y-4">
              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm mb-1.5 text-[#4d7068]" style={{ fontWeight: 500 }}>Nome *</label>
                  <input value={editFormData.nome} onChange={e => setEditFormData({ ...editFormData, nome: e.target.value })}
                    className="w-full px-4 py-2 border border-[#0d6b5e]/20 rounded-lg bg-[#f4f9f8] focus:outline-none focus:border-[#0d6b5e]"
                    placeholder="Ex: Tutu Clássico Azul" required />
                </div>
                <div>
                  <label className="block text-sm mb-1.5 text-[#4d7068]" style={{ fontWeight: 500 }}>Tipo *</label>
                  <select value={editFormData.tipofigurinoid} onChange={e => setEditFormData({ ...editFormData, tipofigurinoid: e.target.value })}
                    className="w-full px-4 py-2 border border-[#0d6b5e]/20 rounded-lg bg-[#f4f9f8] focus:outline-none focus:border-[#0d6b5e]" required>
                    <option value="">Selecionar tipo…</option>
                    {(lookup.tipos || []).map((t: any) => <option key={t.idtipofigurino} value={t.idtipofigurino}>{t.tipofigurino}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm mb-1.5 text-[#4d7068]" style={{ fontWeight: 500 }}>Tamanho *</label>
                  <select value={editFormData.tamanhoid} onChange={e => setEditFormData({ ...editFormData, tamanhoid: e.target.value })}
                    className="w-full px-4 py-2 border border-[#0d6b5e]/20 rounded-lg bg-[#f4f9f8] focus:outline-none focus:border-[#0d6b5e]" required>
                    <option value="">Selecionar tamanho…</option>
                    {(lookup.tamanhos || []).map((t: any) => <option key={t.idtamanho} value={t.idtamanho}>{t.nometamanho}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm mb-1.5 text-[#4d7068]" style={{ fontWeight: 500 }}>Género *</label>
                  <select value={editFormData.generoid} onChange={e => setEditFormData({ ...editFormData, generoid: e.target.value })}
                    className="w-full px-4 py-2 border border-[#0d6b5e]/20 rounded-lg bg-[#f4f9f8] focus:outline-none focus:border-[#0d6b5e]" required>
                    <option value="">Selecionar género…</option>
                    {(lookup.generos || []).map((g: any) => <option key={g.idgenero} value={g.idgenero}>{g.nomegenero}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm mb-1.5 text-[#4d7068]" style={{ fontWeight: 500 }}>Cor *</label>
                  <select value={editFormData.corid} onChange={e => setEditFormData({ ...editFormData, corid: e.target.value })}
                    className="w-full px-4 py-2 border border-[#0d6b5e]/20 rounded-lg bg-[#f4f9f8] focus:outline-none focus:border-[#0d6b5e]" required>
                    <option value="">Selecionar cor…</option>
                    {(lookup.cores || []).map((c: any) => <option key={c.idcor} value={c.idcor}>{c.nomecor}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm mb-1.5 text-[#4d7068]" style={{ fontWeight: 500 }}>Local de Armazenamento</label>
                  <input value={editFormData.localizacao} onChange={e => setEditFormData({ ...editFormData, localizacao: e.target.value })}
                    className="w-full px-4 py-2 border border-[#0d6b5e]/20 rounded-lg bg-[#f4f9f8] focus:outline-none focus:border-[#0d6b5e]"
                    placeholder="Ex: Armário A — Prateleira 2" />
                </div>
                <div className="md:col-span-2">
                  <label className="block text-sm mb-1.5 text-[#4d7068]" style={{ fontWeight: 500 }}>Descrição</label>
                  <textarea value={editFormData.descricao} onChange={e => setEditFormData({ ...editFormData, descricao: e.target.value })}
                    rows={2} className="w-full px-4 py-2 border border-[#0d6b5e]/20 rounded-lg bg-[#f4f9f8] focus:outline-none focus:border-[#0d6b5e] resize-none"
                    placeholder="Descrição opcional do figurino…" />
                </div>
                <div>
                  <label className="block text-sm mb-1.5 text-[#4d7068]" style={{ fontWeight: 500 }}>Quantidade</label>
                  <input type="number" min={1} value={editFormData.quantidadetotal}
                    onChange={e => setEditFormData({ ...editFormData, quantidadetotal: e.target.value, quantidadedisponivel: e.target.value })}
                    className="w-full px-4 py-2 border border-[#0d6b5e]/20 rounded-lg bg-[#f4f9f8] focus:outline-none focus:border-[#0d6b5e]" />
                </div>
              </div>
              <div className="flex gap-3 pt-2">
                <button type="submit" disabled={savingEdit}
                  className="bg-[#0d6b5e] text-white px-6 py-2 rounded-lg hover:bg-[#065147] transition-colors disabled:opacity-50"
                  style={{ fontWeight: 600 }}>
                  {savingEdit ? 'A guardar…' : 'Guardar Alterações'}
                </button>
                <button type="button" onClick={() => { setShowEditModal(false); setEditingFigurino(null); }}
                  className="bg-[#deecea] text-[#0d6b5e] px-6 py-2 rounded-lg hover:bg-[#c8e0dc] transition-colors"
                  style={{ fontWeight: 600 }}>
                  Cancelar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Lista */}
      <div className="max-w-7xl mx-auto px-4 py-6">
        {loading ? (
          <div className="bg-white p-12 rounded-2xl shadow-md text-center">
            <p className="text-[#4d7068]">A carregar…</p>
          </div>
        ) : figurinosFiltrados.length === 0 ? (
          <div className="bg-white p-12 rounded-2xl shadow-md text-center">
            <Package className="w-16 h-16 text-[#0d6b5e]/20 mx-auto mb-4" />
            <p className="text-[#4d7068]">Nenhum figurino encontrado</p>
          </div>
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {figurinosFiltrados.map(figurino => (
              <div key={figurino.id} id={`figurino-${figurino.id}`} className={`bg-white rounded-2xl shadow-md overflow-hidden hover:shadow-xl transition-all hover:-translate-y-1 scroll-mt-24 ${searchParams.get('ref') === String(figurino.id) ? 'ring-2 ring-[#c9a84c]' : ''} ${
                    figurino.stockMinimo && figurino.quantidadeDisponivel !== undefined && figurino.quantidadeDisponivel <= figurino.stockMinimo
                      ? 'border-2 border-red-400 ring-1 ring-red-300'
                      : 'border border-[#0d6b5e]/5'
                  }`}>
                <div className="relative">
                  {figurino.imagem ? (
                    <img src={figurino.imagem} alt={figurino.nome} className="w-full h-48 object-cover" />
                  ) : (
                    <div className="w-full h-48 bg-[#f4f9f8] flex items-center justify-center">
                      <Package className="w-16 h-16 text-[#0d6b5e]/20" />
                    </div>
                  )}
                  {figurino.stockMinimo && figurino.quantidadeDisponivel !== undefined && figurino.quantidadeDisponivel <= figurino.stockMinimo && (
                    <div className="absolute top-2 left-2 bg-red-500 text-white text-xs px-2 py-1 rounded-md font-semibold shadow">
                      Stock Baixo
                    </div>
                  )}
                </div>
                <div className="p-5">
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="text-base text-[#0a1a17]" style={{ fontWeight: 700 }}>{figurino.nome}</h3>
                    <span className={`px-2 py-0.5 rounded-full text-xs ${ESTADO_STYLE[figurino.status]}`} style={{ fontWeight: 600 }}>
                      {ESTADO_LABEL[figurino.status]}
                    </span>
                  </div>
                  {figurino.descricao && <p className="text-[#4d7068] text-sm mb-3 line-clamp-2">{figurino.descricao}</p>}
                  <div className="space-y-1.5 text-sm text-[#4d7068] mb-4">
                    <div className="flex justify-between">
                      <span>Tamanho:</span><span className="text-[#0a1a17]" style={{ fontWeight: 600 }}>{figurino.tamanho}</span>
                    </div>
                    {figurino.cor && (
                      <div className="flex justify-between">
                        <span>Cor:</span><span className="text-[#0a1a17]">{figurino.cor}</span>
                      </div>
                    )}
                    {figurino.quantidadeDisponivel !== undefined && (
                      <div className="flex justify-between">
                        <span>Disponível:</span>
                        <span className={figurino.stockMinimo && figurino.quantidadeDisponivel <= figurino.stockMinimo ? 'text-red-500' : 'text-[#0a1a17]'} style={{ fontWeight: 600 }}>
                          {figurino.quantidadeDisponivel}/{figurino.quantidadeTotal}
                          {figurino.stockMinimo && figurino.quantidadeDisponivel <= figurino.stockMinimo && (
                            <span className="ml-1.5 inline-flex items-center gap-1 text-xs text-red-500" title="Stock baixo">
                              ⚠
                            </span>
                          )}
                        </span>
                      </div>
                    )}
                    {figurino.localArmazenamento && (
                      <div className="flex items-start gap-1.5 mt-2 p-2 bg-[#f4f9f8] rounded-lg">
                        <MapPin className="w-3.5 h-3.5 text-[#0d6b5e] mt-0.5 shrink-0" />
                        <span className="text-xs text-[#0a1a17]">{figurino.localArmazenamento}</span>
                      </div>
                    )}
                  </div>
                  <div className="pt-3 border-t border-[#0d6b5e]/10 space-y-2">
                    {figurino.status === 'ALUGADO' && activeRole === 'DIRECAO' && (() => {
                      const figurinoId = parseInt(figurino.id);
                      const aluguerRelacionado = alugueresAtivos.find((a: any) => 
                        a.figurinoId === figurinoId
                      );
                      return aluguerRelacionado ? (
                        <div className="p-3 bg-blue-50 rounded-lg border border-blue-200 space-y-2">
                          <div className="flex items-center gap-2 text-sm text-blue-800">
                            <User className="w-4 h-4" />
                            <span><strong>Alugado por:</strong> {aluguerRelacionado.usuarioNome}</span>
                          </div>
                          <div className="flex items-center gap-2 text-sm text-blue-800">
                            <Calendar className="w-4 h-4" />
                            <span>
                              <strong>Período:</strong> {aluguerRelacionado.dataInicio ? new Date(aluguerRelacionado.dataInicio).toLocaleDateString('pt-PT') : '...'} 
                              {aluguerRelacionado.dataFim ? ` a ${new Date(aluguerRelacionado.dataFim).toLocaleDateString('pt-PT')}` : ''}
                            </span>
                          </div>
                          <button
                            onClick={() => handleDevolverAluguer(parseInt(aluguerRelacionado.id))}
                            className="w-full flex items-center justify-center gap-2 px-3 py-2 bg-[#c9a84c] text-[#0a1a17] rounded-lg text-sm hover:bg-[#e8c97a] transition-colors"
                          >
                            <RotateCcw className="w-4 h-4" />
                            Devolver
                          </button>
                        </div>
                      ) : null;
                    })()}
                    <button
                      onClick={() => handleOpenEdit(figurino)}
                      className="w-full flex items-center justify-center gap-2 px-3 py-2 border border-[#0d6b5e]/30 text-[#0d6b5e] rounded-lg text-sm hover:bg-[#f4f9f8] transition-colors"
                    >
                      <Pencil className="w-3.5 h-3.5" />
                      Editar
                    </button>
                    {activeRole === 'DIRECAO' && (
                      <button
                        onClick={() => handleOpenHistory(figurino)}
                        className="w-full flex items-center justify-center gap-2 px-3 py-2 border border-[#0d6b5e]/30 text-[#0d6b5e] rounded-lg text-sm hover:bg-[#f4f9f8] transition-colors"
                      >
                        <Clock className="w-3.5 h-3.5" />
                        Histórico
                      </button>
                    )}
                    {activeRole === 'DIRECAO' && (
                      <button
                        onClick={() => { setReporFigurino(figurino); setReporQuantidade(1); setShowReporModal(true); }}
                        className="w-full flex items-center justify-center gap-2 px-3 py-2 border border-[#0d6b5e]/30 text-[#0d6b5e] rounded-lg text-sm hover:bg-green-50 transition-colors"
                      >
                        <RefreshCw className="w-3.5 h-3.5" />
                        Repor Stock
                      </button>
                    )}
                    {activeRole === 'DIRECAO' && (
                      <button
                        onClick={() => handleDeleteFigurino(figurino)}
                        className="w-full flex items-center justify-center gap-2 px-3 py-2 border border-red-300 text-red-600 rounded-lg text-sm hover:bg-red-50 transition-colors"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        Eliminar
                      </button>
                    )}
                    {activeRole === 'DIRECAO' && (
                      <button
                        onClick={() => navigate(`/dashboard/marketplace?figurinoId=${figurino.id}`)}
                        className={`w-full flex items-center justify-center gap-2 px-3 py-2 rounded-lg text-sm transition-colors ${
                          figurino.temAnuncioAtivo
                            ? 'bg-green-50 text-green-700 border border-green-300 hover:bg-green-100'
                            : 'bg-[#0d6b5e] text-white hover:bg-[#0a5a4e]'
                        }`}
                      >
                        {figurino.temAnuncioAtivo ? (
                          <><CheckCircle className="w-3.5 h-3.5" /> No Marketplace</>
                        ) : (
                          <><Megaphone className="w-3.5 h-3.5" /> Publicar no Marketplace</>
                        )}
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {showReporModal && reporFigurino && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={() => setShowReporModal(false)}>
          <div className="bg-white rounded-2xl shadow-2xl p-6 w-full max-w-sm mx-4" onClick={e => e.stopPropagation()}>
            <h3 className="text-lg text-[#0a1a17] mb-1" style={{ fontWeight: 700 }}>Repor Stock</h3>
            <p className="text-sm text-[#4d7068] mb-4">
              {reporFigurino.nome} — atual: <strong>{reporFigurino.quantidadeDisponivel}/{reporFigurino.quantidadeTotal}</strong>
            </p>
            <label className="block text-sm text-[#4d7068] mb-1.5" style={{ fontWeight: 500 }}>
              Quantidade a adicionar
            </label>
            <input
              type="number" min={1} value={reporQuantidade}
              onChange={e => setReporQuantidade(Math.max(1, parseInt(e.target.value) || 1))}
              className="w-full px-4 py-2 border border-[#0d6b5e]/20 rounded-lg bg-[#f4f9f8] focus:outline-none focus:border-[#0d6b5e] mb-4"
              autoFocus
            />
            <div className="flex gap-3">
              <button onClick={() => setShowReporModal(false)}
                className="flex-1 px-4 py-2 border border-[#0d6b5e]/30 text-[#0d6b5e] rounded-lg text-sm hover:bg-[#f4f9f8] transition-colors">
                Cancelar
              </button>
              <button onClick={handleReporStock} disabled={savingRepor || reporQuantidade < 1}
                className="flex-1 px-4 py-2 bg-[#0d6b5e] text-white rounded-lg text-sm hover:bg-[#0a5a4e] transition-colors disabled:opacity-50"
                style={{ fontWeight: 600 }}>
                {savingRepor ? 'A repor…' : `Repor +${reporQuantidade}`}
              </button>
            </div>
          </div>
        </div>
      )}

      {showHistoryModal && historyFigurino && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={() => setShowHistoryModal(false)}>
          <div className="bg-white rounded-2xl shadow-2xl p-6 w-full max-w-lg mx-4 max-h-[80vh] flex flex-col" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg text-[#0a1a17]" style={{ fontWeight: 700 }}>Histórico — {historyFigurino.nome}</h3>
              <button onClick={() => setShowHistoryModal(false)} className="text-[#4d7068] hover:text-[#0a1a17] text-xl leading-none">&times;</button>
            </div>
            {loadingHistory ? (
              <p className="text-[#4d7068] text-sm py-8 text-center">A carregar…</p>
            ) : historyData.length === 0 ? (
              <p className="text-[#4d7068] text-sm py-8 text-center">Nenhum movimento registado</p>
            ) : (
              <div className="overflow-y-auto space-y-2 flex-1">
                {historyData.map((h: any) => (
                  <div key={h.id} className="p-3 bg-[#f4f9f8] rounded-lg border border-[#0d6b5e]/10 text-sm">
                    <div className="flex items-center justify-between">
                      <span className="text-[#0a1a17]" style={{ fontWeight: 600 }}>{h.estado}</span>
                      <span className="text-[#4d7068] text-xs">{h.data ? new Date(h.data).toLocaleDateString('pt-PT') : '—'}</span>
                    </div>
                    <div className="flex items-center gap-3 mt-1 text-[#4d7068]">
                      <span>Quantidade: <strong>{h.quantidade}</strong></span>
                      <span>por: <strong>{h.requester}</strong></span>
                    </div>
                    {h.motivoRejeicao && (
                      <p className="text-red-500 text-xs mt-1">Motivo: {h.motivoRejeicao}</p>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
