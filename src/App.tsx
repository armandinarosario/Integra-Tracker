import { useEffect, useState } from 'react';
import type { Session } from '@supabase/supabase-js';
import { supabase, store } from './store';
import { PlanProvider, usePlan } from './state';
import { useHashRoute } from './lib/router';
import Login from './pages/Login';
import Setup from './pages/Setup';
import Dashboard from './pages/Dashboard';
import PlanPage from './pages/PlanPage';
import WeekPage from './pages/WeekPage';
import AssessmentPage from './pages/AssessmentPage';
import SettingsPage from './pages/SettingsPage';
import { IconAssess, IconHome, IconLogout, IconPlan, IconSettings, IconWeek } from './components/Icons';
import { BRAND_ICON, BRAND_MONOGRAM_LIGHT } from './components/PageHeader';

export default function App() {
  const [session, setSession] = useState<Session | null>(null);
  const [ready, setReady] = useState(!supabase);

  useEffect(() => {
    if (!supabase) return;
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setReady(true);
    });
    const { data } = supabase.auth.onAuthStateChange((_e, s) => setSession(s));
    return () => data.subscription.unsubscribe();
  }, []);

  if (!ready) return <div className="loading">A carregar…</div>;
  if (supabase && !session) return <Login />;
  return (
    <PlanProvider key={session?.user.id ?? 'local'}>
      <Shell email={session?.user.email ?? null} />
    </PlanProvider>
  );
}

const NAV = [
  { path: '/', label: 'Início', short: 'Início', Icon: IconHome },
  { path: '/plano', label: 'Plano', short: 'Plano', Icon: IconPlan },
  { path: '/semana', label: 'Registo semanal', short: 'Semana', Icon: IconWeek },
  { path: '/avaliacao', label: 'Autoavaliação', short: 'Avaliação', Icon: IconAssess },
  { path: '/config', label: 'Configuração', short: 'Ajustes', Icon: IconSettings },
];

function Shell({ email }: { email: string | null }) {
  const route = useHashRoute();
  const { data, loading, error } = usePlan();

  if (loading && !data) return <div className="loading">A carregar o plano…</div>;
  if (!data) return <Setup />;

  const section = '/' + (route.split('/')[1] ?? '');
  let page;
  const weekMatch = route.match(/^\/semana\/(\d+)/);
  if (route === '/' || route === '') page = <Dashboard />;
  else if (route === '/plano') page = <PlanPage />;
  else if (weekMatch) page = <WeekPage week={Number(weekMatch[1])} />;
  else if (route === '/semana') page = <WeekPage />;
  else if (route === '/avaliacao') page = <AssessmentPage />;
  else if (route === '/config') page = <SettingsPage />;
  else page = <Dashboard />;

  return (
    <div className="shell">
      <aside className="sidebar" aria-label="Navegação">
        <div className="brand">
          <img src={BRAND_MONOGRAM_LIGHT} alt="" />
          <div>
            <div className="brand-name">Integra-Tracker</div>
            <div className="brand-tag">Plano de integração</div>
          </div>
        </div>
        <nav className="nav">
          {NAV.map(({ path, label, Icon }) => (
            <a key={path} href={'#' + path} className={section === path ? 'active' : ''} aria-current={section === path ? 'page' : undefined}>
              <Icon />
              {label}
            </a>
          ))}
        </nav>
        <div className="sidebar-foot">
          {store.mode === 'local' ? (
            'Modo local: os dados ficam só neste browser.'
          ) : (
            <>
              <div>Sessão iniciada</div>
              <div className="who">{email}</div>
            </>
          )}
          {supabase && (
            <div>
              <button className="btn-ghost-brand" onClick={() => supabase!.auth.signOut()}>
                <IconLogout /> Sair
              </button>
            </div>
          )}
        </div>
      </aside>

      <header className="topbar">
        <img src={BRAND_ICON} alt="" />
        <span className="brand-name">Integra-Tracker</span>
      </header>

      <main className="main">
        {error && <div className="notice error" style={{ marginBottom: 24 }}>{error}</div>}
        {page}
      </main>

      <nav className="tabbar" aria-label="Navegação">
        {NAV.map(({ path, short, Icon }) => (
          <a key={path} href={'#' + path} className={section === path ? 'active' : ''} aria-current={section === path ? 'page' : undefined}>
            <Icon />
            {short}
          </a>
        ))}
      </nav>
    </div>
  );
}
