import { WeekStatePill } from '../components/StatusPill';
import { weekHours, weekState } from '../lib/progress';
import { formatShort, todayISO, weekEndDate, weekStartDate, formatDate, planEndDate } from '../lib/schedule';
import { usePlanData } from '../state';

export default function PlanPage() {
  const data = usePlanData();
  const { plan, blockLogs } = data;
  const t = plan.template;
  const today = todayISO();

  return (
    <div className="stack">
      <div>
        <h1>{t.name}</h1>
        <p className="muted" style={{ margin: 0 }}>
          {t.institution} · {t.role} · {formatDate(plan.startDate)} a {formatDate(planEndDate(t, plan.startDate))}
        </p>
      </div>
      {t.description && <p style={{ margin: 0 }}>{t.description}</p>}
      {t.goldenRule && (
        <div className="resource">
          <b>Regra de ouro.</b> {t.goldenRule}
        </div>
      )}

      {t.phases.map((p) => (
        <section key={p.number} className="stack" style={{ gap: 10 }}>
          <div>
            <h2 style={{ marginBottom: 2 }}>
              Fase {p.number}: {p.name}
            </h2>
            <p className="muted small" style={{ margin: 0 }}>
              Semanas {p.weekRange[0]} a {p.weekRange[1]}. {p.objective}
            </p>
          </div>
          <div className="week-list">
            {t.weeks
              .filter((w) => w.number >= p.weekRange[0] && w.number <= p.weekRange[1])
              .map((w) => (
                <a key={w.number} className="week-item" href={`#/semana/${w.number}`}>
                  <span className="week-num">{w.number}</span>
                  <span className="grow">
                    <span className="title">{w.title}</span>
                    <span className="small muted" style={{ display: 'block' }}>
                      {formatShort(weekStartDate(plan.startDate, w.number))} a{' '}
                      {formatShort(weekEndDate(plan.startDate, w.number))} ·{' '}
                      {weekHours(blockLogs, w.number).toLocaleString('pt-PT')} de {t.weeklyHours} h · {w.deliverable}
                    </span>
                  </span>
                  <WeekStatePill state={weekState(data, w.number, today)} />
                </a>
              ))}
          </div>
        </section>
      ))}

      {t.closingNote && <p className="muted">{t.closingNote}</p>}
    </div>
  );
}
