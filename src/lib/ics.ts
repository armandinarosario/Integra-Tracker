import { addDays, momentDate, slotDate, weekEndDate } from './schedule';
import type { PlanInstance } from './types';

// Gera um ficheiro iCalendar (RFC 5545) com:
//  - os blocos de trabalho de cada semana, com lembrete 15 minutos antes;
//  - o prazo de cada entregável (dia inteiro, lembrete na véspera às 09:00);
//  - os momentos de autoavaliação (dia inteiro, lembrete na véspera às 09:00).
// As horas são "flutuantes" (sem fuso): ficam na hora local de quem importa.

function esc(text: string): string {
  return text.replace(/\\/g, '\\\\').replace(/;/g, '\\;').replace(/,/g, '\\,').replace(/\r?\n/g, '\\n');
}

/** Dobra linhas com mais de 75 octetos, como pede a norma. */
function fold(line: string): string {
  const bytes = new TextEncoder().encode(line);
  if (bytes.length <= 75) return line;
  const parts: string[] = [];
  let current = '';
  let currentBytes = 0;
  for (const ch of line) {
    const b = new TextEncoder().encode(ch).length;
    const limit = parts.length === 0 ? 75 : 74;
    if (currentBytes + b > limit) {
      parts.push(current);
      current = '';
      currentBytes = 0;
    }
    current += ch;
    currentBytes += b;
  }
  parts.push(current);
  return parts.join('\r\n ');
}

const compactDate = (iso: string) => iso.replace(/-/g, '');

function dateTime(iso: string, hhmm: string, plusMinutes = 0): string {
  const [h, m] = hhmm.split(':').map(Number);
  const total = h * 60 + m + plusMinutes;
  const dayShift = Math.floor(total / 1440);
  const mins = total % 1440;
  const day = addDays(iso, dayShift);
  const hh = String(Math.floor(mins / 60)).padStart(2, '0');
  const mm = String(mins % 60).padStart(2, '0');
  return `${compactDate(day)}T${hh}${mm}00`;
}

function stamp(now: Date): string {
  return now.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');
}

interface Ev {
  uid: string;
  summary: string;
  description: string;
  start: string; // já formatado
  end: string;
  allDay: boolean;
  alarm: string; // TRIGGER
}

export function buildIcs(plan: PlanInstance, now = new Date()): string {
  const t = plan.template;
  const events: Ev[] = [];
  const blockName = (k: string) => t.blockTypes.find((b) => b.key === k)?.name ?? k;

  for (const w of t.weeks) {
    for (const slot of plan.schedule) {
      const day = slotDate(plan.startDate, w.number, slot.weekday);
      events.push({
        uid: `${plan.id}-s${w.number}-${slot.blockKey}-${slot.weekday}`,
        summary: `${blockName(slot.blockKey)} · Semana ${w.number}`,
        description: `${w.title}\n\nObjetivo: ${w.objective}\n\nEntregável: ${w.deliverable}`,
        start: dateTime(day, slot.time),
        end: dateTime(day, slot.time, slot.durationMinutes),
        allDay: false,
        alarm: '-PT15M',
      });
    }
    const due = weekEndDate(plan.startDate, w.number);
    events.push({
      uid: `${plan.id}-entrega-${w.number}`,
      summary: `Entregável da semana ${w.number}`,
      description: `${w.deliverable}\n\nRegra de ouro: a semana termina com um produto reutilizável.`,
      start: compactDate(due),
      end: compactDate(addDays(due, 1)),
      allDay: true,
      alarm: '-PT15H',
    });
  }

  for (const m of t.assessmentMoments) {
    const day = momentDate(plan.startDate, m.day);
    events.push({
      uid: `${plan.id}-avaliacao-${m.key}`,
      summary: `Autoavaliação: ${m.label}`,
      description: `Preencher a grelha de autoavaliação (${t.competencies.length} competências) na app Integra-Tracker.`,
      start: compactDate(day),
      end: compactDate(addDays(day, 1)),
      allDay: true,
      alarm: '-PT15H',
    });
  }

  const lines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Integra-Tracker//PT',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    `X-WR-CALNAME:${esc(t.name)}`,
  ];
  const dtstamp = stamp(now);
  for (const e of events) {
    lines.push('BEGIN:VEVENT');
    lines.push(`UID:${e.uid}@integra-tracker`);
    lines.push(`DTSTAMP:${dtstamp}`);
    if (e.allDay) {
      lines.push(`DTSTART;VALUE=DATE:${e.start}`);
      lines.push(`DTEND;VALUE=DATE:${e.end}`);
      lines.push('TRANSP:TRANSPARENT');
    } else {
      lines.push(`DTSTART:${e.start}`);
      lines.push(`DTEND:${e.end}`);
    }
    lines.push(`SUMMARY:${esc(e.summary)}`);
    lines.push(`DESCRIPTION:${esc(e.description)}`);
    lines.push('BEGIN:VALARM', 'ACTION:DISPLAY', `DESCRIPTION:${esc(e.summary)}`, `TRIGGER:${e.alarm}`, 'END:VALARM');
    lines.push('END:VEVENT');
  }
  lines.push('END:VCALENDAR');
  return lines.map(fold).join('\r\n') + '\r\n';
}
