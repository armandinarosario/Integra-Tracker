import type { BlockType, PlanTemplate, WeeklySlot } from './types';

// Todas as datas são "AAAA-MM-DD" em hora local, sem fusos, para que o dia 1
// seja sempre o dia escolhido, qualquer que seja a máquina.

export function parseISO(iso: string): Date {
  const [y, m, d] = iso.split('-').map(Number);
  return new Date(y, m - 1, d);
}

export function toISO(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export function todayISO(): string {
  return toISO(new Date());
}

export function addDays(iso: string, days: number): string {
  const d = parseISO(iso);
  d.setDate(d.getDate() + days);
  return toISO(d);
}

/** Diferença em dias de calendário (b - a). */
export function diffDays(a: string, b: string): number {
  const ms = parseISO(b).getTime() - parseISO(a).getTime();
  return Math.round(ms / 86_400_000);
}

/** Dia do plano: 1 no dia de início, 0 ou negativo antes. */
export function planDay(startDate: string, today: string): number {
  return diffDays(startDate, today) + 1;
}

export function weekStartDate(startDate: string, week: number): string {
  return addDays(startDate, (week - 1) * 7);
}

export function weekEndDate(startDate: string, week: number): string {
  return addDays(startDate, week * 7 - 1);
}

/**
 * Semana em curso: 0 antes do início, totalWeeks + 1 depois do fim.
 */
export function currentWeek(startDate: string, today: string, totalWeeks: number): number {
  const day = planDay(startDate, today);
  if (day < 1) return 0;
  const week = Math.floor((day - 1) / 7) + 1;
  return week > totalWeeks ? totalWeeks + 1 : week;
}

export function momentDate(startDate: string, day: number): string {
  return addDays(startDate, day - 1);
}

export function planEndDate(template: PlanTemplate, startDate: string): string {
  return weekEndDate(startDate, template.weeks.length);
}

/** 1 = segunda ... 7 = domingo */
export function isoWeekday(iso: string): number {
  const js = parseISO(iso).getDay();
  return js === 0 ? 7 : js;
}

/** Data do bloco numa dada semana do plano. */
export function slotDate(startDate: string, week: number, weekday: number): string {
  const start = weekStartDate(startDate, week);
  const offset = (weekday - isoWeekday(start) + 7) % 7;
  return addDays(start, offset);
}

/**
 * Agenda inicial: um bloco por dia útil, às 08:00, pela ordem do modelo.
 * A pessoa ajusta depois na Configuração.
 */
export function defaultSchedule(blockTypes: BlockType[]): WeeklySlot[] {
  const weekdays = [2, 3, 4, 5, 1, 6, 7]; // ter, qua, qui, sex, seg, ...
  return blockTypes.map((b, i) => ({
    blockKey: b.key,
    weekday: weekdays[i % weekdays.length],
    time: '08:00',
    durationMinutes: Math.round(b.plannedHours * 60),
  }));
}

const DATE_FMT = new Intl.DateTimeFormat('pt-PT', { day: 'numeric', month: 'short', year: 'numeric' });
const DATE_SHORT = new Intl.DateTimeFormat('pt-PT', { day: 'numeric', month: 'short' });

export function formatDate(iso: string): string {
  return DATE_FMT.format(parseISO(iso));
}

export function formatShort(iso: string): string {
  return DATE_SHORT.format(parseISO(iso));
}

export const WEEKDAY_NAMES = ['', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado', 'Domingo'];
