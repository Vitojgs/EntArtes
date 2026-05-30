import { useAuth } from '../contexts/AuthContext';
import { User, Mail, Phone, CalendarDays, BarChart3, Music2 } from 'lucide-react';
import AlunoProfileForm from '../components/AlunoProfileForm';

const roleLabel: Record<string, string> = {
  DIRECAO: 'Direção',
  PROFESSOR: 'Professor',
  ENCARREGADO: 'Encarregado de Educação',
  ALUNO: 'Aluno',
  UTILIZADOR: 'Utilizador',
};

export function Perfil() {
  const { user } = useAuth();

  if (!user) return null;

  const role = Array.isArray(user.role) ? user.role[0] : user.role;
  const formatDate = (d: string | undefined) => {
    if (!d) return null;
    const date = new Date(d);
    return date.toLocaleDateString('pt-PT');
  };
  const formatDateForInput = (d: string | undefined) => {
    if (!d) return '';
    return d.split('T')[0];
  };

  return (
    <div className="max-w-3xl mx-auto p-4 sm:p-6 space-y-6">
      <h1 className="text-2xl font-bold text-[#0a1a17]">O Meu Perfil</h1>

      {/* Info do Utilizador */}
      <div className="bg-white rounded-xl border border-[#0d6b5e]/10 p-5 shadow-sm">
        <h2 className="text-lg font-semibold text-[#0a1a17] mb-4 flex items-center gap-2">
          <User className="w-5 h-5 text-[#0d6b5e]" />
          Dados da Conta
        </h2>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="text-xs text-[#4d7068] font-medium uppercase tracking-wide">Nome</label>
            <p className="text-[#0a1a17] font-medium mt-0.5">{user.nome}</p>
          </div>
          <div>
            <label className="text-xs text-[#4d7068] font-medium uppercase tracking-wide">
              <Mail className="w-3 h-3 inline mr-1" />
              Email
            </label>
            <p className="text-[#0a1a17] font-medium mt-0.5">{user.email}</p>
          </div>
          {user.telemovel && (
            <div>
              <label className="text-xs text-[#4d7068] font-medium uppercase tracking-wide">
                <Phone className="w-3 h-3 inline mr-1" />
                Telemóvel
              </label>
              <p className="text-[#0a1a17] font-medium mt-0.5">{user.telemovel}</p>
            </div>
          )}
          <div>
            <label className="text-xs text-[#4d7068] font-medium uppercase tracking-wide">Perfil</label>
            <p className="text-[#0a1a17] font-medium mt-0.5">{roleLabel[role] || role}</p>
          </div>
          {user.dataNascimento && (
            <div>
              <label className="text-xs text-[#4d7068] font-medium uppercase tracking-wide">
                <CalendarDays className="w-3 h-3 inline mr-1" />
                Data de Nascimento
              </label>
              <p className="text-[#0a1a17] font-medium mt-0.5">{formatDate(user.dataNascimento)}</p>
            </div>
          )}
        </div>

        {user.nivel && (
          <div className="mt-4 pt-4 border-t border-[#0d6b5e]/10">
            <div className="flex flex-wrap gap-4">
              <div>
                <label className="text-xs text-[#4d7068] font-medium uppercase tracking-wide">
                  <BarChart3 className="w-3 h-3 inline mr-1" />
                  Nível
                </label>
                <p className="text-[#0a1a17] font-medium mt-0.5">{user.nivel}</p>
              </div>
              {user.modalidades && user.modalidades.length > 0 && (
                <div>
                  <label className="text-xs text-[#4d7068] font-medium uppercase tracking-wide">
                    <Music2 className="w-3 h-3 inline mr-1" />
                    Modalidades
                  </label>
                  <div className="flex flex-wrap gap-1.5 mt-1">
                    {user.modalidades.map(m => (
                      <span key={m.id} className="bg-[#0d6b5e]/10 text-[#0d6b5e] text-xs px-2.5 py-1 rounded-full font-medium">
                        {m.nome}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Formulário de edição (apenas para ALUNO) */}
      {role === 'ALUNO' && (
        <AlunoProfileForm user={user} />
      )}
    </div>
  );
}
