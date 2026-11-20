import type { PlanTemplate } from './types';

/**
 * Valida um modelo de plano. Devolve a lista de erros em português;
 * lista vazia = modelo válido.
 */
export function validateTemplate(input: unknown): string[] {
  const errors: string[] = [];
  if (typeof input !== 'object' || input === null) return ['O ficheiro não contém um objeto JSON.'];
  const t = input as Partial<PlanTemplate>;
  const req = (cond: boolean, msg: string) => {
    if (!cond) errors.push(msg);
  };
  const isStr = (v: unknown) => typeof v === 'string' && v.trim().length > 0;

  req(t.schemaVersion === 1, 'schemaVersion tem de ser 1.');
  req(isStr(t.id), 'Falta o campo "id".');
  req(isStr(t.name), 'Falta o campo "name".');
  req(typeof t.institution === 'string', 'Falta o campo "institution".');
  req(typeof t.role === 'string', 'Falta o campo "role".');
  req(typeof t.weeklyHours === 'number' && t.weeklyHours > 0, '"weeklyHours" tem de ser um número positivo.');

  const arrays = ['blockTypes', 'phases', 'weeks', 'competencies', 'scale', 'assessmentMoments'] as const;
  for (const k of arrays) req(Array.isArray(t[k]) && (t[k] as unknown[]).length > 0, `"${k}" tem de ser uma lista com pelo menos um elemento.`);
  if (errors.length) return errors;

  const blocks = t.blockTypes!;
  const blockKeys = new Set<string>();
  blocks.forEach((b, i) => {
    req(isStr(b.key) && isStr(b.name), `blockTypes[${i}]: faltam "key" ou "name".`);
    req(typeof b.plannedHours === 'number' && b.plannedHours >= 0, `blockTypes[${i}]: "plannedHours" inválido.`);
    req(!blockKeys.has(b.key), `blockTypes[${i}]: chave "${b.key}" repetida.`);
    blockKeys.add(b.key);
  });
  const sum = blocks.reduce((s, b) => s + (b.plannedHours || 0), 0);
  req(Math.abs(sum - t.weeklyHours!) < 0.01, `A soma das horas dos blocos (${sum}) difere de weeklyHours (${t.weeklyHours}).`);

  const weeks = t.weeks!;
  weeks.forEach((w, i) => {
    req(w.number === i + 1, `weeks[${i}]: "number" devia ser ${i + 1}.`);
    req(isStr(w.title), `Semana ${i + 1}: falta "title".`);
    req(isStr(w.objective), `Semana ${i + 1}: falta "objective".`);
    req(isStr(w.deliverable), `Semana ${i + 1}: falta "deliverable".`);
    req(Array.isArray(w.exercises), `Semana ${i + 1}: "exercises" tem de ser uma lista.`);
    if (w.resource) req(isStr(w.resource.title), `Semana ${i + 1}: o recurso precisa de "title".`);
  });

  const covered = new Set<number>();
  t.phases!.forEach((p, i) => {
    const r = p.weekRange;
    req(Array.isArray(r) && r.length === 2 && r[0] <= r[1], `phases[${i}]: "weekRange" inválido.`);
    if (Array.isArray(r)) for (let n = r[0]; n <= r[1]; n++) {
      req(!covered.has(n), `A semana ${n} aparece em mais do que uma fase.`);
      covered.add(n);
    }
  });
  weeks.forEach((w) => req(covered.has(w.number), `A semana ${w.number} não pertence a nenhuma fase.`));

  const compKeys = new Set<string>();
  t.competencies!.forEach((c, i) => {
    req(isStr(c.key) && isStr(c.name), `competencies[${i}]: faltam "key" ou "name".`);
    req(!compKeys.has(c.key), `competencies[${i}]: chave "${c.key}" repetida.`);
    compKeys.add(c.key);
  });
  t.scale!.forEach((s, i) => req(typeof s.value === 'number' && isStr(s.label), `scale[${i}]: inválido.`));
  t.assessmentMoments!.forEach((m, i) =>
    req(isStr(m.key) && isStr(m.label) && typeof m.day === 'number' && m.day >= 1, `assessmentMoments[${i}]: inválido.`),
  );
  return errors;
}
