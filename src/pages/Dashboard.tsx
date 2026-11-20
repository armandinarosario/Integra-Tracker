import { CompetencyChart, HoursChart } from '../components/Charts';
import { PageHeader } from '../components/PageHeader';
import { StatusPill } from '../components/StatusPill';
import { findDeliverable, findLog, summarize, weekHours } from '../lib/progress';
import { formatDate, formatShort, momentDate, todayISO, weekEndDate, weekStartDate } from '../lib/schedule';
import { usePlanData } from '../state';

const fmt = (n: number) => n.toLocaleString('pt-PT', { maximumFractionDigits: 1 });

export default function Dashboard() {
  const data = usePlanData();
  const { plan, blockLogs, deliverables, assessments } = data;
  const t = plan.template;
  const today = todayISO();
  const s = summarize(data, today);

  const hours = t.weeks.map((w) => ({
    week: w.number,
    hours: weekHours(blockLogs, w.number),
    planned: t.weeklyHours,
    isCurrent: w.number === s.week,
    isFuture: w.number > s.week,
  }));

  const momentsDone = t.assessmentMoments
    .map((m) => {
      const list = assessments.filter((a) => a.momentKey === m.key).sort((a, b) => a.createdAt.localeCompare(b.createdAt));
      const last = list[list.length - 1];
      return last ? { key: m.key, label: m.label, scores: last.scores } : null;
    })
    .filter((x): x is NonNullable<typeof x> => x !== null);

  const nextMoment = t.assessmentMoments
    .filter((m) => !assessments.some((a) => a.momentKey === m.key))
    .map((m) => ({ ...m, date: momentDate(plan.startDate, m.day) }))[0];

  const currentWeek = t.weeks.find((w) => w.number === s.week);
  const scaleMax = Math.max(...t.scale.map((x) => x.value));
  const deliverable = currentWeek ? findDeliverable(deliverables, s.week) : undefined;

  let title: string;
  if (s.week === 0) title = `O plano começa a ${formatDate(plan.startDate)}`;
  else if (s.week > s.totalWeeks) title = `As ${s.totalWeeks} semanas do plano terminaram`;
  else title = `Dia ${s.day} · Semana ${s.week} de ${s.totalWeeks}`;

  return (
    <div className="stack">
      <PageHeader overline={s.phaseName ?? t.institution} title={title} display lead={t.name} />

      <div className="grid grid-4">
        <div className="card stat">
          <span className="stat-label">Plano concluído</span>
          <span className="stat-value accent">{s.percentComplete}%</span>
          <span className="stat-sub">
            {s.blocksDone} de {s.blocksTotal} blocos · {s.deliverablesDone} de {s.deliverablesTotal} entregáveis
          </span>
          <div className="bar-track" role="progressbar" aria-valuenow={s.percentComplete} aria-valuemin={0} aria-valuemax={100}>
            <div className="bar-fill" style={{ width: `${s.percentComplete}%` }} />
          </div>
        </div>
        <div className="card stat">
          <span className="stat-label">Horas feitas</span>
          <span className="stat-value">{fmt(s.hoursDone)} h</span>
          <span className="stat-sub">
            Previstas até esta semana: {s.hoursPlannedToDate} h de {s.hoursPlannedTotal} h
          </span>
        </div>
        <div className="card stat">
          <span className="stat-label">Entregáveis</span>
          <span className="stat-value">
            {s.deliverablesDone}
            <span className="muted" style={{ fontSize: '0.55em' }}> / {s.deliverablesTotal}</span>
          </span>
          <span className="stat-sub">{deliverables.filter((d) => d.status === 'doing').length} em curso</span>
        </div>
        <div className="card stat">
          <span className="stat-label">Semanas em atraso</span>
          <span className={`stat-value${s.lateWeeks.length ? ' alert' : ''}`}>{s.lateWeeks.length}</span>
          <span className="stat-sub">
            {s.lateWeeks.length ? `Entregável por concluir: semana ${s.lateWeeks.join(', ')}` : 'Sem atrasos face ao calendário'}
          </span>
        </div>
      </div>

      {currentWeek && (
        <section className="card card-brand">
          <div className="card-head" style={{ alignItems: 'flex-start' }}>
            <div className="stack-sm" style={{ gap: 6 }}>
              <span className="overline">
                Esta semana · {formatShort(weekStartDate(plan.startDate, s.week))} a {formatShort(weekEndDate(plan.startDate, s.week))}
              </span>
              <h2>{currentWeek.title}</h2>
              <span className="muted">{currentWeek.objective}</span>
            </div>
            <a className="btn primary" href={`#/semana/${s.week}`}>
              Registar a semana
            </a>
          </div>
          <div className="week-summary">
            {t.blockTypes.map((b) => {
              const log = findLog(blockLogs, s.week, b.key);
              return (
                <div key={b.key} className="week-summary-row">
                  <span>
                    {b.name}
                    <span className="muted small"> · {fmt(log?.hours ?? 0)} de {b.plannedHours} h</span>
                  </span>
                  <StatusPill status={log?.status ?? 'todo'} />
                </div>
              );
            })}
            <div className="week-summary-row">
              <span>
                <b>Entregável</b>
                <span className="muted small"> · até {formatShort(weekEndDate(plan.startDate, s.week))}</span>
              </span>
              <StatusPill status={deliverable?.status ?? 'todo'} />
            </div>
          </div>
        </section>
      )}

      <section className="card">
        <div className="card-head">
          <h2>Horas por semana</h2>
          <span className="small muted">Meta semanal: {t.weeklyHours} h</span>
        </div>
        <HoursChart data={hours} />
      </section>

      <section className="card">
        <div className="card-head">
          <h2>Evolução das competências</h2>
          {nextMoment && (
            <span className="small muted">
              Próxima autoavaliação: {nextMoment.label}, {formatDate(nextMoment.date)}
            </span>
          )}
        </div>
        {momentsDone.length ? (
          <CompetencyChart competencies={t.competencies} series={momentsDone} scaleMax={scaleMax} />
        ) : (
          <p className="muted" style={{ margin: 0 }}>
            Ainda não há autoavaliações. <a href="#/avaliacao">Fazer a autoavaliação inicial</a>.
          </p>
        )}
      </section>
    </div>
  );
}
