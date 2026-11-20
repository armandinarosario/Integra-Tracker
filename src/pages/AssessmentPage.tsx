import { useState } from 'react';
import { CompetencyChart } from '../components/Charts';
import { PageHeader } from '../components/PageHeader';
import { formatDate, momentDate, todayISO, diffDays } from '../lib/schedule';
import { newId, nowISO } from '../store/store';
import { usePlan, usePlanData } from '../state';

export default function AssessmentPage() {
  const data = usePlanData();
  const { addAssessment, deleteAssessment } = usePlan();
  const { plan, assessments } = data;
  const t = plan.template;
  const today = todayISO();

  // Momento sugerido: o que ainda não foi feito e está mais perto de hoje.
  const pendingMoments = t.assessmentMoments.filter((m) => !assessments.some((a) => a.momentKey === m.key));
  const suggested =
    [...(pendingMoments.length ? pendingMoments : t.assessmentMoments)].sort(
      (a, b) =>
        Math.abs(diffDays(today, momentDate(plan.startDate, a.day))) -
        Math.abs(diffDays(today, momentDate(plan.startDate, b.day))),
    )[0] ?? t.assessmentMoments[0];

  const [momentKey, setMomentKey] = useState(suggested.key);
  const [assessedOn, setAssessedOn] = useState(today);
  const [scores, setScores] = useState<Record<string, number>>({});
  const [notes, setNotes] = useState('');
  const [saved, setSaved] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);

  const complete = t.competencies.every((c) => typeof scores[c.key] === 'number');
  const momentLabel = (k: string) => t.assessmentMoments.find((m) => m.key === k)?.label ?? k;
  const sorted = [...assessments].sort((a, b) => a.assessedOn.localeCompare(b.assessedOn) || a.createdAt.localeCompare(b.createdAt));
  const scaleMax = Math.max(...t.scale.map((s) => s.value));

  async function save() {
    await addAssessment({
      id: newId(),
      planId: plan.id,
      momentKey,
      assessedOn,
      scores,
      notes,
      createdAt: nowISO(),
    });
    setScores({});
    setNotes('');
    setSaved(true);
    setTimeout(() => setSaved(false), 4000);
  }

  return (
    <div className="stack">
      <PageHeader
        overline="Autoavaliação"
        title="Competências"
        lead={`A pontuação é uma ferramenta de reflexão, não uma avaliação formal de desempenho. Momentos previstos: ${t.assessmentMoments
          .map((m) => `${m.label} (${formatDate(momentDate(plan.startDate, m.day))})`)
          .join(', ')}.`}
      />

      <section className="card stack">
        <div className="grid grid-2" style={{ maxWidth: 440 }}>
          <label className="field">
            Momento
            <select value={momentKey} onChange={(e) => setMomentKey(e.target.value)}>
              {t.assessmentMoments.map((m) => (
                <option key={m.key} value={m.key}>
                  {m.label}
                  {assessments.some((a) => a.momentKey === m.key) ? ' (já feito)' : ''}
                </option>
              ))}
            </select>
          </label>
          <label className="field">
            Data
            <input type="date" value={assessedOn} onChange={(e) => setAssessedOn(e.target.value)} />
          </label>
        </div>
        <div className="score-scale">
          {t.scale.map((s) => (
            <span key={s.value}>
              <b>{s.value}</b> {s.label}
            </span>
          ))}
        </div>
        <div className="score-list">
          {t.competencies.map((c) => (
            <div key={c.key} className="score-row">
              <div>
                <b>{c.name}</b>
                <div className="small muted">{c.description}</div>
              </div>
              <div className="score-buttons" role="group" aria-label={c.name}>
                {t.scale.map((s) => (
                  <button
                    key={s.value}
                    title={s.label}
                    className={scores[c.key] === s.value ? 'on' : ''}
                    aria-pressed={scores[c.key] === s.value}
                    aria-label={`${c.name}: ${s.value}, ${s.label}`}
                    onClick={() => setScores({ ...scores, [c.key]: s.value })}
                  >
                    {s.value}
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>
        <label className="field">
          Notas (opcional)
          <textarea value={notes} onChange={(e) => setNotes(e.target.value)} />
        </label>
        <div className="row">
          <button className="btn primary" disabled={!complete} onClick={save}>
            Guardar autoavaliação
          </button>
          {!complete && <span className="small muted">Pontue todas as competências para guardar.</span>}
          {saved && <span className="ok">Guardada.</span>}
        </div>
      </section>

      {sorted.length > 0 && (
        <section className="card stack">
          <h2>Evolução</h2>
          <CompetencyChart
            competencies={t.competencies}
            series={sorted.map((a) => ({
              key: a.id,
              label: `${momentLabel(a.momentKey)} · ${formatDate(a.assessedOn)}`,
              scores: a.scores,
            }))}
            scaleMax={scaleMax}
          />
          <h3 style={{ marginTop: 8 }}>Histórico</h3>
          <div>
            {sorted.map((a) => {
              const vals = Object.values(a.scores);
              const avg = vals.reduce((s, v) => s + v, 0) / (vals.length || 1);
              return (
                <div key={a.id} className="history-row">
                  <span>
                    <b>{momentLabel(a.momentKey)}</b> · {formatDate(a.assessedOn)} · média{' '}
                    {avg.toLocaleString('pt-PT', { maximumFractionDigits: 1 })}
                    {a.notes && <span className="small muted"> · {a.notes}</span>}
                  </span>
                  {confirmDelete === a.id ? (
                    <span className="row" style={{ gap: 6 }}>
                      <button className="btn small danger" onClick={() => deleteAssessment(a.id)}>
                        Apagar
                      </button>
                      <button className="btn small" onClick={() => setConfirmDelete(null)}>
                        Cancelar
                      </button>
                    </span>
                  ) : (
                    <button className="btn small" onClick={() => setConfirmDelete(a.id)}>
                      Apagar…
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        </section>
      )}
    </div>
  );
}
