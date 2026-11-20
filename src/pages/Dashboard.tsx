import { CompetencyChart, HoursChart } from '../components/Charts';
import { StatusPill } from '../components/StatusPill';
import { findDeliverable, findLog, summarize, weekHours } from '../lib/progress';
import { formatDate, momentDate, todayISO, weekEndDate, weekStartDate, formatShort } from '../lib/schedule';
import { usePlanData } from '../state';

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

  let header: string;
  if (s.week === 0) header = `O plano começa a ${formatDate(plan.startDate)}`;
  else if (s.week > s.totalWeeks) header = `As ${s.totalWeeks} semanas do plano terminaram`;
  else header = `Dia ${s.day} · Semana ${s.week} de ${s.totalWeeks}`;

  return (
    <div className="stack">
      <div>
        <h1>{header}</h1>
        <p className="muted" style={{ margin: 0 }}>
          {s.phaseName ?? t.name}
        </p>
      </div>

      <div className="grid grid-4">
        <div className="card">
          <div className="stat-label">Plano concluído</div>
          <div className="stat-value">{s.percentComplete}%</div>
          <div className="stat-sub">
            {s.blocksDone} de {s.blocksTotal} blocos e {s.deliverablesDone} de {s.deliverablesTotal} entregáveis
          </div>
          <div className="bar-track">
            <div className="bar-fill" style={{ width: `${s.percentComplete}%` }} />
          </div>
        </div>
        <div className="card">
          <div className="stat-label">Horas feitas</div>
          <div className="stat-value">{s.hoursDone.toLocaleString('pt-PT', { maximumFractionDigits: 1 })} h</div>
          <div className="stat-sub">
            Previstas até esta semana: {s.hoursPlannedToDate} h (de {s.hoursPlannedTotal} h)
          </div>
        </div>
        <div className="card">
          <div className="stat-label">Entregáveis</div>
          <div className="stat-value">
            {s.deliverablesDone}/{s.deliverablesTotal}
          </div>
          <div className="stat-sub">
            {deliverables.filter((d) => d.status === 'doing').length} em curso
          </div>
        </div>
        <div className="card">
          <div className="stat-label">Semanas em atraso</div>
          <div className="stat-value" style={s.lateWeeks.length ? { color: 'var(--critical)' } : undefined}>
            {s.lateWeeks.length}
          </div>
          <div className="stat-sub">
            {s.lateWeeks.length
              ? `Entregável por concluir: semana ${s.lateWeeks.join(', ')}`
              : 'Sem atrasos face ao calendário'}
          </div>
        </div>
      </div>

      {currentWeek && (
        <div className="card stack" style={{ gap: 12 }}>
          <div className="row" style={{ justifyContent: 'space-between' }}>
            <div>
              <h2 style={{ margin: 0 }}>
                Esta semana: {currentWeek.title}
              </h2>
              <span className="small muted">
                {formatShort(weekStartDate(plan.startDate, s.week))} a {formatShort(weekEndDate(plan.startDate, s.week))}
              </span>
            </div>
            <a className="btn primary" href={`#/semana/${s.week}`}>
              Registar
            </a>
          </div>
          <div className="grid grid-2" style={{ gap: 8 }}>
            {t.blockTypes.map((b) => {
              const log = findLog(blockLogs, s.week, b.key);
              return (
                <div key={b.key} className="row" style={{ justifyContent: 'space-between', flexWrap: 'nowrap' }}>
                  <span>
                    {b.name} <span className="small muted">· {(log?.hours ?? 0).toLocaleString('pt-PT')} de {b.plannedHours} h</span>
                  </span>
                  <StatusPill status={log?.status ?? 'todo'} />
                </div>
              );
            })}
            <div className="row" style={{ justifyContent: 'space-between', flexWrap: 'nowrap' }}>
              <span>
                <b>Entregável</b> <span className="small muted">· até {formatShort(weekEndDate(plan.startDate, s.week))}</span>
              </span>
              <StatusPill status={findDeliverable(deliverables, s.week)?.status ?? 'todo'} />
            </div>
          </div>
        </div>
      )}

      <div className="card">
        <h2>Horas por semana</h2>
        <HoursChart data={hours} />
      </div>

      <div className="card">
        <div className="row" style={{ justifyContent: 'space-between', alignItems: 'baseline' }}>
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
      </div>
    </div>
  );
}
