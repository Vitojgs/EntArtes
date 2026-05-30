import { useState, useEffect } from 'react';
import { Link } from 'react-router';
import api from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import { Layers, Plus, Pencil, Trash2, X, Search, AlertCircle, FolderOpen } from 'lucide-react';
import { toast } from 'sonner';
import { Toaster } from '../components/ui/sonner';
import { Pill } from '../components/Pill';

interface ColecaoFigurino {
  idfigurino: number;
  nome: string;
  tamanho?: string;
  cor?: string;
  genero?: string;
}

interface Colecao {
  idcolecao: number;
  nome: string;
  descricao: string | null;
  created_at: string;
  figurinos: ColecaoFigurino[];
  totalFigurinos: number;
}

interface FigurinoOption {
  idfigurino: number;
  nome: string;
  tamanho?: string;
  cor?: string;
  genero?: string;
}

const FORM_VAZIO = { nome: '', descricao: '', figurinoIds: [] as number[] };

export function Colecoes() {
  const { user, activeRole } = useAuth();
  const [colecoes, setColecoes] = useState<Colecao[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  // Create/Edit modal state
  const [showModal, setShowModal] = useState(false);
  const [editingColecao, setEditingColecao] = useState<Colecao | null>(null);
  const [form, setForm] = useState(FORM_VAZIO);
  const [saving, setSaving] = useState(false);

  // Figurino selector
  const [figurinos, setFigurinos] = useState<FigurinoOption[]>([]);
  const [figurinoSearch, setFigurinoSearch] = useState('');
  const [loadingFigurinos, setLoadingFigurinos] = useState(false);

  const [deleteId, setDeleteId] = useState<number | null>(null);
  const [deleting, setDeleting] = useState(false);

  const isDirecao = activeRole === 'DIRECAO';

  const loadColecoes = async () => {
    try {
      setLoading(true);
      const res = await api.getColecoes();
      setColecoes(res.data || []);
    } catch (err: any) {
      toast.error(err.message || 'Erro ao carregar coleções');
    } finally {
      setLoading(false);
    }
  };

  const loadFigurinos = async () => {
    try {
      setLoadingFigurinos(true);
      const res = await api.getFigurinos();
      setFigurinos(res.data || []);
    } catch (_) {
      // Silently fail — figurinos are optional for the selector
    } finally {
      setLoadingFigurinos(false);
    }
  };

  useEffect(() => {
    loadColecoes();
  }, []);

  const openCreateModal = () => {
    setEditingColecao(null);
    setForm(FORM_VAZIO);
    loadFigurinos();
    setShowModal(true);
  };

  const openEditModal = (colecao: Colecao) => {
    setEditingColecao(colecao);
    setForm({
      nome: colecao.nome,
      descricao: colecao.descricao || '',
      figurinoIds: colecao.figurinos.map(f => f.idfigurino),
    });
    loadFigurinos();
    setShowModal(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.nome.trim()) {
      toast.error('O nome é obrigatório');
      return;
    }
    try {
      setSaving(true);
      if (editingColecao) {
        await api.updateColecao(editingColecao.idcolecao, {
          nome: form.nome.trim(),
          descricao: form.descricao.trim() || undefined,
          figurinoIds: form.figurinoIds.length > 0 ? form.figurinoIds : undefined,
        });
        toast.success('Coleção actualizada com sucesso');
      } else {
        await api.createColecao({
          nome: form.nome.trim(),
          descricao: form.descricao.trim() || undefined,
          figurinoIds: form.figurinoIds.length > 0 ? form.figurinoIds : undefined,
        });
        toast.success('Coleção criada com sucesso');
      }
      setShowModal(false);
      await loadColecoes();
    } catch (err: any) {
      toast.error(err.message || 'Erro ao guardar coleção');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (deleteId === null) return;
    try {
      setDeleting(true);
      await api.deleteColecao(deleteId);
      toast.success('Coleção eliminada');
      setDeleteId(null);
      await loadColecoes();
    } catch (err: any) {
      toast.error(err.message || 'Erro ao eliminar coleção');
    } finally {
      setDeleting(false);
    }
  };

  const toggleFigurino = (id: number) => {
    setForm(prev => ({
      ...prev,
      figurinoIds: prev.figurinoIds.includes(id)
        ? prev.figurinoIds.filter(fid => fid !== id)
        : [...prev.figurinoIds, id],
    }));
  };

  const filteredColecoes = colecoes.filter(c =>
    !searchQuery || c.nome.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (c.descricao && c.descricao.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  const filteredFigurinos = figurinos.filter(f =>
    !figurinoSearch || f.nome.toLowerCase().includes(figurinoSearch.toLowerCase()) ||
    (f.tamanho && f.tamanho.toLowerCase().includes(figurinoSearch.toLowerCase())) ||
    (f.cor && f.cor.toLowerCase().includes(figurinoSearch.toLowerCase()))
  );

  if (!isDirecao) {
    return (
      <div className="min-h-screen bg-[#f4f9f8] flex items-center justify-center">
        <div className="text-center">
          <AlertCircle className="w-12 h-12 text-red-400 mx-auto mb-4" />
          <h2 className="text-xl text-[#0a1a17] font-semibold">Acesso restrito</h2>
          <p className="text-[#4d7068] mt-2">Apenas a Direção pode gerir coleções.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f4f9f8]">
      <Toaster richColors />
      <div className="max-w-7xl mx-auto px-4 py-6">
        {/* Breadcrumb */}
        <div className="mb-4 flex items-center gap-2 text-sm text-white/50">
          <Link to="/dashboard" className="hover:text-[#c9a84c] flex items-center gap-1 transition-colors">
            <Layers className="w-4 h-4" /> Dashboard
          </Link>
          <span className="text-white/20">/</span>
          <span className="text-white/80">Coleções</span>
        </div>

        {/* Header */}
        <div className="bg-[#0a1a17] rounded-2xl p-6 mb-6">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-3xl text-white mb-1">Coleções</h1>
              <p className="text-white/50 text-sm">Agrupe figurinos em coleções para facilitar o aluguer</p>
            </div>
            <Pill icon={Plus} label="Nova Coleção" onClick={openCreateModal} />
          </div>

          {/* Search */}
          <div className="relative max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30" />
            <input
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="Pesquisar coleções..."
              className="w-full pl-10 pr-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white placeholder-white/30 focus:outline-none focus:border-[#c9a84c]/50 text-sm"
            />
          </div>
        </div>

        {/* Collection Cards */}
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#c9a84c]" />
          </div>
        ) : filteredColecoes.length === 0 ? (
          <div className="bg-white rounded-2xl p-12 text-center border border-[#0d6b5e]/10">
            <FolderOpen className="w-16 h-16 text-[#4d7068] mx-auto mb-4" />
            <h3 className="text-lg text-[#0a1a17] font-semibold mb-2">
              {searchQuery ? 'Nenhuma coleção encontrada' : 'Nenhuma coleção criada'}
            </h3>
            <p className="text-[#4d7068] text-sm mb-6">
              {searchQuery
                ? 'Tente alterar os termos da pesquisa.'
                : 'Crie a sua primeira coleção para agrupar figurinos relacionados.'}
            </p>
            {!searchQuery && (
              <button onClick={openCreateModal}
                className="inline-flex items-center gap-2 px-4 py-2 bg-[#0a1a17] text-white rounded-lg hover:bg-[#0a1a17]/90 transition-colors text-sm font-medium">
                <Plus className="w-4 h-4" /> Criar Coleção
              </button>
            )}
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {filteredColecoes.map(colecao => (
              <div key={colecao.idcolecao} className="bg-white rounded-2xl p-5 border border-[#0d6b5e]/10 hover:shadow-lg transition-shadow">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-[#0a1a17]/5 flex items-center justify-center">
                      <Layers className="w-5 h-5 text-[#0a1a17]" />
                    </div>
                    <div>
                      <h3 className="text-[#0a1a17] font-semibold">{colecao.nome}</h3>
                      <span className="text-xs text-[#4d7068]">
                        {colecao.totalFigurinos} figurino{colecao.totalFigurinos !== 1 ? 's' : ''}
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    <button onClick={() => openEditModal(colecao)}
                      className="p-1.5 rounded-lg hover:bg-[#0a1a17]/5 text-[#4d7068] hover:text-[#0a1a17] transition-colors">
                      <Pencil className="w-4 h-4" />
                    </button>
                    <button onClick={() => setDeleteId(colecao.idcolecao)}
                      className="p-1.5 rounded-lg hover:bg-red-50 text-[#4d7068] hover:text-red-500 transition-colors">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {colecao.descricao && (
                  <p className="text-sm text-[#4d7068] mb-3 line-clamp-2">{colecao.descricao}</p>
                )}

                {colecao.figurinos.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 mt-2">
                    {colecao.figurinos.slice(0, 5).map(f => (
                      <span key={f.idfigurino}
                        className="text-xs bg-[#f4f9f8] text-[#0a1a17] px-2 py-1 rounded-md border border-[#0d6b5e]/10">
                        {f.nome}
                        {f.tamanho && ` (${f.tamanho})`}
                      </span>
                    ))}
                    {colecao.figurinos.length > 5 && (
                      <span className="text-xs text-[#4d7068] px-2 py-1">
                        +{colecao.figurinos.length - 5} mais
                      </span>
                    )}
                  </div>
                )}

                <div className="mt-3 pt-3 border-t border-[#0d6b5e]/10">
                  <span className="text-xs text-[#4d7068]">
                    Criada em {new Date(colecao.created_at).toLocaleDateString('pt-PT')}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Create/Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white z-10 flex items-center justify-between p-6 pb-4 border-b border-[#0d6b5e]/10">
              <h2 className="text-xl text-[#0a1a17]" style={{ fontWeight: 700 }}>
                {editingColecao ? 'Editar Coleção' : 'Nova Coleção'}
              </h2>
              <button onClick={() => setShowModal(false)}
                className="text-[#4d7068] hover:text-[#0a1a17] text-2xl leading-none">&times;</button>
            </div>
            <form onSubmit={handleSave} className="p-6 space-y-4">
              <div>
                <label className="block text-sm mb-1.5 text-[#4d7068]" style={{ fontWeight: 500 }}>Nome *</label>
                <input value={form.nome} onChange={e => setForm({ ...form, nome: e.target.value })}
                  className="w-full px-4 py-2 border border-[#0d6b5e]/20 rounded-lg bg-[#f4f9f8] focus:outline-none focus:border-[#0d6b5e]"
                  placeholder="Ex: Época 2025/2026" required />
              </div>
              <div>
                <label className="block text-sm mb-1.5 text-[#4d7068]" style={{ fontWeight: 500 }}>Descrição</label>
                <textarea value={form.descricao} onChange={e => setForm({ ...form, descricao: e.target.value })}
                  className="w-full px-4 py-2 border border-[#0d6b5e]/20 rounded-lg bg-[#f4f9f8] focus:outline-none focus:border-[#0d6b5e] min-h-[80px] resize-y"
                  placeholder="Descrição opcional da coleção" />
              </div>

              {/* Figurino Selector */}
              <div>
                <label className="block text-sm mb-1.5 text-[#4d7068]" style={{ fontWeight: 500 }}>
                  Figurinos ({form.figurinoIds.length} selecionados)
                </label>
                <div className="relative mb-2">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[#4d7068]" />
                  <input value={figurinoSearch} onChange={e => setFigurinoSearch(e.target.value)}
                    className="w-full pl-9 pr-4 py-2 border border-[#0d6b5e]/20 rounded-lg bg-[#f4f9f8] focus:outline-none focus:border-[#0d6b5e] text-sm"
                    placeholder="Filtrar figurinos..." />
                </div>
                <div className="max-h-48 overflow-y-auto border border-[#0d6b5e]/20 rounded-lg bg-[#f4f9f8]">
                  {loadingFigurinos ? (
                    <div className="p-4 text-center text-sm text-[#4d7068]">A carregar figurinos...</div>
                  ) : filteredFigurinos.length === 0 ? (
                    <div className="p-4 text-center text-sm text-[#4d7068]">
                      {figurinoSearch ? 'Nenhum figurino encontrado' : 'Nenhum figurino disponível'}
                    </div>
                  ) : (
                    filteredFigurinos.map(f => (
                      <label key={f.idfigurino}
                        className={`flex items-center gap-3 px-3 py-2 cursor-pointer transition-colors text-sm
                          ${form.figurinoIds.includes(f.idfigurino) ? 'bg-[#0d6b5e]/10' : 'hover:bg-[#0d6b5e]/5'}`}>
                        <input type="checkbox" checked={form.figurinoIds.includes(f.idfigurino)}
                          onChange={() => toggleFigurino(f.idfigurino)}
                          className="w-4 h-4 rounded border-[#0d6b5e]/30 text-[#0d6b5e] focus:ring-[#0d6b5e]" />
                        <span className="flex-1">{f.nome}</span>
                        <span className="text-xs text-[#4d7068]">
                          {[f.tamanho, f.cor, f.genero].filter(Boolean).join(' · ')}
                        </span>
                      </label>
                    ))
                  )}
                </div>
              </div>

              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setShowModal(false)}
                  className="flex-1 px-4 py-2.5 border border-[#0d6b5e]/20 rounded-lg text-[#4d7068] hover:bg-[#f4f9f8] transition-colors text-sm font-medium">
                  Cancelar
                </button>
                <button type="submit" disabled={saving || !form.nome.trim()}
                  className="flex-1 px-4 py-2.5 bg-[#0a1a17] text-white rounded-lg hover:bg-[#0a1a17]/90 disabled:opacity-50 transition-colors text-sm font-medium">
                  {saving ? 'A guardar...' : editingColecao ? 'Guardar Alterações' : 'Criar Coleção'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {deleteId !== null && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center">
                <AlertCircle className="w-5 h-5 text-red-500" />
              </div>
              <div>
                <h3 className="text-lg text-[#0a1a17] font-semibold">Eliminar Coleção</h3>
                <p className="text-sm text-[#4d7068]">Tem a certeza? Esta ação não pode ser desfeita.</p>
              </div>
            </div>
            <div className="flex gap-3">
              <button onClick={() => setDeleteId(null)}
                className="flex-1 px-4 py-2.5 border border-[#0d6b5e]/20 rounded-lg text-[#4d7068] hover:bg-[#f4f9f8] transition-colors text-sm font-medium">
                Cancelar
              </button>
              <button onClick={handleDelete} disabled={deleting}
                className="flex-1 px-4 py-2.5 bg-red-500 text-white rounded-lg hover:bg-red-600 disabled:opacity-50 transition-colors text-sm font-medium">
                {deleting ? 'A eliminar...' : 'Eliminar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
