import { currentWeek, planDay, weekEndDate } from './schedule';
import type { BlockLog, Deliverable, PlanData } from './types';

export type WeekState = 'done' | 'current' | 'late' | 'future' | 'inProgress';

export const WEEK_STATE_LABEL: Record<WeekState, string> = {
  done: 'Concluída',
  current: 'Semana atual',
  inProgress: 'Em curso',
  late: 'Em atraso',
  future: 'Por iniciar',
};

export function findLog(logs: BlockLog[], week: number, blockKey: string): BlockLog | undefined {
  return logs.find((l) => l.week === week && l.blockKey === blockKey);
}

export function findDeliverable(ds: Deliverable[], week: number): Deliverable | undefined {
  return ds.find((d) => d.week === week);
}

/** Horas de uma semana: cada bloco concluído conta com as horas previstas. */
export function weekHours(logs: BlockLog[], week: number): number {
  return logs.filter((l) => l.week === week && l.status === 'done').reduce((s, l) => s + (l.hours || 0), 0);
}

/**
 * Estado de uma semana. Regra de ouro: a semana só fica concluída quando o
 * entregável está entregue.
 */
export function weekState(data: PlanData, week: number, today: string): WeekState {
  const { plan, blockLogs, deliverables } = data;
  const d = findDeliverable(deliverables, week);
  if (d?.status === 'done') return 'done';
  const total = plan.template.weeks.length;
  const cw = currentWeek(plan.startDate, today, total);
  if (week === cw) return 'current';
  if (week < cw) return 'late';
  const started = blockLogs.some((l) => l.week === week && l.status !== 'todo') || d?.status === 'doing';
  return started ? 'inProgress' : 'future';
}

export interface Summary {
  day: number;
  totalDays: number;
  week: number;
  totalWeeks: number;
  phaseName: string | null;
  blocksDone: number;
  blocksTotal: number;
  deliverablesDone: number;
  deliverablesTotal: number;
  percentComplete: number;
  hoursDone: number;
  hoursPlannedToDate: number;
  hoursPlannedTotal: number;
  lateWeeks: number[];
  weeksAhead: number;
}

export function summarize(data: PlanData, today: string): Summary {
  const { plan, blockLogs, deliverables } = data;
  const t = plan.template;
  const totalWeeks = t.weeks.length;
  const week = currentWeek(plan.startDate, today, totalWeeks);
  const blocksTotal = totalWeeks * t.blockTypes.length;
  const blocksDone = blockLogs.filter((l) => l.status === 'done').length;
  const deliverablesDone = deliverables.filter((d) => d.status === 'done').length;
  const done = blocksDone + deliverablesDone;
  const total = blocksTotal + totalWeeks;

  const weeksElapsed = Math.max(0, Math.min(totalWeeks, week - 1));
  const lateWeeks = t.weeks
    .map((w) => w.number)
    .filter((n) => n <= weeksElapsed && findDeliverable(deliverables, n)?.status !== 'done');
  const weeksAhead = t.weeks
    .map((w) => w.number)
    .filter((n) => n > Math.max(week, 0) && findDeliverable(deliverables, n)?.status === 'done').length;

  const phase = t.phases.find((p) => week >= p.weekRange[0] && week <= p.weekRange[1]);

  return {
    day: planDay(plan.startDate, today),
    totalDays: Math.max(...t.assessmentMoments.map((m) => m.day), totalWeeks * 7),
    week,
    totalWeeks,
    phaseName: phase ? `Fase ${phase.number}: ${phase.name}` : null,
    blocksDone,
    blocksTotal,
    deliverablesDone,
    deliverablesTotal: totalWeeks,
    percentComplete: total === 0 ? 0 : Math.round((done / total) * 100),
    hoursDone: blockLogs.filter((l) => l.status === 'done').reduce((s, l) => s + (l.hours || 0), 0),
    hoursPlannedToDate: Math.max(0, Math.min(totalWeeks, week)) * t.weeklyHours,
    hoursPlannedTotal: totalWeeks * t.weeklyHours,
    lateWeeks,
    weeksAhead,
  };
}

/** Prazo do entregável de uma semana: último dia da semana. */
export function deliverableDue(startDate: string, week: number): string {
  return weekEndDate(startDate, week);
}
