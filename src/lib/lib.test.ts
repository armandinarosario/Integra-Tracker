import { describe, expect, it } from 'vitest';
import example from '../../public/templates/exemplo-integracao.json';
import { buildIcs } from './ics';
import { summarize, weekState } from './progress';
import {
  addDays,
  currentWeek,
  defaultSchedule,
  momentDate,
  planDay,
  planEndDate,
  slotDate,
  weekEndDate,
  weekStartDate,
} from './schedule';
import type { PlanData, PlanTemplate } from './types';
import { validateTemplate } from './validate';

const tpl = example as PlanTemplate;

// Plano de 14 semanas com início a 23 de novembro de 2026 (segunda-feira).
const fourteen: PlanTemplate = {
  ...tpl,
  weeklyHours: 10,
  blockTypes: [
    { key: 'a', name: 'A', description: '', plannedHours: 2 },
    { key: 'b', name: 'B', description: '', plannedHours: 3 },
    { key: 'c', name: 'C', description: '', plannedHours: 3 },
    { key: 'd', name: 'D', description: '', plannedHours: 2 },
  ],
  phases: [{ number: 1, name: 'Única', objective: '', weekRange: [1, 14] }],
  weeks: Array.from({ length: 14 }, (_, i) => ({
    number: i + 1,
    title: `Semana ${i + 1}`,
    objective: 'o',
    exercises: [],
    deliverable: 'd',
  })),
  assessmentMoments: [
    { key: 'inicio', label: 'Início', day: 1 },
    { key: 'dia50', label: 'Dia 50', day: 50 },
    { key: 'dia100', label: 'Dia 100', day: 100 },
  ],
};
const START = '2026-11-23';

function makeData(): PlanData {
  return {
    plan: { id: 'p1', template: fourteen, startDate: START, schedule: defaultSchedule(fourteen.blockTypes), createdAt: '' },
    blockLogs: [],
    deliverables: [],
    assessments: [],
  };
}

describe('calendário', () => {
  it('calcula as datas a partir do dia 1', () => {
    expect(planDay(START, START)).toBe(1);
    expect(weekStartDate(START, 2)).toBe('2026-11-30');
    expect(weekEndDate(START, 14)).toBe('2027-02-28');
    expect(planEndDate(fourteen, START)).toBe('2027-02-28');
    expect(momentDate(START, 50)).toBe('2027-01-11');
    expect(momentDate(START, 100)).toBe('2027-03-02');
  });

  it('atravessa a mudança de ano e de hora sem desvios', () => {
    expect(addDays('2026-12-31', 1)).toBe('2027-01-01');
    expect(addDays('2027-03-27', 2)).toBe('2027-03-29');
  });

  it('identifica a semana atual', () => {
    expect(currentWeek(START, '2026-11-22', 14)).toBe(0);
    expect(currentWeek(START, START, 14)).toBe(1);
    expect(currentWeek(START, '2026-11-29', 14)).toBe(1);
    expect(currentWeek(START, '2026-11-30', 14)).toBe(2);
    expect(currentWeek(START, '2027-02-28', 14)).toBe(14);
    expect(currentWeek(START, '2027-03-01', 14)).toBe(15);
  });

  it('coloca os blocos no dia da semana certo', () => {
    expect(slotDate(START, 1, 2)).toBe('2026-11-24'); // terça
    expect(slotDate(START, 1, 1)).toBe('2026-11-23'); // segunda
    // Início numa quarta: a segunda-feira fica no fim da semana do plano.
    expect(slotDate('2026-11-25', 1, 1)).toBe('2026-11-30');
  });
});

describe('progresso', () => {
  it('conta semanas em atraso só pelo entregável', () => {
    const d = makeData();
    d.deliverables.push({ planId: 'p1', week: 1, status: 'done', link: '', deliveredOn: START, notes: '', updatedAt: '' });
    d.blockLogs.push({ planId: 'p1', week: 2, blockKey: 'a', status: 'done', hours: 2.5, notes: '', principles: [], updatedAt: '' });
    const s = summarize(d, '2026-12-09'); // semana 3
    expect(s.week).toBe(3);
    expect(s.lateWeeks).toEqual([2]);
    expect(s.hoursDone).toBe(2.5);
    expect(s.hoursPlannedToDate).toBe(30);
    expect(s.blocksTotal).toBe(56);
    expect(s.percentComplete).toBe(Math.round((2 / 70) * 100));
    expect(weekState(d, 1, '2026-12-09')).toBe('done');
    d.blockLogs.push({ planId: 'p1', week: 2, blockKey: 'b', status: 'doing', hours: 3, notes: '', principles: [], updatedAt: '' });
    expect(summarize(d, '2026-12-09').hoursDone).toBe(2.5);
    expect(weekState(d, 2, '2026-12-09')).toBe('late');
    expect(weekState(d, 3, '2026-12-09')).toBe('current');
    expect(weekState(d, 4, '2026-12-09')).toBe('future');
  });
});

describe('calendário .ics', () => {
  it('gera blocos, entregas e avaliações', () => {
    const ics = buildIcs(makeData().plan, new Date('2026-11-20T12:00:00Z'));
    const events = ics.match(/BEGIN:VEVENT/g)!.length;
    expect(events).toBe(14 * 4 + 14 + 3);
    expect(ics).toContain('DTSTART:20261124T080000');
    expect(ics).toContain('DTSTART;VALUE=DATE:20270302');
    expect(ics.split('\r\n').every((l) => new TextEncoder().encode(l).length <= 75)).toBe(true);
  });
});

describe('validação de modelos', () => {
  it('aceita o modelo de exemplo', () => {
    expect(validateTemplate(tpl)).toEqual([]);
    expect(validateTemplate(fourteen)).toEqual([]);
  });

  it('aponta erros legíveis', () => {
    const bad = { ...fourteen, weeklyHours: 12, phases: [{ number: 1, name: 'x', objective: '', weekRange: [1, 10] }] };
    const errors = validateTemplate(bad);
    expect(errors.some((e) => e.includes('soma das horas'))).toBe(true);
    expect(errors.some((e) => e.includes('semana 11'))).toBe(true);
    expect(validateTemplate('x')).toHaveLength(1);
  });
});
