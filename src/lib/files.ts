import type { PlanData, PlanTemplate } from './types';
import { validateTemplate } from './validate';

const base = import.meta.env.BASE_URL;

export interface BundledTemplate {
  file: string;
  name: string;
}

export async function listBundledTemplates(): Promise<BundledTemplate[]> {
  const res = await fetch(`${base}templates/index.json`);
  if (!res.ok) return [];
  return res.json();
}

export async function loadBundledTemplate(file: string): Promise<PlanTemplate> {
  const res = await fetch(`${base}templates/${file}`);
  if (!res.ok) throw new Error('Não foi possível ler o modelo.');
  const json = await res.json();
  const errors = validateTemplate(json);
  if (errors.length) throw new Error(errors.join(' '));
  return json as PlanTemplate;
}

export type ImportedFile =
  | { kind: 'template'; template: PlanTemplate }
  | { kind: 'backup'; backup: PlanData }
  | { kind: 'error'; errors: string[] };

/** Lê um ficheiro JSON escolhido pela pessoa: modelo de plano ou cópia de segurança. */
export async function readJsonFile(file: File): Promise<ImportedFile> {
  let json: unknown;
  try {
    json = JSON.parse(await file.text());
  } catch {
    return { kind: 'error', errors: ['O ficheiro não é um JSON válido.'] };
  }
  const obj = json as Record<string, unknown>;
  if (obj && typeof obj === 'object' && 'plan' in obj && 'blockLogs' in obj) {
    const backup = json as PlanData;
    const errors = validateTemplate(backup.plan?.template);
    if (errors.length) return { kind: 'error', errors };
    return { kind: 'backup', backup };
  }
  const errors = validateTemplate(json);
  if (errors.length) return { kind: 'error', errors };
  return { kind: 'template', template: json as PlanTemplate };
}

export function downloadFile(name: string, content: string, type: string) {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = name;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
