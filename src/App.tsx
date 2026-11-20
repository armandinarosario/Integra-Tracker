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

  if (!ready) return <div className="login muted">A carregar…</div>;
  if (supabase && !session) return <Login />;
  return (
    <PlanProvider key={session?.user.id ?? 'local'}>
      <Shell email={session?.user.email ?? null} />
    </PlanProvider>
  );
}

const NAV = [
  { path: '/', label: 'Início' },
  { path: '/plano', label: 'Plano' },
  { path: '/semana', label: 'Registo semanal' },
  { path: '/avaliacao', label: 'Autoavaliação' },
  { path: '/config', label: 'Configuração' },
];

function Shell({ email }: { email: string | null }) {
  const route = useHashRoute();
  const { data, loading, error } = usePlan();

  if (loading && !data) return <div className="login muted">A carregar o plano…</div>;
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
      <aside className="sidebar">
        <div className="brand">
          <span className="brand-mark" aria-hidden />
          <span className="brand-text">Integra-Tracker</span>
        </div>
        <nav className="nav">
          {NAV.map((n) => (
            <a key={n.path} href={'#' + n.path} className={section === n.path ? 'active' : ''}>
              {n.label}
            </a>
          ))}
        </nav>
        <div className="sidebar-foot">
          {store.mode === 'local' ? 'Modo local: dados só neste browser.' : email}
          {supabase && (
            <div>
              <button className="btn small" style={{ marginTop: 8 }} onClick={() => supabase!.auth.signOut()}>
                Sair
              </button>
            </div>
          )}
        </div>
      </aside>
      <main className="main">
        {error && <div className="notice error" style={{ marginBottom: 16 }}>{error}</div>}
        {page}
      </main>
    </div>
  );
}
