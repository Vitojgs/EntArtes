import { useState, useEffect } from 'react';
import { Link } from 'react-router';
import { User, UserRole } from '../types';
import api from '../services/api';
import { UserPlus, Users, Search, ArrowLeft } from 'lucide-react';

export function Utilizadores() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [showNovoForm, setShowNovoForm] = useState(false);
  const [filtroRole, setFiltroRole] = useState<'TODOS' | UserRole>('TODOS');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedRole, setSelectedRole] = useState('');
  const [encarregadoId, setEncarregadoId] = useState('');
  const [formData, setFormData] = useState({ nome: '', email: '', password: '', role: '' });
  const [submitting, setSubmitting] = useState(false);
  const [editingUser, setEditingUser] = useState<any>(null);
  const [editFormData, setEditFormData] = useState({ nome: '', email: '', telemovel: '', role: '', encarregadoId: '' });
  const [editRole, setEditRole] = useState('');

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.nome || !formData.email || !formData.password || !formData.role) {
      return;
    }

    setSubmitting(true);
    try {
      const userData: any = {
        nome: formData.nome,
        email: formData.email,
        password: formData.password,
        role: formData.role,
        telemovel: ''
      };

      if (formData.role === 'ALUNO' && encarregadoId) {
        userData.encarregadoId = encarregadoId;
      }

      await api.createUser(userData);
      
      const result = await api.getUsers();
      if (result.success && result.data) {
        setUsers(result.data);
      }
      
      setShowNovoForm(false);
      setFormData({ nome: '', email: '', password: '', role: '' });
      setSelectedRole('');
      setEncarregadoId('');
    } catch (error) {
      console.error('Error creating user:', error);
    } finally {
      setSubmitting(false);
    }
  };

  useEffect(() => {
    const fetchUsers = async () => {
      try {
        const result = await api.getUsers();
        if (result.success && result.data) {
          setUsers(result.data);
        }
      } catch (error) {
        console.error('Error fetching users:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchUsers();
  }, []);

  const getUsersFiltrados = () => {
    let usersFiltrados = [...users];

    // Filtro por role
    if (filtroRole !== 'TODOS') {
      usersFiltrados = usersFiltrados.filter(u => u.role === filtroRole);
    }

    // Filtro por pesquisa
    if (searchTerm) {
      usersFiltrados = usersFiltrados.filter(u => 
        u.nome.toLowerCase().includes(searchTerm.toLowerCase()) ||
        u.email.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    return usersFiltrados;
  };

  const getRoleBadge = (role: UserRole) => {
    const styles = {
      DIRECAO: 'bg-[#c9a84c]/20 text-[#8a6d1e]',
      PROFESSOR: 'bg-[#e2f0ed] text-[#0d6b5e]',
      ENCARREGADO: 'bg-teal-100 text-teal-800',
      ALUNO: 'bg-orange-100 text-orange-800'
    };
    
    const labels = {
      DIRECAO: 'Direção',
      PROFESSOR: 'Professor',
      ENCARREGADO: 'Encarregado',
      ALUNO: 'Aluno'
    };

    return (
      <span className={`px-3 py-1 rounded-full text-sm ${styles[role]}`}>
        {labels[role]}
      </span>
    );
  };

  const getRoleCount = (role: UserRole) => {
    return users.filter(u => u.role === role).length;
  };

  const handleEditClick = (user: any) => {
    setEditingUser(user);
    setEditRole(user.role);
    setEditFormData({
      nome: user.nome,
      email: user.email,
      telemovel: user.telemovel || '',
      role: user.role,
      encarregadoId: user.encarregadoId || ''
    });
  };

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingUser) return;
    
    setSubmitting(true);
    try {
      const updateData: any = {
        nome: editFormData.nome,
        email: editFormData.email,
        telemovel: editFormData.telemovel,
        role: editRole
      };

      if (editRole === 'ALUNO') {
        updateData.encarregadoId = editFormData.encarregadoId || null;
      }

      console.log('Updating user:', editingUser.id, updateData);
      
      const result = await api.updateUser(Number(editingUser.id), updateData);
      console.log('Update result:', result);
      
      const result = await api.getUsers();
      if (result.success && result.data) {
        setUsers(result.data);
      }
      
      setEditingUser(null);
    } catch (error) {
      console.error('Error updating user:', error);
      alert('Erro ao guardar: ' + (error as any)?.message || error);
    } finally {
      setSubmitting(false);
    }
  };

  const getEncarregadoNome = (encarregadoId?: string) => {
    if (!encarregadoId) return null;
    const encarregado = users.find(u => u.id === encarregadoId);
    return encarregado?.nome;
  };

  const getAlunosNomes = (alunosIds?: string[]) => {
    if (!alunosIds || alunosIds.length === 0) return [];
    return users
      .filter(u => alunosIds.includes(u.id))
      .map(u => u.nome);
  };

  const usersFiltrados = getUsersFiltrados();

  return (
    <div className="min-h-screen bg-[#f4f9f8]">
      {/* Header */}
      <div className="bg-[#0a1a17] border-b border-white/5">
        <div className="max-w-7xl mx-auto px-4 py-6">
          {/* Breadcrumb */}
          <div className="mb-4 flex items-center gap-2 text-sm text-white/50">
            <Link to="/dashboard" className="hover:text-[#c9a84c] flex items-center gap-1 transition-colors">
              <ArrowLeft className="w-4 h-4" />
              Dashboard
            </Link>
            <span>/</span>
            <span className="text-white/80">Utilizadores</span>
          </div>
          
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-3xl text-white mb-1">Gestão de Utilizadores</h1>
              <p className="text-white/50 text-sm">
                Crie e gerencie contas de alunos, encarregados e professores
              </p>
            </div>

            <button
              onClick={() => setShowNovoForm(!showNovoForm)}
              className="flex items-center gap-2 bg-[#c9a84c] text-[#0a1a17] px-5 py-2.5 rounded-lg hover:bg-[#e8c97a] transition-colors"
              style={{ fontWeight: 600 }}
            >
              <UserPlus className="w-5 h-5" />
              Novo Utilizador
            </button>
          </div>

          {/* Estatísticas */}
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
            <div className="bg-white/5 p-4 rounded-xl border border-[#c9a84c]/30">
              <div className="text-3xl text-[#c9a84c] mb-1">
                {getRoleCount('DIRECAO')}
              </div>
              <div className="text-sm text-white/50">Direção</div>
            </div>

            <div className="bg-white/5 p-4 rounded-xl border border-white/10">
              <div className="text-3xl text-[#1a9885] mb-1">
                {getRoleCount('PROFESSOR')}
              </div>
              <div className="text-sm text-white/50">Professores</div>
            </div>

            <div className="bg-white/5 p-4 rounded-xl border border-white/10">
              <div className="text-3xl text-teal-400 mb-1">
                {getRoleCount('ENCARREGADO')}
              </div>
              <div className="text-sm text-white/50">Encarregados</div>
            </div>

            <div className="bg-white/5 p-4 rounded-xl border border-white/10">
              <div className="text-3xl text-orange-400 mb-1">
                {getRoleCount('ALUNO')}
              </div>
              <div className="text-sm text-white/50">Alunos</div>
            </div>

            <div className="bg-white/5 p-4 rounded-xl border border-white/10">
              <div className="text-3xl text-white mb-1">
                {users.length}
              </div>
              <div className="text-sm text-white/50">Total</div>
            </div>
          </div>

          {/* Pesquisa e Filtros */}
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-white/30" />
              <input
                type="text"
                placeholder="Pesquisar por nome ou email..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 bg-white/10 border border-white/10 rounded-lg text-white placeholder-white/30 focus:outline-none focus:border-[#c9a84c]"
              />
            </div>

            <div className="flex gap-2 flex-wrap">
              {(['TODOS', 'DIRECAO', 'PROFESSOR', 'ENCARREGADO', 'ALUNO'] as const).map(role => (
                <button
                  key={role}
                  onClick={() => setFiltroRole(role)}
                  className={`px-4 py-2 rounded-lg text-sm transition-colors ${
                    filtroRole === role
                      ? 'bg-[#c9a84c] text-[#0a1a17]'
                      : 'bg-white/10 text-white/70 hover:bg-white/20'
                  }`}
                >
                  {role === 'TODOS' ? 'Todos' : role}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Form Novo Utilizador */}
      {showNovoForm && (
        <div className="max-w-7xl mx-auto px-4 py-6">
          <div className="bg-white p-6 rounded-2xl shadow-md border border-[#0d6b5e]/10">
            <h2 className="text-xl mb-4 text-[#0a1a17]">Criar Novo Utilizador</h2>
            <form className="space-y-4" onSubmit={handleSubmit}>
              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm mb-2 text-[#4d7068]">Nome Completo</label>
                  <input
                    type="text"
                    name="nome"
                    value={formData.nome}
                    onChange={handleInputChange}
                    className="w-full px-4 py-2 border border-[#0d6b5e]/20 rounded-lg bg-[#f4f9f8] focus:outline-none focus:border-[#0d6b5e]"
                    placeholder="Nome do utilizador"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm mb-2 text-[#4d7068]">Email</label>
                  <input
                    type="email"
                    name="email"
                    value={formData.email}
                    onChange={handleInputChange}
                    className="w-full px-4 py-2 border border-[#0d6b5e]/20 rounded-lg bg-[#f4f9f8] focus:outline-none focus:border-[#0d6b5e]"
                    placeholder="email@exemplo.pt"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm mb-2 text-[#4d7068]">Password Inicial</label>
                  <input
                    type="password"
                    name="password"
                    value={formData.password}
                    onChange={handleInputChange}
                    className="w-full px-4 py-2 border border-[#0d6b5e]/20 rounded-lg bg-[#f4f9f8] focus:outline-none focus:border-[#0d6b5e]"
                    placeholder="••••••••"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm mb-2 text-[#4d7068]">Tipo de Utilizador</label>
                  <select 
                    name="role"
                    className="w-full px-4 py-2 border border-[#0d6b5e]/20 rounded-lg bg-[#f4f9f8] focus:outline-none focus:border-[#0d6b5e]" 
                    required
                    value={formData.role}
                    onChange={(e) => { handleInputChange(e); setSelectedRole(e.target.value); }}
                  >
                    <option value="">Selecione...</option>
                    <option value="ALUNO">Aluno</option>
                    <option value="ENCARREGADO">Encarregado</option>
                    <option value="PROFESSOR">Professor</option>
                    <option value="DIRECAO">Direção</option>
                  </select>
                </div>

                {selectedRole === 'ALUNO' && (
                  <div>
                    <label className="block text-sm mb-2 text-[#4d7068]">Encarregado de Educação</label>
                    <select 
                      className="w-full px-4 py-2 border border-[#0d6b5e]/20 rounded-lg bg-[#f4f9f8] focus:outline-none focus:border-[#0d6b5e]"
                      value={encarregadoId}
                      onChange={(e) => setEncarregadoId(e.target.value)}
                      required
                    >
                      <option value="">Selecione o encarregado...</option>
                      {users.filter(u => u.role === 'ENCARREGADO').map(enc => (
                        <option key={enc.id} value={enc.id}>{enc.nome} ({enc.email})</option>
                      ))}
                    </select>
                  </div>
                )}
              </div>

              <div className="flex gap-4">
                <button
                  type="submit"
                  disabled={submitting}
                  className="bg-[#0d6b5e] text-white px-6 py-2 rounded-lg hover:bg-[#065147] transition-colors disabled:opacity-50"
                >
                  {submitting ? 'A criar...' : 'Criar Utilizador'}
                </button>
                <button
                  type="button"
                  onClick={() => setShowNovoForm(false)}
                  className="bg-[#deecea] text-[#0d6b5e] px-6 py-2 rounded-lg hover:bg-[#c8e0dc] transition-colors"
                >
                  Cancelar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Lista de Utilizadores */}
      <div className="max-w-7xl mx-auto px-4 py-6">
        {usersFiltrados.length === 0 ? (
          <div className="bg-white p-12 rounded-2xl shadow-md text-center">
            <Users className="w-16 h-16 text-[#0d6b5e]/20 mx-auto mb-4" />
            <p className="text-[#4d7068]">Nenhum utilizador encontrado</p>
          </div>
        ) : (
          <div className="bg-white rounded-2xl shadow-md overflow-hidden border border-[#0d6b5e]/5">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-[#f4f9f8] border-b border-[#0d6b5e]/10">
                  <tr>
                    <th className="text-left px-6 py-4 text-sm text-[#4d7068]">Nome</th>
                    <th className="text-left px-6 py-4 text-sm text-[#4d7068]">Email</th>
                    <th className="text-left px-6 py-4 text-sm text-[#4d7068]">Tipo</th>
                    <th className="text-left px-6 py-4 text-sm text-[#4d7068]">Relações</th>
                    <th className="text-left px-6 py-4 text-sm text-[#4d7068]">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#0d6b5e]/5">
                  {usersFiltrados.map(user => (
                    <tr key={user.id} className="hover:bg-[#f4f9f8] transition-colors">
                      <td className="px-6 py-4">
                        <div className="text-[#0a1a17]">{user.nome}</div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-[#4d7068] text-sm">{user.email}</div>
                      </td>
                      <td className="px-6 py-4">
                        {getRoleBadge(user.role)}
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-sm space-y-1">
                          {user.role === 'ALUNO' && user.encarregadoId && (
                            <div className="text-[#4d7068]">
                              Encarregado: <strong className="text-[#0a1a17]">{getEncarregadoNome(user.encarregadoId)}</strong>
                            </div>
                          )}
                          {user.role === 'ENCARREGADO' && user.alunosIds && user.alunosIds.length > 0 && (
                            <div className="text-[#4d7068]">
                              Alunos: <strong className="text-[#0a1a17]">{getAlunosNomes(user.alunosIds).join(', ')}</strong>
                            </div>
                          )}
                          {!user.encarregadoId && (!user.alunosIds || user.alunosIds.length === 0) && (
                            <div className="text-[#4d7068]/40">-</div>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <button 
                          onClick={() => handleEditClick(user)} 
                          className="text-[#0d6b5e] hover:text-[#065147] text-sm transition-colors"
                        >
                          Editar
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>


      {editingUser && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-2xl shadow-xl max-w-md w-full mx-4">
            <h2 className="text-xl mb-4 text-[#0a1a17]">Editar Utilizador</h2>
            <form onSubmit={handleEditSubmit} className="space-y-4">
              <div>
                <label className="block text-sm mb-2 text-[#4d7068]">Nome</label>
                <input
                  type="text"
                  value={editFormData.nome}
                  onChange={(e) => setEditFormData({...editFormData, nome: e.target.value})}
                  className="w-full px-4 py-2 border border-[#0d6b5e]/20 rounded-lg bg-[#f4f9f8] focus:outline-none focus:border-[#0d6b5e]"
                  required
                />
              </div>
              <div>
                <label className="block text-sm mb-2 text-[#4d7068]">Email</label>
                <input
                  type="email"
                  value={editFormData.email}
                  onChange={(e) => setEditFormData({...editFormData, email: e.target.value})}
                  className="w-full px-4 py-2 border border-[#0d6b5e]/20 rounded-lg bg-[#f4f9f8] focus:outline-none focus:border-[#0d6b5e]"
                  required
                />
              </div>
              <div>
                <label className="block text-sm mb-2 text-[#4d7068]">Telemóvel</label>
                <input
                  type="text"
                  value={editFormData.telemovel}
                  onChange={(e) => setEditFormData({...editFormData, telemovel: e.target.value})}
                  className="w-full px-4 py-2 border border-[#0d6b5e]/20 rounded-lg bg-[#f4f9f8] focus:outline-none focus:border-[#0d6b5e]"
                />
              </div>
              <div>
                <label className="block text-sm mb-2 text-[#4d7068]">Tipo de Utilizador</label>
                <select 
                  value={editRole}
                  onChange={(e) => setEditRole(e.target.value)}
                  className="w-full px-4 py-2 border border-[#0d6b5e]/20 rounded-lg bg-[#f4f9f8] focus:outline-none focus:border-[#0d6b5e]"
                  required
                >
                  <option value="ALUNO">Aluno</option>
                  <option value="ENCARREGADO">Encarregado</option>
                  <option value="PROFESSOR">Professor</option>
                  <option value="DIRECAO">Direção</option>
                </select>
              </div>
              {editRole === 'ALUNO' && (
                <div>
                  <label className="block text-sm mb-2 text-[#4d7068]">Encarregado de Educação</label>
                  <select 
                    value={editFormData.encarregadoId}
                    onChange={(e) => setEditFormData({...editFormData, encarregadoId: e.target.value})}
                    className="w-full px-4 py-2 border border-[#0d6b5e]/20 rounded-lg bg-[#f4f9f8] focus:outline-none focus:border-[#0d6b5e]"
                  >
                    <option value="">Selecione o encarregado...</option>
                    {users.filter(u => u.role === 'ENCARREGADO').map(enc => (
                      <option key={enc.id} value={enc.id}>{enc.nome} ({enc.email})</option>
                    ))}
                  </select>
                </div>
              )}
              <div className="flex gap-4 pt-2">
                <button
                  type="submit"
                  disabled={submitting}
                  className="bg-[#0d6b5e] text-white px-6 py-2 rounded-lg hover:bg-[#065147] transition-colors disabled:opacity-50"
                >
                  {submitting ? 'A guardar...' : 'Guardar'}
                </button>
                <button
                  type="button"
                  onClick={() => setEditingUser(null)}
                  className="bg-[#deecea] text-[#0d6b5e] px-6 py-2 rounded-lg hover:bg-[#c8e0dc] transition-colors"
                >
                  Cancelar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Regra de Negócio */}
      <div className="max-w-7xl mx-auto px-4 py-6">
        <div className="bg-[#e2f0ed] border border-[#0d6b5e]/20 rounded-xl p-6">
          <h3 className="text-lg text-[#0a1a17] mb-3">
            <strong>Regra de Negócio - Centralização de Identidades</strong>
          </h3>
          <div className="space-y-2 text-[#0d6b5e]">
            <p>• A criação de qualquer conta de utilizador (Aluno, Encarregado ou Professor) é da exclusiva responsabilidade da Direção.</p>
            <p>• Um utilizador com a role ALUNO está obrigatoriamente vinculado a um ENCARREGADO.</p>
            <p>• O Aluno tem permissão de "Apenas Leitura" na agenda.</p>
            <p>• Um Encarregado apenas pode visualizar as agendas e dados dos Alunos que estão sob sua responsabilidade direta.</p>
          </div>
        </div>
      </div>
    </div>
  );
}