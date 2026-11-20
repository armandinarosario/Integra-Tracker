import { useState, type FormEvent } from 'react';
import { supabase } from '../store';

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
    <div className="login">
      <div className="card stack">
        <div className="brand" style={{ padding: 0 }}>
          <span className="brand-mark" aria-hidden />
          Integra-Tracker
        </div>
        <p className="muted small">Entre com a conta criada no seu projeto Supabase.</p>
        <form className="stack" onSubmit={submit}>
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
  );
}
