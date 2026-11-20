import { useState } from 'react';
import { CompetencyChart } from '../components/Charts';
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
      <div>
        <h1>Autoavaliação de competências</h1>
        <p className="muted" style={{ margin: 0 }}>
          A pontuação é uma ferramenta de reflexão, não uma avaliação formal de desempenho. Momentos previstos:{' '}
          {t.assessmentMoments.map((m) => `${m.label} (${formatDate(momentDate(plan.startDate, m.day))})`).join(', ')}.
        </p>
      </div>

      <div className="card stack">
        <div className="row">
          <label className="field" style={{ width: 200 }}>
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
          <label className="field" style={{ width: 180 }}>
            Data
            <input type="date" value={assessedOn} onChange={(e) => setAssessedOn(e.target.value)} />
          </label>
        </div>
        <div className="small muted">
          Escala: {t.scale.map((s) => `${s.value} = ${s.label}`).join('; ')}.
        </div>
        <div className="table-wrap">
          <table className="score-grid">
            <tbody>
              {t.competencies.map((c) => (
                <tr key={c.key}>
                  <td>
                    <b>{c.name}</b>
                    <div className="small muted">{c.description}</div>
                  </td>
                  <td style={{ textAlign: 'right', whiteSpace: 'nowrap' }}>
                    <div className="score-buttons" role="group" aria-label={c.name}>
                      {t.scale.map((s) => (
                        <button
                          key={s.value}
                          title={s.label}
                          className={scores[c.key] === s.value ? 'on' : ''}
                          aria-pressed={scores[c.key] === s.value}
                          onClick={() => setScores({ ...scores, [c.key]: s.value })}
                        >
                          {s.value}
                        </button>
                      ))}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
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
          {saved && <span className="small" style={{ color: 'var(--good)' }}>Guardada.</span>}
        </div>
      </div>

      {sorted.length > 0 && (
        <div className="card stack">
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
          <div className="stack" style={{ gap: 8 }}>
            {sorted.map((a) => {
              const vals = Object.values(a.scores);
              const avg = vals.reduce((s, v) => s + v, 0) / (vals.length || 1);
              return (
                <div key={a.id} className="row" style={{ justifyContent: 'space-between' }}>
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
        </div>
      )}
    </div>
  );
}
