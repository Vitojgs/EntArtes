import { createBrowserRouter, Navigate, Outlet } from 'react-router';
import { AuthProvider } from './contexts/AuthContext';
import { FeriadosProvider } from './contexts/FeriadosContext';
import { PublicLayout } from './layouts/PublicLayout';
import { DashboardLayout } from './layouts/DashboardLayout';
import { Home } from './pages/Home';
import { Eventos } from './pages/Eventos';
import { Login } from './pages/Login';
import { ResetPassword } from './pages/ResetPassword';
import { Dashboard } from './pages/Dashboard';
import { Coaching } from './pages/Coaching';
import { Disponibilidades } from './pages/Disponibilidades';
import { DisponibilidadesProfessores } from './pages/DisponibilidadesProfessores';
import { Turmas } from './pages/Turmas';
import { Marketplace } from './pages/Marketplace';
import { Stock } from './pages/Stock';
import { Utilizadores } from './pages/Utilizadores';
import { GestaoEventos } from './pages/GestaoEventos';
import { Extrato } from './pages/Extrato';
import { Auditoria } from './pages/Auditoria';
import { Experimentar } from './pages/Experimentar';
import { Contactos } from './pages/Contactos';
import { Perfil } from './pages/Perfil';
import { Colecoes } from './pages/Colecoes';

const NotFound = () => <Navigate to="/" replace />;

function Root() {
  return (
    <AuthProvider>
      <FeriadosProvider>
        <Outlet />
      </FeriadosProvider>
    </AuthProvider>
  );
}

export const router = createBrowserRouter([
  {
    Component: Root,
    children: [
      {
        path: '/',
        Component: PublicLayout,
        children: [
          { index: true, Component: Home },
          { path: 'eventos', Component: Eventos },
          { path: 'experimentar', Component: Experimentar },
          { path: 'contactos', Component: Contactos },
        ],
      },
      {
        path: '/login',
        Component: Login,
      },
        {
          path: '/reset-password',
          Component: ResetPassword,
        },
      {
        path: '/dashboard',
        Component: DashboardLayout,
        children: [
          { index: true, Component: Dashboard },
          { path: 'coaching', Component: Coaching },
          { path: 'disponibilidades', Component: Disponibilidades },
          { path: 'disponibilidades-professores', Component: DisponibilidadesProfessores },
          { path: 'grupos', Component: Turmas },
          { path: 'marketplace', Component: Marketplace },
          { path: 'stock', Component: Stock },
          { path: 'colecoes', Component: Colecoes },
          { path: 'utilizadores', Component: Utilizadores },
          { path: 'eventos', Component: GestaoEventos },
          { path: 'extrato', Component: Extrato },
          { path: 'auditoria', Component: Auditoria },
          { path: 'perfil', Component: Perfil },
        ],
      },
      {
        path: '*',
        Component: NotFound,
      },
    ],
  },
]);