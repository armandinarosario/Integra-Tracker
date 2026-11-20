import { useState, type FormEvent } from 'react';
import { supabase } from '../store';
import { BRAND_MONOGRAM_LIGHT } from '../components/PageHeader';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (!supabase) return;
    setBusy(true);
    setError(null);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) setError('Email ou palavra-passe incorretos.');
    setBusy(false);
  }

  return (
    <div className="login-wrap">
      <aside className="login-brand">
        <img src={BRAND_MONOGRAM_LIGHT} alt="" />
        <div className="stack-sm" style={{ gap: 16 }}>
          <span className="overline">Integra-Tracker</span>
          <h1>Cada semana, um passo verificável.</h1>
          <div className="rule" aria-hidden />
          <p>Acompanhe o plano de integração, registe o trabalho feito e veja a evolução das suas competências.</p>
        </div>
        <span className="small" style={{ color: 'var(--on-brand-muted)' }}>Governação &amp; Transformação Digital</span>
      </aside>
      <div className="login-form">
        <div className="card stack">
          <div className="stack-sm" style={{ gap: 6 }}>
            <span className="overline">Entrar</span>
            <h2>Bem-vinda de volta</h2>
          </div>
          <form className="stack" style={{ gap: 16 }} onSubmit={submit}>
            <label className="field">
              Email
              <input type="email" autoComplete="username" value={email} onChange={(e) => setEmail(e.target.value)} required />
            </label>
            <label className="field">
              Palavra-passe
              <input
                type="password"
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </label>
            {error && <div className="notice error">{error}</div>}
            <button className="btn primary" disabled={busy}>
              {busy ? 'A entrar…' : 'Entrar'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
