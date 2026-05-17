import { useEffect, useState, useRef } from 'react';
import { Outlet, Link, useNavigate, useLocation } from 'react-router';
import { useAuth } from '../contexts/AuthContext';
import { LogOut, Home, Calendar, ShoppingBag, Package, Users, BookOpen, Clock, Ticket, BarChart3, Shield, ChevronDown, User, GraduationCap, UsersRound, BookMarked } from 'lucide-react';
import { NotificacoesBell } from '../components/NotificacoesBell';
import { hasMultipleRoles, getRoleLabel, getMainRole } from '../utils/roleUtils';

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

  const getRoleColor = (role: string) => {
    switch (role) {
      case 'DIRECAO': return 'bg-purple-500/20 text-purple-400 border-purple-500/30';
      case 'PROFESSOR': return 'bg-blue-500/20 text-blue-400 border-blue-500/30';
      case 'ENCARREGADO': return 'bg-green-500/20 text-green-400 border-green-500/30';
      case 'ALUNO': return 'bg-orange-500/20 text-orange-400 border-orange-500/30';
      default: return 'bg-gray-500/20 text-gray-400 border-gray-500/30';
    }
  };

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
        className={`flex items-center gap-2 px-3 py-1.5 rounded-full border text-sm font-medium transition-all ${getRoleColor(activeRole)} hover:opacity-80`}
      >
        <CurrentIcon className="w-4 h-4" />
        <span>{getRoleLabel(activeRole)}</span>
        <ChevronDown className={`w-3 h-3 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {isOpen && (
        <div className="absolute top-full left-0 mt-2 w-48 bg-[#0d1f1c] border border-white/10 rounded-xl shadow-xl overflow-hidden z-50">
          <div className="px-3 py-2 border-b border-white/10">
            <span className="text-xs text-white/50">Selecionar perfil</span>
          </div>
          <div className="py-1">
            {roles.map((role) => {
              const Icon = getRoleIcon(role);
              const isActive = role === activeRole;
              return (
                <button
                  key={role}
                  onClick={() => {
                    onRoleChange(role);
                    setIsOpen(false);
                  }}
                  className={`w-full flex items-center gap-3 px-4 py-2.5 text-left transition-colors ${
                    isActive 
                      ? 'bg-[#c9a84c]/20 text-[#c9a84c]' 
                      : 'text-white/70 hover:bg-white/5 hover:text-white'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  <div className="flex flex-col">
                    <span className="text-sm font-medium">{getRoleLabel(role)}</span>
                    {isActive && <span className="text-xs text-[#c9a84c]/70">Ativo</span>}
                  </div>
                  {isActive && (
                    <div className="ml-auto w-2 h-2 rounded-full bg-[#c9a84c]" />
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
      path: '/dashboard/coaching',
      icon: Calendar,
      label: 'Coaching',
      roles: ['ALUNO', 'ENCARREGADO', 'PROFESSOR', 'DIRECAO']
    },
    {
      path: '/dashboard/disponibilidades',
      icon: Clock,
      label: 'Disponibilidades',
      roles: ['PROFESSOR']
    },
    {
      path: '/dashboard/disponibilidades-professores',
      icon: Calendar,
      label: 'Disponibilidades (Geral)',
      roles: ['ALUNO', 'ENCARREGADO']
    },
    {
      path: '/dashboard/grupos',
      icon: BookOpen,
      label: 'Grupos',
      roles: ['ALUNO', 'ENCARREGADO', 'PROFESSOR', 'DIRECAO']
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
            </Link>
            <div className="hidden md:flex items-center gap-2">
              <span className="text-white/20">|</span>
              <span className="text-xs text-white/50">{user.nome}</span>
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

              <NotificacoesBell />

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
    </div>
  );
}