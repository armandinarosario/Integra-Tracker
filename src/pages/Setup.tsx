import { useEffect, useState } from 'react';
import { listBundledTemplates, loadBundledTemplate, readJsonFile, type BundledTemplate } from '../lib/files';
import { defaultSchedule, formatDate, planEndDate, todayISO } from '../lib/schedule';
import type { PlanTemplate } from '../lib/types';
import { store } from '../store';
import { usePlan } from '../state';
import { go } from '../lib/router';

/**
 * Início de um plano: escolher o modelo e a data do dia 1.
 * Também é usado na Configuração para mudar de plano.
 */
export default function Setup({ onCancel }: { onCancel?: () => void }) {
  const { reload } = usePlan();
  const [bundled, setBundled] = useState<BundledTemplate[]>([]);
  const [template, setTemplate] = useState<PlanTemplate | null>(null);
  const [startDate, setStartDate] = useState(todayISO());
  const [errors, setErrors] = useState<string[]>([]);
  const [startError, setStartError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    listBundledTemplates().then(setBundled).catch(() => setBundled([]));
  }, []);

  async function pickBundled(file: string) {
    setErrors([]);
    try {
      setTemplate(await loadBundledTemplate(file));
    } catch (e) {
      setErrors([(e as Error).message]);
    }
  }

  async function pickFile(file: File | undefined) {
    if (!file) return;
    setErrors([]);
    const r = await readJsonFile(file);
    if (r.kind === 'error') setErrors(r.errors);
    else if (r.kind === 'template') setTemplate(r.template);
    else {
      setBusy(true);
      try {
        await store.importBackup(r.backup);
        await reload();
        go('/');
      } catch (e) {
        setErrors([(e as Error).message]);
      } finally {
        setBusy(false);
      }
    }
  }

  async function start() {
    if (!template) return;
    setBusy(true);
    try {
      await store.createPlan(template, startDate, defaultSchedule(template.blockTypes));
      await reload();
      go('/');
    } catch (e) {
      setStartError(`Não foi possível iniciar o plano: ${(e as Error).message}`);
      setBusy(false);
    }
  }

  return (
    <div className="main" style={{ margin: '0 auto', maxWidth: 720 }}>
      <div className="stack">
        <div>
          <h1>{onCancel ? 'Iniciar outro plano' : 'Começar um plano'}</h1>
          <p className="muted">
            Escolha o modelo do plano e a data do dia 1. As datas de cada semana e das autoavaliações são calculadas a
            partir dessa data.
          </p>
          {onCancel && (
            <div className="notice">O plano atual fica arquivado, com todos os registos. Não é apagado.</div>
          )}
        </div>

        <div className="card stack">
          <h2>1. Modelo do plano</h2>
          <div>
            <label className="field">
              Carregar um ficheiro de modelo (.json) ou uma cópia de segurança
              <input type="file" accept="application/json,.json" onChange={(e) => pickFile(e.target.files?.[0])} />
            </label>
          </div>
          {bundled.length > 0 && (
            <div className="stack" style={{ gap: 8 }}>
              <span className="small muted">Ou começar por um modelo incluído na app:</span>
              <div className="row">
                {bundled.map((b) => (
                  <button key={b.file} className="btn" onClick={() => pickBundled(b.file)}>
                    {b.name}
                  </button>
                ))}
              </div>
            </div>
          )}
          {errors.length > 0 && (
            <div className="notice error">
              <b>O ficheiro tem problemas:</b>
              <ul style={{ margin: '4px 0 0', paddingLeft: 18 }}>
                {errors.map((e) => (
                  <li key={e}>{e}</li>
                ))}
              </ul>
            </div>
          )}
          {template && (
            <div className="resource">
              <b>{template.name}</b>
              <div className="small muted">
                {template.institution} · {template.role}
              </div>
              <div className="small" style={{ marginTop: 6 }}>
                {template.weeks.length} semanas, {template.phases.length} fases, {template.weeklyHours} h por semana,{' '}
                {template.competencies.length} competências, {template.assessmentMoments.length} momentos de avaliação.
              </div>
            </div>
          )}
        </div>

        <div className="card stack">
          <h2>2. Data do dia 1</h2>
          <label className="field" style={{ maxWidth: 220 }}>
            Início da integração
            <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} required />
          </label>
          {template && startDate && (
            <p className="small muted" style={{ margin: 0 }}>
              O plano decorre de {formatDate(startDate)} a {formatDate(planEndDate(template, startDate))}.
            </p>
          )}
        </div>

        {startError && <div className="notice error">{startError}</div>}
        <div className="row">
          <button className="btn primary" disabled={!template || !startDate || busy} onClick={start}>
            {busy ? 'A preparar…' : 'Iniciar o plano'}
          </button>
          {onCancel && (
            <button className="btn" onClick={onCancel}>
              Cancelar
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
