import { lazy, Suspense } from 'react';
import { createBrowserRouter, Navigate, Outlet } from 'react-router';
import { AuthProvider } from './contexts/AuthContext';
import { FeriadosProvider } from './contexts/FeriadosContext';
import { PublicLayout } from './layouts/PublicLayout';
import { DashboardLayout } from './layouts/DashboardLayout';

const Home = lazy(() => import('./pages/Home').then((mod) => ({ default: mod.Home })));
const Eventos = lazy(() => import('./pages/Eventos').then((mod) => ({ default: mod.Eventos })));
const EventoDetalhe = lazy(() => import('./pages/EventoDetalhe').then((mod) => ({ default: mod.EventoDetalhe })));
const CalendarioEventos = lazy(() => import('./pages/CalendarioEventos').then((mod) => ({ default: mod.CalendarioEventos })));
const Login = lazy(() => import('./pages/Login').then((mod) => ({ default: mod.Login })));
const ResetPassword = lazy(() => import('./pages/ResetPassword').then((mod) => ({ default: mod.ResetPassword })));
const Dashboard = lazy(() => import('./pages/Dashboard').then((mod) => ({ default: mod.Dashboard })));
const Coaching = lazy(() => import('./pages/Coaching').then((mod) => ({ default: mod.Coaching })));
const Disponibilidades = lazy(() => import('./pages/Disponibilidades').then((mod) => ({ default: mod.Disponibilidades })));
const DisponibilidadesProfessores = lazy(() => import('./pages/DisponibilidadesProfessores').then((mod) => ({ default: mod.DisponibilidadesProfessores })));
const Turmas = lazy(() => import('./pages/Turmas').then((mod) => ({ default: mod.Turmas })));
const Marketplace = lazy(() => import('./pages/Marketplace').then((mod) => ({ default: mod.Marketplace })));
const Stock = lazy(() => import('./pages/Stock').then((mod) => ({ default: mod.Stock })));
const Utilizadores = lazy(() => import('./pages/Utilizadores').then((mod) => ({ default: mod.Utilizadores })));
const GestaoEventos = lazy(() => import('./pages/GestaoEventos').then((mod) => ({ default: mod.GestaoEventos })));
const Extrato = lazy(() => import('./pages/Extrato').then((mod) => ({ default: mod.Extrato })));
const Auditoria = lazy(() => import('./pages/Auditoria').then((mod) => ({ default: mod.Auditoria })));
const Experimentar = lazy(() => import('./pages/Experimentar').then((mod) => ({ default: mod.Experimentar })));
const Contactos = lazy(() => import('./pages/Contactos').then((mod) => ({ default: mod.Contactos })));
const Perfil = lazy(() => import('./pages/Perfil').then((mod) => ({ default: mod.Perfil })));
const Colecoes = lazy(() => import('./pages/Colecoes').then((mod) => ({ default: mod.Colecoes })));
const MeusAlunos = lazy(() => import('./pages/MeusAlunos').then((mod) => ({ default: mod.MeusAlunos })));

const NotFound = () => <Navigate to="/" replace />;
const PageLoading = () => <div className="min-h-screen bg-[#f4f9f8]" />;

function Root() {
  return (
    <AuthProvider>
      <FeriadosProvider>
        <Suspense fallback={<PageLoading />}>
          <Outlet />
        </Suspense>
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
          { path: 'eventos/calendario', Component: CalendarioEventos },
          { path: 'eventos/:id', Component: EventoDetalhe },
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
          { path: 'meus-alunos', Component: MeusAlunos },
        ],
      },
      {
        path: '*',
        Component: NotFound,
      },
    ],
  },
]);
