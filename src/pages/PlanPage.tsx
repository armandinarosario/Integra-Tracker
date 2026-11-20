import { PageHeader } from '../components/PageHeader';
import { WeekStatePill } from '../components/StatusPill';
import { weekHours, weekState } from '../lib/progress';
import { formatDate, formatShort, planEndDate, todayISO, weekEndDate, weekStartDate } from '../lib/schedule';
import { usePlanData } from '../state';

export default function PlanPage() {
  const data = usePlanData();
  const { plan, blockLogs } = data;
  const t = plan.template;
  const today = todayISO();

  return (
    <div className="stack">
      <PageHeader
        overline={`${t.institution} · ${t.role}`}
        title={t.name}
        lead={`${formatDate(plan.startDate)} a ${formatDate(planEndDate(t, plan.startDate))} · ${t.weeks.length} semanas · ${t.weeklyHours} h por semana`}
      />
      {t.description && <p style={{ margin: 0, maxWidth: 760 }}>{t.description}</p>}
      {t.goldenRule && (
        <div className="card card-brand">
          <span className="overline">Regra de ouro</span>
          <p style={{ margin: '8px 0 0', fontSize: 18, lineHeight: '28px' }}>{t.goldenRule}</p>
        </div>
      )}

      {t.phases.map((p) => (
        <section key={p.number}>
          <div className="phase-head">
            <span className="overline">
              Fase {p.number} · semanas {p.weekRange[0]} a {p.weekRange[1]}
            </span>
            <h2>{p.name}</h2>
            <span className="muted">{p.objective}</span>
          </div>
          <div className="week-list">
            {t.weeks
              .filter((w) => w.number >= p.weekRange[0] && w.number <= p.weekRange[1])
              .map((w) => (
                <a key={w.number} className="week-item" href={`#/semana/${w.number}`}>
                  <span className="week-num">{w.number}</span>
                  <span className="grow">
                    <span className="title">{w.title}</span>
                    <span className="meta">
                      {formatShort(weekStartDate(plan.startDate, w.number))} a {formatShort(weekEndDate(plan.startDate, w.number))} ·{' '}
                      {weekHours(blockLogs, w.number).toLocaleString('pt-PT')} de {t.weeklyHours} h
                    </span>
                    <span className="meta">{w.deliverable}</span>
                  </span>
                  <WeekStatePill state={weekState(data, w.number, today)} />
                </a>
              ))}
          </div>
        </section>
      ))}

      {t.closingNote && <p className="muted" style={{ maxWidth: 760 }}>{t.closingNote}</p>}
    </div>
  );
}
