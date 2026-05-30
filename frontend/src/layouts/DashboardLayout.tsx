import { useEffect, useState, useRef } from 'react';
import { Outlet, Link, useNavigate, useLocation } from 'react-router';
import { useAuth } from '../contexts/AuthContext';
import { LogOut, Home, ShoppingBag, Package, Users, BookOpen, Ticket, BarChart3, Shield, ChevronDown, User, GraduationCap, UsersRound, BookMarked, Layers, ClipboardCheck, X, Calendar, Clock, MapPin, CheckCircle, XCircle } from 'lucide-react';
import { NotificacoesBell } from '../components/NotificacoesBell';
import { hasMultipleRoles, getRoleLabel, getMainRole } from '../utils/roleUtils';
import { getNotificationDestination } from '../utils/notificationNavigation';
import { Notificacao } from '../types';
import api from '../services/api';

function RoleSwitcher({ roles, activeRole, onRoleChange }: { roles: string[], activeRole: string, onRoleChange: (role: string) => void }) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const getRoleIcon = (role: string) => {
    switch (role) {
      case 'DIRECAO': return Shield;
      case 'PROFESSOR': return GraduationCap;
      case 'ENCARREGADO': return UsersRound;
      case 'ALUNO': return BookMarked;
      default: return User;
    }
  };

  const getRoleColor = () => 'bg-[#c9a84c]/20 text-[#c9a84c] border border-[#c9a84c]/25';

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const currentIcon = getRoleIcon(activeRole);
  const CurrentIcon = currentIcon;

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        type="button"
        onClick={(e) => { e.preventDefault(); e.stopPropagation(); setIsOpen(!isOpen); }}
        className={`flex items-center gap-1.5 px-2 py-1 rounded-full border text-xs font-medium transition-all ${getRoleColor()}`}
      >
        <CurrentIcon className="w-3 h-3" />
        <span>{getRoleLabel(activeRole)}</span>
        <ChevronDown className={`w-2.5 h-2.5 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {isOpen && (
        <div className="absolute top-full left-0 mt-2 w-52 bg-[#0a1a17] border border-[#c9a84c]/20 rounded-xl shadow-xl overflow-hidden z-50">
          <div className="px-4 py-2.5 border-b border-white/5">
            <span className="text-xs text-white/40" style={{ fontWeight: 600 }}>Mudar perfil</span>
          </div>
          <div className="py-1">
            {roles.map((role) => {
              const Icon = getRoleIcon(role);
              const isActive = role === activeRole;
              return (
                <button
                  key={role}
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    onRoleChange(role);
                    setIsOpen(false);
                  }}
                  className={`w-full flex items-center gap-3 px-4 py-2.5 text-left transition-colors ${
                    isActive 
                      ? 'bg-[#c9a84c]/15 text-[#c9a84c]' 
                      : 'text-white/60 hover:bg-white/5 hover:text-white/90'
                  }`}
                >
                  <div className={`flex items-center justify-center w-8 h-8 rounded-lg ${
                    isActive ? 'bg-[#c9a84c]/20' : 'bg-white/5'
                  }`}>
                    <Icon className="w-4 h-4" />
                  </div>
                  <div className="flex flex-col">
                    <span className="text-sm" style={{ fontWeight: 500 }}>{getRoleLabel(role)}</span>
                    {isActive && <span className="text-xs text-[#c9a84c]/60">Perfil atual</span>}
                  </div>
                  {isActive && (
                    <div className="ml-auto w-1.5 h-1.5 rounded-full bg-[#c9a84c]" />
                  )}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

export function DashboardLayout() {
  const { user, activeRole, setActiveRole, logout, loading, hasRole } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    if (!loading && !user && location.pathname.startsWith('/dashboard')) {
      navigate('/login');
    }
  }, [user, loading, navigate, location]);

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  // Notification → modal for coaching types
  const [notificacaoCoaching, setNotificacaoCoaching] = useState<Notificacao | null>(null);
  const [dadosCoachingNotif, setDadosCoachingNotif] = useState<any>(null);
  const [loadingNotif, setLoadingNotif] = useState(false);

  const handleNotificacaoClick = async (n: Notificacao) => {
    const refType = n.referencia_tipo?.toLowerCase();
    // For coaching notifications, open modal instead of navigating
    if (refType === 'coaching' && n.referencia_id) {
      setNotificacaoCoaching(n);
      setDadosCoachingNotif(null);
      setLoadingNotif(true);
      try {
        const res = await api.obterAulaDoPedido(n.referencia_id);
        if (res.success) setDadosCoachingNotif(res.data);
      } catch { /* ignore */ }
      setLoadingNotif(false);
    } else {
      navigate(getNotificationDestination(n));
    }
  };

  if (loading || !user) {
    return null;
  }

  const currentRole = activeRole || getMainRole(user.role);

  const isActive = (path: string) => {
    return location.pathname === path;
  };

  const roleLabel: Record<string, string> = {
    DIRECAO: 'Direção',
    PROFESSOR: 'Professor',
    ENCARREGADO: 'Encarregado',
    ALUNO: 'Aluno',
  };

  const userRoles = Array.isArray(user.role) ? user.role : [user.role].filter(Boolean);
  const showRoleSwitcher = hasMultipleRoles(user.role) || (user.availableRoles && user.availableRoles.length > 1);

  const navItems = [
    {
      path: '/dashboard',
      icon: Home,
      label: 'Início',
      roles: ['ALUNO', 'ENCARREGADO', 'PROFESSOR', 'DIRECAO']
    },
    {
      path: '/dashboard/perfil',
      icon: User,
      label: 'Perfil',
      roles: ['ALUNO', 'ENCARREGADO', 'PROFESSOR', 'DIRECAO']
    },
    {
      path: '/dashboard/meus-alunos',
      icon: UsersRound,
      label: 'Os Meus Alunos',
      roles: ['ENCARREGADO']
    },
    {
      path: '/dashboard/extrato',
      icon: BarChart3,
      label: 'Extrato',
      roles: ['DIRECAO']
    },
    {
      path: '/dashboard/marketplace',
      icon: ShoppingBag,
      label: 'Marketplace',
      roles: ['ALUNO', 'ENCARREGADO', 'PROFESSOR', 'DIRECAO']
    },
    {
      path: '/dashboard/stock',
      icon: Package,
      label: 'Stock',
      roles: ['DIRECAO']
    },
    {
      path: '/dashboard/colecoes',
      icon: Layers,
      label: 'Coleções',
      roles: ['DIRECAO']
    },
    {
      path: '/dashboard/utilizadores',
      icon: Users,
      label: 'Utilizadores',
      roles: ['DIRECAO']
    },
    {
      path: '/dashboard/eventos',
      icon: Ticket,
      label: 'Eventos',
      roles: ['DIRECAO']
    },
    {
      path: '/dashboard/alteracoes-pendentes',
      icon: ClipboardCheck,
      label: 'Aprovações',
      roles: ['DIRECAO']
    }
  ].filter(item => item.roles.includes(activeRole));

  return (
    <div className="min-h-screen bg-[#f4f9f8]">
      {/* Top Navigation */}
      <nav className="bg-[#0a1a17] shadow-lg sticky top-0 z-50 border-b border-white/5">
        <div className="max-w-7xl mx-auto px-4">
          <div className="flex items-center justify-between h-16">
            <Link to="/" className="flex items-center gap-3">
              <div className="text-xl text-white" style={{ fontWeight: 700, letterSpacing: '0.05em' }}>
                ENT'<span className="text-[#c9a84c]">ARTES</span>
              </div>
              <div className="hidden md:flex items-center gap-2">
                <span className="text-xs text-white font-medium tracking-wide">{user.nome}</span>
                <span className="text-white/20">|</span>
                {showRoleSwitcher ? (
                  <RoleSwitcher 
                    roles={userRoles} 
                    activeRole={activeRole} 
                    onRoleChange={setActiveRole} 
                  />
                ) : (
                  <span className="text-xs bg-[#c9a84c]/20 text-[#c9a84c] px-2 py-0.5 rounded-full">
                    {getRoleLabel(activeRole)}
                  </span>
                )}
              </div>
            </Link>

            <div className="flex items-center gap-2">
              {/* Desktop Navigation */}
              <div className="hidden md:flex items-center gap-1">
                {navItems.map(item => {
                  const Icon = item.icon;
                  return (
                    <Link
                      key={item.path}
                      to={item.path}
                      className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors text-sm ${
                        isActive(item.path)
                          ? 'bg-[#c9a84c] text-[#0a1a17]'
                          : 'text-white/70 hover:text-white hover:bg-white/10'
                      }`}
                    >
                      <Icon className="w-4 h-4" />
                      <span>{item.label}</span>
                    </Link>
                  );
                })}
              </div>

              <NotificacoesBell onNotificationClick={handleNotificacaoClick} />

              <button
                onClick={handleLogout}
                className="flex items-center gap-2 text-white/60 hover:text-white px-3 py-2 rounded-lg hover:bg-white/10 transition-colors ml-2"
              >
                <LogOut className="w-4 h-4" />
                <span className="hidden md:inline text-sm">Sair</span>
              </button>
            </div>
          </div>

          {/* Mobile Navigation */}
          <div className="md:hidden flex gap-1 pb-3 overflow-x-auto">
            {navItems.map(item => {
              const Icon = item.icon;
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  className={`flex items-center gap-2 px-3 py-2 rounded-lg transition-colors whitespace-nowrap text-sm ${
                    isActive(item.path)
                      ? 'bg-[#c9a84c] text-[#0a1a17]'
                      : 'text-white/70 hover:text-white hover:bg-white/10'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  <span>{item.label}</span>
                </Link>
              );
            })}
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <Outlet />

      {/* Notification → Coaching Detail Modal */}
      {notificacaoCoaching && (
        <div className="fixed inset-0 z-[70] bg-black/50 flex items-center justify-center p-4" onClick={() => setNotificacaoCoaching(null)}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between px-6 py-4 border-b border-[#0d6b5e]/10">
              <h3 className="text-base text-[#0a1a17]" style={{ fontWeight: 600 }}>Detalhes do Coaching</h3>
              <button onClick={() => setNotificacaoCoaching(null)} className="p-1 rounded-full hover:bg-[#f4f9f8] transition-colors">
                <X className="w-5 h-5 text-[#4d7068]" />
              </button>
            </div>

            {loadingNotif ? (
              <div className="p-8 text-center text-sm text-[#4d7068]">A carregar detalhes...</div>
            ) : dadosCoachingNotif ? (
              <div className="p-6 space-y-4">
                <p className="text-sm text-[#4d7068] bg-[#f4f9f8] rounded-lg p-3">
                  {notificacaoCoaching.mensagem}
                </p>

                <div className="grid grid-cols-2 gap-x-4 gap-y-3 text-sm">
                  <div className="flex items-center gap-2 text-[#4d7068]">
                    <Calendar className="w-4 h-4 shrink-0" />
                    <span>{new Date(dadosCoachingNotif.data).toLocaleDateString('pt-PT')}</span>
                  </div>
                  <div className="flex items-center gap-2 text-[#4d7068]">
                    <Clock className="w-4 h-4 shrink-0" />
                    <span>{dadosCoachingNotif.horaInicio?.substring(0, 5) || '--:--'} - {dadosCoachingNotif.horaFim?.substring(0, 5) || '--:--'}</span>
                  </div>
                  <div className="flex items-center gap-2 text-[#4d7068]">
                    <User className="w-4 h-4 shrink-0" />
                    <span className="truncate">{dadosCoachingNotif.alunoNome || '---'}</span>
                  </div>
                  <div className="flex items-center gap-2 text-[#4d7068]">
                    <MapPin className="w-4 h-4 shrink-0" />
                    <span className="truncate">{dadosCoachingNotif.estudioNome || 'Por atribuir'}</span>
                  </div>
                </div>

                <div className="flex items-center justify-between pt-2 border-t border-[#0d6b5e]/10">
                  <span className="text-sm text-[#4d7068]">Professor:</span>
                  <span className="text-sm text-[#0a1a17]" style={{ fontWeight: 500 }}>{dadosCoachingNotif.professorNome || 'A definir'}</span>
                </div>

                {dadosCoachingNotif.status && (
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-[#4d7068]">Estado:</span>
                    <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs ${
                      ['REJEITADA', 'CANCELADA'].includes(dadosCoachingNotif.status)
                        ? 'bg-red-100 text-red-700'
                        : dadosCoachingNotif.status === 'REALIZADA'
                        ? 'bg-[#e2f0ed] text-[#0d6b5e]'
                        : 'bg-[#fdf6e3] text-[#c9a84c]'
                    }`} style={{ fontWeight: 500 }}>
                      {{
                        PENDENTE: 'Pendente', CONFIRMADA: 'Confirmado', REALIZADA: 'Realizado',
                        REJEITADA: 'Cancelado', CANCELADA: 'Cancelado', APROVADA: 'Aprovado'
                      }[dadosCoachingNotif.status] || dadosCoachingNotif.status}
                    </span>
                  </div>
                )}
              </div>
            ) : (
              <div className="p-8 text-center text-sm text-[#4d7068]">Não foi possível carregar os detalhes.</div>
            )}

            <div className="px-6 py-4 border-t border-[#0d6b5e]/10 flex justify-end">
              <button onClick={() => setNotificacaoCoaching(null)}
                className="px-4 py-2 text-sm text-[#4d7068] hover:bg-[#f4f9f8] rounded-lg transition-colors">
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
